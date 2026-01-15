/**
 * SDK Configuration types
 */

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
 * Main configuration for graphql-codegen
 */
export interface GraphQLSDKConfig {
  /**
   * GraphQL endpoint URL for live introspection
   * Either endpoint or schema must be provided
   */
  endpoint?: string;

  /**
   * Path to GraphQL schema file (.graphql) for file-based generation
   * Either endpoint or schema must be provided
   */
  schema?: string;

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
  };

  /**
   * Query operation filtering (for ALL queries from __schema introspection)
   * Glob patterns supported (e.g., 'current*', '*ByUsername')
   */
  queries?: {
    /** Query names to include - defaults to ['*'] */
    include?: string[];
    /** Query names to exclude - defaults to ['_meta', 'query'] */
    exclude?: string[];
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
 * Resolved watch configuration with defaults applied
 */
export interface ResolvedWatchConfig {
  pollInterval: number;
  debounce: number;
  touchFile: string | null;
  clearScreen: boolean;
}

/**
 * Resolved query key configuration with defaults applied
 */
export interface ResolvedQueryKeyConfig {
  style: 'flat' | 'hierarchical';
  relationships: Record<string, EntityRelationship>;
  generateScopedKeys: boolean;
  generateCascadeHelpers: boolean;
  generateMutationKeys: boolean;
}

/**
 * Resolved configuration with defaults applied
 */
export interface ResolvedConfig {
  /**
   * GraphQL endpoint URL (empty string if using schema file)
   */
  endpoint: string;
  /**
   * Path to GraphQL schema file (null if using endpoint)
   */
  schema: string | null;
  headers: Record<string, string>;
  output: string;
  tables: {
    include: string[];
    exclude: string[];
  };
  queries: {
    include: string[];
    exclude: string[];
  };
  mutations: {
    include: string[];
    exclude: string[];
  };
  excludeFields: string[];
  hooks: {
    queries: boolean;
    mutations: boolean;
    queryKeyPrefix: string;
  };
  postgraphile: {
    schema: string;
  };
  codegen: {
    maxFieldDepth: number;
    skipQueryField: boolean;
  };
  orm: {
    output: string;
    useSharedTypes: boolean;
  } | null;
  reactQuery: {
    enabled: boolean;
  };
  queryKeys: ResolvedQueryKeyConfig;
  watch: ResolvedWatchConfig;
}

/**
 * Default watch configuration values
 */
export const DEFAULT_WATCH_CONFIG: ResolvedWatchConfig = {
  pollInterval: 3000,
  debounce: 800,
  touchFile: null,
  clearScreen: true,
};

/**
 * Default query key configuration values
 */
export const DEFAULT_QUERY_KEY_CONFIG: ResolvedQueryKeyConfig = {
  style: 'hierarchical',
  relationships: {},
  generateScopedKeys: true,
  generateCascadeHelpers: true,
  generateMutationKeys: true,
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<ResolvedConfig, 'endpoint' | 'schema'> = {
  headers: {},
  output: './generated/graphql',
  tables: {
    include: ['*'],
    exclude: [],
  },
  queries: {
    include: ['*'],
    exclude: ['_meta', 'query'], // Internal PostGraphile queries
  },
  mutations: {
    include: ['*'],
    exclude: [],
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
  orm: null, // ORM generation disabled by default
  reactQuery: {
    enabled: true, // React Query hooks enabled by default for generate command
  },
  queryKeys: DEFAULT_QUERY_KEY_CONFIG,
  watch: DEFAULT_WATCH_CONFIG,
};

/**
 * Default ORM configuration values
 */
export const DEFAULT_ORM_CONFIG = {
  output: './generated/orm',
  useSharedTypes: true,
};

/**
 * Helper function to define configuration with type checking
 */
export function defineConfig(config: GraphQLSDKConfig): GraphQLSDKConfig {
  return config;
}

/**
 * Resolve configuration by applying defaults
 */
export function resolveConfig(config: GraphQLSDKConfig): ResolvedConfig {
  return {
    endpoint: config.endpoint ?? '',
    schema: config.schema ?? null,
    headers: config.headers ?? DEFAULT_CONFIG.headers,
    output: config.output ?? DEFAULT_CONFIG.output,
    tables: {
      include: config.tables?.include ?? DEFAULT_CONFIG.tables.include,
      exclude: config.tables?.exclude ?? DEFAULT_CONFIG.tables.exclude,
    },
    queries: {
      include: config.queries?.include ?? DEFAULT_CONFIG.queries.include,
      exclude: config.queries?.exclude ?? DEFAULT_CONFIG.queries.exclude,
    },
    mutations: {
      include: config.mutations?.include ?? DEFAULT_CONFIG.mutations.include,
      exclude: config.mutations?.exclude ?? DEFAULT_CONFIG.mutations.exclude,
    },
    excludeFields: config.excludeFields ?? DEFAULT_CONFIG.excludeFields,
    hooks: {
      queries: config.hooks?.queries ?? DEFAULT_CONFIG.hooks.queries,
      mutations: config.hooks?.mutations ?? DEFAULT_CONFIG.hooks.mutations,
      queryKeyPrefix:
        config.hooks?.queryKeyPrefix ?? DEFAULT_CONFIG.hooks.queryKeyPrefix,
    },
    postgraphile: {
      schema: config.postgraphile?.schema ?? DEFAULT_CONFIG.postgraphile.schema,
    },
    codegen: {
      maxFieldDepth:
        config.codegen?.maxFieldDepth ?? DEFAULT_CONFIG.codegen.maxFieldDepth,
      skipQueryField:
        config.codegen?.skipQueryField ?? DEFAULT_CONFIG.codegen.skipQueryField,
    },
    orm: config.orm
      ? {
          output: config.orm.output ?? DEFAULT_ORM_CONFIG.output,
          useSharedTypes:
            config.orm.useSharedTypes ?? DEFAULT_ORM_CONFIG.useSharedTypes,
        }
      : null,
    reactQuery: {
      enabled: config.reactQuery?.enabled ?? DEFAULT_CONFIG.reactQuery.enabled,
    },
    queryKeys: {
      style: config.queryKeys?.style ?? DEFAULT_QUERY_KEY_CONFIG.style,
      relationships: config.queryKeys?.relationships ?? DEFAULT_QUERY_KEY_CONFIG.relationships,
      generateScopedKeys: config.queryKeys?.generateScopedKeys ?? DEFAULT_QUERY_KEY_CONFIG.generateScopedKeys,
      generateCascadeHelpers: config.queryKeys?.generateCascadeHelpers ?? DEFAULT_QUERY_KEY_CONFIG.generateCascadeHelpers,
      generateMutationKeys: config.queryKeys?.generateMutationKeys ?? DEFAULT_QUERY_KEY_CONFIG.generateMutationKeys,
    },
    watch: {
      pollInterval:
        config.watch?.pollInterval ?? DEFAULT_WATCH_CONFIG.pollInterval,
      debounce: config.watch?.debounce ?? DEFAULT_WATCH_CONFIG.debounce,
      touchFile: config.watch?.touchFile ?? DEFAULT_WATCH_CONFIG.touchFile,
      clearScreen:
        config.watch?.clearScreen ?? DEFAULT_WATCH_CONFIG.clearScreen,
    },
  };
}
