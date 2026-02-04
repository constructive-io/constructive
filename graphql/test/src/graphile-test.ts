import type { GraphQLQueryOptions, GraphQLTestContext, GetConnectionsInput, Variables, LegacyGraphileOptions } from 'graphile-test';
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

/**
 * Check if a v4 plugin has the v4-style signature (function that takes builder)
 * vs v5-style plugin (object with provides, name, etc.)
 */
function isV4Plugin(plugin: unknown): boolean {
  if (typeof plugin === 'function') {
    // V4 plugins are functions that take a builder
    // V5 plugins are objects with specific properties
    return true;
  }
  return false;
}

/**
 * Convert legacy v4 graphile options to v5 preset configuration where possible.
 *
 * NOTE: v4-style plugins (using builder.hook()) cannot be converted to v5 format.
 * They use fundamentally different APIs.
 */
function convertLegacyOptionsToPreset(graphile: LegacyGraphileOptions): GraphileConfig.Preset {
  const preset: GraphileConfig.Preset = {};

  // Check for v4-style appendPlugins
  if (graphile.appendPlugins && graphile.appendPlugins.length > 0) {
    const v4Plugins = graphile.appendPlugins.filter(isV4Plugin);
    if (v4Plugins.length > 0) {
      console.warn(
        `[graphile-test] Warning: ${v4Plugins.length} v4-style plugin(s) detected in graphile.appendPlugins. ` +
        `V4 plugins using builder.hook() are NOT compatible with PostGraphile v5. ` +
        `Please convert to v5 plugins and use the 'preset' option instead.`
      );
    }

    // V5-style plugins can be added
    const v5Plugins = graphile.appendPlugins.filter(p => !isV4Plugin(p));
    if (v5Plugins.length > 0) {
      preset.plugins = v5Plugins;
    }
  }

  // Convert graphileBuildOptions to schema options where possible
  if (graphile.graphileBuildOptions) {
    preset.schema = {
      ...graphile.graphileBuildOptions,
    };
  }

  // overrideSettings may contain various v4 PostGraphile options
  // Most of these don't have direct v5 equivalents
  if (graphile.overrideSettings) {
    console.warn(
      `[graphile-test] Warning: graphile.overrideSettings is deprecated. ` +
      `PostGraphile v5 uses presets instead. Some options may not be supported.`
    );
  }

  return preset;
}

export const GraphQLTest = (
  input: GetConnectionsInput & GetConnectionOpts,
  conn: GetConnectionResult
): GraphQLTestContext => {
  const {
    schemas,
    authRole,
    preset: userPreset,
    graphile: legacyGraphile
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

    // Convert legacy graphile options to preset if provided
    const legacyPreset = legacyGraphile ? convertLegacyOptionsToPreset(legacyGraphile) : {};

    // Build the complete preset by extending ConstructivePreset
    // with user-provided preset configuration and legacy options
    const completePreset: GraphileConfig.Preset = {
      extends: [
        ConstructivePreset,
        ...(legacyPreset?.extends ?? []),
        ...(userPreset?.extends ?? []),
      ],
      ...(legacyPreset?.disablePlugins && { disablePlugins: legacyPreset.disablePlugins }),
      ...(userPreset?.disablePlugins && { disablePlugins: userPreset.disablePlugins }),
      ...(legacyPreset?.plugins && { plugins: legacyPreset.plugins }),
      ...(userPreset?.plugins && { plugins: userPreset.plugins }),
      schema: {
        ...(legacyPreset?.schema ?? {}),
        ...(userPreset?.schema ?? {}),
      },
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
