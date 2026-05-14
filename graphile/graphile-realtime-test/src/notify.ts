import type { Client } from 'pg';

/**
 * Fire a pg_notify on the realtime channel for a given schema.table.
 *
 * The channel format matches what emit_change uses:
 *   `realtime:<schema>.<table>`
 *
 * @param client - A pg Client (or PoolClient) to run the NOTIFY on
 * @param schema - The PostgreSQL schema name (e.g. 'public')
 * @param table - The table name (e.g. 'items')
 * @param payload - The NOTIFY payload string
 */
export async function notify(
  client: Client,
  schema: string,
  table: string,
  payload: string
): Promise<void> {
  const channel = `realtime:${schema}.${table}`;
  await client.query(`SELECT pg_notify($1, $2)`, [channel, payload]);
}

/**
 * Build a standard DML payload string in the format emit_change uses.
 *
 * @param operation - The DML operation: 'INSERT', 'UPDATE', or 'DELETE'
 * @param rowIds - Array of affected row IDs (UUIDs)
 * @returns Formatted payload string (e.g. "INSERT:uuid1,uuid2")
 */
export function buildPayload(
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  rowIds: string[]
): string {
  if (rowIds.length === 0) {
    return operation;
  }
  return `${operation}:${rowIds.join(',')}`;
}

/**
 * Build an INVALIDATE (overflow) payload.
 */
export function buildInvalidatePayload(): string {
  return 'INVALIDATE';
}

/**
 * Convenience: fire a DML NOTIFY for a table.
 *
 * @param client - A pg Client to run the NOTIFY on
 * @param schema - The PostgreSQL schema name
 * @param table - The table name
 * @param operation - The DML operation
 * @param rowIds - Array of affected row IDs
 */
export async function notifyChange(
  client: Client,
  schema: string,
  table: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  rowIds: string[]
): Promise<void> {
  await notify(client, schema, table, buildPayload(operation, rowIds));
}

/**
 * Convenience: fire an INVALIDATE NOTIFY for a table.
 */
export async function notifyInvalidate(
  client: Client,
  schema: string,
  table: string
): Promise<void> {
  await notify(client, schema, table, buildInvalidatePayload());
}
