/**
 * PostGraphile v5 pg_textsearch (BM25) Plugin
 *
 * Provides BM25 ranked text search capabilities for text columns
 * with pg_textsearch BM25 indexes. Auto-discovers indexes — zero config.
 *
 * @example
 * ```typescript
 * import { Bm25SearchPreset } from 'graphile-bm25';
 *
 * // Option 1: Use the preset (recommended)
 * const preset = {
 *   extends: [
 *     Bm25SearchPreset(),
 *   ],
 * };
 *
 * // Option 2: Use the plugins directly
 * import { Bm25CodecPlugin, createBm25SearchPlugin } from 'graphile-bm25';
 * const preset = {
 *   plugins: [Bm25CodecPlugin, createBm25SearchPlugin()],
 * };
 * ```
 */

export { Bm25CodecPlugin, Bm25CodecPreset, bm25IndexStore, bm25ExtensionDetected } from './bm25-codec';
export { Bm25SearchPlugin, createBm25SearchPlugin } from './bm25-search';
export { Bm25SearchPreset } from './preset';
export type { Bm25SearchPluginOptions, Bm25IndexInfo } from './types';
