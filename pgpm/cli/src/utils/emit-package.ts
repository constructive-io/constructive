/**
 * Shared module emission for the dials commands (`pgpm transform`,
 * `pgpm import`): write a package directory with a `.control` file,
 * `pgpm.plan`, and deploy/revert/verify trees from PgpmRows.
 */
import { PgpmRow, SqlWriteOptions, writePgpmFiles, writePgpmPlan } from '@pgpmjs/core';
import * as fs from 'fs';
import * as path from 'path';

export interface EmitPackage {
  /** Package (module) name. */
  name: string;
  /** Module names this package requires (control-file names). */
  requires: string[];
  /** Changes in plan order. */
  rows: PgpmRow[];
}

export const writeControlFile = (dir: string, name: string, requires: string[]): void => {
  const lines = [
    `# ${name} extension`,
    `comment = '${name} extension'`,
    `default_version = '0.0.1'`,
    `relocatable = false`,
    `superuser = false`
  ];
  if (requires.length) {
    lines.push(`requires = '${requires.join(',')}'`);
  }
  fs.writeFileSync(path.join(dir, `${name}.control`), lines.join('\n') + '\n');
};

export const writePackage = (
  outBase: string,
  pkg: EmitPackage,
  extraRequires: string[] = []
): string => {
  const dir = path.join(outBase, pkg.name);
  fs.rmSync(path.join(dir, 'deploy'), { recursive: true, force: true });
  fs.rmSync(path.join(dir, 'revert'), { recursive: true, force: true });
  fs.rmSync(path.join(dir, 'verify'), { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  writeControlFile(dir, pkg.name, [...extraRequires, ...pkg.requires]);

  const opts: SqlWriteOptions = {
    outdir: outBase,
    name: pkg.name,
    replacer: (str: string) => str.split('constructive-extension-name').join(pkg.name)
  };
  writePgpmPlan(pkg.rows, opts);
  writePgpmFiles(pkg.rows, opts);
  return dir;
};

/**
 * Guard against clobbering: writing into the source directory requires
 * `--write`, as does overwriting any existing package directory.
 */
export const checkOverwrite = (
  targetDir: string,
  sourcePath: string,
  write: boolean
): string | null => {
  const resolvedTarget = path.resolve(targetDir);
  const resolvedSource = path.resolve(sourcePath);
  if (resolvedTarget === resolvedSource && !write) {
    return `Refusing to overwrite the source module at ${resolvedSource} (pass --write to allow).`;
  }
  if (resolvedTarget !== resolvedSource && fs.existsSync(resolvedTarget) && !write) {
    return `Output directory ${resolvedTarget} already exists (pass --write to overwrite).`;
  }
  return null;
};
