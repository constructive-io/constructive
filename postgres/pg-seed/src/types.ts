import type { Client, PoolClient, QueryResult } from 'pg';

/**
 * A client that can execute queries. This is the minimal interface needed
 * for JSON and SQL seeding operations.
 */
export interface QueryableClient {
  query<T = any>(sql: string, values?: any[]): Promise<QueryResult<T>>;
}

/**
 * A client that supports COPY streaming operations.
 * This must be a raw pg Client or PoolClient, not a wrapper.
 */
export type CopyableClient = Client | PoolClient;

/**
 * Input type that accepts either a raw pg client or a wrapper that exposes
 * the underlying client via a `client` property.
 * 
 * This allows pg-seed to work with:
 * - Raw pg.Client or pg.PoolClient
 * - Wrappers like PgTestClient that expose `.client`
 */
export type ClientInput = CopyableClient | { client: CopyableClient };

/**
 * Unwrap a ClientInput to get the underlying pg Client/PoolClient.
 * This is necessary for COPY operations which require the raw client.
 */
export function unwrapClient(input: ClientInput): CopyableClient {
  if ('client' in input && input.client) {
    return input.client;
  }
  return input as CopyableClient;
}

/**
 * Map of table names to CSV file paths for bulk loading
 */
export interface CsvSeedMap {
  [tableName: string]: string;
}

/**
 * Map of table names to arrays of row objects for JSON seeding
 */
export interface JsonSeedMap {
  [tableName: string]: Record<string, any>[];
}
