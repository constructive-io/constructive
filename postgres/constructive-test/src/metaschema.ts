import type { PgTestClient } from 'pgsql-test';

/**
 * Table metadata returned by getTableMetadata() and related functions.
 */
export interface TableMetadata {
  id: string;
  name: string;
  category: string;
  scope: number | null;
}

/**
 * Options for creating a table.
 */
export interface CreateTableOptions {
  database_id: string;
  schema_id: string;
  name: string;
}


/**
 * Get schema ID by name.
 */
export async function getSchemaId(
  pg: PgTestClient,
  database_id: string,
  schema_name: string
): Promise<string> {
  const result = await pg.one<{ id: string }>(
    `SELECT id FROM metaschema_public.schema 
     WHERE database_id = $1 AND name = $2`,
    [database_id, schema_name]
  );
  return result.id;
}

/**
 * Resolve a schema name from its metaschema ID.
 */
export async function resolveSchemaName(
  pg: PgTestClient,
  schema_id: string
): Promise<string> {
  const row = await pg.one<{ schema_name: string }>(
    `SELECT schema_name FROM metaschema_public.schema WHERE id = $1`,
    [schema_id]
  );
  return row.schema_name;
}

/**
 * Get the PG schema_name for a table by its metaschema table_id.
 */
export async function getSchemaNameForTable(
  pg: PgTestClient,
  table_id: string
): Promise<string> {
  const result = await pg.one<{ schema_name: string }>(
    `SELECT s.schema_name FROM metaschema_public.schema s
     JOIN metaschema_public.table t ON t.schema_id = s.id
     WHERE t.id = $1`,
    [table_id]
  );
  return result.schema_name;
}

/**
 * Create a table in the metaschema. Returns the table ID.
 */
export async function createTable(
  pg: PgTestClient,
  options: CreateTableOptions
): Promise<string> {
  const { database_id, schema_id, name } = options;

  const result = await pg.one<{ id: string }>(
    `INSERT INTO metaschema_public.table (database_id, schema_id, name)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [database_id, schema_id, name]
  );

  return result.id;
}


/**
 * Get table metadata (category, scope).
 */
export async function getTableMetadata(
  pg: PgTestClient,
  database_id: string,
  table_name: string
): Promise<TableMetadata> {
  return pg.one<TableMetadata>(
    `SELECT id, name, category, scope
     FROM metaschema_public.table 
     WHERE name = $1 AND database_id = $2`,
    [table_name, database_id]
  );
}

/**
 * Get table by name.
 */
export async function getTableByName(
  pg: PgTestClient,
  database_id: string,
  table_name: string
): Promise<{ id: string; name: string; schema_id: string }> {
  return pg.one<{ id: string; name: string; schema_id: string }>(
    `SELECT id, name, schema_id
     FROM metaschema_public.table 
     WHERE name = $1 AND database_id = $2`,
    [table_name, database_id]
  );
}

/**
 * Get all tables for a database with their metadata.
 */
export async function getAllTables(
  pg: PgTestClient,
  database_id: string
): Promise<TableMetadata[]> {
  return pg.any<TableMetadata>(
    `SELECT id, name, category, module, scope
     FROM metaschema_public.table
     WHERE database_id = $1
     ORDER BY category, module NULLS LAST, scope NULLS LAST, name`,
    [database_id]
  );
}

/**
 * Get tables by category.
 */
export async function getTablesByCategory(
  pg: PgTestClient,
  database_id: string,
  category: 'core' | 'module' | 'app'
): Promise<TableMetadata[]> {
  return pg.any<TableMetadata>(
    `SELECT id, name, category, module, scope
     FROM metaschema_public.table
     WHERE database_id = $1 AND category = $2
     ORDER BY module NULLS LAST, scope NULLS LAST, name`,
    [database_id, category]
  );
}

/**
 * Get tables by module.
 */
export async function getTablesByModule(
  pg: PgTestClient,
  database_id: string,
  module_name: string
): Promise<TableMetadata[]> {
  return pg.any<TableMetadata>(
    `SELECT id, name, category, module, scope
     FROM metaschema_public.table
     WHERE database_id = $1 AND module = $2
     ORDER BY scope NULLS LAST, name`,
    [database_id, module_name]
  );
}

/**
 * Get tables by scope.
 */
export async function getTablesByScope(
  pg: PgTestClient,
  database_id: string,
  scope: number
): Promise<TableMetadata[]> {
  return pg.any<TableMetadata>(
    `SELECT id, name, category, module, scope
     FROM metaschema_public.table
     WHERE database_id = $1 AND scope = $2
     ORDER BY module NULLS LAST, name`,
    [database_id, scope]
  );
}

/**
 * Get field names for a table from metaschema.
 */
export async function getFieldNames(
  pg: PgTestClient,
  table_id: string
): Promise<string[]> {
  const fields = await pg.any<{ name: string }>(
    `SELECT f.name FROM metaschema_public.field f
     WHERE f.table_id = $1 ORDER BY f.name`,
    [table_id]
  );
  return fields.map((f) => f.name);
}

/**
 * Get a metaschema trigger matching a LIKE pattern on a table.
 */
export async function getMetaTrigger(
  pg: PgTestClient,
  table_id: string,
  name_pattern: string
): Promise<{ name: string } | null> {
  return pg.oneOrNone<{ name: string }>(
    `SELECT name FROM metaschema_public.trigger
     WHERE table_id = $1 AND name LIKE $2`,
    [table_id, name_pattern]
  );
}

/**
 * Count metaschema triggers matching a LIKE pattern on a table.
 */
export async function countMetaTriggers(
  pg: PgTestClient,
  table_id: string,
  name_pattern: string
): Promise<number> {
  const result = await pg.one<{ count: string }>(
    `SELECT count(*)::text FROM metaschema_public.trigger
     WHERE table_id = $1 AND name LIKE $2`,
    [table_id, name_pattern]
  );
  return parseInt(result.count, 10);
}

/**
 * Get PG-level triggers (from pg_trigger catalog) matching a pattern on a table.
 */
export async function getPgTriggers(
  pg: PgTestClient,
  schema_name: string,
  table_name: string,
  name_pattern: string
): Promise<{ tgname: string }[]> {
  return pg.any<{ tgname: string }>(
    `SELECT t.tgname FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relname = $2
       AND t.tgname LIKE $3`,
    [schema_name, table_name, name_pattern]
  );
}

/**
 * Get policy types applied to a table from metaschema.
 */
export async function getPolicyTypes(
  pg: PgTestClient,
  table_id: string
): Promise<string[]> {
  const policies = await pg.any<{ policy_type: string }>(
    `SELECT p.policy_type FROM metaschema_public.policy p
     WHERE p.table_id = $1`,
    [table_id]
  );
  return policies.map((p) => p.policy_type);
}

/**
 * Get an index on a table that includes a specific field.
 */
export async function getIndexForField(
  pg: PgTestClient,
  table_id: string,
  field_id: string
): Promise<{ access_method: string } | null> {
  return pg.oneOrNone<{ access_method: string }>(
    `SELECT access_method FROM metaschema_public.index
     WHERE table_id = $1 AND $2 = ANY(field_ids)`,
    [table_id, field_id]
  );
}

/**
 * Get a job trigger row from metaschema_public.job_trigger for a table.
 */
export async function getJobTrigger(
  pg: PgTestClient,
  table_id: string,
  task_identifier: string
): Promise<{ id: string; task_identifier: string } | null> {
  return pg.oneOrNone<{ id: string; task_identifier: string }>(
    `SELECT id, task_identifier FROM metaschema_public.job_trigger
     WHERE table_id = $1 AND task_identifier = $2`,
    [table_id, task_identifier]
  );
}

/**
 * Get embedding_chunks row for a table.
 */
export async function getEmbeddingChunks(
  pg: PgTestClient,
  table_id: string
): Promise<{ id: string; chunk_size: number; chunk_overlap: number; chunks_table_id: string; search_indexes: unknown } | null> {
  return pg.oneOrNone<{ id: string; chunk_size: number; chunk_overlap: number; chunks_table_id: string; search_indexes: unknown }>(
    `SELECT id, chunk_size, chunk_overlap, chunks_table_id, search_indexes FROM metaschema_public.embedding_chunks
     WHERE table_id = $1`,
    [table_id]
  );
}
