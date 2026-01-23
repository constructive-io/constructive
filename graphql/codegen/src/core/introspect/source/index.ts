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
export * from './api-schemas';

import type { SchemaSource } from './types';
import type { DbConfig, PgpmConfig } from '../../../types/config';
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
  schemaFile: string;
}

/**
 * Options for database-based schema source
 */
export interface DatabaseSourceOptions {
  database: string;
  schemas?: string[];
  apiNames?: string[];
}

/**
 * Options for PGPM module-based schema source (direct path)
 */
export interface PgpmModulePathSourceOptions {
  pgpmModulePath: string;
  schemas?: string[];
  apiNames?: string[];
  keepDb?: boolean;
}

/**
 * Options for PGPM module-based schema source (workspace + module name)
 */
export interface PgpmWorkspaceSourceOptions {
  pgpmWorkspacePath: string;
  pgpmModuleName: string;
  schemas?: string[];
  apiNames?: string[];
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
  schemaFile?: string;

  /**
   * Database configuration for direct database introspection or PGPM module
   */
  db?: DbConfig;

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
export type SourceMode = 'endpoint' | 'schemaFile' | 'database' | 'pgpm-module' | 'pgpm-workspace';

export function detectSourceMode(options: CreateSchemaSourceOptions): SourceMode | null {
  if (options.endpoint) return 'endpoint';
  if (options.schemaFile) return 'schemaFile';
  if (options.db) {
    // Check for PGPM modes first
    if (options.db.pgpm?.modulePath) return 'pgpm-module';
    if (options.db.pgpm?.workspacePath && options.db.pgpm?.moduleName) return 'pgpm-workspace';
    // Default to database mode if db is specified without pgpm
    return 'database';
  }
  return null;
}

/**
 * Create a schema source based on configuration
 *
 * Supports five modes:
 * - endpoint: Introspect from a live GraphQL endpoint
 * - schemaFile: Load from a local .graphql file
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
    case 'schemaFile':
      return new FileSchemaSource({
        schemaPath: options.schemaFile!,
      });

    case 'endpoint':
      return new EndpointSchemaSource({
        endpoint: options.endpoint!,
        authorization: options.authorization,
        headers: options.headers,
        timeout: options.timeout,
      });

    case 'database':
      // Database mode uses db.config for connection (falls back to env vars)
      // and db.schemas or db.apiNames for schema selection
      return new DatabaseSchemaSource({
        database: options.db?.config?.database ?? '',
        schemas: options.db?.schemas,
        apiNames: options.db?.apiNames,
      });

    case 'pgpm-module':
      return new PgpmModuleSchemaSource({
        pgpmModulePath: options.db!.pgpm!.modulePath!,
        schemas: options.db?.schemas,
        apiNames: options.db?.apiNames,
        keepDb: options.db?.keepDb,
      });

    case 'pgpm-workspace':
      return new PgpmModuleSchemaSource({
        pgpmWorkspacePath: options.db!.pgpm!.workspacePath!,
        pgpmModuleName: options.db!.pgpm!.moduleName!,
        schemas: options.db?.schemas,
        apiNames: options.db?.apiNames,
        keepDb: options.db?.keepDb,
      });

    default:
      throw new Error(
        'No source specified. Use one of: endpoint, schemaFile, or db (with optional pgpm for module deployment).'
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
  // Count primary sources
  const sources = [
    options.endpoint,
    options.schemaFile,
    options.db,
  ].filter(Boolean);

  if (sources.length === 0) {
    return {
      valid: false,
      error:
        'No source specified. Use one of: endpoint, schemaFile, or db.',
    };
  }

  if (sources.length > 1) {
    return {
      valid: false,
      error:
        'Multiple sources specified. Use only one of: endpoint, schemaFile, or db.',
    };
  }

  // Validate pgpm workspace mode has both required fields
  if (options.db?.pgpm) {
    const pgpm = options.db.pgpm;
    if (pgpm.workspacePath && !pgpm.moduleName) {
      return {
        valid: false,
        error: 'db.pgpm.workspacePath requires db.pgpm.moduleName to be specified.',
      };
    }

    if (pgpm.moduleName && !pgpm.workspacePath) {
      return {
        valid: false,
        error: 'db.pgpm.moduleName requires db.pgpm.workspacePath to be specified.',
      };
    }

    // Must have either modulePath or workspacePath+moduleName
    if (!pgpm.modulePath && !(pgpm.workspacePath && pgpm.moduleName)) {
      return {
        valid: false,
        error: 'db.pgpm requires either modulePath or both workspacePath and moduleName.',
      };
    }
  }

  // For database mode, validate schemas/apiNames mutual exclusivity
  if (options.db) {
    const hasSchemas = options.db.schemas && options.db.schemas.length > 0;
    const hasApiNames = options.db.apiNames && options.db.apiNames.length > 0;

    if (hasSchemas && hasApiNames) {
      return {
        valid: false,
        error: 'Cannot specify both db.schemas and db.apiNames. Use one or the other.',
      };
    }

    if (!hasSchemas && !hasApiNames) {
      return {
        valid: false,
        error: 'Must specify either db.schemas or db.apiNames for database mode.',
      };
    }
  }

  return { valid: true };
}
