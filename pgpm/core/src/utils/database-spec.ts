/**
 * Live-database specs: the `db:<name>` shorthand and postgres:// connection
 * strings that commands accept wherever a database can stand in for a path.
 *
 * Resolution goes through `pg-env`, so host/port/user/password come from the
 * usual layered configuration and a spec only overrides what it names.
 */
import type { PgConfig } from 'pg-env';
import { getPgEnvOptions } from 'pg-env';

const DB_PREFIX = 'db:';
const DSN_PREFIX = /^postgres(ql)?:\/\//;

/** True when a spec names a live database rather than an on-disk path. */
export const isDatabaseSpec = (spec: string): boolean =>
  DSN_PREFIX.test(spec) || spec.startsWith(DB_PREFIX);

/** Display label for a database spec: the database name for `db:<name>`. */
export const databaseSpecLabel = (spec: string): string =>
  spec.startsWith(DB_PREFIX) ? spec.slice(DB_PREFIX.length) : spec;

/**
 * Resolve a database spec to a `PgConfig`. `db:<name>` takes only the
 * database name from the spec; a connection string overrides each part it
 * specifies. Everything unspecified falls back to the environment.
 */
export const resolveDatabaseSpec = (spec: string): PgConfig => {
  if (spec.startsWith(DB_PREFIX)) {
    return getPgEnvOptions({ database: spec.slice(DB_PREFIX.length) });
  }
  if (!DSN_PREFIX.test(spec)) {
    return getPgEnvOptions({ database: spec });
  }
  const url = new URL(spec);
  const database = url.pathname.replace(/^\//, '');
  return getPgEnvOptions({
    ...(url.hostname && { host: url.hostname }),
    ...(url.port && { port: Number(url.port) }),
    ...(url.username && { user: decodeURIComponent(url.username) }),
    ...(url.password && { password: decodeURIComponent(url.password) }),
    ...(database && { database: decodeURIComponent(database) })
  });
};
