/**
 * Representation-proof normalization of type references and default
 * expressions, so a module authored with SQL spellings (`integer`,
 * `timestamp with time zone`, `DEFAULT 'a'`) compares equal to the catalog
 * rendering pg_dump produces (`int4`, `timestamptz`, `DEFAULT 'a'::app.status`,
 * `nextval('app.s'::regclass)`).
 */

/** SQL-standard spellings → the catalog's internal type name. */
const ALIASES: Record<string, string> = {
  integer: 'int4',
  int: 'int4',
  bigint: 'int8',
  smallint: 'int2',
  boolean: 'bool',
  real: 'float4',
  'double precision': 'float8',
  decimal: 'numeric',
  'character varying': 'varchar',
  character: 'bpchar',
  char: 'bpchar',
  'timestamp with time zone': 'timestamptz',
  'time with time zone': 'timetz',
  'bit varying': 'varbit'
};

interface StringNode { String?: { sval?: string } }
interface TypeNameNode { names?: StringNode[]; [key: string]: unknown }

const sval = (node: StringNode | undefined): string | undefined => node?.String?.sval;

/** Canonical `names` for a TypeName: `pg_catalog` dropped, aliases resolved. */
export function canonicalTypeNames(names: StringNode[]): StringNode[] {
  let list = names;
  if (list.length === 2 && sval(list[0]) === 'pg_catalog') list = [list[1]];
  if (list.length === 1) {
    const name = sval(list[0]);
    if (name && ALIASES[name]) return [{ String: { sval: ALIASES[name] } }];
  }
  return list;
}

/** Stable text for a canonical TypeName (for equality checks). */
export function typeKey(typeName: TypeNameNode | undefined): string {
  if (!typeName) return '';
  const names = canonicalTypeNames(typeName.names ?? []).map(n => sval(n) ?? '').join('.');
  const mods = JSON.stringify(typeName.typmods ?? []);
  return `${names}${typeName.arrayBounds ? '[]' : ''}${mods}`;
}

/** Sequence options whose value equals the catalog default (pg_dump spells them out). */
const SEQUENCE_OPTION_DEFAULTS: Record<string, string> = {
  increment: '{"Integer":{"ival":1}}',
  minvalue: 'undefined',
  maxvalue: 'undefined',
  start: '{"Integer":{"ival":1}}',
  cache: '{"Integer":{"ival":1}}',
  cycle: '{"Boolean":{"boolval":false}}',
  as: '{"TypeName":{"names":[{"String":{"sval":"int8"}}],"typemod":-1}}'
};

/** Whether a CREATE/ALTER SEQUENCE DefElem only restates the default. */
export function isDefaultSequenceOption(defElem: { defname?: string; arg?: unknown }): boolean {
  const name = defElem.defname ?? '';
  const expected = SEQUENCE_OPTION_DEFAULTS[name];
  if (expected === undefined) return false;
  const value = defElem.arg === undefined ? 'undefined' : JSON.stringify(canonicalizeTypes(stripLocations(defElem.arg)));
  return value === expected;
}

const stripLocations = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(stripLocations);
  if (!node || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) if (k !== 'location') out[k] = stripLocations(v);
  return out;
};

/**
 * Deep-canonicalize a parse tree's representation: every TypeName (and
 * `pg_catalog.`-qualified function name) to its catalog spelling, string
 * constants without their implicit `::text`, sequence options without
 * restated defaults, `CREATE MATERIALIZED VIEW` without WITH [NO] DATA.
 * Returns a new tree; the input is not mutated.
 */
export function canonicalizeTypes<T>(node: T): T {
  if (Array.isArray(node)) return node.map(canonicalizeTypes) as unknown as T;
  if (!node || typeof node !== 'object') return node;
  const rec = node as Record<string, unknown>;
  const cast = rec.TypeCast as { arg?: Record<string, unknown>; typeName?: TypeNameNode } | undefined;
  if (cast?.arg?.A_Const && (cast.arg.A_Const as { sval?: unknown }).sval !== undefined && typeKey(cast.typeName) === 'text[]') {
    return canonicalizeTypes(cast.arg) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rec)) {
    if (key === 'skipData') continue;
    if ((key === 'CreateSeqStmt' || key === 'AlterSeqStmt') && value && typeof value === 'object') {
      const seq = value as { options?: { DefElem?: { defname?: string; arg?: unknown } }[] };
      const options = (seq.options ?? []).filter(o => !o.DefElem || !isDefaultSequenceOption(o.DefElem));
      out[key] = canonicalizeTypes({ ...seq, options: options.length > 0 ? options : undefined });
      continue;
    }
    if (key === 'TypeName' && value && typeof value === 'object') {
      const t = value as TypeNameNode;
      out[key] = canonicalizeTypes({ ...t, names: canonicalTypeNames(t.names ?? []) });
    } else if (key === 'typeName' && value && typeof value === 'object' && Array.isArray((value as TypeNameNode).names)) {
      const t = value as TypeNameNode;
      out[key] = canonicalizeTypes({ ...t, names: canonicalTypeNames(t.names ?? []) });
    } else if (key === 'funcname' && Array.isArray(value) && value.length === 2 && sval(value[0]) === 'pg_catalog') {
      out[key] = [value[1]];
    } else if (key === 'SQLValueFunction' && (value as { op?: string })?.op === 'SVFOP_CURRENT_TIMESTAMP'
      && (value as { typmod?: number }).typmod === undefined) {
      // The catalog stores CURRENT_TIMESTAMP as now().
      return { FuncCall: { funcname: [{ String: { sval: 'now' } }], funcformat: 'COERCE_EXPLICIT_CALL' } } as unknown as T;
    } else {
      out[key] = canonicalizeTypes(value);
    }
  }
  return out as T;
}

/**
 * Strip the casts the catalog adds to a column default: a constant cast to
 * the column's own type (`'a'::app.status` on an `app.status` column) and
 * `::regclass` on sequence names (`nextval('app.s'::regclass)`).
 */
export function stripDefaultCasts<T>(expr: T, columnType: TypeNameNode | undefined): T {
  const column = typeKey(columnType);
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const rec = node as Record<string, unknown>;
    const cast = rec.TypeCast as { arg?: unknown; typeName?: TypeNameNode } | undefined;
    if (cast && cast.arg && typeof cast.arg === 'object' && (cast.arg as Record<string, unknown>).A_Const) {
      const target = typeKey(cast.typeName);
      if (target === 'regclass[]' || target === 'regclass' || (column && target === column)) return cast.arg;
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rec)) out[key] = walk(value);
    return out;
  };
  return walk(expr) as T;
}
