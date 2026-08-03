import { verifyBundle } from '@pgpmjs/bundle';
import { execFileSync } from 'child_process';
import { changedFiles as gitChangedFiles, resolveBase as resolveChangedBase } from 'git-changed';
import { isAbsolute, relative, resolve as resolvePath } from 'path';

import {
  bundleMatchesModule,
  readBundleArtifact,
  resolveBundleArtifactPath,
} from '../bundle/artifact';
import { PgpmPackage } from '../core/class/pgpm';

/**
 * Why a module's committed bundle artifact no longer describes its `deploy/`.
 *
 * - `missing-artifact`  — no `sql/<name>--<version>.bundle.tar.gz` at all.
 * - `unreadable-artifact` — the archive exists but could not be opened/parsed.
 * - `integrity`         — the artifact is internally inconsistent (`verifyBundle`).
 * - `out-of-sync`       — the artifact is valid but its plan/per-change bytes no
 *                         longer match the files under `deploy/` (`bundleMatchesModule`).
 */
export type DriftReason =
  | 'missing-artifact'
  | 'unreadable-artifact'
  | 'integrity'
  | 'out-of-sync';

export interface ModuleDrift {
  name: string;
  moduleDir: string;
  reason: DriftReason;
  detail: string;
}

export interface ModuleRef {
  name: string;
  dir: string;
}

export interface PackageCheckOptions {
  cwd?: string;
  /**
   * Git ref/branch/tag to diff `HEAD` against for change detection. When
   * omitted, the base is auto-detected: `origin/$GITHUB_BASE_REF` in a PR,
   * otherwise the repository's default branch, falling back to working-tree
   * changes only when neither is available.
   */
  since?: string;
  /** Check every module in the workspace, skipping git change detection. */
  all?: boolean;
  /**
   * Stop at the first drifted module (default `true`). Set `false` to report
   * every drifted module in one pass.
   */
  failFast?: boolean;
  /**
   * Also re-check modules that (transitively) `require` a changed module.
   * Off by default: a module's packaged SQL/bundle reflects only its own
   * `deploy/` files (`resolveWithPlan`), so a dependency's change does not
   * alter a dependent's artifact. Exposed for completeness/paranoia.
   */
  dependents?: boolean;
}

export interface PackageCheckResult {
  /** Module names selected for verification (before fail-fast truncation). */
  targeted: string[];
  /** Module names that were actually verified (fail-fast may stop early). */
  checked: string[];
  /** Modules whose committed artifact no longer matches `deploy/`. */
  drifted: ModuleDrift[];
  /** The git ref used for change detection, if any. */
  base?: string;
  /** Module names detected as directly changed (before dependent expansion). */
  changedModules: string[];
}

/**
 * Verify a single module's committed bundle artifact against its `deploy/`.
 *
 * Cheap by design — read + sha256 only, no SQL parse/deparse and no DDL — so it
 * is safe to run in CI on every push. Returns `null` when the artifact is in
 * sync, or a {@link ModuleDrift} describing the first problem found.
 */
export function checkModuleArtifact(moduleDir: string, name: string): ModuleDrift | null {
  const artifactPath = resolveBundleArtifactPath(moduleDir);
  if (!artifactPath) {
    return {
      name,
      moduleDir,
      reason: 'missing-artifact',
      detail: 'no sql/<name>--<version>.bundle.tar.gz — run `pgpm package`',
    };
  }

  const bundle = readBundleArtifact(moduleDir);
  if (!bundle) {
    return {
      name,
      moduleDir,
      reason: 'unreadable-artifact',
      detail: `could not read ${artifactPath} — re-run \`pgpm package\``,
    };
  }

  const issues = verifyBundle(bundle);
  if (issues.length) {
    return {
      name,
      moduleDir,
      reason: 'integrity',
      detail: `bundle integrity check failed: ${issues.map((i) => i.message).join('; ')}`,
    };
  }

  if (!bundleMatchesModule(moduleDir, bundle)) {
    return {
      name,
      moduleDir,
      reason: 'out-of-sync',
      detail: 'committed bundle does not match deploy/ — run `pgpm package`',
    };
  }

  return null;
}

/**
 * Resolve the git ref to diff against. Explicit `--since` wins; otherwise the
 * PR base branch when running in GitHub Actions; otherwise the repository's
 * default branch. `undefined` means there is nothing to diff against — a
 * shallow or detached checkout — and only the working tree is inspected.
 */
export function resolveBase(since?: string, cwd: string = process.cwd()): string | undefined {
  return resolveChangedBase(since, cwd);
}

/**
 * Collect the set of changed files: committed changes since the **merge base**
 * with `base`, unioned with uncommitted and untracked working-tree changes.
 *
 * Returns absolute paths, including paths that no longer exist — deleting a
 * `deploy/` file makes a module's bundle stale exactly as much as editing one,
 * so the deletion has to reach {@link mapFilesToModules}.
 */
export function changedFiles(cwd: string, base?: string): string[] {
  // `base: false` when there is no base: the ref is resolved by the caller, and
  // git-changed would otherwise resolve one of its own.
  return gitChangedFiles({ cwd, base: base ?? false, existingOnly: false }).paths;
}

function refExists(ref: string, cwd: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', ref], {
      cwd,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/** Enumerate the modules to consider — the whole workspace, or the single module. */
export function enumerateModules(pkg: PgpmPackage): ModuleRef[] {
  const wsPath = pkg.getWorkspacePath();
  if (wsPath) {
    const map = pkg.getModuleMap();
    return Object.entries(map).map(([name, m]) => ({
      name,
      dir: resolvePath(wsPath, m.path),
    }));
  }
  if (pkg.isInModule()) {
    return [{ name: pkg.getModuleName(), dir: pkg.getModulePath()! }];
  }
  return [];
}

/** Map changed file paths to the owning module (longest matching module dir). */
export function mapFilesToModules(files: string[], modules: ModuleRef[]): string[] {
  const hit = new Set<string>();
  for (const file of files) {
    let best: ModuleRef | undefined;
    for (const mod of modules) {
      const rel = relative(mod.dir, file);
      if (rel.startsWith('..') || isAbsolute(rel)) continue;
      if (!best || mod.dir.length > best.dir.length) best = mod;
    }
    if (best) hit.add(best.name);
  }
  return [...hit];
}

/** Expand a set of module names to include everything that transitively requires them. */
export function addDependents(names: Set<string>, pkg: PgpmPackage): void {
  const map = pkg.getModuleMap();
  const reverse = new Map<string, string[]>();
  for (const [name, m] of Object.entries(map)) {
    for (const req of m.requires ?? []) {
      if (!reverse.has(req)) reverse.set(req, []);
      reverse.get(req)!.push(name);
    }
  }
  const queue = [...names];
  while (queue.length) {
    const current = queue.shift()!;
    for (const dependent of reverse.get(current) ?? []) {
      if (!names.has(dependent)) {
        names.add(dependent);
        queue.push(dependent);
      }
    }
  }
}

/**
 * Verify that committed bundle artifacts are in sync with `deploy/` for the
 * modules that changed (per git), failing fast on the first drift by default.
 *
 * This is the engine behind `pgpm package --check`: change detection + workspace
 * mapping + the cheap per-module artifact verification, so CI can gate every PR
 * with a one-liner and only pay for the modules that actually changed.
 */
export async function checkPackages(
  options: PackageCheckOptions = {}
): Promise<PackageCheckResult> {
  const cwd = options.cwd ?? process.cwd();
  const failFast = options.failFast ?? true;
  const pkg = new PgpmPackage(cwd);
  const modules = enumerateModules(pkg);
  const byName = new Map(modules.map((m) => [m.name, m]));

  let base: string | undefined;
  let changedModules: string[] = [];
  let targetNames: string[];

  if (options.all) {
    targetNames = modules.map((m) => m.name);
  } else {
    base = resolveBase(options.since, cwd);
    if (options.since && !refExists(options.since, cwd)) {
      throw new Error(
        `Could not diff against '${options.since}'. Ensure the ref exists locally ` +
          '(e.g. `git fetch origin`).'
      );
    }
    changedModules = mapFilesToModules(changedFiles(cwd, base), modules);
    const set = new Set(changedModules);
    if (options.dependents && pkg.getWorkspacePath()) addDependents(set, pkg);
    targetNames = [...set];
  }

  const checked: string[] = [];
  const drifted: ModuleDrift[] = [];
  for (const name of targetNames) {
    const mod = byName.get(name);
    if (!mod) continue;
    checked.push(name);
    const drift = checkModuleArtifact(mod.dir, name);
    if (drift) {
      drifted.push(drift);
      if (failFast) break;
    }
  }

  return { targeted: targetNames, checked, drifted, base, changedModules };
}
