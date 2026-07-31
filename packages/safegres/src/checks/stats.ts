/**
 * Runtime-statistics checks (`--stats`, `S*`).
 *
 * These read the cumulative statistics views rather than the catalog, so
 * unlike the `X*` rules they describe a workload rather than a schema: the
 * same database can pass or fail depending on what traffic it has served.
 * Every rule therefore takes a floor, so a cold or freshly-reset database
 * produces silence instead of noise.
 */

import type { StatementUsage, StatsSnapshot, TableUsage } from '../pg/stats';
import type { Finding } from '../types';

export interface StatsThresholds {
  /** Ignore tables with fewer live rows than this. Default 1000. */
  minRows: number;
  /** S1 fires when seqScans exceed indexScans by this factor. Default 10. */
  seqScanRatio: number;
  /** S2 ignores indexes smaller than this many bytes. Default 1 MiB. */
  minIndexBytes: number;
  /** S3 fires above this dead/live tuple ratio. Default 0.2. */
  deadTupleRatio: number;
  /** S4 fires for statements at or above this share of total time. Default 0.05. */
  minTimeShare: number;
  /** S4 reports at most this many statements. Default 5. */
  topStatements: number;
}

export const DEFAULT_STATS_THRESHOLDS: StatsThresholds = {
  minRows: 1000,
  seqScanRatio: 10,
  minIndexBytes: 1024 * 1024,
  deadTupleRatio: 0.2,
  minTimeShare: 0.05,
  topStatements: 5
};

/**
 * S1: a table the planner reaches by sequential scan far more often than by
 * index. On a table above the row floor that is a missing index, a policy
 * predicate the planner can't use, or a query shape nothing covers.
 */
export function checkSeqScanDominant(
  table: TableUsage,
  thresholds: StatsThresholds
): Finding | null {
  if (table.liveTuples < thresholds.minRows) return null;
  if (table.seqScans === 0) return null;
  if (table.seqScans < table.indexScans * thresholds.seqScanRatio) return null;
  // A table with no index at all is X6/X1 territory; the stats add nothing.
  if (table.indexes.length === 0) return null;

  const perScan = Math.round(table.seqTuplesRead / Math.max(table.seqScans, 1));
  return {
    code: 'S1',
    severity: 'medium',
    category: 'index',
    schema: table.schema,
    table: table.name,
    message:
      `${table.schema}.${table.name} is scanned sequentially ${table.seqScans} times vs ${table.indexScans} index scans (${table.liveTuples} live rows, ~${perScan} rows read per scan)`,
    hint:
      'Find the query shape behind the scans (pg_stat_statements, auto_explain) and index for it — at this row count every seq scan reads the whole table.',
    context: {
      seqScans: table.seqScans,
      indexScans: table.indexScans,
      liveTuples: table.liveTuples
    }
  };
}

/**
 * S2: an index the planner has never chosen. It still costs write throughput,
 * disk, and vacuum time. Constraint-backed and unique indexes are exempt:
 * they exist to enforce a constraint, not to be scanned.
 */
export function checkUnusedIndexes(
  table: TableUsage,
  thresholds: StatsThresholds
): Finding[] {
  const findings: Finding[] = [];
  for (const index of table.indexes) {
    if (index.scans > 0) continue;
    if (index.unique || index.constraint) continue;
    if (index.sizeBytes < thresholds.minIndexBytes) continue;

    findings.push({
      code: 'S2',
      severity: 'low',
      category: 'index',
      schema: table.schema,
      table: table.name,
      message:
        `Index ${index.name} on ${table.schema}.${table.name} has never been scanned (${formatBytes(index.sizeBytes)})`,
      hint:
        `DROP INDEX ${table.schema}.${index.name}; — confirm the counters cover a representative window first (see perf.stats.since).`,
      context: { index: index.name, sizeBytes: index.sizeBytes }
    });
  }
  return findings;
}

/**
 * S3: dead tuples the vacuum is not keeping up with. Bloat inflates every
 * scan of the table and every index on it, and the planner's row estimates
 * drift with it.
 */
export function checkDeadTuples(
  table: TableUsage,
  thresholds: StatsThresholds
): Finding | null {
  if (table.liveTuples < thresholds.minRows) return null;
  const ratio = table.deadTuples / Math.max(table.liveTuples, 1);
  if (ratio < thresholds.deadTupleRatio) return null;

  return {
    code: 'S3',
    severity: 'low',
    category: 'index',
    schema: table.schema,
    table: table.name,
    message:
      `${table.schema}.${table.name} is ${Math.round(ratio * 100)}% dead tuples (${table.deadTuples} dead / ${table.liveTuples} live${table.lastVacuum ? `, last vacuumed ${table.lastVacuum}` : ', never vacuumed'})`,
    hint:
      'VACUUM (ANALYZE) the table, then tune autovacuum for it (autovacuum_vacuum_scale_factor) — bloat is read by every scan and every index on the table.',
    context: {
      deadTuples: table.deadTuples,
      liveTuples: table.liveTuples,
      lastVacuum: table.lastVacuum
    }
  };
}

/**
 * S4: the statements the database actually spends its time in, restricted to
 * ones touching a table in scope. This is not a defect — it is the ranked
 * list to read the other findings against, so it is `info` by default.
 */
export function checkTopStatements(
  statements: StatementUsage[],
  tables: TableUsage[],
  thresholds: StatsThresholds
): Finding[] {
  const totalTime = statements.reduce((sum, s) => sum + s.totalTimeMs, 0);
  if (totalTime <= 0) return [];

  const findings: Finding[] = [];
  for (const statement of statements) {
    if (findings.length >= thresholds.topStatements) break;
    const share = statement.totalTimeMs / totalTime;
    if (share < thresholds.minTimeShare) continue;

    const matched = tables.filter((t) => statementTouches(statement.query, t));
    if (matched.length === 0) continue;

    const relations = matched.map((t) => `${t.schema}.${t.name}`);
    findings.push({
      code: 'S4',
      severity: 'info',
      category: 'index',
      schema: matched[0].schema,
      table: matched[0].name,
      message:
        `${Math.round(share * 100)}% of database execution time is spent in one statement over ${relations.join(', ')} (${statement.calls} calls, ${Math.round(statement.meanTimeMs)}ms mean)`,
      hint: `EXPLAIN (ANALYZE, BUFFERS) this statement before acting on any other finding for these tables:\n    ${truncate(statement.query, 300)}`,
      context: {
        statement: truncate(statement.query, 300),
        calls: statement.calls,
        totalTimeMs: Math.round(statement.totalTimeMs),
        meanTimeMs: Math.round(statement.meanTimeMs),
        relations
      }
    });
  }
  return findings;
}

/** Every stats finding for one snapshot. */
export function checkStats(
  snapshot: StatsSnapshot,
  thresholds: StatsThresholds = DEFAULT_STATS_THRESHOLDS
): Finding[] {
  const findings: Finding[] = [];
  for (const table of snapshot.tables) {
    const s1 = checkSeqScanDominant(table, thresholds);
    if (s1) findings.push(s1);
    findings.push(...checkUnusedIndexes(table, thresholds));
    const s3 = checkDeadTuples(table, thresholds);
    if (s3) findings.push(s3);
  }
  if (snapshot.statements) {
    findings.push(...checkTopStatements(snapshot.statements, snapshot.tables, thresholds));
  }
  return findings;
}

/**
 * Whether a normalised statement references a table. `pg_stat_statements`
 * stores text, not parsed relations, so this matches the qualified name or
 * the bare name on a word boundary — good enough to rank hotspots, and
 * deliberately not used for anything that changes a severity.
 */
function statementTouches(query: string, table: TableUsage): boolean {
  const qualified = new RegExp(`\\b${escapeRegExp(table.schema)}\\.${escapeRegExp(table.name)}\\b`, 'i');
  if (qualified.test(query)) return true;
  const bare = new RegExp(`\\b(from|join|into|update)\\s+"?${escapeRegExp(table.name)}"?\\b`, 'i');
  return bare.test(query);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncate(value: string, max: number): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 1)}…`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GiB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
  return `${Math.round(bytes / 1024)} KiB`;
}
