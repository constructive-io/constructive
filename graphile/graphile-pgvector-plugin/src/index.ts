/**
 * graphile-pgvector-plugin
 *
 * PostGraphile v5 codec plugin for pgvector.
 * Teaches the schema builder what the `vector` type is so that:
 * - vector(n) columns appear on output types and in create/update mutations
 * - SQL functions with vector arguments are exposed automatically
 * - A `Vector` GraphQL scalar (serialized as [Float]) handles I/O
 *
 * @example
 * ```typescript
 * import { VectorCodecPreset } from 'graphile-pgvector-plugin';
 *
 * const preset = {
 *   extends: [VectorCodecPreset],
 * };
 * ```
 */

export { VectorCodecPlugin, VectorCodecPreset } from './vector-codec';
