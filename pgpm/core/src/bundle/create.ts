import { PgpmModuleAst, PgpmScriptAst } from '@pgpmjs/ast/module/types';
import { hashString } from '../migrate/utils/hash';
import {
  BUNDLE_FORMAT_VERSION,
  BundleChange,
  BundleScript,
  MigrationBundle
} from './types';

/**
 * Digest for a single change: its name plus the digests of its scripts, in a
 * fixed deploy/revert/verify order. A missing script contributes an empty slot
 * so presence/absence changes the digest.
 */
export function computeChangeDigest(
  name: string,
  scripts: { deploy?: string | null; revert?: string | null; verify?: string | null }
): string {
  return hashString(
    [name, scripts.deploy ?? '', scripts.revert ?? '', scripts.verify ?? ''].join('\n')
  );
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
    const deploy = toBundleScript(change.deploy);
    const revert = toBundleScript(change.revert);
    const verify = toBundleScript(change.verify);
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
