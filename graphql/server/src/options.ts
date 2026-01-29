import type { PgConfig } from 'pg-env';
import type {
  ServerOptions,
  CDNOptions,
  DeploymentOptions,
  MigrationOptions,
  JobsConfig,
  ErrorOutputOptions,
  SmtpOptions,
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

/**
 * GraphQL Server Options - Complete configuration interface
 *
 * This interface represents all configuration options available to the GraphQL server.
 * It includes 5 currently active fields used by the server and 7 future extensibility fields.
 */
export interface GraphqlServerOptions {
  // ============================================
  // CURRENTLY USED BY SERVER (5 fields)
  // ============================================

  /** PostgreSQL connection configuration */
  pg?: Partial<PgConfig>;

  /** HTTP server configuration (host, port, trustProxy, origin) */
  server?: ServerOptions;

  /** API configuration options (services, schemas, roles) */
  api?: ApiOptions;

  /** PostGraphile/Graphile v5 configuration (schema, presets) */
  graphile?: GraphileOptions;

  /** Feature flags and toggles for GraphQL/Graphile */
  features?: GraphileFeatureOptions;

  // ============================================
  // INCLUDED FOR FUTURE EXTENSIBILITY (7 fields)
  // ============================================

  /** Test database configuration options */
  db?: Partial<PgTestConnectionOptions>;

  /** CDN and file storage configuration */
  cdn?: CDNOptions;

  /** Module deployment configuration */
  deployment?: DeploymentOptions;

  /** Migration and code generation options */
  migrations?: MigrationOptions;

  /** Job system configuration */
  jobs?: JobsConfig;

  /** Error output formatting options */
  errorOutput?: ErrorOutputOptions;

  /** SMTP email configuration */
  smtp?: SmtpOptions;
}

/**
 * Default values for active GraphQL server options.
 * Only includes defaults for the 5 active fields.
 * Future extensibility fields are left undefined.
 */
export const graphqlServerDefaults: GraphqlServerOptions = {
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
  // Future fields intentionally omitted from defaults
};

// ============================================
// INTERNAL UTILITIES
// ============================================

/**
 * Simple deep merge utility for configuration objects.
 * Arrays are replaced (not merged) to match expected behavior.
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>;
  const src = source as Record<string, unknown>;

  for (const key of Object.keys(src)) {
    const sourceValue = src[key];
    const targetValue = result[key];

    if (sourceValue === undefined) {
      continue;
    }

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else {
      // Replace primitives, arrays, and null values
      result[key] = sourceValue;
    }
  }

  return result as T;
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Checks if the given value is a valid GraphqlServerOptions object.
 * Returns true if the object contains at least one recognized server option field.
 *
 * @param opts - Unknown value to check
 * @returns True if opts is a GraphqlServerOptions object
 */
export function isGraphqlServerOptions(opts: unknown): opts is GraphqlServerOptions {
  if (opts === null || opts === undefined) {
    return false;
  }

  if (typeof opts !== 'object') {
    return false;
  }

  const obj = opts as Record<string, unknown>;

  // Check for at least one recognized field from the interface
  const recognizedFields = [
    'pg', 'server', 'api', 'graphile', 'features',
    'db', 'cdn', 'deployment', 'migrations', 'jobs', 'errorOutput', 'smtp'
  ];

  const hasRecognizedField = recognizedFields.some(field => field in obj);

  if (!hasRecognizedField) {
    return false;
  }

  // Validate that recognized fields have object values (not primitives)
  for (const field of recognizedFields) {
    if (field in obj && obj[field] !== undefined && obj[field] !== null) {
      if (typeof obj[field] !== 'object') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Type guard to check if an object has a pg configuration.
 *
 * @param opts - Unknown value to check
 * @returns True if opts has a pg property
 */
export function hasPgConfig(opts: unknown): opts is { pg: Partial<PgConfig> } {
  if (opts === null || opts === undefined || typeof opts !== 'object') {
    return false;
  }

  return 'pg' in opts && (opts as Record<string, unknown>).pg !== undefined;
}

/**
 * Type guard to check if an object has a server configuration.
 *
 * @param opts - Unknown value to check
 * @returns True if opts has a server property
 */
export function hasServerConfig(opts: unknown): opts is { server: ServerOptions } {
  if (opts === null || opts === undefined || typeof opts !== 'object') {
    return false;
  }

  return 'server' in opts && (opts as Record<string, unknown>).server !== undefined;
}

/**
 * Type guard to check if an object has an API configuration.
 *
 * @param opts - Unknown value to check
 * @returns True if opts has an api property
 */
export function hasApiConfig(opts: unknown): opts is { api: ApiOptions } {
  if (opts === null || opts === undefined || typeof opts !== 'object') {
    return false;
  }

  return 'api' in opts && (opts as Record<string, unknown>).api !== undefined;
}

// ============================================
// CONVERSION UTILITIES
// ============================================

/**
 * Extracts GraphQL server-relevant fields from a ConstructiveOptions object.
 * This function picks only the fields that are part of GraphqlServerOptions.
 *
 * @param opts - Full ConstructiveOptions object
 * @returns GraphqlServerOptions with only relevant fields
 */
export function toGraphqlServerOptions(opts: ConstructiveOptions): GraphqlServerOptions {
  const result: GraphqlServerOptions = {};

  // Active fields (5)
  if (opts.pg !== undefined) {
    result.pg = opts.pg;
  }
  if (opts.server !== undefined) {
    result.server = opts.server;
  }
  if (opts.api !== undefined) {
    result.api = opts.api;
  }
  if (opts.graphile !== undefined) {
    result.graphile = opts.graphile;
  }
  if (opts.features !== undefined) {
    result.features = opts.features;
  }

  // Future extensibility fields (7)
  if (opts.db !== undefined) {
    result.db = opts.db;
  }
  if (opts.cdn !== undefined) {
    result.cdn = opts.cdn;
  }
  if (opts.deployment !== undefined) {
    result.deployment = opts.deployment;
  }
  if (opts.migrations !== undefined) {
    result.migrations = opts.migrations;
  }
  if (opts.jobs !== undefined) {
    result.jobs = opts.jobs;
  }
  if ((opts as Record<string, unknown>).errorOutput !== undefined) {
    result.errorOutput = (opts as Record<string, unknown>).errorOutput as ErrorOutputOptions;
  }
  if ((opts as Record<string, unknown>).smtp !== undefined) {
    result.smtp = (opts as Record<string, unknown>).smtp as SmtpOptions;
  }

  return result;
}

/**
 * Normalizes input to a GraphqlServerOptions object with defaults applied.
 * Accepts either GraphqlServerOptions or ConstructiveOptions as input.
 * Missing fields are filled in from graphqlServerDefaults via deep merge.
 *
 * @param opts - Input options (GraphqlServerOptions or ConstructiveOptions)
 * @returns Normalized GraphqlServerOptions with defaults applied
 */
export function normalizeServerOptions(
  opts: GraphqlServerOptions | ConstructiveOptions
): GraphqlServerOptions {
  // Extract only GraphQL server fields if this is a ConstructiveOptions
  const serverOpts = isGraphqlServerOptions(opts)
    ? opts
    : toGraphqlServerOptions(opts);

  // Deep merge with defaults - user options override defaults
  return deepMerge(graphqlServerDefaults, serverOpts);
}

/**
 * Detects if the given options object uses a legacy format.
 * Legacy formats include:
 * - `schemas` array instead of `graphile.schema`
 * - `pgConfig` instead of `pg`
 * - Flat server config (e.g., `serverPort` instead of `server.port`)
 *
 * @param opts - Unknown value to check
 * @returns True if the object appears to use legacy option format
 */
export function isLegacyOptions(opts: unknown): boolean {
  if (opts === null || opts === undefined || typeof opts !== 'object') {
    return false;
  }

  const obj = opts as Record<string, unknown>;

  // Check for legacy field names
  const legacyFields = [
    'schemas',      // Old array-style schema config (should be graphile.schema)
    'pgConfig',     // Old naming (should be pg)
    'serverPort',   // Flat config (should be server.port)
    'serverHost',   // Flat config (should be server.host)
    'dbConfig',     // Old naming (should be db)
    'postgraphile', // Old Graphile v4 naming (should be graphile)
    'pgPool',       // Direct pool config (deprecated)
    'jwtSecret',    // Flat JWT config (should be in api or auth)
    'watchPg'       // Old PostGraphile v4 option
  ];

  return legacyFields.some(field => field in obj);
}

// Re-export types for convenience
export type {
  PgConfig,
  ServerOptions,
  CDNOptions as CdnOptions, // Alias for spec consistency
  DeploymentOptions,
  MigrationOptions,
  JobsConfig as JobsOptions, // Alias for spec consistency
  ErrorOutputOptions,
  SmtpOptions,
  PgTestConnectionOptions as DbOptions, // Alias for spec consistency
  GraphileOptions,
  GraphileFeatureOptions,
  ApiOptions,
  ConstructiveOptions
};
