import pg from 'pg';
import { getPgEnvOptions, PgConfig, PgPoolConfig } from 'pg-env';
import { Logger } from '@pgpmjs/logger';

import { getActivePgPoolFactory, PgPoolFactory } from './driver';
import { pgCache } from './lru';

const log = new Logger('pg-cache');

export const buildConnectionString = (
  user: string,
  password: string,
  host: string,
  port: string | number,
  database: string
): string =>
  `postgres://${user}:${password}@${host}:${port}/${database}`;

const parseEnvInt = (val: string | undefined, fallback: number): number => {
  if (!val) return fallback;
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
};

/**
 * Read per-pool configuration from environment variables.
 *
 * Supports:
 * - PG_POOL_MAX: Maximum clients per pool (default: 5)
 * - PG_POOL_IDLE_TIMEOUT_MS: Close idle clients after ms (default: 30000)
 * - PG_POOL_CONNECTION_TIMEOUT_MS: Fail connect() after ms (default: 5000)
 */
export function getPgPoolConfig(overrides?: PgPoolConfig): pg.PoolConfig {
  return {
    max: overrides?.max ?? parseEnvInt(process.env.PG_POOL_MAX, 5),
    idleTimeoutMillis: overrides?.idleTimeoutMillis ?? parseEnvInt(process.env.PG_POOL_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: overrides?.connectionTimeoutMillis ?? parseEnvInt(process.env.PG_POOL_CONNECTION_TIMEOUT_MS, 5000),
    ...(overrides?.allowExitOnIdle !== undefined && { allowExitOnIdle: overrides.allowExitOnIdle }),
  };
}

/**
 * Default pool factory: builds a real `pg.Pool` over TCP. This is the behavior
 * used whenever no alternate driver is registered (see `./driver`).
 */
export const defaultPgPoolFactory: PgPoolFactory = (pgConfig): pg.Pool => {
  const config = getPgEnvOptions(pgConfig);
  const { user, password, host, port, database } = config;
  const connectionString = buildConnectionString(user, password, host, port, database);
  const poolConfig = getPgPoolConfig(pgConfig.pool);
  const pgPool = new pg.Pool({ connectionString, ...poolConfig });

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

  return pgPool;
};

export const getPgPool = (pgConfig: Partial<PgConfig> & { pool?: PgPoolConfig }): pg.Pool => {
  const config = getPgEnvOptions(pgConfig);
  const { database } = config;
  if (pgCache.has(database)) {
    const cached = pgCache.get(database);
    if (cached) return cached;
  }

  // Route through the registered driver (default = pg.Pool over TCP).
  const factory = getActivePgPoolFactory() ?? defaultPgPoolFactory;
  const pgPool = factory(pgConfig);

  pgCache.set(database, pgPool);
  return pgPool;
};
