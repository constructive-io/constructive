import { PgpmScriptKind } from '../ast/types';

/** Current bundle format version. Bumped only on breaking artifact changes. */
export const BUNDLE_FORMAT_VERSION = '1';

/**
 * One script (deploy/revert/verify) inside a bundled change: the SQL text plus a
 * content digest so integrity can be re-verified after transport/transpile.
 */
export interface BundleScript {
  kind: PgpmScriptKind;
  /** SQL text, byte-exact from source. */
  sql: string;
  /** sha256 of {@link sql}. */
  digest: string;
}

/**
 * One change inside a bundle: identity + plan dependencies + its scripts.
 */
export interface BundleChange {
  name: string;
  dependencies: string[];
  deploy: BundleScript | null;
  revert: BundleScript | null;
  verify: BundleScript | null;
  /** sha256 over the change's identity + script digests (see `computeChangeDigest`). */
  digest: string;
}

/**
 * The bundle's self-describing header: what it is, how it was ordered, and where
 * it came from. Digests make the artifact content-addressable and reproducible.
 */
export interface BundleManifest {
  formatVersion: string;
  /** Module / extension name (plan `%project=`). */
  name: string;
  /** Tool that produced the bundle (informational; excluded from {@link digest}). */
  createdWith: string;
  changeCount: number;
  /** Change names in deploy (plan) order. */
  deployOrder: string[];
  /**
   * sha256 over the plan, control, and ordered change digests. Deterministic and
   * independent of `createdWith`/provenance so identical inputs hash identically.
   */
  digest: string;
  /**
   * Optional caller-supplied lineage — e.g. source metaschema revision, the
   * classifier profile used, or a source→target namespace mapping. Recorded in
   * the manifest but excluded from {@link digest} so provenance never perturbs
   * content addressing.
   */
  provenance?: Record<string, string>;
}

/**
 * A portable, content-addressed PGPM migration bundle: the deterministic,
 * ordered artifact that `exportMigrationBundle` emits and `applyMigrationBundle`
 * / `transpileMigrationBundle` consume. Built from a {@link PgpmModuleAst} and
 * round-trippable back into a real pgpm module on disk.
 */
export interface MigrationBundle {
  manifest: BundleManifest;
  /** `pgpm.plan` content, byte-exact. */
  plan: string;
  /** `.control` file, or null when the source module had none. */
  control: { fileName: string; content: string } | null;
  /** Changes in deploy order. */
  changes: BundleChange[];
}
