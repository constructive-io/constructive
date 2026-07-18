import { DeploymentOptions,pgpmDefaults, PgpmOptions, PgTestConnectionOptions } from '@pgpmjs/types';
import deepmerge from 'deepmerge';

import { assertProductionEnvOptions } from './assert';
import { loadConfigSync } from './config';
import { getEnvVars } from './env';
import { replaceArrays } from './utils';

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
export const getEnvOptions = (
  overrides: PgpmOptions = {}, 
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): PgpmOptions => {
  const configOptions = loadConfigSync(cwd);
  const envOptions = getEnvVars(env);
  
  const merged = deepmerge.all([pgpmDefaults, configOptions, envOptions, overrides], {
    arrayMerge: replaceArrays
  });

  // In production, surface (warn) or reject (STRICT_ENV=throw) sensitive options
  // still left at their built-in dev defaults. No-op in dev/test/CI.
  assertProductionEnvOptions(merged, env);

  return merged;
};

export const getConnEnvOptions = (overrides: Partial<PgTestConnectionOptions> = {}, cwd: string = process.cwd()): PgTestConnectionOptions => {
  const opts = getEnvOptions({
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
  const opts = getEnvOptions({
    deployment: overrides
  }, cwd);
  return opts.deployment;
};
