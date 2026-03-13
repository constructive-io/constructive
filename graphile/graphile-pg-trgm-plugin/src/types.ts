/**
 * pg_trgm Plugin Types
 *
 * Type definitions for the PostGraphile v5 pg_trgm (trigram fuzzy matching) plugin.
 */

/**
 * Plugin configuration options.
 */
export interface TrgmSearchPluginOptions {
  /**
   * When true, only expose similarTo/wordSimilarTo operators on text columns
   * that have a GIN trigram index (gin_trgm_ops). When false, expose on ALL
   * text/varchar columns.
   * @default false
   */
  connectionFilterTrgmRequireIndex?: boolean;
}
