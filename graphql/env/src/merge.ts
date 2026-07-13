import deepmerge from 'deepmerge';
import {
  ConstructiveOptions,
  constructiveDefaults
} from '@constructive-io/graphql-types';
import { getPgpmEnvOptions, loadConfigSync, replaceArrays } from '@pgpmjs/env';
import { getGraphQLEnvVars } from './env';

const CONSTRUCTIVE_OPTION_KEYS = [
  'graphile',
  'features',
  'api',
  'server',
  'cdn',
  'jobs',
  'smtp'
] as const;

const projectConstructiveOptions = (
  options: unknown
): Partial<ConstructiveOptions> => {
  if (!options || typeof options !== 'object') return {};

  const source = options as Record<string, unknown>;
  const projected: Record<string, unknown> = {};

  for (const key of CONSTRUCTIVE_OPTION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      projected[key] = source[key];
    }
  }

  return projected as Partial<ConstructiveOptions>;
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
const resolveConstructiveEnvOptions = (
  overrides: Partial<ConstructiveOptions> = {}, 
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): ConstructiveOptions => {
  // Get core PGPM options (includes pgpmDefaults + config + core env vars)
  const coreOptions = getPgpmEnvOptions({}, cwd, env);
  
  const configOptions = projectConstructiveOptions(loadConfigSync(cwd));
  const graphqlEnvOptions = getGraphQLEnvVars(env);

  return deepmerge.all([
    constructiveDefaults,
    coreOptions,
    configOptions,
    graphqlEnvOptions,
    overrides
  ], {
    arrayMerge: replaceArrays
  }) as ConstructiveOptions;
};

export const getConstructiveEnvOptions = resolveConstructiveEnvOptions;
export const getEnvOptions = getConstructiveEnvOptions;
