import {
  cleanEnv as envalidCleanEnv,
  makeValidator,
  EnvError,
  EnvMissingError,
  testOnly,
  bool,
  num,
  str,
  json,
  host,
  port,
  url,
  email
} from 'envalid';
import type { ValidatorSpec, CleanedEnv, CleanOptions } from 'envalid';

import { readFileSync } from 'fs';
import { resolve, join } from 'path';

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
  return envalidCleanEnv(environment, specs, {
    reporter: throwingReporter,
    ...options
  });
};

/**
 * Default path for secret files (Docker/Kubernetes secrets)
 */
const ENV_SECRETS_PATH = process.env.ENV_SECRETS_PATH ?? '/run/secrets/';

/**
 * Resolve the full path to a secret file
 */
const secretPath = (name: string): string =>
  name.startsWith('/') ? name : resolve(join(ENV_SECRETS_PATH, name));

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
  const _secrets = secretEnv(varEnv as unknown as Record<string, string | undefined>, secrets);

  // Second pass: validate secrets with file values merged in
  // Include inputEnv first so env vars (e.g., Kubernetes secretKeyRef) are available,
  // then varEnv overrides, then file-based secrets have highest priority
  const mergedEnv = { ...inputEnv, ...varEnv, ..._secrets } as unknown as Record<string, string | undefined>;
  return cleanEnv(mergedEnv, secrets) as unknown as CleanedEnv<S & V>;
};

export {
  env,
  secretEnv,
  secret,
  getSecret,
  secretPath,
  // Re-export from envalid
  cleanEnv,
  makeValidator,
  EnvError,
  EnvMissingError,
  testOnly,
  bool,
  num,
  str,
  json,
  host,
  port,
  url,
  email
};

export type { ValidatorSpec, CleanedEnv };
