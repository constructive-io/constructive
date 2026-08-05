import type { SecureVersion } from 'node:tls';

/**
 * Serializable TLS options supported by the shared PostgreSQL connection
 * contract. Keeping this surface data-only is intentional: pool identities
 * must account for every TLS input, which callback and socket objects cannot
 * do deterministically.
 */
export interface PgSslOptions {
  ca?: string | Buffer | Array<string | Buffer>;
  cert?: string | Buffer | Array<string | Buffer>;
  key?: string | Buffer | Array<string | Buffer | { pem: string | Buffer; passphrase?: string }>;
  passphrase?: string;
  rejectUnauthorized?: boolean;
  servername?: string;
  minVersion?: SecureVersion;
  maxVersion?: SecureVersion;
  ciphers?: string;
}

export type PgSslConfig = boolean | PgSslOptions;

export interface PgConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  /** TLS settings passed directly to node-postgres. */
  ssl?: PgSslConfig;
}

/**
 * Optional pool sizing configuration.
 *
 * Passed through to node-postgres `pg.Pool` options.
 * When omitted, pg-cache falls back to its own env-var defaults.
 */
export interface PgPoolConfig {
  /** Maximum number of clients in the pool (env: PG_POOL_MAX, default: 5) */
  max?: number;
  /** Retire a client after this many checkouts (env: PG_POOL_MAX_USES, 0/unset: unlimited) */
  maxUses?: number;
  /** Close idle clients after this many ms (env: PG_POOL_IDLE_TIMEOUT_MS, default: 30000) */
  idleTimeoutMillis?: number;
  /** Reject pool.connect() after this many ms (env: PG_POOL_CONNECTION_TIMEOUT_MS, default: 5000) */
  connectionTimeoutMillis?: number;
  /** Allow the Node process to exit while idle clients remain (default: false) */
  allowExitOnIdle?: boolean;
}

export const defaultPgConfig: PgConfig = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'postgres'
};
