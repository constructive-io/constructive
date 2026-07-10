import { Client } from 'pg';
import type { PgConfig } from 'pg-env';

/**
 * Minimal client-factory seam for pgsql-client.
 *
 * `PgClient` builds a single `pg.Client` per instance. By default that client is
 * a real `new pg.Client(...)` over TCP (see `defaultPgClientFactory`).
 * Registering an alternate factory lets a different backend (e.g. an in-process
 * PGlite instance) supply the client WITHOUT any backend-specific dependency
 * leaking into pgsql-client or its consumers.
 *
 * The only surface `PgClient` relies on is `connect()`, `query()` and `end()`.
 * A real `pg.Client` structurally satisfies `QueryablePgClient`, so the default
 * path is unchanged and fully backward-compatible.
 *
 * This mirrors the pool-factory seam in `pg-cache`; the two are independent
 * because `pgsql-client`/`pgsql-test` construct `pg.Client`s directly rather
 * than going through `getPgPool`.
 */
export interface QueryablePgClient {
  connect(): Promise<any>;
  query(text: any, values?: any[]): Promise<any>;
  end(): Promise<any>;
}

export type PgClientFactory = (config: PgConfig) => Client | QueryablePgClient;

let activeFactory: PgClientFactory | undefined;

/**
 * Register the factory `PgClient` uses to build its underlying client. Pass
 * `undefined` to restore the default (`pg.Client`) behavior.
 */
export const registerPgClientFactory = (factory: PgClientFactory | undefined): void => {
  activeFactory = factory;
};

/** The currently-registered factory, or `undefined` when using the default. */
export const getActivePgClientFactory = (): PgClientFactory | undefined => activeFactory;

/** Whether a non-default client factory is currently registered. */
export const hasPgClientFactory = (): boolean => activeFactory !== undefined;

/** The default factory: a real node-`pg` `Client` over TCP. */
export const defaultPgClientFactory: PgClientFactory = (config) =>
  new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password
  });
