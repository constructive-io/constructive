import type { PgTestClient } from 'pgsql-test';

/**
 * Resolved table location — schema + table name from the metaschema.
 */
export interface TableInfo {
  schema_name: string;
  table_name: string;
}

/**
 * Resolved table location with its metaschema ID.
 */
export interface TableInfoWithId extends TableInfo {
  table_id: string;
}

/**
 * Generic module table resolver.
 *
 * Resolves any module's table by looking up a table_id column in
 * metaschema_modules_public.{module_name} and joining to get schema + table.
 *
 * All module resolvers in this library are built on this pattern.
 *
 * @param client - PgTestClient (superuser)
 * @param database_id - The provisioned database ID
 * @param module_name - Module table name in metaschema_modules_public (e.g. 'storage_module')
 * @param table_column - Column name holding the table_id FK (e.g. 'buckets_table_id')
 * @param scope - Optional scope filter ('app', 'org', 'platform', etc.)
 *
 * @example
 * const buckets = await resolveModuleTable(pg, db_id, 'storage_module', 'buckets_table_id', 'app');
 * // => { schema_name: 'agent-resource-db-xxx-store-public', table_name: 'buckets', table_id: '...' }
 */
export async function resolveModuleTable(
  client: PgTestClient,
  database_id: string,
  module_name: string,
  table_column: string,
  scope?: string
): Promise<TableInfoWithId> {
  let query = `
    SELECT m.${table_column} AS table_id, s.schema_name, t.name AS table_name
    FROM metaschema_modules_public.${module_name} m
    JOIN metaschema_public.table t ON t.id = m.${table_column}
    JOIN metaschema_public.schema s ON s.id = t.schema_id
    WHERE m.database_id = $1`;
  const params: unknown[] = [database_id];

  if (scope !== undefined) {
    query += ` AND m.scope = $2`;
    params.push(scope);
  }

  return client.one<TableInfoWithId>(query, params);
}

/**
 * Resolve a schema_name from its metaschema ID.
 */
export async function resolveSchemaName(
  client: PgTestClient,
  schema_id: string
): Promise<string> {
  const row = await client.one<{ schema_name: string }>(
    `SELECT schema_name FROM metaschema_public.schema WHERE id = $1`,
    [schema_id]
  );
  return row.schema_name;
}

/**
 * Resolve schema + table from a metaschema table ID.
 */
export async function resolveTableInfo(
  client: PgTestClient,
  table_id: string
): Promise<TableInfo> {
  return client.one<TableInfo>(
    `SELECT s.schema_name, t.name AS table_name
     FROM metaschema_public.table t
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE t.id = $1`,
    [table_id]
  );
}
