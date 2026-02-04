import type { GraphQLQueryOptions, GraphQLTestContext, GetConnectionsInput, Variables } from 'graphile-test';
import { ConstructivePreset, makePgService } from 'graphile-settings';
import { makeSchema } from 'graphile-build';
import type { GraphQLSchema } from 'graphql';
import type { GetConnectionOpts, GetConnectionResult } from 'pgsql-test';
import { runGraphQLInContext } from 'graphile-test/context';

// Type augmentation: import the modules that extend GraphileConfig.Preset
// These must come BEFORE using GraphileConfig.Preset type
import '@dataplan/pg'; // Augments Preset with pgServices
import '@dataplan/pg/adaptors/pg'; // Augments PgAdaptors interface with pg adaptor types
import 'postgraphile/grafserv';
import 'graphile-build';

export const GraphQLTest = (
  input: GetConnectionsInput & GetConnectionOpts,
  conn: GetConnectionResult
): GraphQLTestContext => {
  const {
    schemas,
    authRole,
    preset: userPreset
  } = input;

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

    // Build the complete preset by extending ConstructivePreset
    // with user-provided preset configuration
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

    // Use makeSchema from graphile-build to create the schema
    const result = await makeSchema(completePreset);
    schema = result.schema;
    resolvedPreset = result.resolvedPreset;
  };

  const teardown = async () => { /* optional cleanup */ };

  const query = async <TResult = any, TVariables extends Variables = Variables>(
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
      ...opts
    });
  };

  return {
    setup,
    teardown,
    query
  };
};
