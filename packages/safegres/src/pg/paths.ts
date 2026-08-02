/**
 * Access-path signals: independent, individually-auditable pieces of evidence
 * about whether anything reads a foreign key.
 *
 * X1 ("foreign key with no covering index") is right about the mechanics — a
 * `DELETE` on the parent really does scan the child — but it assumes the child
 * is a relation somebody traverses. On a provisioning-config table that
 * assumption is false, and acting on the finding buys a write penalty on every
 * insert in exchange for speeding up a scan of one row.
 *
 * The tempting gate, `pg_class.reltuples`, is useless here: safegres grades an
 * ephemeral CI database that has never held data, so every row estimate is 0
 * at exactly the moment we grade. Worse, row count is the wrong question — a
 * huge append-only log nobody joins on wants no FK index, and a tiny lookup
 * table hammered by every request does. The property we need is *reachability*.
 *
 * Reachability is not one boolean, and this module deliberately does not
 * compute one. It collects signals, each of which points in one direction and
 * says why, and leaves the verdict to the caller:
 *
 * - `policy-read` and `view-read` are **reads**. They are decisive: the
 *   database itself traverses the column, so no amount of contrary evidence
 *   makes the path unreachable.
 * - `write-once-pointer` and `config-record` are **shape**. They are not
 *   evidence of unreachability, only of a schema idiom — a `NOT NULL` key
 *   defaulting to the nil UUID is a slot a provisioner fills in, and a table
 *   with several of them looks like a config record rather than a relation.
 *
 * Shape alone must never suppress a finding. A generated API can expose a
 * reverse relation over any foreign key regardless of how its default is
 * written, and if it does, the path is reachable and the index is wanted.
 *
 * - `behavior-hidden` is the third kind, **declared**: the schema author has
 *   said the reverse relation is not in the generated API. It comes from the
 *   same behavior tags exposure reach reads, so the two axes agree about what
 *   the API contains rather than each guessing separately. It is reported and
 *   not acted on — a hidden relation is one missing path, not proof that
 *   nothing traverses the key, since the referential-integrity scan on a
 *   parent `DELETE` runs whatever the API exposes.
 */

import type { TableIndexSnapshot } from './indexes';
import type { TableSnapshot } from './introspect';

/**
 * Which way a signal points. `read` means something demonstrably traverses the
 * key; `shape` means the schema resembles an idiom in which nothing does, which
 * is a suspicion rather than a finding.
 */
export type SignalDirection = 'read' | 'shape' | 'declared';

export type SignalName =
  | 'policy-read'
  | 'view-read'
  | 'write-once-pointer'
  | 'config-record'
  | 'behavior-hidden';

export interface PathSignal {
  name: SignalName;
  direction: SignalDirection;
  /** Why this signal fired, in one human-readable clause. */
  detail: string;
}

/**
 * The caller-facing summary of a path's signals. Note there is no `unreachable`
 * member: nothing safegres can currently observe proves a path is unreachable,
 * and inventing the state is how a scanner ends up recommending that you drop
 * an index a live API is using.
 */
export type PathAssessment =
  /** At least one `read` signal. The key is traversed; X1 applies as written. */
  | 'read'
  /** Only `shape` signals. Looks like a provisioning pointer; unproven. */
  | 'write-once-shaped'
  /** No signal fired either way. */
  | 'unknown';

export interface AccessPath {
  schema: string;
  table: string;
  /** Referencing column names, in constraint order. */
  columns: string[];
  /** The foreign-key constraint this path belongs to. */
  constraint: string;
  /** Every signal that fired, so a reviewer can audit the assessment. */
  signals: PathSignal[];
  assessment: PathAssessment;
}

export interface ClassifyOptions {
  /**
   * Write-once pointers a table needs before the `config-record` signal fires.
   * Default 2. Lifting the test from the column to the table is what catches
   * the nullable, undefaulted pointer sitting alongside the defaulted ones.
   */
  minPointers?: number;
  /**
   * `schema.table.constraint` keys whose reverse relation an API declares
   * absent, as computed by exposure reach.
   */
  hiddenBackwardRelations?: Set<string>;
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
 * One real reader ends the discussion, so a `read` signal always wins. Absent
 * one, the shape has to hold at the *table* level before it means anything: a
 * lone defaulted column is a habit, whereas a table built entirely out of them
 * is an idiom. `write-once-pointer` on its own is therefore reported and not
 * acted on.
 */
export function assess(signals: PathSignal[]): PathAssessment {
  if (signals.some((s) => s.direction === 'read')) return 'read';
  if (signals.some((s) => s.name === 'config-record')) return 'write-once-shaped';
  return 'unknown';
}

/**
 * Collect the signals for every foreign key in the snapshot.
 *
 * `tables` supplies the RLS policy predicates (as SQL text) and `viewBodies`
 * the view definitions. Both are matched as whole-word tokens across the
 * *whole* database rather than per relation — deliberately over-eager, because
 * a spurious `read` signal costs one retained finding while a missing one
 * could cost a dropped index.
 */
export function classifyPaths(
  indexSnapshot: TableIndexSnapshot[],
  tables: TableSnapshot[],
  viewBodies: string[],
  options: ClassifyOptions = {}
): Map<string, AccessPath> {
  const minPointers = options.minPointers ?? DEFAULT_MIN_POINTERS;
  const hidden = options.hiddenBackwardRelations ?? new Set<string>();
  const policyTokens = identifierTokens(
    tables.flatMap((t) => t.policies.flatMap((p) => [p.using, p.withCheck]))
  );
  const viewTokens = identifierTokens(viewBodies);
  const paths = new Map<string, AccessPath>();

  for (const table of indexSnapshot) {
    const defaults = new Map(table.columns.map((c) => [c.attnum, c.defaultExpr]));
    const readBy = (tokens: Set<string>, columns: string[]) =>
      columns.filter((c) => tokens.has(c.toLowerCase()));

    const pointers = table.foreignKeys.filter(
      (fk) =>
        fk.columns.length > 0 &&
        fk.columns.every((a) => isConstantDefault(defaults.get(a) ?? null)) &&
        readBy(policyTokens, fk.columnNames).length === 0 &&
        readBy(viewTokens, fk.columnNames).length === 0
    );

    for (const fk of table.foreignKeys) {
      const signals: PathSignal[] = [];

      const inPolicy = readBy(policyTokens, fk.columnNames);
      if (inPolicy.length > 0) {
        signals.push({
          name: 'policy-read',
          direction: 'read',
          detail: `an RLS policy predicate names ${inPolicy.join(', ')}`
        });
      }

      const inView = readBy(viewTokens, fk.columnNames);
      if (inView.length > 0) {
        signals.push({
          name: 'view-read',
          direction: 'read',
          detail: `a view or materialized view names ${inView.join(', ')}`
        });
      }

      if (pointers.some((p) => p.name === fk.name)) {
        signals.push({
          name: 'write-once-pointer',
          direction: 'shape',
          detail: `every column of ${fk.name} has a constant default`
        });
      }

      if (pointers.length >= minPointers && inPolicy.length === 0 && inView.length === 0) {
        signals.push({
          name: 'config-record',
          direction: 'shape',
          detail: `${table.name} carries ${pointers.length} write-once pointers`
        });
      }

      if (hidden.has(pathKey(table.schema, table.name, fk.name))) {
        signals.push({
          name: 'behavior-hidden',
          direction: 'declared',
          detail: `a behavior declares the reverse relation over ${fk.name} absent from the API`
        });
      }

      paths.set(pathKey(table.schema, table.name, fk.name), {
        schema: table.schema,
        table: table.name,
        columns: fk.columnNames,
        constraint: fk.name,
        signals,
        assessment: assess(signals)
      });
    }
  }

  return paths;
}

/**
 * Every identifier-shaped token appearing in the given SQL, lowercased.
 * Tokenising rather than substring-matching keeps `schema_id` from being
 * "found" inside `private_schema_id`.
 */
function identifierTokens(sources: (string | null)[]): Set<string> {
  const out = new Set<string>();
  for (const sql of sources) {
    if (!sql) continue;
    for (const token of sql.toLowerCase().match(/[a-z_][a-z0-9_$]*/g) ?? []) out.add(token);
  }
  return out;
}
