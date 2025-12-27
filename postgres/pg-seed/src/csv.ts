import { pipeline } from 'node:stream/promises';

import { parse } from 'csv-parse';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { from as copyFrom, to as copyTo } from 'pg-copy-streams';

import { ClientInput, CsvSeedMap, unwrapClient } from './types';

/**
 * Parse the header row from a CSV file to get column names
 */
async function parseCsvHeader(filePath: string): Promise<string[]> {
  const file = createReadStream(filePath);
  const parser = parse({
    bom: true,
    to_line: 1,
    skip_empty_lines: true,
  });

  return new Promise<string[]>((resolve, reject) => {
    const cleanup = (err?: unknown) => {
      parser.destroy();
      file.destroy();
      if (err) reject(err);
    };

    parser.on('readable', () => {
      const row = parser.read() as string[] | null;
      if (!row) return;
      
      if (row.length === 0) {
        cleanup(new Error('CSV header has no columns'));
        return;
      }
      
      cleanup();
      resolve(row);
    });

    parser.on('error', cleanup);
    file.on('error', cleanup);

    file.pipe(parser);
  });
}

/**
 * Load CSV data into a PostgreSQL table using COPY protocol.
 * This is significantly faster than INSERT for large datasets.
 * 
 * @param client - PostgreSQL client (raw pg.Client/PoolClient or wrapper with .client property)
 * @param table - Target table name (can include schema, e.g., 'public.users')
 * @param filePath - Path to the CSV file
 * 
 * @example
 * ```typescript
 * import { Client } from 'pg';
 * import { loadCsv } from 'pg-seed';
 * 
 * const client = new Client();
 * await client.connect();
 * await loadCsv(client, 'users', './data/users.csv');
 * ```
 */
export async function loadCsv(
  client: ClientInput,
  table: string,
  filePath: string
): Promise<void> {
  if (!existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const pgClient = unwrapClient(client);
  const columns = await parseCsvHeader(filePath);
  
  const quotedColumns = columns.map(col => `"${col.replace(/"/g, '""')}"`);
  const columnList = quotedColumns.join(', ');
  const copyCommand = `COPY ${table} (${columnList}) FROM STDIN WITH CSV HEADER`;
  
  const stream = pgClient.query(copyFrom(copyCommand));
  const source = createReadStream(filePath);

  await pipeline(source, stream);
}

/**
 * Load multiple CSV files into PostgreSQL tables using COPY protocol.
 * 
 * @param client - PostgreSQL client (raw pg.Client/PoolClient or wrapper with .client property)
 * @param tables - Map of table names to CSV file paths
 * 
 * @example
 * ```typescript
 * import { Client } from 'pg';
 * import { loadCsvMap } from 'pg-seed';
 * 
 * const client = new Client();
 * await client.connect();
 * await loadCsvMap(client, {
 *   'users': './data/users.csv',
 *   'orders': './data/orders.csv'
 * });
 * ```
 */
export async function loadCsvMap(
  client: ClientInput,
  tables: CsvSeedMap
): Promise<void> {
  for (const [table, filePath] of Object.entries(tables)) {
    await loadCsv(client, table, filePath);
  }
}

/**
 * Export a PostgreSQL table to a CSV file using COPY protocol.
 * 
 * @param client - PostgreSQL client (raw pg.Client/PoolClient or wrapper with .client property)
 * @param table - Source table name (can include schema, e.g., 'public.users')
 * @param filePath - Path to write the CSV file
 * 
 * @example
 * ```typescript
 * import { Client } from 'pg';
 * import { exportCsv } from 'pg-seed';
 * 
 * const client = new Client();
 * await client.connect();
 * await exportCsv(client, 'users', './backup/users.csv');
 * ```
 */
export async function exportCsv(
  client: ClientInput,
  table: string,
  filePath: string
): Promise<void> {
  const pgClient = unwrapClient(client);
  const stream = pgClient.query(copyTo(`COPY ${table} TO STDOUT WITH CSV HEADER`));
  const target = createWriteStream(filePath);

  await pipeline(stream, target);
}
