import { existsSync, readFileSync } from 'fs';

import { ClientInput, unwrapClient } from './types';

/**
 * Execute a SQL file against a PostgreSQL database.
 * 
 * @param client - PostgreSQL client (raw pg.Client/PoolClient or wrapper with .client property)
 * @param filePath - Path to the SQL file
 * 
 * @example
 * ```typescript
 * import { Client } from 'pg';
 * import { loadSql } from 'pg-seed';
 * 
 * const client = new Client();
 * await client.connect();
 * await loadSql(client, './migrations/001-schema.sql');
 * ```
 */
export async function loadSql(
  client: ClientInput,
  filePath: string
): Promise<void> {
  if (!existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }
  
  const pgClient = unwrapClient(client);
  const sql = readFileSync(filePath, 'utf-8');
  
  await pgClient.query(sql);
}

/**
 * Execute multiple SQL files against a PostgreSQL database.
 * Files are executed in the order provided.
 * 
 * @param client - PostgreSQL client (raw pg.Client/PoolClient or wrapper with .client property)
 * @param files - Array of SQL file paths to execute
 * 
 * @example
 * ```typescript
 * import { Client } from 'pg';
 * import { loadSqlFiles } from 'pg-seed';
 * 
 * const client = new Client();
 * await client.connect();
 * await loadSqlFiles(client, [
 *   './migrations/001-schema.sql',
 *   './migrations/002-data.sql'
 * ]);
 * ```
 */
export async function loadSqlFiles(
  client: ClientInput,
  files: string[]
): Promise<void> {
  for (const file of files) {
    await loadSql(client, file);
  }
}

/**
 * Execute a SQL string against a PostgreSQL database.
 * 
 * @param client - PostgreSQL client (raw pg.Client/PoolClient or wrapper with .client property)
 * @param sql - SQL string to execute
 * 
 * @example
 * ```typescript
 * import { Client } from 'pg';
 * import { execSql } from 'pg-seed';
 * 
 * const client = new Client();
 * await client.connect();
 * await execSql(client, 'INSERT INTO users (name) VALUES ($1)', ['Alice']);
 * ```
 */
export async function execSql(
  client: ClientInput,
  sql: string,
  values?: any[]
): Promise<void> {
  const pgClient = unwrapClient(client);
  await pgClient.query(sql, values);
}
