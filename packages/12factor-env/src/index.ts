import { asBoolean, asNumber, asString, asStringList } from '@constructive-io/coerce';
import type { CleanedEnv, CleanOptions, Spec,ValidatorSpec } from 'envalid';
import {
  applyDefaultMiddleware,
  bool,
  customCleanEnv,
  email,
  EnvError,
  EnvMissingError,
  host,
  json,
  makeValidator,
  port,
  str,
  testOnly,
  url} from 'envalid';

import { type EnvCheck, runChecks } from './checks';
import { isSecretSpec, redactMessage, stripSecret, withRedactedSerialization } from './redact';

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
 * Reporter that throws instead of calling `process.exit`, so errors can be
 * caught and handled in tests and applications. It also owns the two things
 * envalid's own reporter cannot do: it REDACTS values for vars marked secret
 * (envalid quotes the offending value into its message), and it runs the
 * cross-field `checks` so their failures join the same consolidated report
 * rather than throwing separately after the call.
 */
const makeReporter =
  <T>(
    environment: Record<string, string | undefined>,
    secretNames: ReadonlySet<string>,
    checks: readonly EnvCheck<never>[]
  ) =>
    ({ errors, env: cleaned }: { errors: Partial<Record<keyof T, Error>>; env: unknown }) => {
      const failedVars = new Set(Object.keys(errors));
      const lines = [...failedVars].map((name) => {
        const error = errors[name as keyof T];
        const message = !error
          ? 'unknown error'
          : secretNames.has(name)
            ? redactMessage(error, environment[name])
            : error.message;
        return `${name}: ${message}`;
      });

      for (const failure of runChecks(checks, cleaned as never, failedVars)) {
        lines.push(`${failure.vars.join(', ')}: ${failure.message}`);
      }

      if (lines.length > 0) {
        throw new EnvError(`Missing or invalid environment variables:\n  ${lines.join('\n  ')}`);
      }
    };

export type EnvOptions<S> = CleanOptions<S> & {
  /** Constraints between vars, evaluated over the cleaned values. */
  checks?: readonly EnvCheck<never>[];
};

/**
 * Wrapper around envalid's cleanEnv that uses a throwing reporter by default
 * This prevents process.exit from being called on validation errors
 */
const cleanEnv = <S extends Record<string, ValidatorSpec<unknown>>>(
  environment: Record<string, string | undefined>,
  specs: S,
  options?: EnvOptions<S>
): CleanedEnv<S> => {
  const { checks = [], ...cleanOptions } = options ?? {};
  const secretNames = new Set(
    Object.entries(specs)
      .filter(([, spec]) => isSecretSpec(spec))
      .map(([name]) => name)
  );
  // customCleanEnv, not cleanEnv: the redacting serializers have to be defined
  // on the plain cleaned object, before envalid proxies and freezes it.
  return customCleanEnv(
    withResolvedNodeEnv(environment),
    stripSecret(specs),
    (plainCleaned, rawEnvironment) =>
      applyDefaultMiddleware(withRedactedSerialization(plainCleaned, secretNames), rawEnvironment),
    {
      reporter: makeReporter<S>(environment, secretNames, checks),
      ...cleanOptions
    }
  ) as CleanedEnv<S>;
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

// Loosely typed on purpose: a house validator takes a wider spec than envalid's
// (`list`'s per-item `choices`, `num`'s `min`/`max`), and these wrappers only
// ever add a default to it.
type ValidatorFactory<T> = (spec?: Spec<T> | any) => ValidatorSpec<T>;

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
//
// Thin env-shaped adapters over `@constructive-io/coerce`: the coercion rules
// themselves are shared with every other runtime value in the house, and only
// the env convention — "unset or blank means `undefined`, not a default" —
// lives here.

/**
 * Parse a boolean env value leniently: `true`/`1`/`yes`/`on`/`t`/`y`
 * (case-insensitive) are true, an unrecognised spelling is false, and
 * unset/blank is `undefined`. Matches `@pgpmjs/env`'s `parseEnvBoolean`.
 */
const parseEnvBoolean = (val?: string): boolean | undefined =>
  asString(val) === null ? undefined : asBoolean(val) ?? false;

/** Parse a numeric env value; unset/blank/non-finite => undefined. */
const parseEnvNumber = (val?: string): number | undefined =>
  asString(val) === null ? undefined : asNumber(Number(val)) ?? undefined;

/**
 * Parse a comma-separated env value into a trimmed, non-empty string list;
 * unset/blank => undefined.
 */
const parseEnvList = (val?: string): string[] | undefined => asStringList(val) ?? undefined;

/**
 * Lenient boolean validator. Unlike envalid's built-in `bool` (which rejects
 * e.g. `TRUE`/`yes`), this accepts every spelling `asBoolean` knows
 * (`true`/`1`/`yes`/`on`/`t`/`y`) case-insensitively. Safe to
 * combine with a boolean `default`/`devDefault` (envalid also runs the validator
 * against the typed default).
 */
const boolish = makeValidator<boolean>((value: string) => asBoolean(value) ?? false);

// Type for specs object
type Specs = Record<string, ValidatorSpec<unknown>>;

/**
 * Validate environment variables
 *
 * Everything declared in `secrets` is treated as sensitive: its value is never
 * printed in a validation error, and it is redacted from `JSON.stringify`/
 * `util.inspect` output of the returned object. Mark a var in `vars` the same
 * way with `str({ secret: true })`.
 *
 * @param inputEnv - The environment object (usually process.env)
 * @param secrets - Required environment variables (validated with envalid)
 * @param vars - Optional environment variables (validated with envalid)
 * @param options - `checks` for constraints between vars
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
 *   },
 *   {
 *     checks: [distinct(['CONTROL_USER', 'UPSTREAM_USER'])]
 *   }
 * );
 * ```
 */
const env = <S extends Specs, V extends Specs>(
  inputEnv: Record<string, string | undefined>,
  secrets: S = {} as S,
  vars: V = {} as V,
  options: EnvOptions<S & V> = {}
): CleanedEnv<S & V> => {
  const secretSpecs = Object.fromEntries(
    Object.entries(secrets).map(([name, spec]) => [name, { ...spec, secret: true }])
  ) as unknown as S;

  // First pass: validate optional vars. Cross-field checks are deferred to the
  // second pass, where the secrets are cleaned too and the check can see them.
  const varEnv = cleanEnv(inputEnv, vars);

  const mergedEnv = { ...inputEnv, ...varEnv } as unknown as Record<string, string | undefined>;
  return cleanEnv(mergedEnv, { ...secretSpecs, ...vars }, options as EnvOptions<S & V>) as unknown as CleanedEnv<S & V>;
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

// House validators: csv lists, bounded numbers, durations, string enums.
// `num` shadows envalid's on purpose — same acceptance, plus min/max/integer.
export {
  duration,
  type DurationSpec,
  enumerated,
  int,
  list,
  type ListSpec,
  num,
  type NumSpec,
  oneOf} from './validators';

// Cross-field checks.
export {
  distinct,
  type EnvCheck,
  mutuallyExclusive,
  requiredWhen,
  runChecks} from './checks';

// Secret handling.
export { redactEnvError, type SecretSpec } from './redact';

export type { CleanedEnv, Spec,ValidatorSpec };
