/**
 * Making a `pg_dump` artifact restorable when extension operators are in play.
 *
 * `pg_dump` opens every plain dump with
 * `SELECT pg_catalog.set_config('search_path', '', false);` (CVE-2018-1058
 * hardening). Types are schema-qualified in the dump body, but operators are
 * not always qualifiable in the source SQL: a trigger's
 * `WHEN (old.embedding IS DISTINCT FROM new.embedding)` resolves its `=`
 * through `search_path`, and `IS DISTINCT FROM` has no `OPERATOR(schema.=)`
 * form. With an empty path the restore dies with
 * `operator does not exist: public.vector = public.vector`.
 *
 * The fix is to put back exactly the schemas the source database's extensions
 * live in — nothing else, so no user schema re-enters the path and the
 * hardening intent survives.
 */
import { readFileSync, writeFileSync } from 'fs';
import { getPgPool } from 'pg-cache';
import type { PgConfig } from 'pg-env';

/** The preamble line `pg_dump` emits, and the one this module rewrites. */
export const EMPTY_SEARCH_PATH_STATEMENT =
  "SELECT pg_catalog.set_config('search_path', '', false);";

/** The schemas the source database's extensions live in, sorted. */
export const getExtensionSchemas = async (config: PgConfig): Promise<string[]> => {
  const pool = getPgPool(config);
  const res = await pool.query(
    'SELECT DISTINCT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace'
  );
  return res.rows.map((row: { nspname: string }) => String(row.nspname)).sort();
};

const searchPathLiteral = (schemas: string[]): string => {
  const path = schemas.map(schema => `"${schema.replace(/"/g, '""')}"`).join(', ');
  return `'${path.replace(/'/g, "''")}'`;
};

/**
 * Replace the dump's empty-`search_path` preamble with one naming `schemas`.
 *
 * Throws when the preamble is missing: a dump whose format we no longer
 * recognize must not be written out as if it had been patched.
 * With no extensions there is nothing an operator lookup could need, so the
 * empty path is already correct and the dump is returned untouched.
 */
export const rewriteSearchPathStatement = (dump: string, schemas: string[]): string => {
  if (!dump.includes(EMPTY_SEARCH_PATH_STATEMENT)) {
    throw new Error(
      `pg_dump output does not contain the expected preamble ${EMPTY_SEARCH_PATH_STATEMENT} — ` +
      'refusing to write a dump whose search_path was not made restorable; ' +
      'the pg_dump output format has changed and pgpm must be updated'
    );
  }
  if (schemas.length === 0) return dump;
  const replacement = `SELECT pg_catalog.set_config('search_path', ${searchPathLiteral(schemas)}, false);`;
  return dump.split(EMPTY_SEARCH_PATH_STATEMENT).join(replacement);
};

/** Make a captured dump restorable against `config`'s extension schemas. */
export const applyExtensionSearchPath = async (
  config: PgConfig,
  dump: string
): Promise<string> => rewriteSearchPathStatement(dump, await getExtensionSchemas(config));

/** Same, for a dump `pg_dump` wrote to disk itself. */
export const applyExtensionSearchPathToFile = async (
  config: PgConfig,
  file: string
): Promise<string[]> => {
  const schemas = await getExtensionSchemas(config);
  const dump = readFileSync(file, 'utf8');
  writeFileSync(file, rewriteSearchPathStatement(dump, schemas), 'utf8');
  return schemas;
};
