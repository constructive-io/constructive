/**
 * Structural index-hygiene checks (perf dimension, `X*`).
 *
 * Everything here is pure catalog analysis — deterministic, workload-free,
 * and safe to run in CI against an empty database.
 */

import type { IndexInfo, TableIndexSnapshot } from '../pg/indexes';
import type { Finding } from '../types';

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
 */
export function checkUnindexedForeignKeys(table: TableIndexSnapshot): Finding[] {
  // Partitions inherit their parent's indexes; the parent carries the finding.
  if (table.isPartition) return [];

  const findings: Finding[] = [];
  for (const fk of table.foreignKeys) {
    if (fk.columns.length === 0) continue;
    if (table.indexes.some((idx) => indexCoversColumns(idx, fk.columns))) continue;

    const cols = fk.columnNames.join(', ');
    findings.push({
      code: 'X1',
      severity: 'medium',
      category: 'index',
      schema: table.schema,
      table: table.name,
      message:
        `Foreign key ${fk.name} on ${table.schema}.${table.name} (${cols}) has no covering index`,
      hint:
        `CREATE INDEX ON ${table.schema}.${table.name} (${cols}); without it, deletes/updates on ${fk.references} and joins across this key scan the whole table.`,
      context: { constraint: fk.name, columns: fk.columnNames, references: fk.references }
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
