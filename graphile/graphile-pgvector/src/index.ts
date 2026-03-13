/**
 * graphile-pgvector
 *
 * PostGraphile v5 plugin suite for pgvector.
 *
 * Provides two plugins:
 *
 * 1. **VectorCodecPlugin** — Teaches the schema builder what the `vector` type is so that:
 *    - vector(n) columns appear on output types and in create/update mutations
 *    - SQL functions with vector arguments are exposed automatically
 *    - A `Vector` GraphQL scalar (serialized as [Float]) handles I/O
 *
 * 2. **VectorSearchPlugin** — Auto-discovers all vector columns and adds:
 *    - `<column>Nearby` filter fields on connections (filter by distance)
 *    - `<column>Distance` computed fields on output types
 *    - `<COLUMN>_DISTANCE_ASC/DESC` orderBy enum values
 *    Requires postgraphile-plugin-connection-filter to be loaded first.
 *
 * @example
 * ```typescript
 * import { VectorCodecPreset } from 'graphile-pgvector';
 *
 * // Just add to your preset — everything is auto-discovered, zero config
 * const preset = {
 *   extends: [VectorCodecPreset],
 * };
 * ```
 */

export { VectorCodecPlugin, VectorCodecPreset } from './vector-codec';
export { VectorSearchPlugin, createVectorSearchPlugin } from './vector-search';
export type { VectorSearchPluginOptions, VectorMetric } from './types';
