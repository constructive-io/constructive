import type { ExecutionResult, GraphQLSchema, DocumentNode } from 'graphql';
import { parse } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import { makeSchema } from 'graphile-build';
import { defaultPreset as graphileBuildDefaultPreset } from 'graphile-build';
import { defaultPreset as graphileBuildPgDefaultPreset, withPgClientFromPgService } from 'graphile-build-pg';
import { makePgService } from 'postgraphile/adaptors/pg';
import { execute } from 'grafast';
import type { Pool } from 'pg';

/**
 * Minimal preset that provides core functionality without Node/Relay.
 * This matches the pattern from graphile-settings.
 */
const MinimalPreset: GraphileConfig.Preset = {
  extends: [graphileBuildDefaultPreset, graphileBuildPgDefaultPreset],
  disablePlugins: ['NodePlugin'],
};

/**
 * Settings for creating a GraphQL schema with PostGraphile v5.
 */
export interface GraphileSettings {
  /** Database schema(s) to expose */
  schema: string | string[];
  /** Optional preset to extend the minimal preset */
  preset?: GraphileConfig.Preset;
  /** Function to generate pgSettings from a request object */
  pgSettings?: (req: unknown) => Record<string, string> | Promise<Record<string, string>>;
}

/**
 * Result from getSchema containing the schema and resolved preset.
 */
export interface SchemaResult {
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  pgService: ReturnType<typeof makePgService>;
}

/**
 * Create a GraphQL schema using PostGraphile v5's preset-based API.
 *
 * @param pool - PostgreSQL connection pool
 * @param settings - Schema configuration including database schemas and optional preset
 * @returns Promise resolving to schema, resolved preset, and pgService
 */
export const getSchema = async (
  pool: Pool,
  settings: GraphileSettings
): Promise<SchemaResult> => {
  const schemas = Array.isArray(settings.schema) ? settings.schema : [settings.schema];

  // Create the pgService for database access
  const pgService = makePgService({
    pool,
    schemas,
  });

  // Build the complete preset
  const completePreset: GraphileConfig.Preset = {
    extends: [
      MinimalPreset,
      ...(settings.preset?.extends ?? []),
    ],
    ...(settings.preset?.disablePlugins && { disablePlugins: settings.preset.disablePlugins }),
    ...(settings.preset?.plugins && { plugins: settings.preset.plugins }),
    ...(settings.preset?.schema && { schema: settings.preset.schema }),
    ...(settings.preset?.grafast && { grafast: settings.preset.grafast }),
    pgServices: [pgService],
  };

  // Use makeSchema from graphile-build to create the schema
  const result = await makeSchema(completePreset);

  return {
    schema: result.schema,
    resolvedPreset: result.resolvedPreset,
    pgService,
  };
};

/**
 * Parameters for creating a GraphileQuery instance.
 */
export interface GraphileQueryParams {
  schema: GraphQLSchema;
  pool: Pool;
  settings: GraphileSettings;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  pgService: ReturnType<typeof makePgService>;
}

/**
 * Options for executing a GraphQL query.
 */
export interface QueryOptions {
  /** Optional request object for pgSettings generation */
  req?: unknown;
  /** GraphQL query string or DocumentNode */
  query: string | DocumentNode;
  /** Query variables */
  variables?: Record<string, unknown>;
  /** PostgreSQL role to use for the query */
  role?: string;
}

/**
 * GraphileQuery provides a way to execute GraphQL queries against a PostGraphile v5 schema.
 *
 * This is the full-featured version that supports pgSettings generation from requests.
 */
export class GraphileQuery {
  private pool: Pool;
  private schema: GraphQLSchema;
  private settings: GraphileSettings;
  private resolvedPreset: GraphileConfig.ResolvedPreset;
  private pgService: ReturnType<typeof makePgService>;

  constructor({ schema, pool, settings, resolvedPreset, pgService }: GraphileQueryParams) {
    if (!schema) throw new Error('requires a schema');
    if (!pool) throw new Error('requires a pool');
    if (!settings) throw new Error('requires graphile settings');
    if (!resolvedPreset) throw new Error('requires resolvedPreset');
    if (!pgService) throw new Error('requires pgService');

    this.pool = pool;
    this.schema = schema;
    this.settings = settings;
    this.resolvedPreset = resolvedPreset;
    this.pgService = pgService;
  }

  /**
   * Execute a GraphQL query.
   *
   * @param options - Query options including query string, variables, and optional role
   * @returns Promise resolving to the GraphQL execution result
   */
  async query({ req = {}, query, variables, role }: QueryOptions): Promise<ExecutionResult> {
    // Parse the query if it's a string
    const document = typeof query === 'string' ? parse(query) : query;

    // Generate pgSettings
    const { pgSettings: pgSettingsGenerator } = this.settings;
    let pgSettings: Record<string, string> = {};

    if (role != null) {
      pgSettings = { role };
    } else if (typeof pgSettingsGenerator === 'function') {
      pgSettings = await pgSettingsGenerator(req);
    }

    // Build context with withPgClient using withPgClientFromPgService
    const withPgClientKey = this.pgService.withPgClientKey ?? 'withPgClient';
    const contextValue: Record<string, unknown> = {
      pgSettings,
      [withPgClientKey]: withPgClientFromPgService.bind(null, this.pgService),
    };

    // Execute using grafast
    const result = await execute({
      schema: this.schema,
      document,
      variableValues: variables ?? undefined,
      contextValue,
      resolvedPreset: this.resolvedPreset,
    });

    // Handle streaming results
    if (Symbol.asyncIterator in result) {
      throw new Error('Streaming results (subscriptions) are not supported');
    }

    return result as ExecutionResult;
  }
}

/**
 * Parameters for creating a GraphileQuerySimple instance.
 */
export interface GraphileQuerySimpleParams {
  schema: GraphQLSchema;
  pool: Pool;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  pgService: ReturnType<typeof makePgService>;
}

/**
 * GraphileQuerySimple provides a simplified way to execute GraphQL queries.
 *
 * This version doesn't support pgSettings generation from requests - it's meant
 * for simple use cases where you just need to run queries.
 */
export class GraphileQuerySimple {
  private pool: Pool;
  private schema: GraphQLSchema;
  private resolvedPreset: GraphileConfig.ResolvedPreset;
  private pgService: ReturnType<typeof makePgService>;

  constructor({ schema, pool, resolvedPreset, pgService }: GraphileQuerySimpleParams) {
    if (!schema) throw new Error('requires a schema');
    if (!pool) throw new Error('requires a pool');
    if (!resolvedPreset) throw new Error('requires resolvedPreset');
    if (!pgService) throw new Error('requires pgService');

    this.pool = pool;
    this.schema = schema;
    this.resolvedPreset = resolvedPreset;
    this.pgService = pgService;
  }

  /**
   * Execute a GraphQL query.
   *
   * @param query - GraphQL query string or DocumentNode
   * @param variables - Optional query variables
   * @returns Promise resolving to the GraphQL execution result
   */
  async query(
    query: string | DocumentNode,
    variables?: Record<string, unknown>
  ): Promise<ExecutionResult> {
    // Parse the query if it's a string
    const document = typeof query === 'string' ? parse(query) : query;

    // Build context with withPgClient using withPgClientFromPgService
    const withPgClientKey = this.pgService.withPgClientKey ?? 'withPgClient';
    const contextValue: Record<string, unknown> = {
      [withPgClientKey]: withPgClientFromPgService.bind(null, this.pgService),
    };

    // Execute using grafast
    const result = await execute({
      schema: this.schema,
      document,
      variableValues: variables ?? undefined,
      contextValue,
      resolvedPreset: this.resolvedPreset,
    });

    // Handle streaming results
    if (Symbol.asyncIterator in result) {
      throw new Error('Streaming results (subscriptions) are not supported');
    }

    return result as ExecutionResult;
  }
}

/**
 * Helper function to create a GraphileQuery instance with schema creation.
 *
 * This is a convenience function that combines getSchema and GraphileQuery creation.
 *
 * @param pool - PostgreSQL connection pool
 * @param settings - Schema configuration
 * @returns Promise resolving to a GraphileQuery instance
 */
export const createGraphileQuery = async (
  pool: Pool,
  settings: GraphileSettings
): Promise<GraphileQuery> => {
  const { schema, resolvedPreset, pgService } = await getSchema(pool, settings);
  return new GraphileQuery({ schema, pool, settings, resolvedPreset, pgService });
};

/**
 * Helper function to create a GraphileQuerySimple instance with schema creation.
 *
 * @param pool - PostgreSQL connection pool
 * @param settings - Schema configuration
 * @returns Promise resolving to a GraphileQuerySimple instance
 */
export const createGraphileQuerySimple = async (
  pool: Pool,
  settings: GraphileSettings
): Promise<GraphileQuerySimple> => {
  const { schema, resolvedPreset, pgService } = await getSchema(pool, settings);
  return new GraphileQuerySimple({ schema, pool, resolvedPreset, pgService });
};
