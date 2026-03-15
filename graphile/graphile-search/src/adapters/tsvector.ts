/**
 * tsvector Search Adapter
 *
 * Detects tsvector columns and generates ts_rank-based scoring.
 * Wraps the same SQL logic as graphile-tsvector but as a SearchAdapter.
 */

import type { SearchAdapter, SearchableColumn, FilterApplyResult } from '../types';
import type { SQL } from 'pg-sql2';

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
          columns.push({ attributeName });
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
      const val = typeof filterValue === 'string' ? filterValue : String(filterValue);
      if (val.trim().length === 0) return null;

      const tsquery = sql`websearch_to_tsquery(${sql.literal(tsConfig)}, ${sql.value(val)})`;
      const columnExpr = sql`${alias}.${sql.identifier(column.attributeName)}`;

      return {
        whereClause: sql`${columnExpr} @@ ${tsquery}`,
        scoreExpression: sql`ts_rank(${columnExpr}, ${tsquery})`,
      };
    },
  };
}
