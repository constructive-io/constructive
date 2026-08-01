/**
 * Access-path classification: which foreign keys are query paths, and which
 * are write-once pointers nothing ever looks rows up by.
 *
 * X1 ("foreign key with no covering index") is right about the mechanics — a
 * `DELETE` on the parent really does scan the child — but it assumes the child
 * is a relation somebody traverses. On a provisioning-config table that
 * assumption is false, and acting on the finding buys a write penalty on every
 * insert in exchange for speeding up a scan of one row.
 *
 * The tempting gate, `pg_class.reltuples`, is useless here: safegres grades an
 * ephemeral CI database that has never held data, so every row estimate is 0
 * at exactly the moment we grade. Worse, row count is the wrong question —
 * a huge append-only log nobody joins on wants no FK index, and a tiny lookup
 * table hammered by every request does. The property we need is *reachability*,
 * and reachability is structural, which is why it survives an empty database.
 *
 * The classification is pure catalog arithmetic — same input, same output, no
 * statistics and no thresholds tuned against a corpus:
 *
 * - a **degenerate pointer** is a foreign key whose every referencing column
 *   carries a constant default (`uuid_nil()`, a literal) and whose column names
 *   appear in no RLS policy predicate and no view body anywhere in the
 *   database. A `NOT NULL` key that starts life pointing at the nil UUID is a
 *   slot a provisioner fills in, not something rows are found by;
 * - a **config record** is a table with at least {@link ClassifyOptions.minPointers}
 *   degenerate pointers. On one, every foreign key whose columns are likewise
 *   absent from all policy predicates and view bodies is a **cold path**.
 *
 * The tenant key is never cold and needs no special case: `database_id` appears
 * in essentially every RLS policy, so the policy check excludes it on its own.
 */

import type { TableIndexSnapshot } from './indexes';
import type { TableSnapshot } from './introspect';

export type PathState = 'hot' | 'cold';

/** How a path came to be classified — reported so a reviewer can audit it. */
export type PathSource = 'inferred';

export interface AccessPath {
  schema: string;
  table: string;
  /** Referencing column names, in constraint order. */
  columns: string[];
  /** The foreign-key constraint this path belongs to. */
  constraint: string;
  state: PathState;
  source: PathSource;
  /** Why the classifier reached this state, in one human-readable clause. */
  reason: string;
}

export interface ClassifyOptions {
  /**
   * Degenerate pointers a table needs before it counts as a config record.
   * Default 2. Lifting the test from the column to the table is what catches
   * the nullable, undefaulted pointer sitting alongside the defaulted ones.
   */
  minPointers?: number;
}

export const DEFAULT_MIN_POINTERS = 2;

/**
 * Defaults that pin a key column to one value for every row the application
 * does not overwrite — the nil UUID, a literal, a constant of any scalar type.
 * A call to anything else (`uuidv7()`, `now()`, a sequence) is excluded: those
 * produce a real distribution of keys.
 */
const CONSTANT_DEFAULT = /^(uuid_nil\(\)|'(?:[^']|'')*'(?:::[\w .]+(?:\[\])?)?|-?\d+(?:\.\d+)?|true|false)$/i;

export function isConstantDefault(defaultExpr: string | null): boolean {
  if (!defaultExpr) return false;
  return CONSTANT_DEFAULT.test(defaultExpr.trim());
}

/** Key for {@link AccessPath} lookups: the relation plus the constraint name. */
export function pathKey(schema: string, table: string, constraint: string): string {
  return `${schema}.${table}.${constraint}`;
}

/**
 * Classify every foreign key in the snapshot as a hot or cold access path.
 *
 * `tables` supplies the RLS policy predicates (as SQL text) and `viewBodies`
 * the view definitions; a column named in either is read by something, which
 * refutes coldness. Both are matched as whole-word tokens across the *whole*
 * database rather than per relation — deliberately conservative, since the
 * cost of missing a cold path is one spurious finding while the cost of a
 * wrong one is a dropped index.
 */
export function classifyPaths(
  indexSnapshot: TableIndexSnapshot[],
  tables: TableSnapshot[],
  viewBodies: string[],
  options: ClassifyOptions = {}
): Map<string, AccessPath> {
  const minPointers = options.minPointers ?? DEFAULT_MIN_POINTERS;
  const referenced = referencedColumnNames(tables, viewBodies);
  const paths = new Map<string, AccessPath>();

  for (const table of indexSnapshot) {
    const defaults = new Map(table.columns.map((c) => [c.attnum, c.defaultExpr]));
    const unread = (columns: string[]) => columns.every((c) => !referenced.has(c.toLowerCase()));
    const degenerate = table.foreignKeys.filter(
      (fk) => fk.columns.every((a) => isConstantDefault(defaults.get(a) ?? null)) && unread(fk.columnNames)
    );
    const isConfigRecord = degenerate.length >= minPointers;

    for (const fk of table.foreignKeys) {
      const cold = isConfigRecord && unread(fk.columnNames);
      paths.set(pathKey(table.schema, table.name, fk.name), {
        schema: table.schema,
        table: table.name,
        columns: fk.columnNames,
        constraint: fk.name,
        state: cold ? 'cold' : 'hot',
        source: 'inferred',
        reason: cold
          ? `config record: ${degenerate.length} write-once pointer${degenerate.length === 1 ? '' : 's'} with a constant default, and no policy or view reads ${fk.columnNames.join(', ')}`
          : 'no evidence the path is unreachable'
      });
    }
  }

  return paths;
}

/**
 * Every identifier-shaped token appearing in an RLS policy predicate or a view
 * body, lowercased. Tokenising rather than substring-matching keeps `schema_id`
 * from being "found" inside `private_schema_id`.
 */
function referencedColumnNames(tables: TableSnapshot[], viewBodies: string[]): Set<string> {
  const out = new Set<string>();
  const add = (sql: string | null) => {
    if (!sql) return;
    for (const token of sql.toLowerCase().match(/[a-z_][a-z0-9_$]*/g) ?? []) out.add(token);
  };
  for (const table of tables) {
    for (const policy of table.policies) {
      add(policy.using);
      add(policy.withCheck);
    }
  }
  for (const body of viewBodies) add(body);
  return out;
}
