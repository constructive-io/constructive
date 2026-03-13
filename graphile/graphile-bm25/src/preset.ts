/**
 * PostGraphile v5 pg_textsearch (BM25) Preset
 *
 * Provides a convenient preset for including BM25 search support in PostGraphile.
 */

import type { GraphileConfig } from 'graphile-config';
import type { Bm25SearchPluginOptions } from './types';
import { Bm25CodecPlugin } from './bm25-codec';
import { createBm25SearchPlugin } from './bm25-search';

/**
 * Creates a preset that includes the BM25 search plugin with the given options.
 *
 * @example
 * ```typescript
 * import { Bm25SearchPreset } from 'graphile-bm25';
 *
 * const preset = {
 *   extends: [
 *     Bm25SearchPreset({ conditionPrefix: 'bm25' }),
 *   ],
 * };
 * ```
 */
export function Bm25SearchPreset(
  options: Bm25SearchPluginOptions = {}
): GraphileConfig.Preset {
  return {
    plugins: [Bm25CodecPlugin, createBm25SearchPlugin(options)],
  };
}

export default Bm25SearchPreset;
