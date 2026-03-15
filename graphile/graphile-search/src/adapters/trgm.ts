/**
 * pg_trgm Search Adapter
 *
 * Detects text/varchar columns and generates trigram similarity scoring.
 * Wraps the same SQL logic as graphile-trgm but as a SearchAdapter.
 */

import type { SearchAdapter, SearchableColumn, FilterApplyResult } from '../types';
import type { SQL } from 'pg-sql2';

function isTextCodec(codec: any): boolean {
  const name = codec?.name;
  return name === 'text' || name === 'varchar' || name === 'bpchar';
}

export interface TrgmAdapterOptions {
  /**
   * Filter prefix for trgm filter fields.
   * @default 'trgm'
   */
  filterPrefix?: string;

  /**
   * Default similarity threshold (0..1). Higher = stricter matching.
   * @default 0.3
   */
  defaultThreshold?: number;

  /**
   * When true, trgm only activates on tables that have an "intentional"
   * search column detected by another adapter (e.g. a tsvector column or
   * a BM25 index). This prevents trgm similarity fields from being added
   * to every table with text columns.
   *
   * The plugin's `getAdapterColumns` orchestrates this by running
   * non-supplementary adapters first, then only running supplementary
   * adapters on codecs that already have search columns.
   *
   * @default true
   */
  requireIntentionalSearch?: boolean;
}

export function createTrgmAdapter(
  options: TrgmAdapterOptions = {}
): SearchAdapter {
  const {
    filterPrefix = 'trgm',
    defaultThreshold = 0.3,
    requireIntentionalSearch = true,
  } = options;

  return {
    name: 'trgm',

    /**
     * When true, this adapter is "supplementary" — it only activates on
     * tables that already have columns detected by a non-supplementary adapter.
     */
    isSupplementary: requireIntentionalSearch,

    scoreSemantics: {
      metric: 'similarity',
      lowerIsBetter: false,
      range: [0, 1],
    },

    filterPrefix,

    supportsTextSearch: true,

    buildTextSearchInput(text: string): { value: string } {
      // trgm filter takes { value: string } — threshold uses adapter default
      return { value: text };
    },

    detectColumns(codec: any, _build: any): SearchableColumn[] {
      if (!codec?.attributes) return [];

      const columns: SearchableColumn[] = [];
      for (const [attributeName, attribute] of Object.entries(
        codec.attributes as Record<string, any>
      )) {
        if (isTextCodec(attribute.codec)) {
          columns.push({ attributeName });
        }
      }
      return columns;
    },

    registerTypes(build: any): void {
      const {
        graphql: { GraphQLString, GraphQLFloat, GraphQLNonNull },
      } = build;

      // Register input type for trgm search.
      // Wrapped in try/catch because the standalone graphile-trgm plugin may
      // have already registered 'TrgmSearchInput' in its own init hook.
      // Graphile throws on duplicate registrations, so we catch and ignore.
      try {
        build.registerInputObjectType(
          'TrgmSearchInput',
          {},
          () => ({
            description:
              'Input for pg_trgm fuzzy text matching. Provide a search value and optional similarity threshold.',
            fields: () => ({
              value: {
                type: new GraphQLNonNull(GraphQLString),
                description: 'The text to fuzzy-match against. Typos and misspellings are tolerated.',
              },
              threshold: {
                type: GraphQLFloat,
                description:
                  `Minimum similarity threshold (0.0 to 1.0). Higher = stricter matching. Default is ${defaultThreshold}.`,
              },
            }),
          }),
          'UnifiedSearchPlugin (trgm adapter) registering TrgmSearchInput type'
        );
      } catch {
        // Already registered by standalone graphile-trgm plugin — safe to ignore
      }
    },

    getFilterTypeName(_build: any): string {
      return 'TrgmSearchInput';
    },

    buildFilterApply(
      sql: any,
      alias: SQL,
      column: SearchableColumn,
      filterValue: any,
      _build: any,
    ): FilterApplyResult | null {
      if (filterValue == null) return null;

      const { value, threshold } = filterValue;
      if (!value || typeof value !== 'string' || value.trim().length === 0) return null;

      const th = threshold != null ? threshold : defaultThreshold;
      const columnExpr = sql`${alias}.${sql.identifier(column.attributeName)}`;
      const similarityExpr = sql`similarity(${columnExpr}, ${sql.value(value)})`;

      return {
        whereClause: sql`${similarityExpr} > ${sql.value(th)}`,
        scoreExpression: similarityExpr,
      };
    },
  };
}
