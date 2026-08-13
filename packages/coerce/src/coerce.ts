/**
 * Coercion of untrusted `unknown` values — JSON request bodies, database rows,
 * Kubernetes specs, env strings — into narrow TypeScript types.
 *
 * Two families, one rule each:
 *
 *   - `as*` is lenient: it answers "is this value already a usable T?" and
 *     returns `null` when it is not. It never guesses across types (`'5'` is
 *     not an integer, `1` is not a string) and never treats a blank string as
 *     present, so a caller cannot mistake `''` for a supplied identifier.
 *   - `require*` is strict: same test, but a miss throws {@link CoerceError}.
 *
 * Deliberately transport-agnostic: `CoerceError` carries the offending
 * `label`, not an HTTP status. A server maps it to 400 at its own boundary,
 * which keeps this package usable off the request path.
 */

/** A value that was required but absent or of the wrong shape. */
export class CoerceError extends Error {
  /** What the caller was asking for, e.g. `'message_id'`. */
  readonly label: string;

  constructor(label: string, expected: string) {
    super(`${label} is required (expected ${expected})`);
    this.name = 'CoerceError';
    this.label = label;
  }
}

/** A non-empty, non-whitespace string, else `null`. */
export const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

/** A finite number, else `null`. Strings are not parsed. */
export const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** A safe integer, else `null`. `1.5` and `'1'` are both `null`. */
export const asInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) ? value : null;

/**
 * A boolean. Booleans pass through; the string spellings people actually type
 * (`true/false`, `1/0`, `yes/no`, `on/off`, `t/f`, `y/n`) are recognised
 * case-insensitively, because env vars and query strings only carry strings.
 * Anything else is `null` — notably `''`, so "unset" stays distinguishable
 * from "false".
 */
export const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  const str = asString(value)?.trim().toLowerCase();
  if (str === undefined) return null;
  if (TRUTHY.has(str)) return true;
  if (FALSY.has(str)) return false;
  return null;
};

const TRUTHY = new Set(['1', 'on', 't', 'true', 'y', 'yes']);
const FALSY = new Set(['0', 'f', 'false', 'n', 'no', 'off']);

/**
 * An array whose every entry is a non-empty string, else `null`.
 *
 * All-or-nothing on purpose: silently dropping the malformed entries of a
 * list of role names or allowed origins is how a security list quietly
 * shrinks.
 */
export const asStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const strings: string[] = [];
  for (const entry of value) {
    const str = asString(entry);
    if (str === null) return null;
    strings.push(str);
  }
  return strings;
};

/**
 * A list of non-empty strings from either an array (see
 * {@link asStringArray}) or a delimited string, else `null`.
 *
 * Entries are trimmed and blanks dropped, because the delimited form is what a
 * `PATH`-style env var, a query parameter or a header carries, and
 * `'a, b,'` means two entries in all three.
 */
export const asStringList = (value: unknown, separator = ','): string[] | null => {
  const str = asString(value);
  if (str !== null) return str.split(separator).map(entry => entry.trim()).filter(Boolean);
  return asStringArray(value);
};

/**
 * A plain object, else `null`. Arrays and `null` are not records — both are
 * `typeof 'object'`, and that check is the classic source of a `.length`
 * lookup on something that was supposed to be a map.
 */
export const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** A valid `Date`, else `null`. An invalid date parse is not a `Date`. */
export const asDate = (value: unknown): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const str = asString(value);
  if (str === null) return null;
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * A timestamp as an ISO-8601 string, else `null`.
 *
 * A `Date` is serialised; a string is passed through **verbatim** rather than
 * round-tripped through `Date`, so a caller's own cursor value survives
 * byte-for-byte — the format a database returned is the format it compares
 * against.
 */
export const asIsoString = (value: unknown): string | null =>
  value instanceof Date ? asDate(value)?.toISOString() ?? null : asString(value);

const require_ =
  <T>(as: (value: unknown) => T | null, expected: string) =>
    (value: unknown, label: string): T => {
      const coerced = as(value);
      if (coerced === null) throw new CoerceError(label, expected);
      return coerced;
    };

/** {@link asString}, throwing {@link CoerceError} when absent. */
export const requireString = require_(asString, 'a non-empty string');
/** {@link asNumber}, throwing {@link CoerceError} when absent. */
export const requireNumber = require_(asNumber, 'a finite number');
/** {@link asInteger}, throwing {@link CoerceError} when absent. */
export const requireInteger = require_(asInteger, 'an integer');
/** {@link asBoolean}, throwing {@link CoerceError} when absent. */
export const requireBoolean = require_(asBoolean, 'a boolean');
/** {@link asStringArray}, throwing {@link CoerceError} when absent. */
export const requireStringArray = require_(asStringArray, 'an array of non-empty strings');
/** {@link asStringList}, throwing {@link CoerceError} when absent. */
export const requireStringList = require_(asStringList, 'a list of non-empty strings');
/** {@link asRecord}, throwing {@link CoerceError} when absent. */
export const requireRecord = require_(asRecord, 'an object');
/** {@link asDate}, throwing {@link CoerceError} when absent. */
export const requireDate = require_(asDate, 'a date');
/** {@link asIsoString}, throwing {@link CoerceError} when absent. */
export const requireIsoString = require_(asIsoString, 'a timestamp');

/**
 * Narrow a value to one of `allowed`, else `null`.
 *
 * The literal tuple is preserved, so `asOneOf(body.role, ['user', 'admin'])`
 * is typed `'user' | 'admin' | null` without a cast at the call site.
 */
export const asOneOf = <const T extends readonly string[]>(
  value: unknown,
  allowed: T
): T[number] | null => {
  const str = asString(value);
  return str !== null && (allowed as readonly string[]).includes(str) ? (str as T[number]) : null;
};

/** {@link asOneOf}, throwing {@link CoerceError} when the value is not allowed. */
export const requireOneOf = <const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string
): T[number] => {
  const coerced = asOneOf(value, allowed);
  if (coerced === null) throw new CoerceError(label, `one of ${allowed.join(', ')}`);
  return coerced;
};
