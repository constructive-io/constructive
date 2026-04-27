/**
 * Wrapper around `pgsql-parser` that handles the reality that RLS predicates
 * appearing in `pg_get_expr(polqual, polrelid)` are fragments, not statements.
 *
 * We wrap the fragment in a `SELECT … WHERE <expr>` so the parser accepts it,
 * then pull the `whereClause` out of the resulting AST.
 */

import { parse } from 'pgsql-parser';

/** Opaque AST node — intentionally `unknown` to keep us loose against pgsql-parser upgrades. */
export type PgAstNode = unknown;

export interface PolicyExpression {
  /** Original text (exactly as returned by pg_get_expr). */
  text: string;
  /** Root AST node of the expression (not the wrapping SELECT). */
  ast: PgAstNode;
}

export class PolicyParseError extends Error {
  constructor(public readonly expr: string, public readonly cause: unknown) {
    super(`Failed to parse policy expression: ${expr}`);
  }
}

/**
 * Parse a policy expression fragment.
 *
 * `parse` from pgsql-parser v17 is async (it awaits a WASM load), so this
 * wrapper is async too.
 *
 * @param expr   The text from `pg_get_expr(...)`.
 * @returns      Parsed AST, or `null` if `expr` is null/empty.
 * @throws       `PolicyParseError` on parse failure.
 */
export async function parsePolicyExpression(expr: string | null): Promise<PolicyExpression | null> {
  if (expr === null || expr === undefined) return null;
  const trimmed = expr.trim();
  if (trimmed === '') return null;

  // Strip outer parens that Postgres adds to pg_get_expr output, so the
  // wrapping `WHERE` is cleaner. We only strip *one* pair and only when
  // balanced — otherwise we leave the text alone and let the parser deal.
  const inner = stripOuterParens(trimmed);

  const wrapped = `SELECT 1 FROM __safegres_audit_dummy WHERE (${inner})`;
  let parsed: unknown;
  try {
    parsed = await parse(wrapped);
  } catch (err) {
    throw new PolicyParseError(expr, err);
  }

  const ast = extractWhereClause(parsed);
  if (!ast) {
    throw new PolicyParseError(expr, new Error('no whereClause in parsed SELECT'));
  }

  return { text: expr, ast };
}

function stripOuterParens(s: string): string {
  if (s.length < 2 || s[0] !== '(' || s[s.length - 1] !== ')') return s;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0 && i !== s.length - 1) return s;
    }
  }
  return s.slice(1, -1);
}

function extractWhereClause(parsed: unknown): PgAstNode | null {
  // pgsql-parser v17 returns `{ stmts: [{ stmt: { SelectStmt: { whereClause: … } } }] }`
  if (!parsed || typeof parsed !== 'object') return null;
  const asRecord = parsed as Record<string, unknown>;
  const stmts = asRecord.stmts;
  if (!Array.isArray(stmts) || stmts.length === 0) return null;
  const first = stmts[0] as Record<string, unknown>;
  const stmt = (first.stmt ?? first) as Record<string, unknown>;
  const selectStmt = stmt.SelectStmt as Record<string, unknown> | undefined;
  if (!selectStmt) return null;
  const where = selectStmt.whereClause;
  return where ?? null;
}
