/**
 * pg_textsearch Plugin Types
 *
 * Type definitions for the PostGraphile v5 pg_textsearch (BM25) plugin configuration.
 */

/**
 * Represents a discovered BM25 index in the database.
 */
export interface Bm25IndexInfo {
  /** Schema name (e.g. 'public') */
  schemaName: string;
  /** Table name (e.g. 'documents') */
  tableName: string;
  /** Column name (e.g. 'content') */
  columnName: string;
  /** Index name (e.g. 'docs_idx') — needed for to_bm25query() */
  indexName: string;
}

/**
 * Plugin configuration options.
 */
export interface Bm25SearchPluginOptions {
  /**
   * Prefix for BM25 filter fields.
   * For example, with prefix 'bm25' and a column named 'content',
   * the generated filter field will be 'bm25Content'.
   * @default 'bm25'
   */
  filterPrefix?: string;
}
