import type { PgTestClient } from 'pgsql-test';

/**
 * Check if a PostgreSQL schema exists in pg_namespace.
 */
export async function schemaExists(
  pg: PgTestClient,
  schema_name: string
): Promise<boolean> {
  const row = await pg.oneOrNone<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM pg_namespace WHERE nspname = $1
     ) AS exists`,
    [schema_name]
  );
  return row?.exists ?? false;
}

/**
 * Check if a PostgreSQL table exists (pg_catalog).
 */
export async function tableExists(
  pg: PgTestClient,
  schema_name: string,
  table_name: string
): Promise<boolean> {
  const row = await pg.oneOrNone<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = $2
     ) AS exists`,
    [schema_name, table_name]
  );
  return row?.exists ?? false;
}

/**
 * Check if a column exists on a table.
 */
export async function columnExists(
  pg: PgTestClient,
  schema_name: string,
  table_name: string,
  column_name: string
): Promise<boolean> {
  const row = await pg.oneOrNone<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
     ) AS exists`,
    [schema_name, table_name, column_name]
  );
  return row?.exists ?? false;
}

/**
 * Check if an index exists.
 */
export async function indexExists(
  pg: PgTestClient,
  schema_name: string,
  index_name: string
): Promise<boolean> {
  const row = await pg.oneOrNone<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM pg_indexes
       WHERE schemaname = $1 AND indexname = $2
     ) AS exists`,
    [schema_name, index_name]
  );
  return row?.exists ?? false;
}

/**
 * Check if an RLS policy exists for a table.
 */
export async function rlsPolicyExists(
  pg: PgTestClient,
  schema_name: string,
  table_name: string,
  policy_name: string
): Promise<boolean> {
  const row = await pg.oneOrNone<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM pg_policies
       WHERE schemaname = $1 AND tablename = $2 AND policyname = $3
     ) AS exists`,
    [schema_name, table_name, policy_name]
  );
  return row?.exists ?? false;
}

/**
 * Check if a trigger exists on a table.
 */
export async function triggerExists(
  pg: PgTestClient,
  schema_name: string,
  table_name: string,
  trigger_name: string
): Promise<boolean> {
  const row = await pg.oneOrNone<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM information_schema.triggers
       WHERE event_object_schema = $1
         AND event_object_table = $2
         AND trigger_name = $3
     ) AS exists`,
    [schema_name, table_name, trigger_name]
  );
  return row?.exists ?? false;
}

/**
 * Get all column names for a table from information_schema.
 */
export async function getColumnNames(
  pg: PgTestClient,
  schema_name: string,
  table_name: string
): Promise<string[]> {
  const rows = await pg.any<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema_name, table_name]
  );
  return rows.map((r) => r.column_name);
}
