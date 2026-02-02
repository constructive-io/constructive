import type { GraphileConfig } from 'graphile-config';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber';
import { PostGraphileConnectionFilterPreset } from 'postgraphile-plugin-connection-filter';
import { PgSimplifyInflectionPreset } from '@graphile/simplify-inflection';
import { makePgService } from 'postgraphile/adaptors/pg';

/**
 * Minimal Preset - Disables Node/Relay features
 * 
 * This keeps `id` as `id` instead of converting to global Node IDs.
 * Removes nodeId, node(), and Relay-style pagination.
 */
export const MinimalPreset: GraphileConfig.Preset = {
  disablePlugins: ['NodePlugin'],
};

/**
 * Get the base Graphile v5 preset for Constructive
 * 
 * This is a minimal preset that:
 * - Uses PostGraphile Amber preset as base
 * - Disables Node/Relay features
 * - Enables connection filter plugin
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
      PostGraphileAmberPreset,
      MinimalPreset,
      PostGraphileConnectionFilterPreset,
      PgSimplifyInflectionPreset,
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
