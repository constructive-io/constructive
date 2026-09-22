import { constructiveGraphqlDefaults,ConstructiveOptions } from '@constructive-io/graphql-types';
import { getEnvOptions as getPgpmEnvOptions, loadConfigSync, replaceArrays } from '@pgpmjs/env';
import deepmerge from 'deepmerge';

import { getGraphQLEnvVars } from './env';
import { normalizeGrafastCacheLimits } from './grafast-cache-limits';
import { validateGraphileCacheOptions } from './validation';

const FIVE_MINUTES_MS = 1000 * 60 * 5;
const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const ONE_YEAR_MS = ONE_DAY_MS * 366;
const DEFAULT_GRAPHILE_CACHE_MAX = 50;

const resolveGraphileCacheDefaults = (
  options: ConstructiveOptions,
  env: NodeJS.ProcessEnv
): void => {
  const graphile = options.graphile;
  if (!graphile) return;

  const cache = graphile.cache;
  if (cache === undefined) {
    options.graphile = {
      ...graphile,
      cache: {
        max: DEFAULT_GRAPHILE_CACHE_MAX,
        ttl: env.NODE_ENV === 'development' ? FIVE_MINUTES_MS : ONE_YEAR_MS
      }
    };
    return;
  }

  // Leave malformed values for the final validator to report with the
  // configuration path rather than masking them while applying defaults.
  if (cache === null || typeof cache !== 'object' || Array.isArray(cache)) return;

  options.graphile = {
    ...graphile,
    cache: {
      ...cache,
      max: cache.max === undefined ? DEFAULT_GRAPHILE_CACHE_MAX : cache.max,
      ttl:
        cache.ttl === undefined
          ? env.NODE_ENV === 'development'
            ? FIVE_MINUTES_MS
            : ONE_YEAR_MS
          : cache.ttl
    }
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
  const options = deepmerge.all([
    coreOptions,
    constructiveGraphqlDefaults,
    // Only merge graphql-related keys from config (if present)
    {
      ...(configOptions.graphile && { graphile: configOptions.graphile }),
      ...(configOptions.features && { features: configOptions.features }),
      ...(configOptions.api && { api: configOptions.api }),
      ...(configOptions.sms && { sms: configOptions.sms }),
    },
    graphqlEnvOptions,
    overrides
  ], {
    arrayMerge: replaceArrays
  }) as ConstructiveOptions;

  const grafastCache = normalizeGrafastCacheLimits(
    options.graphile?.grafastCache
  );
  if (grafastCache !== undefined && options.graphile) {
    options.graphile = { ...options.graphile, grafastCache };
  }
  resolveGraphileCacheDefaults(options, env);
  validateGraphileCacheOptions(options);
  return options;
};

/**
 * Alias - same as getEnvOptions
 */
export const getConstructiveEnvOptions = getEnvOptions;
