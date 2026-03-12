/**
 * graphile-pgvector-plugin Types
 *
 * Type definitions for the vector search plugin configuration.
 */

/**
 * Supported vector similarity metrics.
 * - COSINE: Cosine distance (1 - cosine similarity)
 * - L2: Euclidean (L2) distance
 * - IP: Inner product (negative, for ordering)
 */
export type VectorMetric = 'COSINE' | 'L2' | 'IP';

/**
 * Plugin configuration options for VectorSearchPlugin.
 */
export interface VectorSearchPluginOptions {
  /**
   * Default similarity metric to use when not specified in queries.
   * @default 'COSINE'
   */
  defaultMetric?: VectorMetric;

  /**
   * Maximum limit for vector search results (top-level query fields).
   * @default 100
   */
  maxLimit?: number;

  /**
   * Prefix for vector filter fields on connection filter inputs.
   * For example, with prefix 'vector' and a column named 'embedding',
   * the generated filter field will be 'vectorEmbedding'.
   * @default 'vector'
   */
  filterPrefix?: string;
}
