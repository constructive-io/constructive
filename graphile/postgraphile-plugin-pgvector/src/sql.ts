/**
 * SQL Query Builder for pgvector
 *
 * Provides safe, parameterized SQL generation for vector similarity searches.
 * All user input is properly escaped using pg-sql2.
 */

import { sql, type SQL, compile as compileSql } from 'pg-sql2';
import type { VectorMetric } from './types';

export { compileSql };

/**
 * Maps VectorMetric enum values to pgvector operators.
 *
 * pgvector operators:
 * - <-> : L2 (Euclidean) distance
 * - <#> : Negative inner product (for ASC ordering)
 * - <=> : Cosine distance
 */
export const METRIC_OPERATORS: Record<VectorMetric, string> = {
  L2: '<->',
  IP: '<#>',
  COSINE: '<=>',
};

/**
 * Builds a safe SQL fragment for the distance operator expression.
 *
 * @param columnAlias - SQL alias for the table
 * @param columnName - Name of the embedding column
 * @param metric - The similarity metric to use
 * @returns SQL fragment for the distance calculation
 */
export function buildDistanceExpression(
  columnAlias: SQL,
  columnName: string,
  metric: VectorMetric
): SQL {
  const operator = METRIC_OPERATORS[metric];
  // Use sql.raw for the operator since it's from our controlled mapping
  return sql`${columnAlias}.${sql.identifier(columnName)} ${sql.raw(operator)} $1::vector`;
}

/**
 * Builds a complete vector search query.
 *
 * The query:
 * 1. Selects all columns from the table plus the distance
 * 2. Orders by distance (ascending for all metrics)
 * 3. Applies LIMIT and OFFSET
 *
 * @param schema - PostgreSQL schema name
 * @param table - PostgreSQL table name
 * @param embeddingColumn - Name of the vector column
 * @param metric - Similarity metric to use
 * @returns SQL query template (parameters: $1=vector, $2=limit, $3=offset)
 */
export function buildVectorSearchQuery(
  schema: string,
  table: string,
  embeddingColumn: string,
  metric: VectorMetric
): SQL {
  const tableRef = sql.identifier(schema, table);
  const alias = sql.identifier('t');
  const operator = METRIC_OPERATORS[metric];

  // Build the query with parameterized values
  // $1 = query vector (cast to vector type)
  // $2 = limit
  // $3 = offset
  return sql`
    SELECT ${alias}.*,
           (${alias}.${sql.identifier(embeddingColumn)} ${sql.raw(operator)} $1::vector) AS distance
    FROM ${tableRef} ${alias}
    ORDER BY ${alias}.${sql.identifier(embeddingColumn)} ${sql.raw(operator)} $1::vector
    LIMIT $2
    OFFSET $3
  `;
}

/**
 * Builds a vector search query with an optional WHERE clause.
 *
 * @param schema - PostgreSQL schema name
 * @param table - PostgreSQL table name
 * @param embeddingColumn - Name of the vector column
 * @param metric - Similarity metric to use
 * @param whereClause - Optional SQL WHERE clause fragment
 * @returns SQL query template
 */
export function buildVectorSearchQueryWithWhere(
  schema: string,
  table: string,
  embeddingColumn: string,
  metric: VectorMetric,
  whereClause?: SQL
): SQL {
  const tableRef = sql.identifier(schema, table);
  const alias = sql.identifier('t');
  const operator = METRIC_OPERATORS[metric];

  const baseQuery = sql`
    SELECT ${alias}.*,
           (${alias}.${sql.identifier(embeddingColumn)} ${sql.raw(operator)} $1::vector) AS distance
    FROM ${tableRef} ${alias}
  `;

  if (whereClause) {
    return sql`
      ${baseQuery}
      WHERE ${whereClause}
      ORDER BY ${alias}.${sql.identifier(embeddingColumn)} ${sql.raw(operator)} $1::vector
      LIMIT $2
      OFFSET $3
    `;
  }

  return sql`
    ${baseQuery}
    ORDER BY ${alias}.${sql.identifier(embeddingColumn)} ${sql.raw(operator)} $1::vector
    LIMIT $2
    OFFSET $3
  `;
}

/**
 * Formats a JavaScript array of numbers as a pgvector string.
 *
 * @param vector - Array of numbers representing the vector
 * @returns String in pgvector format: '[1.0,2.0,3.0]'
 */
export function formatVectorString(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

/**
 * Validates a query vector.
 *
 * @param vector - The vector to validate
 * @param maxDim - Optional maximum dimension limit
 * @throws Error if validation fails
 */
export function validateQueryVector(
  vector: unknown,
  maxDim?: number
): asserts vector is number[] {
  if (!Array.isArray(vector)) {
    throw new Error('Query vector must be an array');
  }

  if (vector.length === 0) {
    throw new Error('Query vector cannot be empty');
  }

  for (let i = 0; i < vector.length; i++) {
    if (typeof vector[i] !== 'number' || !Number.isFinite(vector[i])) {
      throw new Error(`Query vector element at index ${i} must be a finite number`);
    }
  }

  if (maxDim !== undefined && vector.length > maxDim) {
    throw new Error(
      `Query vector dimension (${vector.length}) exceeds maximum allowed (${maxDim})`
    );
  }
}

/**
 * Clamps a limit value to the maximum allowed.
 *
 * @param limit - Requested limit
 * @param maxLimit - Maximum allowed limit
 * @returns Clamped limit value
 */
export function clampLimit(limit: number, maxLimit: number): number {
  return Math.min(Math.max(1, limit), maxLimit);
}
