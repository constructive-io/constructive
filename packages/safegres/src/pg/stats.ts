/**
 * Runtime statistics snapshot (`--stats`).
 *
 * Everything here reads the cumulative statistics views — `pg_stat_user_tables`,
 * `pg_stat_user_indexes`, and (when installed) `pg_stat_statements`. Unlike the
 * catalog checks, these numbers describe a *workload*: they are only as good as
 * the traffic the database has seen since the counters were last reset, which is
 * why the snapshot carries `statsReset` and why the checks take floors.
 */

import type { IntrospectOptions, QueryExecutor } from './introspect';

export interface IndexUsage {
  name: string;
  /** `pg_stat_user_indexes.idx_scan` — times the planner chose this index. */
  scans: number;
  /** `pg_relation_size` of the index, in bytes. */
  sizeBytes: number;
  unique: boolean;
  /** Backs a PRIMARY KEY / UNIQUE / EXCLUDE constraint — never droppable alone. */
  constraint: boolean;
}

export interface TableUsage {
  schema: string;
  name: string;
  seqScans: number;
  seqTuplesRead: number;
  /** Index scans across every index on the table. */
  indexScans: number;
  liveTuples: number;
  deadTuples: number;
  /** `pg_relation_size` of the heap, in bytes. */
  sizeBytes: number;
  /** Most recent vacuum, manual or auto (ISO 8601), null if never. */
  lastVacuum: string | null;
  /** Most recent analyze, manual or auto (ISO 8601), null if never. */
  lastAnalyze: string | null;
  indexes: IndexUsage[];
}

export interface StatementUsage {
  /** Normalised query text (parameters replaced by `$n`). */
  query: string;
  calls: number;
  /** Total execution time across all calls, in milliseconds. */
  totalTimeMs: number;
  meanTimeMs: number;
  /** Rows returned/affected across all calls. */
  rows: number;
}

export interface StatsSnapshot {
  tables: TableUsage[];
  /** Present only when `pg_stat_statements` is installed and readable. */
  statements?: StatementUsage[];
  /**
   * When the cumulative counters were last reset (ISO 8601), from
   * `pg_stat_database`. A recent reset means the numbers describe a short
   * window and the checks should be read as provisional.
   */
  statsReset: string | null;
  /** Why `statements` is absent, for the report's `notes`. */
  statementsUnavailable?: string;
}

const DEFAULT_EXCLUDES = ['pg_catalog', 'information_schema', 'pg_toast'];

/** Statements slower than this in aggregate are worth reporting at all. */
export const DEFAULT_STATEMENT_LIMIT = 20;

export async function introspectStats(
  exec: QueryExecutor,
  options: Pick<IntrospectOptions, 'schemas' | 'excludeSchemas'> & {
    statementLimit?: number;
  } = {}
): Promise<StatsSnapshot> {
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];
  const schemaFilter = options.schemas && options.schemas.length > 0
    ? `AND s.schemaname = ANY($1::text[])`
    : `AND NOT (s.schemaname = ANY($2::text[]))`;

  // Both parameters are referenced (even when only one filters) so Postgres
  // can infer their types — an unused $N errors out at bind time.
  const sql = `
    WITH _params AS (
      SELECT $1::text[] AS include_schemas, $2::text[] AS exclude_schemas
    )
    SELECT
      s.schemaname                                      AS schema_name,
      s.relname                                         AS table_name,
      s.seq_scan                                        AS seq_scans,
      s.seq_tup_read                                    AS seq_tuples_read,
      COALESCE(s.idx_scan, 0)                           AS index_scans,
      s.n_live_tup                                      AS live_tuples,
      s.n_dead_tup                                      AS dead_tuples,
      pg_relation_size(s.relid)                         AS size_bytes,
      GREATEST(s.last_vacuum, s.last_autovacuum)        AS last_vacuum,
      GREATEST(s.last_analyze, s.last_autoanalyze)      AS last_analyze,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'name', i.indexrelname,
          'scans', COALESCE(i.idx_scan, 0),
          'sizeBytes', pg_relation_size(i.indexrelid),
          'unique', ix.indisunique,
          'constraint', (con.oid IS NOT NULL)
        ) ORDER BY i.indexrelname)
         FROM pg_stat_user_indexes i
         JOIN pg_index ix ON ix.indexrelid = i.indexrelid
         LEFT JOIN pg_constraint con
           ON con.conindid = i.indexrelid AND con.contype IN ('p', 'u', 'x')
         WHERE i.relid = s.relid),
        '[]'::jsonb
      )                                                 AS indexes
    FROM pg_stat_user_tables s
    WHERE true
      ${schemaFilter}
    ORDER BY s.schemaname, s.relname
  `;

  const { rows } = await exec.query<{
    schema_name: string;
    table_name: string;
    seq_scans: string | number;
    seq_tuples_read: string | number;
    index_scans: string | number;
    live_tuples: string | number;
    dead_tuples: string | number;
    size_bytes: string | number;
    last_vacuum: Date | string | null;
    last_analyze: Date | string | null;
    indexes: IndexUsage[];
  }>(sql, [options.schemas ?? [], excludes]);

  const tables: TableUsage[] = rows.map((r) => ({
    schema: r.schema_name,
    name: r.table_name,
    seqScans: num(r.seq_scans),
    seqTuplesRead: num(r.seq_tuples_read),
    indexScans: num(r.index_scans),
    liveTuples: num(r.live_tuples),
    deadTuples: num(r.dead_tuples),
    sizeBytes: num(r.size_bytes),
    lastVacuum: iso(r.last_vacuum),
    lastAnalyze: iso(r.last_analyze),
    indexes: r.indexes.map((i) => ({ ...i, scans: num(i.scans), sizeBytes: num(i.sizeBytes) }))
  }));

  const { rows: resetRows } = await exec.query<{ stats_reset: Date | string | null }>(
    `SELECT stats_reset FROM pg_stat_database WHERE datname = current_database()`
  );
  const resetRow = resetRows[0];

  const snapshot: StatsSnapshot = {
    tables,
    statsReset: iso(resetRow?.stats_reset ?? null)
  };

  const statements = await introspectStatements(exec, options.statementLimit);
  if (typeof statements === 'string') snapshot.statementsUnavailable = statements;
  else snapshot.statements = statements;

  return snapshot;
}

/**
 * Top statements by total execution time. Returns a reason string instead of
 * rows when `pg_stat_statements` is not installed or not readable by the
 * connected role — an optional extension is a normal state, not an error.
 */
async function introspectStatements(
  exec: QueryExecutor,
  limit = DEFAULT_STATEMENT_LIMIT
): Promise<StatementUsage[] | string> {
  const { rows: installedRows } = await exec.query<{ present: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') AS present`
  );
  if (!installedRows[0]?.present) {
    return 'pg_stat_statements is not installed — statement-level findings (S4) were skipped';
  }

  try {
    const { rows } = await exec.query<{
      query: string;
      calls: string | number;
      total_time_ms: string | number;
      mean_time_ms: string | number;
      rows: string | number;
    }>(
      `SELECT
         query,
         calls,
         total_exec_time AS total_time_ms,
         mean_exec_time  AS mean_time_ms,
         rows
       FROM pg_stat_statements
       ORDER BY total_exec_time DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map((r) => ({
      query: r.query,
      calls: num(r.calls),
      totalTimeMs: Number(r.total_time_ms),
      meanTimeMs: Number(r.mean_time_ms),
      rows: num(r.rows)
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return `pg_stat_statements is installed but unreadable (${message}) — S4 was skipped`;
  }
}

function num(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function iso(value: Date | string | null): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}
