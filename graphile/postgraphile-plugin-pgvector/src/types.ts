/**
 * pgvector Plugin Types
 *
 * Type definitions for the PostGraphile pgvector plugin configuration.
 */

/**
 * Supported vector similarity metrics.
 * - COSINE: Cosine distance (1 - cosine similarity)
 * - L2: Euclidean (L2) distance
 * - IP: Inner product (negative, for ordering)
 */
export type VectorMetric = 'COSINE' | 'L2' | 'IP';

/**
 * Configuration for a single vector search collection.
 */
export interface VectorCollectionConfig {
  /**
   * PostgreSQL schema name containing the table.
   */
  schema: string;

  /**
   * PostgreSQL table name.
   */
  table: string;

  /**
   * Name of the column containing the vector embedding.
   * Must be of type `vector(n)` from pgvector.
   */
  embeddingColumn: string;

  /**
   * Primary key column name.
   * If not provided, will attempt to infer from the table.
   * @default inferred from table introspection
   */
  primaryKey?: string;

  /**
   * Custom GraphQL field name for the vector search query.
   * If not provided, will be generated as `vectorSearch_<tableName>`.
   */
  graphqlFieldName?: string;

  /**
   * Maximum allowed dimension for query vectors.
   * Used for defensive validation to prevent mismatched dimensions.
   */
  maxQueryDim?: number;
}

/**
 * Plugin configuration options.
 */
export interface PgVectorPluginOptions {
  /**
   * Array of collection configurations for vector search.
   * Each collection maps to a table with a vector column.
   */
  collections: VectorCollectionConfig[];

  /**
   * Default similarity metric to use when not specified in queries.
   * @default 'COSINE'
   */
  defaultMetric?: VectorMetric;

  /**
   * Maximum limit for vector search results.
   * Used to prevent excessive result sets.
   * @default 100
   */
  maxLimit?: number;

  /**
   * Whether to require RLS-safe queries.
   * When true, queries use the same connection as other PostGraphile queries,
   * ensuring Row Level Security policies are applied.
   * @default true
   */
  requireRlsSafe?: boolean;
}

/**
 * Result row from a vector search query.
 */
export interface VectorSearchResult<T = Record<string, unknown>> {
  /**
   * The row data from the table.
   */
  row: T;

  /**
   * The distance/similarity score.
   * Interpretation depends on the metric used:
   * - COSINE: 0 = identical, 2 = opposite
   * - L2: 0 = identical, higher = more different
   * - IP: Higher (less negative) = more similar
   */
  distance: number;
}
