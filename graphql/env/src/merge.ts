import deepmerge from 'deepmerge';
import { ConstructiveOptions, constructiveGraphqlDefaults } from '@constructive-io/graphql-types';
import { getEnvOptions as getPgpmEnvOptions, loadConfigSync, mergeArraysUnique } from '@pgpmjs/env';
import { getGraphQLEnvVars } from './env';

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
  // Config files can contain Constructive options (graphile, features, api)
  // even though loadConfigSync returns PgpmOptions type
  const configOptions = loadConfigSync(cwd) as Partial<ConstructiveOptions>;
  
  // Merge in order: core -> graphql defaults -> config (for graphql keys) -> graphql env -> overrides
  return deepmerge.all([
    coreOptions,
    constructiveGraphqlDefaults,
    // Only merge graphql-related keys from config (if present)
    {
      ...(configOptions.graphile && { graphile: configOptions.graphile }),
      ...(configOptions.features && { features: configOptions.features }),
      ...(configOptions.api && { api: configOptions.api }),
    },
    graphqlEnvOptions,
    overrides
  ], {
    arrayMerge: mergeArraysUnique
  }) as ConstructiveOptions;
};

/**
 * Alias - same as getEnvOptions
 */
export const getConstructiveEnvOptions = getEnvOptions;
