/**
 * Ledger-aware reconciliation: relate a plan-bearing diff side to a live
 * database's `pgpm_migrate` ledger.
 *
 * Two independent judgements are combined here. Name/hash classification
 * (`classifyAgainstLedger`) says what the ledger literally records. Semantic
 * coverage (`coverChanges`) says which of a side's changes the other side's
 * catalog already satisfies — which is what survives a regenerated plan
 * whose changes were renamed, regrouped, or reordered. A change that is
 * `pending` by name but `satisfied` semantically is exactly what a backfill
 * should record without re-executing.
 */
import type {
  BackfillSelection,
  LedgerBackfillEntry,
  LedgerChangeRecord,
  LedgerClassification,
  PlanChangeRef
} from '@pgpmjs/diff';
import { classifyAgainstLedger, emitLedgerBackfill, selectBackfillEntries } from '@pgpmjs/diff';
import type { ChangeCoverage, DiffInputChange, ModuleSource, SemanticDiffResult } from '@pgpmjs/transform';
import { coverChanges } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';
import type { PgConfig } from 'pg-env';

import { PgpmMigrate } from '../migrate/client';
import { hashSqlFile, hashString } from '../migrate/utils/hash';
import { loadPlanSideModules } from './sides';

/**
 * Candidate hashes for every plan entry of a set of modules: the raw content
 * hash (what `pgpm deploy` records by default) and the AST hash (what
 * `DEPLOYMENT_HASH_METHOD=ast` records — formatting- and comment-proof). A
 * ledger row matches the plan entry when it recorded either.
 */
export const planChangeRefs = async (modules: ModuleSource[]): Promise<PlanChangeRef[]> => {
  const refs: PlanChangeRef[] = [];
  for (const mod of modules) {
    for (const change of mod.changes) {
      const deployPath = path.join(mod.modulePath, 'deploy', `${change.name}.sql`);
      const hashes: string[] = [];
      if (fs.existsSync(deployPath)) {
        hashes.push(hashString(fs.readFileSync(deployPath, 'utf-8')));
        hashes.push(await hashSqlFile(deployPath));
      }
      refs.push({
        package: mod.name,
        name: change.name,
        hashes,
        dependencies: change.dependencies
      });
    }
  }
  return refs;
};

/** Read a database's `pgpm_migrate` ledger as a snapshot, in deploy order. */
export const readLedgerSnapshot = async (config: PgConfig): Promise<LedgerChangeRecord[]> => {
  const rows = await new PgpmMigrate(config).readDeployedState();
  return rows.map(row => ({
    package: row.package,
    changeName: row.changeName,
    scriptHash: row.scriptHash,
    deployedAt: row.deployedAt,
    requires: row.requires
  }));
};

/** A plan-vs-ledger reconciliation, with the backfill it implies. */
export interface LedgerReport extends BackfillSelection {
  classification: LedgerClassification;
  coverage: ChangeCoverage[];
  /** Backfill script for {@link BackfillSelection.entries}, when non-empty. */
  backfillSql?: string;
}

export interface LedgerReportOptions {
  /** Database whose ledger is the deployment cursor (`db:<name>` or a DSN). */
  config: PgConfig;
  /** The plan-bearing side: a workspace or module directory. */
  spec: string;
  cwd?: string;
  /** That side's changes, as flattened for the diff. */
  changes: DiffInputChange[];
  /** The semantic diff of the two sides, for coverage. */
  diff: SemanticDiffResult;
}

/**
 * Build the reconciliation report: classify the side's plan against the
 * ledger, compute semantic coverage against the diff, and emit the backfill
 * for entries that are unrecorded but already satisfied, so a subsequent
 * `pgpm deploy` executes only the genuine delta.
 */
export const buildLedgerReport = async (options: LedgerReportOptions): Promise<LedgerReport> => {
  const modules = await loadPlanSideModules(options.spec, options.cwd);
  const refs = await planChangeRefs(modules);
  const ledger = await readLedgerSnapshot(options.config);

  const classification = classifyAgainstLedger(refs, ledger);
  const coverage = coverChanges(options.changes, options.diff);
  const selection = selectBackfillEntries(refs, classification, coverage);

  return {
    ...selection,
    classification,
    coverage,
    backfillSql: selection.entries.length > 0 ? emitLedgerBackfill(selection.entries) : undefined
  };
};

/**
 * Every plan entry of a set of modules as a backfill row, in plan order — the
 * whole plan, not the satisfied subset. This is the "baseline" input: a
 * database that already carries a plan's schema (e.g. one imported from a
 * dump, or one adopted from outside pgpm) can record the entire plan as
 * deployed without re-executing any DDL. Entries with no candidate hash
 * (deploy script missing) are skipped, mirroring {@link selectBackfillEntries}.
 */
export const baselineBackfillEntries = async (
  modules: ModuleSource[]
): Promise<LedgerBackfillEntry[]> => {
  const refs = await planChangeRefs(modules);
  const entries: LedgerBackfillEntry[] = [];
  for (const ref of refs) {
    const scriptHash = ref.hashes[0];
    if (!scriptHash) continue;
    entries.push({
      package: ref.package,
      changeName: ref.name,
      scriptHash,
      requires: ref.dependencies
    });
  }
  return entries;
};

/** A whole-plan baseline backfill for a plan-bearing side. */
export interface BaselineBackfill {
  /** Backfill rows for every plan entry, in plan order. */
  entries: LedgerBackfillEntry[];
  /** Idempotent log-only backfill script for {@link entries}. */
  backfillSql: string;
}

/**
 * Build a whole-plan baseline backfill for a workspace or module directory:
 * record every change as already deployed, log-only, so a `pgpm deploy`
 * afterward is a no-op and the database is adopted at the plan's head. The
 * target database must already have the `pgpm_migrate` schema
 * (`pgpm migrate init` or any prior deploy creates it, and applying the
 * baseline through `PgpmMigrate.deploy({ logOnly: true })` initializes it).
 */
export const buildBaselineBackfill = async (
  spec: string,
  cwd?: string
): Promise<BaselineBackfill> => {
  const modules = await loadPlanSideModules(spec, cwd);
  const entries = await baselineBackfillEntries(modules);
  return { entries, backfillSql: emitLedgerBackfill(entries) };
};
