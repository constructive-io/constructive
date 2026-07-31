/**
 * Proof by EXPLAIN (`--explain`).
 *
 * The `X*` rules infer from the catalog that a query *shape* has no index to
 * serve it. This turns the inference into evidence: for each finding that has
 * a probe shape, plan the query the finding is about and read the plan back.
 *
 * The planner is the authority, so the interesting outcome is disagreement —
 * a finding whose probe plans as an index scan is **refuted** (some index the
 * catalog rules didn't credit does serve it) and stops counting against the
 * score. The reverse is not symmetrical: an empty or unanalyzed table always
 * seq-scans, so a seq scan only *confirms* a finding above the row floor;
 * below it the probe is inconclusive and the finding is left exactly as it
 * was.
 *
 * Probes use `EXPLAIN (GENERIC_PLAN)` — parameters stay parameters, nothing
 * is executed, and no value has to be invented for a column whose domain we
 * know nothing about. That requires PostgreSQL 16+.
 */

import type { QueryExecutor } from '../pg/introspect';
import type { TableIndexSnapshot } from '../pg/indexes';
import type { Finding, FindingEvidence } from '../types';

export interface ExplainOptions {
  /**
   * Below this planner row estimate a sequential scan is the correct plan, so
   * a seq-scan result proves nothing. Default 1000.
   */
  minRows?: number;
}

export interface ExplainReport {
  /** Findings that were probed. */
  probed: number;
  /** Probes whose plan showed the scan the finding predicted. */
  confirmed: number;
  /** Probes the planner served with an index — the finding was wrong. */
  refuted: number;
  /** Probes on tables too small for the plan to mean anything. */
  inconclusive: number;
  /** Why probing was skipped entirely, when it was. */
  unavailable?: string;
}

/** The minimum server version supporting `EXPLAIN (GENERIC_PLAN)`. */
const MIN_SERVER_VERSION = 160000;

interface Probe {
  sql: string;
  /** The plan node that would mean "the finding is real". */
  expect: 'seq-scan' | 'sort';
}

/**
 * Plan a probe for every probeable perf finding and annotate it in place.
 * Findings the planner refutes are acknowledged (reported, unscored).
 */
export async function proveFindings(
  exec: QueryExecutor,
  findings: Finding[],
  tables: Map<string, TableIndexSnapshot>,
  options: ExplainOptions = {}
): Promise<ExplainReport> {
  const minRows = options.minRows ?? 1000;
  const report: ExplainReport = { probed: 0, confirmed: 0, refuted: 0, inconclusive: 0 };

  const { rows: versionRows } = await exec.query<{ setting: string }>(
    `SELECT setting FROM pg_settings WHERE name = 'server_version_num'`
  );
  const version = versionRows[0];
  if (Number(version?.setting ?? 0) < MIN_SERVER_VERSION) {
    report.unavailable =
      `EXPLAIN (GENERIC_PLAN) requires PostgreSQL 16 or later (server is ${version?.setting ?? 'unknown'}) — no findings were probed`;
    return report;
  }

  for (const finding of findings) {
    if (!finding.schema || !finding.table) continue;
    const table = tables.get(`${finding.schema}.${finding.table}`);
    if (!table) continue;

    const probe = buildProbe(finding, table);
    if (!probe) continue;

    const plan = await planProbe(exec, probe.sql);
    if (!plan) continue;
    report.probed += 1;

    const nodes = collectNodeTypes(plan);
    const servedByIndex = nodes.some((n) => n.includes('Index'));
    const predicted = probe.expect === 'sort'
      ? nodes.includes('Sort') || nodes.includes('Incremental Sort')
      : nodes.includes('Seq Scan');

    const evidence: FindingEvidence = {
      source: 'explain',
      probe: probe.sql,
      plan: nodes.join(' → '),
      status: 'inconclusive'
    };

    if (servedByIndex && !predicted) {
      evidence.status = 'refuted';
      report.refuted += 1;
      finding.acknowledged = true;
      finding.severity = 'info';
      finding.message += ' — refuted by EXPLAIN (the planner serves this shape with an index)';
      finding.hint =
        'The planner chose an index for the probe query, so this finding does not describe a real plan. Reported for review, excluded from the perf score.';
    } else if (predicted && estimatedRows(table) >= minRows) {
      evidence.status = 'confirmed';
      report.confirmed += 1;
    } else {
      report.inconclusive += 1;
      evidence.note = estimatedRows(table) < minRows
        ? `table has ~${Math.max(estimatedRows(table), 0)} estimated rows (< ${minRows}); a sequential scan is the correct plan at this size, so the probe proves nothing`
        : 'the probe plan matched neither an index scan nor the predicted scan';
    }

    finding.evidence = evidence;
  }

  return report;
}

/**
 * The query a finding is a claim about. `null` for findings with no probeable
 * shape (X5 redundant indexes, X6 missing PK, S*, P*) — nothing is planned
 * speculatively, so `--explain` never invents work.
 */
function buildProbe(finding: Finding, table: TableIndexSnapshot): Probe | null {
  const relation = `${quote(table.schema)}.${quote(table.name)}`;
  const context = finding.context ?? {};

  switch (finding.code) {
    case 'X1': {
      const columns = asStringArray(context.columns);
      if (columns.length === 0) return null;
      const predicates = columns
        .map((name, i) => equality(table, name, i + 1))
        .filter((p): p is string => p !== null);
      if (predicates.length !== columns.length) return null;
      return { sql: `SELECT 1 FROM ${relation} WHERE ${predicates.join(' AND ')}`, expect: 'seq-scan' };
    }
    case 'X2': {
      const predicate = typeof context.column === 'string'
        ? equality(table, context.column, 1)
        : null;
      if (!predicate) return null;
      return { sql: `SELECT 1 FROM ${relation} WHERE ${predicate}`, expect: 'seq-scan' };
    }
    case 'X7': {
      const column = typeof context.column === 'string' ? context.column : null;
      if (!column) return null;
      const type = columnType(table, column);
      if (!type) return null;
      if (type === 'tsvector') {
        return {
          sql: `SELECT 1 FROM ${relation} WHERE ${quote(column)} @@ $1::tsquery`,
          expect: 'seq-scan'
        };
      }
      // Vector search is an ordering, not a filter: the index either serves
      // the distance order or the plan sorts every row.
      return {
        sql: `SELECT 1 FROM ${relation} ORDER BY ${quote(column)} <-> $1::${type} LIMIT 10`,
        expect: 'sort'
      };
    }
    case 'X8': {
      const column = typeof context.column === 'string' ? context.column : null;
      if (!column) return null;
      return {
        sql: `SELECT 1 FROM ${relation} ORDER BY ${quote(column)} DESC LIMIT 100`,
        expect: 'sort'
      };
    }
    default:
      return null;
  }
}

async function planProbe(exec: QueryExecutor, sql: string): Promise<unknown | null> {
  try {
    const { rows } = await exec.query<Record<string, unknown>>(
      `EXPLAIN (GENERIC_PLAN, FORMAT JSON) ${sql}`
    );
    const first = rows[0];
    if (!first) return null;
    // node-postgres returns the single JSON column under 'QUERY PLAN'.
    const value = first['QUERY PLAN'] ?? Object.values(first)[0];
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    // A probe that cannot be planned (missing operator class, permissions,
    // an exotic type) is simply not evidence.
    return null;
  }
}

/** Plan node types, outermost first. */
function collectNodeTypes(plan: unknown): string[] {
  const out: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (typeof record['Node Type'] === 'string') out.push(record['Node Type']);
    for (const key of ['Plan', 'Plans']) {
      if (key in record) visit(record[key]);
    }
  };
  visit(plan);
  return out;
}

function equality(table: TableIndexSnapshot, column: string, param: number): string | null {
  const type = columnType(table, column);
  if (!type) return null;
  return `${quote(column)} = $${param}::${type}`;
}

function columnType(table: TableIndexSnapshot, column: string): string | null {
  return table.columns.find((c) => c.name === column)?.type ?? null;
}

function estimatedRows(table: TableIndexSnapshot): number {
  return table.estimatedRows;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function quote(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
