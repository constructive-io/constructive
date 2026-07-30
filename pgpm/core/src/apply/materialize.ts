import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

import {
  bundleFromModule,
  materializeBundle,
  MigrationBundle,
  transpileBundle,
  verifyBundle
} from '@pgpmjs/bundle';
import { loadModule, makeSchemaTranspiler, SchemaTransformPass } from '@pgpmjs/transform';

import { ModuleMap } from '../modules/modules';
import { hasApplySpec, readApplySpec } from './apply-spec';
import { loadWorkspaceRoutingProfile, resolveEffectiveApplySpec } from './profile';
import { isReuseSpec, materializeReuseModule, resolveSharedModuleName } from './reuse';
import { ResolvedApplySpec } from './types';

export interface MaterializeApplyOptions {
  /** Directory of the source module being applied. */
  sourceDir: string;
  /** The apply spec (typically read from the proxy via {@link readApplySpec}). */
  spec: ResolvedApplySpec;
  /** Directory to materialize into (default: a fresh temp dir). */
  outDir?: string;
}

// Functions that take a bare schema name as a string-literal first argument.
// The AST pass only remaps dotted literals ('schema.object'); these helpers
// (ubiquitous in verify scripts) name the schema alone, so a string-level
// pre-pass remaps them.
const SCHEMA_NAME_LITERAL_FUNCS = ['verify_schema', 'has_schema_privilege'];

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
      ...(spec.route ?? []).map(r => r.toSchema)
    ])
  ];

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

  const transpiled = transpileBundle(source, {
    renameChange,
    transformScript,
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
