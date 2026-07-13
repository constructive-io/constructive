import deepmerge from 'deepmerge';
import { pgpmDefaults, PgpmOptions, PgTestConnectionOptions, DeploymentOptions } from '@pgpmjs/types';
import { loadConfigSync } from './config';
import { getEnvVars } from './env';
import { replaceArrays } from './utils';

const PGPM_OPTION_KEYS = [
  'db',
  'pg',
  'packages',
  'name',
  'version',
  'settings',
  'boilerplates',
  'deployment',
  'migrations',
  'errorOutput',
  'driver'
] as const;

const projectPgpmOptions = (options: unknown): PgpmOptions => {
  if (!options || typeof options !== 'object') return {};

  const source = options as Record<string, unknown>;
  const projected: Record<string, unknown> = {};

  for (const key of PGPM_OPTION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      projected[key] = source[key];
    }
  }

  return projected as PgpmOptions;
};

/**
 * Get core PGPM environment options by merging:
 * 1. PGPM defaults
 * 2. Config file options
 * 3. Environment variables
 * 4. Runtime overrides
 * 
 * For Constructive applications that need GraphQL options, use @constructive-io/graphql-env instead.
 * 
 * @param overrides - Runtime overrides to apply last
 * @param cwd - Working directory for config file resolution
 * @param env - Environment object to read from (defaults to process.env for backwards compatibility)
 */
const resolvePgpmEnvOptions = (
  overrides: PgpmOptions = {}, 
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): PgpmOptions => {
  const defaultOptions = projectPgpmOptions(pgpmDefaults);
  const configOptions = projectPgpmOptions(loadConfigSync(cwd));
  const envOptions = projectPgpmOptions(getEnvVars(env));
  const overrideOptions = projectPgpmOptions(overrides);

  return deepmerge.all([defaultOptions, configOptions, envOptions, overrideOptions], {
    arrayMerge: replaceArrays
  });
};

export const getPgpmEnvOptions = resolvePgpmEnvOptions;
export const getEnvOptions = getPgpmEnvOptions;

export const getConnEnvOptions = (overrides: Partial<PgTestConnectionOptions> = {}, cwd: string = process.cwd()): PgTestConnectionOptions => {
  const opts = getPgpmEnvOptions({
    db: overrides
  }, cwd);
  
  // Ensure roles is always resolved from defaults even if config/env explicitly sets it to undefined
  const db = opts.db ?? {};
  const defaultRoles = pgpmDefaults.db?.roles ?? {};
  const defaultConnections = pgpmDefaults.db?.connections ?? {};
  
  return {
    ...db,
    roles: {
      ...defaultRoles,
      ...(db.roles ?? {})
    },
    connections: {
      app: {
        ...defaultConnections.app,
        ...(db.connections?.app ?? {})
      },
      admin: {
        ...defaultConnections.admin,
        ...(db.connections?.admin ?? {})
      }
    }
  };
};

export const getDeploymentEnvOptions = (overrides: Partial<DeploymentOptions> = {}, cwd: string = process.cwd()): DeploymentOptions => {
  const opts = getPgpmEnvOptions({
    deployment: overrides
  }, cwd);
  return opts.deployment;
};
