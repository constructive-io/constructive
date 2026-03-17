import type { GraphileConfig } from 'graphile-config';
import { defaultPreset as graphileBuildPreset } from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';

/**
 * Minimal PostGraphile v5 preset without Node/Relay features.
 *
 * This preset builds a clean GraphQL API from PostgreSQL without:
 * - Global Node ID (Relay spec) - so `id` columns stay as `id`
 * - Schema prefixing for naming conflicts
 *
 * We use the default presets from graphile-build and graphile-build-pg
 * and disable all Node-related plugins.
 */

/**
 * List of Node/Relay-related plugins to disable.
 * These implement the Relay Global Object Identification spec which:
 * - Adds a global `id` field to types
 * - Renames actual `id` columns to `rowId`
 * - Adds Node interface and nodeId lookups
 *
 * Since we use UUIDs, we don't need any of this.
 */
const NODE_PLUGINS_TO_DISABLE = [
  // Core Node plugins from graphile-build
  'NodePlugin',
  'AddNodeInterfaceToSuitableTypesPlugin',
  'NodeIdCodecBase64JSONPlugin',
  'NodeIdCodecPipeStringPlugin',
  'RegisterQueryNodePlugin',
  'NodeAccessorPlugin',
  // PG-specific Node plugins from graphile-build-pg
  'PgNodeIdAttributesPlugin',
  'PgTableNodePlugin',
];

/**
 * Minimal preset with all the PostgreSQL functionality but without Node/Relay features.
 * This keeps `id` columns as `id` (no renaming to `rowId`).
 */
export const MinimalPreset: GraphileConfig.Preset = {
  extends: [graphileBuildPreset, graphileBuildPgPreset],
  disablePlugins: NODE_PLUGINS_TO_DISABLE,
};

export default MinimalPreset;
