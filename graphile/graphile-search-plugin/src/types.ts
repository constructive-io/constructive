/**
 * PgSearch Plugin Types
 *
 * Type definitions for the PostGraphile v5 search plugin configuration.
 */

/**
 * Plugin configuration options.
 */
export interface PgSearchPluginOptions {
  /**
   * Prefix for tsvector condition fields.
   * For example, with prefix 'fullText' and a column named 'tsv',
   * the generated condition field will be 'fullTextTsv'.
   * @default 'tsv'
   */
  pgSearchPrefix?: string;

  /**
   * Whether to hide tsvector columns from output types.
   * When true, tsvector columns won't appear as fields on the GraphQL object type.
   * @default false
   */
  hideTsvectorColumns?: boolean;

  /**
   * Name of the custom GraphQL scalar for tsvector columns.
   * This scalar isolates filter operators (like `matches`) to tsvector columns
   * rather than all String fields.
   * @default 'FullText'
   */
  fullTextScalarName?: string;
}
