export { getEnvOptions, getConnEnvOptions, getDeploymentEnvOptions } from './merge';
export { 
  loadConfigSync, 
  loadConfigSyncFromDir, 
  loadConfigFileSync, 
  resolvePgpmPath,
  resolvePnpmWorkspace,
  resolveLernaWorkspace,
  resolveNpmWorkspace,
  resolveWorkspaceByType
} from './config';
export type { WorkspaceType } from './config';
export { getEnvVars, getNodeEnv, parseEnvBoolean, parseEnvNumber } from './env';
export { walkUp, mergeArraysUnique } from './utils';

export type { PgpmOptions, PgTestConnectionOptions, DeploymentOptions } from '@pgpmjs/types';
