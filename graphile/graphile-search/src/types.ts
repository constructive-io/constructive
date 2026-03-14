/**
 * Unified Search Plugin Types
 *
 * Defines the SearchAdapter interface that each algorithm must implement,
 * plus shared configuration types.
 */

import type { SQL } from 'pg-sql2';

// ─── SearchAdapter Interface ──────────────────────────────────────────────────

/**
 * Describes a searchable column discovered by an adapter on a specific table.
 */
export interface SearchableColumn {
  /** The raw PostgreSQL column name (e.g. 'body', 'tsv', 'embedding') */
  attributeName: string;
  /** Optional extra data the adapter needs during SQL generation (e.g. BM25 index info) */
  adapterData?: unknown;
}

/**
 * Score semantics — tells the core plugin how to interpret this adapter's scores.
 */
export interface ScoreSemantics {
  /**
   * The metric name used in field naming (e.g. 'rank', 'score', 'similarity', 'distance').
   * Used in inflection: `{column}{Algorithm}{Metric}` → e.g. `bodyBm25Score`
   */
  metric: string;

  /**
   * If true, lower values are better (BM25: more negative = more relevant,
   * pgvector: closer = more similar). If false, higher is better (tsvector rank,
   * trgm similarity).
   */
  lowerIsBetter: boolean;

  /**
   * Known range bounds, or null if unbounded.
   * Used for normalization in the composite searchScore.
   * - trgm: [0, 1]
   * - tsvector: [0, 1] (approximately)
   * - BM25: null (unbounded negative)
   * - pgvector: null (0 to infinity)
   */
  range: [number, number] | null;
}

/**
 * Result of an adapter's `buildFilterApply` — the SQL fragments needed
 * by the core plugin to wire up filtering, scoring, and ordering.
 */
export interface FilterApplyResult {
  /** SQL WHERE clause fragment, or null if no WHERE needed (e.g. BM25 without threshold) */
  whereClause: SQL | null;
  /** SQL expression that computes the score/distance/rank for this row */
  scoreExpression: SQL;
}

/**
 * The core interface that each search algorithm adapter must implement.
 *
 * An adapter is a plain object — not a Graphile plugin. The core unified
 * plugin iterates over all registered adapters and wires them into the
 * Graphile hook system.
 */
export interface SearchAdapter {
  /**
   * Unique identifier for this algorithm (e.g. 'tsv', 'bm25', 'trgm', 'vector').
   * Used as the algorithm segment in field names: `{column}{Algorithm}{Metric}`.
   */
  name: string;

  /** Score semantics for this algorithm. */
  scoreSemantics: ScoreSemantics;

  /**
   * The filter prefix used for filter field names on the connection filter input.
   * The field name is: `{filterPrefix}{ColumnName}` (camelCase).
   * E.g. 'bm25' → `bm25Body`, 'trgm' → `trgmName`, 'vector' → `vectorEmbedding`.
   */
  filterPrefix: string;

  /**
   * Whether this adapter supports plain text search queries.
   * If true, the adapter's columns will be included in the automatic
   * `fullTextSearch` composite filter that fans out the same text query
   * to all text-compatible adapters simultaneously.
   *
   * Adapters that require non-text input (e.g. pgvector needs a vector array)
   * should set this to false.
   *
   * @default false
   */
  supportsTextSearch?: boolean;

  /**
   * Build the filter value for a text search query dispatched by fullTextSearch.
   * Only called when supportsTextSearch is true.
   * Converts a plain text string into the adapter-specific filter input format.
   *
   * @param text - The user's search text
   * @returns The filter value to pass to buildFilterApply (e.g. string, { query: string }, { value: string })
   */
  buildTextSearchInput?(text: string): unknown;

  /**
   * Discover which columns on a given codec are searchable by this adapter.
   *
   * Called once per table codec during schema build. Should inspect column
   * types, indexes, or other metadata to determine eligibility.
   *
   * @param codec - The PgCodecWithAttributes for the table
   * @param build - The Graphile build object (for accessing pgRegistry, etc.)
   * @returns Array of searchable columns, or empty array if none found
   */
  detectColumns(codec: any, build: any): SearchableColumn[];

  /**
   * Register any custom GraphQL input types needed by this adapter's filter fields.
   *
   * Called once during the `init` hook. Adapters should call
   * `build.registerInputObjectType(...)` or `build.registerEnumType(...)` here.
   *
   * @param build - The Graphile build object
   */
  registerTypes(build: any): void;

  /**
   * Return the name of the GraphQL input type for filter fields.
   * For simple types like tsvector (which uses a plain String), return 'String'.
   * For complex types, return the name registered in `registerTypes`.
   *
   * @param build - The Graphile build object
   * @returns The GraphQL type name string
   */
  getFilterTypeName(build: any): string;

  /**
   * Build the SQL fragments for filtering and scoring.
   *
   * Called at filter apply time (execution phase) with the user's filter input value.
   * Must return the WHERE clause and score expression, but should NOT call
   * $condition.where() or qb.selectAndReturnIndex() — the core plugin handles that.
   *
   * @param sql - The pg-sql2 module
   * @param alias - SQL alias for the table (e.g. `$condition.alias`)
   * @param column - The searchable column info
   * @param filterValue - The user's filter input value
   * @param build - The Graphile build object
   * @returns The WHERE clause and score expression SQL fragments
   */
  buildFilterApply(
    sql: any,
    alias: SQL,
    column: SearchableColumn,
    filterValue: any,
    build: any,
  ): FilterApplyResult | null;
}

// ─── Plugin Configuration ─────────────────────────────────────────────────────

/**
 * Configuration options for the unified search plugin.
 */
export interface UnifiedSearchOptions {
  /**
   * The search adapters to register. Each adapter implements the SearchAdapter
   * interface for a specific algorithm (tsvector, BM25, pg_trgm, pgvector).
   */
  adapters: SearchAdapter[];

  /**
   * Whether to expose the composite `searchScore` field (normalized 0..1)
   * that combines all active search signals into a single relevance score.
   * @default true
   */
  enableSearchScore?: boolean;

  /**
   * Whether to expose the `fullTextSearch` composite filter field.
   * When enabled, every table with at least one text-compatible adapter gets a
   * `fullTextSearch: String` field on its filter type. Providing a value fans
   * out the same text query to all adapters where `supportsTextSearch: true`,
   * combining their WHERE clauses with OR (match any algorithm).
   * @default true
   */
  enableFullTextSearch?: boolean;

  /**
   * Custom weights for the composite searchScore. Keys are adapter names,
   * values are relative weights (will be normalized to sum to 1.0).
   * If not provided, all active adapters contribute equally.
   *
   * @example { bm25: 0.5, trgm: 0.3, tsv: 0.2 }
   */
  searchScoreWeights?: Record<string, number>;
}
