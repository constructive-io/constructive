/**
 * Static body extraction for the call graph.
 *
 * Given a function's source, extract the function calls, table references
 * (read vs write), and auth-context mutations it contains. Dynamic SQL
 * (`EXECUTE format(...)`) and unparseable bodies are surfaced as `opaque`
 * rather than silently dropped — static analysis ends there.
 *
 * A view body is the same question asked of a different object, so
 * {@link extractQuery} exposes the plain-SQL half directly.
 */

import { parsePlPgSQL } from 'libpg-query';
import { parse } from 'pgsql-parser';

import { findAll, funcNameParts } from '../ast/walk';
import type { FunctionSnapshot } from '../pg/functions';

export interface NameRef {
  schema?: string;
  name: string;
}

export interface TableRef extends NameRef {
  write: boolean;
}

/**
 * A relation reference with the privilege the reference actually exercises,
 * rather than the read/write bit {@link TableRef} carries. `INSERT INTO audit`
 * and `UPDATE audit` are both writes, but they are not the same grant, and a
 * rule action can mix them in one statement.
 */
export interface RelationAccess extends NameRef {
  privilege: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface ExtractedAccess {
  accesses: RelationAccess[];
  opaque: boolean;
  opaqueReason?: string;
}

export interface ExtractedBody {
  calls: NameRef[];
  tables: TableRef[];
  /** GUC names written via `set_config(...)` / `SET`, plus `role` for SET ROLE. */
  settings: string[];
  /** True when the body contains dynamic SQL we cannot follow statically. */
  opaque: boolean;
  /** Why the body is (partially) opaque, when it is. */
  opaqueReason?: string;
  /**
   * The body executes SQL this analysis cannot see, *alongside* references it
   * could read: `calls`, `tables` and `settings` are correct but incomplete.
   *
   * This is the distinction {@link opaque} cannot make. `opaque` says the
   * whole body is unknown and its references must be discarded; `tainted`
   * says what was read is real and what was missed is unknowable, which is
   * what a reach model needs in order to report the gap instead of the view
   * disappearing from the analysis altogether.
   */
  tainted?: string;
}

const EMPTY: ExtractedBody = { calls: [], tables: [], settings: [], opaque: false };

/**
 * Functions that run SQL of their own. The relations they touch are in a
 * string argument, not in this AST, so a body calling one has a relation set
 * that is a lower bound rather than an answer.
 */
const SQL_EXECUTING = new Set(['query_to_xml', 'dblink', 'dblink_exec', 'dblink_send_query']);

/** Languages whose bodies we can statically analyze. */
const ANALYZABLE = new Set(['sql', 'plpgsql']);

export async function extractBody(fn: FunctionSnapshot): Promise<ExtractedBody> {
  if (!ANALYZABLE.has(fn.language)) {
    if (fn.language === 'internal' || fn.language === 'c') return EMPTY;
    return { ...EMPTY, opaque: true, opaqueReason: `language "${fn.language}" is not statically analyzable` };
  }

  if (fn.language === 'sql') {
    if (!fn.source || fn.source.trim() === '') return EMPTY;
    return extractQuery(fn.source);
  }

  // plpgsql: parse the full CREATE FUNCTION, then analyze every embedded
  // SQL expression/statement the PL/pgSQL parser hands back.
  if (!fn.definition) return { ...EMPTY, opaque: true, opaqueReason: 'no function definition available' };

  let parsed: unknown;
  try {
    parsed = await parsePlPgSQL(fn.definition);
  } catch {
    return { ...EMPTY, opaque: true, opaqueReason: 'PL/pgSQL body failed to parse' };
  }

  const out: MutableBody = { calls: [], tables: [], settings: [], opaque: false };
  const exprs: Array<{ query: string; parseMode: number }> = [];
  collectPlpgsql(parsed, exprs, out);

  for (const e of exprs) {
    // parseMode 0 = full statement; 3 = assignment (`target := expr` or
    // `target = expr`) — strip the anchored target so the RHS parses. The
    // RHS may itself contain `:=` (named arguments), so only the leading
    // target is removed. Anything else is a bare expression.
    let q = e.query;
    if (e.parseMode === 3) {
      q = q.replace(/^\s*[a-zA-Z_"][\w$".]*(\[[^\]]*\])*\s*:?=\s*/, '');
    }
    const sql = e.parseMode === 0 ? q : `SELECT ${q}`;
    const part = await extractQuery(sql);
    mergeBody(out, part);
  }

  return finalize(out);
}

interface MutableBody {
  calls: NameRef[];
  tables: TableRef[];
  settings: string[];
  opaque: boolean;
  opaqueReason?: string;
  tainted?: string;
}

/** Walk the PL/pgSQL JSON tree: collect embedded SQL, flag dynamic EXECUTE. */
function collectPlpgsql(node: unknown, exprs: Array<{ query: string; parseMode: number }>, out: MutableBody): void {
  if (Array.isArray(node)) {
    for (const item of node) collectPlpgsql(item, exprs, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const rec = node as Record<string, unknown>;

  if (rec.PLpgSQL_stmt_dynexecute) {
    out.opaque = true;
    out.opaqueReason = 'dynamic SQL (EXECUTE) — cannot follow statically';
    // Still walk it: the format() expression itself may call functions.
  }

  const expr = rec.PLpgSQL_expr as Record<string, unknown> | undefined;
  if (expr && typeof expr.query === 'string') {
    exprs.push({ query: expr.query, parseMode: typeof expr.parseMode === 'number' ? expr.parseMode : 2 });
  }

  for (const value of Object.values(rec)) collectPlpgsql(value, exprs, out);
}

/**
 * The same extraction over a standalone SQL statement — a view body, a policy
 * predicate, anything that is already plain SQL rather than a function.
 */
export async function extractQuery(sql: string): Promise<ExtractedBody> {
  let ast: unknown;
  try {
    ast = await parse(sql);
  } catch {
    // Individual fragments can legitimately fail (PL/pgSQL variables in
    // type positions, etc.) — treat as opaque rather than erroring out.
    return { ...EMPTY, opaque: true, opaqueReason: 'SQL fragment failed to parse' };
  }

  const out: MutableBody = { calls: [], tables: [], settings: [], opaque: false };

  for (const call of findAll(ast, 'FuncCall')) {
    const ref = funcNameParts(call);
    if (ref.name === '<unknown>') continue;
    out.calls.push(ref);

    if (ref.name === 'set_config' && (!ref.schema || ref.schema === 'pg_catalog')) {
      const setting = firstStringArg(call);
      if (setting) out.settings.push(setting);
    }

    // Not opaque: the rest of the body still reads correctly. Tainted: the
    // relations this call reaches are in a string, and we do not follow it.
    if (SQL_EXECUTING.has(ref.name)) {
      out.tainted ??= `\`${ref.name}\` executes SQL this analysis cannot see`;
    }
  }

  // Write targets: the relation of INSERT/UPDATE/DELETE statements.
  const writeOids = new Set<Record<string, unknown>>();
  for (const tag of ['InsertStmt', 'UpdateStmt', 'DeleteStmt']) {
    for (const stmt of findAll(ast, tag)) {
      const rel = stmt.relation as Record<string, unknown> | undefined;
      if (rel) writeOids.add(rel);
    }
  }
  for (const rv of findAll(ast, 'RangeVar')) {
    const name = typeof rv.relname === 'string' ? rv.relname : undefined;
    if (!name) continue;
    const schema = typeof rv.schemaname === 'string' ? rv.schemaname : undefined;
    out.tables.push({ schema, name, write: writeOids.has(rv) });
  }

  // SET role / SET session_authorization / SET request.jwt… inside SQL bodies.
  for (const set of findAll(ast, 'VariableSetStmt')) {
    const name = typeof set.name === 'string' ? set.name : undefined;
    if (name) out.settings.push(name.toLowerCase());
  }

  return finalize(out);
}

/**
 * The same walk as {@link extractQuery}, but resolving each relation
 * reference to the privilege it exercises instead of a read/write bit.
 *
 * Used for statements whose interesting content is *which grant* a reference
 * needs — a rewrite rule's actions, where `INSERT INTO audit` means the rule
 * needs INSERT on `audit` and nothing else tells you so.
 */
export async function extractAccess(sql: string): Promise<ExtractedAccess> {
  let ast: unknown;
  try {
    ast = await parse(sql);
  } catch {
    return { accesses: [], opaque: true, opaqueReason: 'SQL fragment failed to parse' };
  }

  const byNode = new Map<Record<string, unknown>, RelationAccess['privilege']>();
  const commands = [
    ['InsertStmt', 'INSERT'],
    ['UpdateStmt', 'UPDATE'],
    ['DeleteStmt', 'DELETE']
  ] as const;
  for (const [tag, privilege] of commands) {
    for (const stmt of findAll(ast, tag)) {
      const rel = stmt.relation as Record<string, unknown> | undefined;
      if (rel) byNode.set(rel, privilege);
    }
  }

  let opaque = false;
  let opaqueReason: string | undefined;
  for (const call of findAll(ast, 'FuncCall')) {
    const ref = funcNameParts(call);
    // A rule action can hide its real target behind a function call; the
    // relations that call touches are not in this AST.
    if (ref.name === 'query_to_xml' || ref.name === 'dblink' || ref.name === 'dblink_exec') {
      opaque = true;
      opaqueReason ??= `\`${ref.name}\` executes SQL this analysis cannot see`;
    }
  }

  const accesses: RelationAccess[] = [];
  const seen = new Set<string>();
  for (const rv of findAll(ast, 'RangeVar')) {
    const name = typeof rv.relname === 'string' ? rv.relname : undefined;
    if (!name) continue;
    const schema = typeof rv.schemaname === 'string' ? rv.schemaname : undefined;
    const privilege = byNode.get(rv) ?? 'SELECT';
    const key = `${schema ?? ''}.${name}::${privilege}`;
    if (seen.has(key)) continue;
    seen.add(key);
    accesses.push({ ...(schema ? { schema } : {}), name, privilege });
  }

  return { accesses, opaque, ...(opaqueReason ? { opaqueReason } : {}) };
}

/**
 * Does this body restrict which rows come back?
 *
 * `null` when the SQL could not be parsed — "unknown", never "no". A view that
 * filters is a view someone may be relying on as a row-level boundary, which
 * is the precondition for the `security_barrier` question: without a `WHERE`
 * there are no hidden rows for a leaky qual to reach.
 *
 * Only an explicit `WHERE`/`HAVING` counts. Row-limiting through a join,
 * `DISTINCT` or `LIMIT` is real but is not the pattern that gets written as a
 * security boundary, and treating it as one would fire on ordinary reporting
 * views.
 */
export async function bodyFiltersRows(sql: string): Promise<boolean | null> {
  let ast: unknown;
  try {
    ast = await parse(sql);
  } catch {
    return null;
  }
  return findAll(ast, 'SelectStmt').some((s) => !!s.whereClause || !!s.havingClause);
}

function firstStringArg(call: Record<string, unknown>): string | null {
  const args = call.args;
  if (!Array.isArray(args) || args.length === 0) return null;
  const first = args[0] as Record<string, unknown>;
  const aconst = first.A_Const as Record<string, unknown> | undefined;
  const sval = aconst?.sval as Record<string, unknown> | undefined;
  const v = sval?.sval;
  return typeof v === 'string' ? v : null;
}

function mergeBody(into: MutableBody, from: ExtractedBody): void {
  into.calls.push(...from.calls);
  into.tables.push(...from.tables);
  into.settings.push(...from.settings);
  if (from.opaque && !into.opaque) {
    into.opaque = true;
    into.opaqueReason = from.opaqueReason;
  }
  into.tainted ??= from.tainted;
}

function finalize(body: MutableBody): ExtractedBody {
  const callKeys = new Set<string>();
  const calls = body.calls.filter((c) => {
    const k = `${c.schema ?? ''}.${c.name}`;
    if (callKeys.has(k)) return false;
    callKeys.add(k);
    return true;
  });
  const tableKeys = new Map<string, TableRef>();
  for (const t of body.tables) {
    const k = `${t.schema ?? ''}.${t.name}`;
    const existing = tableKeys.get(k);
    if (existing) existing.write = existing.write || t.write;
    else tableKeys.set(k, { ...t });
  }
  return {
    calls,
    tables: [...tableKeys.values()],
    settings: [...new Set(body.settings)],
    opaque: body.opaque,
    ...(body.opaqueReason ? { opaqueReason: body.opaqueReason } : {}),
    ...(body.tainted ? { tainted: body.tainted } : {})
  };
}
