/**
 * API reach: which relations a generated API can actually address.
 *
 * A plane made of schemas answers "is this relation in the API's schemas?",
 * which is as much precision as a schema list can carry. It over-counts in a
 * way that matters: a generated API exposes types and fields, not schemas, and
 * a schema routinely contains relations the API deliberately does not surface
 * — join tables, denormalised shadows, machine-only back-pointers.
 *
 * Where the author has *declared* that, the declaration is better evidence
 * than anything else safegres can collect. `reltuples` and `idx_scan` are
 * measurements, and safegres grades ephemeral CI databases that have never
 * held data, so both read zero at exactly the moment they would have to mean
 * something. A behavior tag reads the same in CI as in production.
 *
 * Two properties keep this honest:
 *
 * - **Only an explicit denial counts.** Presets grant most behaviors by
 *   default, so the absence of `+list` says nothing whatsoever. Silence is
 *   never read as denial.
 * - **Unreachable means unreachable by *every* route.** A relation the API
 *   cannot address at the root can still be addressed by traversing a relation
 *   field from one that can, so this is a graph reachability problem and not a
 *   per-table test. Subtracting a relation that is in fact addressable would
 *   silently drop real findings out of the score, which is the one failure
 *   mode worth designing against.
 */

import type { BehaviorSnapshot } from '../pg/behaviors';
import { deniesAll, directionalBehavior } from '../pg/behaviors';

/**
 * Abilities that between them cover every root entry point to a relation.
 * All four must be denied before the relation is absent from the API root: a
 * table that cannot be read but can still be inserted into is present.
 */
export const ROOT_ABILITIES = ['select', 'insert', 'update', 'delete'];

/** The reverse (child-listing) field exists under any one of these. */
export const BACKWARD_ABILITIES = ['list', 'connection', 'single'];

/** The forward (parent) field is a single record. */
export const FORWARD_ABILITIES = ['single'];

/** One foreign key, as reach cares about it. */
export interface ReachEdge {
  /** Referencing relation, `schema.table`. */
  from: string;
  /** Referenced relation, `schema.table`. */
  to: string;
  constraint: string;
}

export interface ReachInputs {
  /** Every relation in scope, `schema.table`. */
  relations: string[];
  edges: ReachEdge[];
  behaviors: BehaviorSnapshot;
}

export interface UnreachableRelation {
  schema: string;
  table: string;
  /** Why it is unreachable, in one human-readable clause. */
  reason: string;
}

export interface ApiReach {
  /** Relations no field of the generated API can address. */
  unreachable: UnreachableRelation[];
  /**
   * `schema.table.constraint` for every foreign key whose reverse relation is
   * declared absent. A hidden reverse relation is not the same claim as an
   * unreachable table — it is one path, not all of them — so it is reported
   * separately and consumed by the X1 access-path signals.
   */
  hiddenBackwardRelations: string[];
}

function splitRelation(relation: string): { schema: string; table: string } {
  const dot = relation.indexOf('.');
  return { schema: relation.slice(0, dot), table: relation.slice(dot + 1) };
}

/**
 * Compute what the generated API can address.
 *
 * The traversal starts from every relation the API roots — anything not
 * explicitly denied all of {@link ROOT_ABILITIES} — and walks relation fields
 * in both directions. What it never visits is a relation that is denied at the
 * root *and* has no surviving field pointing at it from anywhere reachable.
 */
export function computeApiReach(inputs: ReachInputs): ApiReach {
  const { relations, edges, behaviors } = inputs;
  const inScope = new Set(relations);

  const rooted = relations.filter(
    (relation) => !deniesAll(behaviors.tables.get(relation), ROOT_ABILITIES)
  );

  const hiddenBackwardRelations: string[] = [];
  const adjacency = new Map<string, string[]>();
  const addEdge = (from: string, to: string): void => {
    const list = adjacency.get(from);
    if (list) list.push(to);
    else adjacency.set(from, [to]);
  };

  for (const edge of edges) {
    const key = `${edge.from}.${edge.constraint}`;
    const directions = behaviors.constraintDirections.get(key);

    const backwardHidden = deniesAll(
      directionalBehavior(directions, 'backward'),
      BACKWARD_ABILITIES
    );
    if (backwardHidden) hiddenBackwardRelations.push(key);
    // The reverse field lives on the referenced table and reaches the
    // referencing one.
    if (!backwardHidden && inScope.has(edge.to)) addEdge(edge.to, edge.from);

    const forwardHidden = deniesAll(directionalBehavior(directions, 'forward'), FORWARD_ABILITIES);
    if (!forwardHidden && inScope.has(edge.from)) addEdge(edge.from, edge.to);
  }

  const reached = new Set<string>();
  const queue = [...rooted];
  for (const relation of rooted) reached.add(relation);
  while (queue.length > 0) {
    const current = queue.pop() as string;
    for (const next of adjacency.get(current) ?? []) {
      if (!inScope.has(next) || reached.has(next)) continue;
      reached.add(next);
      queue.push(next);
    }
  }

  const unreachable: UnreachableRelation[] = [];
  for (const relation of relations) {
    if (reached.has(relation)) continue;
    const inbound = edges.filter((e) => e.to === relation || e.from === relation).length;
    unreachable.push({
      ...splitRelation(relation),
      reason:
        `a behavior denies ${ROOT_ABILITIES.join(', ')} on the relation`
        + (inbound > 0
          ? ', and every relation field that could reach it is denied too'
          : ', and no relation field points at it')
    });
  }

  return { unreachable, hiddenBackwardRelations: hiddenBackwardRelations.sort() };
}
