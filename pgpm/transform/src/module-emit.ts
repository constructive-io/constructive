/**
 * Module emission — the single seam every dials command renders through.
 *
 * The engine (semantic diff, granularity, partition) produces plan-ordered
 * {@link PgpmRow}s; a {@link PgpmModuleModel} is just those rows plus the
 * module's name and control-file requires. `writeModule` is the one writer
 * that turns a model into an on-disk pgpm module (`.control` + `pgpm.plan` +
 * deploy/revert/verify trees) — so `pgpm diff`, `pgpm transform`, and
 * `pgpm import` all emit byte-identical module layouts instead of each
 * carrying its own copy of the writer.
 */
import { PgpmRow, SqlWriteOptions, writePgpmFiles, writePgpmPlan } from '@pgpmjs/ast';
import * as fs from 'fs';
import * as path from 'path';

/**
 * A pgpm module as an in-memory value: a name, the extensions it requires
 * (control-file names), and its changes in plan order. `writeModule` and the
 * other projections (linear SQL, bundle) are pure functions of this model.
 */
export interface PgpmModuleModel {
  /** Package (module) name. */
  name: string;
  /** Module names this package requires (control-file names). */
  requires: string[];
  /** Changes in plan order. */
  rows: PgpmRow[];
}

/** Write a module's Postgres extension `.control` file. */
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

/**
 * Write a {@link PgpmModuleModel} to `<outBase>/<name>` as a full pgpm module:
 * a `.control` file, `pgpm.plan`, and deploy/revert/verify script trees.
 * The deploy/revert/verify directories are cleared first so a re-emit never
 * leaves stale scripts behind. Returns the module directory.
 */
export const writeModule = (
  outBase: string,
  model: PgpmModuleModel,
  extraRequires: string[] = []
): string => {
  const dir = path.join(outBase, model.name);
  fs.rmSync(path.join(dir, 'deploy'), { recursive: true, force: true });
  fs.rmSync(path.join(dir, 'revert'), { recursive: true, force: true });
  fs.rmSync(path.join(dir, 'verify'), { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  writeControlFile(dir, model.name, [...extraRequires, ...model.requires]);

  const opts: SqlWriteOptions = {
    outdir: outBase,
    name: model.name,
    replacer: (str: string) => str.split('constructive-extension-name').join(model.name)
  };
  writePgpmPlan(model.rows, opts);
  writePgpmFiles(model.rows, opts);
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
