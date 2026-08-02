/**
 * PostGraphile *behaviors*, read from the object comments they are declared in.
 *
 * A behavior string is the schema author stating which parts of the generated
 * API an object participates in — `@behavior -list -connection` on a foreign
 * key constraint says the reverse relation is not exposed. That is a different
 * kind of evidence from anything else safegres collects: `pg_class.reltuples`
 * and `pg_stat_user_indexes.idx_scan` are *measurements*, and safegres grades
 * an ephemeral CI database that has never held data, so both read zero at
 * exactly the moment they would have to mean something. A declaration reads the
 * same in CI as in production.
 *
 * Read from the comment rather than from a running Graphile instance, or from
 * whatever tables the author generated the comment out of:
 *
 * - `@behavior` in a comment is the PostGraphile v5 convention, so this works
 *   on any Graphile database rather than one project's metadata schema.
 * - The comment is the composed value — one tag per object — so it is already
 *   the author's resolved intent.
 * - A live instance would additionally resolve preset defaults, but requires an
 *   API to be running. safegres grades a database.
 *
 * The consequence of that last point is the rule this module exists to enforce:
 * **only an explicit negative fragment is evidence.** Presets grant most
 * behaviors by default, so the *absence* of `+list` says nothing whatsoever. A
 * scanner that reads silence as denial is a scanner that tells you to drop an
 * index a live API is using.
 */

import type { IntrospectOptions, QueryExecutor } from './introspect';

/** One `[+|-]scope` term of a behavior string. */
export interface BehaviorFragment {
  modifier: '+' | '-';
  /**
   * The scope as written, e.g. `list`, `resource:connection`, `*`. Scope paths
   * are `:`-separated and increasingly specific left to right.
   */
  scope: string;
}

/**
 * The three behavior tags a relation can carry.
 *
 * `@behavior` applies to *both* directions of a foreign key. Graphile also
 * accepts `@forwardBehavior` and `@backwardBehavior`, which apply to only one
 * — and the distinction is not cosmetic: denying `list` with a plain
 * `@behavior` removes the forward `post.author` field as well as the reverse
 * `author.posts` list, which is almost never what the author meant.
 */
export interface ConstraintBehaviors {
  /** `@behavior` — applies to both directions. */
  both?: string;
  /** `@forwardBehavior` — the referencing table's field pointing at the parent. */
  forward?: string;
  /** `@backwardBehavior` — the referenced table's field listing the children. */
  backward?: string;
}

/** Behaviors found on each kind of object, keyed as described on each map. */
export interface BehaviorSnapshot {
  /** `schema.table` → behavior string. */
  tables: Map<string, string>;
  /** `schema.table.column` → behavior string. */
  columns: Map<string, string>;
  /** `schema.table.constraint` → behavior string. */
  constraints: Map<string, string>;
  /** `schema.table.constraint` → the directional tags on that constraint. */
  constraintDirections: Map<string, ConstraintBehaviors>;
}

export function emptyBehaviorSnapshot(): BehaviorSnapshot {
  return {
    tables: new Map(),
    columns: new Map(),
    constraints: new Map(),
    constraintDirections: new Map()
  };
}

/**
 * The behavior governing one direction of a relation: the directional tag when
 * present, else the undirected one. They do not merge — Graphile resolves the
 * specific tag against the preset, and treating `@behavior -list` as an extra
 * fragment on top of `@backwardBehavior +list` would invert the author's
 * override.
 */
export function directionalBehavior(
  behaviors: ConstraintBehaviors | undefined,
  direction: 'forward' | 'backward'
): string | undefined {
  if (!behaviors) return undefined;
  return behaviors[direction] ?? behaviors.both;
}

/** Catalog schemas no API surface ever contains. */
export const SYSTEM_SCHEMAS = ['pg_catalog', 'information_schema', 'pg_toast'];

const DEFAULT_EXCLUDES = SYSTEM_SCHEMAS;

/**
 * Extract the `@behavior` smart tag from an object comment.
 *
 * Smart tags occupy the leading lines of the comment, `@tag [value]`, and stop
 * at the first line that is not one; everything after is the description. Only
 * `@behavior` is returned — `@omit` is deliberately not translated here, since
 * its v4 semantics ("remove from the schema") are not the same question as a
 * behavior fragment and conflating them would put a guess in the evidence.
 */
export function parseBehaviorTag(comment: string | null | undefined): string | null {
  return parseBehaviorTags(comment).both ?? null;
}

/** Every behavior tag on a comment, by direction. */
export function parseBehaviorTags(comment: string | null | undefined): ConstraintBehaviors {
  const out: ConstraintBehaviors = {};
  if (!comment) return out;
  for (const line of comment.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('@')) break;
    const match = /^@(behavior|forwardBehavior|backwardBehavior)\s+(.+)$/.exec(trimmed);
    if (!match) continue;
    const value = match[2].trim();
    if (match[1] === 'behavior') out.both = value;
    else if (match[1] === 'forwardBehavior') out.forward = value;
    else out.backward = value;
  }
  return out;
}

/** Split a behavior string into fragments. A bare scope is a grant, as in PostGraphile. */
export function parseFragments(behavior: string | null | undefined): BehaviorFragment[] {
  if (!behavior) return [];
  const out: BehaviorFragment[] = [];
  for (const term of behavior.trim().split(/\s+/)) {
    if (!term) continue;
    const modifier = term[0] === '-' ? '-' : '+';
    const scope = term[0] === '+' || term[0] === '-' ? term.slice(1) : term;
    if (scope) out.push({ modifier, scope });
  }
  return out;
}

/**
 * Does this fragment's scope speak to `ability`?
 *
 * Scope paths are `:`-separated and get more specific left to right
 * (`resource:connection`), so the ability is the final segment. `*` matches
 * anything, which is how `-*` denies wholesale.
 */
function scopeMatches(scope: string, ability: string): boolean {
  const segments = scope.split(':');
  const last = segments[segments.length - 1];
  return last === ability || last === '*';
}

/**
 * Resolve one ability against a behavior string.
 *
 * `undefined` means *undeclared*, and is the answer that matters: it is not
 * `false`. Later fragments win, matching PostGraphile — `-* +list` grants
 * `list` and denies the rest.
 */
export function resolveAbility(
  behavior: string | null | undefined,
  ability: string
): boolean | undefined {
  let verdict: boolean | undefined;
  for (const fragment of parseFragments(behavior)) {
    if (scopeMatches(fragment.scope, ability)) verdict = fragment.modifier === '+';
  }
  return verdict;
}

/**
 * True when *every* one of `abilities` is explicitly denied.
 *
 * Every, not some: a relation reachable as a single record is still reachable,
 * and one undeclared ability is enough to leave the question open.
 */
export function deniesAll(behavior: string | null | undefined, abilities: string[]): boolean {
  if (abilities.length === 0) return false;
  return abilities.every((ability) => resolveAbility(behavior, ability) === false);
}

/**
 * Behavior tags on every table, column and constraint in scope.
 *
 * Extension-owned objects are not filtered here: the maps are only ever
 * consulted for relations that survived the scan's own filtering, so an extra
 * entry costs a map slot and changes nothing.
 */
export async function introspectBehaviors(
  exec: QueryExecutor,
  options: Pick<IntrospectOptions, 'schemas' | 'excludeSchemas'> = {}
): Promise<BehaviorSnapshot> {
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];
  const schemaFilter = options.schemas && options.schemas.length > 0
    ? `n.nspname = ANY($1::text[])`
    : `NOT (n.nspname = ANY($2::text[]))`;

  // Both parameters are referenced (even when only one filters) so Postgres can
  // infer their types — an unused $N errors out at bind time.
  const sql = `
    WITH _params AS (
      SELECT $1::text[] AS include_schemas, $2::text[] AS exclude_schemas
    ),
    rels AS (
      SELECT c.oid, n.nspname AS schema_name, c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p', 'v', 'm')
        AND ${schemaFilter}
    )
    SELECT 'table'::text AS kind, r.schema_name, r.table_name, NULL::text AS member, d.description
      FROM rels r
      JOIN pg_description d
        ON d.objoid = r.oid AND d.classoid = 'pg_class'::regclass AND d.objsubid = 0
    UNION ALL
    SELECT 'column', r.schema_name, r.table_name, a.attname, d.description
      FROM rels r
      JOIN pg_attribute a ON a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped
      JOIN pg_description d
        ON d.objoid = r.oid AND d.classoid = 'pg_class'::regclass AND d.objsubid = a.attnum
    UNION ALL
    SELECT 'constraint', r.schema_name, r.table_name, co.conname, d.description
      FROM rels r
      JOIN pg_constraint co ON co.conrelid = r.oid
      JOIN pg_description d
        ON d.objoid = co.oid AND d.classoid = 'pg_constraint'::regclass
  `;

  const { rows } = await exec.query<{
    kind: 'table' | 'column' | 'constraint';
    schema_name: string;
    table_name: string;
    member: string | null;
    description: string | null;
  }>(sql, [options.schemas ?? [], excludes]);

  const snapshot = emptyBehaviorSnapshot();
  for (const row of rows) {
    const tags = parseBehaviorTags(row.description);
    const relation = `${row.schema_name}.${row.table_name}`;
    if (row.kind === 'table') {
      if (tags.both) snapshot.tables.set(relation, tags.both);
      continue;
    }
    if (!row.member) continue;
    const key = `${relation}.${row.member}`;
    if (row.kind === 'column') {
      if (tags.both) snapshot.columns.set(key, tags.both);
      continue;
    }
    if (tags.both) snapshot.constraints.set(key, tags.both);
    if (tags.both || tags.forward || tags.backward) {
      snapshot.constraintDirections.set(key, tags);
    }
  }
  return snapshot;
}
