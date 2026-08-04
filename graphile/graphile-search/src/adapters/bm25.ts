/**
 * BM25 Search Adapter
 *
 * Detects text columns with BM25 indexes (via pg_textsearch) and generates
 * BM25 relevance scoring. Wraps the same SQL logic as graphile-bm25.
 *
 * Requires the Bm25CodecPlugin to be loaded first. The adapter reads index
 * metadata attached to the exact codec attribute during the same gather.
 *
 * Supports chunk-aware querying via @hasChunks smart tag: when the parent
 * table has chunks with a BM25 index, the adapter includes a lateral
 * subquery to find the best-matching chunk and returns
 * LEAST(parent_score, chunk_score) (lower = better for BM25).
 */

import { QuoteUtils } from '@pgsql/quotes';
import type { SQL } from 'pg-sql2';

import type { Bm25IndexInfo } from '../codecs/bm25-codec';
import type { FilterApplyResult, SearchableColumn, SearchAdapter } from '../types';
import { type ChunksInfo,getChunksInfo } from './chunks';

export type { Bm25IndexInfo } from '../codecs/bm25-codec';

/** Combined adapter data for a BM25-searchable column */
interface Bm25ColumnData {
  bm25Index: Bm25IndexInfo;
  chunksInfo?: ChunksInfo;
  chunkBm25Index?: Bm25IndexInfo;
}

function isTextCodec(codec: any): boolean {
  const name = codec?.name;
  return name === 'text' || name === 'varchar' || name === 'bpchar';
}

export interface Bm25AdapterOptions {
  /**
   * Filter prefix for BM25 filter fields.
   * @default 'bm25'
   */
  filterPrefix?: string;
}

export function createBm25Adapter(
  options: Bm25AdapterOptions = {}
): SearchAdapter {
  const { filterPrefix = 'bm25' } = options;

  function getBm25IndexForAttribute(
    codec: any,
    attributeName: string
  ): Bm25IndexInfo | undefined {
    const bound = codec.attributes?.[attributeName]?.extensions?.bm25Index;
    return bound as Bm25IndexInfo | undefined;
  }

  function findBoundBm25Index(
    build: any,
    serviceName: string,
    schemaName: string,
    tableName: string,
    columnName: string
  ): Bm25IndexInfo | undefined {
    for (const codec of Object.values(
      build?.input?.pgRegistry?.pgCodecs ?? {}
    ) as any[]) {
      for (const attribute of Object.values(codec?.attributes ?? {}) as any[]) {
        const index = attribute?.extensions?.bm25Index as Bm25IndexInfo | undefined;
        if (
          index?.serviceName === serviceName
          && index.schemaName === schemaName
          && index.tableName === tableName
          && index.columnName === columnName
        ) {
          return index;
        }
      }
    }
    return undefined;
  }

  return {
    name: 'bm25',

    scoreSemantics: {
      metric: 'score',
      lowerIsBetter: true,
      range: null, // unbounded negative
    },

    filterPrefix,

    supportsTextSearch: true,

    buildTextSearchInput(text: string): { query: string } {
      // BM25 filter takes { query: string }
      return { query: text };
    },

    detectColumns(codec: any, build: any): SearchableColumn[] {
      if (!codec?.attributes) return [];

      const columns: SearchableColumn[] = [];
      for (const [attributeName, attribute] of Object.entries(
        codec.attributes as Record<string, any>
      )) {
        if (!isTextCodec(attribute.codec)) continue;
        const bm25Index = getBm25IndexForAttribute(codec, attributeName);
        if (!bm25Index) continue;

        // Check for chunk-aware BM25
        const chunksInfo = getChunksInfo(codec, build);
        const hasChunkBm25 = chunksInfo?.searchIndexes.includes('bm25') === true;
        let chunkBm25Index: Bm25IndexInfo | undefined;
        if (hasChunkBm25) {
          if (!bm25Index.serviceName) {
            throw new Error('BM25 chunk search requires a bound PostgreSQL service identity');
          }
          if (!chunksInfo?.chunksSchema) {
            throw new Error(
              `BM25 chunk search for '${chunksInfo?.chunksTableName}' requires a physical schema`
            );
          }
          chunkBm25Index = findBoundBm25Index(
            build,
            bm25Index.serviceName,
            chunksInfo.chunksSchema,
            chunksInfo.chunksTableName,
            chunksInfo.contentField
          );
          if (!chunkBm25Index) {
            throw new Error(
              'BM25 chunk search could not bind an introspected index for '
              + `${chunksInfo.chunksSchema}.${chunksInfo.chunksTableName}.`
              + chunksInfo.contentField
            );
          }
        }

        const columnData: Bm25ColumnData = {
          bm25Index
        };
        if (hasChunkBm25) {
          columnData.chunksInfo = chunksInfo;
          columnData.chunkBm25Index = chunkBm25Index;
        }
        columns.push({ attributeName, adapterData: columnData });
      }
      return columns;
    },

    registerTypes(build: any): void {
      const {
        graphql: { GraphQLString, GraphQLFloat, GraphQLNonNull },
      } = build;

      // Register input type for BM25 search.
      // Wrapped in try/catch because another plugin may have already
      // registered 'Bm25SearchInput'. Graphile throws on duplicate
      // registrations, so we catch and ignore.
      try {
        build.registerInputObjectType(
          'Bm25SearchInput',
          {},
          () => ({
            description:
              'Input for BM25 ranked text search. Provide a search query string and optional score threshold.',
            fields: () => ({
              query: {
                type: new GraphQLNonNull(GraphQLString),
                description: 'The search query text. Uses pg_textsearch BM25 ranking.',
              },
              threshold: {
                type: GraphQLFloat,
                description:
                  'Maximum BM25 score threshold (negative values). Only rows with score <= threshold are returned.',
              },
            }),
          }),
          'UnifiedSearchPlugin (bm25 adapter) registering Bm25SearchInput type'
        );
      } catch {
        // Already registered — safe to ignore
      }
    },

    getFilterTypeName(_build: any): string {
      return 'Bm25SearchInput';
    },

    buildFilterApply(
      sql: any,
      alias: SQL,
      column: SearchableColumn,
      filterValue: any,
      _build: any,
    ): FilterApplyResult | null {
      if (filterValue == null) return null;

      const { query, threshold, includeChunks } = filterValue;
      if (!query || typeof query !== 'string' || query.trim().length === 0) return null;

      const columnData = column.adapterData as Bm25ColumnData;
      const bm25Index = columnData.bm25Index;
      const columnExpr = sql`${alias}.${sql.identifier(column.attributeName)}`;

      const qualifiedIndexName = QuoteUtils.quoteQualifiedIdentifier(
        bm25Index.schemaName,
        bm25Index.indexName
      );
      const bm25queryExpr = sql`${sql.identifier(
        bm25Index.extensionSchema,
        'to_bm25query'
      )}(${sql.value(query)}, ${sql.value(qualifiedIndexName)})`;
      const scoreExpr = sql`(${columnExpr} OPERATOR(${sql.identifier(
        bm25Index.extensionSchema
      )}.<@>) ${bm25queryExpr})`;

      // Check for chunk-aware querying
      const chunksInfo = columnData.chunksInfo;
      if (chunksInfo && chunksInfo.searchIndexes.includes('bm25') && (includeChunks !== false)) {
        const chunkBm25Index = columnData.chunkBm25Index;
        if (!chunkBm25Index) {
          throw new Error('BM25 chunk search is missing its bound introspected index');
        }
        const chunksTableRef = chunksInfo.chunksSchema
          ? sql`${sql.identifier(chunksInfo.chunksSchema)}.${sql.identifier(chunksInfo.chunksTableName)}`
          : sql`${sql.identifier(chunksInfo.chunksTableName)}`;
        const parentFk = sql.identifier(chunksInfo.parentFkField);
        const chunkContentField = sql.identifier(chunksInfo.contentField);
        const parentId = sql`${alias}.${sql.identifier(chunksInfo.parentPkField)}`;
        const chunksAlias = sql.identifier('__bm25_chunks');

        const chunksIndexName = QuoteUtils.quoteQualifiedIdentifier(
          chunkBm25Index.schemaName,
          chunkBm25Index.indexName
        );
        const chunkBm25queryExpr = sql`${sql.identifier(
          chunkBm25Index.extensionSchema,
          'to_bm25query'
        )}(${sql.value(query)}, ${sql.value(chunksIndexName)})`;
        const chunkScoreExpr = sql`(${chunksAlias}.${chunkContentField} OPERATOR(${sql.identifier(
          chunkBm25Index.extensionSchema
        )}.<@>) ${chunkBm25queryExpr})`;

        // Subquery: MIN(bm25_score) across chunks (lower = better for BM25)
        const chunkScoreSubquery = sql`(
          SELECT MIN(${chunkScoreExpr})
          FROM ${chunksTableRef} AS ${chunksAlias}
          WHERE ${chunksAlias}.${parentFk} = ${parentId}
        )`;

        // Combined: LEAST of parent score and best chunk score (lower = better)
        const combinedScoreExpr = sql`LEAST(
          COALESCE(${scoreExpr}, 0::real),
          COALESCE(${chunkScoreSubquery}, 0::real)
        )`;

        let whereClause: SQL | null = null;
        if (threshold !== undefined && threshold !== null) {
          whereClause = sql`${combinedScoreExpr} < ${sql.value(threshold)}`;
        }

        return {
          whereClause,
          scoreExpression: combinedScoreExpr,
        };
      }

      // Standard (non-chunk) query
      let whereClause: SQL | null = null;
      if (threshold !== undefined && threshold !== null) {
        whereClause = sql`${scoreExpr} < ${sql.value(threshold)}`;
      }

      return {
        whereClause,
        scoreExpression: scoreExpr,
      };
    },
  };
}
