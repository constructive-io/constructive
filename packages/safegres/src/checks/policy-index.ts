/**
 * Policy-aware performance checks (X2/X3/X4).
 *
 * These are the checks a generic index linter can't make: they read the RLS
 * policy predicate and ask whether the *security* qual — the one Postgres
 * evaluates first, on every candidate row, for every query against the table —
 * can actually use an index.
 *
 * All three are static (catalog + AST only); no runtime statistics, no EXPLAIN.
 */

import { NodePath, walk } from '@pgsql/traverse';

import type { PgAstNode } from '../ast/parse';
import { columnRefPath, funcNameQualified } from '../ast/walk';
import type { TableIndexSnapshot } from '../pg/indexes';
import type { TableSnapshot } from '../pg/introspect';
import type { ProcVolatility } from '../pg/proc';
import type { Finding } from '../types';

export type PolicyClause = 'USING' | 'WITH CHECK';

/** A column of the policy's own table, as referenced by the policy predicate. */
export interface PredicateColumn {
  column: string;
  clause: PolicyClause;
  /**
   * The cast type or function name wrapping the column reference, if any.
   * `undefined` means the column is compared directly (index-usable).
   */
  wrappedBy?: string;
  /** True when `wrappedBy` is a cast rather than a function call. */
  isCast?: boolean;
}

/**
 * Comparison-ish nodes worth indexing for. We deliberately ignore `IS NULL`,
 * boolean tests and the like: an index rarely helps there, so flagging them
 * would be noise.
 */
const COMPARISON_TAGS = new Set(['A_Expr', 'SubLink', 'NullTest', 'ScalarArrayOpExpr']);

/**
 * Collect the policy's own columns that participate in a comparison, along
 * with any cast/function wrapping them.
 *
 * Only single-part column references (`tenant_id`) and references qualified
 * with the table's own name/alias (`posts.tenant_id`) count — a column from a
 * subquery's table belongs to that table's policies, not this one.
 */
export function collectPredicateColumns(
  expr: PgAstNode,
  clause: PolicyClause,
  tableName: string
): PredicateColumn[] {
  const out: PredicateColumn[] = [];
  const seen = new Set<string>();

  walk(expr as object, (path: NodePath) => {
    if (path.tag !== 'ColumnRef') return;

    const parts = columnRefPath(path.node as Record<string, unknown>);
    const column = ownColumnName(parts, tableName);
    if (!column) return;

    const { wrappedBy, isCast } = wrappingOf(path);
    if (!inComparison(path)) return;

    const key = `${clause}:${column}:${wrappedBy ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ column, clause, wrappedBy, isCast });
  });

  return out;
}

/**
 * X2: a policy predicate compares a column that has no index with that column
 * in the leading position, so the security qual degrades to a sequential scan
 * on every query touching the table.
 */
export function checkUnindexedPolicyColumns(
  table: TableSnapshot,
  indexes: TableIndexSnapshot,
  columns: Map<string, PredicateColumn[]>
): Finding[] {
  const out: Finding[] = [];
  const leading = leadingColumns(indexes);

  for (const [policyName, cols] of columns) {
    const reported = new Set<string>();
    for (const col of cols) {
      // A wrapped column is X3's business — the raw column being indexed
      // wouldn't help the wrapped comparison anyway.
      if (col.wrappedBy) continue;
      if (leading.has(col.column)) continue;
      if (reported.has(col.column)) continue;
      reported.add(col.column);

      out.push({
        code: 'X2',
        severity: 'medium',
        category: 'index',
        schema: table.schema,
        table: table.name,
        policy: policyName,
        message:
          `Policy "${policyName}" on ${table.schema}.${table.name} filters by ${col.column}, which is not the leading column of any index`,
        hint:
          `RLS quals run before user quals on every row the planner considers, so an unindexed policy column forces a sequential scan for all callers. CREATE INDEX ON ${table.schema}.${table.name} (${col.column}).`,
        context: { column: col.column, clause: col.clause }
      });
    }
  }

  return out;
}

/**
 * X3: the policy wraps its own column in a cast or function call
 * (`tenant_id::text = ...`, `lower(email) = ...`). A plain b-tree index on the
 * bare column can't serve that comparison — it needs a matching expression
 * index, or the cast should move to the other side of the operator.
 */
export function checkPolicyColumnCasts(
  table: TableSnapshot,
  indexes: TableIndexSnapshot,
  columns: Map<string, PredicateColumn[]>
): Finding[] {
  const out: Finding[] = [];
  const expressionDefs = indexes.indexes
    .filter((i) => i.expression)
    .map((i) => i.definition.toLowerCase());

  for (const [policyName, cols] of columns) {
    const reported = new Set<string>();
    for (const col of cols) {
      if (!col.wrappedBy) continue;
      const key = `${col.column}:${col.wrappedBy}`;
      if (reported.has(key)) continue;
      reported.add(key);
      if (expressionDefs.some((def) => defCovers(def, col))) continue;

      const shape = col.isCast
        ? `${col.column}::${col.wrappedBy}`
        : `${col.wrappedBy}(${col.column})`;
      out.push({
        code: 'X3',
        severity: 'medium',
        category: 'index',
        schema: table.schema,
        table: table.name,
        policy: policyName,
        message:
          `Policy "${policyName}" on ${table.schema}.${table.name} compares ${shape} — a plain index on ${col.column} cannot serve this`,
        hint: col.isCast
          ? `Cast the other side of the comparison instead, or add a matching expression index: CREATE INDEX ON ${table.schema}.${table.name} ((${shape})).`
          : `Add a matching expression index: CREATE INDEX ON ${table.schema}.${table.name} ((${shape})).`,
        context: { column: col.column, expression: shape, clause: col.clause }
      });
    }
  }

  return out;
}

/**
 * X4: the policy predicate calls a non-LEAKPROOF function.
 *
 * Postgres assigns security quals a lower security level than user quals and
 * will not push a non-leakproof qual below a join or subquery scan. The
 * practical effect is that the policy filter is applied later and to more rows
 * than necessary, and index scans on the underlying relation are given up.
 *
 * System functions are exempt: their leakproofness is a fixed property of the
 * server, not something the schema author chose.
 */
export function checkNonLeakproofPolicyFunctions(
  table: TableSnapshot,
  expr: PgAstNode,
  volatility: Map<string, ProcVolatility>,
  policyName: string
): Finding[] {
  const out: Finding[] = [];
  const seen = new Set<string>();

  walk(expr as object, (path: NodePath) => {
    if (path.tag !== 'FuncCall') return;
    const qualified = funcNameQualified(path.node as Record<string, unknown>);
    const bare = qualified.split('.').pop() ?? qualified;
    const info = volatility.get(qualified) ?? volatility.get(bare);
    if (!info) return;
    if (info.isSystem) return;
    if (info.isLeakproof) return;
    if (seen.has(info.name)) return;
    seen.add(info.name);

    out.push({
      code: 'X4',
      severity: 'low',
      category: 'index',
      schema: table.schema,
      table: table.name,
      policy: policyName,
      message:
        `Policy "${policyName}" on ${table.schema}.${table.name} calls non-LEAKPROOF function ${info.name}`,
      hint:
        'Non-leakproof quals cannot be pushed below joins or subquery scans, so the policy filter is applied late and to more rows than necessary. If the function provably leaks nothing about its arguments (no error messages containing values), mark it LEAKPROOF.',
      context: { function: info.name }
    });
  });

  return out;
}

/**
 * System functions worth flagging for X9 despite being built in: reading a GUC
 * per row is the exact pattern the rule exists to catch, whether it goes
 * through a wrapper or not.
 */
const HOISTABLE_SYSTEM_FUNCTIONS = new Set(['current_setting', 'pg_catalog.current_setting']);

/**
 * X9: the policy calls a STABLE function whose arguments don't depend on the
 * row, but the call isn't wrapped in a scalar sub-select.
 *
 * `STABLE` promises the result won't change within the statement; it does *not*
 * make the planner evaluate the call once. A bare `current_principal_id()` in a
 * qual is executed for every row the scan considers. Wrapped as
 * `(SELECT current_principal_id())` the expression references no column, so the
 * planner hoists it into an InitPlan: one call per query, and the result is a
 * constant the index can be probed with.
 *
 * VOLATILE calls are deliberately excluded — per-row evaluation is their
 * defined behaviour, and hoisting one would change semantics (P1 covers those).
 * IMMUTABLE calls with constant arguments are folded at plan time already.
 */
export function checkUnhoistedPolicyFunctions(
  table: TableSnapshot,
  expr: PgAstNode,
  volatility: Map<string, ProcVolatility>,
  policyName: string,
  clause: PolicyClause
): Finding[] {
  const out: Finding[] = [];
  const seen = new Set<string>();

  walk(expr as object, (path: NodePath) => {
    if (path.tag !== 'FuncCall') return;

    const node = path.node as Record<string, unknown>;
    const qualified = funcNameQualified(node);
    const bare = qualified.split('.').pop() ?? qualified;
    const info = volatility.get(qualified) ?? volatility.get(bare);
    if (!info) return;
    if (info.volatility !== 's') return;
    if (info.isSystem && !HOISTABLE_SYSTEM_FUNCTIONS.has(info.name)) return;
    if (referencesColumn(node)) return;
    if (isHoisted(path)) return;
    if (seen.has(info.name)) return;
    seen.add(info.name);

    out.push({
      code: 'X9',
      severity: 'medium',
      category: 'index',
      schema: table.schema,
      table: table.name,
      policy: policyName,
      message:
        `Policy "${policyName}" on ${table.schema}.${table.name} calls ${info.name}() per row — the call is not wrapped in a scalar sub-select`,
      hint:
        `STABLE does not mean "evaluated once". Whenever this qual lands in a Filter rather than an index `
        + `condition — an unindexed policy column, a join, an OR branch — ${info.name}() is executed for every `
        + `row the scan considers. Wrap it as (SELECT ${info.name}()) so the expression references no column and `
        + 'the planner hoists it into an InitPlan: one call per query, whatever plan it picks.',
      context: { function: info.name, clause }
    });
  });

  return out;
}

/** True when any argument of the call references a column (so it can't be hoisted). */
function referencesColumn(funcCall: Record<string, unknown>): boolean {
  const args = funcCall.args;
  if (!Array.isArray(args) || args.length === 0) return false;

  let found = false;
  for (const arg of args) {
    walk(arg as object, (path: NodePath) => {
      if (path.tag === 'ColumnRef') found = true;
    });
    if (found) return true;
  }
  return false;
}

/**
 * True when the call already sits inside an uncorrelated scalar sub-select —
 * `(SELECT fn())` — which is what makes the planner hoist it.
 *
 * Being inside an `EXISTS` sub-select is *not* enough: that subquery is
 * correlated with the outer row, so it runs per row and takes the function
 * call with it.
 */
function isHoisted(path: NodePath): boolean {
  for (let cursor = path.parent; cursor; cursor = cursor.parent) {
    if (cursor.tag !== 'SubLink') continue;
    const sublink = cursor.node as Record<string, unknown>;
    if (sublink.subLinkType !== 'EXPR_SUBLINK') return false;
    const subselect = sublink.subselect as Record<string, unknown> | undefined;
    const stmt = (subselect?.SelectStmt ?? subselect) as Record<string, unknown> | undefined;
    const from = stmt?.fromClause;
    return !Array.isArray(from) || from.length === 0;
  }
  return false;
}

/** Columns that sit in the leading position of at least one index. */
function leadingColumns(indexes: TableIndexSnapshot): Set<string> {
  const out = new Set<string>();
  for (const index of indexes.indexes) {
    const first = index.columnNames[0];
    if (first) out.add(first);
  }
  return out;
}

/**
 * Resolve a column reference to a bare column name on `tableName`, or null if
 * it belongs to another relation (or is `*`).
 */
function ownColumnName(parts: string[], tableName: string): string | null {
  if (parts.length === 1) return parts[0] === '*' ? null : parts[0];
  if (parts.length === 2 && parts[0] === tableName) return parts[1] === '*' ? null : parts[1];
  return null;
}

/** Nearest enclosing cast or function call, if the column is wrapped by one. */
function wrappingOf(path: NodePath): { wrappedBy?: string; isCast?: boolean } {
  const parent = path.parent;
  if (!parent) return {};

  if (parent.tag === 'TypeCast') {
    const typeName = castTypeName(parent.node as Record<string, unknown>);
    return typeName ? { wrappedBy: typeName, isCast: true } : {};
  }

  if (parent.tag === 'FuncCall') {
    return { wrappedBy: funcNameQualified(parent.node as Record<string, unknown>), isCast: false };
  }

  return {};
}

/** True when the column participates in a comparison rather than, say, a projection. */
function inComparison(path: NodePath): boolean {
  let cursor: NodePath | null = path.parent;
  // Allow one or two wrapping levels (cast, function call) between the column
  // and the comparison it feeds.
  for (let depth = 0; cursor && depth < 3; depth++) {
    if (COMPARISON_TAGS.has(cursor.tag)) return true;
    cursor = cursor.parent;
  }
  return false;
}

function castTypeName(typeCast: Record<string, unknown>): string | null {
  const typeName = typeCast.typeName as Record<string, unknown> | undefined;
  if (!typeName) return null;
  const names = typeName.names;
  if (!Array.isArray(names) || names.length === 0) return null;
  const last = names[names.length - 1] as Record<string, unknown>;
  const str = (last.String ?? last.string) as Record<string, unknown> | undefined;
  if (!str) return null;
  const value = String((str.sval ?? str.str) ?? '');
  return value.length > 0 ? value : null;
}

/**
 * Heuristic match of an expression index definition against a wrapped column.
 * `pg_get_indexdef` renders casts as `((col)::text)` and calls as `lower(col)`,
 * so requiring both tokens is enough to avoid the common false positive
 * without parsing the definition back into an AST.
 */
function defCovers(definitionLower: string, col: PredicateColumn): boolean {
  const wrapper = (col.wrappedBy ?? '').toLowerCase();
  const column = col.column.toLowerCase();
  if (!wrapper) return false;
  if (col.isCast) return definitionLower.includes(`::${wrapper}`) && definitionLower.includes(column);
  return definitionLower.includes(`${wrapper}(`) && definitionLower.includes(column);
}
