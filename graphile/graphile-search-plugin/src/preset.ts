/**
 * PostGraphile v5 Search Preset
 *
 * Provides a convenient preset for including search support in PostGraphile.
 */

import type { GraphileConfig } from 'graphile-config';
import type { PgSearchPluginOptions } from './types';
import { createPgSearchPlugin } from './plugin';

/**
 * Creates a preset that includes the search plugin with the given options.
 *
 * @example
 * ```typescript
 * import { PgSearchPreset } from 'graphile-search-plugin';
 *
 * const preset = {
 *   extends: [
 *     PgSearchPreset({
 *       pgSearchPrefix: 'fullText',
 *     }),
 *   ],
 * };
 * ```
 */
export function PgSearchPreset(
  options: PgSearchPluginOptions = {}
): GraphileConfig.Preset {
  return {
    plugins: [createPgSearchPlugin(options)],
  };
}

export default PgSearchPreset;
