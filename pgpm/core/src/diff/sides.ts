/**
 * Diff-side loading: turn a side spec — module directory, workspace
 * directory, .sql file, or live database — into the single
 * `DiffInputChange[]` seam the semantic diff consumes.
 *
 * `@pgpmjs/diff` owns the pure normalizations (classification, flattening,
 * SQL wrapping); this module supplies the I/O they need and that only core
 * has: workspace module-map resolution (`PgpmPackage`) and `pg_dump`.
 */
import type { ExtendedPlanFile } from '@pgpmjs/ast';
import { parsePlanFile } from '@pgpmjs/ast';
import type { DiffSide } from '@pgpmjs/diff';
import {
  loadDiffSideFromDisk,
  resolveDiffSideKind,
  sqlToDiffChanges,
  workspaceModulesToDiffChanges
} from '@pgpmjs/diff';
import type { ModuleSource } from '@pgpmjs/transform';
import { loadModuleSource } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';

import { PgpmPackage } from '../core/class/pgpm';
import { dumpSchemaForComparison } from '../dump/pg-dump';
import { databaseSpecLabel, isDatabaseSpec, resolveDatabaseSpec } from '../utils/database-spec';

/** A workspace's local modules, loaded in dependency order. */
export interface WorkspaceModuleSources {
  modules: ModuleSource[];
  warnings: string[];
}

/**
 * Load every local module of a pgpm workspace as a `ModuleSource`, in
 * cross-module dependency order.
 *
 * Ordering and membership come from the same resolver `deploy`/`verify`/
 * `revert` use (`resolveWorkspaceExtensionDependencies`), so a workspace
 * flattens the way it deploys. External extensions (installed Postgres
 * extensions rather than local modules) are not authored schema and are
 * skipped, as are modules without a plan (proxy / apply-spec modules).
 */
export const loadWorkspaceModuleSources = async (
  workspaceDir: string
): Promise<WorkspaceModuleSources> => {
  const pkg = new PgpmPackage(path.resolve(workspaceDir));
  const workspacePath = pkg.getWorkspacePath();
  if (!workspacePath) {
    throw new Error(`${workspaceDir}: not a pgpm workspace (no pgpm.json / pgpm.config.js)`);
  }

  const moduleMap = pkg.getModuleMap();
  const { resolved, external } = await pkg.resolveWorkspaceExtensionDependencies();

  const warnings: string[] = [];

  // First pass: collect the plan-bearing local modules and their parsed plans,
  // keyed by package name (`%project`), so the second pass can resolve
  // cross-package tag dependencies (`pkg:@tag`) against the plan that owns them.
  const eligible: { name: string; moduleDir: string }[] = [];
  const crossPackagePlans = new Map<string, ExtendedPlanFile>();
  for (const name of resolved) {
    if (external.includes(name)) continue;
    const entry = moduleMap[name];
    if (!entry) {
      warnings.push(`${name}: resolved module is not in the workspace module map; skipped`);
      continue;
    }
    const moduleDir = path.resolve(workspacePath, entry.path);
    if (!fs.existsSync(path.join(moduleDir, 'pgpm.plan'))) {
      warnings.push(`${name}: no pgpm.plan (proxy or apply-spec module); skipped`);
      continue;
    }
    eligible.push({ name, moduleDir });
    const parsed = parsePlanFile(path.join(moduleDir, 'pgpm.plan'));
    if (parsed.data) crossPackagePlans.set(parsed.data.package, parsed.data);
  }

  const modules: ModuleSource[] = [];
  for (const { name, moduleDir } of eligible) {
    const source = loadModuleSource(moduleDir, { crossPackagePlans });
    warnings.push(...source.warnings.map(w => `${name}: ${w}`));
    modules.push(source);
  }
  return { modules, warnings };
};

/** Load a pgpm workspace directory as a flattened diff side. */
export const loadWorkspaceSide = async (workspaceDir: string): Promise<DiffSide> => {
  const resolved = path.resolve(workspaceDir);
  const { modules, warnings } = await loadWorkspaceModuleSources(resolved);
  return {
    kind: 'workspace',
    label: path.basename(resolved),
    changes: workspaceModulesToDiffChanges(modules),
    warnings
  };
};

/** Load a live database's schema as a diff side (via `pg_dump`). */
export const loadDatabaseSide = async (spec: string): Promise<DiffSide> => {
  const label = databaseSpecLabel(spec);
  const sql = await dumpSchemaForComparison(resolveDatabaseSpec(spec));
  return { kind: 'database', label, changes: sqlToDiffChanges(sql, label), warnings: [] };
};

/**
 * Load any diff side. Databases are dumped, workspaces are resolved and
 * flattened, and modules / .sql files are read by `@pgpmjs/diff`.
 */
export const loadDiffSide = async (spec: string, cwd: string = process.cwd()): Promise<DiffSide> => {
  if (isDatabaseSpec(spec)) return loadDatabaseSide(spec);
  const resolved = path.resolve(cwd, spec);
  if (resolveDiffSideKind(resolved) === 'workspace') return loadWorkspaceSide(resolved);
  return loadDiffSideFromDisk(resolved);
};

/**
 * The modules behind a plan-bearing side: every local module for a
 * workspace, or the single module for a module directory. Used by ledger
 * classification, which needs plan entries rather than flattened changes.
 */
export const loadPlanSideModules = async (
  spec: string,
  cwd: string = process.cwd()
): Promise<ModuleSource[]> => {
  const resolved = path.resolve(cwd, spec);
  if (resolveDiffSideKind(resolved) === 'workspace') {
    return (await loadWorkspaceModuleSources(resolved)).modules;
  }
  return [loadModuleSource(resolved)];
};
