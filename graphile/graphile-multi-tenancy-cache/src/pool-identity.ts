import { Logger } from '@pgpmjs/logger';
import { defaultPgConfig } from 'pg-env';
import type { Pool } from 'pg';

const log = new Logger('multi-tenancy-cache:pool-identity');

const decode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const stringOrDefault = (value: unknown, fallback: string): string => {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
};

const portOrDefault = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return String(defaultPgConfig.port);
};

const formatIdentity = (opts: Record<string, unknown>): string => {
  const host = stringOrDefault(opts.host, defaultPgConfig.host);
  const port = portOrDefault(opts.port);
  const database = stringOrDefault(opts.database, defaultPgConfig.database);
  const user = stringOrDefault(opts.user, defaultPgConfig.user);
  return `${host}:${port}/${database}@${user}`;
};

/**
 * Derive the connection identity that materially affects Graphile handler construction.
 *
 * Password is intentionally excluded because credential rotation does not change the
 * schema introspection inputs used to build a handler.
 */
export function getPoolIdentity(pool: Pool): string {
  const opts = (pool as unknown as { options?: Record<string, unknown> }).options || {};

  if (typeof opts.connectionString === 'string') {
    try {
      const url = new URL(opts.connectionString);
      return formatIdentity({
        host: url.hostname,
        port: url.port,
        database: decode(url.pathname.slice(1)),
        user: decode(url.username || ''),
      });
    } catch {
      return opts.connectionString;
    }
  }

  if (opts.host || opts.port || opts.database || opts.user) {
    return formatIdentity(opts);
  }

  log.warn('Pool has no connectionString or individual connection fields — buildKey may not be unique');
  return 'unknown-pool';
}
