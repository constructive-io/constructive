/**
 * tsvector Search Adapter
 *
 * Detects tsvector columns and generates ts_rank-based scoring.
 * Wraps the same SQL logic as graphile-tsvector but as a SearchAdapter.
 *
 * Supports chunk-aware querying via @hasChunks smart tag: when the parent
 * table has chunks with a tsvector search field, the adapter includes a
 * lateral subquery to find the best-matching chunk and returns
 * GREATEST(parent_rank, chunk_rank).
 */

import type { SearchAdapter, SearchableColumn, FilterApplyResult } from '../types';
import type { SQL } from 'pg-sql2';
import { getChunksInfo, type ChunksInfo } from './chunks';

function isTsvectorCodec(codec: any): boolean {
  // In graphile-build-pg >= 5.0.0-rc.8, the built-in TYPES.tsvector codec
  // has name === 'tsvector' but does NOT have extensions.pg. We need to
  // match both the built-in codec and our custom codec (for older versions).
  return (
    codec?.name === 'tsvector' ||
    (codec?.extensions?.pg?.schemaName === 'pg_catalog' &&
      codec?.extensions?.pg?.name === 'tsvector')
  );
}

export interface TsvectorAdapterOptions {
  /**
   * Filter prefix for tsvector filter fields.
   * @default 'fullText'
   */
  filterPrefix?: string;

  /**
   * PostgreSQL text search configuration (e.g. 'english', 'simple').
   * @default 'english'
   */
  tsConfig?: string;
}

export function createTsvectorAdapter(
  options: TsvectorAdapterOptions = {}
): SearchAdapter {
  const { filterPrefix = 'tsv', tsConfig = 'english' } = options;

  return {
    name: 'tsv',

    scoreSemantics: {
      metric: 'rank',
      lowerIsBetter: false,
      range: [0, 1],
    },

    filterPrefix,

    supportsTextSearch: true,

    buildTextSearchInput(text: string): string {
      // tsvector filter takes a plain string
      return text;
    },

    detectColumns(codec: any, _build: any): SearchableColumn[] {
      if (!codec?.attributes) return [];

      const columns: SearchableColumn[] = [];
      for (const [attributeName, attribute] of Object.entries(
        codec.attributes as Record<string, any>
      )) {
        if (isTsvectorCodec(attribute.codec)) {
          // Store chunks info if available and chunks have fulltext search
          const chunksInfo = getChunksInfo(codec);
          const hasChunkFulltext = chunksInfo?.searchField &&
            chunksInfo.searchIndexes.includes('fulltext');
          columns.push({
            attributeName,
            adapterData: hasChunkFulltext ? chunksInfo : undefined,
          });
        }
      }
      return columns;
    },

    registerTypes(_build: any): void {
      // tsvector uses plain GraphQL String — no custom types needed
    },

    getFilterTypeName(_build: any): string {
      return 'String';
    },

    buildFilterApply(
      sql: any,
      alias: SQL,
      column: SearchableColumn,
      filterValue: any,
      _build: any,
    ): FilterApplyResult | null {
      if (filterValue == null) return null;

      // Handle includeChunks option when filter is an object
      let val: string;
      let includeChunks: boolean | undefined;
      if (typeof filterValue === 'object' && filterValue !== null && 'query' in filterValue) {
        val = typeof filterValue.query === 'string' ? filterValue.query : String(filterValue.query);
        includeChunks = filterValue.includeChunks;
      } else {
        val = typeof filterValue === 'string' ? filterValue : String(filterValue);
      }
      if (val.trim().length === 0) return null;

      const tsquery = sql`websearch_to_tsquery(${sql.literal(tsConfig)}, ${sql.value(val)})`;
      const columnExpr = sql`${alias}.${sql.identifier(column.attributeName)}`;

      // Check for chunk-aware querying
      const chunksInfo = column.adapterData as ChunksInfo | undefined;
      if (chunksInfo && chunksInfo.searchField && (includeChunks !== false)) {
        const chunksTableRef = chunksInfo.chunksSchema
          ? sql`${sql.identifier(chunksInfo.chunksSchema)}.${sql.identifier(chunksInfo.chunksTableName)}`
          : sql`${sql.identifier(chunksInfo.chunksTableName)}`;
        const parentFk = sql.identifier(chunksInfo.parentFkField);
        const chunkSearchField = sql.identifier(chunksInfo.searchField);
        const parentId = sql`${alias}.${sql.identifier(chunksInfo.parentPkField)}`;
        const chunksAlias = sql.identifier('__tsv_chunks');

        // Subquery: MAX(ts_rank) across matching chunks
        const chunkRankSubquery = sql`(
          SELECT MAX(ts_rank(${chunksAlias}.${chunkSearchField}, ${tsquery}))
          FROM ${chunksTableRef} AS ${chunksAlias}
          WHERE ${chunksAlias}.${parentFk} = ${parentId}
            AND ${chunksAlias}.${chunkSearchField} @@ ${tsquery}
        )`;

        const parentRankExpr = sql`ts_rank(${columnExpr}, ${tsquery})`;

        // Combined: GREATEST of parent rank and best chunk rank
        const combinedRankExpr = sql`GREATEST(
          COALESCE(CASE WHEN ${columnExpr} @@ ${tsquery} THEN ${parentRankExpr} ELSE 0::real END, 0::real),
          COALESCE(${chunkRankSubquery}, 0::real)
        )`;

        // WHERE: parent matches OR any chunk matches
        const whereClause = sql`(${columnExpr} @@ ${tsquery} OR ${chunkRankSubquery} IS NOT NULL)`;

        return {
          whereClause,
          scoreExpression: combinedRankExpr,
        };
      }

      // Standard (non-chunk) query
      return {
        whereClause: sql`${columnExpr} @@ ${tsquery}`,
        scoreExpression: sql`ts_rank(${columnExpr}, ${tsquery})`,
      };
    },
  };
}
