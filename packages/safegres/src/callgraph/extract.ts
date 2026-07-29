/**
 * Static body extraction for the call graph.
 *
 * Given a function's source, extract the function calls, table references
 * (read vs write), and auth-context mutations it contains. Dynamic SQL
 * (`EXECUTE format(...)`) and unparseable bodies are surfaced as `opaque`
 * rather than silently dropped — static analysis ends there.
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

export interface ExtractedBody {
  calls: NameRef[];
  tables: TableRef[];
  /** GUC names written via `set_config(...)` / `SET`, plus `role` for SET ROLE. */
  settings: string[];
  /** True when the body contains dynamic SQL we cannot follow statically. */
  opaque: boolean;
  /** Why the body is (partially) opaque, when it is. */
  opaqueReason?: string;
}

const EMPTY: ExtractedBody = { calls: [], tables: [], settings: [], opaque: false };

/** Languages whose bodies we can statically analyze. */
const ANALYZABLE = new Set(['sql', 'plpgsql']);

export async function extractBody(fn: FunctionSnapshot): Promise<ExtractedBody> {
  if (!ANALYZABLE.has(fn.language)) {
    if (fn.language === 'internal' || fn.language === 'c') return EMPTY;
    return { ...EMPTY, opaque: true, opaqueReason: `language "${fn.language}" is not statically analyzable` };
  }

  if (fn.language === 'sql') {
    if (!fn.source || fn.source.trim() === '') return EMPTY;
    return extractFromSql(fn.source, 'statement');
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
    const part = await extractFromSql(sql, 'statement');
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

async function extractFromSql(sql: string, _mode: 'statement'): Promise<ExtractedBody> {
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
    ...(body.opaqueReason ? { opaqueReason: body.opaqueReason } : {})
  };
}
