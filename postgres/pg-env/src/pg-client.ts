/**
 * Resolving *which* PostgreSQL client binary to run (pg_dump, createdb, psql).
 *
 * The client's major version must be >= the server's, so when the local
 * client is older, absent, or the server only reachable inside a container,
 * callers need to point pgpm at a version-matched binary. That is a
 * tool-location concern, distinct from connection settings (which stay in the
 * PG* config): the resolved command still receives the connection via
 * {@link getSpawnEnvWithPg} and explicit args.
 *
 * Two knobs, resolved here so nothing reads `process.env` ad hoc:
 * - `PGPM_PG_CLIENT_PREFIX` — prepended to every tool, e.g.
 *   `docker exec -e PGUSER=postgres <container>` runs the container's client.
 * - a per-tool alias (`PGPM_PG_DUMP` / `PGPM_CREATEDB` / `PGPM_PSQL`) — the
 *   full command for that one tool; when set it replaces the tool name (and
 *   the prefix, since an explicit alias is already complete).
 */

/** PostgreSQL client binaries pgpm may shell out to. */
export type PgClientTool = 'pg_dump' | 'createdb' | 'psql';

/** Env var holding the per-tool alias for each client binary. */
const TOOL_ALIAS_ENV: Record<PgClientTool, string> = {
  pg_dump: 'PGPM_PG_DUMP',
  createdb: 'PGPM_CREATEDB',
  psql: 'PGPM_PSQL'
};

/** Env var holding the prefix prepended to every client binary. */
const CLIENT_PREFIX_ENV = 'PGPM_PG_CLIENT_PREFIX';

const tokenize = (value: string): string[] => value.trim().split(/\s+/).filter(Boolean);

/**
 * The argv for a PostgreSQL client tool, honoring a per-tool alias (highest
 * precedence) then a shared prefix, else the bare tool name.
 *
 * @example
 * // PGPM_PG_CLIENT_PREFIX="docker exec -e PGUSER=postgres pg"
 * getPgClientCommand('pg_dump'); // ['docker','exec','-e','PGUSER=postgres','pg','pg_dump']
 * // PGPM_PSQL="/usr/local/bin/psql18"
 * getPgClientCommand('psql');    // ['/usr/local/bin/psql18']
 */
export const getPgClientCommand = (
  tool: PgClientTool,
  env: NodeJS.ProcessEnv = process.env
): string[] => {
  const alias = (env[TOOL_ALIAS_ENV[tool]] ?? '').trim();
  if (alias) return tokenize(alias);

  const prefix = (env[CLIENT_PREFIX_ENV] ?? '').trim();
  return prefix ? [...tokenize(prefix), tool] : [tool];
};
