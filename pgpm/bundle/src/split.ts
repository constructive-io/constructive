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
  /**
   * Extra changes to weave into the per-tenant bundle only, deployed before its
   * own changes. Used for infrastructure the shared module owns in *its* schema
   * but each tenant must also provision in *its* schema — canonically the
   * `CREATE SCHEMA` of the per-tenant target, which a single source
   * schema-creation change cannot express (it lands in the shared module).
   *
   * When a bootstrap declares `replacesShared`, per-tenant dependencies on that
   * shared change are re-pointed at the bootstrap (a local dependency) instead
   * of becoming a cross-module reference — so a per-tenant object depends on
   * *its own* schema, not the shared one.
   */
  perTenantBootstrap?: PerTenantBootstrapChange[];
}

/**
 * A caller-supplied change woven into the per-tenant bundle by
 * {@link splitBundle} (see {@link SplitBundleOptions.perTenantBootstrap}).
 * The caller owns the SQL (e.g. a `CREATE SCHEMA IF NOT EXISTS` transpiled to
 * the per-tenant target); `splitBundle` owns the bundle mechanics (digests,
 * plan entry, deploy order, dependency re-pointing).
 */
export interface PerTenantBootstrapChange {
  /** Change name/path (e.g. `schemas/tenant_a/schema`). */
  name: string;
  /** Local dependencies of the bootstrap change (default: none). */
  dependencies?: string[];
  /** Raw deploy SQL (or null). */
  deploy: string | null;
  /** Raw revert SQL (or null). */
  revert: string | null;
  /** Raw verify SQL (or null). */
  verify: string | null;
  /**
   * A shared change (unprefixed name) that per-tenant changes currently depend
   * on but should instead depend on this bootstrap. Every per-tenant reference
   * to it — dependency arrays, plan deps, and `-- requires:` headers — is
   * rewritten to this bootstrap's local name.
   */
  replacesShared?: string;
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
  /** Bootstrap changes to prepend to the per-tenant side. */
  bootstrap: PerTenantBootstrapChange[];
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

  const bootstrap = options.perTenantBootstrap ?? [];
  for (const b of bootstrap) {
    if (names.has(b.name)) {
      throw new Error(
        `splitBundle: bootstrap change "${b.name}" collides with an existing bundle change`
      );
    }
    if (b.replacesShared !== undefined && !isShared(b.replacesShared)) {
      throw new Error(
        `splitBundle: bootstrap "${b.name}" replaces "${b.replacesShared}", which is not a shared change`
      );
    }
  }

  const shared = buildSubBundle(bundle, isShared, options.sharedName, null);
  const perTenantBundle = buildSubBundle(
    bundle,
    name => perTenant.has(name),
    options.perTenantName,
    { sharedName: options.sharedName, isShared, bootstrap }
  );

  return { shared, perTenant: perTenantBundle };
}

/** Build a {@link BundleChange} from raw bootstrap SQL, computing digests. */
function bootstrapToChange(b: PerTenantBootstrapChange): BundleChange {
  const toScript = (kind: BundleScript['kind'], sql: string | null): BundleScript | null =>
    sql === null ? null : { kind, sql, digest: hashString(sql) };
  const deploy = toScript('deploy', b.deploy);
  const revert = toScript('revert', b.revert);
  const verify = toScript('verify', b.verify);
  return {
    name: b.name,
    dependencies: b.dependencies ?? [],
    deploy,
    revert,
    verify,
    digest: computeChangeDigest(b.name, {
      deploy: deploy?.digest,
      revert: revert?.digest,
      verify: verify?.digest
    })
  };
}

/** Build one side of the split: the changes matching `include`, as a module. */
function buildSubBundle(
  bundle: MigrationBundle,
  include: (name: string) => boolean,
  moduleName: string,
  cross: CrossModuleRefs | null
): MigrationBundle {
  // One rename map for both dependency arrays and `-- requires:` headers on the
  // per-tenant side: a reference to a shared change becomes a cross-module
  // reference `<sharedName>:<change>`, except a change a bootstrap replaces,
  // which is re-pointed at the (local) bootstrap instead.
  const renameMap = cross ? buildRenameMap(bundle, cross) : null;

  const rewriteScript = (script: BundleScript | null): BundleScript | null => {
    if (!script) return null;
    if (!renameMap || renameMap.size === 0) return script;
    const parsed = parsePgpmHeader(script.sql);
    if (renameInHeader(parsed, renameMap) === 0) return script;
    const sql = writePgpmScript(parsed);
    return { kind: script.kind, sql, digest: hashString(sql) };
  };

  const changes: BundleChange[] = bundle.changes
    .filter(c => include(c.name))
    .map(change => {
      const dependencies = change.dependencies.map(dep => renameMap?.get(dep) ?? dep);
      const deploy = rewriteScript(change.deploy);
      const revert = rewriteScript(change.revert);
      const verify = rewriteScript(change.verify);
      const digest = computeChangeDigest(change.name, {
        deploy: deploy?.digest,
        revert: revert?.digest,
        verify: verify?.digest
      });
      return { name: change.name, dependencies, deploy, revert, verify, digest };
    });

  // Bootstrap changes deploy before the tenant's own changes.
  const bootstrapChanges = (cross?.bootstrap ?? []).map(bootstrapToChange);
  const allChanges = [...bootstrapChanges, ...changes];

  const plan = buildPlan(bundle.plan, moduleName, include, renameMap, bootstrapChanges);

  let control = bundle.control
    ? { fileName: `${moduleName}.control`, content: bundle.control.content }
    : null;
  if (control && cross) {
    control = { fileName: control.fileName, content: addControlRequire(control.content, cross.sharedName) };
  }

  const digest = computeBundleDigest(
    plan,
    control?.content ?? null,
    allChanges.map(c => c.digest)
  );

  return {
    manifest: {
      formatVersion: bundle.manifest.formatVersion,
      name: moduleName,
      createdWith: bundle.manifest.createdWith,
      changeCount: allChanges.length,
      deployOrder: allChanges.map(c => c.name),
      digest,
      provenance: {
        ...(bundle.manifest.provenance ?? {}),
        splitFrom: bundle.manifest.name
      }
    },
    plan,
    control,
    changes: allChanges
  };
}

/**
 * Build the per-tenant reference-rewrite map: every shared change → its
 * cross-module reference, then bootstrap `replacesShared` overrides → the
 * bootstrap's local name (so a per-tenant object depends on its own schema).
 */
function buildRenameMap(bundle: MigrationBundle, cross: CrossModuleRefs): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of bundle.changes) {
    if (cross.isShared(c.name)) map.set(c.name, `${cross.sharedName}:${c.name}`);
  }
  for (const b of cross.bootstrap) {
    if (b.replacesShared !== undefined) map.set(b.replacesShared, b.name);
  }
  return map;
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
  renameMap: Map<string, string> | null,
  bootstrapChanges: BundleChange[]
): string {
  const parsed = parsePlanContent(planContent);
  if (!parsed.data) {
    const detail = parsed.errors?.map(e => `Line ${e.line}: ${e.message}`).join('; ') || 'unknown';
    throw new Error(`splitBundle: could not parse source plan: ${detail}`);
  }
  const source = parsed.data;

  const bootstrapPlan: Change[] = bootstrapChanges.map(b => ({
    name: b.name,
    dependencies: b.dependencies
  }));

  const changes: Change[] = source.changes
    .filter(c => include(c.name))
    .map(c => ({
      ...c,
      dependencies: (c.dependencies ?? []).map(dep => renameMap?.get(dep) ?? dep)
    }));

  const allChanges = [...bootstrapPlan, ...changes];
  const kept = new Set(allChanges.map(c => c.name));
  const tags = source.tags.filter(t => kept.has(t.change));

  const plan: ExtendedPlanFile = {
    ...source,
    package: moduleName,
    uri: moduleName,
    changes: allChanges,
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
