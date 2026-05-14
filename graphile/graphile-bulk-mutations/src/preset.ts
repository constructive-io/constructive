/**
 * Bulk Mutations Preset
 *
 * Provides a convenient preset factory for including bulk mutations
 * in PostGraphile v5.
 *
 * @example
 * ```typescript
 * import { BulkMutationPreset } from 'graphile-bulk-mutations';
 *
 * const preset = {
 *   extends: [
 *     BulkMutationPreset(),
 *     // or with options:
 *     BulkMutationPreset({
 *       bulkNaming: 'pluralized',
 *       bulkRelational: true,
 *     }),
 *   ],
 * };
 * ```
 */

import './augmentations';

import type { GraphileConfig } from 'graphile-config';

import {
  BulkDeletePlugin,
  BulkInflectionPlugin,
  BulkInsertPlugin,
  BulkRelationalPlugin,
  BulkTypesPlugin,
  BulkUpdatePlugin,
  BulkUpsertPlugin
} from './plugins';
import type { BulkMutationOptions } from './types';

/**
 * Default schema options for bulk mutations.
 */
const defaultSchemaOptions: BulkMutationOptions = {
  bulkNaming: 'bulk',
  bulkInsert: true,
  bulkUpsert: true,
  bulkUpdate: true,
  bulkDelete: true,
  bulkRelational: false,
  bulkReturning: true,
  bulkMaxRows: 1000,
  bulkMaxNestingDepth: 3,
  bulkRequireWhere: true
};

/**
 * Creates a preset that includes the bulk mutation plugins with the given options.
 *
 * Behavior is OFF by default for all tables. Tables must opt in via smart tags:
 *   COMMENT ON TABLE users IS E'@behavior +bulkInsert +bulkUpsert';
 *
 * The `enable_bulk` database setting must also be true for the plugin to load.
 */
export function BulkMutationPreset(
  options: BulkMutationOptions = {}
): GraphileConfig.Preset {
  const mergedOptions = { ...defaultSchemaOptions, ...options };

  const plugins: GraphileConfig.Plugin[] = [
    BulkInflectionPlugin,
    BulkTypesPlugin
  ];

  if (mergedOptions.bulkInsert) {
    plugins.push(BulkInsertPlugin);
  }

  if (mergedOptions.bulkUpsert) {
    plugins.push(BulkUpsertPlugin);
  }

  if (mergedOptions.bulkUpdate) {
    plugins.push(BulkUpdatePlugin);
  }

  if (mergedOptions.bulkDelete) {
    plugins.push(BulkDeletePlugin);
  }

  if (mergedOptions.bulkRelational) {
    plugins.push(BulkRelationalPlugin);
  }

  return {
    plugins,
    schema: mergedOptions
  };
}

export default BulkMutationPreset;
