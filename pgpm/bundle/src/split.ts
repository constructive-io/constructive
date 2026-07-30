import { hashString } from '@pgpmjs/ast';
import { parsePlanContent } from '@pgpmjs/ast/files/plan/parser';
import { generatePlanFileContent } from '@pgpmjs/ast/files/plan/writer';
import { parsePgpmHeader, renameInHeader, writePgpmScript } from '@pgpmjs/ast/files/sql/header';
import { Change, ExtendedPlanFile } from '@pgpmjs/ast/files/types';

import { computeBundleDigest, computeChangeDigest } from './create';
import { BundleChange, BundleScript, MigrationBundle } from './types';

/**
 * Options for {@link splitBundle}.
 */
export interface SplitBundleOptions {
  /**
   * Change names that must be materialized per tenant (typically the
   * `perTenant` set computed by `@pgpmjs/slice`'s `partitionModule`). Every
   * other change in the bundle is treated as shared.
   */
  perTenantChanges: Iterable<string>;
  /** Module name for the shared bundle (deployed once, reused by all tenants). */
  sharedName: string;
  /** Module name for the per-tenant bundle. */
  perTenantName: string;
}

/**
 * The two bundles a {@link splitBundle} produces.
 */
export interface SplitBundleResult {
  /** Tenant-independent changes, as their own deployable module. */
  shared: MigrationBundle;
  /**
   * Per-tenant changes, as their own module. Dependencies that pointed at a
   * shared change are rewritten to cross-module references
   * (`<sharedName>:<change>`), and the shared module is added to the control
   * `requires` so it deploys first.
   */
  perTenant: MigrationBundle;
}

/** Cross-module rewrite context handed to {@link buildSubBundle}. */
interface CrossModuleRefs {
  sharedName: string;
  isShared: (change: string) => boolean;
}

/**
 * Split a {@link MigrationBundle} into a shared bundle and a per-tenant bundle
 * along a change-level partition (see `@pgpmjs/slice`).
 *
 * Pure and deterministic (no I/O). The shared changes keep their identity and
 * become a module deployed once; the per-tenant changes become a second module
 * whose references to shared changes are rewritten into cross-module
 * (`<sharedName>:<change>`) dependencies — in both the plan and each script's
 * `-- requires:` header — with the shared module added to its control
 * `requires`. Digests are recomputed so both bundles are independently
 * verifiable.
 *
 * @throws when a per-tenant name is not in the bundle, or when a shared change
 * depends on a per-tenant change (an unsound partition — a shared object must
 * never require tenant-specific state).
 */
export function splitBundle(
  bundle: MigrationBundle,
  options: SplitBundleOptions
): SplitBundleResult {
  const perTenant = new Set(options.perTenantChanges);
  const names = new Set(bundle.changes.map(c => c.name));
  for (const name of perTenant) {
    if (!names.has(name)) {
      throw new Error(`splitBundle: per-tenant change "${name}" is not in the bundle`);
    }
  }

  const isShared = (name: string): boolean => !perTenant.has(name);

  for (const change of bundle.changes) {
    if (!isShared(change.name)) continue;
    for (const dep of change.dependencies) {
      if (perTenant.has(dep)) {
        throw new Error(
          `splitBundle: shared change "${change.name}" depends on per-tenant change "${dep}"; ` +
            `a shared object cannot require tenant-specific state (unsound partition)`
        );
      }
    }
  }

  const shared = buildSubBundle(bundle, isShared, options.sharedName, null);
  const perTenantBundle = buildSubBundle(
    bundle,
    name => perTenant.has(name),
    options.perTenantName,
    { sharedName: options.sharedName, isShared }
  );

  return { shared, perTenant: perTenantBundle };
}

/** Build one side of the split: the changes matching `include`, as a module. */
function buildSubBundle(
  bundle: MigrationBundle,
  include: (name: string) => boolean,
  moduleName: string,
  cross: CrossModuleRefs | null
): MigrationBundle {
  // Rename map applied to per-tenant scripts: a bare reference to a shared
  // change becomes a cross-module reference `<sharedName>:<change>`.
  const crossRename = cross
    ? new Map(
        bundle.changes
          .filter(c => cross.isShared(c.name))
          .map(c => [c.name, `${cross.sharedName}:${c.name}`])
      )
    : null;

  const changes: BundleChange[] = bundle.changes
    .filter(c => include(c.name))
    .map(change => {
      const dependencies = change.dependencies.map(dep =>
        cross && cross.isShared(dep) ? `${cross.sharedName}:${dep}` : dep
      );
      const rewrite = (script: BundleScript | null): BundleScript | null => {
        if (!script) return null;
        if (!crossRename || crossRename.size === 0) return script;
        const parsed = parsePgpmHeader(script.sql);
        if (renameInHeader(parsed, crossRename) === 0) return script;
        const sql = writePgpmScript(parsed);
        return { kind: script.kind, sql, digest: hashString(sql) };
      };
      const deploy = rewrite(change.deploy);
      const revert = rewrite(change.revert);
      const verify = rewrite(change.verify);
      const digest = computeChangeDigest(change.name, {
        deploy: deploy?.digest,
        revert: revert?.digest,
        verify: verify?.digest
      });
      return { name: change.name, dependencies, deploy, revert, verify, digest };
    });

  const plan = buildPlan(bundle.plan, moduleName, include, cross);

  let control = bundle.control
    ? { fileName: `${moduleName}.control`, content: bundle.control.content }
    : null;
  if (control && cross) {
    control = { fileName: control.fileName, content: addControlRequire(control.content, cross.sharedName) };
  }

  const digest = computeBundleDigest(
    plan,
    control?.content ?? null,
    changes.map(c => c.digest)
  );

  return {
    manifest: {
      formatVersion: bundle.manifest.formatVersion,
      name: moduleName,
      createdWith: bundle.manifest.createdWith,
      changeCount: changes.length,
      deployOrder: changes.map(c => c.name),
      digest,
      provenance: {
        ...(bundle.manifest.provenance ?? {}),
        splitFrom: bundle.manifest.name
      }
    },
    plan,
    control,
    changes
  };
}

/**
 * Rebuild a plan for one side of the split: keep only the included changes (and
 * their tags), rewrite the project identity, and cross-reference shared
 * dependencies for the per-tenant side.
 */
function buildPlan(
  planContent: string,
  moduleName: string,
  include: (name: string) => boolean,
  cross: CrossModuleRefs | null
): string {
  const parsed = parsePlanContent(planContent);
  if (!parsed.data) {
    const detail = parsed.errors?.map(e => `Line ${e.line}: ${e.message}`).join('; ') || 'unknown';
    throw new Error(`splitBundle: could not parse source plan: ${detail}`);
  }
  const source = parsed.data;

  const changes: Change[] = source.changes
    .filter(c => include(c.name))
    .map(c => ({
      ...c,
      dependencies: (c.dependencies ?? []).map(dep =>
        cross && cross.isShared(dep) ? `${cross.sharedName}:${dep}` : dep
      )
    }));

  const kept = new Set(changes.map(c => c.name));
  const tags = source.tags.filter(t => kept.has(t.change));

  const plan: ExtendedPlanFile = {
    ...source,
    package: moduleName,
    uri: moduleName,
    changes,
    tags
  };

  return generatePlanFileContent(plan);
}

/**
 * Add a module to a `.control` file's comma-separated `requires`, creating the
 * line when absent. Idempotent — an already-present requirement is left alone.
 */
function addControlRequire(content: string, requireName: string): string {
  const lines = content.split('\n');
  const idx = lines.findIndex(l => /^\s*requires\s*=/.test(l));
  if (idx === -1) {
    return `${content.replace(/\n?$/, '\n')}requires = '${requireName}'\n`;
  }
  const match = lines[idx].match(/^(\s*requires\s*=\s*')([^']*)(')(.*)$/);
  if (!match) return content;
  const existing = match[2]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (existing.includes(requireName)) return content;
  existing.push(requireName);
  lines[idx] = `${match[1]}${existing.join(',')}${match[3]}${match[4]}`;
  return lines.join('\n');
}
