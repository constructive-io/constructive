import { ast, nodes } from 'pg-ast';
import { deparseSync } from 'pgsql-deparser';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SqlValue = string | number | boolean | null;

export interface QueryOutput {
  text: string;
  values: SqlValue[];
}

type JoinKind = 'JOIN_INNER' | 'JOIN_LEFT' | 'JOIN_RIGHT' | 'JOIN_FULL';
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
  column: string;
  direction: SortDir;
  nulls?: NullsOrder;
}

interface JoinSpec {
  kind: JoinKind;
  schema?: string;
  table: string;
  alias?: string;
  on: WhereCondition;
}

interface WhereCondition {
  column: string;
  operator: string;
  value: SqlValue | SqlValue[] | QueryBuilder;
}

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
  updateColumns?: Record<string, SqlValue>;
  where?: WhereCondition;
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

function sortByNode(col: string, dir: SortDir, nullsOrd?: NullsOrder) {
  const dirMap: Record<SortDir, string> = { ASC: 'SORTBY_ASC', DESC: 'SORTBY_DESC' };
  const nullsMap: Record<string, string> = {
    FIRST: 'SORTBY_NULLS_FIRST',
    LAST: 'SORTBY_NULLS_LAST',
  };
  return nodes.sortBy({
    node: colRef(col),
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

function inExpr(left: unknown, list: unknown) {
  return nodes.aExpr({
    kind: 'AEXPR_IN',
    name: [str('=')],
    lexpr: left as any,
    rexpr: list as any,
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

// ---------------------------------------------------------------------------
// QueryBuilder
// ---------------------------------------------------------------------------

export class QueryBuilder {
  private _schema: string | undefined;
  private _table: string | undefined;
  private _tableAlias: string | undefined;
  private _selectItems: SelectItem[] = [];
  private _distinct: boolean = false;
  private _insertData: Record<string, SqlValue>[] | undefined;
  private _updateData: Record<string, SqlValue> | undefined;
  private _isDelete: boolean = false;
  private _whereConditions: WhereCondition[] = [];
  private _joins: JoinSpec[] = [];
  private _groupByColumns: string[] = [];
  private _havingConditions: WhereCondition[] = [];
  private _orderBySpecs: OrderBySpec[] = [];
  private _limitValue: number | undefined;
  private _offsetValue: number | undefined;
  private _returning: string[] | undefined;
  private _ctes: CteSpec[] = [];
  private _onConflict: OnConflictSpec | undefined;
  private _funcCall: { name: string; args?: FnArgs; schema?: string } | undefined;

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

  insert(data: Record<string, SqlValue> | Record<string, SqlValue>[]): this {
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

  update(data: Record<string, SqlValue>): this {
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

  where(column: string, operator: string, value: SqlValue | SqlValue[] | QueryBuilder): this {
    this._whereConditions.push({ column, operator, value });
    return this;
  }

  // -------------------------------------------------------------------------
  // JOIN
  // -------------------------------------------------------------------------

  join(
    kind: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL',
    table: string,
    onColumn: string,
    operator: string,
    onValue: string,
    opts?: { schema?: string; alias?: string },
  ): this {
    const joinKind = `JOIN_${kind}` as JoinKind;
    this._joins.push({
      kind: joinKind,
      schema: opts?.schema,
      table,
      alias: opts?.alias,
      on: { column: onColumn, operator, value: onValue },
    });
    return this;
  }

  innerJoin(table: string, onCol: string, op: string, onVal: string, opts?: { schema?: string; alias?: string }): this {
    return this.join('INNER', table, onCol, op, onVal, opts);
  }

  leftJoin(table: string, onCol: string, op: string, onVal: string, opts?: { schema?: string; alias?: string }): this {
    return this.join('LEFT', table, onCol, op, onVal, opts);
  }

  rightJoin(table: string, onCol: string, op: string, onVal: string, opts?: { schema?: string; alias?: string }): this {
    return this.join('RIGHT', table, onCol, op, onVal, opts);
  }

  fullJoin(table: string, onCol: string, op: string, onVal: string, opts?: { schema?: string; alias?: string }): this {
    return this.join('FULL', table, onCol, op, onVal, opts);
  }

  // -------------------------------------------------------------------------
  // GROUP BY / HAVING
  // -------------------------------------------------------------------------

  groupBy(columns: string[]): this {
    this._groupByColumns.push(...columns);
    return this;
  }

  having(column: string, operator: string, value: SqlValue): this {
    this._havingConditions.push({ column, operator, value });
    return this;
  }

  // -------------------------------------------------------------------------
  // ORDER BY / LIMIT / OFFSET
  // -------------------------------------------------------------------------

  orderBy(column: string, direction: SortDir = 'ASC', nulls?: NullsOrder): this {
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

  returning(columns: string[] = ['*']): this {
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

  call(name: string, args?: FnArgs, opts?: { schema?: string }): this {
    this._funcCall = { name, args, schema: opts?.schema ?? this._schema };
    return this;
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  build(): QueryOutput {
    if (this._funcCall) {
      return this._buildFuncCall();
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
  // Internal: WHERE clause builder
  // -------------------------------------------------------------------------

  private _buildWhereNode(conditions: WhereCondition[]): unknown | undefined {
    if (conditions.length === 0) return undefined;

    const exprs = conditions.map((cond) => {
      const left = colRef(cond.column);

      // Handle IN operator with array values
      if (cond.operator.toUpperCase() === 'IN' && Array.isArray(cond.value)) {
        const items = (cond.value as SqlValue[]).map((v) => this._addParam(v));
        return inExpr(left, nodes.list({ items: items as any[] }));
      }

      // Handle IS NULL / IS NOT NULL
      if (cond.operator.toUpperCase() === 'IS' && cond.value === null) {
        return nodes.nullTest({
          arg: left as any,
          nulltesttype: 'IS_NULL',
        });
      }
      if (cond.operator.toUpperCase() === 'IS NOT' && cond.value === null) {
        return nodes.nullTest({
          arg: left as any,
          nulltesttype: 'IS_NOT_NULL',
        });
      }

      // Handle subquery values
      if (cond.value instanceof QueryBuilder) {
        const sub = cond.value;
        const subOutput = sub._buildSelectInternal(this._paramIndex);
        this._paramIndex = sub._paramIndex;
        this._paramValues.push(...sub._paramValues);
        const right = nodes.subLink({
          subLinkType: 'EXPR_SUBLINK',
          subselect: subOutput as any,
        });
        return operatorExpr(left, cond.operator, right);
      }

      // Standard operator
      const right = this._addParam(cond.value as SqlValue);
      return operatorExpr(left, cond.operator, right);
    });

    return boolAnd(exprs);
  }

  // -------------------------------------------------------------------------
  // Internal: RETURNING list (no aliases to get clean output)
  // -------------------------------------------------------------------------

  private _buildReturningList(): unknown[] | undefined {
    if (!this._returning) return undefined;
    return this._returning.map((col) =>
      resTargetVal(colRef(col))
    );
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

  private _buildFromClause(): unknown[] {
    const baseTable = wrappedRangeVar(this._table!, this._schema, this._tableAlias);

    if (this._joins.length === 0) {
      return [baseTable];
    }

    let result: unknown = baseTable;
    for (const j of this._joins) {
      const rightTable = wrappedRangeVar(j.table, j.schema, j.alias);

      const onLeft = colRef(j.on.column);
      const onRight = colRef(j.on.value as string);
      const quals = operatorExpr(onLeft, j.on.operator, onRight);

      result = nodes.joinExpr({
        jointype: j.kind as any,
        larg: result as any,
        rarg: rightTable as any,
        quals: quals as any,
      });
    }

    return [result];
  }

  // -------------------------------------------------------------------------
  // Internal: SELECT builder (also used by CTE inlining)
  // -------------------------------------------------------------------------

  private _buildSelectInternal(startParamIndex: number = 0): unknown {
    this._paramIndex = startParamIndex;

    const targetList = this._buildTargetList(this._selectItems);

    const whereClause = this._buildWhereNode(this._whereConditions);
    const havingClause = this._buildWhereNode(this._havingConditions);

    const groupClause = this._groupByColumns.length > 0
      ? this._groupByColumns.map((col) => colRef(col))
      : undefined;

    const sortClause = this._orderBySpecs.length > 0
      ? this._orderBySpecs.map((s) => sortByNode(s.column, s.direction, s.nulls))
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
      const items = columns.map((c) => this._addParam(row[c]));
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
          val: this._addParam(val) as any,
        })
      );

      if (spec.where) {
        whereNode = this._buildWhereNode([spec.where]);
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
        val: this._addParam(val) as any,
      })
    );

    const whereClause = this._buildWhereNode(this._whereConditions);

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
    const whereClause = this._buildWhereNode(this._whereConditions);

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

    const targetList = [resTargetVal(funcNode)];

    const selectNode = nodes.selectStmt({
      targetList: targetList as any[],
      op: 'SETOP_NONE' as any,
    });

    const text = deparseSync(selectNode as any);
    return { text, values: this._paramValues };
  }
}
