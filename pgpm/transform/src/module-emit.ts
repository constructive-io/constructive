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
import {
  parseAuthor,
  parsePlanFile,
  PgpmRow,
  SqlWriteOptions,
  writePgpmFiles,
  writePgpmPlan,
  writePlanFile
} from '@pgpmjs/ast';
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

/** Result of appending changes into an existing module (see {@link appendModule}). */
export interface AppendModuleResult {
  /** The module directory that was appended to. */
  dir: string;
  /** Change names that were added to the plan. */
  added: string[];
  /** Change names skipped because they already exist in the plan. */
  skipped: string[];
  /** Non-fatal notices (skips, dropped dangling dependencies). */
  warnings: string[];
}

/**
 * Append plan-ordered {@link PgpmRow}s into an *existing* module rather than
 * writing a fresh package. Existing changes, their scripts, and the `.control`
 * file are left untouched; only the new changes are written (deploy/revert/
 * verify) and appended to `pgpm.plan` after the current changes.
 *
 * Rows whose change name already exists are skipped (never overwritten).
 * A new change's dependency bracket is filtered to names that resolve within
 * the plan (existing changes, other appended changes, or `pkg:`-external
 * references); a dangling internal dependency is dropped with a warning
 * (plan order still sequences it after the current changes).
 */
export const appendModule = (
  moduleDir: string,
  rows: PgpmRow[],
  options: { author?: string } = {}
): AppendModuleResult => {
  const planPath = path.join(moduleDir, 'pgpm.plan');
  if (!fs.existsSync(planPath)) {
    throw new Error(
      `No pgpm.plan found at ${planPath}; append mode expects an existing pgpm module directory.`
    );
  }

  const parsed = parsePlanFile(planPath);
  if (!parsed.data) {
    throw new Error(
      `Failed to parse ${planPath}: ${parsed.errors
        .map(e => `line ${e.line}: ${e.message}`)
        .join('; ')}`
    );
  }
  const plan = parsed.data;

  const existingNames = new Set(plan.changes.map(c => c.name));
  const incomingNames = new Set(rows.map(r => r.deploy));
  const appended = new Set<string>();
  const added: string[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];
  const newRows: PgpmRow[] = [];

  const { fullName, email } = parseAuthor(options.author || 'constructive');
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  for (const row of rows) {
    if (existingNames.has(row.deploy) || appended.has(row.deploy)) {
      skipped.push(row.deploy);
      warnings.push(`change ${row.deploy} already exists in ${plan.package}; left untouched`);
      continue;
    }
    const deps = (row.deps ?? []).filter(dep => {
      if (dep.includes(':')) return true; // cross-package (pkg:change) external
      if (existingNames.has(dep) || incomingNames.has(dep)) return true;
      warnings.push(`change ${row.deploy}: dropped dependency ${dep} (not present in ${plan.package})`);
      return false;
    });
    plan.changes.push({
      name: row.deploy,
      dependencies: deps,
      timestamp,
      planner: fullName,
      email: email || `${fullName}@constructive.io`,
      comment: `add ${row.name ?? row.deploy}`
    });
    newRows.push({ ...row, deps });
    appended.add(row.deploy);
    added.push(row.deploy);
  }

  if (newRows.length) {
    const opts: SqlWriteOptions = {
      outdir: path.dirname(moduleDir),
      name: path.basename(moduleDir),
      replacer: (str: string) => str
    };
    writePgpmFiles(newRows, opts);
    writePlanFile(planPath, plan);
  }

  return { dir: moduleDir, added, skipped, warnings };
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
