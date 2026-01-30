import type { GraphQLSchema } from 'graphql';
import type { Pool, PoolClient } from 'pg';
import type { GraphileConfig } from 'graphile-config';
import { makeSchema } from 'postgraphile';
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber';
import { makePgService } from 'postgraphile/adaptors/pg';

import { runGraphQLInContext } from './context.js';
import type { GraphQLQueryOptions, GraphQLTestContext, GetConnectionsInput } from './types.js';

export interface GraphQLTestInput {
  input: GetConnectionsInput;
  pgPool: Pool;
  pgClient: PoolClient;
}

export const GraphQLTest = (testInput: GraphQLTestInput): GraphQLTestContext => {
  const { input, pgPool, pgClient } = testInput;
  const { schemas, authRole = 'postgres', preset: userPreset } = input;

  let schema: GraphQLSchema;
  let resolvedPreset: GraphileConfig.ResolvedPreset;

  const setup = async () => {
    const basePreset: GraphileConfig.Preset = {
      extends: [PostGraphileAmberPreset],
      pgServices: [
        makePgService({
          pool: pgPool,
          schemas,
        }),
      ],
    };

    const preset: GraphileConfig.Preset = userPreset
      ? { extends: [userPreset, basePreset] }
      : basePreset;

    const schemaResult = await makeSchema(preset);
    schema = schemaResult.schema;
    resolvedPreset = schemaResult.resolvedPreset;
  };

  const teardown = async () => {
    /* optional cleanup */
  };

  const query = async <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    opts: GraphQLQueryOptions<TVariables>
  ): Promise<TResult> => {
    return await runGraphQLInContext<TResult>({
      input,
      schema,
      resolvedPreset,
      pgPool,
      pgClient,
      authRole,
      query: opts.query,
      variables: opts.variables as Record<string, unknown> | undefined,
      reqOptions: opts.reqOptions,
    });
  };

  return {
    setup,
    teardown,
    query,
  };
};
