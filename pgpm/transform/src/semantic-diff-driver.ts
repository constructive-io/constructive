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
 * The emitted delta is a set of pgpm changes ordered by one dependency graph
 * over everything undeployed: DROPs of removed objects, ALTER TABLE steps of
 * modified tables, replacements (and the drop/recreate of unchanged dependents
 * a breaking step would invalidate) and CREATEs of added objects. Added
 * objects are shaped and named by the granularity pipeline
 * (`restructureChanges`); every other change gets its name from the naming
 * spec and its `requires` from the graph — never a positional chain.
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
import { ObjectIdentity as NamingIdentity, pathFor, PathStyle } from '@pgpmjs/naming-spec';
import { existenceCheck, invertStatement, revertFor, verifyFor } from '@pgsql/scripts';
import type { StatementFacts } from '@pgsql/semantics';
import type { ObjectIdentity } from '@pgsql/transform';
import {
  buildStatementGraph,
  cleanTree,
  Granularity
} from '@pgsql/transform';
import { Deparser, parseSync } from 'plpgsql-parser';

import { absorbAnnotation, AnnotationState, diffAnnotations, emptyAnnotations, stablePrint } from './annotations';
import { sliceStatementBytes, sqlSourceBytes } from './byte-slice';
import { ConstraintNode, defaultConstraintName } from './constraint-names';
import { classifyStatements } from './facts';
import { identityOf } from './facts';
import { ChangeGranularity, GranularityChange, restructureChanges } from './granularity-driver';
import { alterInPlace } from './object-alters';
import { canonicalizeTypes, stripDefaultCasts, typeKey } from './type-canon';

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

/**
 * An explicit rename. Renames are never inferred from a drop/add pair: the
 * caller declares them (`--rename app.t.old=app.t.new`, `--rename
 * app.old=app.new`) and the diff emits `ALTER .. RENAME` with its inverse.
 */
export interface RenameDeclaration {
  kind: 'column' | 'table';
  schema: string | null;
  /** The table, for column renames. */
  table?: string;
  from: string;
  to: string;
}

/** Parse `schema.table.old=schema.table.new` (column) or `schema.old=schema.new` (table). */
export function parseRenameDeclaration(spec: string): RenameDeclaration {
  const [lhs, rhs, ...rest] = spec.split('=');
  if (!lhs || !rhs || rest.length > 0) {
    throw new DiffPolicyError('rename', `pgpm diff: --rename expects <from>=<to>, got "${spec}"`);
  }
  const a = lhs.split('.');
  const b = rhs.split('.');
  if (a.length !== b.length || a.length < 2 || a.length > 3 || a.some(x => !x) || b.some(x => !x)) {
    throw new DiffPolicyError('rename', `pgpm diff: --rename expects schema.table=schema.table or schema.table.column=schema.table.column, got "${spec}"`);
  }
  if (a.slice(0, -1).join('.') !== b.slice(0, -1).join('.')) {
    throw new DiffPolicyError('rename', `pgpm diff: --rename cannot move "${lhs}" to another ${a.length === 3 ? 'table' : 'schema'} ("${rhs}")`);
  }
  if (a.length === 3) return { kind: 'column', schema: a[0], table: a[1], from: a[2], to: b[2] };
  return { kind: 'table', schema: a[0], from: a[1], to: b[1] };
}

/** A migration the policy refuses to emit as-is (data loss, incompleteness, bad rename). */
export class DiffPolicyError extends Error {
  constructor(readonly kind: 'data-loss' | 'incomplete' | 'rename', message: string) {
    super(message);
    this.name = 'DiffPolicyError';
  }
}

export interface SemanticDiffOptions {
  /** Granularity for the emitted CREATE/ALTER changes (default `object`). */
  granularity?: Granularity;
  /** Change-level distribution for emitted changes (default `object`). */
  changeGranularity?: ChangeGranularity;
  /** Naming-spec rendering style (default `directory`). */
  style?: PathStyle;
  /** Declared table/column renames (never inferred). */
  renames?: RenameDeclaration[];
  /**
   * Accept steps that can lose data (DROP TABLE/COLUMN/SCHEMA/SEQUENCE, type
   * changes, replaced types). Without it such a delta throws `DiffPolicyError`.
   */
  allowDataLoss?: boolean;
  /**
   * Accept steps whose DROP or inverse cannot be derived; they are emitted
   * with a `-- pgpm:` marker and reported as warnings. Without it such a
   * delta throws `DiffPolicyError`.
   */
  allowIncomplete?: boolean;
  /** `schema.table.column` → USING expression for that column's type change (default `column::newtype`). */
  casts?: Record<string, string>;
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
   * The migration delta: drops, table alterations, replacements and creates
   * in one stable topological order over their real dependencies (phase and
   * `to`-side source order break ties); each change's `dependencies` are its
   * graph edges.
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
 * The `schema.name` object an annotation statement (COMMENT, GRANT, OWNER,
 * ALTER DEFAULT PRIVILEGES) decorates, when it names it explicitly.
 */
function annotationHost(text: string): string | null {
  const stmts = parseSync(text).sql.stmts;
  if (stmts.length !== 1) return null;
  const stmt = stmts[0].stmt as unknown as Record<string, Record<string, unknown>>;
  const items = (list: unknown): string[] =>
    (((list as { List?: { items?: { String?: { sval?: string } }[] } })?.List?.items) ?? [])
      .map(x => x.String?.sval ?? '');
  const relation = (rv: unknown): string | null => {
    const r = rv as { schemaname?: string; relname?: string } | undefined;
    return r?.relname ? `${r.schemaname ?? ''}.${r.relname}` : null;
  };
  if (stmt.CommentStmt) {
    const objtype = stmt.CommentStmt.objtype as string;
    const names = items(stmt.CommentStmt.object);
    if (objtype === 'OBJECT_SCHEMA' && names.length === 1) return `.${names[0]}`;
    if (objtype === 'OBJECT_COLUMN' && names.length >= 2) return `${names.length === 3 ? names[0] : ''}.${names[names.length - 2]}`;
    if (names.length === 2) return `${names[0]}.${names[1]}`;
    if (names.length === 1 && objtype !== 'OBJECT_COLUMN') return `.${names[0]}`;
    return null;
  }
  if (stmt.GrantStmt) {
    const objects = (stmt.GrantStmt.objects as unknown[]) ?? [];
    if (objects.length !== 1) return null;
    const first = objects[0] as Record<string, unknown>;
    if (first.RangeVar) return relation(first.RangeVar);
    if (stmt.GrantStmt.objtype === 'OBJECT_SCHEMA' && first.String) return `.${(first.String as { sval: string }).sval}`;
    return null;
  }
  if (stmt.AlterDefaultPrivilegesStmt) {
    const options = (stmt.AlterDefaultPrivilegesStmt.options as { DefElem?: { defname?: string; arg?: unknown } }[]) ?? [];
    const schemas = options.find(o => o.DefElem?.defname === 'schemas');
    const names = schemas ? items(schemas.DefElem!.arg) : [];
    return names.length === 1 ? `.${names[0]}` : null;
  }
  if (stmt.AlterOwnerStmt) {
    const o = stmt.AlterOwnerStmt;
    if (o.objectType === 'OBJECT_SCHEMA' && (o.object as { String?: { sval?: string } })?.String?.sval) {
      return `.${(o.object as { String: { sval: string } }).String.sval}`;
    }
    if (o.relation) return relation(o.relation);
    const names = items(o.object);
    return names.length === 2 ? `${names[0]}.${names[1]}` : null;
  }
  if (stmt.AlterTableStmt) return relation(stmt.AlterTableStmt.relation);
  return null;
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

  const sqlBytes = sqlSourceBytes(sql);

  facts.forEach((f, i) => {
    const text = sliceStatementBytes(sqlBytes, f.span.start, f.span.len).trim();
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
      const host = annotationHost(text);
      if (host) key = byObject.get(host) ?? null;
      for (const r of key ? [] : f.references) {
        const candidate = byObject.get(`${r.schema ?? ''}.${r.name}`);
        if (candidate) { key = candidate; break; }
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
    (f.kind === 'table' || f.kind === 'constraint' || f.kind === 'fk_constraint' || f.kind === 'rls_enable') &&
    identity.kind !== 'table'
  ) {
    return { kind: 'table', schema: identity.schema, name: identity.table ?? identity.name };
  }
  return identity;
}

/** Normalized-AST fingerprint of one statement (formatting/position-proof). */
function fingerprint(text: string): string {
  const parsed = parseSync(text);
  return stablePrint(canonicalizeTypes(cleanTree(parsed.sql.stmts.map(s => s.stmt))));
}

/** Multiset fingerprint of a whole unit. */
const unitFingerprint = (unit: ObjectUnit): string =>
  unit.texts.map(fingerprint).sort().join('\n');

interface TableShape {
  relation: unknown;
  /** column name → ColumnDef as authored (emitted), its canonical form (compared) and print key. */
  columns: Map<string, { def: unknown; canon: unknown; print: string }>;
  /** normalized table-level constraints/extras, keyed by their print. */
  extras: Map<string, unknown>;
  /** COMMENT / GRANT / OWNER state attached to the table. */
  annotations: AnnotationState;
}

/** Constraint kinds that can move between column, table-elt, and ALTER form. */
const RELOCATABLE = new Set(['CONSTR_PRIMARY', 'CONSTR_UNIQUE', 'CONSTR_FOREIGN', 'CONSTR_CHECK']);

/** Column constraint "attributes" the parser emits as siblings of the constraint they qualify. */
const CONSTRAINT_ATTRS: Record<string, Record<string, boolean>> = {
  CONSTR_ATTR_DEFERRABLE: { deferrable: true },
  CONSTR_ATTR_NOT_DEFERRABLE: { deferrable: false },
  CONSTR_ATTR_DEFERRED: { initdeferred: true },
  CONSTR_ATTR_IMMEDIATE: { initdeferred: false }
};

/** Normalize one column constraint to its semantic core (parser-version extras dropped). */
const IDENTITY_OPTION_DEFAULTS: Record<string, string> = {
  start: '{"Integer":{"ival":1}}',
  increment: '{"Integer":{"ival":1}}',
  minvalue: 'undefined',
  maxvalue: 'undefined',
  cache: '{"Integer":{"ival":1}}',
  cycle: '{"Boolean":{"boolval":false}}'
};

function normalizeColumnConstraint(c: ConstraintNode & Record<string, unknown>, columnType: unknown): Record<string, unknown> {
  if (c.contype === 'CONSTR_NOTNULL') return { Constraint: { contype: 'CONSTR_NOTNULL' } };
  if (c.contype === 'CONSTR_IDENTITY') {
    // pg_dump spells out the backing sequence (SEQUENCE NAME, START 1, ...);
    // only non-default options are semantic.
    const options = ((c.options as { DefElem?: { defname?: string; arg?: unknown } }[] | undefined) ?? []).filter(o => {
      const name = o.DefElem?.defname ?? '';
      if (name === 'sequence_name') return false;
      const value = o.DefElem?.arg === undefined ? 'undefined' : JSON.stringify(cleanTree(o.DefElem.arg));
      return IDENTITY_OPTION_DEFAULTS[name] !== value;
    });
    return { Constraint: { contype: 'CONSTR_IDENTITY', generated_when: c.generated_when, options: options.length > 0 ? options : undefined } };
  }
  if (c.contype === 'CONSTR_DEFAULT') {
    return { Constraint: { contype: 'CONSTR_DEFAULT', raw_expr: stripDefaultCasts(c.raw_expr, columnType as any) } };
  }
  return { Constraint: c };
}

/**
 * Fold a table unit's statements (CREATE TABLE plus any ALTER TABLE
 * ADD COLUMN / ADD CONSTRAINT) into an effective shape, so atomic and
 * consolidated authorships of the same table compare equal.
 *
 * Constraint placement is representation, not semantics: `id bigint PRIMARY
 * KEY`, a `PRIMARY KEY (id)` table elt, and `ALTER TABLE .. ADD CONSTRAINT
 * t_pkey PRIMARY KEY (id)` all catalog identically. Relocatable constraints
 * (PK/UNIQUE/FK/CHECK) are therefore lifted out of columns and ALTER
 * commands into one canonical table-level set — keyed with the Postgres
 * default name when unnamed, columns filled in from the owning column when
 * column-attached, DEFERRABLE/INITIALLY DEFERRED siblings folded in — and
 * PK/identity columns gain the NOT NULL the catalog implies. Type names and
 * default-expression casts are canonicalized so a module compares equal to
 * the catalog rendering of the same table.
 */
function tableShape(unit: ObjectUnit): TableShape {
  const shape: TableShape = { relation: null, columns: new Map(), extras: new Map(), annotations: emptyAnnotations() };
  const table = unit.identity.name;
  const rawColumns: { colname: string; def: Record<string, unknown> }[] = [];
  const constraints: { node: ConstraintNode & Record<string, unknown>; column?: string }[] = [];
  const notNullImplied = new Set<string>();

  const addColumn = (node: Record<string, unknown>): void => {
    const colname = (node as { colname?: string }).colname ?? '';
    const attached = (node.constraints as { Constraint?: Record<string, unknown> }[] | undefined) ?? [];
    const residual: unknown[] = [];
    let last: (ConstraintNode & Record<string, unknown>) | null = null;
    for (const item of attached) {
      const c = item.Constraint as (ConstraintNode & Record<string, unknown>) | undefined;
      if (!c) continue;
      if (c.contype && CONSTRAINT_ATTRS[c.contype]) {
        if (last) Object.assign(last, CONSTRAINT_ATTRS[c.contype]);
        continue;
      }
      const copy = { ...c };
      if (RELOCATABLE.has(c.contype ?? '')) {
        constraints.push({ node: copy, column: colname });
      } else {
        residual.push({ Constraint: copy });
        if (c.contype === 'CONSTR_IDENTITY') notNullImplied.add(colname);
      }
      last = copy;
    }
    rawColumns.push({ colname, def: { ...node, constraints: residual } });
  };
  const addConstraint = (node: Record<string, unknown>, column?: string): void => {
    constraints.push({ node: node as ConstraintNode & Record<string, unknown>, column });
  };
  // pg_dump emits column attributes as separate ALTER TABLE commands
  // (SET DEFAULT nextval(..), SET NOT NULL, ADD GENERATED .. AS IDENTITY);
  // they fold into the column they qualify.
  const foldColumnCommand = (at: Record<string, unknown>): boolean => {
    const target = rawColumns.find(c => c.colname === at.name);
    if (!target) return false;
    const list = target.def.constraints as Record<string, unknown>[];
    const without = (contype: string): Record<string, unknown>[] =>
      list.filter(item => (item.Constraint as { contype?: string } | undefined)?.contype !== contype);
    switch (at.subtype) {
    case 'AT_ColumnDefault':
      target.def.constraints = at.def === undefined
        ? without('CONSTR_DEFAULT')
        : [...without('CONSTR_DEFAULT'), { Constraint: { contype: 'CONSTR_DEFAULT', raw_expr: at.def } }];
      return true;
    case 'AT_SetNotNull':
      target.def.constraints = [...without('CONSTR_NOTNULL'), { Constraint: { contype: 'CONSTR_NOTNULL' } }];
      return true;
    case 'AT_DropNotNull':
      target.def.constraints = without('CONSTR_NOTNULL');
      return true;
    case 'AT_AddIdentity':
      target.def.constraints = [...without('CONSTR_IDENTITY'), at.def as Record<string, unknown>];
      notNullImplied.add(target.colname);
      return true;
    case 'AT_DropIdentity':
      target.def.constraints = without('CONSTR_IDENTITY');
      return true;
    default:
      return false;
    }
  };
  const addExtra = (node: unknown): void => {
    const clean = canonicalizeTypes(cleanTree(node));
    shape.extras.set(stablePrint(clean), clean);
  };

  for (const text of unit.texts) {
    for (const raw of parseSync(text).sql.stmts) {
      const stmt = raw.stmt as unknown as Record<string, Record<string, unknown>>;
      if (stmt.CreateStmt) {
        shape.relation = stmt.CreateStmt.relation;
        const elts = (stmt.CreateStmt.tableElts as Record<string, unknown>[] | undefined) ?? [];
        for (const elt of elts) {
          if (elt.ColumnDef) addColumn(elt.ColumnDef as Record<string, unknown>);
          else if (elt.Constraint && RELOCATABLE.has((elt.Constraint as ConstraintNode).contype ?? '')) {
            addConstraint(elt.Constraint as Record<string, unknown>);
          } else addExtra(elt);
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
          } else if (
            at.subtype === 'AT_AddConstraint' &&
            def?.Constraint &&
            RELOCATABLE.has((def.Constraint as ConstraintNode).contype ?? '')
          ) {
            addConstraint(def.Constraint as Record<string, unknown>);
          } else if (at.subtype === 'AT_ChangeOwner') {
            absorbAnnotation(shape.annotations, {
              AlterTableStmt: { relation: stmt.AlterTableStmt.relation, objtype: stmt.AlterTableStmt.objtype, cmds: [cmd] }
            });
          } else if (!foldColumnCommand(at)) {
            addExtra({ AlterTableCmd: at });
          }
        }
      } else if (!absorbAnnotation(shape.annotations, stmt)) {
        addExtra(stmt);
      }
    }
  }

  for (const { node, column } of constraints) {
    const canonical: Record<string, unknown> = { ...node };
    canonical.conname = node.conname ?? defaultConstraintName(table, node, column) ?? undefined;
    if (column && (node.keys ?? []).length === 0 && node.contype !== 'CONSTR_FOREIGN' && node.contype !== 'CONSTR_CHECK') {
      canonical.keys = [{ String: { sval: column } }];
    }
    if (column && node.contype === 'CONSTR_FOREIGN' && (node.fk_attrs ?? []).length === 0) {
      canonical.fk_attrs = [{ String: { sval: column } }];
    }
    if (node.contype === 'CONSTR_PRIMARY') {
      const keyed = (canonical.keys as { String?: { sval?: string } }[] | undefined) ?? [];
      for (const k of keyed) if (k.String?.sval) notNullImplied.add(k.String.sval);
    }
    addExtra({ Constraint: canonical });
  }

  for (const { colname, def } of rawColumns) {
    const typeName = canonicalizeTypes(cleanTree(def.typeName));
    const residual = ((def.constraints as unknown[] | undefined) ?? []).map(c =>
      normalizeColumnConstraint((c as { Constraint: ConstraintNode & Record<string, unknown> }).Constraint, typeName)
    );
    const hasNotNull = residual.some(
      c => (c as { Constraint?: ConstraintNode }).Constraint?.contype === 'CONSTR_NOTNULL'
    );
    if (notNullImplied.has(colname) && !hasNotNull) {
      residual.push({ Constraint: { contype: 'CONSTR_NOTNULL' } });
    }
    const sorted = residual
      .map(c => cleanTree(c))
      .sort((x, y) => stablePrint(canonicalizeTypes(x)).localeCompare(stablePrint(canonicalizeTypes(y))));
    const clean = cleanTree({ ...def, constraints: sorted });
    const canon = canonicalizeTypes(clean);
    shape.columns.set(colname, { def: clean, canon, print: stablePrint(canon) });
  }
  return shape;
}

const deparseStmt = (node: Record<string, unknown>): string =>
  `${Deparser.deparse(node, { pretty: false })};`;

/** Where in the migration an alteration belongs (tie-break only; edges rule). */
type Phase = 'drop' | 'remove' | 'alter' | 'add' | 'create';
const PHASE_RANK: Record<Phase, number> = { drop: 0, remove: 1, alter: 2, add: 3, create: 4 };

/** One ALTER TABLE step of a modified table, with its mechanical inverse. */
interface TableAlteration {
  sql: string;
  inverse: string;
  phase: Phase;
  /** Column/constraint identity the step targets (null for RLS toggles / annotations). */
  sub: NamingIdentity | null;
  /** Columns this step keys on (constraint keys / fk columns). */
  keyColumns: string[];
  /** Whether the step invalidates dependents of the column it targets (drop, retype). */
  breaking: boolean;
  /** The RENAME step every other step of the table must follow. */
  rename?: boolean;
}

/** Policy and declaration inputs threaded into the table diff. */
interface TableDiffContext {
  /** Declared column renames for this table (old → new). */
  columnRenames: Map<string, string>;
  /** `schema.table.column` → USING expression. */
  casts: Record<string, string>;
  destructive: string[];
  incomplete: string[];
}

interface ColumnAttributes {
  notNull: boolean;
  def?: unknown;
  identity?: Record<string, unknown>;
  generated?: Record<string, unknown>;
  other: unknown[];
}

/** Pull the diffable attributes out of a normalized ColumnDef's residual constraints. */
function columnAttributes(def: Record<string, unknown>): ColumnAttributes {
  const out: ColumnAttributes = { notNull: false, other: [] };
  for (const item of (def.constraints as { Constraint?: Record<string, unknown> }[] | undefined) ?? []) {
    const c = item.Constraint;
    if (!c) continue;
    if (c.contype === 'CONSTR_NOTNULL') out.notNull = true;
    else if (c.contype === 'CONSTR_DEFAULT') out.def = c.raw_expr;
    else if (c.contype === 'CONSTR_IDENTITY') out.identity = c;
    else if (c.contype === 'CONSTR_GENERATED') out.generated = c;
    else out.other.push(item);
  }
  return out;
}

/** The expression node of `SELECT <expr>`. */
function parseExpression(expr: string): unknown {
  const stmts = parseSync(`SELECT ${expr}`).sql.stmts;
  const select = stmts[0]?.stmt as unknown as { SelectStmt?: { targetList?: { ResTarget?: { val?: unknown } }[] } };
  const val = select?.SelectStmt?.targetList?.[0]?.ResTarget?.val;
  if (stmts.length !== 1 || !val) throw new DiffPolicyError('incomplete', `pgpm diff: --using expression is not a single expression: ${expr}`);
  return cleanTree(val);
}

/** Column name a COMMENT ON COLUMN entry targets, if any. */
const commentColumn = (entry: { objtype: string; object: unknown }): string | null => {
  if (entry.objtype !== 'OBJECT_COLUMN') return null;
  const items = ((entry.object as { List?: { items?: { String?: { sval?: string } }[] } }).List?.items) ?? [];
  return items[items.length - 1]?.String?.sval ?? null;
};

/** Column-level ALTERs between two table shapes, each paired with its inverse. */
function diffTable(
  from: TableShape,
  to: TableShape,
  diff: SemanticObjectDiff,
  ctx: TableDiffContext
): TableAlteration[] {
  const steps: TableAlteration[] = [];
  const relation = to.relation ?? from.relation;
  const schema = (relation as { schemaname?: string } | null)?.schemaname ?? null;
  const table = (relation as { relname?: string } | null)?.relname ?? diff.identity.name;
  const qualified = `${schema ?? ''}${schema ? '.' : ''}${table}`;
  const alter = (cmd: Record<string, unknown>): string =>
    deparseStmt({
      AlterTableStmt: {
        relation,
        cmds: [{ AlterTableCmd: { behavior: 'DROP_RESTRICT', ...cmd } }],
        objtype: 'OBJECT_TABLE'
      }
    });
  const column = (name: string): NamingIdentity => ({ kind: 'column', schema, name, table });
  const constraintName = (extra: unknown): string | undefined =>
    (extra as { Constraint?: { conname?: string } }).Constraint?.conname
    ?? (extra as { AlterTableCmd?: { def?: { Constraint?: { conname?: string } } } })
      .AlterTableCmd?.def?.Constraint?.conname;
  const constraintKeys = (extra: unknown): string[] => {
    const c = (extra as { Constraint?: ConstraintNode }).Constraint
      ?? (extra as { AlterTableCmd?: { def?: { Constraint?: ConstraintNode } } }).AlterTableCmd?.def?.Constraint;
    const keys = [...(c?.keys ?? []), ...(c?.fk_attrs ?? [])]
      .map(k => (k as { String?: { sval?: string } }).String?.sval)
      .filter((s): s is string => typeof s === 'string');
    const expr: ColumnMentions = { names: new Set(), star: false };
    collectColumnMentions((c as { raw_expr?: unknown } | undefined)?.raw_expr, expr);
    return [...new Set([...keys, ...expr.names])];
  };
  const attr = (name: string, phase: Phase, sql: string, inverse: string, breaking = false): TableAlteration =>
    ({ sql, inverse, phase, sub: column(name), keyColumns: [], breaking });

  diff.columnsAdded = [];
  diff.columnsRemoved = [];
  diff.columnsModified = [];

  // ---- declared column renames: the from side is re-keyed, then compared.
  const fromColumns = new Map(from.columns);
  const fromAnnotations: AnnotationState = { ...from.annotations, comments: new Map(from.annotations.comments) };
  for (const [oldName, newName] of ctx.columnRenames) {
    const prior = fromColumns.get(oldName);
    if (!prior || fromColumns.has(newName) || !to.columns.has(newName) || to.columns.has(oldName)) {
      throw new DiffPolicyError(
        'rename',
        `pgpm diff: cannot apply rename ${qualified}.${oldName} -> ${newName}: ` +
        `the source must have "${oldName}" (and not "${newName}") and the target "${newName}" (and not "${oldName}")`
      );
    }
    fromColumns.delete(oldName);
    const def = { ...(prior.def as Record<string, unknown>), colname: newName };
    const canon = { ...(prior.canon as Record<string, unknown>), colname: newName };
    fromColumns.set(newName, { def, canon, print: stablePrint(canon) });
    for (const [key, entry] of from.annotations.comments) {
      if (commentColumn(entry) !== oldName) continue;
      const items = ((entry.object as { List: { items: { String?: { sval?: string } }[] } }).List.items).slice();
      items[items.length - 1] = { String: { sval: newName } };
      const object = { List: { items } };
      fromAnnotations.comments.delete(key);
      fromAnnotations.comments.set(`${entry.objtype}:${stablePrint(object)}`, { ...entry, object });
    }
    steps.push({
      sql: deparseStmt({ RenameStmt: { renameType: 'OBJECT_COLUMN', relationType: 'OBJECT_TABLE', relation, subname: oldName, newname: newName, behavior: 'DROP_RESTRICT' } }),
      inverse: deparseStmt({ RenameStmt: { renameType: 'OBJECT_COLUMN', relationType: 'OBJECT_TABLE', relation, subname: newName, newname: oldName, behavior: 'DROP_RESTRICT' } }),
      phase: 'alter',
      sub: column(newName),
      keyColumns: [],
      breaking: false,
      rename: true
    });
  }

  for (const [name, col] of to.columns) {
    const prior = fromColumns.get(name);
    if (!prior) {
      diff.columnsAdded.push(name);
      steps.push({
        sql: alter({ subtype: 'AT_AddColumn', def: { ColumnDef: col.def } }),
        inverse: alter({ subtype: 'AT_DropColumn', name }),
        phase: 'add',
        sub: column(name),
        keyColumns: [],
        breaking: false
      });
      continue;
    }
    if (prior.print === col.print) continue;
    diff.columnsModified.push(name);
    const fromDef = prior.def as Record<string, unknown>;
    const toDef = col.def as Record<string, unknown>;
    // Compare canonical forms (type aliases, default casts); emit authored forms.
    const a = columnAttributes(prior.canon as Record<string, unknown>);
    const b = columnAttributes(col.canon as Record<string, unknown>);
    const aRaw = columnAttributes(fromDef);
    const bRaw = columnAttributes(toDef);
    const rebuild = (): void => {
      const drop = alter({ subtype: 'AT_DropColumn', name });
      steps.push(attr(name, 'alter',
        `${drop}\n${alter({ subtype: 'AT_AddColumn', def: { ColumnDef: toDef } })}`,
        `${drop}\n${alter({ subtype: 'AT_AddColumn', def: { ColumnDef: fromDef } })}`,
        true));
    };

    // Generated columns: the expression cannot be altered in place.
    if (b.generated && (!a.generated || stablePrint(a.generated) !== stablePrint(b.generated))) {
      if (!a.generated) ctx.destructive.push(`${qualified}: column "${name}" becomes GENERATED (rewritten: DROP COLUMN + ADD COLUMN)`);
      rebuild();
      continue;
    }
    if (a.generated && !b.generated) {
      steps.push(attr(name, 'alter',
        alter({ subtype: 'AT_DropExpression', name }),
        `${alter({ subtype: 'AT_DropColumn', name })}\n${alter({ subtype: 'AT_AddColumn', def: { ColumnDef: fromDef } })}`));
    }

    const typeChanged = typeKey(fromDef.typeName as any) !== typeKey(toDef.typeName as any);
    const collationChanged = stablePrint(fromDef.collClause) !== stablePrint(toDef.collClause);
    if (typeChanged || collationChanged) {
      const cast = ctx.casts[`${qualified}.${name}`];
      const using = (typeName: unknown): unknown =>
        cast !== undefined
          ? parseExpression(cast)
          : { TypeCast: { arg: { ColumnRef: { fields: [{ String: { sval: name } }] } }, typeName } };
      const retype = (def: Record<string, unknown>, expr: unknown): string =>
        alter({ subtype: 'AT_AlterColumnType', name, def: { ColumnDef: { typeName: def.typeName, collClause: def.collClause, raw_default: expr } } });
      if (typeChanged) {
        const targetType = Deparser.deparse({ TypeName: toDef.typeName } as any, { pretty: false });
        ctx.destructive.push(`${qualified}: ALTER COLUMN ${name} TYPE ${targetType}${cast !== undefined ? ` USING ${cast}` : ''} (cast may lose data)`);
      }
      // The inverse always casts back with `col::oldtype`: a user USING
      // expression is written for the old representation, not the new one.
      const castBack = { TypeCast: { arg: { ColumnRef: { fields: [{ String: { sval: name } }] } }, typeName: fromDef.typeName } };
      steps.push(attr(name, 'alter',
        retype(toDef, typeChanged ? using(toDef.typeName) : undefined),
        retype(fromDef, typeChanged ? castBack : undefined),
        typeChanged));
    }

    if (stablePrint(a.def) !== stablePrint(b.def)) {
      const setDefault = (expr: unknown): string => alter(expr === undefined ? { subtype: 'AT_ColumnDefault', name } : { subtype: 'AT_ColumnDefault', name, def: expr });
      steps.push(attr(name, 'alter', setDefault(bRaw.def), setDefault(aRaw.def)));
    }
    if (a.notNull !== b.notNull) {
      steps.push(attr(name, 'alter',
        alter({ subtype: b.notNull ? 'AT_SetNotNull' : 'AT_DropNotNull', name }),
        alter({ subtype: a.notNull ? 'AT_SetNotNull' : 'AT_DropNotNull', name })));
    }
    if (stablePrint(a.identity) !== stablePrint(b.identity)) {
      const add = (c: Record<string, unknown>): string => alter({ subtype: 'AT_AddIdentity', name, def: { Constraint: c } });
      const drop = alter({ subtype: 'AT_DropIdentity', name });
      if (a.identity) steps.push(attr(name, 'alter', drop, add(aRaw.identity!)));
      if (b.identity) steps.push(attr(name, 'alter', add(bRaw.identity!), drop));
    }
    if (stablePrint(a.other) !== stablePrint(b.other)) {
      ctx.incomplete.push(`${diff.path}: column "${name}" changed in a way pgpm cannot express as ALTER COLUMN (${a.other.length + b.other.length} unsupported constraint(s)); alter it manually`);
    }
    const rest = (def: unknown): string =>
      stablePrint({ ...(def as Record<string, unknown>), colname: null, typeName: null, collClause: null, constraints: null, is_local: null, location: null });
    if (rest(prior.canon) !== rest(col.canon)) {
      ctx.incomplete.push(`${diff.path}: column "${name}" changed storage/compression/options pgpm cannot express as ALTER COLUMN; alter it manually`);
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
    const conname = constraintName(extra);
    const subtype = (extra as { AlterTableCmd?: { subtype?: string } }).AlterTableCmd?.subtype;
    if (conname) {
      const def = (extra as { Constraint?: unknown }).Constraint ? extra : undefined;
      steps.push({
        sql: alter({ subtype: 'AT_DropConstraint', name: conname }),
        inverse: def
          ? alter({ subtype: 'AT_AddConstraint', def })
          : alter((extra as { AlterTableCmd: Record<string, unknown> }).AlterTableCmd),
        phase: 'remove',
        sub: { kind: 'constraint', schema, name: conname, table },
        keyColumns: constraintKeys(extra),
        breaking: false
      });
    } else if (subtype && INVERSE_SUBTYPE[subtype]) {
      steps.push({
        sql: alter({ subtype: INVERSE_SUBTYPE[subtype] }),
        inverse: alter({ subtype }),
        phase: 'remove',
        sub: null,
        keyColumns: [],
        breaking: false
      });
    } else {
      ctx.incomplete.push(`${diff.path}: removed table element has no name to drop (${describeExtra(extra)}); alter it manually`);
    }
  }
  // A dropped column takes its constraints with it, so constraint drops come
  // first (and, reverted, the column is re-added before its constraints).
  const dropSteps = new Map<string, TableAlteration>();
  for (const [name, prior] of fromColumns) {
    if (!to.columns.has(name)) {
      diff.columnsRemoved.push(name);
      ctx.destructive.push(`${qualified}: DROP COLUMN ${name}`);
      const step: TableAlteration = {
        sql: alter({ subtype: 'AT_DropColumn', name }),
        inverse: alter({ subtype: 'AT_AddColumn', def: { ColumnDef: prior.def } }),
        phase: 'remove',
        sub: column(name),
        keyColumns: [],
        breaking: true
      };
      dropSteps.set(name, step);
      steps.push(step);
    }
  }

  for (const [print, extra] of to.extras) {
    if (from.extras.has(print)) continue;
    const at = (extra as Record<string, Record<string, unknown>>).AlterTableCmd;
    const conname = constraintName(extra);
    if (at) {
      const subtype = at.subtype as string;
      const inverse = INVERSE_SUBTYPE[subtype]
        ? alter({ subtype: INVERSE_SUBTYPE[subtype] })
        : conname ? alter({ subtype: 'AT_DropConstraint', name: conname }) : '';
      if (!inverse) ctx.incomplete.push(`${diff.path}: added table element has no derivable inverse (${describeExtra(extra)})`);
      steps.push({
        sql: alter(at),
        inverse: inverse || `-- pgpm: no inverse for ${describeExtra(extra)}`,
        phase: 'add',
        sub: conname ? { kind: 'constraint', schema, name: conname, table } : null,
        keyColumns: constraintKeys(extra),
        breaking: false
      });
    } else if ((extra as Record<string, unknown>).Constraint && conname) {
      steps.push({
        sql: alter({ subtype: 'AT_AddConstraint', def: extra }),
        inverse: alter({ subtype: 'AT_DropConstraint', name: conname }),
        phase: 'add',
        sub: { kind: 'constraint', schema, name: conname, table },
        keyColumns: constraintKeys(extra),
        breaking: false
      });
    } else {
      ctx.incomplete.push(`${diff.path}: unrecognized added table element (${describeExtra(extra)}); alter it manually`);
    }
  }

  // ---- comments, grants, owner: keyed state, diffed to exact statements.
  for (const step of diffAnnotations(fromAnnotations, to.annotations, diff.path)) {
    if (step.incomplete) ctx.incomplete.push(step.incomplete);
    const comment = /^COMMENT ON COLUMN /i.exec(step.sql);
    const dropped = comment ? [...dropSteps.keys()].find(c => step.inverse.includes(`.${c} IS`) || step.inverse.includes(`.${c}" IS`)) : undefined;
    if (dropped && /IS NULL;$/i.test(step.sql.trim())) {
      // The column drop takes the comment with it; re-adding the column restores it.
      const drop = dropSteps.get(dropped)!;
      drop.inverse = `${drop.inverse}\n${step.inverse}`;
      continue;
    }
    steps.push({ sql: step.sql, inverse: step.inverse, phase: 'add', sub: null, keyColumns: [], breaking: false });
  }
  return steps;
}

/** Short human label for an unrecognized table element. */
function describeExtra(extra: unknown): string {
  const rec = extra as Record<string, Record<string, unknown>>;
  if (rec.AlterTableCmd) return `ALTER TABLE ${String(rec.AlterTableCmd.subtype)}`;
  const tag = Object.keys(rec)[0];
  if (tag === 'Constraint') return `constraint ${String(rec.Constraint.contype)}`;
  return tag ?? 'unknown element';
}

/** Column names a parse tree mentions (unqualified; `star` for `*`). */
interface ColumnMentions {
  names: Set<string>;
  star: boolean;
}

function collectColumnMentions(node: unknown, out: ColumnMentions): void {
  if (Array.isArray(node)) {
    for (const item of node) collectColumnMentions(item, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const rec = node as Record<string, unknown>;
  if (rec.ColumnRef) {
    const fields = ((rec.ColumnRef as { fields?: unknown[] }).fields ?? []);
    const last = fields[fields.length - 1] as { String?: { sval?: string }; A_Star?: unknown } | undefined;
    if (last?.A_Star) out.star = true;
    else if (last?.String?.sval) out.names.add(last.String.sval);
    return;
  }
  if (rec.IndexElem) {
    const name = (rec.IndexElem as { name?: string }).name;
    if (name) out.names.add(name);
  }
  if (rec.CreateTrigStmt) {
    for (const c of ((rec.CreateTrigStmt as { columns?: { String?: { sval?: string } }[] }).columns ?? [])) {
      if (c.String?.sval) out.names.add(c.String.sval);
    }
  }
  if (rec.Constraint) {
    const c = rec.Constraint as { keys?: unknown[]; fk_attrs?: unknown[]; pk_attrs?: unknown[] };
    for (const k of [...(c.keys ?? []), ...(c.fk_attrs ?? []), ...(c.pk_attrs ?? [])]) {
      const sval = (k as { String?: { sval?: string } }).String?.sval;
      if (sval) out.names.add(sval);
    }
  }
  if (rec.CreateFunctionStmt) {
    // `LANGUAGE sql AS $$ ... $$` bodies are opaque strings: parse them too.
    const options = ((rec.CreateFunctionStmt as { options?: { DefElem?: { defname?: string; arg?: unknown } }[] }).options ?? []);
    const language = options.find(o => o.DefElem?.defname === 'language')?.DefElem?.arg as { String?: { sval?: string } } | undefined;
    const as = options.find(o => o.DefElem?.defname === 'as')?.DefElem?.arg as { List?: { items?: { String?: { sval?: string } }[] } } | undefined;
    const body = as?.List?.items?.[0]?.String?.sval;
    if (language?.String?.sval?.toLowerCase() === 'sql' && body) {
      try {
        collectColumnMentions(parseSync(body).sql.stmts.map(s => s.stmt), out);
      } catch {
        out.star = true;
      }
    }
  }
  for (const value of Object.values(rec)) collectColumnMentions(value, out);
}

/** Column names mentioned anywhere in `texts` (conservative: unqualified). */
function columnMentions(texts: string[]): ColumnMentions {
  const out: ColumnMentions = { names: new Set(), star: false };
  for (const text of texts) collectColumnMentions(parseSync(text).sql.stmts.map(s => s.stmt), out);
  return out;
}

const mentions = (m: ColumnMentions, column: string): boolean => m.star || m.names.has(column);

/**
 * The part of a `CREATE FUNCTION` that `CREATE OR REPLACE` cannot change:
 * name, parameters (names, types, defaults) and return type. Null for
 * anything that is not a single function/procedure definition.
 */
function functionSignature(texts: string[]): string | null {
  if (texts.length === 0) return null;
  const nodes = parseSync(texts[0]).sql.stmts.map(s => s.stmt as unknown as Record<string, Record<string, unknown>>);
  const fn = nodes.length === 1 ? nodes[0].CreateFunctionStmt : undefined;
  if (!fn) return null;
  return stablePrint(cleanTree({
    funcname: fn.funcname,
    parameters: fn.parameters,
    returnType: fn.returnType,
    is_procedure: fn.is_procedure
  }));
}

/** Rewrite the unit's `CREATE FUNCTION` as `CREATE OR REPLACE FUNCTION`. */
function asReplace(texts: string[]): string {
  return texts.map(text => {
    const nodes = parseSync(text).sql.stmts.map(s => s.stmt as unknown as Record<string, Record<string, unknown>>);
    if (nodes.length === 1 && nodes[0].CreateFunctionStmt) {
      return deparseStmt({ CreateFunctionStmt: { ...nodes[0].CreateFunctionStmt, replace: true } });
    }
    return text;
  }).join('\n');
}

/** Kinds whose catalog entries pin the columns/objects they reference. */
const REBUILDABLE = new Set(['view', 'index', 'policy', 'trigger', 'function']);

/** Kinds whose DROP loses data (tables, their columns' sequences, whole schemas, types with dependents). */
const DATA_BEARING = new Set(['table', 'schema', 'sequence', 'type', 'domain']);

/**
 * One undeployed statement group of the delta: a DROP, an ALTER TABLE step,
 * or a CREATE. Atoms are the nodes of the delta's dependency graph; changes
 * are built from them afterwards.
 */
interface Atom {
  id: number;
  /** Grouping key: atoms of one unit become one change unless an outside atom must sit between them. */
  unit: string;
  /** Unit key of the object this atom belongs to (the table, for ALTER TABLE steps). */
  owner: string;
  /** Change name for this atom's segment (segments with a different mix get `/drop`). */
  name: string;
  phase: Phase;
  sql: string;
  inverse: string;
  facts: StatementFacts[];
  /** Column/constraint identity for table alterations. */
  sub: NamingIdentity | null;
  /** Columns a constraint alteration keys on. */
  keyColumns: string[];
  /** Whether the step invalidates dependents (drops, column drop/retype). */
  breaking: boolean;
  /** Tie-break within a phase (lower first). */
  rank: number;
  deps: Set<number>;
}

const objectKey = (ref: { schema: string | null; name: string }): string => `${ref.schema ?? ''}.${ref.name}`;

/** Rewrite every reference to relation `schema.from` in `texts` to `schema.to` (AST-level). */
function renameRelation(texts: string[], schema: string | null, from: string, to: string): string[] {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const rec = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rec)) {
      const rv = value as { relname?: string; schemaname?: string } | undefined;
      if (
        (key === 'RangeVar' || key === 'relation' || key === 'pktable' || key === 'typevar') &&
        rv && typeof rv === 'object' && rv.relname === from && ((rv.schemaname ?? null) === schema || !rv.schemaname)
      ) {
        out[key] = walk({ ...rv, relname: to });
        continue;
      }
      out[key] = walk(value);
    }
    return out;
  };
  return texts.map(text =>
    parseSync(text).sql.stmts.map(st => deparseStmt(walk(st.stmt) as Record<string, unknown>)).join('\n')
  );
}

/**
 * Diff two deploy surfaces by object identity and emit the migration delta.
 *
 * `from`/`to` are whole deploy scripts (flatten changes in plan order to
 * diff bundles/modules). The result's `changes` deploy `to`'s shape on top
 * of `from`, ordered by one dependency graph over everything undeployed —
 * drops, table alterations, replacements and creates alike — with phase and
 * source order breaking ties only.
 */
export function diffSchemas(
  from: string,
  to: string,
  options: SemanticDiffOptions = {}
): SemanticDiffResult {
  const style = options.style ?? 'directory';
  const alteration = options.changeGranularity === 'alteration';
  const warnings: string[] = [];
  /** Steps that can lose data; refused unless `allowDataLoss`. */
  const destructive: string[] = [];
  /** Steps with no derivable DROP/inverse; refused unless `allowIncomplete`. */
  const incomplete: string[] = [];
  const a = readSide(from, warnings, 'from');
  const b = readSide(to, warnings, 'to');
  const renames = options.renames ?? [];
  const casts = options.casts ?? {};

  // ---- declared table renames: re-key the from-side unit under its new name.
  const renamedTables = new Map<string, { from: string; schema: string | null }>();
  for (const rename of renames.filter(r => r.kind === 'table')) {
    const oldKey = identityKey({ kind: 'table', schema: rename.schema, name: rename.from });
    const newKey = identityKey({ kind: 'table', schema: rename.schema, name: rename.to });
    const unit = a.units.get(oldKey);
    if (!unit || a.units.has(newKey) || !b.units.has(newKey) || b.units.has(oldKey)) {
      throw new DiffPolicyError(
        'rename',
        `pgpm diff: cannot apply rename ${rename.schema ?? ''}.${rename.from} -> ${rename.to}: ` +
        `the source must have table "${rename.from}" (and not "${rename.to}") and the target "${rename.to}" (and not "${rename.from}")`
      );
    }
    a.units.delete(oldKey);
    const renamed: ObjectUnit = {
      identity: { ...unit.identity, name: rename.to },
      statements: unit.statements,
      texts: renameRelation(unit.texts, rename.schema, rename.from, rename.to)
    };
    a.units.set(newKey, renamed);
    a.order[a.order.indexOf(oldKey)] = newKey;
    renamedTables.set(newKey, { from: rename.from, schema: rename.schema });
  }
  const columnRenames = new Map<string, Map<string, string>>();
  for (const rename of renames.filter(r => r.kind === 'column')) {
    const key = identityKey({ kind: 'table', schema: rename.schema, name: rename.table! });
    if (!columnRenames.has(key)) columnRenames.set(key, new Map());
    columnRenames.get(key)!.set(rename.from, rename.to);
  }

  const objects: SemanticObjectDiff[] = [];
  const forwardSql: string[] = [];
  const atoms: Atom[] = [];

  const inverseOf = (deploy: string, context: string): string => {
    const facts = classifyStatements(deploy);
    const graph = buildStatementGraph(facts);
    const pieces: string[] = [];
    for (const i of [...graph.order].reverse()) {
      const nodes = invertStatement(facts[i]);
      if (nodes === null) {
        const { sql, warnings: w } = revertFor([facts[i]]);
        incomplete.push(...w.map(x => `${context}: ${x}`));
        if (sql.trim()) pieces.push(sql);
        continue;
      }
      pieces.push(...nodes.map(n => deparseStmt(n as Record<string, unknown>)));
    }
    return pieces.join('\n');
  };
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

  const addAtom = (atom: Omit<Atom, 'id' | 'deps' | 'facts' | 'owner' | 'breaking'> & { owner?: string; breaking?: boolean }): Atom => {
    const full: Atom = {
      ...atom,
      owner: atom.owner ?? atom.unit,
      breaking: atom.breaking ?? (atom.phase === 'drop'),
      id: atoms.length,
      deps: new Set(),
      facts: classifyStatements(atom.sql)
    };
    atoms.push(full);
    return full;
  };

  /** Atoms per unit key, and the unit's object key for reference binding. */
  const unitAtoms = new Map<string, Atom[]>();
  const track = (unitKey: string, atom: Atom): void => {
    if (!unitAtoms.has(unitKey)) unitAtoms.set(unitKey, []);
    unitAtoms.get(unitKey)!.push(atom);
  };
  const unitPhase = (unitKey: string, ...phases: Phase[]): Atom[] =>
    (unitAtoms.get(unitKey) ?? []).filter(x => phases.includes(x.phase));
  /** Object key (`schema.name`) → unit key, for both sides. */
  const unitByObject = new Map<string, string>();
  for (const side of [a, b]) {
    for (const [key, unit] of side.units) {
      if (!unit.identity.table || unit.identity.kind === 'table') {
        unitByObject.set(objectKey({ schema: unit.identity.schema, name: unit.identity.table ?? unit.identity.name }), key);
      }
    }
  }
  /** `from`-side column mentions per unit (lazy). */
  const fromMentions = new Map<string, ColumnMentions>();
  const mentionsOf = (unit: ObjectUnit): ColumnMentions => {
    const key = identityKey(unit.identity);
    if (!fromMentions.has(key)) fromMentions.set(key, columnMentions(unit.texts));
    return fromMentions.get(key)!;
  };
  /** `from`-side unit dependencies (graph edges mapped onto units). */
  const fromUnitOf = new Map<number, string>();
  for (const [key, unit] of a.units) for (const st of unit.statements) fromUnitOf.set(st, key);
  const fromDependencies = (unitKey: string): Set<string> => {
    const out = new Set<string>();
    for (const edge of a.graph.edges) {
      const fromUnit = fromUnitOf.get(edge.from);
      const toUnit = fromUnitOf.get(edge.to);
      if (fromUnit !== unitKey || !toUnit || toUnit === unitKey) continue;
      // Late (body-level) references bind at call time — except types, which
      // a function signature or table column pins in the catalog.
      if (edge.kind === 'late' && a.units.get(toUnit)?.identity.kind !== 'type') continue;
      out.add(toUnit);
    }
    return out;
  };
  const objectLabel = (id: ObjectIdentity): string => `${id.schema ? `${id.schema}.` : ''}${id.name}`;

  // Drop + create pair for a unit's statements (replacements, rebuilds, removals).
  const dropOf = (unit: ObjectUnit, path: string, rank: number): Atom | null => {
    const recreate = unit.texts.join('\n');
    const drop = inverseOf(recreate, path);
    if (!drop.trim() || drop.trim().startsWith('--')) {
      incomplete.push(`${path}: no DROP derivable for kind "${unit.identity.kind}" (${objectLabel(unit.identity)}); drop it manually`);
      return null;
    }
    return addAtom({ unit: identityKey(unit.identity), name: path, phase: 'drop', sql: drop, inverse: recreate, sub: null, keyColumns: [], rank });
  };
  const createOf = (unit: ObjectUnit, path: string, rank: number): Atom => {
    const deploy = unit.texts.join('\n');
    return addAtom({ unit: identityKey(unit.identity), name: path, phase: 'create', sql: deploy, inverse: inverseOf(deploy, path), sub: null, keyColumns: [], rank });
  };

  const fromRank = (unit: ObjectUnit): number =>
    -Math.min(...unit.statements.map(st => a.graph.order.indexOf(st)));

  /** A non-table unit's defining statements (texts) and its annotation state. */
  const splitUnit = (unit: ObjectUnit): { definition: string[]; nodes: Record<string, unknown>[]; annotations: AnnotationState } => {
    const annotations = emptyAnnotations();
    const definition: string[] = [];
    const nodes: Record<string, unknown>[] = [];
    for (const text of unit.texts) {
      for (const raw of parseSync(text).sql.stmts) {
        const stmt = raw.stmt as unknown as Record<string, unknown>;
        if (absorbAnnotation(annotations, stmt)) continue;
        definition.push(deparseStmt(stmt));
        nodes.push(stmt);
      }
    }
    return { definition, nodes, annotations };
  };
  const definitionFingerprint = (texts: string[]): string => texts.map(fingerprint).sort().join('\n');

  // ---- to-side pass 1: added objects and modified tables; other modified
  // units are deferred until every drop is known (a function that keeps its
  // signature can only be replaced in place if nothing it depends on is dropped).
  const deferred: { key: string; unit: ObjectUnit; prior: ObjectUnit; toRank: number }[] = [];
  b.order.forEach((key, toRank) => {
    const unit = b.units.get(key)!;
    const prior = a.units.get(key);
    const path = pathFor(unit.identity, { style });
    if (!prior) {
      objects.push({ identity: unit.identity, path, delta: 'added' });
      forwardSql.push(...unit.texts);
      return;
    }
    if (unit.identity.kind === 'table') {
      const shapeFrom = tableShape(prior);
      const shapeTo = tableShape(unit);
      const diff: SemanticObjectDiff = { identity: unit.identity, path, delta: 'modified' };
      const steps = diffTable(shapeFrom, shapeTo, diff, {
        columnRenames: columnRenames.get(key) ?? new Map(),
        casts,
        destructive,
        incomplete
      });
      const renamed = renamedTables.get(key);
      if (renamed) {
        const relation = { schemaname: renamed.schema ?? undefined, relname: renamed.from, inh: true, relpersistence: 'p' };
        const renameSql = (fromName: string, toName: string): string =>
          deparseStmt({ RenameStmt: { renameType: 'OBJECT_TABLE', relationType: 'OBJECT_TABLE', relation: { ...relation, relname: fromName }, newname: toName, behavior: 'DROP_RESTRICT' } });
        steps.unshift({
          sql: renameSql(renamed.from, unit.identity.name),
          inverse: renameSql(unit.identity.name, renamed.from),
          phase: 'alter',
          sub: { kind: 'table', schema: renamed.schema, name: unit.identity.name },
          keyColumns: [],
          breaking: false,
          rename: true
        });
      }
      const columnsTouched =
        diff.columnsAdded!.length + diff.columnsRemoved!.length + diff.columnsModified!.length > 0;
      if (steps.length > 0 || columnsTouched) objects.push(diff);
      const renameAtoms: Atom[] = [];
      const stepAtoms: Atom[] = [];
      steps.forEach((step, i) => {
        let name = `${path}/alter`;
        if (alteration && step.sub) {
          const subPath = pathFor(step.sub, { style });
          name = step.rename ? `${subPath}/rename` : step.phase === 'add' ? subPath : step.phase === 'remove' ? `${subPath}/drop` : `${subPath}/alter`;
        }
        const atom = addAtom({
          unit: alteration ? `${key}\u0000${name}` : key,
          owner: key,
          name,
          phase: step.phase,
          sql: step.sql,
          inverse: step.inverse,
          sub: step.sub,
          keyColumns: step.keyColumns,
          breaking: step.breaking,
          rank: toRank * 1000 + i - (step.rename ? 1000 : 0)
        });
        (step.rename ? renameAtoms : stepAtoms).push(atom);
        track(key, atom);
      });
      // Every other step of the table addresses it (or its columns) by the new name.
      for (const r of renameAtoms) for (const x of stepAtoms) x.deps.add(r.id);
      return;
    }
    if (unitFingerprint(prior) === unitFingerprint(unit)) return;
    deferred.push({ key, unit, prior, toRank });
  });

  // ---- from-side: removed ------------------------------------------------
  for (const key of a.order) {
    if (b.units.has(key)) continue;
    const unit = a.units.get(key)!;
    const path = pathFor(unit.identity, { style });
    objects.push({ identity: unit.identity, path, delta: 'removed' });
    if (DATA_BEARING.has(unit.identity.kind)) {
      destructive.push(`${objectLabel(unit.identity)}: DROP ${unit.identity.kind.toUpperCase()}`);
    }
    const drop = dropOf(unit, path, fromRank(unit));
    if (drop) track(key, drop);
  }

  // ---- to-side pass 2: modified non-table units, dependencies first.
  deferred.sort((x, y) => fromRank(y.prior) - fromRank(x.prior));
  for (const { key, unit, prior, toRank } of deferred) {
    const path = pathFor(unit.identity, { style });
    objects.push({ identity: unit.identity, path, delta: 'modified' });
    const pa = splitUnit(prior);
    const pb = splitUnit(unit);
    const annotationSteps = diffAnnotations(pa.annotations, pb.annotations, path);
    const emitSteps = (list: { sql: string; inverse: string; incomplete?: string; destructive?: string }[], after?: Atom, breaking = false): void => {
      list.forEach((step, i) => {
        if (step.incomplete) incomplete.push(`${path}: ${step.incomplete}`);
        if (step.destructive) destructive.push(step.destructive);
        const atom = addAtom({
          unit: key, name: path, phase: 'alter', sql: step.sql, inverse: step.inverse,
          sub: null, keyColumns: [], breaking, rank: toRank * 1000 + i + (after ? 500 : 0)
        });
        if (after) atom.deps.add(after.id);
        track(key, atom);
      });
    };
    const definitionChanged = definitionFingerprint(pa.definition) !== definitionFingerprint(pb.definition);
    if (!definitionChanged) {
      emitSteps(annotationSteps);
      continue;
    }
    if (pa.nodes.length === 1 && pb.nodes.length === 1) {
      const steps = alterInPlace(pa.nodes[0], pb.nodes[0], objectLabel(unit.identity));
      if (steps) {
        // Shape changes (enum values, domain rules, attributes) invalidate
        // dependents the way a drop does; annotations do not.
        emitSteps(steps, undefined, true);
        emitSteps(annotationSteps);
        continue;
      }
    }
    const signature = functionSignature(pb.definition);
    // A function body is validated against the current shape of the types it
    // uses, so around a dropped or altered dependency it must be dropped and
    // recreated (in both directions) rather than replaced in place.
    const dependencyChanged = [...fromDependencies(key)].some(dep => unitPhase(dep, 'drop', 'alter').some(x => x.breaking));
    if (signature !== null && signature === functionSignature(pa.definition) && !dependencyChanged) {
      // Same name, parameters and return type: replace in place. Dependents
      // (views, triggers, defaults) keep pointing at the same function.
      const atom = addAtom({
        unit: key, name: path, phase: 'create', sql: asReplace(pb.definition), inverse: asReplace(pa.definition),
        sub: null, keyColumns: [], breaking: false, rank: toRank * 1000
      });
      track(key, atom);
      // Objects it stopped depending on may only be dropped once it is replaced.
      for (const dep of fromDependencies(key)) for (const x of unitPhase(dep, 'drop')) x.deps.add(atom.id);
      emitSteps(annotationSteps, atom);
      continue;
    }
    if (DATA_BEARING.has(unit.identity.kind)) {
      destructive.push(`${objectLabel(unit.identity)}: ${unit.identity.kind} is dropped and recreated (not alterable in place)`);
    }
    const drop = dropOf(prior, path, fromRank(prior));
    const create = createOf(unit, path, toRank * 1000);
    if (drop) {
      create.deps.add(drop.id);
      track(key, drop);
    }
    track(key, create);
  }

  // ---- from-side: unchanged dependents that a breaking step would invalidate
  // (view/policy/trigger on a dropped or retyped column, or on a replaced
  // object; a function whose signature uses a replaced type): drop them
  // before the breaking step and recreate them after. `from`'s topological
  // order processes dependencies before dependents, so rebuilds cascade in
  // one pass.
  const fromUnitsTopo = [...a.units.keys()].sort((x, y) => fromRank(a.units.get(y)!) - fromRank(a.units.get(x)!));
  for (const key of fromUnitsTopo) {
    const unit = a.units.get(key)!;
    const other = b.units.get(key);
    if (!other || !REBUILDABLE.has(unit.identity.kind)) continue;
    if (unitFingerprint(unit) !== unitFingerprint(other)) continue;
    const used = mentionsOf(unit);
    const breaking: Atom[] = [];
    for (const dep of fromDependencies(key)) {
      if (!b.units.has(dep)) continue;
      breaking.push(...unitPhase(dep, 'drop'));
      // Functions bind late to columns; only replaced objects invalidate them.
      if (unit.identity.kind === 'function') continue;
      breaking.push(...unitPhase(dep, 'remove', 'alter').filter(x => x.breaking && x.sub?.kind === 'column' && mentions(used, x.sub.name)));
    }
    if (breaking.length === 0) continue;
    const path = pathFor(unit.identity, { style });
    const drop = dropOf(unit, path, fromRank(unit));
    if (!drop) continue;
    const create = createOf(unit, path, b.order.indexOf(key) * 1000);
    create.deps.add(drop.id);
    for (const x of breaking) {
      x.deps.add(drop.id);
      create.deps.add(x.id);
    }
    track(key, drop);
    track(key, create);
  }

  // ---- drops order by the `from` graph: a dependent's DROP precedes the DROP
  // (or the dropped/retyped column) of what it referenced.
  for (const [key, list] of unitAtoms) {
    const drops = list.filter(x => x.phase === 'drop');
    if (drops.length === 0) continue;
    const unit = a.units.get(key);
    if (!unit) continue;
    const used = mentionsOf(unit);
    for (const dep of fromDependencies(key)) {
      for (const x of unitPhase(dep, 'drop')) for (const d of drops) x.deps.add(d.id);
      for (const x of unitPhase(dep, 'remove', 'alter')) {
        if (!x.breaking) continue;
        if (x.sub?.kind === 'column' && !mentions(used, x.sub.name)) continue;
        for (const d of drops) x.deps.add(d.id);
      }
    }
  }

  // ---- added objects: shaped and named by the granularity pipeline; each
  // emitted change is one atom carrying the pipeline's requires.
  const createAtomByName = new Map<string, Atom>();
  if (forwardSql.length > 0) {
    const { changes, warnings: w } = restructureChanges(
      [{ name: 'delta', dependencies: [], deploy: forwardSql.join('\n\n') }],
      {
        granularity: options.granularity ?? 'object',
        changeGranularity: alteration ? 'alteration' : undefined,
        subObjectName: identity => pathFor(identity, { style })
      }
    );
    warnings.push(...w);
    const pending: [Atom, string[]][] = [];
    changes.forEach((c, i) => {
      const atom = addAtom({
        unit: `added\u0000${c.name}`, name: c.name, phase: 'create', sql: c.deploy,
        inverse: inverseOf(c.deploy, c.name), sub: null, keyColumns: [], rank: 100000 + i
      });
      createAtomByName.set(c.name, atom);
      track(atom.unit, atom);
      pending.push([atom, c.dependencies]);
    });
    for (const [atom, deps] of pending) {
      for (const d of deps) {
        const target = createAtomByName.get(d);
        if (target) atom.deps.add(target.id);
      }
    }
  }

  // ---- forward edges: a create/add step depends on what it references —
  // the create of a replaced/rebuilt/added object, and on a modified table
  // the RENAME, ADD COLUMN / ADD CONSTRAINT / type-change steps of the columns it uses.
  const createAtomsByObject = new Map<string, Atom[]>();
  for (const atom of atoms) {
    if (atom.phase !== 'create') continue;
    for (const f of atom.facts) {
      for (const c of f.creates) {
        const k = objectKey(c);
        if (!createAtomsByObject.has(k)) createAtomsByObject.set(k, []);
        createAtomsByObject.get(k)!.push(atom);
      }
    }
  }
  const isAdded = (unit: string): boolean => unit.startsWith('added\u0000');
  for (const atom of atoms) {
    if (atom.phase !== 'create' && atom.phase !== 'add') continue;
    const used = columnMentions(atom.facts.map(f => sliceStatementBytes(sqlSourceBytes(atom.sql), f.span.start, f.span.len)));
    const seen = new Set<string>();
    for (const f of atom.facts) {
      for (const ref of f.references) {
        const k = objectKey(ref);
        if (seen.has(k)) continue;
        seen.add(k);
        for (const target of createAtomsByObject.get(k) ?? []) {
          if (target.unit !== atom.unit && !(isAdded(atom.unit) && isAdded(target.unit))) {
            atom.deps.add(target.id);
          }
        }
        const unitKey = unitByObject.get(k);
        if (!unitKey || unitKey === atom.owner) continue;
        for (const step of unitPhase(unitKey, 'add', 'alter')) {
          if (step.sub?.kind === 'table') atom.deps.add(step.id);
          if (step.sub === null && step.breaking && step.phase === 'alter') atom.deps.add(step.id);
          if (step.sub?.kind === 'column' && mentions(used, step.sub.name)) atom.deps.add(step.id);
          if (step.sub?.kind === 'constraint' && step.phase === 'add' && step.keyColumns.length > 0
            && step.keyColumns.every(c => mentions(used, c))) {
            atom.deps.add(step.id);
          }
        }
      }
    }
    // Within a table: constraints follow the columns they key on (added or
    // altered) and the same-name constraint they replace.
    if (atom.sub) {
      const tableKey = atom.owner;
      for (const step of unitPhase(tableKey, 'add', 'alter')) {
        if (step !== atom && step.sub?.kind === 'column' && atom.keyColumns.includes(step.sub.name)) atom.deps.add(step.id);
      }
      for (const step of unitPhase(tableKey, 'remove')) {
        if (step.sub?.kind === atom.sub.kind && step.sub.name === atom.sub.name) atom.deps.add(step.id);
      }
    }
  }

  // Within a table: a column drop follows the drop of every constraint that
  // keyed on or checked that column (the column drop would take them with it,
  // and the revert must re-add the column before them); a column alteration
  // (e.g. DROP NOT NULL) follows the drop of the primary key that implied it.
  for (const atom of atoms) {
    if ((atom.phase !== 'remove' && atom.phase !== 'alter') || atom.sub?.kind !== 'column') continue;
    const tableKey = atom.owner;
    for (const step of unitPhase(tableKey, 'remove')) {
      if (step.sub?.kind === 'constraint' && step.keyColumns.includes(atom.sub.name)) atom.deps.add(step.id);
    }
  }

  // ---- policy: refuse data loss / incompleteness unless accepted explicitly.
  if (destructive.length > 0 && !options.allowDataLoss) {
    throw new DiffPolicyError(
      'data-loss',
      `pgpm diff: refusing to emit a migration with data loss; re-run with --allow-data-loss to accept it:\n${destructive.map(x => `  - ${x}`).join('\n')}`
    );
  }
  if (incomplete.length > 0 && !options.allowIncomplete) {
    throw new DiffPolicyError(
      'incomplete',
      `pgpm diff: migration is incomplete (steps pgpm cannot derive); re-run with --allow-incomplete to emit it with the gaps marked:\n${incomplete.map(x => `  - ${x}`).join('\n')}`
    );
  }
  warnings.push(...destructive.map(x => `data loss accepted: ${x}`));
  warnings.push(...incomplete.map(x => `incomplete: ${x}`));

  // ---- order: stable topological sort over atoms (phase, then rank, break ties).
  const order = topoOrder(atoms, atom => `${atom.name} (${atom.phase})`);

  // ---- segments: a unit's atoms form one change unless an outside atom
  // depends on an earlier atom and a later atom depends on it.
  const changes = buildChanges(atoms, order, options.changeGranularity === 'single', inverseOf, verifyOf);

  return {
    identical: objects.length === 0,
    objects,
    changes,
    warnings
  };
}

/** Kahn's algorithm with a (phase, rank) priority; throws on a cycle. */
function topoOrder(atoms: Atom[], label: (atom: Atom) => string): number[] {
  const indegree = atoms.map(x => x.deps.size);
  const dependents: number[][] = atoms.map((): number[] => []);
  for (const atom of atoms) for (const d of atom.deps) dependents[d].push(atom.id);
  const priority = (x: number, y: number): number =>
    PHASE_RANK[atoms[x].phase] - PHASE_RANK[atoms[y].phase] || atoms[x].rank - atoms[y].rank || x - y;
  const ready = atoms.filter(x => x.deps.size === 0).map(x => x.id).sort(priority);
  const order: number[] = [];
  while (ready.length > 0) {
    const next = ready.shift()!;
    order.push(next);
    for (const d of dependents[next]) {
      indegree[d] -= 1;
      if (indegree[d] === 0) {
        ready.push(d);
        ready.sort(priority);
      }
    }
  }
  if (order.length !== atoms.length) {
    const stuck = atoms.filter(x => !order.includes(x.id)).map(label);
    throw new Error(`pgpm diff: dependency cycle among undeployed changes; cannot order: ${stuck.join(', ')}`);
  }
  return order;
}

function buildChanges(
  atoms: Atom[],
  order: number[],
  single: boolean,
  inverseOf: (deploy: string, context: string) => string,
  verifyOf: (deploy: string, context: string) => string
): SemanticDeltaChange[] {
  const position = new Map(order.map((id, i) => [id, i]));
  const ordered = order.map(id => atoms[id]);

  if (single) {
    if (ordered.length === 0) return [];
    const deploy = ordered.map(x => x.sql).join('\n\n');
    const forward = ordered.filter(x => x.phase === 'create' || x.phase === 'add').map(x => x.sql).join('\n\n');
    return [{
      name: 'module/init',
      dependencies: [],
      deploy,
      revert: [...ordered].reverse().map(x => x.inverse).filter(Boolean).join('\n\n'),
      verify: forward ? verifyOf(forward, 'module/init') : ''
    }];
  }

  // Segment nodes: start one per atom, then merge same-unit atoms when no
  // outside node lies on a dependency path between them.
  const segmentOf = atoms.map(x => x.id);
  const members: number[][] = atoms.map(x => [x.id]);
  const segDeps = (s: number): Set<number> => {
    const out = new Set<number>();
    for (const m of members[s]) for (const d of atoms[m].deps) if (segmentOf[d] !== s) out.add(segmentOf[d]);
    return out;
  };
  const reaches = (from: number, target: number, skip: number): boolean => {
    const seen = new Set<number>([skip]);
    const stack = [...segDeps(from)].filter(s => s !== skip);
    while (stack.length > 0) {
      const s = stack.pop()!;
      if (s === target) return true;
      if (seen.has(s)) continue;
      seen.add(s);
      for (const d of segDeps(s)) if (!seen.has(d)) stack.push(d);
    }
    return false;
  };
  const byUnit = new Map<string, Atom[]>();
  for (const atom of ordered) {
    if (!byUnit.has(atom.unit)) byUnit.set(atom.unit, []);
    byUnit.get(atom.unit)!.push(atom);
  }
  for (const list of byUnit.values()) {
    let current = segmentOf[list[0].id];
    for (const atom of list.slice(1)) {
      // Merging is safe iff no path from `atom` back to `current` passes
      // through another segment.
      const external = [...new Set([...atom.deps].map(d => segmentOf[d]))].filter(s => s !== current);
      if (external.some(s => reaches(s, current, -1)) || reaches(current, segmentOf[atom.id], -1)) {
        current = segmentOf[atom.id];
        continue;
      }
      members[current].push(atom.id);
      members[atom.id] = [];
      segmentOf[atom.id] = current;
    }
  }

  const segments = [...new Set(segmentOf)].sort((x, y) => position.get(x)! - position.get(y)!);

  // Emit in topological order of segments (segment deps are acyclic by construction).
  const segIndegree = new Map<number, number>();
  const segDependents = new Map<number, number[]>();
  for (const s of segments) {
    segIndegree.set(s, segDeps(s).size);
    for (const d of segDeps(s)) {
      if (!segDependents.has(d)) segDependents.set(d, []);
      segDependents.get(d)!.push(s);
    }
  }
  const ready = segments.filter(s => segIndegree.get(s) === 0);
  const emitted: number[] = [];
  while (ready.length > 0) {
    ready.sort((x, y) => position.get(x)! - position.get(y)!);
    const s = ready.shift()!;
    emitted.push(s);
    for (const d of segDependents.get(s) ?? []) {
      segIndegree.set(d, segIndegree.get(d)! - 1);
      if (segIndegree.get(d) === 0) ready.push(d);
    }
  }
  if (emitted.length !== segments.length) {
    throw new Error('pgpm diff: dependency cycle among emitted changes; cannot order');
  }

  // Name segments in emitted order: a unit split in two gets `<name>` then `<name>-2`.
  const nameOf = new Map<number, string>();
  const used = new Map<string, number>();
  for (const s of emitted) {
    const list = members[s].sort((x, y) => position.get(x)! - position.get(y)!);
    const first = atoms[list[0]];
    const dropOnly = list.every(id => atoms[id].phase === 'drop');
    let base = dropOnly ? `${first.name}/drop` : first.name;
    if (!dropOnly && first.phase === 'drop') base = atoms[list.find(id => atoms[id].phase !== 'drop')!].name;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    nameOf.set(s, n === 1 ? base : `${base}-${n}`);
  }

  return emitted.map(s => {
    const list = members[s].sort((x, y) => position.get(x)! - position.get(y)!);
    const name = nameOf.get(s)!;
    const forward = list.map(id => atoms[id]).filter(x => x.phase === 'create' || x.phase === 'add');
    return {
      name,
      dependencies: [...segDeps(s)].map(d => nameOf.get(d)!).sort(),
      deploy: list.map(id => atoms[id].sql).join('\n'),
      revert: [...list].reverse().map(id => atoms[id].inverse).filter(Boolean).join('\n'),
      verify: forward.length > 0 ? verifyOf(forward.map(x => x.sql).join('\n'), name) : ''
    };
  });
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

/** How one object a change touches relates to the diff's delta. */
export type ChangeObjectDelta = ObjectDelta | 'unchanged';

/**
 * Whether a `to`-side change is already satisfied by the `from` side:
 * - `satisfied`: every object it touches is unchanged in the diff
 * - `unsatisfied`: every object it touches is added/modified in the diff
 * - `partial`: a mix of unchanged and delta objects
 * - `inert`: no identifiable objects (seed data, grants-only, dynamic SQL)
 */
export type ChangeSatisfaction = 'satisfied' | 'unsatisfied' | 'partial' | 'inert';

export interface ChangeObjectCoverage {
  /** Canonical naming-spec path for the object. */
  path: string;
  delta: ChangeObjectDelta;
}

export interface ChangeCoverage {
  /** The input change's name (as given, e.g. `pkg:change`). */
  name: string;
  status: ChangeSatisfaction;
  objects: ChangeObjectCoverage[];
}

/**
 * Cover each `to`-side change against a semantic diff's per-object delta:
 * which of the objects the change touches are already present and identical
 * on the `from` side. A `satisfied` change deploys nothing new — its ledger
 * entry can be backfilled instead of executing it; an `unsatisfied` change is
 * the genuine delta. Identity keying is shared with the diff itself, so
 * regrouped/renamed/reordered authorship of the same objects covers the same.
 *
 * `diff` must come from diffing the same `from` side against these changes
 * (`diffChangeSets(fromChanges, toChanges)`).
 */
export function coverChanges(
  changes: DiffInputChange[],
  diff: SemanticDiffResult,
  options: { style?: PathStyle } = {}
): ChangeCoverage[] {
  const style = options.style ?? 'directory';
  const deltaByKey = new Map<string, ObjectDelta>();
  for (const obj of diff.objects) {
    deltaByKey.set(identityKey(obj.identity), obj.delta);
  }
  return changes.map(change => {
    const sideWarnings: string[] = [];
    const side = readSide(change.deploy, sideWarnings, change.name);
    const objects: ChangeObjectCoverage[] = side.order.map(key => {
      const unit = side.units.get(key)!;
      return {
        path: pathFor(unit.identity, { style }),
        delta: deltaByKey.get(key) ?? 'unchanged'
      };
    });
    const touched = objects.filter(o => o.delta !== 'unchanged').length;
    const status: ChangeSatisfaction =
      objects.length === 0 ? 'inert'
        : touched === 0 ? 'satisfied'
          : touched === objects.length ? 'unsatisfied'
            : 'partial';
    return { name: change.name, status, objects };
  });
}
