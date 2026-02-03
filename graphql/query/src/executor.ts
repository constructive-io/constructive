/**
 * QueryExecutor - Execute GraphQL queries using Grafast/PostGraphile v5
 *
 * This module provides a high-level interface for executing GraphQL queries
 * against a PostgreSQL database using PostGraphile v5's Grafast execution engine.
 */

import { execute } from 'grafast';
import { postgraphile, type PostGraphileInstance } from 'postgraphile';
import { getGraphilePreset, makePgService } from 'graphile-settings';
import { withPgClientFromPgService } from 'graphile-build-pg';
import type {
  DocumentNode,
  ExecutionResult,
  GraphQLSchema,
} from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import { LRUCache } from 'lru-cache';

/**
 * Configuration options for QueryExecutor
 */
export interface ExecutorOptions {
  /** PostgreSQL connection string */
  connectionString: string;
  /** Database schemas to expose in the GraphQL schema */
  schemas: string[];
  /** PostgreSQL settings to apply (e.g., { role: 'authenticated' }) */
  pgSettings?: Record<string, string>;
  /** Maximum number of cached executor instances (default: 10) */
  maxCacheSize?: number;
}

/**
 * Internal cache entry for PostGraphile instances
 */
interface CachedExecutor {
  pgl: PostGraphileInstance;
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  pgService: ReturnType<typeof makePgService>;
  createdAt: number;
}

/**
 * Global cache for executor instances, keyed by connection string + schemas
 */
const executorCache = new LRUCache<string, CachedExecutor>({
  max: 10,
  dispose: async (entry) => {
    try {
      await entry.pgl.release();
    } catch {
      // Ignore disposal errors
    }
  },
});

/**
 * Build a cache key from connection string and schemas
 */
const buildCacheKey = (connectionString: string, schemas: string[]): string => {
  return `${connectionString}:${schemas.sort().join(',')}`;
};

/**
 * QueryExecutor - Execute GraphQL queries using Grafast
 *
 * Example usage:
 * ```typescript
 * const executor = new QueryExecutor({
 *   connectionString: 'postgres://user:pass@localhost/db',
 *   schemas: ['public'],
 *   pgSettings: { role: 'authenticated' },
 * });
 *
 * await executor.initialize();
 *
 * const result = await executor.execute<{ allUsers: { nodes: User[] } }>(
 *   parse('query { allUsers { nodes { id name } } }')
 * );
 * ```
 */
export class QueryExecutor {
  private options: ExecutorOptions;
  private executor: CachedExecutor | null = null;
  private cacheKey: string;

  constructor(options: ExecutorOptions) {
    this.options = options;
    this.cacheKey = buildCacheKey(options.connectionString, options.schemas);
  }

  /**
   * Initialize the executor by building or retrieving the PostGraphile schema
   *
   * This method is called automatically by execute() if not already initialized,
   * but can be called explicitly for eager initialization.
   */
  async initialize(): Promise<void> {
    // Check cache first
    const cached = executorCache.get(this.cacheKey);
    if (cached) {
      this.executor = cached;
      return;
    }

    // Create new PostGraphile instance
    const pgService = makePgService({
      connectionString: this.options.connectionString,
      schemas: this.options.schemas,
    });

    const basePreset = getGraphilePreset({});

    // Note: Using 'as unknown as' to bypass strict type checking
    // because GraphileConfig.Preset doesn't include pgServices in its type definition
    // but postgraphile() accepts it at runtime
    const preset = {
      extends: [basePreset],
      pgServices: [pgService],
      grafast: {
        context: () => ({
          pgSettings: this.options.pgSettings || {},
        }),
      },
    } as unknown as GraphileConfig.Preset;

    const pgl = postgraphile(preset);
    const schema = await pgl.getSchema();
    const resolvedPreset = pgl.getResolvedPreset();

    this.executor = {
      pgl,
      schema,
      resolvedPreset,
      pgService,
      createdAt: Date.now(),
    };

    executorCache.set(this.cacheKey, this.executor);
  }

  /**
   * Execute a GraphQL document against the schema
   *
   * @param document - Parsed GraphQL document (DocumentNode)
   * @param variables - Optional variables for the query
   * @param pgSettings - Optional per-request PostgreSQL settings (overrides constructor settings)
   * @returns ExecutionResult with data and/or errors
   */
  async execute<T = unknown>(
    document: DocumentNode,
    variables?: Record<string, unknown>,
    pgSettings?: Record<string, string>
  ): Promise<ExecutionResult<T>> {
    if (!this.executor) {
      await this.initialize();
    }

    const { schema, resolvedPreset, pgService } = this.executor!;

    // Build context with pgSettings and withPgClient
    const contextValue: Record<string, unknown> = {
      pgSettings: pgSettings || this.options.pgSettings || {},
    };

    // Add withPgClient function using the pgService's configured key
    const withPgClientKey = pgService.withPgClientKey ?? 'withPgClient';
    contextValue[withPgClientKey] = withPgClientFromPgService.bind(
      null,
      pgService
    );

    return execute({
      schema,
      document,
      variableValues: variables,
      contextValue,
      resolvedPreset,
    }) as Promise<ExecutionResult<T>>;
  }

  /**
   * Get the GraphQL schema for introspection purposes
   */
  async getSchema(): Promise<GraphQLSchema> {
    if (!this.executor) {
      await this.initialize();
    }
    return this.executor!.schema;
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number } {
    return {
      size: executorCache.size,
      maxSize: executorCache.max,
    };
  }

  /**
   * Clear all cached executors
   */
  static async clearCache(): Promise<void> {
    executorCache.clear();
  }

  /**
   * Clear a specific executor from the cache
   */
  static async clearCacheEntry(
    connectionString: string,
    schemas: string[]
  ): Promise<boolean> {
    const key = buildCacheKey(connectionString, schemas);
    return executorCache.delete(key);
  }
}

/**
 * Create a QueryExecutor instance with simplified options
 *
 * @param connectionString - PostgreSQL connection string
 * @param schemas - Database schemas to expose
 * @param pgSettings - Optional PostgreSQL settings
 * @returns Initialized QueryExecutor
 */
export const createExecutor = async (
  connectionString: string,
  schemas: string[],
  pgSettings?: Record<string, string>
): Promise<QueryExecutor> => {
  const executor = new QueryExecutor({
    connectionString,
    schemas,
    pgSettings,
  });
  await executor.initialize();
  return executor;
};
