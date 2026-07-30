/**
 * PostGraphile v5 History Preset
 *
 * Convenience preset that bundles the history plugin with configurable options.
 *
 * @example
 * ```typescript
 * import { HistoryPreset } from 'graphile-history';
 *
 * const preset = {
 *   extends: [
 *     HistoryPreset(),
 *   ],
 * };
 * ```
 */

import type { GraphileConfig } from 'graphile-config';

import { createHistoryPlugin } from './plugin';
import type { HistoryPluginOptions } from './types';

export function HistoryPreset(
  options: HistoryPluginOptions = {}
): GraphileConfig.Preset {
  return {
    plugins: [createHistoryPlugin(options)]
  } as GraphileConfig.Preset;
}

export default HistoryPreset;
