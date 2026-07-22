import fs from 'fs';
import path from 'path';

import { Change, Tag } from '../files/types';
import { generatePlanContent } from '../slice/slice';

const SCRIPT_DIRS = ['deploy', 'revert', 'verify'] as const;
export type MinimalScriptDir = (typeof SCRIPT_DIRS)[number];

/**
 * A single change's SQL scripts for a minimal module. `verify` is optional.
 */
export interface MinimalChangeScripts {
  deploy: string;
  revert: string;
  verify?: string;
}

export interface WriteMinimalModuleOptions {
  /** Module (extension) name */
  name: string;

  /** Plan changes, in order. Each must have a matching entry in `scripts`. */
  changes: Change[];

  /** SQL scripts keyed by change name */
  scripts: Record<string, MinimalChangeScripts>;

  /** Tags to include in the plan */
  tags?: Tag[];

  /** Extensions/modules this module requires (control `requires`) */
  requires?: string[];

  /** package.json version (default '0.0.1') */
  version?: string;

  /** package.json license (default 'CONSTRUCTIVE') */
  license?: string;

  /** Overwrite an existing directory (default: false) */
  overwrite?: boolean;

  /**
   * Write a minimal `package.json` (default: true). Set `false` to preserve an
   * existing one — e.g. when a richer package.json was already scaffolded by
   * `pgpm init` and only the pgpm files should be written on top.
   */
  writePackageJson?: boolean;
}

/**
 * The minimal set of files pgpm needs to recognize and deploy a module:
 * `pgpm.plan` (module marker + change order), `<name>.control` (extension
 * metadata), `Makefile` (PGXS packaging), `package.json`, and the
 * deploy/revert/verify scripts. Mirrors what `pgpm init` scaffolds, minus the
 * network-fetched boilerplate (README/LICENSE/jest/tests/lint configs).
 */
export function writeMinimalModule(moduleDir: string, options: WriteMinimalModuleOptions): void {
  const {
    name,
    changes,
    scripts,
    tags = [],
    requires = [],
    version = '0.0.1',
    license = 'CONSTRUCTIVE',
    overwrite = false,
    writePackageJson = true,
  } = options;

  if (fs.existsSync(moduleDir) && fs.readdirSync(moduleDir).length > 0 && !overwrite) {
    throw new Error(`Module directory is not empty: ${moduleDir}. Pass overwrite: true to replace.`);
  }

  for (const dir of SCRIPT_DIRS) {
    fs.mkdirSync(path.join(moduleDir, dir), { recursive: true });
  }

  for (const change of changes) {
    const changeScripts = scripts[change.name];
    if (!changeScripts) {
      throw new Error(`Missing scripts for change "${change.name}" in module "${name}"`);
    }
    fs.writeFileSync(path.join(moduleDir, 'deploy', `${change.name}.sql`), changeScripts.deploy);
    fs.writeFileSync(path.join(moduleDir, 'revert', `${change.name}.sql`), changeScripts.revert);
    fs.writeFileSync(
      path.join(moduleDir, 'verify', `${change.name}.sql`),
      changeScripts.verify ?? `-- Verify ${change.name}\n\nBEGIN;\n\nSELECT 1;\n\nROLLBACK;\n`
    );
  }

  fs.writeFileSync(path.join(moduleDir, 'pgpm.plan'), generatePlanContent(name, changes, tags));
  fs.writeFileSync(path.join(moduleDir, `${name}.control`), generateModuleControl(name, requires, version));
  fs.writeFileSync(path.join(moduleDir, 'Makefile'), generateModuleMakefile(name, version));
  if (writePackageJson) {
    fs.writeFileSync(
      path.join(moduleDir, 'package.json'),
      JSON.stringify({ name, version, description: `${name} module`, license }, null, 2) + '\n'
    );
  }
}

export interface WriteMinimalWorkspaceOptions {
  /** Workspace package globs (default: ['packages/*']) */
  packages?: string[];

  /** Overwrite an existing pgpm.json (default: true) */
  overwrite?: boolean;
}

/**
 * Write the minimal workspace marker (`pgpm.json`) so pgpm discovers the
 * directory as a workspace. This is what `getWorkspacePath` walks up to find.
 */
export function writeMinimalWorkspace(workspaceDir: string, options: WriteMinimalWorkspaceOptions = {}): void {
  const { packages = ['packages/*'], overwrite = true } = options;
  const configPath = path.join(workspaceDir, 'pgpm.json');
  if (fs.existsSync(configPath) && !overwrite) return;
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ packages }, null, 2) + '\n');
}

/**
 * Full extension control file, matching the shape `pgpm init` emits (comment,
 * default_version, module_pathname, requires, relocatable, superuser).
 */
export function generateModuleControl(name: string, requires: string[] = [], version = '0.0.1'): string {
  let content = `# ${name} extension\n`;
  content += `comment = '${name} extension'\n`;
  content += `default_version = '${version}'\n`;
  content += `module_pathname = '$libdir/${name}'\n`;
  if (requires.length > 0) {
    content += `requires = '${requires.join(',')}'\n`;
  }
  content += `relocatable = false\n`;
  content += `superuser = false\n`;
  return content;
}

/**
 * PGXS Makefile for `pgpm package`/`make install`.
 */
export function generateModuleMakefile(name: string, version = '0.0.1'): string {
  return (
    `EXTENSION = ${name}\n` +
    `DATA = sql/${name}--${version}.sql\n\n` +
    `PG_CONFIG = pg_config\n` +
    `PGXS := $(shell $(PG_CONFIG) --pgxs)\n` +
    `include $(PGXS)\n`
  );
}
