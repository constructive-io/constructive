import type pg from 'pg';
import type { PgConfig, PgPoolConfig } from 'pg-env';

/**
 * Minimal connection-factory seam for pg-cache.
 *
 * `getPgPool` funnels every pooled connection in the stack through a single
 * factory. By default that factory builds a real `pg.Pool` (see
 * `defaultPgPoolFactory`). Registering an alternate factory lets a different
 * backend (e.g. an in-process PGlite instance) supply the pool WITHOUT any
 * backend-specific dependency leaking into pg-cache or its consumers.
 *
 * The only surface pgpm/pgsql-* actually rely on is `query()`, `connect()` and
 * `end()` (plus an `ended` flag for disposal), so a factory may return anything
 * implementing that subset — `QueryablePool`. A real `pg.Pool` structurally
 * satisfies it, so the default path is unchanged and fully backward-compatible.
 * The default TCP factory owns the checkout sanitation contract. Registered
 * factories retain their existing behavior and advertise a separate driver
 * identity because they own their own checkout semantics.
 */
export interface QueryableClient {
  query(text: string, values?: any[]): Promise<any>;
  /** A truthy error argument must permanently discard this client. */
  release(error?: Error | boolean): void;
}

export interface QueryablePool {
  query(text: string, values?: any[]): Promise<any>;
  connect(): Promise<QueryableClient>;
  end(): Promise<void>;
}

export type PgPoolFactory = (
  config: Partial<PgConfig> & { pool?: PgPoolConfig },
  options?: PgPoolFactoryOptions
) => pg.Pool | QueryablePool;

export interface PgPoolFactoryOptions {
  purpose: string;
}

let activeFactory: PgPoolFactory | undefined;
let driverGeneration = 0;

/**
 * Register the factory `getPgPool` uses to build new pools. Pass `undefined`
 * to restore the default (`pg.Pool`) behavior.
 *
 * Note: only affects pools created after registration; already-cached pools are
 * unchanged. Callers that need a clean slate should tear down existing pools
 * first (see `teardownPgPools`).
 */
export const registerPgPoolFactory = (factory: PgPoolFactory | undefined): void => {
  activeFactory = factory;
  driverGeneration++;
};

/** The currently-registered factory, or `undefined` when using the default. */
export const getActivePgPoolFactory = (): PgPoolFactory | undefined => activeFactory;

/** Whether a non-default pool factory is currently registered. */
export const hasPgPoolFactory = (): boolean => activeFactory !== undefined;

/** Stable until the active factory registration changes. */
export const getPgPoolDriverIdentity = (): string =>
  activeFactory ? `registered:${driverGeneration}` : 'node-postgres';
