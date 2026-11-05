/**
 * In-place ALTERs for non-table objects whose catalog entries have
 * dependents and therefore cannot be dropped and recreated: enum values,
 * domain constraints/defaults/nullability, sequence options and composite
 * type attributes. Each derivation returns the ordered steps with exact
 * inverses, or null when the change is not expressible in place (the caller
 * falls back to replacement, subject to the data-loss policy).
 */
import { cleanTree } from '@pgsql/transform';
import { Deparser } from 'plpgsql-parser';

import { stablePrint } from './annotations';
import { canonicalizeTypes, isDefaultSequenceOption, typeKey } from './type-canon';

type Node = Record<string, unknown>;

export interface AlterStep {
  sql: string;
  inverse: string;
  /** Set when the inverse cannot be derived (names the gap). */
  incomplete?: string;
  /** Set when the step can lose data (names what is lost). */
  destructive?: string;
}

const deparse = (node: Node): string => `${Deparser.deparse(node as any, { pretty: false })};`;
/** Representation-proof key for an expression (casts, type spellings). */
const exprKey = (expr: unknown): string => stablePrint(canonicalizeTypes(cleanTree(expr)));
const svals = (list: { String?: { sval?: string } }[] | undefined): string[] =>
  (list ?? []).map(x => x.String?.sval ?? '');

/** `ALTER TYPE .. ADD VALUE` for appended/inserted enum values; null if any value was removed or reordered. */
export function alterEnum(from: Node, to: Node, label: string): AlterStep[] | null {
  const fromVals = svals(from.vals as { String?: { sval?: string } }[]);
  const toVals = svals(to.vals as { String?: { sval?: string } }[]);
  let cursor = 0;
  for (const v of fromVals) {
    const at = toVals.indexOf(v, cursor);
    if (at < 0) return null;
    cursor = at + 1;
  }
  const steps: AlterStep[] = [];
  toVals.forEach((v, i) => {
    if (fromVals.includes(v)) return;
    const after = i > 0 ? toVals[i - 1] : undefined;
    const before = after === undefined && toVals.length > 1 ? toVals[1] : undefined;
    const node: Node = { AlterEnumStmt: { typeName: to.typeName, newVal: v } };
    if (after !== undefined) Object.assign(node.AlterEnumStmt as Node, { newValNeighbor: after, newValIsAfter: true });
    else if (before !== undefined) Object.assign(node.AlterEnumStmt as Node, { newValNeighbor: before, newValIsAfter: false });
    steps.push({
      sql: deparse(node),
      inverse: `-- pgpm: Postgres cannot drop enum value '${v}' from ${label}`,
      incomplete: `${label}: ALTER TYPE .. ADD VALUE '${v}' has no inverse (Postgres cannot remove enum values); the revert leaves it in place`
    });
  });
  return steps;
}

interface ConstraintLike { contype?: string; conname?: string; raw_expr?: unknown; [k: string]: unknown }

/** ALTER DOMAIN steps; null when the base type or collation changed. */
export function alterDomain(from: Node, to: Node): AlterStep[] | null {
  if (typeKey(from.typeName as any) !== typeKey(to.typeName as any)) return null;
  if (stablePrint(cleanTree(from.collClause)) !== stablePrint(cleanTree(to.collClause))) return null;
  const domainName = svals(to.domainname as { String?: { sval?: string } }[]);
  const shortName = domainName[domainName.length - 1];
  const read = (node: Node): { check: Map<string, ConstraintLike>; notNull: boolean; def?: unknown } => {
    const out = { check: new Map<string, ConstraintLike>(), notNull: false, def: undefined as unknown };
    let n = 0;
    for (const item of (node.constraints as { Constraint?: ConstraintLike }[]) ?? []) {
      const c = item.Constraint;
      if (!c) continue;
      if (c.contype === 'CONSTR_CHECK') {
        n += 1;
        const name = c.conname ?? (n === 1 ? `${shortName}_check` : `${shortName}_check${n}`);
        out.check.set(name, { ...c, conname: name });
      } else if (c.contype === 'CONSTR_NOTNULL') out.notNull = true;
      else if (c.contype === 'CONSTR_DEFAULT') out.def = cleanTree(c.raw_expr);
      else if (c.contype === 'CONSTR_NULL') out.notNull = false;
      else return { check: new Map(), notNull: false, def: Symbol('unsupported') as unknown };
    }
    return out;
  };
  const a = read(from);
  const b = read(to);
  if (typeof a.def === 'symbol' || typeof b.def === 'symbol') return null;
  const alter = (subtype: string, extra: Node = {}): string =>
    deparse({ AlterDomainStmt: { subtype, typeName: to.domainname, behavior: 'DROP_RESTRICT', ...extra } });
  const steps: AlterStep[] = [];
  if (exprKey(a.def) !== exprKey(b.def)) {
    steps.push({
      sql: alter('T', b.def === undefined ? {} : { def: b.def }),
      inverse: alter('T', a.def === undefined ? {} : { def: a.def })
    });
  }
  if (a.notNull !== b.notNull) {
    steps.push({ sql: alter(b.notNull ? 'O' : 'N'), inverse: alter(a.notNull ? 'O' : 'N') });
  }
  for (const [name, c] of a.check) {
    const next = b.check.get(name);
    if (next && exprKey(next.raw_expr) === exprKey(c.raw_expr)) continue;
    steps.push({ sql: alter('X', { name }), inverse: alter('C', { def: { Constraint: cleanTree(c) } }) });
  }
  for (const [name, c] of b.check) {
    const prior = a.check.get(name);
    if (prior && exprKey(prior.raw_expr) === exprKey(c.raw_expr)) continue;
    steps.push({ sql: alter('C', { def: { Constraint: cleanTree(c) } }), inverse: alter('X', { name }) });
  }
  return steps;
}

/** Catalog default for a CREATE SEQUENCE option, as the DefElem that resets it. */
const SEQUENCE_DEFAULTS: Record<string, Node> = {
  as: { DefElem: { defname: 'as', arg: { TypeName: { names: [{ String: { sval: 'int8' } }], typemod: -1 } }, defaction: 'DEFELEM_UNSPEC' } },
  increment: { DefElem: { defname: 'increment', arg: { Integer: { ival: 1 } }, defaction: 'DEFELEM_UNSPEC' } },
  minvalue: { DefElem: { defname: 'minvalue', defaction: 'DEFELEM_UNSPEC' } },
  maxvalue: { DefElem: { defname: 'maxvalue', defaction: 'DEFELEM_UNSPEC' } },
  start: { DefElem: { defname: 'start', arg: { Integer: { ival: 1 } }, defaction: 'DEFELEM_UNSPEC' } },
  cache: { DefElem: { defname: 'cache', arg: { Integer: { ival: 1 } }, defaction: 'DEFELEM_UNSPEC' } },
  cycle: { DefElem: { defname: 'cycle', arg: { Boolean: { boolval: false } }, defaction: 'DEFELEM_UNSPEC' } },
  owned_by: { DefElem: { defname: 'owned_by', arg: { List: { items: [{ String: { sval: 'none' } }] } }, defaction: 'DEFELEM_UNSPEC' } }
};

/** One ALTER SEQUENCE carrying every changed option (removed options reset to their defaults). */
export function alterSequence(from: Node, to: Node): AlterStep[] | null {
  const read = (node: Node): Map<string, Node> => {
    const out = new Map<string, Node>();
    for (const item of (node.options as { DefElem?: Node }[]) ?? []) {
      const d = item.DefElem;
      if (!d || isDefaultSequenceOption(d as { defname?: string; arg?: unknown })) continue;
      out.set(d.defname as string, canonicalizeTypes(cleanTree({ DefElem: d })) as Node);
    }
    return out;
  };
  const a = read(from);
  const b = read(to);
  const forward: Node[] = [];
  const backward: Node[] = [];
  for (const name of new Set([...a.keys(), ...b.keys()])) {
    const prior = a.get(name);
    const next = b.get(name);
    if (stablePrint(prior) === stablePrint(next)) continue;
    const reset = SEQUENCE_DEFAULTS[name];
    if (!reset && (!prior || !next)) return null;
    forward.push(next ?? reset);
    backward.push(prior ?? reset);
  }
  if (forward.length === 0) return [];
  const alter = (options: Node[]): string =>
    deparse({ AlterSeqStmt: { sequence: to.sequence, options } });
  return [{ sql: alter(forward), inverse: alter(backward) }];
}

/** ALTER TYPE .. ADD/DROP/ALTER ATTRIBUTE for composite types; null when attributes were only reordered. */
export function alterComposite(from: Node, to: Node, label: string): AlterStep[] | null {
  const read = (node: Node): Map<string, Node> => {
    const out = new Map<string, Node>();
    for (const item of (node.coldeflist as { ColumnDef?: Node }[]) ?? []) {
      if (item.ColumnDef) out.set(item.ColumnDef.colname as string, canonicalizeTypes(cleanTree(item.ColumnDef)) as Node);
    }
    return out;
  };
  const a = read(from);
  const b = read(to);
  const shared = [...a.keys()].filter(k => b.has(k));
  const orderA = shared.join(',');
  const orderB = [...b.keys()].filter(k => a.has(k)).join(',');
  if (orderA !== orderB) return null;
  const alter = (cmd: Node): string =>
    deparse({ AlterTableStmt: { relation: to.typevar, objtype: 'OBJECT_TYPE', cmds: [{ AlterTableCmd: { behavior: 'DROP_RESTRICT', ...cmd } }] } });
  const steps: AlterStep[] = [];
  for (const [name, def] of a) {
    if (b.has(name)) continue;
    steps.push({
      sql: alter({ subtype: 'AT_DropColumn', name }),
      inverse: alter({ subtype: 'AT_AddColumn', def: { ColumnDef: def } }),
      destructive: `${label}: DROP ATTRIBUTE ${name}`
    });
  }
  for (const [name, def] of b) {
    const prior = a.get(name);
    if (!prior) {
      steps.push({ sql: alter({ subtype: 'AT_AddColumn', def: { ColumnDef: def } }), inverse: alter({ subtype: 'AT_DropColumn', name }) });
    } else if (stablePrint(prior) !== stablePrint(def)) {
      const retype = (d: Node): string =>
        alter({ subtype: 'AT_AlterColumnType', name, def: { ColumnDef: { typeName: d.typeName, collClause: d.collClause } } });
      steps.push({ sql: retype(def), inverse: retype(prior), destructive: `${label}: ALTER ATTRIBUTE ${name} TYPE` });
    }
  }
  return steps;
}

/** Dispatch on the defining statement's node tag; null when not alterable in place. */
export function alterInPlace(fromStmt: Node, toStmt: Node, label: string): AlterStep[] | null {
  if (fromStmt.CreateEnumStmt && toStmt.CreateEnumStmt) {
    return alterEnum(fromStmt.CreateEnumStmt as Node, toStmt.CreateEnumStmt as Node, label);
  }
  if (fromStmt.CreateDomainStmt && toStmt.CreateDomainStmt) {
    return alterDomain(fromStmt.CreateDomainStmt as Node, toStmt.CreateDomainStmt as Node);
  }
  if (fromStmt.CreateSeqStmt && toStmt.CreateSeqStmt) {
    return alterSequence(fromStmt.CreateSeqStmt as Node, toStmt.CreateSeqStmt as Node);
  }
  if (fromStmt.CompositeTypeStmt && toStmt.CompositeTypeStmt) {
    return alterComposite(fromStmt.CompositeTypeStmt as Node, toStmt.CompositeTypeStmt as Node, label);
  }
  return null;
}
