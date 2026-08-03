/**
 * Ledger-aware classification and backfill for `pgpm diff`.
 *
 * The `pgpm_migrate` ledger is a cursor into a workspace's deployment
 * history: which plan changes a database has executed, with what script
 * hashes, in what order. These pure helpers relate a workspace's plan to a
 * ledger snapshot (classification) and project a set of already-satisfied
 * changes into idempotent ledger writes (backfill) so a database can adopt a
 * regenerated/reordered plan without re-executing what it already has.
 */

/** One row of a database's `pgpm_migrate` ledger, in deploy order. */
export interface LedgerChangeRecord {
  package: string;
  changeName: string;
  scriptHash: string;
  deployedAt?: Date;
  requires?: string[];
}

/** One plan entry of a workspace/module side, with its candidate hashes. */
export interface PlanChangeRef {
  package: string;
  name: string;
  /**
   * Hashes that count as "this exact script": typically the content hash
   * (what `pgpm deploy` records by default) plus the AST hash (formatting-
   * and comment-proof, what `DEPLOYMENT_HASH_METHOD=ast` records).
   */
  hashes: string[];
  /** Plan dependencies as written (local names or `pkg:change`). */
  dependencies: string[];
}

/** How one plan entry relates to the ledger. */
export type LedgerStatus = 'deployed-identical' | 'deployed-drifted' | 'pending';

export interface LedgerEntryClassification {
  package: string;
  name: string;
  status: LedgerStatus;
  /** The hash the ledger recorded, when the change name is in the ledger. */
  ledgerHash?: string;
}

export interface LedgerClassification {
  entries: LedgerEntryClassification[];
  /** Ledger rows whose (package, change) appears in no plan entry. */
  orphaned: LedgerChangeRecord[];
  /**
   * Plan-known changes whose recorded deploy order inverts the plan order
   * (deployed before a change that precedes them in the plan).
   */
  outOfOrder: string[];
}

const refKey = (pkg: string, name: string): string => `${pkg}:${name}`;

/**
 * Classify a plan against a ledger snapshot. Pure and name/hash-based:
 * `deployed-identical` requires the ledger's recorded hash to be one of the
 * plan entry's candidate hashes; a name match with a foreign hash is
 * `deployed-drifted`. Semantic satisfaction (same objects under different
 * names) is the coverage layer's job (`coverChanges`), not this one's.
 */
export function classifyAgainstLedger(
  plan: PlanChangeRef[],
  ledger: LedgerChangeRecord[]
): LedgerClassification {
  const ledgerByKey = new Map<string, LedgerChangeRecord>();
  for (const row of ledger) {
    ledgerByKey.set(refKey(row.package, row.changeName), row);
  }

  const planKeys = new Set(plan.map(ref => refKey(ref.package, ref.name)));
  const entries: LedgerEntryClassification[] = plan.map(ref => {
    const row = ledgerByKey.get(refKey(ref.package, ref.name));
    if (!row) return { package: ref.package, name: ref.name, status: 'pending' };
    return {
      package: ref.package,
      name: ref.name,
      status: ref.hashes.includes(row.scriptHash) ? 'deployed-identical' : 'deployed-drifted',
      ledgerHash: row.scriptHash
    };
  });

  const orphaned = ledger.filter(row => !planKeys.has(refKey(row.package, row.changeName)));

  // Inversion detection: walk the ledger in deploy order and flag any
  // plan-known change that lands after a change the plan places later.
  const planIndex = new Map<string, number>();
  plan.forEach((ref, i) => planIndex.set(refKey(ref.package, ref.name), i));
  const outOfOrder: string[] = [];
  let maxSeen = -1;
  for (const row of ledger) {
    const idx = planIndex.get(refKey(row.package, row.changeName));
    if (idx === undefined) continue;
    if (idx < maxSeen) outOfOrder.push(refKey(row.package, row.changeName));
    else maxSeen = idx;
  }

  return { entries, orphaned, outOfOrder };
}

/** One ledger row to backfill without executing anything. */
export interface LedgerBackfillEntry {
  package: string;
  changeName: string;
  scriptHash: string;
  /** Requires exactly as the plan records them (local or `pkg:change`). */
  requires: string[];
}

const sqlLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * Project backfill entries into an idempotent SQL script that records them in
 * `pgpm_migrate` without executing any DDL, by calling the same
 * `pgpm_migrate.deploy` procedure a real deploy uses with `p_log_only =>
 * TRUE` and an empty script. Entries must be in plan order (the procedure
 * enforces that requires are already recorded). The target database must
 * already have the `pgpm_migrate` schema (any prior `pgpm deploy` creates
 * it).
 */
export function emitLedgerBackfill(
  entries: LedgerBackfillEntry[],
  options: { transaction?: boolean } = {}
): string {
  const transaction = options.transaction !== false;
  const lines: string[] = [
    '-- pgpm ledger backfill: record already-satisfied changes in pgpm_migrate',
    '-- without executing them (log-only deploys through pgpm_migrate.deploy).',
    ''
  ];
  if (transaction) lines.push('BEGIN;', '');
  for (const entry of entries) {
    const requires =
      entry.requires.length > 0
        ? `ARRAY[${entry.requires.map(sqlLiteral).join(', ')}]`
        : 'NULL';
    lines.push(
      'CALL pgpm_migrate.deploy(' +
        [
          sqlLiteral(entry.package),
          sqlLiteral(entry.changeName),
          sqlLiteral(entry.scriptHash),
          requires,
          "''",
          'TRUE'
        ].join(', ') +
        ');'
    );
  }
  if (transaction) lines.push('', 'COMMIT;');
  return `${lines.join('\n')}\n`;
}
