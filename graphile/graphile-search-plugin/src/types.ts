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
}
