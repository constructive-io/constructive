import type { ErrorContext } from './types';

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * Replace `{{key}}` placeholders in a template with values from `context`.
 * Missing keys render as an empty string.
 */
export function interpolate(template: string, context: ErrorContext = {}): string {
  return template.replace(PLACEHOLDER, (_match, key: string) => {
    const value = context[key];
    return value === undefined || value === null ? '' : String(value);
  });
}
