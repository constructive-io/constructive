/**
 * PostGraphile v5 Search Plugin
 *
 * Provides full-text search capabilities for tsvector columns.
 *
 * @example
 * ```typescript
 * import { PgSearchPlugin, PgSearchPreset } from 'graphile-search-plugin';
 *
 * // Option 1: Use the preset (recommended)
 * const preset = {
 *   extends: [
 *     PgSearchPreset({
 *       pgSearchPrefix: 'fullText',
 *     }),
 *   ],
 * };
 *
 * // Option 2: Use the plugin directly
 * const plugin = PgSearchPlugin({ pgSearchPrefix: 'fullText' });
 * ```
 */

export { PgSearchPlugin, createPgSearchPlugin } from './plugin';
export { PgSearchPreset } from './preset';
export type { PgSearchPluginOptions } from './types';
