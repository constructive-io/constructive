/**
 * Schema Source Module
 *
 * Provides a unified interface for loading GraphQL schemas from different sources:
 * - Live GraphQL endpoints (via introspection)
 * - Static .graphql schema files
 * - PostgreSQL databases (via PostGraphile introspection)
 */
export * from './types';
export * from './endpoint';
export * from './file';
export * from './database';

import type { SchemaSource } from './types';
import { EndpointSchemaSource } from './endpoint';
import { FileSchemaSource } from './file';
import { DatabaseSchemaSource } from './database';

/**
 * Options for endpoint-based schema source
 */
export interface EndpointSourceOptions {
  endpoint: string;
  authorization?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Options for file-based schema source
 */
export interface FileSourceOptions {
  schema: string;
}

/**
 * Options for database-based schema source
 */
export interface DatabaseSourceOptions {
  database: string;
  schemas?: string[];
}

export interface CreateSchemaSourceOptions {
  /**
   * GraphQL endpoint URL (for live introspection)
   */
  endpoint?: string;

  /**
   * Path to GraphQL schema file (.graphql)
   */
  schema?: string;

  /**
   * Database name or connection string (for database introspection)
   */
  database?: string;

  /**
   * PostgreSQL schemas to include (for database mode)
   * @default ['public']
   */
  schemas?: string[];

  /**
   * Optional authorization header for endpoint requests
   */
  authorization?: string;

  /**
   * Optional additional headers for endpoint requests
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds (for endpoint requests)
   */
  timeout?: number;
}

/**
 * Detect which source mode is being used based on options
 */
export type SourceMode = 'endpoint' | 'schema' | 'database';

export function detectSourceMode(options: CreateSchemaSourceOptions): SourceMode | null {
  if (options.endpoint) return 'endpoint';
  if (options.schema) return 'schema';
  if (options.database) return 'database';
  return null;
}

/**
 * Create a schema source based on configuration
 *
 * Supports three modes:
 * - endpoint: Introspect from a live GraphQL endpoint
 * - schema: Load from a local .graphql file
 * - database: Introspect directly from a PostgreSQL database
 *
 * @param options - Source configuration
 * @returns Appropriate SchemaSource implementation
 * @throws Error if no valid source is provided
 */
export function createSchemaSource(
  options: CreateSchemaSourceOptions
): SchemaSource {
  const mode = detectSourceMode(options);

  switch (mode) {
    case 'schema':
      return new FileSchemaSource({
        schemaPath: options.schema!,
      });

    case 'endpoint':
      return new EndpointSchemaSource({
        endpoint: options.endpoint!,
        authorization: options.authorization,
        headers: options.headers,
        timeout: options.timeout,
      });

    case 'database':
      return new DatabaseSchemaSource({
        database: options.database!,
        schemas: options.schemas,
      });

    default:
      throw new Error(
        'No source specified. Use one of: endpoint (URL), schema (file path), or database (name/connection string).'
      );
  }
}

/**
 * Validate that source options are valid (exactly one source specified)
 */
export function validateSourceOptions(options: CreateSchemaSourceOptions): {
  valid: boolean;
  error?: string;
} {
  const sources = [options.endpoint, options.schema, options.database].filter(Boolean);

  if (sources.length === 0) {
    return {
      valid: false,
      error: 'No source specified. Use one of: endpoint, schema, or database.',
    };
  }

  if (sources.length > 1) {
    return {
      valid: false,
      error: 'Multiple sources specified. Use only one of: endpoint, schema, or database.',
    };
  }

  return { valid: true };
}
