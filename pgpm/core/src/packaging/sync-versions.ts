import { Logger } from '@pgpmjs/logger';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { getExtensionName, parseControlContent } from '@pgpmjs/ast/files';
import { writePackage } from './package';

const log = new Logger('sync-versions');

export interface ModuleVersionStatus {
  /** Extension name from pgpm.plan */
  name: string;
  packageDir: string;
  /** Version from package.json (source of truth) */
  packageVersion: string;
  /** default_version from the .control file */
  controlVersion: string;
  /** Whether sql/<name>--<packageVersion>.sql exists */
  sqlFileExists: boolean;
  inSync: boolean;
}

export interface SyncVersionsOptions {
  /** Report skew without writing anything */
  check?: boolean;
  usePlan?: boolean;
}

export interface SyncVersionsResult {
  /** Modules that were regenerated (empty in check mode) */
  synced: ModuleVersionStatus[];
  /** Modules found out of sync (populated in check mode) */
  skewed: ModuleVersionStatus[];
  /** Modules already in sync */
  ok: ModuleVersionStatus[];
}

/**
 * Inspect a module directory and report whether its extension metadata
 * (.control default_version + sql bundle) matches the package.json version.
 */
export const getModuleVersionStatus = (packageDir: string): ModuleVersionStatus => {
  const name = getExtensionName(packageDir);
  const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8'));
  const control = readFileSync(join(packageDir, `${name}.control`), 'utf-8');
  const { version: controlVersion } = parseControlContent(control);
  const packageVersion = pkg.version;
  const sqlFileExists = existsSync(join(packageDir, 'sql', `${name}--${packageVersion}.sql`));

  return {
    name,
    packageDir,
    packageVersion,
    controlVersion,
    sqlFileExists,
    inSync: packageVersion === controlVersion && sqlFileExists
  };
};

/**
 * Bring a set of module directories back in sync with their package.json
 * versions by re-running the packaging flow (control file, Makefile, and
 * sql/<name>--<version>.sql regenerate from the package.json version).
 */
export const syncModuleVersions = async (
  packageDirs: string[],
  { check = false, usePlan = true }: SyncVersionsOptions = {}
): Promise<SyncVersionsResult> => {
  const result: SyncVersionsResult = { synced: [], skewed: [], ok: [] };

  for (const packageDir of packageDirs) {
    const status = getModuleVersionStatus(packageDir);

    if (status.inSync) {
      result.ok.push(status);
      continue;
    }

    if (check) {
      result.skewed.push(status);
      log.warn(
        `✗ ${status.name}: package.json ${status.packageVersion} != control ${status.controlVersion}` +
        (status.sqlFileExists ? '' : ` (missing sql/${status.name}--${status.packageVersion}.sql)`)
      );
      continue;
    }

    await writePackage({
      version: status.packageVersion,
      extension: true,
      usePlan,
      packageDir
    });
    result.synced.push(status);
    log.success(`✓ ${status.name}: synced to ${status.packageVersion}`);
  }

  return result;
};
