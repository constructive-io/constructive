/**
 * Schema Source Module
 *
 * Provides a unified interface for loading GraphQL schemas from different sources:
 * - Live GraphQL endpoints (via introspection)
 * - Static .graphql schema files
 * - PostgreSQL databases (via PostGraphile introspection)
 * - PGPM modules (via ephemeral database deployment)
 */
export * from './types';
export * from './endpoint';
export * from './file';
export * from './database';
export * from './pgpm-module';

import type { SchemaSource } from './types';
import { EndpointSchemaSource } from './endpoint';
import { FileSchemaSource } from './file';
import { DatabaseSchemaSource } from './database';
import {
  PgpmModuleSchemaSource,
  isPgpmModulePathOptions,
  isPgpmWorkspaceOptions,
} from './pgpm-module';

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

/**
 * Options for PGPM module-based schema source (direct path)
 */
export interface PgpmModulePathSourceOptions {
  pgpmModulePath: string;
  schemas?: string[];
  keepDb?: boolean;
}

/**
 * Options for PGPM module-based schema source (workspace + module name)
 */
export interface PgpmWorkspaceSourceOptions {
  pgpmWorkspacePath: string;
  pgpmModuleName: string;
  schemas?: string[];
  keepDb?: boolean;
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
   * Path to a PGPM module directory (for module introspection)
   * Creates an ephemeral database, deploys the module, and introspects
   */
  pgpmModulePath?: string;

  /**
   * Path to a PGPM workspace directory (used with pgpmModuleName)
   */
  pgpmWorkspacePath?: string;

  /**
   * Name of the module within the workspace (used with pgpmWorkspacePath)
   */
  pgpmModuleName?: string;

  /**
   * PostgreSQL schemas to include (for database and pgpm module modes)
   * @default ['public']
   */
  schemas?: string[];

  /**
   * Keep the ephemeral database after introspection (for debugging, pgpm module mode only)
   * @default false
   */
  keepDb?: boolean;

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
export type SourceMode = 'endpoint' | 'schema' | 'database' | 'pgpm-module' | 'pgpm-workspace';

export function detectSourceMode(options: CreateSchemaSourceOptions): SourceMode | null {
  if (options.endpoint) return 'endpoint';
  if (options.schema) return 'schema';
  if (options.database) return 'database';
  if (options.pgpmModulePath) return 'pgpm-module';
  if (options.pgpmWorkspacePath && options.pgpmModuleName) return 'pgpm-workspace';
  return null;
}

/**
 * Create a schema source based on configuration
 *
 * Supports five modes:
 * - endpoint: Introspect from a live GraphQL endpoint
 * - schema: Load from a local .graphql file
 * - database: Introspect directly from a PostgreSQL database
 * - pgpm-module: Deploy a PGPM module to an ephemeral database and introspect
 * - pgpm-workspace: Deploy a module from a PGPM workspace to an ephemeral database and introspect
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

    case 'pgpm-module':
      return new PgpmModuleSchemaSource({
        pgpmModulePath: options.pgpmModulePath!,
        schemas: options.schemas,
        keepDb: options.keepDb,
      });

    case 'pgpm-workspace':
      return new PgpmModuleSchemaSource({
        pgpmWorkspacePath: options.pgpmWorkspacePath!,
        pgpmModuleName: options.pgpmModuleName!,
        schemas: options.schemas,
        keepDb: options.keepDb,
      });

    default:
      throw new Error(
        'No source specified. Use one of: endpoint (URL), schema (file path), database (name/connection string), pgpmModulePath (module directory), or pgpmWorkspacePath + pgpmModuleName.'
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
  // Check for pgpm workspace mode (requires both pgpmWorkspacePath and pgpmModuleName)
  const hasPgpmWorkspace = options.pgpmWorkspacePath && options.pgpmModuleName;

  // Count primary sources (pgpm workspace counts as one source)
  const sources = [
    options.endpoint,
    options.schema,
    options.database,
    options.pgpmModulePath,
    hasPgpmWorkspace,
  ].filter(Boolean);

  if (sources.length === 0) {
    return {
      valid: false,
      error:
        'No source specified. Use one of: endpoint, schema, database, pgpmModulePath, or pgpmWorkspacePath + pgpmModuleName.',
    };
  }

  if (sources.length > 1) {
    return {
      valid: false,
      error:
        'Multiple sources specified. Use only one of: endpoint, schema, database, pgpmModulePath, or pgpmWorkspacePath + pgpmModuleName.',
    };
  }

  // Validate pgpm workspace mode has both required fields
  if (options.pgpmWorkspacePath && !options.pgpmModuleName) {
    return {
      valid: false,
      error: 'pgpmWorkspacePath requires pgpmModuleName to be specified.',
    };
  }

  if (options.pgpmModuleName && !options.pgpmWorkspacePath) {
    return {
      valid: false,
      error: 'pgpmModuleName requires pgpmWorkspacePath to be specified.',
    };
  }

  return { valid: true };
}
