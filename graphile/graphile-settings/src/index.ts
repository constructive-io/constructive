import type { GraphileConfig } from 'graphile-config';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { PostGraphileConnectionFilterPreset } from 'postgraphile-plugin-connection-filter';
import { makePgService } from 'postgraphile/adaptors/pg';
import { InflektPreset } from 'graphile-simple-inflector';

// Import default presets from graphile-build and graphile-build-pg
// The defaultPreset from each package includes all the standard plugins
import { defaultPreset as graphileBuildDefaultPreset } from 'graphile-build';
import { defaultPreset as graphileBuildPgDefaultPreset } from 'graphile-build-pg';

// Import modules for type augmentation
// These add properties to the GraphileConfig.Preset interface:
// - grafserv: adds 'grafserv' property
// - graphile-build: adds 'schema' property (typed as GraphileBuild.SchemaOptions)
// - postgraphile-plugin-connection-filter: augments SchemaOptions with connectionFilter* options
import 'postgraphile/grafserv';
import 'graphile-build';

// ============================================================================
// Constructive Presets
// ============================================================================

/**
 * Minimal Preset - Combines default presets with Node/Relay features disabled
 *
 * This provides the core functionality using the default presets from
 * graphile-build and graphile-build-pg, which include all standard plugins.
 *
 * Includes InflektPreset for simplified field names:
 * - Tables: users, posts (without 'all' prefix)
 * - No schema prefixes for cleaner naming
 * - id columns stay as 'id' (not renamed to 'rowId')
 *
 * We disable NodePlugin to keep `id` as `id` instead of converting to global Node IDs.
 */
export const MinimalPreset: GraphileConfig.Preset = {
  extends: [graphileBuildDefaultPreset, graphileBuildPgDefaultPreset, InflektPreset],
  disablePlugins: ['NodePlugin'],
};

/**
 * Get the base Graphile v5 preset for Constructive
 *
 * This is a minimal preset that:
 * - Uses custom base preset (replacing PostGraphile Amber preset)
 * - Disables Node/Relay features
 * - Enables connection filter plugin
 * - Uses simplified inflection for cleaner field names
 * - Disables relation filters to keep API clean
 *
 * TODO: Port additional plugins:
 * - graphile-meta-schema -> meta schema preset
 * - graphile-i18n -> i18n preset
 * - graphile-upload-plugin -> upload preset
 * - graphile-postgis -> postgis preset
 * - graphile-search-plugin -> search preset
 */
export const getGraphilePreset = (
  opts: ConstructiveOptions
): GraphileConfig.Preset => {
  const envOpts = getEnvOptions(opts);

  return {
    extends: [
      MinimalPreset,
      PostGraphileConnectionFilterPreset,
    ],
    disablePlugins: [
      'PgConnectionArgFilterBackwardRelationsPlugin',
      'PgConnectionArgFilterForwardRelationsPlugin',
    ],
    grafserv: {
      graphqlPath: '/graphql',
      graphiqlPath: '/graphiql',
      websockets: false,
    },
    grafast: {
      explain: process.env.NODE_ENV === 'development',
    },
    schema: {
      connectionFilterRelations: false,
      connectionFilterComputedColumns: false,
      connectionFilterSetofFunctions: false,
      connectionFilterLogicalOperators: true,
      connectionFilterArrays: true,
    },
  };
};

/**
 * Create a complete preset with pgServices configured
 *
 * This is the main entry point for creating a PostGraphile v5 preset
 * with database connection configured.
 */
export const createGraphilePreset = (
  opts: ConstructiveOptions,
  connectionString: string,
  schemas: string[]
): GraphileConfig.Preset => {
  const basePreset = getGraphilePreset(opts);

  return {
    extends: [basePreset],
    pgServices: [
      makePgService({
        connectionString,
        schemas,
      }),
    ],
  };
};

export { getGraphilePreset as getGraphileSettings };
export { makePgService };
