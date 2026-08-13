import type { CleanedEnv, CleanOptions, Spec,ValidatorSpec } from 'envalid';
import {
  bool,
  cleanEnv as envalidCleanEnv,
  email,
  EnvError,
  EnvMissingError,
  host,
  json,
  makeValidator,
  num,
  port,
  str,
  testOnly,
  url} from 'envalid';

/**
 * NODE_ENV resolved with "house" semantics.
 *
 * envalid natively treats an UNSET `NODE_ENV` as production, which means a
 * `devDefault` (fallback in dev, required in prod) throws in ordinary local
 * development where nobody sets `NODE_ENV`. That is the opposite of what we
 * want. `getNodeEnv` mirrors `@pgpmjs/env`'s `getNodeEnv`:
 *
 *   - explicit `production`                       -> `production`
 *   - explicit `test`/`testing`, or GitHub Actions -> `test`
 *   - anything else, INCLUDING UNSET              -> `development`
 */
export type NodeEnv = 'development' | 'production' | 'test';

export const getNodeEnv = (
  environment: Record<string, string | undefined> = process.env
): NodeEnv => {
  const raw = environment.NODE_ENV?.toLowerCase();
  if (raw === 'production') return 'production';
  if (raw === 'test' || raw === 'testing' || environment.GITHUB_ACTIONS === 'true') {
    return 'test';
  }
  return 'development';
};

export const isProduction = (
  environment: Record<string, string | undefined> = process.env
): boolean => getNodeEnv(environment) === 'production';

export const isTest = (
  environment: Record<string, string | undefined> = process.env
): boolean => getNodeEnv(environment) === 'test';

export const isDevelopment = (
  environment: Record<string, string | undefined> = process.env
): boolean => getNodeEnv(environment) === 'development';

/**
 * Rollout valve for enforcing newly-reclassified env vars (class 2/3).
 *
 * When a var is promoted from "always has a baked default" to "must be provided
 * in production", a big-bang hard-throw can break every deploy that silently
 * relied on the old default. `STRICT_ENV` lets that enforcement roll out safely:
 *
 *   - `STRICT_ENV=throw`            -> hard-fail (throw) on a missing/unsafe value
 *   - anything else, INCLUDING UNSET -> `warn` (log loudly, keep booting)
 *
 * Defaulting to `warn` means enforcement surfaces in logs for a release before
 * it is turned into a hard failure. NOTE: this only governs opt-in enforcement
 * helpers (e.g. `assertProductionEnvOptions`); the `env()`/`cleanEnv` validators
 * always throw, so existing `required()`/`devDefault()` guarantees are unchanged.
 */
export type StrictEnvMode = 'warn' | 'throw';

export const getStrictEnvMode = (
  environment: Record<string, string | undefined> = process.env
): StrictEnvMode =>
  environment.STRICT_ENV?.toLowerCase() === 'throw' ? 'throw' : 'warn';

/**
 * Return a copy of `environment` with `NODE_ENV` populated per house semantics
 * when it is missing/blank, so envalid's `devDefault`/`testDefault` resolve
 * correctly (unset => development, not production).
 */
const withResolvedNodeEnv = (
  environment: Record<string, string | undefined>
): Record<string, string | undefined> => {
  if (environment.NODE_ENV && environment.NODE_ENV.trim() !== '') return environment;
  return { ...environment, NODE_ENV: getNodeEnv(environment) };
};

/**
 * Custom reporter that throws an error instead of calling process.exit
 * This allows errors to be caught and handled properly in tests and applications
 */
const throwingReporter = <T>({ errors }: { errors: Partial<Record<keyof T, Error>> }) => {
  const errorKeys = Object.keys(errors) as (keyof T)[];
  if (errorKeys.length > 0) {
    const missingVars = errorKeys.map((key) => `${String(key)}: ${errors[key]?.message ?? 'unknown error'}`);
    throw new EnvError(`Missing or invalid environment variables:\n  ${missingVars.join('\n  ')}`);
  }
};

/**
 * Wrapper around envalid's cleanEnv that uses a throwing reporter by default
 * This prevents process.exit from being called on validation errors
 */
const cleanEnv = <S extends Record<string, ValidatorSpec<unknown>>>(
  environment: Record<string, string | undefined>,
  specs: S,
  options?: CleanOptions<S>
): CleanedEnv<S> => {
  return envalidCleanEnv(withResolvedNodeEnv(environment), specs, {
    reporter: throwingReporter,
    ...options
  });
};

// ── Fallback classes ─────────────────────────────────────────────────────────
//
// A var's real distinction is not "optional vs required" but "is there an honest
// fallback?". These thin wrappers over any envalid validator make that intent
// legible at the declaration site:
//
//   withDefault(str, 'app_jobs')          class 1: honest fallback everywhere
//   devDefault(str, 'sync.localhost')     class 2: fallback in dev/test, THROW in prod
//   required(url)                          class 3: no honest fallback, THROW if absent
//   secret('DB_PASSWORD')                  class 3 secret: required + secret-file support
//
// `devDefault` relies on the NODE_ENV normalization above, so it is enforced in
// production even when NODE_ENV is only implicitly set.

type ValidatorFactory<T> = (spec?: Spec<T>) => ValidatorSpec<T>;

/** Class 1 — always resolves to `defaultValue` when the var is unset. */
const withDefault = <T>(
  validator: ValidatorFactory<T>,
  defaultValue: NonNullable<T>,
  spec: Spec<T> = {}
): ValidatorSpec<T> => validator({ ...spec, default: defaultValue });

/** Class 2 — uses `defaultValue` in dev/test, but is required (throws) in production. */
const devDefault = <T>(
  validator: ValidatorFactory<T>,
  defaultValue: NonNullable<T>,
  spec: Spec<T> = {}
): ValidatorSpec<T> => validator({ ...spec, devDefault: defaultValue });

/** Class 3 — no fallback; throws in every environment when the var is absent. */
const required = <T>(
  validator: ValidatorFactory<T>,
  spec: Spec<T> = {}
): ValidatorSpec<T> => validator({ ...spec });

// ── Lenient coercion helpers ─────────────────────────────────────────────────

/**
 * Parse a boolean env value leniently: `true`/`1`/`yes` (case-insensitive) are
 * true, everything else (including unset/blank => undefined) is false. Matches
 * `@pgpmjs/env`'s `parseEnvBoolean`.
 */
const parseEnvBoolean = (val?: string): boolean | undefined => {
  if (val === undefined || val === '') return undefined;
  return ['true', '1', 'yes'].includes(val.trim().toLowerCase());
};

/** Parse a numeric env value; unset/blank/non-finite => undefined. */
const parseEnvNumber = (val?: string): number | undefined => {
  if (val === undefined || val === '') return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Parse a comma-separated env value into a trimmed, non-empty string list;
 * unset/blank => undefined.
 */
const parseEnvList = (val?: string): string[] | undefined => {
  if (!val) return undefined;
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Lenient boolean validator. Unlike envalid's built-in `bool` (which rejects
 * e.g. `TRUE`/`yes`), this accepts `true`/`1`/`yes` case-insensitively. Safe to
 * combine with a boolean `default`/`devDefault` (envalid also runs the validator
 * against the typed default).
 */
const boolish = makeValidator<boolean>((value: string) => {
  const raw = value as unknown;
  if (typeof raw === 'boolean') return raw;
  return parseEnvBoolean(String(raw)) ?? false;
});

// Type for specs object
type Specs = Record<string, ValidatorSpec<unknown>>;

/**
 * Validate environment variables
 *
 * @param inputEnv - The environment object (usually process.env)
 * @param secrets - Required environment variables (validated with envalid)
 * @param vars - Optional environment variables (validated with envalid)
 * @returns Validated and cleaned environment object
 *
 * @example
 * ```ts
 * const config = env(
 *   process.env,
 *   {
 *     DATABASE_URL: str(),
 *     API_KEY: str()
 *   },
 *   {
 *     PORT: port({ default: 3000 }),
 *     DEBUG: bool({ default: false })
 *   }
 * );
 * ```
 */
const env = <S extends Specs, V extends Specs>(
  inputEnv: Record<string, string | undefined>,
  secrets: S = {} as S,
  vars: V = {} as V
): CleanedEnv<S & V> => {
  // First pass: validate optional vars
  const varEnv = cleanEnv(inputEnv, vars);

  const mergedEnv = { ...inputEnv, ...varEnv } as unknown as Record<string, string | undefined>;
  return cleanEnv(mergedEnv, { ...secrets, ...vars }) as unknown as CleanedEnv<S & V>;
};

export {
  bool,
  boolish,
  // Re-export from envalid
  cleanEnv,
  devDefault,
  email,
  env,
  EnvError,
  EnvMissingError,
  host,
  json,
  makeValidator,
  num,
  // Lenient coercion
  parseEnvBoolean,
  parseEnvList,
  parseEnvNumber,
  port,
  required,
  str,
  testOnly,
  url,
  // Fallback-class wrappers
  withDefault};

export type { CleanedEnv, Spec,ValidatorSpec };
