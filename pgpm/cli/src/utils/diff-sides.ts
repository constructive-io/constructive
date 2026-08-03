/**
 * Diff-side loading that needs `@pgpmjs/core`: pgpm workspaces (module-map
 * resolution) and live-database ledgers (`pgpm_migrate`).
 *
 * `@pgpmjs/diff` owns the pure seams — side classification, workspace
 * flattening, ledger classification/backfill — but cannot depend on `core`
 * (core depends on transform, and diff sits beside it). These loaders are the
 * thin I/O adapters that feed those seams.
 */
import { hashSqlFile, hashString, PgpmMigrate,PgpmPackage } from '@pgpmjs/core';
import type { DiffSide, LedgerChangeRecord, PlanChangeRef } from '@pgpmjs/diff';
import { workspaceModulesToDiffChanges } from '@pgpmjs/diff';
import type { ModuleSource } from '@pgpmjs/transform';
import { loadModuleSource } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';
import type { PgConfig } from 'pg-env';

/**
 * Load every local module of a pgpm workspace, in cross-module dependency
 * order, as `ModuleSource`s. External extensions (installed Postgres
 * extensions, not local modules) are skipped: they are not part of the
 * workspace's authored schema.
 */
export const loadWorkspaceModules = async (
  workspaceDir: string
): Promise<{ modules: ModuleSource[]; warnings: string[] }> => {
  const pkg = new PgpmPackage(path.resolve(workspaceDir));
  const moduleMap = pkg.getModuleMap();
  const { resolved, external } = await pkg.resolveWorkspaceExtensionDependencies();

  const warnings: string[] = [];
  const modules: ModuleSource[] = [];
  for (const name of resolved) {
    if (external.includes(name)) continue;
    const entry = moduleMap[name];
    if (!entry) {
      warnings.push(`${name}: resolved module is not in the workspace module map; skipped`);
      continue;
    }
    const moduleDir = path.resolve(pkg.workspacePath!, entry.path);
    if (!fs.existsSync(path.join(moduleDir, 'pgpm.plan'))) {
      warnings.push(`${name}: no pgpm.plan (proxy or apply-spec module); skipped`);
      continue;
    }
    const source = loadModuleSource(moduleDir);
    warnings.push(...source.warnings.map(w => `${name}: ${w}`));
    modules.push(source);
  }
  return { modules, warnings };
};

/** Load a pgpm workspace directory as a flattened diff side. */
export const loadWorkspaceSide = async (workspaceDir: string): Promise<DiffSide> => {
  const resolved = path.resolve(workspaceDir);
  const { modules, warnings } = await loadWorkspaceModules(resolved);
  return {
    kind: 'workspace',
    label: path.basename(resolved),
    changes: workspaceModulesToDiffChanges(modules),
    warnings
  };
};

/**
 * Candidate hashes for every plan entry of a set of workspace modules: the
 * raw-content hash (what `pgpm deploy` records by default) and the AST hash
 * (what `DEPLOYMENT_HASH_METHOD=ast` records — formatting- and comment-proof).
 * A ledger row matches when it recorded either.
 */
export const planChangeRefs = async (
  modules: ModuleSource[]
): Promise<PlanChangeRef[]> => {
  const refs: PlanChangeRef[] = [];
  for (const mod of modules) {
    for (const change of mod.changes) {
      const deployPath = path.join(mod.modulePath, 'deploy', `${change.name}.sql`);
      const hashes: string[] = [];
      if (fs.existsSync(deployPath)) {
        hashes.push(hashString(fs.readFileSync(deployPath, 'utf-8')));
        hashes.push(await hashSqlFile(deployPath));
      }
      refs.push({
        package: mod.name,
        name: change.name,
        hashes,
        dependencies: change.dependencies
      });
    }
  }
  return refs;
};

/** Read a live database's `pgpm_migrate` ledger as a snapshot. */
export const loadLedger = async (config: PgConfig): Promise<LedgerChangeRecord[]> => {
  const client = new PgpmMigrate(config);
  const rows = await client.readDeployedState();
  return rows.map(row => ({
    package: row.package,
    changeName: row.changeName,
    scriptHash: row.scriptHash,
    deployedAt: row.deployedAt,
    requires: row.requires
  }));
};
