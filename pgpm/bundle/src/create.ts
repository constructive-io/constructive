import { PgpmModuleAst, PgpmScriptAst } from '@pgpmjs/ast/module/types';
import { hashString } from '@pgpmjs/ast';
import { mapScripts } from '@pgpmjs/traverse';
import {
  BUNDLE_FORMAT_VERSION,
  BundleChange,
  BundleScript,
  MigrationBundle
} from './types';

/** Executable deploy SQL per change name, as produced at package time. */
export type ExecSqlByChange = Record<string, string>;

/**
 * Digest for a single change: its name plus the digests of its scripts, in a
 * fixed deploy/revert/verify order. A missing script contributes an empty slot
 * so presence/absence changes the digest.
 */
export function computeChangeDigest(
  name: string,
  scripts: {
    deploy?: string | null;
    revert?: string | null;
    verify?: string | null;
    /**
     * Digest of the pre-computed executable deploy SQL. Only contributes when
     * defined, so digests of bundles without an `exec` slot are unchanged.
     */
    exec?: string | null;
  }
): string {
  const parts = [name, scripts.deploy ?? '', scripts.revert ?? '', scripts.verify ?? ''];
  if (scripts.exec != null) parts.push(scripts.exec);
  return hashString(parts.join('\n'));
}

/**
 * Top-level bundle digest: the plan, the control content, and the ordered change
 * digests. Deterministic and independent of tool version / provenance.
 */
export function computeBundleDigest(
  plan: string,
  controlContent: string | null,
  changeDigests: string[]
): string {
  return hashString([plan, controlContent ?? '', ...changeDigests].join('\n'));
}

function toBundleScript(script: PgpmScriptAst | null): BundleScript | null {
  if (!script) return null;
  return { kind: script.kind, sql: script.raw, digest: hashString(script.raw) };
}

export interface CreateBundleOptions {
  /** Tool identifier recorded in the manifest (default `@pgpmjs/core`). */
  createdWith?: string;
  /** Lineage recorded in the manifest (excluded from the digest). */
  provenance?: Record<string, string>;
}

/**
 * Build a content-addressed {@link MigrationBundle} from a module AST.
 *
 * Pure and deterministic: no disk I/O, no clock, no version noise in the digest.
 * The change order follows the module's plan order, which the AST already
 * preserves, so the bundle's `deployOrder` is dependency-safe by construction.
 */
export function createBundle(
  module: PgpmModuleAst,
  options: CreateBundleOptions = {}
): MigrationBundle {
  const changes: BundleChange[] = module.changes.map(change => {
    const { deploy, revert, verify } = mapScripts(change, toBundleScript);
    const digest = computeChangeDigest(change.name, {
      deploy: deploy?.digest,
      revert: revert?.digest,
      verify: verify?.digest
    });
    return {
      name: change.name,
      dependencies: change.plan.dependencies ?? [],
      deploy,
      revert,
      verify,
      digest
    };
  });

  const controlContent = module.control?.raw ?? null;
  const deployOrder = changes.map(c => c.name);
  const digest = computeBundleDigest(
    module.planRaw,
    controlContent,
    changes.map(c => c.digest)
  );

  return {
    manifest: {
      formatVersion: BUNDLE_FORMAT_VERSION,
      name: module.name,
      createdWith: options.createdWith ?? '@pgpmjs/core',
      changeCount: changes.length,
      deployOrder,
      digest,
      ...(options.provenance ? { provenance: options.provenance } : {})
    },
    plan: module.planRaw,
    control: module.control
      ? { fileName: module.control.fileName, content: module.control.raw }
      : null,
    changes
  };
}

/**
 * Attach pre-computed executable deploy SQL to a bundle, re-deriving the
 * per-change and top-level digests so the artifact stays content-addressed.
 *
 * The `exec` SQL is the deploy script with transaction / `CREATE EXTENSION`
 * statements stripped — the form the deploy engine actually executes. Computing
 * it requires a SQL parser, which this layer deliberately does not depend on, so
 * the caller (`@pgpmjs/core` at package time) supplies it.
 *
 * Changes with no entry in `execSql` are left untouched.
 */
export function withExecutableSql(
  bundle: MigrationBundle,
  execSql: ExecSqlByChange
): MigrationBundle {
  const changes: BundleChange[] = bundle.changes.map(change => {
    const sql = execSql[change.name];
    if (sql === undefined) return change;
    const exec = { sql, digest: hashString(sql) };
    return {
      ...change,
      exec,
      digest: computeChangeDigest(change.name, {
        deploy: change.deploy?.digest,
        revert: change.revert?.digest,
        verify: change.verify?.digest,
        exec: exec.digest
      })
    };
  });

  return {
    ...bundle,
    manifest: {
      ...bundle.manifest,
      digest: computeBundleDigest(
        bundle.plan,
        bundle.control?.content ?? null,
        changes.map(c => c.digest)
      )
    },
    changes
  };
}
