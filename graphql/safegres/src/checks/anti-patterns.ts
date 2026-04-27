import type { PgAstNode } from '../ast/parse';
import { parsePolicyExpression } from '../ast/parse';
import { columnRefPath, findAll, funcNameParts, funcNameQualified, walk } from '../ast/walk';
import { boolConst } from '../ast/helpers';
import type { PolicyInfo, TableSnapshot } from '../pg/introspect';
import type { ProcVolatility } from '../pg/proc';
import type { Finding } from '../types';

/**
 * Function names we consider "safe" (stable) for policy predicates, even when
 * pg_proc marks them volatile. These are the well-known Postgres session
 * primitives that the planner treats as constant for the duration of a query.
 *
 * This is intentionally narrow — everything else that's volatile gets flagged.
 */
const SAFE_VOLATILE_ALLOWLIST = new Set([
  'current_setting',  // only because PostgreSQL optimises this specially
  'txid_current',
  'clock_timestamp',  // still flagged elsewhere — listed here to document intent
  'now',
  'statement_timestamp',
  'transaction_timestamp'
]);

/**
 * Anti-pattern P1: policy predicate invokes a VOLATILE function (per-row
 * evaluation, breaks the planner's ability to hoist or cache).
 *
 * Also flags SECURITY DEFINER wrappers here (P1b): they can't be inlined and
 * become per-row function calls.
 *
 * Expected input: a volatility map keyed by `schema.name` (see pg/proc.ts).
 */
export function checkVolatileFunctions(
  table: TableSnapshot,
  expr: PgAstNode,
  volatility: Map<string, ProcVolatility>,
  policyName: string
): Finding[] {
  const out: Finding[] = [];

  for (const fc of findAll(expr, 'FuncCall')) {
    const { schema, name } = funcNameParts(fc);
    const qualified = funcNameQualified(fc);
    const lookupKey = schema ? `${schema}.${name}` : name;
    const info = volatility.get(qualified) ?? volatility.get(lookupKey) ?? volatility.get(name);

    if (!info) continue; // unknown function (e.g. operator expansion) — skip silently
    if (info.volatility !== 'v') continue;
    if (SAFE_VOLATILE_ALLOWLIST.has(info.name.split('.').pop() ?? '')) continue;
    if (info.isSystem && SAFE_VOLATILE_ALLOWLIST.has(name)) continue;

    out.push({
      code: 'P1',
      severity: 'high',
      category: 'anti-pattern',
      schema: table.schema,
      table: table.name,
      policy: policyName,
      message:
        `Policy "${policyName}" on ${table.schema}.${table.name} calls VOLATILE function ${info.name}`,
      hint:
        'Volatile functions re-execute for every row considered by the planner. Mark the function STABLE if safe, or precompute the result in a CTE / subquery.',
      context: { function: info.name, securityDefiner: info.isSecurityDefiner }
    });

    if (info.isSecurityDefiner) {
      out.push({
        code: 'P1b',
        severity: 'medium',
        category: 'anti-pattern',
        schema: table.schema,
        table: table.name,
        policy: policyName,
        message:
          `Policy "${policyName}" on ${table.schema}.${table.name} calls SECURITY DEFINER function ${info.name}`,
        hint: 'SECURITY DEFINER wrappers can\'t be inlined by the planner — every row forces a function call. Convert to a STABLE SQL function or replace with a direct expression.',
        context: { function: info.name }
      });
    }
  }

  return out;
}

/**
 * Anti-pattern P5: policy references `session_user`, `current_user`, or
 * `pg_has_role(...)` for tenant gating. These bypass the role-and-JWT layer
 * that the rest of the auth model is built on, and they silently evaluate
 * against the *login* role instead of the `SET LOCAL role` role, which
 * produces confusing RLS behavior across pooled connections.
 */
export function checkSessionUserGating(
  table: TableSnapshot,
  expr: PgAstNode,
  policyName: string
): Finding[] {
  const out: Finding[] = [];

  // session_user / current_user appear as CurrentOfExpr-adjacent nodes in some
  // parser versions, but the common form is `SQLValueFunction` with `op:
  // SVFOP_CURRENT_USER` (4) or SVFOP_SESSION_USER (6).
  walk(expr, (node, tag) => {
    if (tag === 'SQLValueFunction') {
      const op = node.op;
      const opStr = typeof op === 'string' ? op : String(op);
      if (/CURRENT_USER|SESSION_USER/i.test(opStr)) {
        out.push({
          code: 'P5',
          severity: 'high',
          category: 'anti-pattern',
          schema: table.schema,
          table: table.name,
          policy: policyName,
          message:
            `Policy "${policyName}" on ${table.schema}.${table.name} references ${opStr.replace('SVFOP_', '').toLowerCase()}`,
          hint: 'Use a JWT-backed helper (`current_setting(\'jwt.claims...\')`) or a dedicated STABLE auth function. `current_user` / `session_user` bypass the app auth layer.'
        });
      }
    }
  });

  // pg_has_role(text, text, text)
  for (const fc of findAll(expr, 'FuncCall')) {
    const { name } = funcNameParts(fc);
    if (name === 'pg_has_role') {
      out.push({
        code: 'P5',
        severity: 'high',
        category: 'anti-pattern',
        schema: table.schema,
        table: table.name,
        policy: policyName,
        message:
          `Policy "${policyName}" on ${table.schema}.${table.name} uses pg_has_role() for tenant gating`,
        hint: 'pg_has_role() checks Postgres role grants — not application-level authorization. Consider a dedicated auth helper instead.'
      });
    }
  }

  // Also flag raw ColumnRef `current_user` — parser versions vary.
  for (const cr of findAll(expr, 'ColumnRef')) {
    const path = columnRefPath(cr);
    if (path.length === 1 && (path[0] === 'current_user' || path[0] === 'session_user')) {
      out.push({
        code: 'P5',
        severity: 'high',
        category: 'anti-pattern',
        schema: table.schema,
        table: table.name,
        policy: policyName,
        message:
          `Policy "${policyName}" on ${table.schema}.${table.name} references ${path[0]}`,
        hint: 'Use a JWT-backed helper or STABLE auth function instead of raw session/current role.'
      });
    }
  }

  return out;
}

/**
 * Anti-pattern A7: trivially-permissive policy body.
 *
 * A permissive policy whose body is the literal `true` (and has no tightening
 * `WITH CHECK` clause) adds zero security — it's equivalent to not having RLS
 * at all for the covered command. This is different from an intentional
 * *restrictive* `true` (which would require all rows to satisfy it). We only
 * flag `permissive = true` here because Postgres defaults to PERMISSIVE and
 * `USING (true)` is the most common accidental "fail-open" shape.
 *
 * Severity: HIGH — any auditor should see this as RLS-not-actually-enforced.
 *
 * Input: the parsed USING and WITH CHECK ASTs (may be null if empty).
 */
export function checkTriviallyPermissive(
  table: TableSnapshot,
  policy: PolicyInfo,
  usingAst: PgAstNode | null,
  withCheckAst: PgAstNode | null
): Finding | null {
  if (!policy.permissive) return null;

  const usingIsTrue = usingAst ? boolConst(usingAst) === true : false;
  const withCheckIsTrue = withCheckAst ? boolConst(withCheckAst) === true : false;

  // Figure out which clauses are "open".
  // - If USING exists, it must be literal true to be "open" on the read side.
  // - If WITH CHECK exists, it must also be literal true.
  // - If a clause is absent, the command doesn't care about it (e.g. INSERT
  //   has no USING; SELECT has no WITH CHECK) — that's a separate concern
  //   covered by the coverage checks.
  // We flag when *every* present clause is literal `true`.
  const presentClauses: Array<'USING' | 'WITH CHECK'> = [];
  const trivialClauses: Array<'USING' | 'WITH CHECK'> = [];
  if (policy.using !== null) {
    presentClauses.push('USING');
    if (usingIsTrue) trivialClauses.push('USING');
  }
  if (policy.withCheck !== null) {
    presentClauses.push('WITH CHECK');
    if (withCheckIsTrue) trivialClauses.push('WITH CHECK');
  }

  if (presentClauses.length === 0) return null;
  if (trivialClauses.length !== presentClauses.length) return null;

  const clauseList = trivialClauses.join(' and ');
  return {
    code: 'A7',
    severity: 'high',
    category: 'anti-pattern',
    schema: table.schema,
    table: table.name,
    policy: policy.name,
    message: `Policy "${policy.name}" on ${table.schema}.${table.name} is trivially permissive (${clauseList} = true)`,
    hint: 'A permissive policy whose body is the literal `true` imposes no constraint. Either tighten the predicate (reference the authenticated user / membership) or drop the policy and use a GRANT REVOKE model.',
    context: { cmd: policy.cmd, clauses: trivialClauses }
  };
}

/**
 * Walk a policy expression, collecting unique function `(schema, name)` tuples
 * so we can resolve volatility in one batch query.
 */
export function collectFunctionNames(expr: PgAstNode): Array<{ schema?: string; name: string }> {
  const out: Array<{ schema?: string; name: string }> = [];
  const seen = new Set<string>();
  for (const fc of findAll(expr, 'FuncCall')) {
    const parts = funcNameParts(fc);
    const key = `${parts.schema ?? ''}.${parts.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parts);
  }
  return out;
}

/** Parse a policy expression or return `null` on empty input. Logs parse errors to stderr. */
export async function parseOrNull(expr: string | null, context: string): Promise<PgAstNode | null> {
  try {
    const parsed = await parsePolicyExpression(expr);
    return parsed?.ast ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[safegres-audit] could not parse ${context}: ${(err as Error).message}`);
    return null;
  }
}
