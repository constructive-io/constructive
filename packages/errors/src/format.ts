import { interpolate } from './interpolate';
import { getDefinition } from './registry';
import type { ErrorContext } from './types';

/** A locale catalog maps `code` → message template (with `{{var}}`). */
export type MessageCatalog = Record<string, string>;

/**
 * Locale to use when `format` is called without one. This is a plain fallback
 * label, not a special catalog: the untagged default copy lives in the registry
 * itself, so there is no built-in `'en'` catalog to keep in sync.
 */
export const DEFAULT_LOCALE = 'en';

/**
 * Registered locale overlays. Empty by default — the base/default message for
 * every code is the registry entry, so a locale only needs entries for the
 * codes it actually translates.
 */
const catalogs: Record<string, MessageCatalog> = {};

/**
 * Register or extend a locale catalog. Merges with any existing entries for
 * that locale (new entries win), so hosts can override individual codes — pass
 * the default locale to override the base copy.
 */
export function registerCatalog(locale: string, catalog: MessageCatalog): void {
  catalogs[locale] = { ...catalogs[locale], ...catalog };
}

/** Humanize a code as a last-resort message, e.g. `LIMIT_REACHED` → `Limit reached`. */
function humanize(code: string): string {
  const lower = code.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** The registry's default message for a code (string template or function). */
function defaultMessage(code: string, context: ErrorContext): string {
  const def = getDefinition(code);
  if (def) {
    if (typeof def.message === 'string') return interpolate(def.message, context);
    if (typeof def.message === 'function') {
      return (def.message as (ctx: ErrorContext) => string)(context);
    }
  }
  return humanize(code);
}

/**
 * Render a localized message for a code.
 *
 * Resolution order:
 * 1. requested-locale overlay entry (template) → interpolate
 * 2. registry default message (template → interpolate, or function → call)
 * 3. humanized code
 */
export function format(code: string, context: ErrorContext = {}, locale: string = DEFAULT_LOCALE): string {
  const overlay = catalogs[locale]?.[code];
  if (typeof overlay === 'string') {
    return interpolate(overlay, context);
  }
  return defaultMessage(code, context);
}
