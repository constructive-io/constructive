/**
 * PostGraphile v5 i18n Preset
 *
 * Convenience preset that bundles the i18n plugin with configurable options.
 *
 * @example
 * ```typescript
 * import { I18nPreset } from 'graphile-i18n';
 *
 * const preset = {
 *   extends: [
 *     I18nPreset(),
 *   ],
 * };
 * ```
 *
 * @example
 * ```typescript
 * import { I18nPreset } from 'graphile-i18n';
 *
 * const preset = {
 *   extends: [
 *     I18nPreset({
 *       defaultLanguages: ['en', 'es'],
 *       langCodeColumn: 'lang_code',
 *     }),
 *   ],
 * };
 * ```
 */

import type { GraphileConfig } from 'graphile-config';

import { createI18nPlugin } from './plugin';
import type { I18nPluginOptions } from './types';

export function I18nPreset(
  options: I18nPluginOptions = {},
): GraphileConfig.Preset {
  return {
    plugins: [createI18nPlugin(options)],
  } as GraphileConfig.Preset;
}

export default I18nPreset;
