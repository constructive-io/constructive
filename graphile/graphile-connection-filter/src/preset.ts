/**
 * Connection Filter Preset
 *
 * Provides a convenient preset factory for including connection filtering
 * in PostGraphile v5.
 *
 * @example
 * ```typescript
 * import { ConnectionFilterPreset } from 'graphile-connection-filter';
 *
 * const preset = {
 *   extends: [
 *     ConnectionFilterPreset(),
 *     // or with options:
 *     ConnectionFilterPreset({
 *       connectionFilterLogicalOperators: true,
 *       connectionFilterArrays: true,
 *     }),
 *   ],
 * };
 * ```
 */

import './augmentations';
import type { GraphileConfig } from 'graphile-config';
import type { ConnectionFilterOptions } from './types';
import {
  ConnectionFilterInflectionPlugin,
  ConnectionFilterTypesPlugin,
  ConnectionFilterArgPlugin,
  ConnectionFilterAttributesPlugin,
  ConnectionFilterOperatorsPlugin,
  ConnectionFilterCustomOperatorsPlugin,
  ConnectionFilterLogicalOperatorsPlugin,
  ConnectionFilterComputedAttributesPlugin,
} from './plugins';

/**
 * Default schema options for the connection filter.
 */
const defaultSchemaOptions: ConnectionFilterOptions = {
  connectionFilterArrays: true,
  connectionFilterLogicalOperators: true,
  connectionFilterAllowNullInput: false,
  connectionFilterAllowEmptyObjectInput: false,
  connectionFilterSetofFunctions: true,
  connectionFilterComputedColumns: true,
};

/**
 * Creates a preset that includes the connection filter plugins with the given options.
 *
 * All plugins are always included. Use the schema options to control behavior:
 * - `connectionFilterLogicalOperators: false` to exclude and/or/not
 * - `connectionFilterArrays: false` to exclude array type filters
 * - `connectionFilterAllowNullInput: true` to allow null literals
 * - `connectionFilterAllowEmptyObjectInput: true` to allow empty objects
 */
export function ConnectionFilterPreset(
  options: ConnectionFilterOptions = {}
): GraphileConfig.Preset {
  const mergedOptions = { ...defaultSchemaOptions, ...options };

  const plugins: GraphileConfig.Plugin[] = [
    ConnectionFilterInflectionPlugin,
    ConnectionFilterTypesPlugin,
    ConnectionFilterArgPlugin,
    ConnectionFilterAttributesPlugin,
    ConnectionFilterOperatorsPlugin,
    ConnectionFilterCustomOperatorsPlugin,
  ];

  // Logical operators are opt-out
  if (mergedOptions.connectionFilterLogicalOperators !== false) {
    plugins.push(ConnectionFilterLogicalOperatorsPlugin);
  }

  // Computed columns are opt-in (disabled by default)
  if (mergedOptions.connectionFilterComputedColumns) {
    plugins.push(ConnectionFilterComputedAttributesPlugin);
  }

  return {
    plugins,
    schema: mergedOptions,
  };
}

export default ConnectionFilterPreset;
