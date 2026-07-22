import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PgConfig } from 'pg-env';

import { PgpmScriptKind } from '@pgpmjs/ast/module/types';
import { PgpmMigrate, PgpmMigrateOptions } from '../migrate/client';
import { DeployResult, VerifyResult } from '../migrate/types';
import { materializeBundle } from './io';
import { MigrationBundle } from './types';
import { BundleIssue, verifyBundle } from './verify';

/** A script whose SQL references something outside the allowed namespace. */
export interface NamespaceViolation {
  change: string;
  kind: PgpmScriptKind;
  /** Offending references reported by the caller's validator. */
  references: string[];
}

/**
 * A validator for transpiled bundles: given a script's SQL, return the
 * references that fall *outside* the target namespace (empty = clean). Core
 * stays parser-agnostic; the caller (constructive-db) supplies the AST check.
 */
export type ReferenceValidator = (
  sql: string,
  ctx: { change: string; kind: PgpmScriptKind }
) => string[];

/** Pre-flight analysis of an apply, computed without touching the database. */
export interface ApplyBundlePreview {
  name: string;
  /** Changes in deploy order. */
  deployOrder: string[];
  /** Digest/order/integrity problems from {@link verifyBundle}. */
  bundleIssues: BundleIssue[];
  /** References outside the target namespace (only when a validator is given). */
  namespaceViolations: NamespaceViolation[];
  /** Reverse deploy order — the revert sequence that fully undoes this apply. */
  rollbackPlan: string[];
}

export interface PreviewBundleApplyOptions {
  validateReferences?: ReferenceValidator;
}

/**
 * Analyze a bundle apply without executing it: verify artifact integrity, run
 * the optional namespace-reference validator, and derive the rollback plan.
 * Pure — no database, no disk.
 */
export function previewBundleApply(
  bundle: MigrationBundle,
  options: PreviewBundleApplyOptions = {}
): ApplyBundlePreview {
  const namespaceViolations: NamespaceViolation[] = [];
  if (options.validateReferences) {
    for (const change of bundle.changes) {
      for (const script of [change.deploy, change.revert, change.verify]) {
        if (!script) continue;
        const references = options.validateReferences(script.sql, {
          change: change.name,
          kind: script.kind
        });
        if (references.length > 0) {
          namespaceViolations.push({ change: change.name, kind: script.kind, references });
        }
      }
    }
  }

  return {
    name: bundle.manifest.name,
    deployOrder: [...bundle.manifest.deployOrder],
    bundleIssues: verifyBundle(bundle),
    namespaceViolations,
    rollbackPlan: [...bundle.manifest.deployOrder].reverse()
  };
}

export interface ApplyBundleOptions extends PreviewBundleApplyOptions {
  /** Target database. */
  config: PgConfig;
  /** Analyze only; never touch the database. Default false. */
  dryRun?: boolean;
  /** Run `verify` after a successful deploy. Default false. */
  verify?: boolean;
  /**
   * Wall-clock budget for the deploy (+ optional verify). On expiry the result
   * is flagged `timedOut` and a {@link BundleApplyError} is thrown. The apply
   * runs in a single transaction (see `useTransaction`), so the database rolls
   * back rather than being left half-applied.
   */
  timeoutMs?: number;
  /** Apply as one atomic transaction so any failure rolls back. Default true. */
  useTransaction?: boolean;
  /** Directory to materialize into (default: a temp dir, removed afterward). */
  workDir?: string;
  migrateOptions?: PgpmMigrateOptions;
  /** Apply even if artifact verification fails. Default false (refuse). */
  allowUnverified?: boolean;
}

/** Explicit outcome of an {@link applyBundle} call. */
export interface ApplyBundleResult {
  preview: ApplyBundlePreview;
  dryRun: boolean;
  /** True when the deploy actually ran against the database. */
  executed: boolean;
  deploy?: DeployResult;
  verify?: VerifyResult;
  durationMs: number;
  timedOut: boolean;
}

/** Thrown when an apply is refused pre-flight or exceeds its timeout. */
export class BundleApplyError extends Error {
  constructor(
    message: string,
    readonly preview: ApplyBundlePreview,
    readonly timedOut = false
  ) {
    super(message);
    this.name = 'BundleApplyError';
  }
}

const TIMEOUT = Symbol('timeout');

async function withTimeout<T>(
  work: Promise<T>,
  ms: number | undefined
): Promise<T | typeof TIMEOUT> {
  if (!ms) return work;
  let timer: NodeJS.Timeout;
  const timeout = new Promise<typeof TIMEOUT>(resolve => {
    timer = setTimeout(() => resolve(TIMEOUT), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Safely apply a {@link MigrationBundle} to a target database.
 *
 * A thin, safety-first wrapper over {@link PgpmMigrate}: it gates on artifact
 * integrity and (optionally) namespace validation, supports a dry run, applies
 * atomically in a single transaction, enforces a timeout, and returns an
 * explicit result including the rollback plan.
 *
 * The mechanics (materialize → deploy → verify) reuse existing plumbing;
 * nothing here re-implements deployment.
 */
export async function applyBundle(
  bundle: MigrationBundle,
  options: ApplyBundleOptions
): Promise<ApplyBundleResult> {
  const started = Date.now();
  const preview = previewBundleApply(bundle, options);

  if (!options.allowUnverified && preview.bundleIssues.length > 0) {
    throw new BundleApplyError(
      `Refusing to apply "${preview.name}": bundle failed integrity verification ` +
        `(${preview.bundleIssues.length} issue(s): ${preview.bundleIssues.map(i => i.kind).join(', ')})`,
      preview
    );
  }
  if (preview.namespaceViolations.length > 0) {
    throw new BundleApplyError(
      `Refusing to apply "${preview.name}": ${preview.namespaceViolations.length} ` +
        `reference(s) fall outside the target namespace`,
      preview
    );
  }

  if (options.dryRun) {
    return {
      preview,
      dryRun: true,
      executed: false,
      durationMs: Date.now() - started,
      timedOut: false
    };
  }

  const ownWorkDir = options.workDir === undefined;
  const workDir = options.workDir ?? mkdtempSync(join(tmpdir(), 'pgpm-apply-'));
  materializeBundle(bundle, workDir);

  const migrate = new PgpmMigrate(options.config, options.migrateOptions);
  const useTransaction = options.useTransaction ?? true;

  try {
    const run = (async (): Promise<{ deploy: DeployResult; verify?: VerifyResult }> => {
      const deploy = await migrate.deploy({ modulePath: workDir, useTransaction });
      let verify: VerifyResult | undefined;
      if (options.verify) {
        verify = await migrate.verify({ modulePath: workDir });
      }
      return { deploy, verify };
    })();

    const outcome = await withTimeout(run, options.timeoutMs);
    if (outcome === TIMEOUT) {
      throw new BundleApplyError(
        `Apply of "${preview.name}" exceeded ${options.timeoutMs}ms`,
        preview,
        true
      );
    }

    return {
      preview,
      dryRun: false,
      executed: true,
      deploy: outcome.deploy,
      verify: outcome.verify,
      durationMs: Date.now() - started,
      timedOut: false
    };
  } finally {
    if (ownWorkDir) {
      try {
        rmSync(workDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
}
