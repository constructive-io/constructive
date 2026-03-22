/**
 * SDK Configuration types
 */

import deepmerge from 'deepmerge';
import type { PgConfig } from 'pg-env';

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
 * PGPM module configuration for ephemeral database creation
 */
export interface PgpmConfig {
  /**
   * Path to a PGPM module directory
   * Creates an ephemeral database, deploys the module, and introspects
   */
  modulePath?: string;

  /**
   * Path to a PGPM workspace directory
   * Must be used together with `moduleName`
   */
  workspacePath?: string;

  /**
   * Name of the module within the PGPM workspace
   * Must be used together with `workspacePath`
   */
  moduleName?: string;
}

/**
 * Database configuration for direct database introspection
 */
export interface DbConfig {
  /**
   * PostgreSQL connection configuration
   * Falls back to environment variables (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
   * via @pgpmjs/env when not specified
   */
  config?: Partial<PgConfig>;

  /**
   * PGPM module configuration for ephemeral database creation
   * When specified, creates an ephemeral database from the module
   */
  pgpm?: PgpmConfig;

  /**
   * PostgreSQL schemas to introspect
   * Mutually exclusive with `apiNames`
   * @example ['public', 'app_public']
   */
  schemas?: string[];

  /**
   * API names to resolve schemas from
   * Queries services_public.api_schemas to automatically determine schemas
   * Mutually exclusive with `schemas`
   * @example ['my_api']
   */
  apiNames?: string[];

  /**
   * Keep the ephemeral database after introspection (for debugging)
   * Only applies when using pgpm
   * @default false
   */
  keepDb?: boolean;
}

/**
 * Documentation generation options
 * Controls which doc formats are generated alongside code for each generator target.
 * Applied at the top level and affects all enabled generators (ORM, React Query, CLI).
 */
export interface DocsConfig {
  /**
   * Generate README.md — human-readable overview with setup, commands, examples
   * @default true
   */
  readme?: boolean;

  /**
   * Generate AGENTS.md — structured markdown optimized for LLM consumption
   * Includes: tool definitions, exact signatures, input/output schemas,
   * workflow recipes, error handling, and machine-parseable sections
   * @default true
   */
  agents?: boolean;

  /**
   * Generate mcp.json — MCP (Model Context Protocol) tool definitions
   * Each CLI command becomes a tool with typed inputSchema (JSON Schema)
   * Ready to plug into any MCP-compatible agent
   * @default false
   */
  mcp?: boolean;

  /**
   * Generate .agents/skills/ directory — per-entity SKILL.md files with YAML frontmatter.
   * Skills are written to {workspaceRoot}/.agents/skills/ (not nested in output).
   * Uses composable naming: orm-{target}-{entity}, hooks-{target}-{entity}, cli-{target}-{entity}.
   * @default false
   */
  skills?: boolean;
}

/**
 * Schema export configuration
 * Controls SDL schema export behavior.
 */
export interface SchemaConfig {
  /**
   * Enable schema SDL export
   * When true, fetches the schema and writes it as a .graphql SDL file.
   * If no generators are enabled (orm, reactQuery, cli), only the schema is exported.
   * @default false
   */
  enabled?: boolean;

  /**
   * Output directory for the exported schema file
   * @default same as the target's output directory
   */
  output?: string;

  /**
   * Filename for the exported schema file
   * @default 'schema.graphql'
   */
  filename?: string;
}

/**
 * Infrastructure command name overrides for collision handling.
 * When a target name collides with a default infra command name,
 * the infra command is auto-renamed. These allow user overrides.
 */
export interface BuiltinNames {
  auth?: string;
  context?: string;
  config?: string;
}

/**
 * CLI generation configuration
 */
export interface CliConfig {
  /**
   * Tool name for appstash config storage (e.g., 'myapp' stores at ~/.myapp/)
   * @default derived from output directory name
   */
  toolName?: string;

  /**
   * Override infra command names (for collision handling)
   * Defaults: auth -> 'auth' (renamed to 'credentials' on collision),
   *           context -> 'context' (renamed to 'env' on collision)
   */
  builtinNames?: BuiltinNames;

  /**
   * Generate a runnable index.ts entry point for the CLI.
   * When true, generates an index.ts that imports the command map,
   * handles --version and --tty flags, and starts the inquirerer CLI.
   * Useful for projects that want a ready-to-run CLI without a custom entry point.
   * @default false
   */
  entryPoint?: boolean;
}

/**
 * Target configuration for graphql-codegen
 * Represents a single schema source and output destination.
 *
 * Source options (choose one):
 * - endpoint: GraphQL endpoint URL for live introspection
 * - schemaFile: Path to GraphQL schema file (.graphql)
 * - db: Database configuration for direct introspection or PGPM module
 */
export interface GraphQLSDKConfigTarget {
  /**
   * GraphQL endpoint URL for live introspection
   */
  endpoint?: string;

  /**
   * Path to GraphQL schema file (.graphql) for file-based generation
   */
  schemaFile?: string;

  /**
   * Path to a directory of .graphql schema files for multi-target generation.
   * Each *.graphql file becomes its own target, named by the filename (without extension).
   * e.g. schemas/app.graphql + schemas/admin.graphql → targets "app" and "admin"
   */
  schemaDir?: string;

  /**
   * Database configuration for direct database introspection or PGPM module
   * Use db.schemas or db.apiNames to specify which schemas to introspect
   */
  db?: DbConfig;

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
    /** Skip 'query' field on mutation payloads (default: true) */
    skipQueryField?: boolean;
    /**
     * Include PostgreSQL COMMENT descriptions as JSDoc comments in generated code.
     * PostGraphile smart comments and boilerplate descriptions are automatically stripped.
     * @default true
     */
    comments?: boolean;
    /**
     * Generate condition types and condition arguments on findMany/findFirst.
     * PostGraphile's native `condition` argument provides simple equality filtering.
     * Set to `true` to include condition types and arguments in generated code.
     * Set to `false` to omit them (e.g., when using connection-filter's `filter` argument exclusively).
     * @default false
     */
    condition?: boolean;
  };

  /**
   * Whether to generate ORM client
   * When enabled, generates a Prisma-like ORM client to {output}/orm
   * @default false
   */
  orm?: boolean;

  /**
   * Enable NodeHttpAdapter generation for Node.js applications.
   * When true, generates a node-fetch.ts with NodeHttpAdapter (implements GraphQLAdapter)
   * using node:http/node:https for requests, enabling local development
   * with subdomain-based routing (e.g. auth.localhost:3000).
   * No global patching — the adapter is passed to createClient via the adapter option.
   *
   * When CLI generation is enabled (`cli: true`), this is auto-enabled unless
   * explicitly set to `false`.
   *
   * Can also be used standalone with the ORM client for any Node.js application:
   * ```ts
   * import { NodeHttpAdapter } from './orm/node-fetch';
   * const db = createClient({ adapter: new NodeHttpAdapter(endpoint, headers) });
   * ```
   * @default false
   */
  nodeHttpAdapter?: boolean;

  /**
   * Whether to generate React Query hooks
   * When enabled, generates React Query hooks to {output}/hooks
   * When false, only standalone fetch functions are generated (no React dependency)
   * @default false
   */
  reactQuery?: boolean;

  /**
   * CLI generation configuration
   * When enabled, generates inquirerer-based CLI commands to {output}/cli
   * Requires appstash for config storage and inquirerer for prompts
   */
  cli?: CliConfig | boolean;

  /**
   * Documentation generation options
   * Controls which doc formats are generated alongside code for each generator target.
   * Applied globally to all enabled generators (ORM, React Query, CLI).
   * Set to `true` to enable all formats, or configure individually.
   * @default { readme: true, agents: true, mcp: false }
   */
  docs?: DocsConfig | boolean;

  /**
   * Schema export configuration
   * When enabled, exports the GraphQL SDL to a file.
   * If no generators are also enabled, this acts as a schema-only export.
   */
  schema?: SchemaConfig;

  /**
   * Custom path for generated skill files.
   * When set, skills are written to this directory.
   * When undefined (default), skills are written to {workspaceRoot}/.agents/skills/
   * where workspaceRoot is auto-detected by walking up from the output directory
   * looking for pnpm-workspace.yaml, lerna.json, or package.json with workspaces.
   */
  skillsPath?: string;

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

  // ============================================================================
  // Runtime options (used when calling generate() programmatically)
  // ============================================================================

  /**
   * Authorization header value (convenience option, also available in headers)
   */
  authorization?: string;

  /**
   * Enable verbose output
   * @default false
   */
  verbose?: boolean;

  /**
   * Dry run - don't write files, just show what would be generated
   * @default false
   */
  dryRun?: boolean;

  /**
   * Skip custom operations (only generate table CRUD)
   * @default false
   */
  skipCustomOperations?: boolean;
}

/**
 * Main configuration type for graphql-codegen
 * This is the same as GraphQLSDKConfigTarget - we keep the alias for clarity.
 */
export type GraphQLSDKConfig = GraphQLSDKConfigTarget;

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
    skipQueryField: true,
    comments: true,
    condition: false,
  },
  orm: false,
  reactQuery: false,
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
 * Merge two configs (base + overrides).
 * Uses deepmerge with array replacement strategy - when a user specifies
 * an array like include: ['users'], it replaces the default ['*'] entirely.
 */
export function mergeConfig(
  base: GraphQLSDKConfigTarget,
  overrides: GraphQLSDKConfigTarget,
): GraphQLSDKConfigTarget {
  return deepmerge(base, overrides, { arrayMerge: replaceArrays });
}

/**
 * Get configuration options by merging defaults with user config.
 * Similar to getEnvOptions pattern from @pgpmjs/env.
 */
export function getConfigOptions(
  overrides: GraphQLSDKConfigTarget = {},
): GraphQLSDKConfigTarget {
  return deepmerge(DEFAULT_CONFIG, overrides, { arrayMerge: replaceArrays });
}
