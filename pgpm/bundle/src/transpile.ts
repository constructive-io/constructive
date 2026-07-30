import { PgpmScriptKind } from '@pgpmjs/ast/module/types';
import { parsePgpmHeader, renameInHeader, writePgpmScript } from '@pgpmjs/ast/files/sql/header';
import { hashString } from '@pgpmjs/ast';
import { generatePlanFileContent, parsePlanContent, renameInPlanContent } from '@pgpmjs/ast';
import { mapScripts } from '@pgpmjs/traverse';
import {
  computeBundleDigest,
  computeChangeDigest,
  CreateBundleOptions
} from './create';
import { BundleChange, BundleScript, MigrationBundle } from './types';

/** Identifies a script while it is being transformed. */
export interface TranspileScriptContext {
  /** Change name in the *source* bundle. */
  change: string;
  kind: PgpmScriptKind;
}

export interface TranspileBundleOptions extends CreateBundleOptions {
  /**
   * Rewrite a change's name (its plan identity / path). Return the same name to
   * leave it unchanged. Used to move changes into a new namespace, e.g.
   * `schemas/app/tables/users` -> `schemas/tenant/tables/users`.
   *
   * The mechanical consequences — plan change lines + dependency refs, and each
   * script's `-- Deploy`/`-- requires:` header — are rewritten for you; only the
   * SQL statement bodies are the caller's concern via {@link transformScript}.
   */
  renameChange?: (name: string) => string;
  /**
   * Rewrite a script's SQL body. This is where the AST-level namespace remap
   * lives (schema names, fully-qualified references, RLS/FK targets, function
   * bodies) — core stays parser-agnostic and defers the actual transform to the
   * caller, exactly like `rebundle`'s `categoryOf`. The passed SQL already has
   * its header rewritten for any change rename.
   */
  transformScript?: (sql: string, ctx: TranspileScriptContext) => string;
  /**
   * Rewrite the `.control` file content (default: unchanged). Control `requires`
   * are extension deps, not change names, so they are left alone unless a caller
   * opts in here.
   */
  transformControl?: (content: string, fileName: string) => string;
  /**
   * Give the transpiled bundle a new module identity: rewrites the manifest
   * name, the plan `%project=`/`%uri=` headers, and the `.control` file name.
   * Used to instance a source module under a consumer-chosen name (e.g.
   * `users-module` applied as `tenant-users`), so registry attribution and
   * dependency references land on the instance instead of the source.
   */
  renameModule?: string;
  /**
   * Select changes to drop from the transpiled bundle entirely (return `true`
   * to exclude). Excluded changes are removed from the change list, deploy
   * order, and plan, and their name is pruned from every surviving change's
   * dependencies (plan brackets included).
   *
   * This is the mechanism behind subsystem exclusion in apply: an excluded
   * subsystem is genuinely absent from the artifact rather than emitted as an
   * empty script. Empty tombstones are indistinguishable by content, so they
   * collide on the deploy ledger's `(package, script_hash)` uniqueness — a
   * dropped change has no script to hash. Cascade safety (no survivor still
   * references a dropped object) is the caller's responsibility.
   */
  excludeChange?: (name: string) => boolean;
}

/**
 * Drop excluded changes from a plan's text and prune references to them from
 * the surviving changes' dependency brackets, re-serializing the plan. Tags on
 * excluded changes are dropped with them.
 */
function removeChangesFromPlan(plan: string, excluded: Set<string>): string {
  const parsed = parsePlanContent(plan);
  if (!parsed.data) return plan;
  const changes = parsed.data.changes
    .filter(change => !excluded.has(change.name))
    .map(change => ({
      ...change,
      dependencies: change.dependencies.filter(dep => !excluded.has(dep))
    }));
  const tags = (parsed.data.tags ?? []).filter(tag => !excluded.has(tag.change));
  return generatePlanFileContent({ ...parsed.data, changes, tags });
}

function renameProjectInPlan(plan: string, from: string, to: string): string {
  return plan
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed === `%project=${from}`) return line.replace(`%project=${from}`, `%project=${to}`);
      if (trimmed === `%uri=${from}`) return line.replace(`%uri=${from}`, `%uri=${to}`);
      return line;
    })
    .join('\n');
}

/**
 * Build the source→target change rename map, validating that the rename is a
 * well-formed bijection over the changes it touches (no two changes collapse to
 * the same name, no rename onto an untouched existing change).
 */
function buildRenames(
  order: string[],
  renameChange: (name: string) => string
): Map<string, string> {
  const renames = new Map<string, string>();
  const targets = new Map<string, string>();
  const originals = new Set(order);

  for (const name of order) {
    const to = renameChange(name);
    if (to === name) continue;
    const prior = targets.get(to);
    if (prior !== undefined) {
      throw new Error(`Transpile renames both "${prior}" and "${name}" to "${to}"`);
    }
    if (originals.has(to) && renameChange(to) === to) {
      throw new Error(`Transpile renames "${name}" onto existing change "${to}"`);
    }
    targets.set(to, name);
    renames.set(name, to);
  }
  return renames;
}

function transpileScriptSql(
  script: BundleScript,
  changeName: string,
  renames: Map<string, string>,
  options: TranspileBundleOptions
): BundleScript {
  let sql = script.sql;
  if (renames.size > 0) {
    const parsed = parsePgpmHeader(sql);
    if (renameInHeader(parsed, renames) > 0) {
      sql = writePgpmScript(parsed);
    }
  }
  if (options.transformScript) {
    sql = options.transformScript(sql, { change: changeName, kind: script.kind });
  }
  return { kind: script.kind, sql, digest: hashString(sql) };
}

/**
 * Transpile a {@link MigrationBundle} into a new namespace, producing a fresh
 * content-addressed bundle.
 *
 * Pure and deterministic (no I/O). Composes the existing rename primitives
 * (`renameInHeader`, `renameInPlanContent`) for the mechanical change-name/plan
 * rewrite and defers SQL-body rewriting to the caller-supplied
 * {@link TranspileBundleOptions.transformScript}. Digests are recomputed from
 * the transformed SQL so the result is independently verifiable, and the source
 * bundle's digest is recorded in `provenance.sourceBundleDigest` for lineage.
 */
export function transpileBundle(
  bundle: MigrationBundle,
  options: TranspileBundleOptions = {}
): MigrationBundle {
  const renameChange = options.renameChange ?? ((name: string) => name);
  const excludeChange = options.excludeChange ?? (() => false);
  const renames = buildRenames(bundle.manifest.deployOrder, renameChange);

  const changes: BundleChange[] = bundle.changes
    .filter(change => !excludeChange(change.name))
    .map(change => {
      const name = renames.get(change.name) ?? change.name;
      const dependencies = change.dependencies
        .filter(dep => !excludeChange(dep))
        .map(dep => renames.get(dep) ?? dep);
      const { deploy, revert, verify } = mapScripts(change, script =>
        transpileScriptSql(script, change.name, renames, options)
      );
      const digest = computeChangeDigest(name, {
        deploy: deploy?.digest,
        revert: revert?.digest,
        verify: verify?.digest
      });
      return { name, dependencies, deploy, revert, verify, digest };
    });

  let plan = renames.size > 0 ? renameInPlanContent(bundle.plan, renames) : bundle.plan;
  // Excluded changes are matched by source name; they are never renamed (the
  // caller leaves excluded changes' identity intact), so prune the plan by the
  // source names, after any survivor renames have been applied above.
  const excluded = new Set(bundle.manifest.deployOrder.filter(excludeChange));
  if (excluded.size > 0) {
    plan = removeChangesFromPlan(plan, excluded);
  }

  const moduleName = options.renameModule ?? bundle.manifest.name;
  if (options.renameModule && options.renameModule !== bundle.manifest.name) {
    plan = renameProjectInPlan(plan, bundle.manifest.name, options.renameModule);
  }

  let control = bundle.control;
  if (control && options.transformControl) {
    control = {
      fileName: control.fileName,
      content: options.transformControl(control.content, control.fileName)
    };
  }
  if (control && options.renameModule && options.renameModule !== bundle.manifest.name) {
    control = {
      fileName: `${options.renameModule}.control`,
      content: control.content
    };
  }

  const deployOrder = changes.map(c => c.name);
  const digest = computeBundleDigest(
    plan,
    control?.content ?? null,
    changes.map(c => c.digest)
  );

  const provenance: Record<string, string> = {
    ...(bundle.manifest.provenance ?? {}),
    ...(options.provenance ?? {}),
    sourceBundleDigest: bundle.manifest.digest
  };

  return {
    manifest: {
      formatVersion: bundle.manifest.formatVersion,
      name: moduleName,
      createdWith: options.createdWith ?? '@pgpmjs/core',
      changeCount: changes.length,
      deployOrder,
      digest,
      provenance
    },
    plan,
    control,
    changes
  };
}
