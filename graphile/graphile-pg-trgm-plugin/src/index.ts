/**
 * PostGraphile v5 pg_trgm (Trigram Fuzzy Matching) Plugin
 *
 * Provides typo-tolerant fuzzy text matching for text columns using
 * PostgreSQL's pg_trgm extension. Auto-discovers text columns — zero config.
 *
 * @example
 * ```typescript
 * import { TrgmSearchPreset } from 'graphile-pg-trgm-plugin';
 *
 * // Option 1: Use the preset (recommended)
 * const preset = {
 *   extends: [
 *     TrgmSearchPreset(),
 *   ],
 * };
 *
 * // Option 2: Use the plugin directly
 * import { createTrgmSearchPlugin } from 'graphile-pg-trgm-plugin';
 * const preset = {
 *   plugins: [createTrgmSearchPlugin()],
 * };
 * ```
 */

export { TrgmSearchPlugin, createTrgmSearchPlugin } from './trgm-search';
export { TrgmSearchPreset, createTrgmOperatorFactories } from './preset';
export type { TrgmSearchPluginOptions } from './types';
