import { ast, nodes } from 'pg-ast';
import { deparseSync } from 'pgsql-deparser';
import type {
  ComparisonFilterOperator,
  DistinctFilterOperator,
  LikeFilterOperator,
  ListFilterOperator,
  PatternFilterOperator
} from 'query-spec';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SqlValue = string | number | boolean | null;

export interface QueryOutput {
  text: string;
  values: SqlValue[];
}

type JoinKind = 'JOIN_INNER' | 'JOIN_LEFT' | 'JOIN_RIGHT' | 'JOIN_FULL';

// An operand in a filter or expression position: a plain value (bound as $n)
// or an explicit expression such as col(), fn(), lit(), param().
export type Operand = SqlValue | Expr;

// Per-field filter conforming to the shared `query-spec` grammar, with
// SQL-layer operands: expressions and subquery QueryBuilders are allowed
// where JSON layers only allow plain values. Operator names come from the
// query-spec operator groups so the grammar can never drift.
export type FieldFilter =
  { isNull?: boolean } &
  { [K in ComparisonFilterOperator]?: Operand | QueryBuilder } &
  { [K in DistinctFilterOperator]?: Operand } &
  { [K in ListFilterOperator]?: Operand[] | QueryBuilder } &
  { [K in LikeFilterOperator]?: Operand } &
  { [K in PatternFilterOperator]?: string };

// Main filter type — nested objects keyed by column name (may be
// schema/alias-qualified, e.g. 'u.status'), with and/or/not combinators.
export type Filter = {
  [field: string]: FieldFilter | Filter[] | Filter | undefined;
} & {
  and?: Filter[];
  or?: Filter[];
  not?: Filter;
};
type SortDir = 'ASC' | 'DESC';
type NullsOrder = 'FIRST' | 'LAST';
type ConflictAction = 'nothing' | 'update';

// A SELECT target: a column name string, or a computed expression with alias.
export interface SelectExpr {
  expr: Expr;
  as?: string;
}
export type SelectItem = string | SelectExpr;

interface OrderBySpec {
  column: string | Expr;
  direction: SortDir;
  nulls?: NullsOrder;
}

interface JoinSpec {
  kind: JoinKind;
  schema?: string;
  table: string;
  alias?: string;
  on: JoinOn | Filter | Expr;
}

interface JoinOn {
  column: string;
  operator: string;
  value: string;
}

type JoinOpts = { schema?: string; alias?: string };

interface CteSpec {
  name: string;
  columns?: string[];
  query: QueryBuilder;
  recursive?: boolean;
  materialized?: 'default' | 'always' | 'never';
}

interface OnConflictSpec {
  columns?: string[];
  constraint?: string;
  action: ConflictAction;
  updateColumns?: Record<string, Operand>;
  where?: Filter;
}

// ---------------------------------------------------------------------------
// AST helpers (thin wrappers for readability)
// ---------------------------------------------------------------------------

function str(s: string) {
  return nodes.string({ sval: s });
}

function colRef(name: string) {
  const parts = name.split('.');
  if (parts.length === 1 && parts[0] === '*') {
    return nodes.columnRef({ fields: [nodes.aStar()] });
  }
  const fields = parts.map((p) =>
    p === '*' ? nodes.aStar() : str(p)
  );
  return nodes.columnRef({ fields });
}

// Wrapped RangeVar — for use in fromClause arrays (SELECT, JOINs)
function wrappedRangeVar(table: string, schema?: string, alias?: string) {
  return nodes.rangeVar({
    schemaname: schema,
    relname: table,
    inh: true,
    alias: alias ? ast.alias({ aliasname: alias }) : undefined,
  });
}

// Unwrapped RangeVar — for use as `relation` in INSERT/UPDATE/DELETE
function unwrappedRangeVar(table: string, schema?: string) {
  return ast.rangeVar({
    schemaname: schema,
    relname: table,
    inh: true,
  });
}

function resTargetCol(name: string) {
  return nodes.resTarget({ name });
}

function resTargetVal(val: unknown, alias?: string) {
  return nodes.resTarget({
    val: val as any,
    name: alias,
  });
}

function paramNode(index: number) {
  return nodes.paramRef({ number: index });
}

function constNode(val: SqlValue) {
  if (val === null) {
    return nodes.aConst({ isnull: true });
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return nodes.aConst({ ival: ast.integer({ ival: val }) });
    }
    return nodes.aConst({ fval: ast.float({ fval: String(val) }) });
  }
  if (typeof val === 'boolean') {
    return nodes.aConst({ boolval: ast.boolean({ boolval: val }) });
  }
  return nodes.aConst({ sval: ast.string({ sval: val }) });
}

function sortByNode(target: unknown, dir: SortDir, nullsOrd?: NullsOrder) {
  const dirMap: Record<SortDir, string> = { ASC: 'SORTBY_ASC', DESC: 'SORTBY_DESC' };
  const nullsMap: Record<string, string> = {
    FIRST: 'SORTBY_NULLS_FIRST',
    LAST: 'SORTBY_NULLS_LAST',
  };
  return nodes.sortBy({
    node: target as any,
    sortby_dir: dirMap[dir] as any,
    sortby_nulls: (nullsOrd ? nullsMap[nullsOrd] : 'SORTBY_NULLS_DEFAULT') as any,
  });
}

function operatorExpr(
  left: unknown,
  op: string,
  right: unknown,
) {
  return nodes.aExpr({
    kind: 'AEXPR_OP',
    name: [str(op)],
    lexpr: left as any,
    rexpr: right as any,
  });
}

function boolAnd(args: unknown[]) {
  if (args.length === 1) return args[0];
  return nodes.boolExpr({ boolop: 'AND_EXPR', args: args as any[] });
}

function funcCallNode(name: string, args: unknown[], schema?: string) {
  const funcname = schema
    ? [str(schema), str(name)]
    : [str(name)];
  return nodes.funcCall({
    funcname,
    args: args as any[],
  });
}

function namedArgNode(name: string, val: unknown) {
  return nodes.namedArgExpr({
    arg: val as any,
    name,
    argnumber: -1,
  });
}

// ---------------------------------------------------------------------------
// Expression system
//
// Function-call arguments and computed SELECT columns are built lazily via
// thunks so that parameter numbering ($1, $2, ...) stays correct regardless of
// where the expression lands in the final statement. An `Expr` is a function
// that, given the builder's parameter allocator, returns a pg-ast node.
// ---------------------------------------------------------------------------

// Allocates a positional parameter ($n) and returns its AST node.
export type ParamAllocator = (value: SqlValue) => unknown;

// A deferred AST node. Produced by `col`, `lit`, `param`, `fn`.
export type Expr = (alloc: ParamAllocator) => unknown;

// A function-call argument: an explicit expression, or a plain value (which is
// auto-parameterized as $n).
export type FnArg = Expr | SqlValue;
export type FnArgs = FnArg[] | Record<string, FnArg>;

function isExpr(x: unknown): x is Expr {
  return typeof x === 'function';
}

function argToNode(arg: FnArg, alloc: ParamAllocator): unknown {
  return isExpr(arg) ? arg(alloc) : alloc(arg);
}

function buildFnArgNodes(args: FnArgs | undefined, alloc: ParamAllocator): unknown[] {
  if (!args) return [];
  if (Array.isArray(args)) {
    return args.map((a) => argToNode(a, alloc));
  }
  return Object.entries(args).map(([name, a]) =>
    namedArgNode(name, argToNode(a, alloc))
  );
}

// Column reference, e.g. `col('s.owner_id')` or `col('name')`.
export function col(name: string): Expr {
  return () => colRef(name);
}

// SQL literal (not a bound parameter), e.g. `lit(null)` -> NULL, `lit(3)` -> 3.
export function lit(value: SqlValue): Expr {
  return () => constNode(value);
}

// Explicitly bound parameter ($n).
export function param(value: SqlValue): Expr {
  return (alloc) => alloc(value);
}

// Function/procedure call as an expression. `name` may be schema-qualified
// ('schema.fn') or the schema passed via opts. Args may be positional (array)
// or named (object); each arg is an Expr or a plain value.
export function fn(name: string, args?: FnArgs, opts?: { schema?: string }): Expr {
  let schema = opts?.schema;
  let fname = name;
  if (!schema && name.includes('.')) {
    const idx = name.lastIndexOf('.');
    schema = name.slice(0, idx);
    fname = name.slice(idx + 1);
  }
  return (alloc) => funcCallNode(fname, buildFnArgNodes(args, alloc), schema);
}

function operandToNode(v: Operand, alloc: ParamAllocator): unknown {
  return isExpr(v) ? v(alloc) : alloc(v);
}

function binOp(op: string): (left: Operand, right: Operand) => Expr {
  return (left, right) => (alloc) =>
    operatorExpr(operandToNode(left, alloc), op, operandToNode(right, alloc));
}

// Comparison expressions, e.g. `eq(col('a'), col('b'))`, `gt(col('n'), 5)`.
export const eq = binOp('=');
export const neq = binOp('<>');
export const lt = binOp('<');
export const lte = binOp('<=');
export const gt = binOp('>');
export const gte = binOp('>=');

// Arithmetic expressions, e.g. `add(col('attempts'), 1)`.
export const add = binOp('+');
export const sub = binOp('-');
export const mul = binOp('*');
export const div = binOp('/');

// Null tests, e.g. `isNull(col('completed_at'))`.
export function isNull(x: Operand): Expr {
  return (alloc) =>
    nodes.nullTest({ arg: operandToNode(x, alloc) as any, nulltesttype: 'IS_NULL' });
}

export function isNotNull(x: Operand): Expr {
  return (alloc) =>
    nodes.nullTest({ arg: operandToNode(x, alloc) as any, nulltesttype: 'IS_NOT_NULL' });
}

// Boolean combinators over expressions.
export function and(...xs: Expr[]): Expr {
  return (alloc) => {
    const args = xs.map((x) => x(alloc));
    return args.length === 1
      ? args[0]
      : nodes.boolExpr({ boolop: 'AND_EXPR', args: args as any[] });
  };
}

export function or(...xs: Expr[]): Expr {
  return (alloc) => {
    const args = xs.map((x) => x(alloc));
    return args.length === 1
      ? args[0]
      : nodes.boolExpr({ boolop: 'OR_EXPR', args: args as any[] });
  };
}

export function not(x: Expr): Expr {
  return (alloc) =>
    nodes.boolExpr({ boolop: 'NOT_EXPR', args: [x(alloc)] as any[] });
}

// ---------------------------------------------------------------------------
// QueryBuilder
// ---------------------------------------------------------------------------

export class QueryBuilder {
  private _schema: string | undefined;
  private _table: string | undefined;
  private _tableAlias: string | undefined;
  private _selectItems: SelectItem[] = [];
  private _distinct: boolean = false;
  private _insertData: Record<string, Operand>[] | undefined;
  private _updateData: Record<string, Operand> | undefined;
  private _isDelete: boolean = false;
  private _wherePredicates: (Filter | Expr)[] = [];
  private _joins: JoinSpec[] = [];
  private _groupByColumns: (string | Expr)[] = [];
  private _havingPredicates: (Filter | Expr)[] = [];
  private _orderBySpecs: OrderBySpec[] = [];
  private _fromFunction: { name: string; args?: FnArgs; schema?: string; as?: string } | undefined;
  private _limitValue: number | undefined;
  private _offsetValue: number | undefined;
  private _returning: SelectItem[] | undefined;
  private _ctes: CteSpec[] = [];
  private _onConflict: OnConflictSpec | undefined;
  private _funcCall: { name: string; args?: FnArgs; schema?: string; as?: string } | undefined;

  // -------------------------------------------------------------------------
  // Schema / Table
  // -------------------------------------------------------------------------

  schema(name: string): this {
    this._schema = name;
    return this;
  }

  table(name: string, alias?: string): this {
    this._table = name;
    this._tableAlias = alias;
    return this;
  }

  // -------------------------------------------------------------------------
  // SELECT
  // -------------------------------------------------------------------------

  select(columns: SelectItem[] = ['*']): this {
    this._selectItems = columns;
    return this;
  }

  // Append a computed function-call column, e.g.
  // .selectCall('decrypted_value', 'priv.secrets_get', { secret_name: col('s.name') })
  selectCall(as: string, name: string, args?: FnArgs, opts?: { schema?: string }): this {
    this._selectItems.push({ expr: fn(name, args, opts), as });
    return this;
  }

  // Append an arbitrary computed column expression with an alias.
  selectExpr(as: string, expr: Expr): this {
    this._selectItems.push({ expr, as });
    return this;
  }

  distinct(): this {
    this._distinct = true;
    return this;
  }

  // -------------------------------------------------------------------------
  // INSERT
  // -------------------------------------------------------------------------

  insert(data: Record<string, Operand> | Record<string, Operand>[]): this {
    this._insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  onConflict(spec: OnConflictSpec): this {
    this._onConflict = spec;
    return this;
  }

  // -------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------

  update(data: Record<string, Operand>): this {
    this._updateData = data;
    return this;
  }

  // -------------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------------

  delete(): this {
    this._isDelete = true;
    return this;
  }

  // -------------------------------------------------------------------------
  // WHERE
  // -------------------------------------------------------------------------

  // SDK-style JSON filter or boolean expression, e.g.
  // .where({ status: { in: ['queued', 'retry'] }, completed_at: { isNull: true } })
  // .where(eq(col('a'), col('b')))
  // Multiple predicates and where() calls AND-merge.
  where(...predicates: (Filter | Expr)[]): this {
    this._wherePredicates.push(...predicates);
    return this;
  }

  // -------------------------------------------------------------------------
  // JOIN
  // -------------------------------------------------------------------------

  // ON condition: either the classic 4-arg column form
  //   .join('INNER', 't', 'a.id', '=', 't.a_id')
  // or a Filter / expression
  //   .join('INNER', 't', and(eq(col('a.id'), col('t.a_id')), eq(col('t.kind'), 'x')))
  join(kind: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL', table: string, on: Filter | Expr, opts?: JoinOpts): this;
  join(kind: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL', table: string, onColumn: string, operator: string, onValue: string, opts?: JoinOpts): this;
  join(
    kind: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL',
    table: string,
    onOrColumn: Filter | Expr | string,
    operatorOrOpts?: string | JoinOpts,
    onValue?: string,
    maybeOpts?: JoinOpts,
  ): this {
    const joinKind = `JOIN_${kind}` as JoinKind;
    const isColumnForm = typeof onOrColumn === 'string';
    const opts = (isColumnForm ? maybeOpts : operatorOrOpts as JoinOpts | undefined);
    const on: JoinOn | Filter | Expr = isColumnForm
      ? { column: onOrColumn, operator: operatorOrOpts as string, value: onValue! }
      : onOrColumn;
    this._joins.push({
      kind: joinKind,
      schema: opts?.schema,
      table,
      alias: opts?.alias,
      on,
    });
    return this;
  }

  innerJoin(table: string, on: Filter | Expr, opts?: JoinOpts): this;
  innerJoin(table: string, onCol: string, op: string, onVal: string, opts?: JoinOpts): this;
  innerJoin(table: string, a: any, b?: any, c?: any, d?: any): this {
    return this.join('INNER', table, a, b, c, d);
  }

  leftJoin(table: string, on: Filter | Expr, opts?: JoinOpts): this;
  leftJoin(table: string, onCol: string, op: string, onVal: string, opts?: JoinOpts): this;
  leftJoin(table: string, a: any, b?: any, c?: any, d?: any): this {
    return this.join('LEFT', table, a, b, c, d);
  }

  rightJoin(table: string, on: Filter | Expr, opts?: JoinOpts): this;
  rightJoin(table: string, onCol: string, op: string, onVal: string, opts?: JoinOpts): this;
  rightJoin(table: string, a: any, b?: any, c?: any, d?: any): this {
    return this.join('RIGHT', table, a, b, c, d);
  }

  fullJoin(table: string, on: Filter | Expr, opts?: JoinOpts): this;
  fullJoin(table: string, onCol: string, op: string, onVal: string, opts?: JoinOpts): this;
  fullJoin(table: string, a: any, b?: any, c?: any, d?: any): this {
    return this.join('FULL', table, a, b, c, d);
  }

  // -------------------------------------------------------------------------
  // GROUP BY / HAVING
  // -------------------------------------------------------------------------

  groupBy(columns: (string | Expr)[]): this {
    this._groupByColumns.push(...columns);
    return this;
  }

  having(...predicates: (Filter | Expr)[]): this {
    this._havingPredicates.push(...predicates);
    return this;
  }

  // -------------------------------------------------------------------------
  // ORDER BY / LIMIT / OFFSET
  // -------------------------------------------------------------------------

  orderBy(column: string | Expr, direction: SortDir = 'ASC', nulls?: NullsOrder): this {
    this._orderBySpecs.push({ column, direction, nulls });
    return this;
  }

  limit(n: number): this {
    this._limitValue = n;
    return this;
  }

  offset(n: number): this {
    this._offsetValue = n;
    return this;
  }

  // -------------------------------------------------------------------------
  // RETURNING
  // -------------------------------------------------------------------------

  returning(columns: SelectItem[] = ['*']): this {
    this._returning = columns;
    return this;
  }

  // -------------------------------------------------------------------------
  // CTEs (WITH)
  // -------------------------------------------------------------------------

  with(name: string, query: QueryBuilder, opts?: { columns?: string[]; materialized?: 'default' | 'always' | 'never' }): this {
    this._ctes.push({ name, query, columns: opts?.columns, materialized: opts?.materialized });
    return this;
  }

  withRecursive(name: string, query: QueryBuilder, opts?: { columns?: string[]; materialized?: 'default' | 'always' | 'never' }): this {
    this._ctes.push({ name, query, columns: opts?.columns, recursive: true, materialized: opts?.materialized });
    return this;
  }

  // -------------------------------------------------------------------------
  // Function / Procedure call
  // -------------------------------------------------------------------------

  call(name: string, args?: FnArgs, opts?: { schema?: string; as?: string }): this {
    this._funcCall = { name, args, schema: opts?.schema ?? this._schema, as: opts?.as };
    return this;
  }

  // Set-returning function as the FROM source, with an optional range alias:
  //   .select(['r.id']).fromFunction('get_rows', [7], { as: 'r' })
  //   -> SELECT r.id FROM get_rows($1) AS r
  fromFunction(name: string, args?: FnArgs, opts?: { schema?: string; as?: string }): this {
    this._fromFunction = { name, args, schema: opts?.schema ?? this._schema, as: opts?.as };
    return this;
  }

  // Deep-enough copy for safe composition: cloning then chaining never
  // mutates the original builder. Referenced sub-builders (CTEs, subquery
  // operands) are shared — building never mutates their configured state.
  clone(): QueryBuilder {
    const c = new QueryBuilder();
    c._schema = this._schema;
    c._table = this._table;
    c._tableAlias = this._tableAlias;
    c._selectItems = this._selectItems.map((i) => (typeof i === 'string' ? i : { ...i }));
    c._distinct = this._distinct;
    c._insertData = this._insertData?.map((row) => ({ ...row }));
    c._updateData = this._updateData ? { ...this._updateData } : undefined;
    c._isDelete = this._isDelete;
    c._wherePredicates = [...this._wherePredicates];
    c._joins = this._joins.map((j) => ({ ...j }));
    c._groupByColumns = [...this._groupByColumns];
    c._havingPredicates = [...this._havingPredicates];
    c._orderBySpecs = this._orderBySpecs.map((s) => ({ ...s }));
    c._limitValue = this._limitValue;
    c._offsetValue = this._offsetValue;
    c._returning = this._returning
      ? this._returning.map((i) => (typeof i === 'string' ? i : { ...i }))
      : undefined;
    c._ctes = this._ctes.map((cte) => ({ ...cte }));
    c._onConflict = this._onConflict
      ? {
        ...this._onConflict,
        columns: this._onConflict.columns ? [...this._onConflict.columns] : undefined,
        updateColumns: this._onConflict.updateColumns ? { ...this._onConflict.updateColumns } : undefined,
      }
      : undefined;
    c._funcCall = this._funcCall ? { ...this._funcCall } : undefined;
    c._fromFunction = this._fromFunction ? { ...this._fromFunction } : undefined;
    return c;
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  build(): QueryOutput {
    if (this._funcCall) {
      return this._buildFuncCall();
    }
    if (!this._table && this._fromFunction) {
      return this._buildSelect();
    }
    if (!this._table) {
      throw new Error('Table name is not specified.');
    }
    if (this._insertData) {
      return this._buildInsert();
    }
    if (this._updateData) {
      return this._buildUpdate();
    }
    if (this._isDelete) {
      return this._buildDelete();
    }
    return this._buildSelect();
  }

  toSQL(): string {
    return this.build().text;
  }

  // -------------------------------------------------------------------------
  // Internal: parameter tracking
  // -------------------------------------------------------------------------

  private _paramValues: SqlValue[] = [];
  private _paramIndex: number = 0;

  private _resetParams(): void {
    this._paramValues = [];
    this._paramIndex = 0;
  }

  private _addParam(value: SqlValue): unknown {
    this._paramIndex++;
    this._paramValues.push(value);
    return paramNode(this._paramIndex);
  }

  private get _alloc(): ParamAllocator {
    return (value: SqlValue) => this._addParam(value);
  }

  private _buildTargetList(items: SelectItem[]): unknown[] {
    const alloc = this._alloc;
    return items.map((item) => {
      if (typeof item === 'string') {
        return item === '*'
          ? resTargetVal(colRef('*'))
          : resTargetVal(colRef(item));
      }
      return resTargetVal(item.expr(alloc), item.as);
    });
  }

  // -------------------------------------------------------------------------
  // Internal: filter compiler (SDK-style JSON filter -> AST)
  // -------------------------------------------------------------------------

  private _buildPredicates(predicates: (Filter | Expr)[]): unknown | undefined {
    if (predicates.length === 0) return undefined;
    const exprs = predicates.map((p) =>
      isExpr(p) ? p(this._alloc) : this._filterToNode(p)
    );
    return boolAnd(exprs);
  }

  private _filterToNode(filter: Filter): unknown {
    const parts: unknown[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined) continue;

      if (key === 'and') {
        for (const f of value as Filter[]) {
          parts.push(this._filterToNode(f));
        }
        continue;
      }
      if (key === 'or') {
        const args = (value as Filter[]).map((f) => this._filterToNode(f));
        parts.push(
          args.length === 1
            ? args[0]
            : nodes.boolExpr({ boolop: 'OR_EXPR', args: args as any[] })
        );
        continue;
      }
      if (key === 'not') {
        parts.push(
          nodes.boolExpr({
            boolop: 'NOT_EXPR',
            args: [this._filterToNode(value as Filter)] as any[],
          })
        );
        continue;
      }

      const fieldFilter = value as FieldFilter;
      for (const [op, operand] of Object.entries(fieldFilter)) {
        if (operand === undefined) continue;
        parts.push(this._fieldOpToNode(key, op, operand));
      }
    }

    if (parts.length === 0) {
      throw new Error('Empty filter object.');
    }
    return boolAnd(parts);
  }

  private static readonly _comparisonOps: Record<string, string> = {
    equalTo: '=',
    notEqualTo: '<>',
    lessThan: '<',
    lessThanOrEqualTo: '<=',
    greaterThan: '>',
    greaterThanOrEqualTo: '>=',
  };

  private static readonly _likeOps: Record<string, { kind: string; name: string }> = {
    like: { kind: 'AEXPR_LIKE', name: '~~' },
    notLike: { kind: 'AEXPR_LIKE', name: '!~~' },
    likeInsensitive: { kind: 'AEXPR_ILIKE', name: '~~*' },
    notLikeInsensitive: { kind: 'AEXPR_ILIKE', name: '!~~*' },
  };

  // Pattern-building LIKE sugar: op -> [base like op, pattern template]
  private static readonly _patternOps: Record<string, { like: string; pattern: (v: string) => string }> = {
    includes: { like: 'like', pattern: (v) => `%${v}%` },
    notIncludes: { like: 'notLike', pattern: (v) => `%${v}%` },
    includesInsensitive: { like: 'likeInsensitive', pattern: (v) => `%${v}%` },
    notIncludesInsensitive: { like: 'notLikeInsensitive', pattern: (v) => `%${v}%` },
    startsWith: { like: 'like', pattern: (v) => `${v}%` },
    notStartsWith: { like: 'notLike', pattern: (v) => `${v}%` },
    startsWithInsensitive: { like: 'likeInsensitive', pattern: (v) => `${v}%` },
    notStartsWithInsensitive: { like: 'notLikeInsensitive', pattern: (v) => `${v}%` },
    endsWith: { like: 'like', pattern: (v) => `%${v}` },
    notEndsWith: { like: 'notLike', pattern: (v) => `%${v}` },
    endsWithInsensitive: { like: 'likeInsensitive', pattern: (v) => `%${v}` },
    notEndsWithInsensitive: { like: 'notLikeInsensitive', pattern: (v) => `%${v}` },
  };

  private _subqueryNode(sub: QueryBuilder, subLinkType: string, testexpr?: unknown, operName?: unknown[]) {
    const subOutput = sub._buildSelectInternal(this._paramIndex);
    this._paramIndex = sub._paramIndex;
    this._paramValues.push(...sub._paramValues);
    return nodes.subLink({
      subLinkType: subLinkType as any,
      testexpr: testexpr as any,
      operName: operName as any[],
      subselect: subOutput as any,
    });
  }

  private _fieldOpToNode(column: string, op: string, operand: unknown): unknown {
    const left = colRef(column);

    if (op === 'isNull') {
      return nodes.nullTest({
        arg: left as any,
        nulltesttype: operand === false ? 'IS_NOT_NULL' : 'IS_NULL',
      });
    }

    const cmp = QueryBuilder._comparisonOps[op];
    if (cmp) {
      if (operand instanceof QueryBuilder) {
        return operatorExpr(left, cmp, this._subqueryNode(operand, 'EXPR_SUBLINK'));
      }
      return operatorExpr(left, cmp, operandToNode(operand as Operand, this._alloc));
    }

    if (op === 'distinctFrom' || op === 'notDistinctFrom') {
      return nodes.aExpr({
        kind: op === 'distinctFrom' ? 'AEXPR_DISTINCT' : 'AEXPR_NOT_DISTINCT',
        name: [str('=')],
        lexpr: left as any,
        rexpr: operandToNode(operand as Operand, this._alloc) as any,
      });
    }

    if (op === 'in' || op === 'notIn') {
      if (operand instanceof QueryBuilder) {
        const sub = this._subqueryNode(operand, 'ANY_SUBLINK', left);
        return op === 'in'
          ? sub
          : nodes.boolExpr({ boolop: 'NOT_EXPR', args: [sub] as any[] });
      }
      const values = operand as Operand[];
      if (values.length === 0) {
        throw new Error(`Empty array for "${op}" filter on "${column}".`);
      }
      const items = values.map((v) => operandToNode(v, this._alloc));
      const list = nodes.list({ items: items as any[] });
      return nodes.aExpr({
        kind: 'AEXPR_IN',
        name: [str(op === 'in' ? '=' : '<>')],
        lexpr: left as any,
        rexpr: list as any,
      });
    }

    const like = QueryBuilder._likeOps[op];
    if (like) {
      return nodes.aExpr({
        kind: like.kind as any,
        name: [str(like.name)],
        lexpr: left as any,
        rexpr: operandToNode(operand as Operand, this._alloc) as any,
      });
    }

    const pattern = QueryBuilder._patternOps[op];
    if (pattern) {
      if (typeof operand !== 'string') {
        throw new Error(`Operator "${op}" on "${column}" requires a string value.`);
      }
      return this._fieldOpToNode(column, pattern.like, pattern.pattern(operand));
    }

    throw new Error(`Unsupported filter operator "${op}" on "${column}".`);
  }

  // -------------------------------------------------------------------------
  // Internal: RETURNING list (no aliases to get clean output)
  // -------------------------------------------------------------------------

  private _buildReturningList(): unknown[] | undefined {
    if (!this._returning) return undefined;
    const alloc = this._alloc;
    return this._returning.map((item) => {
      if (typeof item === 'string') {
        return resTargetVal(colRef(item));
      }
      return resTargetVal(item.expr(alloc), item.as);
    });
  }

  // -------------------------------------------------------------------------
  // Internal: WITH clause (returns unwrapped WithClause)
  // -------------------------------------------------------------------------

  private _buildWithClause(): any | undefined {
    if (this._ctes.length === 0) return undefined;

    const hasRecursive = this._ctes.some((c) => c.recursive);

    const cteNodes = this._ctes.map((cte) => {
      const subAst = cte.query._buildSelectInternal(this._paramIndex);
      this._paramIndex = cte.query._paramIndex;
      this._paramValues.push(...cte.query._paramValues);

      const matMap: Record<string, string> = {
        default: 'CTEMaterializeDefault',
        always: 'CTEMaterializeAlways',
        never: 'CTEMaterializeNever',
      };

      return nodes.commonTableExpr({
        ctename: cte.name,
        aliascolnames: cte.columns?.map((c) => str(c)),
        ctematerialized: (matMap[cte.materialized ?? 'default'] ?? 'CTEMaterializeDefault') as any,
        ctequery: subAst as any,
      });
    });

    // Return unwrapped for direct assignment to statement node fields
    return ast.withClause({
      ctes: cteNodes as any[],
      recursive: hasRecursive,
    });
  }

  // -------------------------------------------------------------------------
  // Internal: FROM clause with JOINs (wrapped nodes for fromClause arrays)
  // -------------------------------------------------------------------------

  private _joinQuals(on: JoinOn | Filter | Expr): unknown {
    if (isExpr(on)) {
      return on(this._alloc);
    }
    if (typeof (on as JoinOn).column === 'string' && typeof (on as JoinOn).operator === 'string') {
      const j = on as JoinOn;
      return operatorExpr(colRef(j.column), j.operator, colRef(j.value));
    }
    return this._filterToNode(on as Filter);
  }

  private _buildFromClause(): unknown[] {
    const base = this._fromFunction
      ? this._rangeFunctionNode(this._fromFunction)
      : wrappedRangeVar(this._table!, this._schema, this._tableAlias);

    if (this._joins.length === 0) {
      return [base];
    }

    let result: unknown = base;
    for (const j of this._joins) {
      const rightTable = wrappedRangeVar(j.table, j.schema, j.alias);
      result = nodes.joinExpr({
        jointype: j.kind as any,
        larg: result as any,
        rarg: rightTable as any,
        quals: this._joinQuals(j.on) as any,
      });
    }

    return [result];
  }

  private _rangeFunctionNode(spec: { name: string; args?: FnArgs; schema?: string; as?: string }): unknown {
    const funcNode = funcCallNode(spec.name, buildFnArgNodes(spec.args, this._alloc), spec.schema);
    return nodes.rangeFunction({
      functions: [nodes.list({ items: [funcNode] as any[] })] as any[],
      lateral: false,
      ordinality: false,
      is_rowsfrom: false,
      alias: spec.as ? ast.alias({ aliasname: spec.as }) : undefined,
    });
  }

  // -------------------------------------------------------------------------
  // Internal: SELECT builder (also used by CTE inlining)
  // -------------------------------------------------------------------------

  private _buildSelectInternal(startParamIndex: number = 0): unknown {
    this._paramIndex = startParamIndex;

    const targetList = this._buildTargetList(
      this._selectItems.length > 0 ? this._selectItems : ['*']
    );

    const whereClause = this._buildPredicates(this._wherePredicates);
    const havingClause = this._buildPredicates(this._havingPredicates);

    const groupClause = this._groupByColumns.length > 0
      ? this._groupByColumns.map((g) => (isExpr(g) ? g(this._alloc) : colRef(g)))
      : undefined;

    const sortClause = this._orderBySpecs.length > 0
      ? this._orderBySpecs.map((s) =>
        sortByNode(isExpr(s.column) ? s.column(this._alloc) : colRef(s.column), s.direction, s.nulls)
      )
      : undefined;

    const limitCount = this._limitValue !== undefined
      ? constNode(this._limitValue)
      : undefined;

    const limitOffset = this._offsetValue !== undefined
      ? constNode(this._offsetValue)
      : undefined;

    return nodes.selectStmt({
      distinctClause: this._distinct ? [] : undefined,
      targetList: targetList as any[],
      fromClause: this._buildFromClause() as any[],
      whereClause: whereClause as any,
      groupClause: groupClause as any[],
      havingClause: havingClause as any,
      sortClause: sortClause as any[],
      limitCount: limitCount as any,
      limitOffset: limitOffset as any,
      limitOption: limitCount ? 'LIMIT_OPTION_COUNT' as any : undefined,
      op: 'SETOP_NONE' as any,
    });
  }

  private _buildSelect(): QueryOutput {
    this._resetParams();

    const withClause = this._buildWithClause();
    const selectNode = this._buildSelectInternal(this._paramIndex);

    if (withClause) {
      (selectNode as any).SelectStmt.withClause = withClause;
    }

    const text = deparseSync(selectNode as any);
    return { text, values: this._paramValues };
  }

  // -------------------------------------------------------------------------
  // Internal: INSERT builder
  // -------------------------------------------------------------------------

  private _buildInsert(): QueryOutput {
    this._resetParams();

    const withClause = this._buildWithClause();
    const rows = this._insertData!;
    const columns = Object.keys(rows[0]);

    const cols = columns.map((c) => resTargetCol(c));

    const valuesLists = rows.map((row) => {
      const items = columns.map((c) => operandToNode(row[c], this._alloc));
      return nodes.list({ items: items as any[] });
    });

    const selectStmt = nodes.selectStmt({
      valuesLists: valuesLists as any[],
      op: 'SETOP_NONE' as any,
      limitOption: 'LIMIT_OPTION_DEFAULT' as any,
    });

    const insertNode = nodes.insertStmt({
      relation: unwrappedRangeVar(this._table!, this._schema) as any,
      cols: cols as any[],
      selectStmt: selectStmt as any,
      returningList: this._buildReturningList() as any[],
      onConflictClause: this._buildOnConflictClause() as any,
      override: 'OVERRIDING_NOT_SET' as any,
    });

    if (withClause) {
      (insertNode as any).InsertStmt.withClause = withClause;
    }

    const text = deparseSync(insertNode as any);
    return { text, values: this._paramValues };
  }

  // -------------------------------------------------------------------------
  // Internal: ON CONFLICT builder (returns unwrapped OnConflictClause)
  // -------------------------------------------------------------------------

  private _buildOnConflictClause(): unknown | undefined {
    if (!this._onConflict) return undefined;

    const spec = this._onConflict;

    const infer = spec.columns
      ? ast.inferClause({
        indexElems: spec.columns.map((c) =>
          nodes.indexElem({ name: c } as any)
        ) as any[],
        conname: spec.constraint,
      })
      : spec.constraint
        ? ast.inferClause({ conname: spec.constraint })
        : undefined;

    let targetList: unknown[] | undefined;
    let whereNode: unknown | undefined;

    if (spec.action === 'update' && spec.updateColumns) {
      targetList = Object.entries(spec.updateColumns).map(([col, val]) =>
        nodes.resTarget({
          name: col,
          val: operandToNode(val, this._alloc) as any,
        })
      );

      if (spec.where) {
        whereNode = this._filterToNode(spec.where);
      }
    }

    return ast.onConflictClause({
      action: spec.action === 'nothing' ? 'ONCONFLICT_NOTHING' as any : 'ONCONFLICT_UPDATE' as any,
      infer: infer as any,
      targetList: targetList as any[],
      whereClause: whereNode as any,
    });
  }

  // -------------------------------------------------------------------------
  // Internal: UPDATE builder
  // -------------------------------------------------------------------------

  private _buildUpdate(): QueryOutput {
    this._resetParams();

    const withClause = this._buildWithClause();
    const data = this._updateData!;

    const targetList = Object.entries(data).map(([col, val]) =>
      nodes.resTarget({
        name: col,
        val: operandToNode(val, this._alloc) as any,
      })
    );

    const whereClause = this._buildPredicates(this._wherePredicates);

    const updateNode = nodes.updateStmt({
      relation: unwrappedRangeVar(this._table!, this._schema) as any,
      targetList: targetList as any[],
      whereClause: whereClause as any,
      returningList: this._buildReturningList() as any[],
    });

    if (withClause) {
      (updateNode as any).UpdateStmt.withClause = withClause;
    }

    const text = deparseSync(updateNode as any);
    return { text, values: this._paramValues };
  }

  // -------------------------------------------------------------------------
  // Internal: DELETE builder
  // -------------------------------------------------------------------------

  private _buildDelete(): QueryOutput {
    this._resetParams();

    const withClause = this._buildWithClause();
    const whereClause = this._buildPredicates(this._wherePredicates);

    const deleteNode = nodes.deleteStmt({
      relation: unwrappedRangeVar(this._table!, this._schema) as any,
      whereClause: whereClause as any,
      returningList: this._buildReturningList() as any[],
    });

    if (withClause) {
      (deleteNode as any).DeleteStmt.withClause = withClause;
    }

    const text = deparseSync(deleteNode as any);
    return { text, values: this._paramValues };
  }

  // -------------------------------------------------------------------------
  // Internal: Function call builder
  // -------------------------------------------------------------------------

  private _buildFuncCall(): QueryOutput {
    this._resetParams();

    const fc = this._funcCall!;
    const funcArgs = buildFnArgNodes(fc.args, this._alloc);

    const funcNode = funcCallNode(fc.name, funcArgs, fc.schema);

    if (this._selectItems.length > 0) {
      const targetList = this._buildTargetList(this._selectItems);

      const rangeFunc = nodes.rangeFunction({
        functions: [nodes.list({ items: [funcNode] as any[] })] as any[],
        lateral: false,
        ordinality: false,
        is_rowsfrom: false,
      });

      const selectNode = nodes.selectStmt({
        targetList: targetList as any[],
        fromClause: [rangeFunc] as any[],
        op: 'SETOP_NONE' as any,
      });

      const text = deparseSync(selectNode as any);
      return { text, values: this._paramValues };
    }

    const targetList = [resTargetVal(funcNode, fc.as)];

    const selectNode = nodes.selectStmt({
      targetList: targetList as any[],
      op: 'SETOP_NONE' as any,
    });

    const text = deparseSync(selectNode as any);
    return { text, values: this._paramValues };
  }
}
