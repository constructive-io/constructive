import { createHash, createHmac, randomBytes } from 'node:crypto';

import { Logger } from '@pgpmjs/logger';
import { parseEnvNumber } from '12factor-env';
import pg from 'pg';
import { getPgEnvOptions, PgConfig, PgPoolConfig } from 'pg-env';

import {
  getActivePgPoolFactory,
  getPgPoolDriverIdentity,
  PgPoolFactory,
} from './driver';
import { pgCache, type PgPoolLease } from './lru';
import { installCheckoutSanitizer } from './sanitizer';

const log = new Logger('pg-cache');

export interface GetPgPoolOptions {
  /** Separates pools used by different trust boundaries. */
  purpose?: string;
}

const normalizePoolOptions = (
  options: GetPgPoolOptions = {}
): Required<GetPgPoolOptions> => {
  const purpose = options.purpose ?? 'default';
  if (typeof purpose !== 'string' || purpose.length === 0) {
    throw new TypeError('pg pool purpose must be a non-empty string');
  }
  return { purpose };
};

// Pool identities may appear in diagnostics and cache lifecycle logs. A plain
// digest over a known connection shape could act as an offline password
// verifier, so identities are keyed and intentionally process-local.
const pgIdentityHmacKey = randomBytes(32);

const hmacIdentity = (prefix: string, identity: string): string =>
  `${prefix}:${createHmac('sha256', pgIdentityHmacKey)
    .update(identity)
    .digest('hex')}`;

const requireIdentityString = (value: unknown, path: string): string => {
  if (typeof value !== 'string') {
    throw new TypeError(`${path} must be a string`);
  }
  return value;
};

const requireIdentityInteger = (
  value: unknown,
  path: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER
): number => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new TypeError(
      `${path} must be a safe integer between ${minimum} and ${maximum}`
    );
  }
  return value;
};

const canonicalizeIdentityValue = (
  value: unknown,
  path: string,
  ancestors = new Set<object>()
): unknown => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must not contain a non-finite number`);
    }
    return Object.is(value, -0) ? ['number', '-0'] : value;
  }
  if (Buffer.isBuffer(value)) {
    return ['buffer-sha256', createHash('sha256').update(value).digest('hex')];
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new TypeError(`${path} must not be cyclic`);
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.some((key) => typeof key !== 'string') ||
      ownKeys.some(
        (key) => key !== 'length' && !/^(?:0|[1-9]\d*)$/.test(key as string)
      ) ||
      value.some(
        (_entry, index) => !Object.prototype.hasOwnProperty.call(value, index)
      ) ||
      Object.keys(value).length !== value.length
    ) {
      throw new TypeError(
        `${path} must be a dense array without custom properties`
      );
    }
    ancestors.add(value);
    const result = value.map((entry, index) => {
      if (entry === undefined) {
        throw new TypeError(`${path}[${index}] must not be undefined`);
      }
      return canonicalizeIdentityValue(entry, `${path}[${index}]`, ancestors);
    });
    ancestors.delete(value);
    return ['array', result];
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(record);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} must contain only data values`);
    }
    if (ancestors.has(record))
      throw new TypeError(`${path} must not be cyclic`);
    ancestors.add(record);
    const result: Array<[string, unknown]> = [];
    const ownKeys = Reflect.ownKeys(record);
    if (ownKeys.some((key) => typeof key !== 'string')) {
      throw new TypeError(`${path} must not contain symbol properties`);
    }
    for (const key of (ownKeys as string[]).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      if (!descriptor || !('value' in descriptor)) {
        throw new TypeError(`${path}.${key} must be a data property`);
      }
      const entry = descriptor.value;
      if (entry === undefined) {
        throw new TypeError(`${path}.${key} must not be undefined`);
      }
      result.push([
        key,
        canonicalizeIdentityValue(entry, `${path}.${key}`, ancestors),
      ]);
    }
    ancestors.delete(record);
    return ['object', result];
  }
  throw new TypeError(`${path} must contain only deterministic data values`);
};

export const buildConnectionString = (
  user: string,
  password: string,
  host: string,
  port: string | number,
  database: string
): string => {
  const encodedHost =
    host.includes(':') && !host.startsWith('[')
      ? `[${host}]`
      : encodeURIComponent(host);
  return (
    `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${encodedHost}:${port}/${encodeURIComponent(database)}`
  );
};

/**
 * Read per-pool configuration from environment variables.
 *
 * Supports:
 * - PG_POOL_MAX: Maximum clients per pool (default: 5)
 * - PG_POOL_MAX_USES: Retire a client after this many checkouts (0/unset: unlimited)
 * - PG_POOL_IDLE_TIMEOUT_MS: Close idle clients after ms (default: 30000)
 * - PG_POOL_CONNECTION_TIMEOUT_MS: Fail connect() after ms (default: 5000)
 */
const normalizeMaxUses = (
  value: number | string | undefined,
  source: 'pool.maxUses' | 'PG_POOL_MAX_USES'
): number | undefined => {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new TypeError(`${source} must be 0 or a positive safe integer`);
  }
  if (typeof value === 'string' && !/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new TypeError(`${source} must be 0 or a positive safe integer`);
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new TypeError(`${source} must be 0 or a positive safe integer`);
  }
  return parsed === 0 ? undefined : parsed;
};

export function getPgPoolConfig(overrides?: PgPoolConfig): pg.PoolConfig {
  const maxUses =
    overrides?.maxUses !== undefined
      ? normalizeMaxUses(overrides.maxUses, 'pool.maxUses')
      : normalizeMaxUses(process.env.PG_POOL_MAX_USES, 'PG_POOL_MAX_USES');
  const pool = {
    max: overrides?.max ?? parseEnvNumber(process.env.PG_POOL_MAX) ?? 5,
    ...(maxUses !== undefined && { maxUses }),
    idleTimeoutMillis:
      overrides?.idleTimeoutMillis ??
      parseEnvNumber(process.env.PG_POOL_IDLE_TIMEOUT_MS) ??
      30000,
    connectionTimeoutMillis:
      overrides?.connectionTimeoutMillis ??
      parseEnvNumber(process.env.PG_POOL_CONNECTION_TIMEOUT_MS) ??
      5000,
    ...(overrides?.allowExitOnIdle !== undefined && {
      allowExitOnIdle: overrides.allowExitOnIdle,
    }),
  };
  requireIdentityInteger(pool.max, 'pool.max', 1);
  if (pool.maxUses !== undefined) {
    requireIdentityInteger(pool.maxUses, 'pool.maxUses', 1);
  }
  requireIdentityInteger(pool.idleTimeoutMillis, 'pool.idleTimeoutMillis', 0);
  requireIdentityInteger(
    pool.connectionTimeoutMillis,
    'pool.connectionTimeoutMillis',
    0
  );
  if (
    pool.allowExitOnIdle !== undefined &&
    typeof pool.allowExitOnIdle !== 'boolean'
  ) {
    throw new TypeError('pool.allowExitOnIdle must be a boolean');
  }
  return pool;
}

const normalizeIdentityConfig = (
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig }
): { config: PgConfig; ssl: unknown } => {
  const config = getPgEnvOptions(pgConfig);
  requireIdentityString(config.host, 'pg.host');
  requireIdentityInteger(config.port, 'pg.port', 1, 65_535);
  requireIdentityString(config.database, 'pg.database');
  requireIdentityString(config.user, 'pg.user');
  // node-postgres accepts password callbacks at runtime; captured credentials
  // cannot be represented exactly, so the shared cache rejects them.
  requireIdentityString(config.password, 'pg.password');
  return {
    config,
    ssl: canonicalizeIdentityValue(config.ssl ?? null, 'pg.ssl'),
  };
};

/** Opaque identity for the complete connection and reuse contract. */
export function getPgPoolIdentity(
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig },
  options: GetPgPoolOptions = {}
): string {
  const { config, ssl } = normalizeIdentityConfig(pgConfig);
  const pool = getPgPoolConfig(pgConfig.pool);
  const normalizedOptions = normalizePoolOptions(options);
  const driver = requireIdentityString(
    getPgPoolDriverIdentity(),
    'pg driver identity'
  );
  const identity = JSON.stringify({
    version: 1,
    driver,
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl,
    pool: {
      max: pool.max,
      maxUses: pool.maxUses ?? null,
      idleTimeoutMillis: pool.idleTimeoutMillis,
      connectionTimeoutMillis: pool.connectionTimeoutMillis,
      allowExitOnIdle: pool.allowExitOnIdle ?? false,
    },
    purpose: normalizedOptions.purpose,
    checkout: getActivePgPoolFactory()
      ? 'registered-factory-owned-v1'
      : 'discard-all-v1',
  });
  return hmacIdentity('pg:v1', identity);
}

/** Opaque identity for a physical database, excluding login and pool policy. */
export function getPgDatabaseTargetIdentity(
  pgConfig: Partial<PgConfig>
): string {
  const { config } = normalizeIdentityConfig(pgConfig);
  const driver = requireIdentityString(
    getPgPoolDriverIdentity(),
    'pg driver identity'
  );
  const identity = JSON.stringify({
    version: 1,
    driver,
    host: config.host,
    port: config.port,
    database: config.database,
  });
  return hmacIdentity('pg-target:v1', identity);
}

/**
 * Default pool factory: builds a real `pg.Pool` over TCP. This is the behavior
 * used whenever no alternate driver is registered (see `./driver`).
 */
export const defaultPgPoolFactory: PgPoolFactory = (
  pgConfig,
  options
): pg.Pool => {
  const { config } = normalizeIdentityConfig(pgConfig);
  normalizePoolOptions(options);
  const { user, password, host, port, database, ssl } = config;
  const poolConfig = getPgPoolConfig(pgConfig.pool);
  const pgPool = new pg.Pool({
    host,
    port,
    database,
    user,
    password,
    ...(ssl !== undefined && { ssl }),
    ...poolConfig,
  });

  /**
   * IMPORTANT: Pool-level error handler for idle connection errors.
   *
   * WHY THIS EXISTS:
   * pg-pool maintains a pool of database connections. When a connection is idle
   * (not actively running a query) and the server terminates it (e.g., during
   * database cleanup via pg_terminate_backend), pg-pool emits an 'error' event
   * on the pool's EventEmitter. In Node.js, an EventEmitter 'error' event with
   * no listeners is FATAL and crashes the entire process with an unhelpful
   * stack trace showing internal pg-pool/pg-protocol objects.
   *
   * WHY THIS IS SAFE (does NOT swallow real errors):
   * This handler ONLY catches errors emitted on IDLE pooled connections via
   * the EventEmitter pattern. It does NOT intercept errors from active queries.
   *
   * Error paths in pg-pool:
   * 1. QUERY ERRORS (pool.query(), client.query()):
   *    - Returned via Promise rejection
   *    - Bubble up through async/await as normal exceptions
   *    - NOT affected by this handler - they still throw as expected
   *    - Examples: syntax errors, constraint violations, connection refused
   *
   * 2. IDLE CONNECTION ERRORS (this handler):
   *    - Emitted via EventEmitter when server kills an idle connection
   *    - Without a handler: crashes Node.js process
   *    - With this handler: logged and process continues
   *    - Examples: pg_terminate_backend during cleanup, server restart
   *
   * WHEN THIS FIRES:
   * - pgpm test-packages creates temp databases, deploys, then drops them
   * - Dropping requires pg_terminate_backend() to kill active connections
   * - Idle connections in the pool receive PostgreSQL error 57P01
   * - This handler catches that expected cleanup error
   *
   * PostgreSQL error codes handled:
   * - 57P01: admin_shutdown (terminating connection due to administrator command)
   *   This is EXPECTED during database teardown and logged at debug level.
   *
   * All other error codes are logged at error level for visibility but do not
   * crash the process, allowing the test harness to continue and report results.
   */
  pgPool.on('error', (err: Error & { code?: string }) => {
    if (err.code === '57P01') {
      // Expected during database cleanup - log at debug level
      log.debug(
        `Pool ${database} connection terminated (expected during cleanup): ${err.message}`
      );
    } else {
      // Unexpected pool error - log at error level for visibility
      // Note: This does NOT swallow query errors - those still throw via Promise rejection
      log.error(
        `Pool ${database} unexpected idle connection error [${err.code || 'unknown'}]: ${err.message}`
      );
    }
  });

  return installCheckoutSanitizer(pgPool);
};

const createPgPool = (
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig },
  options: Required<GetPgPoolOptions>
): pg.Pool => {
  // Route through the registered driver (default = pg.Pool over TCP). A custom
  // factory may return any QueryablePool (e.g. an in-process PGlite pool); it is
  // treated as a pg.Pool since that is the only surface consumers use.
  const factory = getActivePgPoolFactory() ?? defaultPgPoolFactory;
  return factory(pgConfig, options) as pg.Pool;
};

const getPgPoolWithOptions = (
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig },
  options: GetPgPoolOptions = {}
): pg.Pool => {
  const normalizedOptions = normalizePoolOptions(options);
  const identity = getPgPoolIdentity(pgConfig, normalizedOptions);
  const pool = pgCache.getOrCreate(identity, () =>
    createPgPool(pgConfig, normalizedOptions)
  );
  pgCache.registerAlias(
    normalizeIdentityConfig(pgConfig).config.database,
    identity
  );
  return pool;
};

/** Compatibility API with an optional exact-purpose reuse boundary. */
export function getPgPool(
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig },
  options?: GetPgPoolOptions
): pg.Pool;
export function getPgPool(
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig },
  options: GetPgPoolOptions = {}
): pg.Pool {
  return getPgPoolWithOptions(pgConfig, options);
}

/** Acquire an idempotently releasable ownership claim over one exact pool. */
export const acquirePgPool = (
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig },
  options: GetPgPoolOptions = {}
): PgPoolLease => {
  const normalizedOptions = normalizePoolOptions(options);
  const identity = getPgPoolIdentity(pgConfig, normalizedOptions);
  const lease = pgCache.acquire(identity, () =>
    createPgPool(pgConfig, normalizedOptions)
  );
  pgCache.registerAlias(
    normalizeIdentityConfig(pgConfig).config.database,
    identity
  );
  return lease;
};
