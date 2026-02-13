/**
 * GraphQL Server Options - Configuration utilities
 *
 * This module provides type-safe configuration utilities for the GraphQL server.
 * It includes type guards for runtime validation and utility functions for
 * configuration normalization.
 *
 * The main configuration type is `ConstructiveOptions` from @constructive-io/graphql-types.
 *
 * @module options
 */

import deepmerge from 'deepmerge';
import type { PgConfig } from 'pg-env';
import type {
  ServerOptions,
  CDNOptions,
  DeploymentOptions,
  MigrationOptions,
  JobsConfig,
  PgTestConnectionOptions
} from '@pgpmjs/types';
import type {
  ConstructiveOptions,
  GraphileOptions,
  GraphileFeatureOptions,
  ApiOptions
} from '@constructive-io/graphql-types';
import {
  graphileDefaults,
  graphileFeatureDefaults,
  apiDefaults
} from '@constructive-io/graphql-types';

// ============================================
// Type Re-exports for convenience
// ============================================

export type {
  PgConfig,
  ServerOptions,
  CDNOptions,
  DeploymentOptions,
  MigrationOptions,
  JobsConfig,
  PgTestConnectionOptions,
  GraphileOptions,
  GraphileFeatureOptions,
  ApiOptions,
  ConstructiveOptions
};

// Type aliases for spec consistency
export type CdnOptions = CDNOptions;
export type JobsOptions = JobsConfig;
export type DbOptions = PgTestConnectionOptions;

// ============================================
// Default Configuration
// ============================================

/**
 * Default configuration values for GraphQL server
 *
 * Provides sensible defaults for all currently active fields.
 */
export const serverDefaults: Partial<ConstructiveOptions> = {
  pg: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'postgres'
  },
  server: {
    host: 'localhost',
    port: 3000,
    trustProxy: false,
    strictAuth: false
  },
  api: apiDefaults,
  graphile: graphileDefaults,
  features: graphileFeatureDefaults
};

// ============================================
// Type Guards
// ============================================

/**
 * List of all recognized fields in ConstructiveOptions
 */
const RECOGNIZED_FIELDS = [
  'pg',
  'server',
  'api',
  'graphile',
  'features',
  'db',
  'cdn',
  'deployment',
  'migrations',
  'jobs'
] as const;

/**
 * Type guard to validate if an unknown value is a valid ConstructiveOptions object
 *
 * Validates that:
 * 1. The value is a non-null object
 * 2. Contains at least one recognized field from the interface
 * 3. All recognized fields that exist have object values (not primitives)
 *
 * @param opts - Unknown value to validate
 * @returns True if opts is a valid ConstructiveOptions object
 *
 * @example
 * ```typescript
 * if (isConstructiveOptions(unknownConfig)) {
 *   // TypeScript knows unknownConfig is ConstructiveOptions
 *   const { pg, server } = unknownConfig;
 * }
 * ```
 */
export function isConstructiveOptions(opts: unknown): opts is ConstructiveOptions {
  if (opts === null || opts === undefined) {
    return false;
  }

  if (typeof opts !== 'object') {
    return false;
  }

  const obj = opts as Record<string, unknown>;

  // Check for at least one recognized field from the interface
  const hasRecognizedField = RECOGNIZED_FIELDS.some((field) => field in obj);

  if (!hasRecognizedField) {
    return false;
  }

  // Validate that recognized fields have object values (not primitives)
  for (const field of RECOGNIZED_FIELDS) {
    if (field in obj && obj[field] !== undefined && obj[field] !== null) {
      if (typeof obj[field] !== 'object') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Type guard to check if an object has PostgreSQL configuration
 *
 * @param opts - Unknown value to check
 * @returns True if opts has a defined pg property
 *
 * @example
 * ```typescript
 * if (hasPgConfig(config)) {
 *   console.log(config.pg.host);
 * }
 * ```
 */
export function hasPgConfig(opts: unknown): opts is { pg: Partial<PgConfig> } {
  if (opts === null || opts === undefined || typeof opts !== 'object') {
    return false;
  }
  return 'pg' in opts && (opts as Record<string, unknown>).pg !== undefined;
}

/**
 * Type guard to check if an object has HTTP server configuration
 *
 * @param opts - Unknown value to check
 * @returns True if opts has a defined server property
 *
 * @example
 * ```typescript
 * if (hasServerConfig(config)) {
 *   console.log(config.server.port);
 * }
 * ```
 */
export function hasServerConfig(opts: unknown): opts is { server: ServerOptions } {
  if (opts === null || opts === undefined || typeof opts !== 'object') {
    return false;
  }
  return 'server' in opts && (opts as Record<string, unknown>).server !== undefined;
}

/**
 * Type guard to check if an object has API configuration
 *
 * @param opts - Unknown value to check
 * @returns True if opts has a defined api property
 *
 * @example
 * ```typescript
 * if (hasApiConfig(config)) {
 *   console.log(config.api.exposedSchemas);
 * }
 * ```
 */
export function hasApiConfig(opts: unknown): opts is { api: ApiOptions } {
  if (opts === null || opts === undefined || typeof opts !== 'object') {
    return false;
  }
  return 'api' in opts && (opts as Record<string, unknown>).api !== undefined;
}

// ============================================
// Internal Utilities
// ============================================

/**
 * Array merge strategy that replaces arrays (source wins over target).
 * This ensures that when a user specifies an array value, it replaces
 * the default rather than merging/concatenating.
 *
 * @internal
 */
const replaceArrays = <T>(_target: T[], source: T[]): T[] => source;

// ============================================
// Utility Functions
// ============================================

/**
 * Legacy field names that indicate old configuration format
 */
const LEGACY_FIELDS = [
  'schemas', // Old array-style schema config (should be graphile.schema)
  'pgConfig', // Old naming (should be pg)
  'serverPort', // Flat config (should be server.port)
  'serverHost', // Flat config (should be server.host)
  'dbConfig', // Old naming (should be db)
  'postgraphile', // Old Graphile v4 naming (should be graphile)
  'pgPool', // Direct pool config (deprecated)
  'jwtSecret', // Flat JWT config (should be in api or auth)
  'watchPg' // Old PostGraphile v4 option
] as const;

/**
 * Detects if the given options object uses a deprecated/legacy format
 *
 * Checks for presence of legacy field names that indicate the configuration
 * needs to be migrated to ConstructiveOptions format.
 *
 * @param opts - Unknown value to check
 * @returns True if legacy configuration patterns are detected
 *
 * @example
 * ```typescript
 * if (isLegacyOptions(config)) {
 *   console.warn('Detected legacy configuration format. Please migrate to ConstructiveOptions.');
 * }
 * ```
 */
export function isLegacyOptions(opts: unknown): boolean {
  if (opts === null || opts === undefined || typeof opts !== 'object') {
    return false;
  }

  const obj = opts as Record<string, unknown>;
  return LEGACY_FIELDS.some((field) => field in obj);
}

/**
 * Normalizes input to a ConstructiveOptions object with defaults applied
 *
 * Accepts ConstructiveOptions and returns a fully normalized object
 * with default values applied via deep merge. User-provided values override defaults.
 *
 * @param opts - ConstructiveOptions to normalize
 * @returns ConstructiveOptions with defaults filled in
 *
 * @example
 * ```typescript
 * // Partial config - missing fields filled from defaults
 * const normalized = normalizeServerOptions({
 *   pg: { database: 'myapp' }
 * });
 *
 * // normalized.pg.host === 'localhost' (from default)
 * // normalized.pg.database === 'myapp' (from user config)
 * // normalized.server.port === 3000 (from default)
 * ```
 */
export function normalizeServerOptions(
  opts: ConstructiveOptions
): ConstructiveOptions {
  // Deep merge with defaults - user options override defaults
  return deepmerge(serverDefaults, opts, { arrayMerge: replaceArrays }) as ConstructiveOptions;
}
