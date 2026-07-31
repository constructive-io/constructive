/**
 * graphile-i18n — PostGraphile v5 i18n Plugin
 *
 * Language-aware fields sourced from @i18n translation tables
 * with Accept-Language negotiation and configurable fallback chains.
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
 *       allowedTypes: ['text', 'citext'],
 *     }),
 *   ],
 * };
 * ```
 */

// Plugin
export { createI18nPlugin, I18nPlugin } from './plugin';

// Preset
export { I18nPreset } from './preset';

// Middleware
export { additionalGraphQLContextFromRequest,makeI18nContext } from './middleware';

// Types
export type { I18nMiddlewareOptions } from './middleware';
export type { I18nPluginOptions, I18nTableInfo, TranslatableField } from './types';
