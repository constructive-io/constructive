/**
 * PostGraphile v5 pg_trgm (Trigram Fuzzy Matching) Preset
 *
 * Provides a convenient preset for including trigram fuzzy search in PostGraphile.
 */

import type { GraphileConfig } from 'graphile-config';
import type { TrgmSearchPluginOptions } from './types';
import { createTrgmSearchPlugin } from './trgm-search';

/**
 * Creates a preset that includes the pg_trgm search plugin with the given options.
 *
 * @example
 * ```typescript
 * import { TrgmSearchPreset } from 'graphile-pg-trgm-plugin';
 *
 * const preset = {
 *   extends: [
 *     TrgmSearchPreset(),
 *   ],
 * };
 * ```
 */
export function TrgmSearchPreset(
  options: TrgmSearchPluginOptions = {}
): GraphileConfig.Preset {
  return {
    plugins: [createTrgmSearchPlugin(options)],
  };
}

export default TrgmSearchPreset;
