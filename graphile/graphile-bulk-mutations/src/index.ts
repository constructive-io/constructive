/**
 * graphile-bulk-mutations
 *
 * A PostGraphile v5 plugin for bulk insert, upsert, update, and delete
 * mutations with ON CONFLICT handling.
 *
 * @example
 * ```typescript
 * import { BulkMutationPreset } from 'graphile-bulk-mutations';
 *
 * const preset = {
 *   extends: [
 *     BulkMutationPreset(),
 *   ],
 * };
 * ```
 *
 * Tables must opt in via smart tags:
 * ```sql
 * COMMENT ON TABLE users IS E'@behavior +bulkInsert +bulkUpsert';
 * COMMENT ON TABLE orders IS E'@behavior +bulkInsert +bulkUpdate +bulkDelete';
 * ```
 */

import './augmentations';

export { BulkMutationPreset } from './preset';

// Re-export all plugins for granular use
export {
  BulkDeletePlugin,
  BulkInflectionPlugin,
  BulkInsertPlugin,
  BulkRelationalPlugin,
  BulkTypesPlugin,
  BulkUpdatePlugin,
  BulkUpsertPlugin
} from './plugins';

// Re-export types
export type { BulkMutationOptions, BulkNamingStrategy } from './types';
export { PG_MAX_PARAMS } from './types';

// Re-export utilities
export type { ColumnSpec, InsertBatch } from './utils';
export {
  buildBulkDeleteSQL,
  buildBulkInsertSQL,
  buildBulkUpdateSQL
} from './utils';
