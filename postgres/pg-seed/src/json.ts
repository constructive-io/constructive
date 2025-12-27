import { ClientInput, JsonSeedMap, unwrapClient } from './types';

/**
 * Insert JSON data into a PostgreSQL table.
 * 
 * @param client - PostgreSQL client (raw pg.Client/PoolClient or wrapper with .client property)
 * @param table - Target table name (can include schema, e.g., 'public.users')
 * @param rows - Array of row objects to insert
 * 
 * @example
 * ```typescript
 * import { Client } from 'pg';
 * import { insertJson } from 'pg-seed';
 * 
 * const client = new Client();
 * await client.connect();
 * await insertJson(client, 'users', [
 *   { name: 'Alice', email: 'alice@example.com' },
 *   { name: 'Bob', email: 'bob@example.com' }
 * ]);
 * ```
 */
export async function insertJson(
  client: ClientInput,
  table: string,
  rows: Record<string, any>[]
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const pgClient = unwrapClient(client);
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values = columns.map((c) => row[c]);
    await pgClient.query(sql, values);
  }
}

/**
 * Insert JSON data into multiple PostgreSQL tables.
 * 
 * @param client - PostgreSQL client (raw pg.Client/PoolClient or wrapper with .client property)
 * @param data - Map of table names to arrays of row objects
 * 
 * @example
 * ```typescript
 * import { Client } from 'pg';
 * import { insertJsonMap } from 'pg-seed';
 * 
 * const client = new Client();
 * await client.connect();
 * await insertJsonMap(client, {
 *   'users': [
 *     { name: 'Alice', email: 'alice@example.com' }
 *   ],
 *   'orders': [
 *     { user_id: 1, total: 99.99 }
 *   ]
 * });
 * ```
 */
export async function insertJsonMap(
  client: ClientInput,
  data: JsonSeedMap
): Promise<void> {
  for (const [table, rows] of Object.entries(data)) {
    await insertJson(client, table, rows);
  }
}
