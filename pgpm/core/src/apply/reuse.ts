import { hashString } from '@pgpmjs/ast';
import {
  bundleFromModule,
  materializeBundle,
  MigrationBundle,
  PerTenantBootstrapChange,
  splitBundle,
  transpileBundle,
  verifyBundle
} from '@pgpmjs/bundle';
import { partitionModule } from '@pgpmjs/slice';
import {
  loadModule,
  makeSchemaTranspiler,
  SchemaObjectRoute,
  SchemaTransformPass
} from '@pgpmjs/transform';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { ResolvedApplySpec } from './types';

/** A resolved apply spec that carries a reuse declaration. */
export type ResolvedReuseSpec = ResolvedApplySpec & { reuse: NonNullable<ResolvedApplySpec['reuse']> };

/** Whether an apply spec is a reuse (shared/per-tenant split) spec. */
export function isReuseSpec(spec: ResolvedApplySpec): spec is ResolvedReuseSpec {
  return spec.reuse !== undefined;
}

/** pgpm change-path folder → object route kind. */
const FOLDER_KIND: Record<string, SchemaObjectRoute['kind']> = {
  tables: 'table',
  views: 'view',
  functions: 'function',
  procedures: 'procedure',
  types: 'type'
};

// Mirrors materialize.ts.
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

interface ParsedObjectChange {
  schema: string;
  /** `schema` for the bare schema-creation change, else the object folder. */
  folder: string;
  name?: string;
}

/** Parse a `schemas/<schema>/<folder>/<name>…` change path into its object identity. */
function parseObjectChange(change: string): ParsedObjectChange | null {
  const parts = change.split('/');
  if (parts[0] !== 'schemas' || parts.length < 2) return null;
  const schema = parts[1];
  const folder = parts[2];
  if (folder === undefined || folder === 'schema') return { schema, folder: 'schema' };
  return { schema, folder, name: parts[3] };
}

/**
 * Deterministic name of the shared module a reuse proxy expands into. Derived
 * from the source module, the shared-schema mapping, and the per-tenant seed
 * set — the exact inputs that determine the shared partition — so two tenant
 * proxies over the same source/shared/seed configuration resolve to *one*
 * shared module (deployed once), while any difference isolates them.
 */
export function resolveSharedModuleName(spec: ResolvedReuseSpec): string {
  if (spec.reuse.sharedName) return spec.reuse.sharedName;
  const canonical = JSON.stringify({
    source: spec.source.module,
    sharedSchema: Object.entries(spec.reuse.sharedSchema).sort(([a], [b]) => a.localeCompare(b)),
    seeds: spec.reuse.perTenant
      .map(s => `${s.fromSchema}.${s.kind}.${s.name}`)
      .sort((a, b) => a.localeCompare(b))
  });
  return `${spec.source.module}-shared-${hashString(canonical).slice(0, 8)}`;
}

export interface MaterializeReuseOptions {
  /** Directory of the source module being applied. */
  sourceDir: string;
  /** The resolved reuse spec. */
  spec: ResolvedReuseSpec;
  /** Deployable directory for the shared module (default: a fresh temp dir). */
  sharedOutDir?: string;
  /** Deployable directory for the per-tenant module (default: a fresh temp dir). */
  perTenantOutDir?: string;
}

export interface MaterializeReuseResult {
  sharedName: string;
  perTenantName: string;
  shared: { bundle: MigrationBundle; outDir: string };
  perTenant: { bundle: MigrationBundle; outDir: string };
}

/**
 * Expand a reuse proxy into two deployable modules: a shared module (objects the
 * classifier proves tenant-independent, deployed once) and a per-tenant module
 * (objects reachable from the per-tenant seeds, materialized per instance) that
 * `requires` the shared one.
 *
 * Pipeline over existing primitives:
 * `bundleFromModule` → `partitionModule` (classifier) →
 * `transpileBundle(makeSchemaTranspiler)` routing shared objects to the shared
 * schema and per-tenant objects to the per-tenant schema in *one* pass (so
 * cross-boundary references resolve correctly) → `splitBundle` with a per-tenant
 * schema bootstrap → `verifyBundle` → `materializeBundle`.
 */
export async function materializeReuseModule(
  options: MaterializeReuseOptions
): Promise<MaterializeReuseResult> {
  const { sourceDir, spec } = options;
  const perTenantName = spec.name!;
  const sharedName = resolveSharedModuleName(spec);
  const reuse = spec.reuse;

  await loadModule();

  const source = bundleFromModule(sourceDir);
  if (spec.source.bundleDigest && spec.source.bundleDigest !== source.manifest.digest) {
    throw new Error(
      `Apply spec for "${perTenantName}" pins source bundle digest ${spec.source.bundleDigest}, ` +
        `but the installed source "${spec.source.module}" hashes to ${source.manifest.digest}. ` +
        `Reinstall the pinned version or update the spec.`
    );
  }

  // 1. Classify: which source changes must be per-tenant (a seed or a dependent).
  const partition = partitionModule({
    moduleDir: sourceDir,
    seedObjects: reuse.perTenant.map(s => ({ schema: s.fromSchema, name: s.name }))
  });
  const unknownSeeds = partition.warnings.filter(w => w.kind === 'unknown-seed');
  if (unknownSeeds.length > 0) {
    throw new Error(
      `Reuse spec for "${perTenantName}": seed object(s) not found in source "${spec.source.module}": ` +
        unknownSeeds.map(w => w.change).join(', ')
    );
  }

  // 2. Object routes: every per-tenant change's object goes to the per-tenant
  //    target; everything else defaults (schemaMap) to the shared target. A
  //    single router keeps cross-boundary references correct (a per-tenant
  //    function landing in the tenant schema still references the shared helper
  //    in the shared schema).
  const routes: SchemaObjectRoute[] = [];
  for (const change of partition.perTenant) {
    const obj = parseObjectChange(change);
    if (!obj || obj.folder === 'schema' || !obj.name) {
      throw new Error(
        `Reuse spec for "${perTenantName}": per-tenant change "${change}" is not an object change ` +
          `and cannot be routed to a per-tenant schema; refine the seeds so it stays shared, or ` +
          `it names an unsupported object kind`
      );
    }
    const kind = FOLDER_KIND[obj.folder];
    if (!kind) {
      throw new Error(
        `Reuse spec for "${perTenantName}": per-tenant change "${change}" has unsupported object ` +
          `folder "${obj.folder}"`
      );
    }
    const toSchema = spec.schemas![obj.schema];
    if (!toSchema) {
      throw new Error(
        `Reuse spec for "${perTenantName}": per-tenant object in schema "${obj.schema}" has no ` +
          `per-tenant target in "schemas"`
      );
    }
    routes.push({ fromSchema: obj.schema, kind, name: obj.name, toSchema });
  }

  const assumeSchemasExist = [
    ...new Set([...Object.values(reuse.sharedSchema), ...Object.values(spec.schemas!)])
  ];

  const provenance = {
    appliedFrom: spec.source.module,
    ...(spec.source.package ? { sourcePackage: spec.source.package } : {}),
    ...(spec.source.version ? { sourceVersion: spec.source.version } : {})
  };

  // 3. Transpile once: schema default = shared target, per-object overrides =
  //    per-tenant target.
  const main = makeSchemaTranspiler({
    schemaMap: reuse.sharedSchema,
    routes,
    extensions: spec.extensions,
    roles: spec.roles,
    transform: { prePasses: [schemaNameLiteralPass], assumeSchemasExist }
  });
  const transpiled = transpileBundle(source, {
    renameChange: main.renameChange,
    transformScript: main.transformScript,
    provenance
  });
  if (main.result.errors.length > 0) {
    const detail = main.result.errors.map(e => `${e.file}: ${e.error}`).join('; ');
    throw new Error(
      `Reuse transpile of "${spec.source.module}" for "${perTenantName}" failed: ${detail}`
    );
  }

  // The partition is in *source* change names; splitBundle works on the
  // transpiled bundle, so map the per-tenant set through the same rename.
  const perTenantTranspiled = [...partition.perTenant].map(main.renameChange);

  // 4. Per-tenant schema bootstrap: the source's `CREATE SCHEMA` lands in the
  //    shared module (shared target), but each tenant also needs its own
  //    schema. Duplicate it — transpiled to the per-tenant target — into the
  //    per-tenant module, re-pointing per-tenant dependencies off the shared
  //    schema onto this local one.
  const bootstrap = buildSchemaBootstraps(source, spec, main.renameChange, assumeSchemasExist);

  const { shared, perTenant } = splitBundle(transpiled, {
    perTenantChanges: perTenantTranspiled,
    sharedName,
    perTenantName,
    perTenantBootstrap: bootstrap
  });

  for (const [label, bundle] of [
    [sharedName, shared],
    [perTenantName, perTenant]
  ] as const) {
    const issues = verifyBundle(bundle);
    if (issues.length > 0) {
      throw new Error(
        `Reuse bundle "${label}" failed integrity verification: ${issues.map(i => i.kind).join(', ')}`
      );
    }
  }

  const sharedOutDir =
    options.sharedOutDir ?? mkdtempSync(join(tmpdir(), `pgpm-apply-${sharedName}-`));
  const perTenantOutDir =
    options.perTenantOutDir ?? mkdtempSync(join(tmpdir(), `pgpm-apply-${perTenantName}-`));
  materializeBundle(shared, sharedOutDir);
  materializeBundle(perTenant, perTenantOutDir);

  return {
    sharedName,
    perTenantName,
    shared: { bundle: shared, outDir: sharedOutDir },
    perTenant: { bundle: perTenant, outDir: perTenantOutDir }
  };
}

/**
 * Build a per-tenant `CREATE SCHEMA` bootstrap for each source schema that both
 * creates a schema and has per-tenant objects. The scripts are the source
 * schema-creation change transpiled to the per-tenant target; `replacesShared`
 * is the shared-schema change the per-tenant objects would otherwise depend on.
 */
function buildSchemaBootstraps(
  source: MigrationBundle,
  spec: ResolvedReuseSpec,
  renameSharedChange: (name: string) => string,
  assumeSchemasExist: string[]
): PerTenantBootstrapChange[] {
  const bootstraps: PerTenantBootstrapChange[] = [];
  for (const [fromSchema, perTenantTarget] of Object.entries(spec.schemas!)) {
    const sharedTarget = spec.reuse.sharedSchema[fromSchema];
    if (!sharedTarget || sharedTarget === perTenantTarget) continue;

    const sourceSchemaChange = `schemas/${fromSchema}/schema`;
    const schemaChange = source.changes.find(c => c.name === sourceSchemaChange);
    if (!schemaChange) continue; // source doesn't create this schema; nothing to duplicate

    // Transpile just the schema-creation change to the per-tenant target.
    const single: MigrationBundle = {
      ...source,
      manifest: { ...source.manifest, changeCount: 1, deployOrder: [sourceSchemaChange] },
      changes: [schemaChange]
    };
    const t = makeSchemaTranspiler({
      schemaMap: { [fromSchema]: perTenantTarget },
      transform: { prePasses: [schemaNameLiteralPass], assumeSchemasExist }
    });
    const perTenantSchema = transpileBundle(single, {
      renameChange: t.renameChange,
      transformScript: t.transformScript
    }).changes[0];

    bootstraps.push({
      name: `schemas/${perTenantTarget}/schema`,
      dependencies: [],
      deploy: perTenantSchema.deploy?.sql ?? null,
      revert: perTenantSchema.revert?.sql ?? null,
      verify: perTenantSchema.verify?.sql ?? null,
      replacesShared: renameSharedChange(sourceSchemaChange)
    });
  }
  return bootstraps;
}
