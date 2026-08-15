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
 * A value that arrives as text — an env var, a query parameter, a header — has
 * its own family (`asNumeric`, `asPort`, `asDuration`, `asBigInt`, `asJson`,
 * and the domain coercers) which parses the string spelling, because for those
 * the string IS the wire format. `asNumber`/`asInteger` stay strict so that a
 * JSON body cannot pass `'5'` where a number was declared.
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
 * An array whose every entry coerces through `element`, else `null`. One bad
 * entry rejects the whole array — a partially-valid list is a partially-wrong
 * answer.
 */
export const asArrayOf = <T>(
  value: unknown,
  element: (entry: unknown) => T | null
): T[] | null => {
  if (!Array.isArray(value)) return null;
  const entries: T[] = [];
  for (const item of value) {
    const coerced = element(item);
    if (coerced === null) return null;
    entries.push(coerced);
  }
  return entries;
};

/** {@link asArrayOf}, throwing {@link CoerceError} when absent. */
export const requireArrayOf = <T>(
  value: unknown,
  element: (entry: unknown) => T | null,
  label: string,
  expected = 'an array of valid entries'
): T[] => {
  const entries = asArrayOf(value, element);
  if (entries === null) throw new CoerceError(label, expected);
  return entries;
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

/**
 * A number carried as text, else `null` — the env-var/query-string form of
 * {@link asNumber}. Numbers pass through; a blank string is not a `0`, which is
 * what bare `Number('')` would produce.
 */
export const asNumeric = (value: unknown): number | null => {
  if (typeof value === 'number') return asNumber(value);
  const str = asString(value);
  return str === null ? null : asNumber(Number(str));
};

/** {@link asNumeric} restricted to integers, else `null`. */
export const asNumericInteger = (value: unknown): number | null => asInteger(asNumeric(value));

/** Inclusive bounds for {@link asNumberIn} and {@link asIntegerIn}. */
export interface Bounds {
  min?: number;
  max?: number;
}

/**
 * A finite number within `bounds`, else `null`.
 *
 * Out-of-range is a miss rather than a clamp: a `min: 1` that silently became
 * `1` would turn "invalid" into a plausible value nobody configured.
 */
export const asNumberIn = (value: unknown, { min, max }: Bounds = {}): number | null => {
  const num = asNumber(value);
  if (num === null) return null;
  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;
  return num;
};

/** {@link asNumberIn} restricted to integers, else `null`. */
export const asIntegerIn = (value: unknown, bounds: Bounds = {}): number | null =>
  asInteger(asNumberIn(value, bounds));

/** A TCP/UDP port — an integer in `1..65535`, from a number or its text form. */
export const asPort = (value: unknown): number | null =>
  asIntegerIn(asNumeric(value), { min: 1, max: 65535 });

/**
 * A whole number of arbitrary size, else `null`. Accepts a `bigint`, an integer
 * `number`, or a digit string — the three shapes a 64-bit database id takes on
 * its way through JSON, where it cannot survive as a `number`.
 */
export const asBigInt = (value: unknown): bigint | null => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return Number.isInteger(value) ? BigInt(value) : null;
  const str = asString(value)?.trim();
  return str !== undefined && INTEGER_TEXT.test(str) ? BigInt(str) : null;
};

const INTEGER_TEXT = /^[+-]?\d+$/;

/**
 * A whole number in its canonical text form, else `null` — {@link asBigInt}
 * spelled the way a 64-bit value travels.
 *
 * Text is the wire format for `int8`: node-postgres returns the type as a
 * string, JSON carries it as one, and a `number` would silently lose identity
 * past 2^53. Every accepted shape is normalised through `BigInt`, so `'007'`
 * and `7` both answer `'7'` and two ids compare as themselves.
 */
export const asBigIntString = (value: unknown): string | null =>
  asBigInt(value)?.toString() ?? null;

/**
 * An absolute URL, returned **verbatim**, else `null`. A scheme is required, so
 * `'example.com'` — which is a path, and a classic way to fetch the wrong
 * thing — does not qualify.
 */
export const asUrl = (value: unknown): string | null => {
  const str = asString(value);
  if (str === null) return null;
  try {
    new URL(str);
    return str;
  } catch {
    return null;
  }
};

/**
 * A bare hostname or IP address, else `null`. No scheme, port or path: this is
 * what belongs in a `PGHOST`, and accepting `'localhost:5432'` there is how a
 * port ends up inside a DNS lookup.
 */
export const asHostname = (value: unknown): string | null => {
  const str = asString(value)?.trim();
  if (str === undefined) return null;
  return HOSTNAME.test(str) || IPV6.test(str) ? str : null;
};

const HOSTNAME =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
// Deliberately loose: enough to reject a URL, a port suffix or a path, not a
// substitute for the resolver that will parse it for real.
const IPV6 = /^\[?(?:[0-9a-f]{0,4}:){2,7}[0-9a-f.]{0,4}\]?$/i;

/** An email address, else `null`. Shape only — deliverability is not syntax. */
export const asEmail = (value: unknown): string | null => {
  const str = asString(value)?.trim();
  return str !== undefined && EMAIL.test(str) ? str : null;
};

const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** A UUID in canonical 8-4-4-4-12 hex form, else `null`. Case is preserved. */
export const asUuid = (value: unknown): string | null => {
  const str = asString(value)?.trim();
  return str !== undefined && UUID.test(str) ? str : null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A duration normalised to **milliseconds**, else `null`. Accepts a bare number
 * of ms or a suffixed spelling: `500ms`, `30s`, `5m`, `2h`, `1d`, `1w`.
 *
 * A unit-less string is milliseconds, which is what every timeout in the house
 * is already denominated in.
 */
export const asDuration = (value: unknown): number | null => {
  if (typeof value === 'number') return asNumber(value);
  const str = asString(value)?.trim();
  if (str === undefined) return null;
  const match = DURATION.exec(str);
  if (!match) return null;
  return Number(match[1]) * DURATION_MS[(match[2] ?? 'ms').toLowerCase()];
};

const DURATION = /^([+-]?\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)?$/i;
const DURATION_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000
};

/**
 * A JSON document — an object or an array — else `null`. A string is parsed;
 * an already-parsed object or array passes through, so a value keeps coercing
 * the same way on both sides of a serialisation boundary.
 *
 * A bare scalar is not a document: `'5'` reaching a config var that was meant
 * to carry a map is a mistake worth surfacing.
 */
export const asJson = (value: unknown): Record<string, unknown> | unknown[] | null => {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (record !== null) return record;
  const str = asString(value);
  if (str === null) return null;
  try {
    return asJson(JSON.parse(str) as unknown);
  } catch {
    return null;
  }
};

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
/** {@link asNumeric}, throwing {@link CoerceError} when absent. */
export const requireNumeric = require_(asNumeric, 'a number');
/** {@link asNumericInteger}, throwing {@link CoerceError} when absent. */
export const requireNumericInteger = require_(asNumericInteger, 'an integer');
/** {@link asPort}, throwing {@link CoerceError} when absent. */
export const requirePort = require_(asPort, 'a port in 1..65535');
/** {@link asBigInt}, throwing {@link CoerceError} when absent. */
export const requireBigInt = require_(asBigInt, 'a whole number');
/** {@link asBigIntString}, throwing {@link CoerceError} when absent. */
export const requireBigIntString = require_(asBigIntString, 'a whole number');
/** {@link asUrl}, throwing {@link CoerceError} when absent. */
export const requireUrl = require_(asUrl, 'an absolute URL');
/** {@link asHostname}, throwing {@link CoerceError} when absent. */
export const requireHostname = require_(asHostname, 'a hostname or IP address');
/** {@link asEmail}, throwing {@link CoerceError} when absent. */
export const requireEmail = require_(asEmail, 'an email address');
/** {@link asUuid}, throwing {@link CoerceError} when absent. */
export const requireUuid = require_(asUuid, 'a UUID');
/** {@link asDuration}, throwing {@link CoerceError} when absent. */
export const requireDuration = require_(asDuration, 'a duration');
/** {@link asJson}, throwing {@link CoerceError} when absent. */
export const requireJson = require_(asJson, 'a JSON object or array');

/** {@link asNumberIn}, throwing {@link CoerceError} when out of range. */
export const requireNumberIn = (value: unknown, bounds: Bounds, label: string): number => {
  const num = asNumberIn(value, bounds);
  if (num === null) throw new CoerceError(label, describeBounds('a number', bounds));
  return num;
};

/** {@link asIntegerIn}, throwing {@link CoerceError} when out of range. */
export const requireIntegerIn = (value: unknown, bounds: Bounds, label: string): number => {
  const num = asIntegerIn(value, bounds);
  if (num === null) throw new CoerceError(label, describeBounds('an integer', bounds));
  return num;
};

const describeBounds = (what: string, { min, max }: Bounds): string =>
  min !== undefined && max !== undefined
    ? `${what} in ${min}..${max}`
    : min !== undefined
      ? `${what} >= ${min}`
      : max !== undefined
        ? `${what} <= ${max}`
        : what;

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
