import deepmerge from 'deepmerge';
import { pgpmDefaults, PgpmOptions, PgTestConnectionOptions, DeploymentOptions } from '@pgpmjs/types';
import { loadConfigSync } from './config';
import { getEnvVars } from './env';
import { mergeArraysUnique } from './utils';

/**
 * Get core PGPM environment options by merging:
 * 1. PGPM defaults
 * 2. Config file options
 * 3. Environment variables
 * 4. Runtime overrides
 * 
 * For Constructive applications that need GraphQL options, use @constructive-io/graphql-env instead.
 */
export const getEnvOptions = (overrides: PgpmOptions = {}, cwd: string = process.cwd()): PgpmOptions => {
  const configOptions = loadConfigSync(cwd);
  const envOptions = getEnvVars();
  
  return deepmerge.all([pgpmDefaults, configOptions, envOptions, overrides], {
    arrayMerge: mergeArraysUnique
  });
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
