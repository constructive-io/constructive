/**
 * Semantic diff driver: identity-keyed schema delta between two deploy
 * surfaces.
 *
 * Where `diffBundles` (in `@pgpmjs/bundle`) compares change names and content
 * digests — which breaks the moment a dial regroups or renames changes — this
 * driver re-keys the comparison on object identity (`identityOf`), so the
 * same schema authored at different granularities or partitions diffs as
 * equal. Objects are compared at the AST level (normalized parse trees, so
 * formatting never matters); tables are compared column-by-column and
 * constraint-by-constraint so an added column emits `ALTER TABLE ADD COLUMN`,
 * not a table rebuild.
 *
 * The emitted delta is a set of pgpm changes: DROPs for removed objects
 * (reverse topological order), then CREATE/ALTER changes for added and
 * modified objects routed through the granularity pipeline
 * (`restructureChanges`), so names come from the naming spec and `requires`
 * from the statement graph — the same derivation every other projection uses.
 * Every emitted change carries a full deploy/revert/verify triple: inverses
 * and existence checks are composed at the AST level via `@pgsql/scripts`'
 * node-level API (`invertStatement`/`existenceCheck`) — never hand-templated
 * and never round-tripped through deparsed text — deparsing only once at the
 * end. Statements the node layer cannot derive fall back to the text layer
 * (`revertFor`/`verifyFor`) solely to surface its not-derivable comment and
 * warning.
 *
 * Requires `loadModule()` from `plpgsql-parser` before use.
 */
import { pathFor, PathStyle } from '@pgpmjs/naming-spec';
import { existenceCheck, invertStatement, revertFor, verifyFor } from '@pgsql/scripts';
import type { ObjectIdentity, StatementFacts } from '@pgsql/transform';
import {
  buildStatementGraph,
  classifyStatements,
  cleanTree,
  Granularity,
  identityOf
} from '@pgsql/transform';
import { Deparser, parseSync } from 'plpgsql-parser';

import { GranularityChange, restructureChanges } from './granularity-driver';

/** How one object differs between the two sides. */
export type ObjectDelta = 'added' | 'removed' | 'modified';

export interface SemanticObjectDiff {
  identity: ObjectIdentity;
  /** Canonical naming-spec path for the object. */
  path: string;
  delta: ObjectDelta;
  /** For modified tables: the column/constraint-level detail. */
  columnsAdded?: string[];
  columnsRemoved?: string[];
  columnsModified?: string[];
}

export interface SemanticDiffOptions {
  /** Granularity for the emitted CREATE/ALTER changes (default `object`). */
  granularity?: Granularity;
  /** Naming-spec rendering style (default `directory`). */
  style?: PathStyle;
}

/** One emitted delta change: a full deploy/revert/verify triple. */
export interface SemanticDeltaChange extends GranularityChange {
  revert: string;
  verify: string;
}

export interface SemanticDiffResult {
  /** True when both sides describe the same objects with the same shapes. */
  identical: boolean;
  /** Per-object dispositions, in `to`-then-removed order. */
  objects: SemanticObjectDiff[];
  /**
   * The migration delta: DROP changes for removed objects first (reverse
   * topological order), then CREATE/ALTER changes named and ordered by the
   * granularity pipeline.
   */
  changes: SemanticDeltaChange[];
  warnings: string[];
}

const identityKey = (id: ObjectIdentity): string =>
  `${id.kind}\u0000${id.schema ?? ''}\u0000${id.table ?? ''}\u0000${id.name}`;

/** One side's statements for a single object. */
interface ObjectUnit {
  identity: ObjectIdentity;
  /** Statement indexes in source order. */
  statements: number[];
  texts: string[];
}

interface SideProgram {
  facts: StatementFacts[];
  units: Map<string, ObjectUnit>;
  /** identity key list in source order. */
  order: string[];
  graph: ReturnType<typeof buildStatementGraph>;
}

/**
 * Group one side's script into identity-keyed object units. Statements with
 * no identity (grants, comments) attach to the unit of the first object they
 * reference, falling back to the preceding statement's unit; truly homeless
 * statements are reported via `warnings`.
 */
function readSide(sql: string, warnings: string[], label: string): SideProgram {
  const facts = classifyStatements(sql);
  const graph = buildStatementGraph(facts);
  const units = new Map<string, ObjectUnit>();
  const order: string[] = [];
  const unitOf: (string | null)[] = new Array(facts.length).fill(null);
  const byObject = new Map<string, string>();

  facts.forEach((f, i) => {
    const text = sql.slice(f.span.start, f.span.start + f.span.len).trim();
    if (!text) return;

    let identity = groupingIdentity(f);
    if (identity && identity.kind === 'other') {
      const asTable = identityKey({ kind: 'table', schema: identity.schema, name: identity.name });
      if (units.has(asTable)) identity = units.get(asTable)!.identity;
    }
    let key: string | null = null;
    if (identity) {
      key = identityKey(identity);
      if (!units.has(key)) {
        units.set(key, { identity, statements: [], texts: [] });
        order.push(key);
      }
      if (!identity.table) {
        byObject.set(`${identity.schema ?? ''}.${identity.name}`, key);
      }
    } else {
      for (const r of f.references) {
        const host = byObject.get(`${r.schema ?? ''}.${r.name}`);
        if (host) { key = host; break; }
      }
      if (!key && i > 0) key = unitOf[i - 1];
    }

    if (!key) {
      warnings.push(`${label}: statement ${i} (${f.kind}) belongs to no object; ignored in the diff`);
      return;
    }
    unitOf[i] = key;
    const unit = units.get(key)!;
    unit.statements.push(i);
    unit.texts.push(text.endsWith(';') ? text : `${text};`);
  });

  return { facts, units, order, graph };
}

/**
 * The identity a statement groups under. Table-shaping statements — ALTER
 * TABLE column/constraint additions, RLS enablement — fold into their table's
 * unit so that atomic and consolidated authorships of the same table land in
 * the same unit and compare shape-to-shape. Generic ALTERs (`kind: 'other'`)
 * fold in `readSide` when a table unit for the same object already exists.
 */
function groupingIdentity(f: StatementFacts): ObjectIdentity | null {
  const identity = identityOf(f);
  if (!identity) return null;
  if (
    (f.kind === 'table' || f.kind === 'constraint' || f.kind === 'rls_enable') &&
    identity.kind !== 'table'
  ) {
    return { kind: 'table', schema: identity.schema, name: identity.table ?? identity.name };
  }
  return identity;
}

/** Normalized-AST fingerprint of one statement (formatting/position-proof). */
function fingerprint(text: string): string {
  const parsed = parseSync(text);
  return JSON.stringify(cleanTree(parsed.sql.stmts.map(s => s.stmt)));
}

/** Multiset fingerprint of a whole unit. */
const unitFingerprint = (unit: ObjectUnit): string =>
  unit.texts.map(fingerprint).sort().join('\n');

interface TableShape {
  relation: unknown;
  /** column name → normalized ColumnDef. */
  columns: Map<string, { def: unknown; print: string }>;
  /** normalized table-level constraints/extras, keyed by their print. */
  extras: Map<string, unknown>;
}

/**
 * Fold a table unit's statements (CREATE TABLE plus any ALTER TABLE
 * ADD COLUMN / ADD CONSTRAINT) into an effective shape, so atomic and
 * consolidated authorships of the same table compare equal.
 */
function tableShape(unit: ObjectUnit): TableShape {
  const shape: TableShape = { relation: null, columns: new Map(), extras: new Map() };

  const addColumn = (node: Record<string, unknown>): void => {
    const def = node as { colname?: string };
    const clean = cleanTree(node);
    shape.columns.set(def.colname ?? '', { def: clean, print: JSON.stringify(clean) });
  };
  const addExtra = (node: unknown): void => {
    const clean = cleanTree(node);
    shape.extras.set(JSON.stringify(clean), clean);
  };

  for (const text of unit.texts) {
    for (const raw of parseSync(text).sql.stmts) {
      const stmt = raw.stmt as unknown as Record<string, Record<string, unknown>>;
      if (stmt.CreateStmt) {
        shape.relation = stmt.CreateStmt.relation;
        const elts = (stmt.CreateStmt.tableElts as Record<string, unknown>[] | undefined) ?? [];
        for (const elt of elts) {
          if (elt.ColumnDef) addColumn(elt.ColumnDef as Record<string, unknown>);
          else addExtra(elt);
        }
      } else if (stmt.AlterTableStmt) {
        shape.relation ??= stmt.AlterTableStmt.relation;
        const cmds = (stmt.AlterTableStmt.cmds as { AlterTableCmd?: Record<string, unknown> }[] | undefined) ?? [];
        for (const cmd of cmds) {
          const at = cmd.AlterTableCmd;
          if (!at) continue;
          const def = at.def as Record<string, unknown> | undefined;
          if (at.subtype === 'AT_AddColumn' && def?.ColumnDef) {
            addColumn(def.ColumnDef as Record<string, unknown>);
          } else {
            addExtra({ AlterTableCmd: at });
          }
        }
      } else {
        addExtra(stmt);
      }
    }
  }
  return shape;
}

const deparseStmt = (node: Record<string, unknown>): string =>
  `${Deparser.deparse(node, { pretty: false })};`;

/** Column-level ALTERs between two table shapes. */
function diffTable(
  from: TableShape,
  to: TableShape,
  diff: SemanticObjectDiff,
  warnings: string[]
): string[] {
  const stmts: string[] = [];
  const relation = to.relation ?? from.relation;
  const alter = (cmd: Record<string, unknown>): string =>
    deparseStmt({
      AlterTableStmt: {
        relation,
        cmds: [{ AlterTableCmd: { behavior: 'DROP_RESTRICT', ...cmd } }],
        objtype: 'OBJECT_TABLE'
      }
    });

  diff.columnsAdded = [];
  diff.columnsRemoved = [];
  diff.columnsModified = [];

  for (const [name, col] of to.columns) {
    const prior = from.columns.get(name);
    if (!prior) {
      diff.columnsAdded.push(name);
      stmts.push(alter({ subtype: 'AT_AddColumn', def: { ColumnDef: col.def } }));
    } else if (prior.print !== col.print) {
      diff.columnsModified.push(name);
      const fromDef = prior.def as { typeName?: unknown; constraints?: unknown };
      const toDef = col.def as { typeName?: unknown; constraints?: unknown };
      const typeChanged = JSON.stringify(fromDef.typeName) !== JSON.stringify(toDef.typeName);
      const restChanged =
        JSON.stringify({ ...(fromDef as object), typeName: null }) !==
        JSON.stringify({ ...(toDef as object), typeName: null });
      if (typeChanged) {
        stmts.push(alter({
          subtype: 'AT_AlterColumnType',
          name,
          def: { ColumnDef: { typeName: toDef.typeName } }
        }));
      }
      if (restChanged) {
        warnings.push(
          `${diff.path}: column "${name}" changed beyond its type (constraints/defaults); emit a manual ALTER`
        );
      }
    }
  }
  for (const name of from.columns.keys()) {
    if (!to.columns.has(name)) {
      diff.columnsRemoved.push(name);
      stmts.push(alter({ subtype: 'AT_DropColumn', name }));
    }
  }

  // Self-inverse ALTER TABLE subtypes: a removed extra with one of these
  // undoes with the paired subtype rather than a DROP CONSTRAINT.
  const INVERSE_SUBTYPE: Record<string, string> = {
    AT_EnableRowSecurity: 'AT_DisableRowSecurity',
    AT_DisableRowSecurity: 'AT_EnableRowSecurity',
    AT_ForceRowSecurity: 'AT_NoForceRowSecurity',
    AT_NoForceRowSecurity: 'AT_ForceRowSecurity'
  };

  // Removed extras drop before added ones: a changed constraint that keeps
  // its name must DROP CONSTRAINT before the replacement ADD CONSTRAINT.
  for (const [print, extra] of from.extras) {
    if (to.extras.has(print)) continue;
    const conname = (extra as { Constraint?: { conname?: string } }).Constraint?.conname
      ?? (extra as { AlterTableCmd?: { def?: { Constraint?: { conname?: string } } } })
        .AlterTableCmd?.def?.Constraint?.conname;
    const subtype = (extra as { AlterTableCmd?: { subtype?: string } }).AlterTableCmd?.subtype;
    if (conname) {
      stmts.push(alter({ subtype: 'AT_DropConstraint', name: conname }));
    } else if (subtype && INVERSE_SUBTYPE[subtype]) {
      stmts.push(alter({ subtype: INVERSE_SUBTYPE[subtype] }));
    } else {
      warnings.push(`${diff.path}: removed table element has no name to drop; emit a manual ALTER`);
    }
  }
  for (const [print, extra] of to.extras) {
    if (!from.extras.has(print)) {
      const at = (extra as Record<string, Record<string, unknown>>).AlterTableCmd;
      if (at) stmts.push(alter(at));
      else if ((extra as Record<string, unknown>).Constraint) {
        stmts.push(alter({ subtype: 'AT_AddConstraint', def: extra }));
      } else {
        warnings.push(`${diff.path}: unrecognized added table element; emit a manual ALTER`);
      }
    }
  }
  return stmts;
}

/**
 * Diff two deploy surfaces by object identity and emit the migration delta.
 *
 * `from`/`to` are whole deploy scripts (flatten changes in plan order to
 * diff bundles/modules). The result's `changes` deploy `to`'s shape on top
 * of `from`: reverse-topological DROPs, then CREATE/ALTERs named and
 * ordered by `restructureChanges`.
 */
export function diffSchemas(
  from: string,
  to: string,
  options: SemanticDiffOptions = {}
): SemanticDiffResult {
  const style = options.style ?? 'directory';
  const warnings: string[] = [];
  const a = readSide(from, warnings, 'from');
  const b = readSide(to, warnings, 'to');

  const objects: SemanticObjectDiff[] = [];
  const forwardSql: string[] = [];
  const modifiedChanges: SemanticDeltaChange[] = [];
  const dropUnits: ObjectUnit[] = [];

  /**
   * `@pgsql/scripts` inverse of a deploy script (drops in reverse topo
   * order), composed at the AST level via `invertStatement` and deparsed
   * once. Underivable statements fall back to `revertFor` on the single
   * statement to surface its not-derivable comment and warning.
   */
  const inverseOf = (deploy: string, context: string): string => {
    const facts = classifyStatements(deploy);
    const graph = buildStatementGraph(facts);
    const pieces: string[] = [];
    for (const i of [...graph.order].reverse()) {
      const nodes = invertStatement(facts[i]);
      if (nodes === null) {
        const { sql, warnings: w } = revertFor([facts[i]]);
        warnings.push(...w.map(x => `${context}: ${x}`));
        if (sql.trim()) pieces.push(sql);
        continue;
      }
      pieces.push(...nodes.map(n => deparseStmt(n as Record<string, unknown>)));
    }
    return pieces.join('\n');
  };
  /**
   * `@pgsql/scripts` existence checks for a deploy script, composed from
   * `existenceCheck`'s SelectStmt nodes and deparsed once. Underivable
   * statements fall back to `verifyFor` to surface the warning.
   */
  const verifyOf = (deploy: string, context: string): string => {
    const pieces: string[] = [];
    for (const fact of classifyStatements(deploy)) {
      const nodes = existenceCheck(fact);
      if (nodes === null) {
        const { warnings: w } = verifyFor([fact]);
        warnings.push(...w.map(x => `${context}: ${x}`));
        continue;
      }
      pieces.push(...nodes.map(n => deparseStmt(n as Record<string, unknown>)));
    }
    return pieces.join('\n\n');
  };

  for (const key of b.order) {
    const unit = b.units.get(key)!;
    const prior = a.units.get(key);
    const path = pathFor(unit.identity, { style });
    if (!prior) {
      objects.push({ identity: unit.identity, path, delta: 'added' });
      forwardSql.push(...unit.texts);
      continue;
    }
    if (unit.identity.kind === 'table') {
      const shapeFrom = tableShape(prior);
      const shapeTo = tableShape(unit);
      const diff: SemanticObjectDiff = { identity: unit.identity, path, delta: 'modified' };
      const stmts = diffTable(shapeFrom, shapeTo, diff, warnings);
      const columnsTouched =
        diff.columnsAdded!.length + diff.columnsRemoved!.length + diff.columnsModified!.length > 0;
      if (stmts.length > 0 || columnsTouched) {
        objects.push(diff);
        if (stmts.length > 0) {
          // The inverse alteration is the same diff with the sides swapped.
          const scratch: SemanticObjectDiff = { identity: unit.identity, path, delta: 'modified' };
          const deploy = stmts.join('\n');
          modifiedChanges.push({
            name: `${path}/alter`,
            dependencies: [],
            deploy,
            revert: diffTable(shapeTo, shapeFrom, scratch, []).join('\n'),
            verify: verifyOf(deploy, path)
          });
        }
      }
      continue;
    }
    if (unitFingerprint(prior) !== unitFingerprint(unit)) {
      objects.push({ identity: unit.identity, path, delta: 'modified' });
      const priorDeploy = prior.texts.join('\n');
      const newDeploy = unit.texts.join('\n');
      modifiedChanges.push({
        name: path,
        dependencies: [],
        deploy: [inverseOf(priorDeploy, path), newDeploy].filter(Boolean).join('\n'),
        revert: [inverseOf(newDeploy, path), priorDeploy].filter(Boolean).join('\n'),
        verify: verifyOf(newDeploy, path)
      });
    }
  }

  for (const key of a.order) {
    if (b.units.has(key)) continue;
    const unit = a.units.get(key)!;
    objects.push({ identity: unit.identity, path: pathFor(unit.identity, { style }), delta: 'removed' });
    dropUnits.push(unit);
  }

  // Removed objects drop in reverse topological order of the `from` graph
  // (dependents before dependencies), one change per object.
  const position = new Map(dropUnits.map(u => [u, Math.min(...u.statements.map(s => a.graph.order.indexOf(s)))]));
  dropUnits.sort((x, y) => position.get(y)! - position.get(x)!);
  const dropChanges: SemanticDeltaChange[] = [];
  for (const unit of dropUnits) {
    const path = pathFor(unit.identity, { style });
    const recreate = unit.texts.join('\n');
    const drop = inverseOf(recreate, path);
    if (!drop.trim() || drop.trim().startsWith('--')) {
      warnings.push(`${path}: no DROP derivable for kind "${unit.identity.kind}"; drop manually`);
      continue;
    }
    dropChanges.push({
      name: `${path}/drop`,
      dependencies: dropChanges.length > 0 ? [dropChanges[dropChanges.length - 1].name] : [],
      deploy: drop,
      revert: recreate,
      verify: ''
    });
  }

  let forwardChanges: SemanticDeltaChange[] = [];
  if (forwardSql.length > 0) {
    const { changes, warnings: w } = restructureChanges(
      [{ name: 'delta', dependencies: [], deploy: forwardSql.join('\n\n') }],
      { granularity: options.granularity ?? 'object' }
    );
    forwardChanges = changes.map(c => ({
      ...c,
      revert: inverseOf(c.deploy, c.name),
      verify: verifyOf(c.deploy, c.name)
    }));
    warnings.push(...w);
  }

  return {
    identical: objects.length === 0,
    objects,
    changes: [...dropChanges, ...forwardChanges, ...modifiedChanges],
    warnings
  };
}

/** A change's deploy surface (same seam as the other drivers). */
export interface DiffInputChange {
  name: string;
  dependencies: string[];
  deploy: string;
}

/**
 * Identity-keyed diff over pgpm changes: flattens each side's deploy scripts
 * in plan order and delegates to {@link diffSchemas}. Change names never
 * enter the comparison — regrouping, renaming, or repartitioning the same
 * schema yields an identical diff.
 */
export function diffChangeSets(
  from: DiffInputChange[],
  to: DiffInputChange[],
  options: SemanticDiffOptions = {}
): SemanticDiffResult {
  const flatten = (changes: DiffInputChange[]): string =>
    changes.map(c => c.deploy.trim()).filter(Boolean).join('\n\n');
  return diffSchemas(flatten(from), flatten(to), options);
}
