import type { GraphQLQueryOptions, GraphQLTestContext, GetConnectionsInput, Variables } from 'graphile-test';
import { ConstructivePreset } from 'graphile-settings';
import type { GraphQLSchema } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import type { GetConnectionOpts, GetConnectionResult } from 'pgsql-test';
import { makeSchema } from 'graphile-build';
import { makePgService } from 'postgraphile/adaptors/pg';
import { runGraphQLInContext } from 'graphile-test/context';

/**
 * Creates a GraphQL test context using PostGraphile v5 with ConstructivePreset.
 *
 * This is the Constructive-specific test wrapper that pre-loads all plugins
 * from graphile-settings. For generic PostGraphile testing without the
 * Constructive preset, use graphile-test directly.
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
    pgService = makePgService({
      pool: pgPool,
      schemas,
    });

    const completePreset: GraphileConfig.Preset = {
      extends: [
        ConstructivePreset,
        ...(userPreset?.extends ?? []),
      ],
      ...(userPreset?.disablePlugins && { disablePlugins: userPreset.disablePlugins }),
      ...(userPreset?.plugins && { plugins: userPreset.plugins }),
      ...(userPreset?.schema && { schema: userPreset.schema }),
      ...(userPreset?.grafast && { grafast: userPreset.grafast }),
      pgServices: [pgService],
    };

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
