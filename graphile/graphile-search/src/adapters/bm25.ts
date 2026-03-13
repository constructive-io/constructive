/**
 * BM25 Search Adapter
 *
 * Detects text columns with BM25 indexes (via pg_textsearch) and generates
 * BM25 relevance scoring. Wraps the same SQL logic as graphile-bm25.
 *
 * Requires the Bm25CodecPlugin to be loaded first (for index discovery).
 * The adapter reads from the bm25IndexStore populated during the gather phase.
 */

import type { SearchAdapter, SearchableColumn, FilterApplyResult } from '../types';
import type { SQL } from 'pg-sql2';

/**
 * BM25 index info discovered during gather phase.
 */
export interface Bm25IndexInfo {
  schemaName: string;
  tableName: string;
  columnName: string;
  indexName: string;
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

  /**
   * External BM25 index store. If not provided, the adapter will attempt
   * to read from the build object's `pgBm25IndexStore`.
   */
  bm25IndexStore?: Map<string, Bm25IndexInfo>;
}

export function createBm25Adapter(
  options: Bm25AdapterOptions = {}
): SearchAdapter {
  const { filterPrefix = 'bm25', bm25IndexStore } = options;

  function getIndexStore(build: any): Map<string, Bm25IndexInfo> | undefined {
    if (bm25IndexStore) return bm25IndexStore;
    return build.pgBm25IndexStore as Map<string, Bm25IndexInfo> | undefined;
  }

  function getBm25IndexForAttribute(
    codec: any,
    attributeName: string,
    build: any,
  ): Bm25IndexInfo | undefined {
    const store = getIndexStore(build);
    if (!store) return undefined;

    const pg = codec?.extensions?.pg;
    if (!pg) return undefined;

    const key = `${pg.schemaName}.${pg.name}.${attributeName}`;
    return store.get(key);
  }

  return {
    name: 'bm25',

    scoreSemantics: {
      metric: 'score',
      lowerIsBetter: true,
      range: null, // unbounded negative
    },

    filterPrefix,

    detectColumns(codec: any, build: any): SearchableColumn[] {
      if (!codec?.attributes) return [];

      const columns: SearchableColumn[] = [];
      for (const [attributeName, attribute] of Object.entries(
        codec.attributes as Record<string, any>
      )) {
        if (!isTextCodec(attribute.codec)) continue;
        const bm25Index = getBm25IndexForAttribute(codec, attributeName, build);
        if (!bm25Index) continue;
        columns.push({ attributeName, adapterData: bm25Index });
      }
      return columns;
    },

    registerTypes(build: any): void {
      const {
        graphql: { GraphQLString, GraphQLFloat, GraphQLNonNull },
      } = build;

      // Register input type for BM25 search.
      // Wrapped in try/catch because the standalone graphile-bm25 plugin may
      // have already registered 'Bm25SearchInput' in its own init hook.
      // Graphile throws on duplicate registrations, so we catch and ignore.
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
        // Already registered by standalone graphile-bm25 plugin — safe to ignore
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

      const { query, threshold } = filterValue;
      if (!query || typeof query !== 'string' || query.trim().length === 0) return null;

      const bm25Index = column.adapterData as Bm25IndexInfo;
      const columnExpr = sql`${alias}.${sql.identifier(column.attributeName)}`;

      // Use quoteQualifiedIdentifier to produce the qualified index name
      const qualifiedIndexName = `"${bm25Index.schemaName}"."${bm25Index.indexName}"`;
      const bm25queryExpr = sql`to_bm25query(${sql.value(query)}, ${sql.value(qualifiedIndexName)})`;
      const scoreExpr = sql`(${columnExpr} <@> ${bm25queryExpr})`;

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
