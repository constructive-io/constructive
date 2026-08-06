import {
  bundleFromModule,
  materializeBundle,
  MigrationBundle,
  transpileBundle,
  verifyBundle
} from '@pgpmjs/bundle';
import { excludeSubsystemPrograms, stripSubsystemSql } from '@pgpmjs/slice';
import { buildSchemaRouter, loadModule, makeSchemaTranspiler, parseSqlProgram, SchemaTransformPass, SqlProgram } from '@pgpmjs/transform';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

import { ModuleMap } from '../modules/modules';
import { hasApplySpec, readApplySpec } from './apply-spec';
import { loadWorkspaceRoutingProfile, resolveEffectiveApplySpec } from './profile';
import { isReuseSpec, materializeReuseModule, resolveSharedModuleName } from './reuse';
import { APPLY_SPEC_FILE, ResolvedApplySpec } from './types';

export interface MaterializeApplyOptions {
  /** Directory of the source module being applied. */
  sourceDir: string;
  /** The apply spec (typically read from the proxy via {@link readApplySpec}). */
  spec: ResolvedApplySpec;
  /** Directory to materialize into (default: a fresh temp dir). */
  outDir?: string;
}

// has_schema_privilege takes a bare schema name as a string literal. The AST
// pass only remaps dotted literals ('schema.object') and identity casts
// ('schema'::regnamespace), so this one is remapped by a string pre-pass.
const SCHEMA_NAME_LITERAL_FUNCS = ['has_schema_privilege'];

const schemaNameLiteralPass: SchemaTransformPass = (content, schemaMapping) => {
  const pattern = new RegExp(
    `\\b(${SCHEMA_NAME_LITERAL_FUNCS.join('|')})\\s*\\(\\s*'([^']+)'`,
    'gi'
  );
  return content.replace(pattern, (match, _fn: string, schema: string) => {
    const mapped = schemaMapping.get(schema);
    return mapped ? match.replace(`'${schema}'`, `'${mapped}'`) : match;
  });
};

/**
 * Build the per-script subsystem stripper for an `exclude` spec, verifying
 * cascade safety across the *whole* source bundle first: every deploy-script
 * reference into an excluded schema (FKs, calls, policy predicates) must have
 * a rebind route, or materialization refuses with each unsatisfied reference
 * named. Checking bundle-wide (not per script) is what catches cross-change
 * dependencies on the excluded subsystem.
 */
function makeSubsystemStripper(
  source: MigrationBundle,
  spec: ResolvedApplySpec,
  instanceName: string
): { strip: (sql: string) => string; excludedChanges: Set<string> } {
  const selector = { schemas: spec.exclude!.schemas };
  const rebinds = buildSchemaRouter({ schemaMap: spec.schemas, routes: spec.route });

  // One parse per deploy script; the analysis runs over all programs together
  // (cross-change references into the subsystem are caught by construction)
  // and returns per-change drop/strip/prune decisions from the same pass.
  const programs: Array<[string, SqlProgram]> = source.changes
    .filter(c => c.deploy)
    .map(c => [c.name, parseSqlProgram(c.deploy!.sql)]);
  const analysis = excludeSubsystemPrograms(programs, selector, { rebinds });

  if (analysis.unsatisfied.length > 0) {
    const detail = [
      ...new Set(
        analysis.unsatisfied.map(
          u => `${u.object.schema}.${u.object.name}${u.fk ? ' (foreign key target)' : ''}`
        )
      )
    ].join(', ');
    throw new Error(
      `Cannot exclude schema(s) ${spec.exclude!.schemas.join(', ')} from ` +
        `"${spec.source.module}" as "${instanceName}": surviving statements still reference ` +
        `${detail} with no route/rebind target. Add "route" entries substituting each ` +
        `referenced object, or keep the subsystem.`
    );
  }

  // A fully-excluded change is dropped *as a change* — removed from the plan
  // and deploy order rather than emitted as an empty script (empty scripts
  // collide on the deploy ledger's script-hash uniqueness). Its verify/revert
  // scripts target dropped objects the classifier can't always see (bare
  // DROPs, catalog probes), which is exactly why the whole change is dropped,
  // not just blanked.
  const excludedChanges = new Set<string>();
  const strippedDeploys = new Map<string, string>();
  for (const [name, program] of programs) {
    const exclusion = analysis.programs.get(name)!;
    if (exclusion.fullyExcluded) excludedChanges.add(name);
    else strippedDeploys.set(program.source, exclusion.sql);
  }

  // Surviving changes may still contain stray subsystem statements (a change
  // that both creates a survivor and touches the excluded subsystem); strip
  // those in place. Verify/revert scripts are separate sources, stripped on
  // demand with the same selector.
  const strip = (sql: string): string =>
    strippedDeploys.get(sql) ?? stripSubsystemSql(sql, selector).sql;

  return { strip, excludedChanges };
}

export interface MaterializeApplyResult {
  /** The transpiled, content-addressed bundle that was materialized. */
  bundle: MigrationBundle;
  /** The deployable module directory the bundle was written to. */
  outDir: string;
}

/**
 * Transpile a source module per an apply spec and materialize the result as a
 * deployable module directory carrying the instance's identity.
 *
 * Pure pipeline over existing primitives: `bundleFromModule` →
 * `transpileBundle(makeSchemaTranspiler)` → `verifyBundle` →
 * `materializeBundle`. Deterministic — identical source + spec always produce
 * an identical bundle (and digest), which is what makes verify/revert able to
 * re-derive the exact deployed artifact.
 */
export async function materializeApplyModule(
  options: MaterializeApplyOptions
): Promise<MaterializeApplyResult> {
  const { sourceDir, spec } = options;
  const instanceName = spec.name!;

  // the schema transpiler's SQL/PLpgSQL parser is WASM-backed and needs a
  // one-time async init (idempotent)
  await loadModule();

  const source = bundleFromModule(sourceDir);

  if (spec.source.bundleDigest && spec.source.bundleDigest !== source.manifest.digest) {
    throw new Error(
      `Apply spec for "${instanceName}" pins source bundle digest ${spec.source.bundleDigest}, ` +
        `but the installed source "${spec.source.module}" hashes to ${source.manifest.digest}. ` +
        `Reinstall the pinned version or update the spec.`
    );
  }

  // Every distinct target schema is treated as "may already exist": apply
  // deploys into consumer-chosen namespaces that can pre-exist (a shared schema,
  // another tenant), so `CREATE SCHEMA` is emitted idempotently. This is what
  // lets the same source apply cleanly whether or not the destination exists.
  const targetSchemas = [
    ...new Set([
      ...Object.values(spec.schemas ?? {}),
      ...(spec.route ?? [])
        .map(r => r.toSchema)
        .filter((s): s is string => typeof s === 'string')
    ])
  ];

  const stripSubsystem = spec.exclude
    ? makeSubsystemStripper(source, spec, instanceName)
    : undefined;

  const { renameChange, transformScript, result } = makeSchemaTranspiler({
    schemaMap: spec.schemas,
    routes: spec.route,
    extensions: spec.extensions,
    roles: spec.roles,
    transform: {
      prePasses: [schemaNameLiteralPass],
      assumeSchemasExist: targetSchemas
    }
  });

  // Excluded changes are dropped from the artifact entirely (plan + deploy
  // order + dependency refs); surviving changes get their stray subsystem
  // statements stripped before the namespace transform.
  const transpiled = transpileBundle(source, {
    excludeChange: stripSubsystem
      ? (name: string) => stripSubsystem.excludedChanges.has(name)
      : undefined,
    // Excluded changes keep their source identity so the plan-prune (which
    // matches source names) can find them; survivors route normally.
    renameChange: stripSubsystem
      ? (name: string) => (stripSubsystem.excludedChanges.has(name) ? name : renameChange(name))
      : renameChange,
    transformScript: stripSubsystem
      ? (sql, ctx) => transformScript(stripSubsystem.strip(sql), ctx)
      : transformScript,
    renameModule: instanceName,
    provenance: {
      appliedFrom: spec.source.module,
      ...(spec.source.package ? { sourcePackage: spec.source.package } : {}),
      ...(spec.source.version ? { sourceVersion: spec.source.version } : {})
    }
  });

  if (result.errors.length > 0) {
    const detail = result.errors.map(e => `${e.file}: ${e.error}`).join('; ');
    throw new Error(
      `Apply transpile of "${spec.source.module}" as "${instanceName}" failed: ${detail}`
    );
  }

  const issues = verifyBundle(transpiled);
  if (issues.length > 0) {
    throw new Error(
      `Transpiled bundle for "${instanceName}" failed integrity verification: ` +
        issues.map(i => i.kind).join(', ')
    );
  }

  const outDir = options.outDir ?? mkdtempSync(join(tmpdir(), `pgpm-apply-${instanceName}-`));
  materializeBundle(transpiled, outDir);

  return { bundle: transpiled, outDir };
}

// One materialization per proxy path per process: the pipeline is
// deterministic, so re-deriving within a process is pure waste.
const materializedCache = new Map<string, string>();

/**
 * Deploy-path dispatch seam: given a resolved module's directory, return the
 * directory the migration engine should actually run against.
 *
 * Non-proxy modules pass through unchanged. For proxy modules (directories
 * carrying a `pgpm.apply.json`), the source module is located in the workspace
 * module map, transpiled per the spec, and materialized to a cached temp dir
 * carrying the instance's identity.
 */
export async function resolveEffectiveModulePath(
  moduleName: string,
  modulePath: string,
  moduleMap: ModuleMap,
  workspacePath: string
): Promise<string> {
  if (!hasApplySpec(modulePath)) return modulePath;

  // A reuse proxy resolves under two names (shared + per-tenant) from one
  // directory, so the cache is keyed by the requested module name too.
  const cacheKey = `${modulePath}::${moduleName}`;
  const cached = materializedCache.get(cacheKey);
  if (cached) return cached;

  const spec = resolveEffectiveApplySpec(
    readApplySpec(modulePath),
    loadWorkspaceRoutingProfile(workspacePath)
  );
  const sourceModule = moduleMap[spec.source.module];
  if (!sourceModule) {
    throw new Error(
      `Apply spec in "${moduleName}" references source module "${spec.source.module}", ` +
        `which was not found in the workspace. Run \`pgpm install\` to install it` +
        (spec.source.package ? ` (${spec.source.package})` : '') +
        `.`
    );
  }

  const sourceDir = resolve(workspacePath, sourceModule.path);

  if (isReuseSpec(spec)) {
    const result = await materializeReuseModule({ sourceDir, spec });
    materializedCache.set(`${modulePath}::${result.sharedName}`, result.shared.outDir);
    materializedCache.set(`${modulePath}::${result.perTenantName}`, result.perTenant.outDir);
    const outDir =
      moduleName === resolveSharedModuleName(spec) ? result.shared.outDir : result.perTenant.outDir;
    return outDir;
  }

  const { outDir } = await materializeApplyModule({ sourceDir, spec });
  materializedCache.set(cacheKey, outDir);
  return outDir;
}

/** Test seam: clear the per-process materialization cache. */
export function clearApplyMaterializationCache(): void {
  materializedCache.clear();
}

export interface MaterializeWorkspaceTargetOptions {
  /** Absolute workspace root path. */
  workspacePath: string;
  /** The workspace module map (proxies already synthesized in). */
  moduleMap: ModuleMap;
  /** Name of the apply-proxy module to materialize. */
  target: string;
  /** Directory to write the plain, deployable module into. */
  outDir: string;
}

export interface MaterializeWorkspaceTargetResult {
  /** The deployable module directory the bundle was written to. */
  outDir: string;
  /** The transpiled, content-addressed bundle that was materialized. */
  bundle: MigrationBundle;
  /** The resolved apply spec the materialization was driven by. */
  spec: ResolvedApplySpec;
}

/**
 * Resolve an apply-proxy module by name in a workspace and materialize it to a
 * chosen directory as a plain, deployable module (transforms baked in — no
 * `pgpm.apply.json`). Shared by the `pgpm materialize` command and tests; the
 * counterpart to {@link resolveEffectiveModulePath}, but with an explicit,
 * stable `outDir` and no per-process cache.
 */
export async function materializeWorkspaceTarget(
  options: MaterializeWorkspaceTargetOptions
): Promise<MaterializeWorkspaceTargetResult> {
  const { workspacePath, moduleMap, target, outDir } = options;

  const module = moduleMap[target];
  if (!module) {
    const proxies = Object.keys(moduleMap).sort();
    throw new Error(
      `Module "${target}" not found in the workspace.` +
        (proxies.length ? ` Available modules: ${proxies.join(', ')}.` : '')
    );
  }

  const modulePath = resolve(workspacePath, module.path);
  if (!hasApplySpec(modulePath)) {
    throw new Error(
      `Module "${target}" is not an apply proxy (no ${APPLY_SPEC_FILE} in ${modulePath}). ` +
        `Only apply-proxy modules can be materialized.`
    );
  }

  const spec = resolveEffectiveApplySpec(
    readApplySpec(modulePath),
    loadWorkspaceRoutingProfile(workspacePath)
  );

  if (isReuseSpec(spec)) {
    throw new Error(
      `Apply proxy "${target}" is a reuse proxy (shared + per-tenant). ` +
        `Reuse proxies are not yet supported by \`pgpm materialize\`.`
    );
  }

  const sourceModule = moduleMap[spec.source.module];
  if (!sourceModule) {
    throw new Error(
      `Apply spec in "${target}" references source module "${spec.source.module}", ` +
        `which was not found in the workspace. Run \`pgpm install\` to install it` +
        (spec.source.package ? ` (${spec.source.package})` : '') +
        `.`
    );
  }

  const sourceDir = resolve(workspacePath, sourceModule.path);
  const { outDir: writtenDir, bundle } = await materializeApplyModule({
    sourceDir,
    spec,
    outDir
  });

  return { outDir: writtenDir, bundle, spec };
}
