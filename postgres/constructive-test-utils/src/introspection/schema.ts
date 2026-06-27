import type { PgTestClient } from 'pgsql-test';

/**
 * Resolve a schema by database_id from the metaschema.
 */
export async function resolveDatabaseSchemas(
  pg: PgTestClient,
  database_id: string
): Promise<{ id: string; schema_name: string; scope: string }[]> {
  return pg.any<{ id: string; schema_name: string; scope: string }>(
    `SELECT id, schema_name, scope
     FROM metaschema_public.schema
     WHERE database_id = $1
     ORDER BY schema_name`,
    [database_id]
  );
}

/**
 * Get the public schema for a database + scope.
 */
export async function resolvePublicSchema(
  pg: PgTestClient,
  database_id: string,
  scope: string = 'app'
): Promise<string> {
  const row = await pg.one<{ schema_name: string }>(
    `SELECT schema_name
     FROM metaschema_public.schema
     WHERE database_id = $1 AND scope = $2 AND schema_name LIKE '%-public'
     LIMIT 1`,
    [database_id, scope]
  );
  return row.schema_name;
}
