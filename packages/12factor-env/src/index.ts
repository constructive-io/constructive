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
import { readFileSync } from 'fs';
import { join,resolve } from 'path';

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

/**
 * Get the secrets path lazily to allow ENV_SECRETS_PATH changes at runtime
 */
const getSecretsPath = (): string =>
  process.env.ENV_SECRETS_PATH ?? '/run/secrets/';

/**
 * Resolve the full path to a secret file
 */
const secretPath = (name: string): string =>
  name.startsWith('/') ? name : resolve(join(getSecretsPath(), name));

/**
 * Read a secret from a file
 * @param secret - The secret file name or path
 * @returns The secret value or undefined if not found
 */
const getSecret = (secret: string | undefined): string | undefined => {
  if (!secret) return undefined;
  try {
    const value = readFileSync(secretPath(secret), 'utf-8');
    return value.trim();
  } catch {
    return undefined;
  }
};

/**
 * Read secrets from files based on the secret props configuration
 * Supports both direct secret files and _FILE suffix pattern
 */
const secretEnv = <T extends Record<string, ValidatorSpec<unknown>>>(
  inputEnv: Record<string, string | undefined>,
  secretProps: T
): Record<string, string> => {
  return Object.keys(secretProps).reduce<Record<string, string>>((m, k) => {
    // Try to read secret directly from file
    const secret = getSecret(k);
    if (secret) {
      m[k] = secret;
    } else {
      // Try _FILE suffix pattern (e.g., DATABASE_PASSWORD_FILE)
      const secretFileKey = `${k}_FILE`;
      if (Object.prototype.hasOwnProperty.call(inputEnv, secretFileKey)) {
        const secretFileValue = getSecret(inputEnv[secretFileKey]);
        if (secretFileValue) {
          m[k] = secretFileValue;
        }
      }
    }
    return m;
  }, {});
};

/**
 * Create a validator for a secret file
 * @param envFile - The environment variable name for the secret file
 */
const secret = (envFile?: string): ValidatorSpec<string> =>
  str({ default: getSecret(envFile) });

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
 * Validate environment variables with secret file support
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

  // Read secrets from files
  const _secrets = secretEnv(inputEnv, secrets);

  // Second pass: validate secrets with file values merged in
  // Include inputEnv first so env vars (e.g., Kubernetes secretKeyRef) are available,
  // then varEnv overrides, then file-based secrets have highest priority
  const mergedEnv = { ...inputEnv, ...varEnv, ..._secrets } as unknown as Record<string, string | undefined>;
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
  getSecret,
  getSecretsPath,
  host,
  json,
  makeValidator,
  num,
  // Lenient coercion
  parseEnvBoolean,
  parseEnvNumber,
  port,
  required,
  secret,
  secretEnv,
  secretPath,
  str,
  testOnly,
  url,
  // Fallback-class wrappers
  withDefault};

export type { CleanedEnv, Spec,ValidatorSpec };
