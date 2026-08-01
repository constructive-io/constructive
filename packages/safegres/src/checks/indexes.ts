/**
 * Structural index-hygiene checks (perf dimension, `X*`).
 *
 * Everything here is pure catalog analysis — deterministic, workload-free,
 * and safe to run in CI against an empty database.
 */

import type { IndexInfo, TableIndexSnapshot } from '../pg/indexes';
import { type AccessPath, pathKey } from '../pg/paths';
import type { Finding } from '../types';

/**
 * What X1 does with a foreign key whose only evidence is shape — it looks like
 * a write-once provisioning pointer, but nothing has proven the path is
 * unreachable.
 *
 * `report` is the default and the only honest one until a signal exists that
 * can observe the generated API surface: the finding stands, and the shape is
 * attached to it as context so a reviewer can act on it. The other two exist
 * so the decision is a line of config rather than a fork of the scanner.
 *
 * `demote` is applied in `audit()` rather than here, because severities are
 * restamped from the rule registry after the checks run.
 */
export type WriteOncePointerPolicy = 'report' | 'demote' | 'suppress';

/**
 * X1: a foreign key with no index that can serve it.
 *
 * An index covers a FK when its *leading* columns are exactly the FK's
 * columns (order among them is irrelevant for equality lookups) and it
 * covers every row. Without one, `ON DELETE`/`ON UPDATE` checks on the
 * referenced side and joins on the referencing side degrade to sequential
 * scans.
 *
 * Partial and expression indexes do not count: the planner cannot rely on
 * them for the referential-integrity lookup.
 *
 * `paths` supplies the access-path signals. They never remove a finding on
 * their own — see {@link WriteOncePointerPolicy} and `classifyPaths`.
 */
export function checkUnindexedForeignKeys(
  table: TableIndexSnapshot,
  paths?: Map<string, AccessPath>,
  onWriteOncePointer: WriteOncePointerPolicy = 'report'
): Finding[] {
  // Partitions inherit their parent's indexes; the parent carries the finding.
  if (table.isPartition) return [];

  const findings: Finding[] = [];
  for (const fk of table.foreignKeys) {
    if (fk.columns.length === 0) continue;
    if (table.indexes.some((idx) => indexCoversColumns(idx, fk.columns))) continue;

    const path = paths?.get(pathKey(table.schema, table.name, fk.name));
    // Tested on the signal, not the assessment: a path can be both write-once
    // shaped and declared hidden, and the assessment reports only the stronger
    // of the two. `onWriteOncePointer` must keep meaning what it meant.
    const writeOnceShaped =
      path?.assessment === 'write-once-shaped' ||
      (path?.signals.some((s) => s.name === 'config-record') ?? false);
    if (writeOnceShaped && onWriteOncePointer === 'suppress') continue;

    const cols = fk.columnNames.join(', ');
    findings.push({
      code: 'X1',
      severity: 'medium',
      category: 'index',
      schema: table.schema,
      table: table.name,
      message:
        `Foreign key ${fk.name} on ${table.schema}.${table.name} (${cols}) has no covering index`,
      hint: writeOnceShaped
        ? `CREATE INDEX ON ${table.schema}.${table.name} (${cols}) — or, if nothing queries this relation, stop exposing it. ${path!.signals.map((s) => s.detail).join('; ')}.`
        : `CREATE INDEX ON ${table.schema}.${table.name} (${cols}); without it, deletes/updates on ${fk.references} and joins across this key scan the whole table.`,
      context: {
        constraint: fk.name,
        columns: fk.columnNames,
        references: fk.references,
        ...(path ? { pathSignals: path.signals.map((s) => s.name), pathAssessment: path.assessment } : {})
      }
    });
  }
  return findings;
}

/**
 * X5: an index that another index already serves.
 *
 * Two shapes: an exact duplicate, or a non-unique index whose columns are a
 * leading-column prefix of a wider index. Both cost write throughput and
 * disk for nothing. Constraint-backed indexes (PK/UNIQUE/EXCLUDE) are never
 * reported — dropping them would drop the constraint.
 */
export function checkRedundantIndexes(table: TableIndexSnapshot): Finding[] {
  const findings: Finding[] = [];
  const candidates = table.indexes.filter(
    (i) => !i.primary && !i.constraint && !i.partial && !i.expression && !i.unique
  );

  for (const idx of candidates) {
    const covering = table.indexes.find((other) => {
      if (other.name === idx.name) return false;
      if (other.partial || other.expression) return false;
      if (other.method !== idx.method) return false;
      if (!isPrefix(idx.columns, other.columns)) return false;
      // Exact duplicates: report only one of the pair, deterministically.
      if (idx.columns.length === other.columns.length && idx.name < other.name) return false;
      return true;
    });
    if (!covering) continue;

    const duplicate = idx.columns.length === covering.columns.length;
    findings.push({
      code: 'X5',
      severity: 'low',
      category: 'index',
      schema: table.schema,
      table: table.name,
      message:
        `Index ${idx.name} (${idx.columnNames.join(', ')}) is ${duplicate ? 'a duplicate of' : 'a leading-column prefix of'} `
        + `${covering.name} (${covering.columnNames.join(', ')})`,
      hint: `DROP INDEX ${table.schema}.${idx.name}; every query it serves is served by ${covering.name}.`,
      context: { index: idx.name, coveredBy: covering.name, duplicate }
    });
  }
  return findings;
}

/**
 * X6: no primary key and no usable replica identity.
 *
 * Rows cannot be addressed individually: updates and deletes have no cheap
 * lookup path, logical replication and CDC cannot identify old rows, and
 * realtime/change-feed features break.
 */
export function checkMissingPrimaryKey(table: TableIndexSnapshot): Finding | null {
  if (table.isPartition) return null;
  if (table.hasPrimaryKey) return null;
  // `f` (FULL) and `i` (index) still give logical decoding an identity.
  if (table.replicaIdentity === 'f' || table.replicaIdentity === 'i') return null;

  return {
    code: 'X6',
    severity: 'low',
    category: 'index',
    schema: table.schema,
    table: table.name,
    message: `${table.schema}.${table.name} has no primary key`,
    hint:
      'Add a primary key, or set REPLICA IDENTITY FULL / USING INDEX, so rows can be addressed by updates, deletes, and logical replication.',
    context: { replicaIdentity: table.replicaIdentity }
  };
}

/**
 * Search column types that only perform with a specialised index, mapped to
 * the access methods that can serve them.
 *
 * The column type *is* the declaration: `graphile-search` detects searchable
 * columns by codec (tsvector → full-text filter, vector → similarity search),
 * so a bare `tsvector` column is already an API promise. BM25 and pg_trgm are
 * absent on purpose — they are discovered *from* their indexes, so a missing
 * index means the feature was never exposed rather than exposed and slow.
 */
const SEARCH_TYPES: Record<string, { methods: string[]; feature: string; example: string }> = {
  tsvector: {
    methods: ['gin', 'gist'],
    feature: 'full-text search',
    example: 'USING gin (%s)'
  },
  vector: {
    methods: ['hnsw', 'ivfflat'],
    feature: 'vector similarity search',
    example: 'USING hnsw (%s vector_cosine_ops)'
  },
  halfvec: {
    methods: ['hnsw', 'ivfflat'],
    feature: 'vector similarity search',
    example: 'USING hnsw (%s halfvec_cosine_ops)'
  },
  sparsevec: {
    methods: ['hnsw'],
    feature: 'vector similarity search',
    example: 'USING hnsw (%s sparsevec_cosine_ops)'
  }
};

/**
 * X7: a search column with no index the search can use.
 *
 * A `tsvector` or `vector` column is exposed as a search field by
 * `graphile-search` purely from its type — the schema promises a fast path.
 * Without a GIN/GiST (full-text) or HNSW/IVFFlat (vector) index the promise
 * is served by a sequential scan plus a per-row distance or match computation,
 * which is the single worst plan the API can produce.
 */
export function checkUnindexedSearchColumns(table: TableIndexSnapshot): Finding[] {
  if (table.isPartition) return [];

  const findings: Finding[] = [];
  for (const column of table.columns) {
    const spec = SEARCH_TYPES[column.baseType];
    if (!spec) continue;
    const served = table.indexes.some(
      (idx) => spec.methods.includes(idx.method) && idx.columns.includes(column.attnum)
    );
    if (served) continue;

    findings.push({
      code: 'X7',
      severity: 'medium',
      category: 'index',
      schema: table.schema,
      table: table.name,
      message:
        `${table.schema}.${table.name}.${column.name} is a ${column.type} column with no ${spec.methods.join('/')} index — ${spec.feature} scans the whole table`,
      hint:
        `CREATE INDEX ON ${table.schema}.${table.name} ${spec.example.replace('%s', column.name)};`,
      context: { column: column.name, type: column.type, methods: spec.methods }
    });
  }
  return findings;
}

/** Types whose columns are, in practice, what a connection is sorted by. */
const SORT_TYPES = new Set(['timestamptz', 'timestamp', 'date']);

/**
 * X8: a sort-shaped column that leads no index.
 *
 * Every PostGraphile connection can be ordered by any column and paginated
 * with a cursor over that order. Sorting on an unindexed column forces a full
 * sort of the (RLS-filtered) result on every page, and keyset pagination
 * degenerates into a scan-and-discard. Timestamp columns are singled out
 * because they are what feeds are actually ordered by — a heuristic, hence
 * `info` by default; turn it off with `perf.rules: { "X8": "off" }`.
 */
export function checkUnindexedSortColumns(table: TableIndexSnapshot): Finding[] {
  if (table.isPartition) return [];

  // A leading column can serve both ASC and DESC ordering; a trailing one
  // cannot serve the sort on its own.
  const leading = new Set(
    table.indexes.filter((i) => !i.partial).map((i) => i.columns[0]).filter((c) => c !== undefined)
  );

  const findings: Finding[] = [];
  for (const column of table.columns) {
    if (!SORT_TYPES.has(column.baseType)) continue;
    if (leading.has(column.attnum)) continue;

    findings.push({
      code: 'X8',
      severity: 'info',
      category: 'index',
      schema: table.schema,
      table: table.name,
      message:
        `${table.schema}.${table.name}.${column.name} (${column.type}) leads no index — ordering or paginating a connection by it sorts the whole table`,
      hint:
        `If the API orders by this column, CREATE INDEX ON ${table.schema}.${table.name} (${column.name} DESC); otherwise disable X8 or add the table to perf.ignore.`,
      context: { column: column.name, type: column.type }
    });
  }
  return findings;
}

/**
 * True when `index` can serve an equality lookup on exactly `columns`:
 * its leading columns are that same set, and it covers every row.
 */
function indexCoversColumns(index: IndexInfo, columns: number[]): boolean {
  if (index.partial || index.expression) return false;
  if (index.method !== 'btree') return false;
  if (index.columns.length < columns.length) return false;
  const leading = new Set(index.columns.slice(0, columns.length));
  return columns.every((c) => leading.has(c));
}

/** True when `a` is a leading-column prefix of `b` (`a` may equal `b`). */
function isPrefix(a: number[], b: number[]): boolean {
  if (a.length > b.length) return false;
  return a.every((col, i) => b[i] === col);
}
