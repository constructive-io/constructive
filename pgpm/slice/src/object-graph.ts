/**
 * Unified SQL object graph — the semantic IR over parsed programs.
 *
 * Nodes are database objects (keyed by qualified name) with the statements
 * that create them; edges are the references statements make to objects,
 * typed with `@pgsql/transform`'s edge taxonomy (`hard | fk | late`).
 * Programs are named (typically one per pgpm change), so ownership queries
 * answer change-level questions directly:
 *
 * - which objects live in a schema set (subsystem selection)
 * - which surviving statements still reach into a dropped object set
 *   (cascade safety — every in-edge must originate from a statement that is
 *   itself dropped, or be rebound)
 * - which programs create nothing outside a dropped set (whole-change
 *   pruning by ownership, not survivor counting)
 *
 * Each program's intra-program edges come straight from
 * `buildStatementGraph`; references with no in-program producer (external
 * dependencies, which the statement graph deliberately omits) are added with
 * the same kind classification, so the object graph is a superset projection
 * of the statement graph over the same facts.
 *
 * Pure and I/O-free; built from `SqlProgram`s parsed once elsewhere.
 */
import { buildStatementGraph, EdgeKind, SqlProgram, StatementFacts } from '@pgpmjs/transform';

import { SqlObjectRef } from './refs';

/** Identifies one statement inside one named program. */
export interface StatementId {
  program: string;
  statement: number;
}

/**
 * How an edge constrains ordering — `@pgsql/transform`'s taxonomy:
 * `hard` (must exist at CREATE time), `fk` (a hard edge from a foreign-key
 * target), `late` (reached only inside a PL/pgSQL body, resolved at call
 * time).
 */
export type ObjectEdgeKind = EdgeKind;

/** One reference from a statement to an object. */
export interface ObjectEdge {
  from: StatementId;
  /** Key of the referenced object (see `objectKey`). */
  to: string;
  kind: ObjectEdgeKind;
}

/** A database object and the statements that create it. */
export interface ObjectNode {
  ref: SqlObjectRef;
  createdBy: StatementId[];
}

export interface SqlObjectGraph {
  /** The named programs the graph was built from. */
  programs: Map<string, SqlProgram>;
  /** Objects by key. */
  objects: Map<string, ObjectNode>;
  /** All reference edges. */
  edges: ObjectEdge[];
  /** Edges into each object, by object key. */
  incoming: Map<string, ObjectEdge[]>;
}

export function objectKey(ref: SqlObjectRef): string {
  return `${ref.schema ?? ''}\u0000${ref.name}`;
}

export function objectLabel(ref: SqlObjectRef): string {
  return ref.schema ? `${ref.schema}.${ref.name}` : ref.name;
}

function statementFacts(program: SqlProgram, index: number): StatementFacts {
  return program.statements[index].facts;
}

/**
 * Build the object graph from named programs (typically change name →
 * parsed deploy script).
 */
export function buildObjectGraph(
  programs: Map<string, SqlProgram> | Array<[string, SqlProgram]>
): SqlObjectGraph {
  const programMap = programs instanceof Map ? programs : new Map(programs);
  const objects = new Map<string, ObjectNode>();
  const edges: ObjectEdge[] = [];
  const incoming = new Map<string, ObjectEdge[]>();

  const addEdge = (edge: ObjectEdge): void => {
    const list = incoming.get(edge.to);
    if (list) {
      if (list.some(
        e => e.kind === edge.kind &&
          e.from.program === edge.from.program &&
          e.from.statement === edge.from.statement
      )) return;
      list.push(edge);
    } else {
      incoming.set(edge.to, [edge]);
    }
    edges.push(edge);
  };

  for (const [name, program] of programMap) {
    const facts = program.statements.map(s => s.facts);
    const statementGraph = buildStatementGraph(facts);

    facts.forEach((stmt, i) => {
      const id: StatementId = { program: name, statement: i };
      for (const c of stmt.creates) {
        const key = objectKey(c);
        const node = objects.get(key);
        if (node) node.createdBy.push(id);
        else objects.set(key, { ref: { schema: c.schema, name: c.name }, createdBy: [id] });
      }
    });

    // Intra-program edges, exactly as the statement graph typed them.
    for (const e of statementGraph.edges) {
      addEdge({ from: { program: name, statement: e.from }, to: objectKey(e.via), kind: e.kind });
    }

    // References with no in-program producer are external dependencies: the
    // statement graph induces no edge for them, but the object graph keeps
    // them (that is what contract/cascade queries measure). Same kind
    // classification: fk beats late beats hard.
    facts.forEach((stmt, i) => {
      const id: StatementId = { program: name, statement: i };
      const bodyOnly = new Set(stmt.bodyReferences.map(objectKey));
      const fkKeys = new Set(stmt.fkTargets.map(objectKey));
      const seen = new Set<string>();
      for (const r of stmt.references) {
        const key = objectKey(r);
        seen.add(key);
        if (statementGraph.producers.has(`${r.schema ?? ''}.${r.name}`)) continue;
        const kind: EdgeKind = fkKeys.has(key) ? 'fk' : bodyOnly.has(key) ? 'late' : 'hard';
        addEdge({ from: id, to: key, kind });
      }
      for (const t of stmt.fkTargets) {
        const key = objectKey(t);
        if (seen.has(key)) continue;
        if (statementGraph.producers.has(`${t.schema ?? ''}.${t.name}`)) continue;
        addEdge({ from: id, to: key, kind: 'fk' });
      }
    });
  }

  return { programs: programMap, objects, edges, incoming };
}

/** Keys of every object created in one of the given schemas. */
export function objectsInSchemas(graph: SqlObjectGraph, schemas: Iterable<string>): Set<string> {
  const wanted = new Set(schemas);
  const keys = new Set<string>();
  for (const [key, node] of graph.objects) {
    if (node.ref.schema !== null && wanted.has(node.ref.schema)) keys.add(key);
  }
  return keys;
}

/** Statement ids that create at least one object in `dropped`. */
function droppedStatements(graph: SqlObjectGraph, dropped: Set<string>): Set<string> {
  const ids = new Set<string>();
  for (const key of dropped) {
    const node = graph.objects.get(key);
    if (!node) continue;
    for (const id of node.createdBy) ids.add(`${id.program}\u0000${id.statement}`);
  }
  return ids;
}

/**
 * Edges into `dropped` objects whose source statement is not itself dropped.
 * Each is a dangling dependency: dropping the object set is safe iff this is
 * empty or every edge's referenced object is rebound to a replacement.
 */
export function danglingEdges(graph: SqlObjectGraph, dropped: Set<string>): ObjectEdge[] {
  const droppedStmts = droppedStatements(graph, dropped);
  const dangling: ObjectEdge[] = [];
  for (const key of dropped) {
    for (const edge of graph.incoming.get(key) ?? []) {
      if (!droppedStmts.has(`${edge.from.program}\u0000${edge.from.statement}`)) {
        dangling.push(edge);
      }
    }
  }
  return dangling;
}

/**
 * Programs every one of whose object-creating statements creates only
 * `dropped` objects — whole changes owned by the dropped set, prunable from
 * the plan by ownership (read from the graph, not counted from survivors).
 * Programs that create nothing are never pruned.
 */
export function prunablePrograms(graph: SqlObjectGraph, dropped: Set<string>): string[] {
  const prunable: string[] = [];
  for (const [name, program] of graph.programs) {
    let creating = 0;
    let insideOnly = true;
    program.statements.forEach((stmt, i) => {
      if (stmt.facts.creates.length === 0) return;
      creating++;
      const facts = statementFacts(program, i);
      if (!facts.creates.every(c => dropped.has(objectKey(c)))) insideOnly = false;
    });
    if (creating > 0 && insideOnly) prunable.push(name);
  }
  return prunable;
}
