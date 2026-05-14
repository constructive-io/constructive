import type { GraphQLSchema, ExecutionResult } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import type { PgTestClient } from 'pgsql-test/test-client';
import type { GetConnectionOpts, GetConnectionResult } from 'pgsql-test';
import { getConnections as getPgConnections } from 'pgsql-test';
import type { SeedAdapter } from 'pgsql-test/seed/types';

import { makeSchema } from 'graphile-build';
import { defaultPreset as graphileBuildDefaultPreset } from 'graphile-build';
import { defaultPreset as graphileBuildPgDefaultPreset } from 'graphile-build-pg';
import { makePgService } from 'postgraphile/adaptors/pg';

import type { GetConnectionsInput } from 'graphile-test';
import { createRealtimeSubscriptionsPlugin } from 'graphile-realtime-subscriptions';

import { subscribe as subscribeHelper } from './subscribe.js';
import { notify, notifyChange, notifyInvalidate } from './notify.js';
import { makeRealtimeSmartTagsPlugin } from './smart-tags.js';

/**
 * Minimal preset matching graphile-test's MinimalPreset.
 */
const MinimalPreset: GraphileConfig.Preset = {
  extends: [graphileBuildDefaultPreset, graphileBuildPgDefaultPreset],
  disablePlugins: ['NodePlugin'],
};

/**
 * Input for creating a realtime test context.
 */
export interface RealtimeTestInput extends GetConnectionsInput, GetConnectionOpts {
  /**
   * Map of table names to smart tags to inject.
   * The `@realtime` tag is injected automatically for tables listed here.
   *
   * Example: `{ items: { realtime: true } }`
   *
   * If you only pass table names without tags, use `realtimeTables` instead.
   */
  smartTags?: Record<string, Record<string, unknown>>;

  /**
   * Shorthand: list of table names that should get `{ realtime: true }`.
   * Merged with `smartTags` if both are provided.
   */
  realtimeTables?: string[];

  /**
   * Options for the realtime subscriptions plugin (e.g. overflowThreshold).
   */
  realtimeOptions?: { overflowThreshold?: number };
}

/**
 * The context returned by `createRealtimeTestContext()`.
 */
export interface RealtimeTestContext {
  /** Root pg test client (superuser) */
  pg: PgTestClient;
  /** Database-scoped test client */
  db: PgTestClient;
  /** The built GraphQL schema (includes subscription fields) */
  schema: GraphQLSchema;
  /** The resolved Graphile preset */
  resolvedPreset: GraphileConfig.ResolvedPreset;

  /**
   * Start a GraphQL subscription and return the async iterator.
   *
   * The returned iterator yields `ExecutionResult` events. Call `.return()`
   * on it when done to clean up.
   */
  subscribe(
    query: string,
    variables?: Record<string, unknown>,
    contextOverrides?: Record<string, unknown>
  ): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult>;

  /**
   * Fire a pg_notify on a realtime channel.
   *
   * @param table - Table name (unqualified)
   * @param operation - DML operation
   * @param rowIds - Affected row IDs
   * @param schema - Schema name (default: the first schema from input)
   */
  notifyChange(
    table: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    rowIds: string[],
    schema?: string
  ): Promise<void>;

  /**
   * Fire an INVALIDATE (overflow) NOTIFY.
   */
  notifyInvalidate(table: string, schema?: string): Promise<void>;

  /**
   * Fire a raw pg_notify on a realtime channel.
   */
  notify(table: string, payload: string, schema?: string): Promise<void>;

  /** Tear down the test context and close connections */
  teardown(): Promise<void>;
}

/**
 * Create a fully wired realtime test context.
 *
 * This sets up:
 *   - A PostgreSQL test database with the given seed
 *   - Smart tag injection via `makeRealtimeSmartTagsPlugin`
 *   - The `RealtimeSubscriptionsPlugin` for subscription field generation
 *   - A built GraphQL schema with subscription support
 *   - Helper functions for subscribing, notifying, and asserting
 *
 * @param input - Configuration including schemas, tables, and options
 * @param seedAdapters - Optional SQL seed adapters (from `pgsql-test`)
 * @returns A `RealtimeTestContext` with all the helpers
 */
export async function createRealtimeTestContext(
  input: RealtimeTestInput,
  seedAdapters?: SeedAdapter[]
): Promise<RealtimeTestContext> {
  const { schemas, preset: userPreset, realtimeOptions } = input;

  // Build smart tags map
  const smartTagsMap: Record<string, Record<string, unknown>> = {
    ...(input.smartTags ?? {}),
  };
  for (const table of input.realtimeTables ?? []) {
    if (!smartTagsMap[table]) {
      smartTagsMap[table] = {};
    }
    smartTagsMap[table].realtime = true;
  }

  // Get database connections
  const conn: GetConnectionResult = await getPgConnections(input, seedAdapters);
  const { pg, db, teardown: dbTeardown } = conn;

  const pgPool = conn.manager.getPool(conn.pg.config);

  // Build the schema with realtime plugins
  const smartTagsPlugin = makeRealtimeSmartTagsPlugin(smartTagsMap);
  const realtimePlugin = createRealtimeSubscriptionsPlugin(realtimeOptions);

  // Create pgService — this also creates the PgSubscriber that
  // listens for NOTIFY events on a dedicated PostgreSQL connection
  const pgService = makePgService({
    pool: pgPool,
    schemas,
  });

  const completePreset: GraphileConfig.Preset = {
    extends: [
      MinimalPreset,
      ...(userPreset?.extends ?? []),
    ],
    ...(userPreset?.disablePlugins && { disablePlugins: userPreset.disablePlugins }),
    plugins: [
      ...(userPreset?.plugins ?? []),
      smartTagsPlugin,
      realtimePlugin,
    ],
    ...(userPreset?.schema && { schema: userPreset.schema }),
    ...(userPreset?.grafast && { grafast: userPreset.grafast }),
    pgServices: [pgService],
  };

  const result = await makeSchema(completePreset);
  const schema = result.schema;
  const resolvedPreset = result.resolvedPreset;

  const defaultSchema = schemas[0] ?? 'public';

  // Use root pg client for NOTIFY so it's visible outside the test transaction
  const notifyClient = pg.client;

  // Extract the pgSubscriber from the pgService — subscriptions need it
  // in the grafast context to receive LISTEN/NOTIFY events
  const pgSubscriber = (pgService as any).pgSubscriber;
  const pgSubscriberKey = (pgService as any).pgSubscriberKey ?? 'pgSubscriber';

  const teardown = async () => {
    if (pgSubscriber && typeof pgSubscriber.release === 'function') {
      await pgSubscriber.release();
    }
    if (pgService && typeof pgService.release === 'function') {
      await pgService.release();
    }
    await dbTeardown();
  };

  return {
    pg,
    db,
    schema,
    resolvedPreset,

    async subscribe(
      query: string,
      variables?: Record<string, unknown>,
      contextOverrides?: Record<string, unknown>
    ) {
      // Build the context that grafast.subscribe needs.
      // The subscription plan accesses pgSubscriber via grafastContext().get('pgSubscriber')
      const contextValue: Record<string, unknown> = {
        [pgSubscriberKey]: pgSubscriber,
        ...contextOverrides,
      };

      return subscribeHelper({
        schema,
        resolvedPreset,
        query,
        variables,
        contextValue,
      });
    },

    async notifyChange(
      table: string,
      operation: 'INSERT' | 'UPDATE' | 'DELETE',
      rowIds: string[],
      tableSchema?: string
    ) {
      await notifyChange(notifyClient, tableSchema ?? defaultSchema, table, operation, rowIds);
    },

    async notifyInvalidate(table: string, tableSchema?: string) {
      await notifyInvalidate(notifyClient, tableSchema ?? defaultSchema, table);
    },

    async notify(table: string, payload: string, tableSchema?: string) {
      await notify(notifyClient, tableSchema ?? defaultSchema, table, payload);
    },

    teardown,
  };
}
