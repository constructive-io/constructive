import { getLatestChange, Module } from '../files';
import { errors } from '@pgpmjs/types';

export type ModuleMap = Record<string, Module>;

/**
 * Mapping from control file names (used in extensions list) to npm package names.
 * Only includes modules that can be installed via pgpm install from @pgpm/* packages.
 * Native PostgreSQL extensions (plpgsql, uuid-ossp, etc.) are not included.
 */
export const PGPM_MODULE_MAP: Record<string, string> = {
  'pgpm-base32': '@pgpm/base32',
  'pgpm-database-jobs': '@pgpm/database-jobs',
  'metaschema-modules': '@pgpm/metaschema-modules',
  'metaschema-schema': '@pgpm/metaschema-schema',
  'pgpm-inflection': '@pgpm/inflection',
  'pgpm-jwt-claims': '@pgpm/jwt-claims',
  'pgpm-stamps': '@pgpm/stamps',
  'pgpm-totp': '@pgpm/totp',
  'pgpm-types': '@pgpm/types',
  'pgpm-utils': '@pgpm/utils',
  'pgpm-uuid': '@pgpm/uuid'
};

/**
 * Result of checking for missing installable modules.
 */
export interface MissingModule {
  controlName: string;
  npmName: string;
}

/**
 * Determines which pgpm modules from an extensions list are missing from the installed modules.
 * Only checks modules that are in PGPM_MODULE_MAP (installable via pgpm install).
 * 
 * @param extensions - List of extension/control file names to check
 * @param installedModules - List of installed npm package names (e.g., '@pgpm/base32')
 * @returns Array of missing modules with their control names and npm package names
 */
export const getMissingInstallableModules = (
  extensions: string[],
  installedModules: string[]
): MissingModule[] => {
  const missingModules: MissingModule[] = [];
  
  for (const ext of extensions) {
    const npmName = PGPM_MODULE_MAP[ext];
    if (npmName && !installedModules.includes(npmName)) {
      missingModules.push({
        controlName: ext,
        npmName
      });
    }
  }
  
  return missingModules;
};

/**
 * Get the latest change from the pgpm.plan file for a specific module.
 */
export const latestChange = (
  sqlmodule: string,
  modules: ModuleMap,
  basePath: string
): string => {
  const module = modules[sqlmodule];
  if (!module) {
    throw errors.MODULE_NOT_FOUND({ name: sqlmodule });
  }

  const planPath = `${basePath}/${module.path}/pgpm.plan`;
  return getLatestChange(planPath);
};

/**
 * Get the latest change and version for a specific module.
 */
export const latestChangeAndVersion = (
  sqlmodule: string,
  modules: ModuleMap,
  basePath: string
): { change: string; version: string } => {
  const module = modules[sqlmodule];
  if (!module) {
    throw errors.MODULE_NOT_FOUND({ name: sqlmodule });
  }

  const planPath = `${basePath}/${module.path}/pgpm.plan`;
  const change = getLatestChange(planPath);
  const pkg = require(`${basePath}/${module.path}/package.json`);

  return { change, version: pkg.version };
};

/**
 * Get extensions and modules required by a specific module.
 */
export const getExtensionsAndModules = (
  sqlmodule: string,
  modules: ModuleMap
): { native: string[]; sqitch: string[] } => {
  const module = modules[sqlmodule];
  if (!module) {
    throw errors.MODULE_NOT_FOUND({ name: sqlmodule });
  }

  const native = module.requires.filter(
    (req) => !Object.keys(modules).includes(req)
  );
  const sqitch = module.requires.filter((req) =>
    Object.keys(modules).includes(req)
  );

  return { native, sqitch };
};

/**
 * Get extensions and modules with their latest changes and versions.
 */
export const getExtensionsAndModulesChanges = (
  sqlmodule: string,
  modules: ModuleMap,
  basePath: string
): {
  native: string[];
  sqitch: { name: string; latest: string; version: string }[];
} => {
  const { native, sqitch } = getExtensionsAndModules(sqlmodule, modules);

  const sqitchWithDetails = 
    sqitch.map( (mod) => {
      const { change, version } = latestChangeAndVersion(mod, modules, basePath);
      return { name: mod, latest: change, version };
    });

  return { native, sqitch: sqitchWithDetails };
};
