import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';

import { Logger } from '@pgpmjs/logger';
import { parseEnvNumber } from '12factor-env';
import pg from 'pg';
import { getPgEnvOptions, PgConfig, PgPoolConfig } from 'pg-env';

import { getActivePgPoolFactory, getPgPoolDriverIdentity, PgPoolFactory } from './driver';
import { pgCache, type PgPoolLease } from './lru';

const log = new Logger('pg-cache');

export interface GetPgPoolOptions {
  /** Separates pools used by different trust boundaries. */
  purpose?: string;
  /** Reset all server and driver session state before every checkout. */
  sanitizeOnCheckout?: boolean;
}

interface NodePostgresConnection {
  parsedStatements?: Record<string, string>;
  _graphilePreparedStatementCache?: unknown;
}

interface NodePostgresClient extends pg.PoolClient {
  connection?: NodePostgresConnection;
}

type PoolQueryCallback = (error: Error | undefined, result?: unknown) => void;

const requireSanitizableClient = (value: unknown): NodePostgresClient => {
  const client = value as Partial<NodePostgresClient> | null | undefined;
  if (
    client
    && typeof client.query === 'function'
    && typeof client.release === 'function'
  ) {
    return client as NodePostgresClient;
  }
  if (client && typeof client.release === 'function') {
    try {
      client.release(true);
    } catch {
      // The factory contract is already invalid; never hand this client out.
    }
  }
  throw new TypeError(
    'A sanitized PostgreSQL pool must return clients with callable query() and release() methods'
  );
};

export interface PgCheckoutSanitizerStats {
  checkoutAttempts: number;
  checkoutFailures: number;
  queuedCheckouts: number;
  virginFastPathCheckouts: number;
  sanitizedReuseCheckouts: number;
  sanitationFailures: number;
  checkoutWaitMsTotal: number;
  checkoutWaitMsMax: number;
  sanitationMsTotal: number;
  sanitationMsMax: number;
}

const makeCheckoutSanitizerStats = (): PgCheckoutSanitizerStats => ({
  checkoutAttempts: 0,
  checkoutFailures: 0,
  queuedCheckouts: 0,
  virginFastPathCheckouts: 0,
  sanitizedReuseCheckouts: 0,
  sanitationFailures: 0,
  checkoutWaitMsTotal: 0,
  checkoutWaitMsMax: 0,
  sanitationMsTotal: 0,
  sanitationMsMax: 0
});

const aggregateCheckoutSanitizerStats = makeCheckoutSanitizerStats();
const poolCheckoutSanitizerStats = new WeakMap<pg.Pool, PgCheckoutSanitizerStats>();

const recordCount = (
  stats: PgCheckoutSanitizerStats,
  key: 'checkoutAttempts'
    | 'checkoutFailures'
    | 'queuedCheckouts'
    | 'virginFastPathCheckouts'
    | 'sanitizedReuseCheckouts'
    | 'sanitationFailures'
): void => {
  stats[key]++;
  aggregateCheckoutSanitizerStats[key]++;
};

const recordDuration = (
  stats: PgCheckoutSanitizerStats,
  totalKey: 'checkoutWaitMsTotal' | 'sanitationMsTotal',
  maxKey: 'checkoutWaitMsMax' | 'sanitationMsMax',
  durationMs: number
): void => {
  stats[totalKey] += durationMs;
  stats[maxKey] = Math.max(stats[maxKey], durationMs);
  aggregateCheckoutSanitizerStats[totalKey] += durationMs;
  aggregateCheckoutSanitizerStats[maxKey] = Math.max(
    aggregateCheckoutSanitizerStats[maxKey],
    durationMs
  );
};

/** Aggregate checkout/sanitation telemetry, or telemetry for one exact pool. */
export const getPgCheckoutSanitizerStats = (
  pool?: pg.Pool
): Readonly<PgCheckoutSanitizerStats> => ({
  ...(pool ? poolCheckoutSanitizerStats.get(pool) : aggregateCheckoutSanitizerStats)
    ?? makeCheckoutSanitizerStats()
});

const normalizePoolOptions = (options: GetPgPoolOptions = {}) => ({
  purpose: options.purpose ?? 'default',
  sanitizeOnCheckout: options.sanitizeOnCheckout ?? false
});

// Pool identities may be emitted through diagnostics and cache lifecycle logs.
// A plain digest over a known connection shape would let that digest act as an
// offline password verifier. Keep the key private and process-local: identities
// remain deterministic for this registry's lifetime but are intentionally not
// portable evidence across processes.
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
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < minimum
    || value > maximum
  ) {
    throw new TypeError(
      `${path} must be a safe integer between ${minimum} and ${maximum}`
    );
  }
  return value;
};

const normalizeIdentityOptions = (
  options: GetPgPoolOptions = {}
): Required<GetPgPoolOptions> => {
  const purpose = options.purpose ?? 'default';
  const sanitizeOnCheckout = options.sanitizeOnCheckout ?? false;
  if (typeof purpose !== 'string' || purpose.length === 0) {
    throw new TypeError('pg pool purpose must be a non-empty string');
  }
  if (typeof sanitizeOnCheckout !== 'boolean') {
    throw new TypeError('pg pool sanitizeOnCheckout must be a boolean');
  }
  return { purpose, sanitizeOnCheckout };
};

const canonicalizeIdentityValue = (
  value: unknown,
  path: string,
  ancestors = new Set<object>()
): unknown => {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
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
      ownKeys.some((key) => typeof key !== 'string')
      || ownKeys.some((key) => key !== 'length' && !/^(?:0|[1-9]\d*)$/.test(key as string))
      || value.some((_entry, index) => !Object.prototype.hasOwnProperty.call(value, index))
      || Object.keys(value).length !== value.length
    ) {
      throw new TypeError(`${path} must be a dense array without custom properties`);
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
    if (ancestors.has(record)) throw new TypeError(`${path} must not be cyclic`);
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
        canonicalizeIdentityValue(entry, `${path}.${key}`, ancestors)
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
  const encodedHost = host.includes(':') && !host.startsWith('[')
    ? `[${host}]`
    : encodeURIComponent(host);
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}`
    + `@${encodedHost}:${port}/${encodeURIComponent(database)}`;
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
  if (value === undefined || value === '') {
    return undefined;
  }
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
  const maxUses = overrides?.maxUses !== undefined
    ? normalizeMaxUses(overrides.maxUses, 'pool.maxUses')
    : normalizeMaxUses(process.env.PG_POOL_MAX_USES, 'PG_POOL_MAX_USES');
  const pool = {
    max: overrides?.max ?? parseEnvNumber(process.env.PG_POOL_MAX) ?? 5,
    ...(maxUses !== undefined && { maxUses }),
    idleTimeoutMillis: overrides?.idleTimeoutMillis ?? parseEnvNumber(process.env.PG_POOL_IDLE_TIMEOUT_MS) ?? 30000,
    connectionTimeoutMillis: overrides?.connectionTimeoutMillis ?? parseEnvNumber(process.env.PG_POOL_CONNECTION_TIMEOUT_MS) ?? 5000,
    ...(overrides?.allowExitOnIdle !== undefined && { allowExitOnIdle: overrides.allowExitOnIdle }),
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
    pool.allowExitOnIdle !== undefined
    && typeof pool.allowExitOnIdle !== 'boolean'
  ) {
    throw new TypeError('pool.allowExitOnIdle must be a boolean');
  }
  return pool;
}

const normalizeIdentityConfig = (
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig }
): {
  config: PgConfig;
  ssl: unknown;
} => {
  const config = getPgEnvOptions(pgConfig);
  requireIdentityString(config.host, 'pg.host');
  requireIdentityInteger(config.port, 'pg.port', 1, 65_535);
  requireIdentityString(config.database, 'pg.database');
  requireIdentityString(config.user, 'pg.user');
  // node-postgres also accepts password callbacks at runtime, despite the
  // narrower public PgConfig type. A callback's captured secret cannot be
  // represented exactly, so accepting it could alias two security principals.
  requireIdentityString(config.password, 'pg.password');
  return {
    config,
    ssl: canonicalizeIdentityValue(config.ssl ?? null, 'pg.ssl')
  };
};

/**
 * Opaque identity for the exact connection and checkout contract.
 *
 * The digest deliberately includes credentials: two roles that happen to
 * connect to the same database must never share a pool. Only the digest is
 * exposed, so passwords cannot leak through cache keys or logs.
 */
export function getPgPoolIdentity(
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig },
  options: GetPgPoolOptions = {}
): string {
  const { config, ssl } = normalizeIdentityConfig(pgConfig);
  const pool = getPgPoolConfig(pgConfig.pool);
  const normalizedOptions = normalizeIdentityOptions(options);
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
      allowExitOnIdle: pool.allowExitOnIdle ?? false
    },
    ...normalizedOptions
  });
  return hmacIdentity('pg:v1', identity);
}

/**
 * Opaque identity for one configured physical PostgreSQL database target.
 *
 * Credentials, TLS policy, pool sizing, and checkout behavior deliberately do
 * not participate: those inputs must split connection pools, but they must not
 * let two active listener contracts evade a one-target reservation.
 */
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
    database: config.database
  });
  return hmacIdentity('pg-target:v1', identity);
}

/** Clear client-side state whose server-side counterpart DISCARD ALL removed. */
export function clearPreparedStatementBookkeeping(client: NodePostgresClient): void {
  const connection = client.connection;
  if (!connection) return;

  if (connection.parsedStatements) {
    for (const statementName of Object.keys(connection.parsedStatements)) {
      delete connection.parsedStatements[statementName];
    }
  }
  // Dataplan's LRU disposer issues asynchronous DEALLOCATE queries. DISCARD
  // ALL has already removed every server-side prepared statement, so invoking
  // that disposer here would race those cleanup queries with the next tenant
  // transaction on this client. Drop the now-invalid client-side LRU instead;
  // Dataplan will create a fresh one on demand.
  delete connection._graphilePreparedStatementCache;
}

const SANITIZED_SESSION_BASELINE = [
  'SET search_path TO pg_catalog',
  'SET row_security TO on'
] as string[];

const sanitizedStartupOptions = (): string => {
  const settings = [
    '-c search_path=pg_catalog',
    '-c row_security=on'
  ];
  if (process.env.DATAPLAN_PG_DONT_DISABLE_JIT !== '1') {
    settings.push('-c jit_optimize_above_cost=-1');
  }
  return settings.join(' ');
};

const sanitizedSessionBaseline = (): string => {
  const statements = [...SANITIZED_SESSION_BASELINE];
  if (process.env.DATAPLAN_PG_DONT_DISABLE_JIT !== '1') {
    statements.push('SET jit_optimize_above_cost TO -1');
  }
  return statements.join('; ');
};

/**
 * Reset a checked-out connection before it crosses a request boundary.
 * A failed reset destroys the connection; it is never returned to a caller.
 */
export async function sanitizePgClient(
  client: NodePostgresClient,
  baselineRestoredByDiscard = false
): Promise<NodePostgresClient> {
  try {
    await client.query('DISCARD ALL');
    clearPreparedStatementBookkeeping(client);
    if (!baselineRestoredByDiscard) {
      // Custom drivers may not support PostgreSQL startup options. Restore all
      // trusted defaults in one simple-query round trip after DISCARD ALL.
      await client.query(sanitizedSessionBaseline());
    }
    return client;
  } catch (error) {
    client.release(true);
    throw error;
  }
}

/** Sanitize Promise/callback checkouts and every custom-pool direct query. */
export function installCheckoutSanitizer(
  pool: pg.Pool,
  baselineRestoredByDiscard = false,
  /** @internal Only the default factory may assert this startup contract. */
  factoryOwnedVirginFastPath = false
): pg.Pool {
  if (typeof pool.connect !== 'function' || typeof pool.query !== 'function') {
    throw new TypeError(
      'A sanitized PostgreSQL pool must expose callable connect() and query() methods'
    );
  }
  const stats = makeCheckoutSanitizerStats();
  poolCheckoutSanitizerStats.set(pool, stats);
  const virginClients = new WeakSet<pg.PoolClient>();
  const eventPool = pool as unknown as Partial<EventEmitter>;
  const canProveFactoryListenerContract =
    typeof eventPool.rawListeners === 'function'
    && typeof eventPool.on === 'function'
    && typeof eventPool.prependListener === 'function';
  const connectListeners = (): Function[] => canProveFactoryListenerContract
    ? eventPool.rawListeners!('connect')
    : [];
  // A non-EventEmitter custom QueryablePool can still use full sanitation, but
  // it can never qualify for the default node-postgres virgin fast path.
  let factoryContractContaminated = factoryOwnedVirginFastPath
    && (!canProveFactoryListenerContract || connectListeners().length > 0);
  const markFactoryOwnedVirgin = (client: pg.PoolClient): void => {
    const listeners = connectListeners();
    if (
      !factoryContractContaminated
      && listeners.length === 1
      && listeners[0] === markFactoryOwnedVirgin
    ) {
      virginClients.add(client);
    }
  };
  if (factoryOwnedVirginFastPath && canProveFactoryListenerContract) {
    // Remember that an untrusted connect hook has existed even if it is a
    // self-removing once/prependOnce listener and disappears during emission.
    eventPool.on!('newListener', (eventName, listener) => {
      if (eventName === 'connect' && listener !== markFactoryOwnedVirgin) {
        factoryContractContaminated = true;
      }
    });
    // This listener is installed before the lazy pool can open a connection.
    // A second connect listener disables the fast path because that listener
    // could mutate session state before the checkout reaches this wrapper.
    eventPool.prependListener!('connect', markFactoryOwnedVirgin);
  }
  const originalConnect = pool.connect.bind(pool);
  const sanitizedConnect = async (): Promise<pg.PoolClient> => {
    recordCount(stats, 'checkoutAttempts');
    const checkoutStartedAt = performance.now();
    const waitingBefore = pool.waitingCount;
    const pending = originalConnect();
    if (pool.waitingCount > waitingBefore) recordCount(stats, 'queuedCheckouts');

    let client: pg.PoolClient;
    try {
      client = requireSanitizableClient(await pending);
    } catch (error) {
      recordDuration(
        stats,
        'checkoutWaitMsTotal',
        'checkoutWaitMsMax',
        performance.now() - checkoutStartedAt
      );
      recordCount(stats, 'checkoutFailures');
      throw error;
    }
    recordDuration(
      stats,
      'checkoutWaitMsTotal',
      'checkoutWaitMsMax',
      performance.now() - checkoutStartedAt
    );

    const virgin = virginClients.delete(client);
    const markerIsExclusive = factoryOwnedVirginFastPath
      && !factoryContractContaminated
      && connectListeners().length === 1
      && connectListeners()[0] === markFactoryOwnedVirgin;
    if (virgin && markerIsExclusive) {
      // The default factory supplies the trusted baseline in the startup
      // packet. With no other connect listener and no prior checkout, neither
      // server nor driver state exists to discard.
      clearPreparedStatementBookkeeping(client as NodePostgresClient);
      recordCount(stats, 'virginFastPathCheckouts');
      return client;
    }

    const sanitationStartedAt = performance.now();
    try {
      const sanitized = await sanitizePgClient(
        client as NodePostgresClient,
        baselineRestoredByDiscard
      );
      recordCount(stats, 'sanitizedReuseCheckouts');
      return sanitized;
    } catch (error) {
      recordCount(stats, 'sanitationFailures');
      throw error;
    } finally {
      recordDuration(
        stats,
        'sanitationMsTotal',
        'sanitationMsMax',
        performance.now() - sanitationStartedAt
      );
    }
  };

  pool.connect = ((callback?: (
    error: Error | undefined,
    client: pg.PoolClient | undefined,
    done: ((release?: boolean | Error) => void) | undefined
  ) => void) => {
    const pending = sanitizedConnect();
    if (!callback) return pending;
    pending.then(
      (client) => callback(undefined, client, client.release.bind(client)),
      (error) => callback(error as Error, undefined, undefined)
    );
  }) as typeof pool.connect;

  if (!factoryOwnedVirginFastPath) {
    // node-postgres' own pool.query dynamically calls this.connect(), so the
    // default factory already reaches the sanitizer while retaining the full
    // native query contract. An arbitrary QueryablePool may bypass connect()
    // in its query implementation, so never trust that method in sanitized
    // mode: acquire the sanitized client here and execute the query once.
    const sanitizedQuery = ((...args: unknown[]) => {
      if (typeof args[0] === 'function') {
        const callback = args[0] as PoolQueryCallback;
        queueMicrotask(() => callback(
          new TypeError('Passing a function as the first parameter to pool.query is not supported')
        ));
        return undefined;
      }

      const callback = typeof args[args.length - 1] === 'function'
        ? args.pop() as PoolQueryCallback
        : undefined;
      const execute = async (): Promise<unknown> => {
        const client = await sanitizedConnect() as NodePostgresClient;
        let settled = false;
        const canObserveErrors =
          typeof client.once === 'function'
          && typeof client.removeListener === 'function';

        return new Promise<unknown>((resolve, reject) => {
          const removeErrorListener = (): void => {
            if (!canObserveErrors) return;
            try {
              client.removeListener('error', onClientError);
            } catch {
              // A broken optional EventEmitter surface must not prevent release.
            }
          };
          const releaseAfterError = (error: unknown): void => {
            client.release(error instanceof Error ? error : true);
          };
          const fail = (error: unknown): void => {
            if (settled) return;
            settled = true;
            removeErrorListener();
            try {
              releaseAfterError(error);
            } catch {
              // Preserve the query/connection error; release errors cannot make
              // an already unsafe client eligible for reuse.
            }
            reject(error);
          };
          const succeed = (result: unknown): void => {
            if (settled) return;
            settled = true;
            removeErrorListener();
            try {
              client.release();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          };
          const onClientError = (error: Error): void => fail(error);

          try {
            if (canObserveErrors) client.once('error', onClientError);
            Promise.resolve((client.query as (...queryArgs: unknown[]) => unknown)(...args))
              .then(succeed, fail);
          } catch (error) {
            fail(error);
          }
        });
      };

      const pending = execute();
      if (!callback) return pending;
      pending.then(
        (result) => callback(undefined, result),
        (error) => callback(error as Error)
      );
      return undefined;
    }) as typeof pool.query;

    try {
      pool.query = sanitizedQuery;
    } catch {
      throw new TypeError(
        'A sanitized custom PostgreSQL pool must expose a replaceable query() method'
      );
    }
    if (pool.query !== sanitizedQuery) {
      throw new TypeError(
        'A sanitized custom PostgreSQL pool must expose a replaceable query() method'
      );
    }
  }

  return pool;
}

/**
 * Default pool factory: builds a real `pg.Pool` over TCP. This is the behavior
 * used whenever no alternate driver is registered (see `./driver`).
 */
export const defaultPgPoolFactory: PgPoolFactory = (pgConfig, options): pg.Pool => {
  const { config } = normalizeIdentityConfig(pgConfig);
  normalizeIdentityOptions(options);
  const { user, password, host, port, database, ssl } = config;
  const poolConfig = getPgPoolConfig(pgConfig.pool);
  const pgPool = new pg.Pool({
    host,
    port: Number(port),
    database,
    user,
    password,
    ...(ssl !== undefined && { ssl }),
    ...(options?.sanitizeOnCheckout && { options: sanitizedStartupOptions() }),
    ...poolConfig
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
      log.debug(`Pool ${database} connection terminated (expected during cleanup): ${err.message}`);
    } else {
      // Unexpected pool error - log at error level for visibility
      // Note: This does NOT swallow query errors - those still throw via Promise rejection
      log.error(`Pool ${database} unexpected idle connection error [${err.code || 'unknown'}]: ${err.message}`);
    }
  });

  // DISCARD ALL restores startup parameters. Pinning the security baseline in
  // the startup packet makes the default driver a one-round-trip checkout;
  // custom drivers use the explicit post-DISCARD fallback above.
  return options?.sanitizeOnCheckout
    ? installCheckoutSanitizer(pgPool, true, true)
    : pgPool;
};

const createPgPool = (
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig },
  normalizedOptions: ReturnType<typeof normalizePoolOptions>
): pg.Pool => {
  // Route through the registered driver (default = pg.Pool over TCP). A custom
  // factory may return any QueryablePool (e.g. an in-process PGlite pool); it is
  // treated as a pg.Pool since that is the only surface consumers use.
  const factory = getActivePgPoolFactory() ?? defaultPgPoolFactory;
  const pgPool = factory(pgConfig, normalizedOptions) as pg.Pool;
  if (normalizedOptions.sanitizeOnCheckout && factory !== defaultPgPoolFactory) {
    installCheckoutSanitizer(pgPool);
  }
  return pgPool;
};

/** Synchronously get or create an unleased pool for backwards compatibility. */
export const getPgPool = (
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig },
  options: GetPgPoolOptions = {}
): pg.Pool => {
  const normalizedOptions = normalizePoolOptions(options);
  const poolIdentity = getPgPoolIdentity(pgConfig, normalizedOptions);
  return pgCache.getOrCreate(
    poolIdentity,
    () => createPgPool(pgConfig, normalizedOptions)
  );
};

/**
 * Atomically get/create and lease the exact connection identity.
 *
 * Callers that retain a pool beyond the current stack frame should use this
 * production API and release only after their final request or long-lived
 * resource has drained.
 */
export const acquirePgPool = (
  pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig },
  options: GetPgPoolOptions = {}
): PgPoolLease => {
  const normalizedOptions = normalizePoolOptions(options);
  const poolIdentity = getPgPoolIdentity(pgConfig, normalizedOptions);
  return pgCache.acquire(
    poolIdentity,
    () => createPgPool(pgConfig, normalizedOptions)
  );
};
