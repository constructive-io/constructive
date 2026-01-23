/**
 * SDK Configuration types
 */

import deepmerge from 'deepmerge';

/**
 * Array merge strategy that replaces arrays (source wins over target).
 * This ensures that when a user specifies include: ['users'], it replaces
 * the default ['*'] rather than merging to ['*', 'users'].
 */
const replaceArrays = <T>(_target: T[], source: T[]): T[] => source;

/**
 * Entity relationship definition for cascade invalidation
 */
export interface EntityRelationship {
  /** Parent entity name (e.g., 'database' for a table) */
  parent: string;
  /** Foreign key field name that references the parent (e.g., 'databaseId') */
  foreignKey: string;
  /** Optional transitive ancestors for deep invalidation (e.g., ['database', 'organization']) */
  ancestors?: string[];
}

/**
 * Query key generation configuration
 */
export interface QueryKeyConfig {
  /**
   * Key structure style
   * - 'flat': Simple ['entity', 'scope', data] structure
   * - 'hierarchical': Nested factory pattern with scope support (lukemorales-style)
   * @default 'hierarchical'
   */
  style?: 'flat' | 'hierarchical';

  /**
   * Define entity relationships for cascade invalidation and scoped keys
   * Key: child entity name (lowercase), Value: relationship definition
   *
   * @example
   * ```ts
   * relationships: {
   *   database: { parent: 'organization', foreignKey: 'organizationId' },
   *   table: { parent: 'database', foreignKey: 'databaseId', ancestors: ['organization'] },
   *   field: { parent: 'table', foreignKey: 'tableId', ancestors: ['database', 'organization'] },
   * }
   * ```
   */
  relationships?: Record<string, EntityRelationship>;

  /**
   * Generate scope-aware query keys for entities with relationships
   * When true, keys include optional scope parameters for hierarchical invalidation
   * @default true
   */
  generateScopedKeys?: boolean;

  /**
   * Generate cascade invalidation helpers
   * Creates helpers that invalidate parent entities and all their children
   * @default true
   */
  generateCascadeHelpers?: boolean;

  /**
   * Generate mutation keys for tracking in-flight mutations
   * Useful for optimistic updates and mutation deduplication
   * @default true
   */
  generateMutationKeys?: boolean;
}

/**
 * Target configuration for graphql-codegen
 * Represents a single schema source and output destination.
 *
 * Source options (choose one):
 * - endpoint: GraphQL endpoint URL for live introspection
 * - schema: Path to GraphQL schema file (.graphql)
 * - database: Database name or connection string for direct introspection
 * - pgpmModulePath: Path to PGPM module (creates ephemeral database)
 * - pgpmWorkspacePath + pgpmModuleName: PGPM workspace mode
 */
export interface GraphQLSDKConfigTarget {
  /**
   * GraphQL endpoint URL for live introspection
   */
  endpoint?: string;

  /**
   * Path to GraphQL schema file (.graphql) for file-based generation
   */
  schema?: string;

  /**
   * Database name or connection string for direct database introspection
   * Use with `schemas` or `apiNames` to specify which schemas to introspect
   */
  database?: string;

  /**
   * Path to a PGPM module directory
   * Creates an ephemeral database, deploys the module, and introspects
   * Use with `schemas` or `apiNames` to specify which schemas to introspect
   */
  pgpmModulePath?: string;

  /**
   * Path to a PGPM workspace directory
   * Must be used together with `pgpmModuleName`
   */
  pgpmWorkspacePath?: string;

  /**
   * Name of the module within the PGPM workspace
   * Must be used together with `pgpmWorkspacePath`
   */
  pgpmModuleName?: string;

  /**
   * PostgreSQL schemas to introspect (for database and PGPM modes)
   * Mutually exclusive with `apiNames`
   * @example ['public', 'app_public']
   */
  schemas?: string[];

  /**
   * API names to resolve schemas from (for database and PGPM modes)
   * Queries services_public.api_schemas to automatically determine schemas
   * Mutually exclusive with `schemas`
   * @example ['my_api']
   */
  apiNames?: string[];

  /**
   * Keep the ephemeral database after introspection (for debugging)
   * Only applies to PGPM module modes
   * @default false
   */
  keepDb?: boolean;

  /**
   * Headers to include in introspection requests
   */
  headers?: Record<string, string>;

  /**
   * Output directory for generated code
   * @default './generated/graphql'
   */
  output?: string;

  /**
   * Table filtering options (for table-based CRUD operations)
   */
  tables?: {
    /** Tables to include (glob patterns supported) */
    include?: string[];
    /** Tables to exclude (glob patterns supported) */
    exclude?: string[];
    /** System-level tables to always exclude (can be overridden to [] to disable) */
    systemExclude?: string[];
  };

  /**
   * Query operation filtering (for ALL queries from __schema introspection)
   * Glob patterns supported (e.g., 'current*', '*ByUsername')
   */
  queries?: {
    /** Query names to include - defaults to ['*'] */
    include?: string[];
    /** Query names to exclude */
    exclude?: string[];
    /** System-level queries to always exclude (defaults to ['_meta', 'query'], can be overridden to [] to disable) */
    systemExclude?: string[];
  };

  /**
   * Mutation operation filtering (for ALL mutations from __schema introspection)
   * Glob patterns supported (e.g., 'create*', 'login', 'register')
   */
  mutations?: {
    /** Mutation names to include - defaults to ['*'] */
    include?: string[];
    /** Mutation names to exclude */
    exclude?: string[];
    /** System-level mutations to always exclude (can be overridden to [] to disable) */
    systemExclude?: string[];
  };

  /**
   * Fields to exclude globally from all tables
   */
  excludeFields?: string[];

  /**
   * Hook generation options
   */
  hooks?: {
    /** Generate query hooks */
    queries?: boolean;
    /** Generate mutation hooks */
    mutations?: boolean;
    /** Prefix for query keys */
    queryKeyPrefix?: string;
  };

  /**
   * PostGraphile-specific options
   */
  postgraphile?: {
    /** PostgreSQL schema to introspect */
    schema?: string;
  };

  /**
   * Code generation options
   */
  codegen?: {
    /** Max depth for nested object field selection (default: 2) */
    maxFieldDepth?: number;
    /** Skip 'query' field on mutation payloads (default: true) */
    skipQueryField?: boolean;
  };

  /**
   * ORM client generation options
   * When set, generates a Prisma-like ORM client in addition to or instead of React Query hooks
   */
  orm?: {
    /**
     * Whether to generate ORM client
     * @default false
     */
    enabled?: boolean;
    /**
     * Output directory for generated ORM client
     * @default './generated/orm'
     */
    output?: string;
    /**
     * Whether to import shared types from hooks output or generate standalone
     * When true, ORM types.ts will re-export from ../graphql/types
     * @default true
     */
    useSharedTypes?: boolean;
  };

  /**
   * React Query integration options
   * Controls whether React Query hooks are generated
   */
  reactQuery?: {
    /**
     * Whether to generate React Query hooks (useQuery, useMutation)
     * When false, only standalone fetch functions are generated (no React dependency)
     * @default false
     */
    enabled?: boolean;
  };

  /**
   * Query key generation configuration
   * Controls how query keys are structured for cache management
   */
  queryKeys?: QueryKeyConfig;

  /**
   * Watch mode configuration (dev-only feature)
   * When enabled via CLI --watch flag, the CLI will poll the endpoint for schema changes
   */
  watch?: WatchConfig;
}

/**
 * Multi-target configuration for graphql-codegen
 */
export interface GraphQLSDKMultiConfig {
  /**
   * Shared defaults applied to every target
   */
  defaults?: GraphQLSDKConfigTarget;

  /**
   * Named target configurations
   */
  targets: Record<string, GraphQLSDKConfigTarget>;
}

/**
 * Main configuration type for graphql-codegen
 */
export type GraphQLSDKConfig = GraphQLSDKConfigTarget | GraphQLSDKMultiConfig;

/**
 * Watch mode configuration options
 *
 * Watch mode uses in-memory caching for efficiency - no file I/O during polling.
 */
export interface WatchConfig {
  /**
   * Polling interval in milliseconds
   * @default 3000
   */
  pollInterval?: number;

  /**
   * Debounce delay in milliseconds before regenerating
   * Prevents rapid regeneration during schema migrations
   * @default 800
   */
  debounce?: number;

  /**
   * File to touch on schema change (useful for triggering external tools like tsc/webpack)
   * This is the only file I/O in watch mode.
   * @example '.trigger'
   */
  touchFile?: string;

  /**
   * Clear terminal on regeneration
   * @default true
   */
  clearScreen?: boolean;
}

/**
 * Default watch configuration values
 */
export const DEFAULT_WATCH_CONFIG: WatchConfig = {
  pollInterval: 3000,
  debounce: 800,
  touchFile: undefined,
  clearScreen: true,
};

/**
 * Default query key configuration values
 */
export const DEFAULT_QUERY_KEY_CONFIG: QueryKeyConfig = {
  style: 'hierarchical',
  relationships: {},
  generateScopedKeys: true,
  generateCascadeHelpers: true,
  generateMutationKeys: true,
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: GraphQLSDKConfigTarget = {
  endpoint: '',
  headers: {},
  output: './generated/graphql',
  tables: {
    include: ['*'],
    exclude: [],
    systemExclude: [],
  },
  queries: {
    include: ['*'],
    exclude: [],
    systemExclude: ['_meta', 'query'], // Internal PostGraphile queries
  },
  mutations: {
    include: ['*'],
    exclude: [],
    systemExclude: [],
  },
  excludeFields: [],
  hooks: {
    queries: true,
    mutations: true,
    queryKeyPrefix: 'graphql',
  },
  postgraphile: {
    schema: 'public',
  },
  codegen: {
    maxFieldDepth: 2,
    skipQueryField: true,
  },
  orm: {
    enabled: false,
    output: './generated/orm',
    useSharedTypes: true,
  },
  reactQuery: {
    enabled: false,
  },
  queryKeys: DEFAULT_QUERY_KEY_CONFIG,
  watch: DEFAULT_WATCH_CONFIG,
};


/**
 * Helper function to define configuration with type checking
 */
export function defineConfig(config: GraphQLSDKConfig): GraphQLSDKConfig {
  return config;
}

/**
 * Target configuration with name (used after resolution)
 */
export interface TargetConfig {
  name: string;
  config: GraphQLSDKConfigTarget;
}

/**
 * Type guard for multi-target configs
 */
export function isMultiConfig(
  config: GraphQLSDKConfig
): config is GraphQLSDKMultiConfig {
  const targets = (config as GraphQLSDKMultiConfig).targets;
  return typeof targets === 'object' && targets !== null;
}

/**
 * Merge two target configs (defaults + overrides).
 * Uses deepmerge with array replacement strategy - when a user specifies
 * an array like include: ['users'], it replaces the default ['*'] entirely.
 */
export function mergeConfig(
  base: GraphQLSDKConfigTarget,
  overrides: GraphQLSDKConfigTarget
): GraphQLSDKConfigTarget {
  return deepmerge(base, overrides, { arrayMerge: replaceArrays });
}

/**
 * Get configuration options by merging defaults with user config.
 * Similar to getEnvOptions pattern from @pgpmjs/env.
 */
export function getConfigOptions(
  overrides: GraphQLSDKConfigTarget = {}
): GraphQLSDKConfigTarget {
  return deepmerge(DEFAULT_CONFIG, overrides, { arrayMerge: replaceArrays });
}

/**
 * Resolve configuration by applying defaults.
 * For single-target configs only - throws for multi-target configs.
 */
export function resolveConfig(config: GraphQLSDKConfig): GraphQLSDKConfigTarget {
  if (isMultiConfig(config)) {
    throw new Error(
      'Multi-target config cannot be resolved with resolveConfig(). Use resolveConfigTargets().'
    );
  }
  return getConfigOptions(config);
}

/**
 * Resolve all targets in a multi-target config
 */
export function resolveConfigTargets(
  config: GraphQLSDKMultiConfig
): TargetConfig[] {
  const defaults = config.defaults ?? {};

  return Object.entries(config.targets).map(([name, target]) => ({
    name,
    config: getConfigOptions(mergeConfig(defaults, target)),
  }));
}
