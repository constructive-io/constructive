import type { Dimension, Direction, Finding, Severity } from '../types';

/**
 * Static metadata for every rule safegres can emit. Severity here is the
 * *default* — the resolved config (presets, rc files, CLI flags) can retune
 * or disable any rule.
 */
export interface RuleMeta {
  /** Stable rule code, e.g. `A1`, `P1b`. */
  code: string;
  category: Finding['category'];
  defaultSeverity: Severity;
  /**
   * Leak vs deny vs directionless. `fail-closed` findings are hygiene
   * concerns — the operation is *denied* at runtime — and contribute nothing
   * to the score by default. `fail-open` findings are actual exposure.
   */
  direction: Direction;
  /**
   * Scoring axis. `security` rules drive the audit score; `perf` rules drive
   * the optional performance score and are only collected when the perf
   * dimension is enabled. Defaults to `security` when omitted.
   */
  dimension?: Dimension;
  title: string;
  /**
   * Rules with `scope: 'policy-ast'` require parsing policy expressions.
   * When every one of them is disabled the audit skips AST work entirely.
   * `function-src` rules are the source-level convention linter (`C*`): they
   * read function definitions rather than the catalog, and run their own pass.
   */
  scope: 'table' | 'policy-ast' | 'index' | 'stats' | 'function-src';
}

/** The scoring axis a rule belongs to (`security` unless declared otherwise). */
export function dimensionOf(meta: RuleMeta): Dimension {
  return meta.dimension ?? 'security';
}

export const RULES: RuleMeta[] = [
  {
    code: 'A1',
    category: 'flags',
    defaultSeverity: 'low',
    direction: 'fail-closed',
    title: 'RLS enabled but no policies (deny-all — confirm the lock is intended)',
    scope: 'table'
  },
  {
    code: 'A2',
    category: 'flags',
    defaultSeverity: 'high',
    direction: 'fail-open',
    title: 'Grants exist on a table with RLS disabled',
    scope: 'table'
  },
  {
    code: 'A3',
    category: 'flags',
    defaultSeverity: 'low',
    direction: 'fail-open',
    title: 'RLS enabled but FORCE ROW LEVEL SECURITY not set (owner bypass)',
    scope: 'table'
  },
  {
    code: 'A4',
    category: 'coverage',
    defaultSeverity: 'low',
    direction: 'fail-closed',
    title: 'INSERT/UPDATE/DELETE grant with no covering policy — writes are denied at runtime',
    scope: 'table'
  },
  {
    code: 'A5',
    category: 'coverage',
    defaultSeverity: 'low',
    direction: 'fail-closed',
    title: 'SELECT grant with no covering policy — queries silently return 0 rows',
    scope: 'table'
  },
  {
    code: 'A6',
    category: 'coverage',
    defaultSeverity: 'info',
    direction: 'fail-closed',
    title: 'UPDATE has USING but no WITH CHECK (row-smuggling surface)',
    scope: 'table'
  },
  {
    code: 'A7',
    category: 'anti-pattern',
    defaultSeverity: 'critical',
    direction: 'fail-open',
    title: 'Trivially-permissive WRITE policy (INSERT/UPDATE/DELETE/ALL with literal true)',
    scope: 'policy-ast'
  },
  {
    code: 'A8',
    category: 'anti-pattern',
    defaultSeverity: 'low',
    direction: 'fail-open',
    title: 'Trivially-permissive SELECT policy (USING (true) — confirm public-read is intended)',
    scope: 'policy-ast'
  },
  {
    code: 'P1',
    category: 'anti-pattern',
    defaultSeverity: 'high',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Policy body calls a VOLATILE function (per-row evaluation)',
    scope: 'policy-ast'
  },
  {
    code: 'P1b',
    category: 'anti-pattern',
    defaultSeverity: 'medium',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Policy body calls a SECURITY DEFINER wrapper (cannot be inlined)',
    scope: 'policy-ast'
  },
  {
    code: 'P5',
    category: 'anti-pattern',
    defaultSeverity: 'high',
    direction: 'fail-open',
    title: 'Policy body references session_user / current_user / pg_has_role',
    scope: 'policy-ast'
  },
  {
    code: 'R1',
    category: 'anti-pattern',
    defaultSeverity: 'critical',
    direction: 'fail-open',
    title: 'Untrusted role holds a write privilege (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'R2',
    category: 'anti-pattern',
    defaultSeverity: 'high',
    direction: 'fail-open',
    title: 'Permissive write policy applies to an untrusted role or PUBLIC (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'R3',
    category: 'anti-pattern',
    defaultSeverity: 'medium',
    direction: 'fail-open',
    title: 'RLS table has grants TO PUBLIC (includes all current and future roles)',
    scope: 'table'
  },
  {
    code: 'L1',
    category: 'coverage',
    defaultSeverity: 'low',
    direction: 'fail-closed',
    title: 'Dead indirect grant — privilege arrives via PUBLIC or role inheritance but no policy can admit it',
    scope: 'table'
  },
  {
    code: 'L2',
    category: 'coverage',
    defaultSeverity: 'low',
    direction: 'fail-closed',
    title: 'Dead policy — a permissive policy applies to a role holding no corresponding grant',
    scope: 'table'
  },
  {
    code: 'L3',
    category: 'coverage',
    defaultSeverity: 'low',
    direction: 'fail-closed',
    title: 'Unreachable grant — object privilege without USAGE on the schema',
    scope: 'table'
  },
  {
    code: 'L4',
    category: 'coverage',
    defaultSeverity: 'info',
    direction: 'neutral',
    title: 'Dead schema USAGE — the role reaches no relation and no function in the schema (advisory)',
    scope: 'table'
  },
  {
    code: 'L5',
    category: 'anti-pattern',
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'Untrusted role reaches an RLS-off table via PUBLIC or inheritance (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L6',
    category: 'coverage',
    defaultSeverity: 'info',
    direction: 'neutral',
    title: 'Unaddressable grant — an API role holds privileges on a relation its API cannot name',
    scope: 'table'
  },
  {
    code: 'L7',
    category: 'anti-pattern',
    // Ships `info` (signal-only, zero score weight) because the rule is new
    // and unproven — NOT because the fact is minor. An unauthenticated role
    // that can SET ROLE to a role with extra grants is a real escalation, and
    // when the assumed role bypasses RLS (context.targetBypassesRls) it should
    // be `high`; escalate via config/preset once the finding proves itself.
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'Untrusted role can SET ROLE to a role with more reach (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L8',
    category: 'anti-pattern',
    // Ships `info` (signal-only, zero score weight) because the rule is new
    // and, uniquely among the L rules, reads SQL bodies rather than pure
    // catalog. The fact is not informational: a definer view handing an
    // anonymous role a table it holds no grant on is A2/L5 laundered through
    // a view, and it is `medium` on its own merits — `high` when the base
    // table has RLS the view owner is exempt from (`context.rlsBypassed`),
    // because then the view also deletes the row filter. Escalate via
    // config/preset once the finding proves itself in the field.
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'DEFINER view bypass — an untrusted role reads a base relation as the view owner (options: { roles: [...] })',
    // Reported against the base relation, and gated on `skipAstChecks` in the
    // audit rather than on `policy-ast`: the body it parses is a view's, not a
    // policy's, so turning the `P*` rules off does not turn this one off.
    scope: 'table'
  },
  {
    code: 'L9',
    category: 'anti-pattern',
    // Ships `info` for the same reason as L8, and understates the same way: a
    // definer view that is auto-updatable does not just leak rows, it lets an
    // untrusted role *write* a table it holds nothing on, as the owner. On its
    // own merits that is `high` — the write is unconditional, and when the
    // base table has RLS the owner is exempt from (`context.rlsBypassed`) it
    // also writes rows no policy would have admitted. Escalate via
    // config/preset once the finding proves itself in the field.
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'DEFINER view write — an untrusted role writes a base relation as the view owner (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L10',
    category: 'anti-pattern',
    // Ships `info` on the same new-rule posture. Note this one fires on
    // `security_invoker` views too: `security_invoker` governs the view's own
    // base relations, not the relations a rewrite rule's actions name, which
    // are checked against the rule's table owner either way (verified against
    // PG 18). A rule is also invisible to `pg_get_viewdef`, so this is reach
    // no reading of the view's definition can find.
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'Rewrite-rule bypass — a rule on a view writes a relation as the view owner (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L11',
    category: 'anti-pattern',
    // Ships `info` on the same new-rule posture, and understates: a matview is
    // a stored copy, so a SELECT grant on it is an unconditional grant on the
    // rows a REFRESH captured — RLS on the base relation never runs, and the
    // matview can carry neither policies nor `security_invoker`. On its own
    // merits that is `high` when the base is RLS-protected.
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'Materialized-view snapshot — an untrusted role reads stored rows the base relation would not serve it (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L12',
    category: 'anti-pattern',
    // Ships `info`, and is the weakest of the L-series on purpose: the leak
    // needs a leaky operator or a cheap function in the caller's own qual, so
    // it is a capability rather than an unconditional read. `medium` once
    // proven — the rows it exposes are precisely the ones the view was written
    // to withhold.
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'Non-barrier filtering view — a view is an untrusted role\'s only path to a relation but its row filter is not a boundary (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L13',
    category: 'anti-pattern',
    // Ships `info` on the same new-rule posture. The honest severity depends
    // entirely on the relation: column-level SELECT on an RLS-off table for an
    // anonymous role is the same exposure A2 calls `high`, and until this rule
    // existed nothing in the package saw it at all, because every grant query
    // read `relacl` and a column grant lives in `pg_attribute.attacl`.
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'Column-level grant — an untrusted role reaches a relation through column privileges no relation ACL shows (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L14',
    // `coverage`, not `anti-pattern`: the finding is that the audit stopped at
    // the schema boundary, not that the view is wrong. Severity stays `info`
    // however the reach is graded later — an unknown is never a proven leak,
    // and scoring one would let an excluded schema move the number.
    category: 'coverage',
    defaultSeverity: 'info',
    direction: 'neutral',
    title: 'Unaudited base relation — a definer view reads a relation in a schema the audit did not introspect (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L15',
    // The other half of L14's coverage story: there the far end was out of
    // scope, here the body itself is. Both report that nothing was graded,
    // which is why neither is scored — an unreadable view is not evidence of
    // a leak, and letting one move the number would reward opacity.
    category: 'coverage',
    defaultSeverity: 'info',
    direction: 'neutral',
    title: 'Unreadable body — an untrusted role reaches through a definer view or function whose body could not be followed (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L16',
    category: 'anti-pattern',
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'Sequence privilege — an untrusted role can advance or read a sequence, which no policy filters (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L17',
    // The A2 shape on an object where A2's remedy does not exist: Postgres
    // refuses RLS on a foreign table, so "add a policy" is not available and
    // the grant is unconditionally unfiltered.
    category: 'anti-pattern',
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'Foreign-table grant — an untrusted role reaches a relation that cannot carry RLS (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L19',
    category: 'anti-pattern',
    // The largest reach edge in the L-series, shipping on the same new-rule
    // posture as the rest. Proven, the honest severity is A2's: a definer
    // function hands an anonymous role a relation it holds nothing on, and
    // unlike a view there is no `security_invoker` default to fall back on —
    // Postgres grants EXECUTE to PUBLIC unless someone says otherwise.
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'Definer-function reach — an untrusted role touches a relation by executing a SECURITY DEFINER function (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'L20',
    category: 'anti-pattern',
    // The write half of L19, and the suppression L9 has carried since it
    // shipped: a write against a view with INSTEAD OF triggers becomes the
    // trigger function's body, so it is that function's security attribute —
    // not the view's — that decides who the write runs as.
    defaultSeverity: 'info',
    direction: 'fail-open',
    title: 'INSTEAD OF trigger write — an untrusted role writes a relation through a trigger function that runs as its owner (options: { roles: [...] })',
    scope: 'table'
  },
  {
    code: 'W1',
    category: 'meta',
    defaultSeverity: 'medium',
    direction: 'neutral',
    title: 'No exposure surface configured — the whole database is assumed reachable and the score is capped',
    scope: 'table'
  },
  {
    code: 'X1',
    category: 'index',
    defaultSeverity: 'medium',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Foreign key with no covering index (slow joins and cascading deletes)',
    scope: 'index'
  },
  {
    code: 'X2',
    category: 'index',
    defaultSeverity: 'medium',
    direction: 'neutral',
    dimension: 'perf',
    title: 'RLS policy filters on a column that is not the leading column of any index',
    scope: 'policy-ast'
  },
  {
    code: 'X3',
    category: 'index',
    defaultSeverity: 'medium',
    direction: 'neutral',
    dimension: 'perf',
    title: 'RLS policy casts or wraps its own column, defeating a plain index',
    scope: 'policy-ast'
  },
  {
    code: 'X4',
    category: 'index',
    defaultSeverity: 'low',
    direction: 'neutral',
    dimension: 'perf',
    title: 'RLS policy calls a non-LEAKPROOF function, blocking qual pushdown',
    scope: 'policy-ast'
  },
  {
    code: 'X5',
    category: 'index',
    defaultSeverity: 'low',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Redundant index — duplicated by, or a leading-column prefix of, another index',
    scope: 'index'
  },
  {
    code: 'X6',
    category: 'index',
    defaultSeverity: 'low',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Table has no primary key / no usable replica identity',
    scope: 'index'
  },
  {
    code: 'X7',
    category: 'index',
    defaultSeverity: 'medium',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Search column (tsvector/vector) with no index the search can use',
    scope: 'index'
  },
  {
    code: 'X8',
    category: 'index',
    defaultSeverity: 'info',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Sort-shaped column (timestamp/date) leads no index — heuristic advisory',
    scope: 'index'
  },
  {
    code: 'X9',
    category: 'index',
    defaultSeverity: 'medium',
    direction: 'neutral',
    dimension: 'perf',
    title: 'RLS policy calls a STABLE function per row — not wrapped in a scalar sub-select (no InitPlan)',
    scope: 'policy-ast'
  },
  {
    code: 'S1',
    category: 'index',
    defaultSeverity: 'medium',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Sequential-scan-dominant table (runtime statistics)',
    scope: 'stats'
  },
  {
    code: 'S2',
    category: 'index',
    defaultSeverity: 'low',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Index the planner has never chosen (runtime statistics)',
    scope: 'stats'
  },
  {
    code: 'S3',
    category: 'index',
    defaultSeverity: 'low',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Dead-tuple bloat — autovacuum is not keeping up (runtime statistics)',
    scope: 'stats'
  },
  {
    code: 'S4',
    category: 'index',
    defaultSeverity: 'info',
    direction: 'neutral',
    dimension: 'perf',
    title: 'Statement hotspot on a table in scope (pg_stat_statements)',
    scope: 'stats'
  },
  {
    code: 'C1',
    category: 'convention',
    defaultSeverity: 'high',
    direction: 'fail-open',
    title: 'Function sets search_path (house rule: never set it — fully-qualify instead)',
    scope: 'function-src'
  },
  {
    code: 'C2',
    category: 'convention',
    defaultSeverity: 'medium',
    direction: 'neutral',
    title: 'Function uses a #variable_conflict directive',
    scope: 'function-src'
  },
  {
    code: 'C3',
    category: 'convention',
    defaultSeverity: 'low',
    direction: 'neutral',
    title: 'Function has an unqualified relation reference (relies on search_path)',
    scope: 'function-src'
  },
  {
    code: 'C4',
    category: 'convention',
    defaultSeverity: 'high',
    direction: 'fail-open',
    title: 'Function uses dynamic SQL (waivable with a categorized reason)',
    scope: 'function-src'
  }
];

export const RULES_BY_CODE: Map<string, RuleMeta> = new Map(RULES.map((r) => [r.code, r]));

export function isKnownRule(code: string): boolean {
  return RULES_BY_CODE.has(code);
}

/** Expand a rule selector: an exact code (`P1b`) or a prefix wildcard (`P*`, `*`). */
export function expandRuleSelector(selector: string): string[] {
  if (selector.endsWith('*')) {
    const prefix = selector.slice(0, -1);
    return RULES.filter((r) => r.code.startsWith(prefix)).map((r) => r.code);
  }
  return isKnownRule(selector) ? [selector] : [];
}
