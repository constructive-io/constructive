/**
 * PostGraphile v5 pgvector Plugin
 *
 * Provides vector similarity search capabilities using pgvector.
 *
 * @example
 * ```typescript
 * import { PgVectorPlugin, PgVectorPreset } from 'postgraphile-plugin-pgvector';
 *
 * // Option 1: Use the preset (recommended)
 * const preset = {
 *   extends: [
 *     PgVectorPreset({
 *       collections: [{
 *         schema: 'public',
 *         table: 'documents',
 *         embeddingColumn: 'embedding',
 *       }],
 *     }),
 *   ],
 * };
 *
 * // Option 2: Use the plugin directly
 * const plugin = PgVectorPlugin({
 *   collections: [{
 *     schema: 'public',
 *     table: 'documents',
 *     embeddingColumn: 'embedding',
 *   }],
 *   defaultMetric: 'COSINE',
 *   maxLimit: 100,
 * });
 * ```
 */

export { PgVectorPlugin, createPgVectorPlugin } from './plugin';
export { PgVectorPreset } from './preset';
export {
  METRIC_OPERATORS,
  buildVectorSearchQuery,
  buildVectorSearchQueryWithWhere,
  buildDistanceExpression,
  formatVectorString,
  validateQueryVector,
  clampLimit,
} from './sql';
export type {
  VectorMetric,
  VectorCollectionConfig,
  PgVectorPluginOptions,
  VectorSearchResult,
} from './types';
