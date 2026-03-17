/**
 * pgvector Search Adapter
 *
 * Detects vector columns and generates distance-based scoring using
 * pgvector operators (<=> cosine, <-> L2, <#> inner product).
 * Wraps the same SQL logic as graphile-pgvector but as a SearchAdapter.
 */

import type { SearchAdapter, SearchableColumn, FilterApplyResult } from '../types';
import type { SQL } from 'pg-sql2';

/**
 * pgvector distance operators.
 */
const METRIC_OPERATORS: Record<string, string> = {
  COSINE: '<=>',
  L2: '<->',
  IP: '<#>',
};

function isVectorCodec(codec: any): boolean {
  return codec?.name === 'vector';
}

export interface PgvectorAdapterOptions {
  /**
   * Filter prefix for vector filter fields.
   * @default 'vector'
   */
  filterPrefix?: string;

  /**
   * Default similarity metric.
   * @default 'COSINE'
   */
  defaultMetric?: 'COSINE' | 'L2' | 'IP';
}

export function createPgvectorAdapter(
  options: PgvectorAdapterOptions = {}
): SearchAdapter {
  const { filterPrefix = 'vector', defaultMetric = 'COSINE' } = options;

  return {
    name: 'vector',

    scoreSemantics: {
      metric: 'distance',
      lowerIsBetter: true,
      range: null, // 0 to infinity
    },

    filterPrefix,

    // pgvector operates on embedding vectors, not text search — its presence
    // alone should NOT trigger supplementary adapters like trgm.
    isIntentionalSearch: false,

    supportsTextSearch: false,
    // pgvector requires a vector array, not plain text — no buildTextSearchInput

    detectColumns(codec: any, _build: any): SearchableColumn[] {
      if (!codec?.attributes) return [];

      const columns: SearchableColumn[] = [];
      for (const [attributeName, attribute] of Object.entries(
        codec.attributes as Record<string, any>
      )) {
        if (isVectorCodec(attribute.codec)) {
          columns.push({ attributeName });
        }
      }
      return columns;
    },

    registerTypes(build: any): void {
      const {
        graphql: { GraphQLList, GraphQLNonNull, GraphQLFloat },
      } = build;

      // Register types for vector search.
      // Wrapped in try/catch because the standalone graphile-pgvector plugin may
      // have already registered these types in its own init hook.
      // Graphile throws on duplicate registrations, so we catch and ignore.
      try {
        build.registerEnumType(
          'VectorMetric',
          {},
          () => ({
            description: 'Similarity metric for vector search',
            values: {
              COSINE: {
                value: 'COSINE',
                description: 'Cosine distance (1 - cosine similarity). Range: 0 (identical) to 2 (opposite).',
              },
              L2: {
                value: 'L2',
                description: 'Euclidean (L2) distance. Range: 0 (identical) to infinity.',
              },
              IP: {
                value: 'IP',
                description: 'Negative inner product. Higher (less negative) = more similar.',
              },
            },
          }),
          'UnifiedSearchPlugin (pgvector adapter) registering VectorMetric enum'
        );
      } catch {
        // Already registered by standalone graphile-pgvector plugin — safe to ignore
      }

      try {
        build.registerInputObjectType(
          'VectorNearbyInput',
          {},
          () => ({
            description:
              'Input for vector similarity search. Provide a query vector, optional metric, and optional max distance threshold.',
            fields: () => {
              // getTypeByName is safe inside a thunk (fields callback) — called after init is complete
              const VectorMetricEnum = build.getTypeByName('VectorMetric') as any;
              return {
                vector: {
                  type: new GraphQLNonNull(
                    new GraphQLList(new GraphQLNonNull(GraphQLFloat))
                  ),
                  description: 'Query vector for similarity search.',
                },
                metric: {
                  type: VectorMetricEnum,
                  description: `Similarity metric to use (default: ${defaultMetric}).`,
                },
                distance: {
                  type: GraphQLFloat,
                  description: 'Maximum distance threshold. Only rows within this distance are returned.',
                },
              };
            },
          }),
          'UnifiedSearchPlugin (pgvector adapter) registering VectorNearbyInput type'
        );
      } catch {
        // Already registered by standalone graphile-pgvector plugin — safe to ignore
      }
    },

    getFilterTypeName(_build: any): string {
      return 'VectorNearbyInput';
    },

    buildFilterApply(
      sql: any,
      alias: SQL,
      column: SearchableColumn,
      filterValue: any,
      _build: any,
    ): FilterApplyResult | null {
      if (filterValue == null) return null;

      const { vector, metric, distance } = filterValue;
      if (!vector || !Array.isArray(vector) || vector.length === 0) return null;

      const resolvedMetric = metric || defaultMetric;
      const operator = METRIC_OPERATORS[resolvedMetric] || METRIC_OPERATORS.COSINE;
      const vectorString = `[${vector.join(',')}]`;

      const columnExpr = sql`${alias}.${sql.identifier(column.attributeName)}`;
      const vectorExpr = sql`${sql.value(vectorString)}::vector`;
      const distanceExpr = sql`(${columnExpr} ${sql.raw(operator)} ${vectorExpr})`;

      let whereClause: SQL | null = null;
      if (distance !== undefined && distance !== null) {
        whereClause = sql`${distanceExpr} <= ${sql.value(distance)}`;
      }

      return {
        whereClause,
        scoreExpression: distanceExpr,
      };
    },
  };
}
