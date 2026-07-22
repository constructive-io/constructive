import { interpolate } from './interpolate';
import { getDefinition, registry } from './registry';
import type { ErrorContext } from './types';

/** A locale catalog maps `code` → message template (with `{{var}}`). */
export type MessageCatalog = Record<string, string>;

export const DEFAULT_LOCALE = 'en';

/**
 * Built-in `en` catalog derived from the registry's string messages. Entries
 * whose message is a function are omitted (they are computed, not templated)
 * and fall back to the registry function at format time.
 */
const defaultEnCatalog: MessageCatalog = Object.fromEntries(
  Object.values(registry)
    .filter((def) => typeof def.message === 'string')
    .map((def) => [def.code, def.message as string])
);

const catalogs: Record<string, MessageCatalog> = {
  [DEFAULT_LOCALE]: { ...defaultEnCatalog }
};

/**
 * Register or extend a locale catalog. Merges with any existing entries for
 * that locale (new entries win), so hosts can override individual codes.
 */
export function registerCatalog(locale: string, catalog: MessageCatalog): void {
  catalogs[locale] = { ...catalogs[locale], ...catalog };
}

/** Humanize a code as a last-resort message, e.g. `LIMIT_REACHED` → `Limit reached`. */
function humanize(code: string): string {
  const lower = code.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Render a localized message for a code.
 *
 * Resolution order:
 * 1. requested-locale catalog entry (template) → interpolate
 * 2. default-locale catalog entry (template) → interpolate
 * 3. registry function message → call with context
 * 4. humanized code
 */
export function format(code: string, context: ErrorContext = {}, locale: string = DEFAULT_LOCALE): string {
  const template = catalogs[locale]?.[code] ?? catalogs[DEFAULT_LOCALE]?.[code];
  if (typeof template === 'string') {
    return interpolate(template, context);
  }

  const def = getDefinition(code);
  if (def && typeof def.message === 'function') {
    return (def.message as (ctx: ErrorContext) => string)(context);
  }

  return humanize(code);
}
