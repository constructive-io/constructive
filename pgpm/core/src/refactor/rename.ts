import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join, relative, sep } from 'path';

import { parsePlanFileSimple } from '@pgpmjs/ast/files/plan/parser';
import { parsePgpmHeader, renameInHeader, writePgpmScript } from '@pgpmjs/ast/files/sql/header';
import { renameInPlanContent } from '@pgpmjs/ast/plan-rename';

// Re-exported from @pgpmjs/ast so existing `@pgpmjs/core` consumers keep importing it here.
export { renameInPlanContent };

const SCRIPT_DIRS = ['deploy', 'revert', 'verify'] as const;

/**
 * Options for {@link renameChanges}.
 */
export interface RenameChangesOptions {
  /** Report planned operations without touching the filesystem. Default: false */
  dryRun?: boolean;
}

/**
 * Result of a {@link renameChanges} run.
 */
export interface RenameChangesResult {
  /** deploy/revert/verify script files moved (old path -> new path, module-relative). */
  filesMoved: Array<{ from: string; to: string }>;
  /** Script files whose headers were rewritten (identity and/or requires). */
  headersRewritten: string[];
  /** Whether pgpm.plan was rewritten. */
  planRewritten: boolean;
  /** Dry-run report lines (only populated when dryRun). */
  dryRunReport?: string[];
}

function escapeRe(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSqlFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findSqlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.sql')) {
      files.push(fullPath);
    }
  }
  return files;
}

function removeEmptyDirs(dir: string, stopAt: string): void {
  let current = dir;
  while (current !== stopAt && current.startsWith(stopAt)) {
    if (!existsSync(current) || readdirSync(current).length > 0) return;
    rmdirSync(current);
    current = dirname(current);
  }
}

/**
 * Validate a rename map against a module directory: every source change must
 * exist in the plan, no target may collide with an existing change, and no
 * two sources may map to the same target.
 *
 * @throws on any violation.
 */
export function validateRenames(moduleDir: string, renames: Map<string, string>): void {
  const planPath = join(moduleDir, 'pgpm.plan');
  const plan = parsePlanFileSimple(planPath);
  const changeNames = new Set(plan.changes.map(c => c.name));

  const targets = new Set<string>();
  for (const [from, to] of renames) {
    if (from === to) {
      throw new Error(`Rename maps change to itself: ${from}`);
    }
    if (!changeNames.has(from)) {
      throw new Error(`Cannot rename unknown change: ${from}`);
    }
    if (changeNames.has(to) && !renames.has(to)) {
      throw new Error(`Rename target already exists in plan: ${to}`);
    }
    if (targets.has(to)) {
      throw new Error(`Multiple changes rename to the same target: ${to}`);
    }
    targets.add(to);
  }
}

/**
 * Atomically rename/move changes within a pgpm module: the coupled 4-way
 * rewrite of (1) deploy/revert/verify script files on disk, (2) the moved
 * scripts' own header identity, (3) `-- requires:` headers in every script
 * that references a renamed change, and (4) the pgpm.plan.
 *
 * SQL statement bodies are NOT touched: schema-name rewrites inside SQL are a
 * separate AST-level concern for callers to compose (e.g. transform passes).
 */
export function renameChanges(
  moduleDir: string,
  renames: Map<string, string>,
  options: RenameChangesOptions = {}
): RenameChangesResult {
  const dryRun = options.dryRun ?? false;
  const result: RenameChangesResult = {
    filesMoved: [],
    headersRewritten: [],
    planRewritten: false
  };
  if (dryRun) result.dryRunReport = [];

  if (renames.size === 0) return result;
  validateRenames(moduleDir, renames);

  // 1. Move script files
  for (const scriptDir of SCRIPT_DIRS) {
    for (const [from, to] of renames) {
      const oldPath = join(moduleDir, scriptDir, `${from}.sql`);
      if (!existsSync(oldPath) || !statSync(oldPath).isFile()) continue;
      const newPath = join(moduleDir, scriptDir, `${to}.sql`);
      if (existsSync(newPath)) {
        throw new Error(`Rename target file already exists: ${relative(moduleDir, newPath)}`);
      }
      if (dryRun) {
        result.dryRunReport!.push(`Would move: ${relative(moduleDir, oldPath)} -> ${relative(moduleDir, newPath)}`);
      } else {
        mkdirSync(dirname(newPath), { recursive: true });
        renameSync(oldPath, newPath);
        removeEmptyDirs(dirname(oldPath), join(moduleDir, scriptDir));
      }
      result.filesMoved.push({
        from: [scriptDir, `${from}.sql`].join(sep),
        to: [scriptDir, `${to}.sql`].join(sep)
      });
    }
  }

  // 2 + 3. Rewrite headers in every script (identity of moved files,
  // requires of dependents)
  for (const scriptDir of SCRIPT_DIRS) {
    const dir = join(moduleDir, scriptDir);
    for (const file of findSqlFiles(dir)) {
      const content = readFileSync(file, 'utf-8');
      const script = parsePgpmHeader(content);
      const count = renameInHeader(script, renames);
      if (count === 0) continue;
      const rewritten = writePgpmScript(script);
      if (rewritten === content) continue;
      if (dryRun) {
        result.dryRunReport!.push(`Would rewrite header: ${relative(moduleDir, file)}`);
      } else {
        writeFileSync(file, rewritten);
      }
      result.headersRewritten.push(relative(moduleDir, file));
    }
  }

  // In dry-run mode files were not moved, so dependents' headers are found at
  // their original paths above; the moved files' own headers are still
  // reported through the same scan.

  // 4. Rewrite pgpm.plan
  const planPath = join(moduleDir, 'pgpm.plan');
  const planContent = readFileSync(planPath, 'utf-8');
  const newPlanContent = renameInPlanContent(planContent, renames);
  if (newPlanContent !== planContent) {
    if (dryRun) {
      result.dryRunReport!.push('Would rewrite: pgpm.plan');
    } else {
      writeFileSync(planPath, newPlanContent);
    }
    result.planRewritten = true;
  }

  return result;
}

/**
 * Derive a change rename map from a schema mapping (old schema name -> new
 * schema name) by rewriting the `schemas/<name>/` path segment of every plan
 * change that lives under a renamed schema.
 *
 * This is the module-level counterpart of directory-based schema renames:
 * `schemas/my-app/tables/users` with mapping `my-app -> my_app` yields
 * `schemas/my_app/tables/users`.
 */
export function deriveRenamesFromSchemaMapping(
  moduleDir: string,
  schemaMapping: Map<string, string>
): Map<string, string> {
  const renames = new Map<string, string>();
  const planPath = join(moduleDir, 'pgpm.plan');
  const plan = parsePlanFileSimple(planPath);
  const schemas = Array.from(schemaMapping.keys()).sort((a, b) => b.length - a.length);

  for (const change of plan.changes) {
    let renamed = change.name;
    for (const schema of schemas) {
      const to = schemaMapping.get(schema);
      if (!to || to === schema) continue;
      const re = new RegExp(`(^|/)(schemas/)${escapeRe(schema)}(/|$)`, 'g');
      renamed = renamed.replace(re, `$1$2${to}$3`);
    }
    if (renamed !== change.name) {
      renames.set(change.name, renamed);
    }
  }
  return renames;
}
