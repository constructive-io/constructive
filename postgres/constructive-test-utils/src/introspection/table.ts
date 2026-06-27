import type { PgTestClient } from 'pgsql-test';

export interface MetaschemaField {
  name: string;
  type: string;
  is_nullable: boolean;
  default_value: unknown;
}

/**
 * Get all fields for a table by table_id from metaschema.
 */
export async function getTableFields(
  pg: PgTestClient,
  table_id: string
): Promise<MetaschemaField[]> {
  return pg.any<MetaschemaField>(
    `SELECT name, type, is_nullable, default_value
     FROM metaschema_public.field
     WHERE table_id = $1
     ORDER BY ordinal_position`,
    [table_id]
  );
}

/**
 * Get the table ID from metaschema by schema_id + table name.
 */
export async function getTableId(
  pg: PgTestClient,
  schema_id: string,
  table_name: string
): Promise<string> {
  const row = await pg.one<{ id: string }>(
    `SELECT id FROM metaschema_public.table
     WHERE schema_id = $1 AND name = $2`,
    [schema_id, table_name]
  );
  return row.id;
}

/**
 * Get all table names in a schema.
 */
export async function getTablesInSchema(
  pg: PgTestClient,
  schema_id: string
): Promise<{ id: string; name: string }[]> {
  return pg.any<{ id: string; name: string }>(
    `SELECT id, name FROM metaschema_public.table
     WHERE schema_id = $1
     ORDER BY name`,
    [schema_id]
  );
}

/**
 * Get all policies applied to a table.
 */
export async function getTablePolicies(
  pg: PgTestClient,
  table_id: string
): Promise<{ policy_type: string; privileges: string[]; options: Record<string, unknown> }[]> {
  return pg.any(
    `SELECT policy_type, privileges, options
     FROM metaschema_public.policy
     WHERE table_id = $1
     ORDER BY policy_type`,
    [table_id]
  );
}
