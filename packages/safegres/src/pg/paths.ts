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
 * - `behavior-hidden` is the signal that settles it: a PostGraphile behavior
 *   denying `list`, `connection` and `single` on the constraint is the author
 *   *declaring* the reverse relation absent from the API, which is a fact about
 *   the schema rather than a measurement of an empty database. It is decisive
 *   in the negative direction the way a read is decisive in the positive — with
 *   reads still winning ties, because RLS and views traverse a key whatever the
 *   API exposes.
 */

import { type BehaviorSnapshot, deniesAll, emptyBehaviorSnapshot } from './behaviors';
import type { TableIndexSnapshot } from './indexes';
import type { TableSnapshot } from './introspect';

/**
 * Which way a signal points. `read` means something demonstrably traverses the
 * key; `shape` means the schema resembles an idiom in which nothing does, which
 * is a suspicion rather than a finding; `declared` means the schema author said
 * so, which is neither an observation nor a guess.
 */
export type SignalDirection = 'read' | 'shape' | 'declared';

export type SignalName =
  | 'policy-read'
  | 'view-read'
  | 'write-once-pointer'
  | 'config-record'
  | 'behavior-hidden';

/**
 * Abilities that together constitute "the API can traverse this relation".
 * All three must be explicitly denied before the path counts as declared
 * hidden — a relation reachable as a single record is still reachable.
 */
export const REVERSE_RELATION_ABILITIES = ['list', 'connection', 'single'];

export interface PathSignal {
  name: SignalName;
  direction: SignalDirection;
  /** Why this signal fired, in one human-readable clause. */
  detail: string;
}

/**
 * The caller-facing summary of a path's signals. Note there is still no
 * `unreachable` member: `declared-hidden` says the *API* does not expose the
 * relation, which is not the same claim as nothing reading the key — a job, a
 * trigger or a hand-written query can, and the referential-integrity scan on a
 * parent delete does regardless.
 */
export type PathAssessment =
  /** At least one `read` signal. The key is traversed; X1 applies as written. */
  | 'read'
  /** The API surface is declared not to contain this relation. */
  | 'declared-hidden'
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
   * Behavior tags read from object comments. Absent, no `behavior-hidden`
   * signal fires and classification is exactly what it was before.
   */
  behaviors?: BehaviorSnapshot;
  /**
   * Write-once pointers a table needs before the `config-record` signal fires.
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
 * One real reader ends the discussion, so a `read` signal always wins. Absent
 * one, the shape has to hold at the *table* level before it means anything: a
 * lone defaulted column is a habit, whereas a table built entirely out of them
 * is an idiom. `write-once-pointer` on its own is therefore reported and not
 * acted on.
 */
export function assess(signals: PathSignal[]): PathAssessment {
  if (signals.some((s) => s.direction === 'read')) return 'read';
  if (signals.some((s) => s.direction === 'declared')) return 'declared-hidden';
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
  const behaviors = options.behaviors ?? emptyBehaviorSnapshot();
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

      const relation = `${table.schema}.${table.name}`;
      // Either the constraint's own reverse relation is denied, or the whole
      // relation is — a table nothing can select is a table with no API paths
      // through any of its keys.
      const hiddenBy = deniesAll(
        behaviors.constraints.get(`${relation}.${fk.name}`),
        REVERSE_RELATION_ABILITIES
      )
        ? `${fk.name} denies ${REVERSE_RELATION_ABILITIES.join('/')}`
        : deniesAll(behaviors.tables.get(relation), ['select'])
          ? `${table.name} denies select`
          : null;

      if (hiddenBy) {
        signals.push({
          name: 'behavior-hidden',
          direction: 'declared',
          detail: `a PostGraphile behavior declares the relation absent from the API: ${hiddenBy}`
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
