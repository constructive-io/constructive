import type { Finding, Severity } from '../types';

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
  title: string;
  /**
   * Rules with `scope: 'policy-ast'` require parsing policy expressions.
   * When every one of them is disabled the audit skips AST work entirely.
   */
  scope: 'table' | 'policy-ast';
}

export const RULES: RuleMeta[] = [
  {
    code: 'A1',
    category: 'flags',
    defaultSeverity: 'critical',
    title: 'RLS enabled but no policies (effectively deny-all)',
    scope: 'table'
  },
  {
    code: 'A2',
    category: 'flags',
    defaultSeverity: 'high',
    title: 'Grants exist on a table with RLS disabled',
    scope: 'table'
  },
  {
    code: 'A3',
    category: 'flags',
    defaultSeverity: 'medium',
    title: 'RLS enabled but FORCE ROW LEVEL SECURITY not set (owner bypass)',
    scope: 'table'
  },
  {
    code: 'A4',
    category: 'coverage',
    defaultSeverity: 'high',
    title: 'INSERT/UPDATE/DELETE grant with no covering policy for that verb',
    scope: 'table'
  },
  {
    code: 'A5',
    category: 'coverage',
    defaultSeverity: 'medium',
    title: 'SELECT grant with no covering policy (silent empty result)',
    scope: 'table'
  },
  {
    code: 'A6',
    category: 'coverage',
    defaultSeverity: 'info',
    title: 'UPDATE has USING but no WITH CHECK (row-smuggling surface)',
    scope: 'table'
  },
  {
    code: 'A7',
    category: 'anti-pattern',
    defaultSeverity: 'high',
    title: 'Trivially-permissive policy (USING (true) / WITH CHECK (true))',
    scope: 'policy-ast'
  },
  {
    code: 'P1',
    category: 'anti-pattern',
    defaultSeverity: 'high',
    title: 'Policy body calls a VOLATILE function (per-row evaluation)',
    scope: 'policy-ast'
  },
  {
    code: 'P1b',
    category: 'anti-pattern',
    defaultSeverity: 'medium',
    title: 'Policy body calls a SECURITY DEFINER wrapper (cannot be inlined)',
    scope: 'policy-ast'
  },
  {
    code: 'P5',
    category: 'anti-pattern',
    defaultSeverity: 'high',
    title: 'Policy body references session_user / current_user / pg_has_role',
    scope: 'policy-ast'
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
