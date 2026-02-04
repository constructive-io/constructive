import type { GraphQLSchema } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import type { GetConnectionOpts, GetConnectionResult } from 'pgsql-test';

import { makeSchema } from 'graphile-build';
import { defaultPreset as graphileBuildDefaultPreset } from 'graphile-build';
import { defaultPreset as graphileBuildPgDefaultPreset } from 'graphile-build-pg';
import { makePgService } from 'postgraphile/adaptors/pg';

import { runGraphQLInContext } from './context.js';
import type { GraphQLQueryOptions, GraphQLTestContext, GetConnectionsInput, Variables } from './types.js';

/**
 * Minimal preset that provides core functionality without Node/Relay.
 * This matches the pattern from graphile-settings.
 */
const MinimalPreset: GraphileConfig.Preset = {
  extends: [graphileBuildDefaultPreset, graphileBuildPgDefaultPreset],
  disablePlugins: ['NodePlugin'],
};

/**
 * Creates a GraphQL test context using PostGraphile v5 preset-based API.
 *
 * @param input - Configuration including schemas and optional preset
 * @param conn - Database connection result from pgsql-test
 * @returns GraphQL test context with setup, teardown, and query functions
 */
export const GraphQLTest = (
  input: GetConnectionsInput & GetConnectionOpts,
  conn: GetConnectionResult
): GraphQLTestContext => {
  const { schemas, authRole, preset: userPreset } = input;

  let schema: GraphQLSchema;
  let resolvedPreset: GraphileConfig.ResolvedPreset;
  let pgService: ReturnType<typeof makePgService>;

  const pgPool = conn.manager.getPool(conn.pg.config);

  const setup = async () => {
    // Create the pgService - this will be used for withPgClient
    pgService = makePgService({
      pool: pgPool,
      schemas,
    });

    // Build the complete preset by extending the minimal preset
    // with user-provided preset configuration
    const completePreset: GraphileConfig.Preset = {
      extends: [
        MinimalPreset,
        ...(userPreset?.extends ?? []),
      ],
      ...(userPreset?.disablePlugins && { disablePlugins: userPreset.disablePlugins }),
      ...(userPreset?.plugins && { plugins: userPreset.plugins }),
      ...(userPreset?.schema && { schema: userPreset.schema }),
      ...(userPreset?.grafast && { grafast: userPreset.grafast }),
      pgServices: [pgService],
    };

    // Use makeSchema from graphile-build to create the schema
    const result = await makeSchema(completePreset);
    schema = result.schema;
    resolvedPreset = result.resolvedPreset;
  };

  const teardown = async () => {
    // Optional cleanup - schema is garbage collected
  };

  const query = async <TResult = unknown, TVariables extends Variables = Variables>(
    opts: GraphQLQueryOptions<TVariables>
  ): Promise<TResult> => {
    return await runGraphQLInContext<TResult>({
      input,
      schema,
      resolvedPreset,
      authRole: authRole ?? 'anonymous',
      pgPool,
      pgService,
      conn,
      query: opts.query,
      variables: opts.variables,
      reqOptions: opts.reqOptions,
    });
  };

  return {
    setup,
    teardown,
    query,
  };
};
