import { constructiveGraphqlDefaults,ConstructiveOptions } from '@constructive-io/graphql-types';
import { getEnvOptions as getPgpmEnvOptions, loadConfigSync, replaceArrays } from '@pgpmjs/env';
import { devDefault, env as validateEnv, getNodeEnv, str } from '12factor-env';
import deepmerge from 'deepmerge';

import { getGraphQLEnvVars } from './env';

const DEVELOPMENT_OAUTH_STATE_SECRET =
  'development-only-oauth-state-secret-change-me';

const assertRelativePath = (value: string | undefined, name: string): void => {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    throw new Error(`${name} must be a same-origin relative path`);
  }
};

export const validateOAuthOptions = (
  options: ConstructiveOptions,
  processEnv: NodeJS.ProcessEnv
): ConstructiveOptions => {
  const cookieSecure =
    getNodeEnv(processEnv) === 'production'
      ? true
      : (options.oauth?.cookieSecure ?? false);
  if (!options.oauth?.enabled) {
    return { ...options, oauth: { ...options.oauth, cookieSecure } };
  }

  const validated = validateEnv(
    {
      ...processEnv,
      OAUTH_STATE_SECRET: options.oauth.stateSecret,
    },
    {},
    {
      OAUTH_STATE_SECRET: devDefault(str, DEVELOPMENT_OAUTH_STATE_SECRET),
    }
  );
  const stateSecret = validated.OAUTH_STATE_SECRET;
  if (
    stateSecret.trim() !== stateSecret ||
    Buffer.byteLength(stateSecret, 'utf8') < 32
  ) {
    throw new Error(
      'OAUTH_STATE_SECRET must be at least 32 bytes with no surrounding whitespace'
    );
  }

  const stateMaxAgeMs = options.oauth.stateMaxAgeMs ?? 0;
  if (
    !Number.isFinite(stateMaxAgeMs) ||
    stateMaxAgeMs < 60_000 ||
    stateMaxAgeMs > 15 * 60_000
  ) {
    throw new Error(
      'oauth.stateMaxAgeMs must be between 60000 and 900000 milliseconds'
    );
  }
  assertRelativePath(options.oauth.successPath, 'oauth.successPath');
  assertRelativePath(options.oauth.failurePath, 'oauth.failurePath');

  return {
    ...options,
    oauth: { ...options.oauth, stateSecret, cookieSecure },
  };
};

/**
 * Get Constructive environment options by merging:
 * 1. Core PGPM defaults (from @pgpmjs/env)
 * 2. GraphQL defaults (from @constructive-io/graphql-types)
 * 3. Config file options (including GraphQL options)
 * 4. Environment variables (both core and GraphQL)
 * 5. Runtime overrides
 * 
 * This is the main entry point for Constructive packages that need
 * both core PGPM options and GraphQL/Graphile options.
 * 
 * @param overrides - Runtime overrides to apply last
 * @param cwd - Working directory for config file resolution
 * @param env - Environment object to read from (defaults to process.env for backwards compatibility)
 */
export const getEnvOptions = (
  overrides: Partial<ConstructiveOptions> = {}, 
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): ConstructiveOptions => {
  // Get core PGPM options (includes pgpmDefaults + config + core env vars)
  const coreOptions = getPgpmEnvOptions({}, cwd, env);
  
  // Get GraphQL-specific env vars
  const graphqlEnvOptions = getGraphQLEnvVars(env);
  
  // Load config again to get any GraphQL-specific config
  // Config files can contain Constructive options (graphile, features, api, sms)
  // even though loadConfigSync returns PgpmOptions type
  const configOptions = loadConfigSync(cwd) as Partial<ConstructiveOptions>;
  
  // Merge in order: core -> graphql defaults -> config (for graphql keys) -> graphql env -> overrides
  const merged = deepmerge.all([
    coreOptions,
    constructiveGraphqlDefaults,
    // Only merge graphql-related keys from config (if present)
    {
      ...(configOptions.graphile && { graphile: configOptions.graphile }),
      ...(configOptions.features && { features: configOptions.features }),
      ...(configOptions.api && { api: configOptions.api }),
      ...(configOptions.sms && { sms: configOptions.sms }),
      ...(configOptions.oauth && { oauth: configOptions.oauth }),
    },
    graphqlEnvOptions,
    overrides
  ], {
    arrayMerge: replaceArrays
  }) as ConstructiveOptions;

  return validateOAuthOptions(merged, env);
};

/**
 * Alias - same as getEnvOptions
 */
export const getConstructiveEnvOptions = getEnvOptions;
