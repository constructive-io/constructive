import type { ExecutionResult } from 'graphql';
import { print } from 'graphql/language/printer';
import type { GraphQLSchema } from 'graphql';
import { grafast } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { postgraphile } from 'postgraphile';
import { makePgService } from 'graphile-settings';

/**
 * Options for creating a GraphileQuery v5 instance
 */
export interface GraphileQueryV5Params {
  /** The GraphQL schema to query against */
  schema: GraphQLSchema;
  /** The resolved preset from PostGraphile */
  resolvedPreset: GraphileConfig.ResolvedPreset;
}

/**
 * Options for executing a query
 */
export interface QueryOptions {
  /** GraphQL query string or DocumentNode */
  query: string;
  /** Variables for the query */
  variables?: Record<string, unknown>;
  /** PostgreSQL role to use for the query */
  role?: string;
  /** Additional context to pass to resolvers */
  context?: Record<string, unknown>;
}

/**
 * GraphileQuery v5 - Execute GraphQL queries against a PostGraphile schema
 *
 * This is the v5 compatible implementation that uses grafast for query execution.
 */
export class GraphileQuery {
  private schema: GraphQLSchema;
  private resolvedPreset: GraphileConfig.ResolvedPreset;

  constructor({ schema, resolvedPreset }: GraphileQueryV5Params) {
    if (!schema) throw new Error('requires a schema');
    if (!resolvedPreset) throw new Error('requires a resolvedPreset');

    this.schema = schema;
    this.resolvedPreset = resolvedPreset;
  }

  /**
   * Execute a GraphQL query with the given options
   */
  async query({ query, variables, role, context }: QueryOptions): Promise<ExecutionResult> {
    const queryString = typeof query === 'string' ? query : print(query);

    // Build pgSettings based on role
    const pgSettings: Record<string, string> = {};
    if (role) {
      pgSettings.role = role;
    }

    // Build context value with pgSettings
    const contextValue: Record<string, unknown> = {
      ...(context || {}),
      pgSettings,
    };

    // Use grafast to execute the query with the resolved preset
    const result = await grafast({
      schema: this.schema,
      source: queryString,
      variableValues: variables,
      contextValue,
      resolvedPreset: this.resolvedPreset,
    });

    return result as ExecutionResult;
  }
}

/**
 * Options for creating a schema using PostGraphile v5
 */
export interface CreateSchemaOptions {
  /** Database connection string */
  connectionString: string;
  /** PostgreSQL schemas to expose */
  schemas: string[];
  /** Optional preset to extend */
  preset?: GraphileConfig.Preset;
}

/**
 * Result from creating a PostGraphile v5 schema
 */
export interface SchemaResult {
  /** The GraphQL schema */
  schema: GraphQLSchema;
  /** The resolved preset */
  resolvedPreset: GraphileConfig.ResolvedPreset;
  /** Cleanup function to release resources */
  release: () => Promise<void>;
}

/**
 * Create a PostGraphile v5 schema from a connection string and schemas
 *
 * This is the v5 equivalent of createPostGraphileSchema from v4.
 */
export async function createGraphileSchema(
  options: CreateSchemaOptions
): Promise<SchemaResult> {
  const { connectionString, schemas, preset: basePreset } = options;

  // Build preset, casting pgServices to satisfy type requirements
  const pgService = makePgService({
    connectionString,
    schemas,
  });

  const preset: GraphileConfig.Preset = {
    ...(basePreset || {}),
    extends: [...(basePreset?.extends || [])],
    pgServices: [pgService] as unknown as GraphileConfig.Preset['pgServices'],
  };

  const pgl = postgraphile(preset);
  const schema = await pgl.getSchema();
  const resolvedPreset = pgl.getResolvedPreset();

  return {
    schema,
    resolvedPreset,
    release: async () => {
      await pgl.release();
    },
  };
}

/**
 * Create a GraphileQuery instance from connection options
 *
 * This is a convenience function that creates the schema and returns
 * a ready-to-use GraphileQuery instance.
 */
export async function createGraphileQuery(
  options: CreateSchemaOptions
): Promise<{ query: GraphileQuery; release: () => Promise<void> }> {
  const { schema, resolvedPreset, release } = await createGraphileSchema(options);
  const query = new GraphileQuery({ schema, resolvedPreset });
  return { query, release };
}

/**
 * Simple GraphileQuery that doesn't require a preset
 *
 * This is useful for testing or simple use cases where you already
 * have a schema and just want to execute queries.
 */
export class GraphileQuerySimple {
  private schema: GraphQLSchema;

  constructor({ schema }: { schema: GraphQLSchema }) {
    if (!schema) throw new Error('requires a schema');
    this.schema = schema;
  }

  /**
   * Execute a GraphQL query
   */
  async query(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const queryString = typeof query === 'string' ? query : print(query);

    // Use grafast without a preset - this will use basic GraphQL execution
    const result = await grafast({
      schema: this.schema,
      source: queryString,
      variableValues: variables,
      contextValue: {},
    });

    return result as ExecutionResult;
  }
}

// Re-export types for convenience
export type { GraphQLSchema } from 'graphql';
export type { GraphileConfig } from 'graphile-config';
