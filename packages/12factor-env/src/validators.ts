// ── House validators ─────────────────────────────────────────────────────────
//
// envalid ships str/num/port/bool/url/host/json/email. The validators here fill
// the gaps consumers were provably hand-rolling *after* the schema — a csv var
// could not be declared at all, and nothing expressed a numeric range — so the
// split/trim/bounds check happened outside `env()`, with its own throw and its
// own error message instead of joining the one consolidated report.
//
// Every validator keeps the library's contract: unset resolves the default,
// set-but-invalid THROWS. None of them silently degrade to an empty list or a
// NaN, because that is how "allowlist" becomes "allow nothing" at runtime.

import type { Spec, ValidatorSpec } from 'envalid';
import { EnvError, makeValidator } from 'envalid';

const asSpec = <T>(spec: Record<string, unknown>): Spec<T> => spec as Spec<T>;

// ── list() ───────────────────────────────────────────────────────────────────

export type ListSpec<T extends string = string> = Omit<Spec<T[]>, 'choices'> & {
  /** Item delimiter. Default: `,`. Use `:` for PATH-style vars. */
  separator?: string;
  /** Admissable values for EACH item (envalid's `choices` compares the whole
   *  parsed value, which for a list is the array itself). */
  choices?: ReadonlyArray<T>;
};

/**
 * Comma-separated list of non-empty, trimmed strings.
 *
 * ```ts
 * list()                                          // 'a, b' -> ['a','b']
 * list({ choices: ['api_key', 'jwt'] as const })  // per-item membership, typed
 * list({ separator: ':' })                        // PATH-style
 * withDefault(list, ['api_key'])                  // typed default for "unset"
 * ```
 *
 * A var that is SET but yields no items (`''`, `','`) is an error, not `[]`:
 * "set but empty" is a deployment mistake, and an empty allowlist silently
 * means "allow nothing". Use a default (or `withDefault`) to express "unset is
 * fine". `parseEnvList` keeps the lenient semantics for non-schema callers.
 */
export const list = <T extends string = string>(
  spec: ListSpec<T> = {}
): ValidatorSpec<T[]> => {
  const { separator = ',', choices, ...rest } = spec;

  const parse = (input: string | T[]): T[] => {
    const items = (
      Array.isArray(input) ? input.map(String) : String(input).split(separator)
    )
      .map((item) => item.trim())
      .filter(Boolean) as T[];

    if (items.length === 0) {
      throw new EnvError(
        `Empty list: set, but lists no ${separator === ',' ? 'comma' : `"${separator}"`}-separated value`
      );
    }
    if (choices) {
      const invalid = items.filter((item) => !choices.includes(item));
      if (invalid.length > 0) {
        throw new EnvError(
          `Invalid list value(s) ${invalid.map((i) => `"${i}"`).join(', ')} not in choices [${choices.join(', ')}]`
        );
      }
    }
    return items;
  };

  // `choices` is deliberately not forwarded: envalid would test the whole array
  // against it. Membership is enforced per item above.
  return makeValidator<T[]>(parse as (input: string) => T[])(
    asSpec<T[]>(rest)
  ) as ValidatorSpec<T[]>;
};

// ── num()/int() with bounds ──────────────────────────────────────────────────

export type NumSpec = Spec<number> & {
  /** Inclusive lower bound. `min: 0` for "non-negative milliseconds". */
  min?: number;
  /** Inclusive upper bound. */
  max?: number;
  /** Reject non-integers. `num()` alone accepts `1.5` for a count. */
  integer?: boolean;
};

const parseNumber = (input: string | number, spec: NumSpec): number => {
  const value = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(value)) throw new EnvError(`Invalid number input: "${input}"`);
  if (spec.integer && !Number.isInteger(value)) {
    throw new EnvError(`Expected an integer, got: "${input}"`);
  }
  if (spec.min !== undefined && value < spec.min) {
    throw new EnvError(`Expected a number >= ${spec.min}, got: "${input}"`);
  }
  if (spec.max !== undefined && value > spec.max) {
    throw new EnvError(`Expected a number <= ${spec.max}, got: "${input}"`);
  }
  return value;
};

/**
 * Number, optionally bounded. A superset of envalid's `num`: same acceptance
 * for a plain `num()`, plus `min`/`max`/`integer`.
 *
 * ```ts
 * num({ min: 0 })                  // non-negative (a duration in ms)
 * num({ min: 1, max: 64 })         // a concurrency dial
 * ```
 */
export const num = (spec: NumSpec = {}): ValidatorSpec<number> => {
  const rest = { ...spec };
  delete rest.min;
  delete rest.max;
  delete rest.integer;
  return makeValidator<number>(((input: string) =>
    parseNumber(input, spec)) as (input: string) => number)(
    asSpec<number>(rest)
  ) as ValidatorSpec<number>;
};

/** Integer, optionally bounded — `num({ integer: true })`. */
export const int = (spec: Omit<NumSpec, 'integer'> = {}): ValidatorSpec<number> =>
  num({ ...spec, integer: true });

// ── duration() ──────────────────────────────────────────────────────────────

const DURATION_UNITS_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000
};

export type DurationSpec = Spec<number> & {
  /** Inclusive lower bound in milliseconds. Default: 0 (no negative durations). */
  min?: number;
  /** Inclusive upper bound in milliseconds. */
  max?: number;
};

/**
 * Duration normalized to milliseconds, accepting a bare number of ms or a
 * suffixed value: `30s`, `5m`, `2h`, `1d`, `500ms`.
 *
 * ```ts
 * duration()                       // '30s' -> 30000, '250' -> 250
 * withDefault(duration, 30_000)    // a default is plain milliseconds
 * ```
 */
export const duration = (spec: DurationSpec = {}): ValidatorSpec<number> => {
  const { min = 0, max, ...rest } = spec;

  const parse = (input: string | number): number => {
    if (typeof input === 'number') return parseNumber(input, { min, max });
    const match = /^(-?\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/i.exec(String(input).trim());
    if (!match) throw new EnvError(`Invalid duration input: "${input}"`);
    const unit = (match[2] ?? 'ms').toLowerCase();
    return parseNumber(Number(match[1]) * DURATION_UNITS_MS[unit], { min, max });
  };

  return makeValidator<number>(parse as (input: string) => number)(
    asSpec<number>(rest)
  ) as ValidatorSpec<number>;
};

// ── enumerated() ────────────────────────────────────────────────────────────

/**
 * One of a fixed set of strings, typed as the union — `str({ choices })` with a
 * name consumers actually find. `oneOf` is an alias.
 *
 * ```ts
 * enumerated(['per-function', 'combined'] as const)
 * enumerated(['read', 'write'] as const, { default: 'read' })
 * ```
 */
export const enumerated = <T extends string>(
  choices: ReadonlyArray<T>,
  spec: Omit<Spec<T>, 'choices'> = {}
): ValidatorSpec<T> => {
  const parse = (input: string): T => {
    const value = String(input) as T;
    if (!choices.includes(value)) {
      throw new EnvError(`Value "${value}" not in choices [${choices.join(', ')}]`);
    }
    return value;
  };
  return makeValidator<T>(parse)(asSpec<T>(spec)) as ValidatorSpec<T>;
};

export const oneOf = enumerated;
