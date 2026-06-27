import type { PgTestClient } from 'pgsql-test';

/**
 * Characters that require quoting in SQL identifiers.
 */
const NEEDS_QUOTING = /[^a-z0-9_]/;

/**
 * Quote an identifier only if it contains characters that require it.
 */
function quoteIfNeeded(id: string): string {
  if (NEEDS_QUOTING.test(id) || id !== id.toLowerCase()) {
    return `"${id.replace(/"/g, '""')}"`;
  }
  return `"${id}"`;
}

/**
 * Build a fully-qualified SQL identifier from one or more parts.
 *
 * @example
 * ident('my_schema', 'my_table') // => "my_schema"."my_table"
 * ident('public')                // => "public"
 */
export function ident(...identifiers: string[]): string {
  return identifiers.map(quoteIfNeeded).join('.');
}

/**
 * Generate a unique name with timestamp suffix — useful for test database names,
 * subdomains, or any identifier that must be unique across concurrent test runs.
 */
export function uniqueName(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Resolve a schema_name + table_name (qualified) for a given metaschema table ID.
 * This is the building block used by all module resolvers.
 */
export async function resolveTableById(
  client: PgTestClient,
  table_id: string
): Promise<{ schema_name: string; table_name: string }> {
  return client.one<{ schema_name: string; table_name: string }>(
    `SELECT s.schema_name, t.name AS table_name
     FROM metaschema_public.table t
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE t.id = $1`,
    [table_id]
  );
}
