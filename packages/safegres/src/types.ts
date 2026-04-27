/**
 * Report types for the safegres audit.
 *
 * Kept intentionally minimal and dependency-free so they can be imported
 * by downstream packages (e.g. `@constructive-db/rls-audit-constructive`)
 * without pulling in `pg` or `pgsql-parser`.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0
};

export interface Finding {
  /** Finding code, e.g. `A1`, `P7`. Stable across versions. */
  code: string;
  severity: Severity;
  /** High-level bucket — helps renderers group findings. */
  category: 'flags' | 'coverage' | 'anti-pattern' | 'sync' | 'match' | 'meta';
  /** Schema-qualified location, where applicable. */
  schema?: string;
  table?: string;
  policy?: string;
  role?: string;
  privilege?: string;
  /** Human-readable summary. */
  message: string;
  /** Optional remediation hint / pointer to docs. */
  hint?: string;
  /** Optional machine-readable extras (AST nodes, offending function name, …). */
  context?: Record<string, unknown>;
}

export interface Summary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface Report {
  version: string;
  generatedAt: string;
  summary: Summary;
  findings: Finding[];
}

export function newSummary(): Summary {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

export function summarize(findings: Finding[]): Summary {
  const s = newSummary();
  for (const f of findings) s[f.severity] += 1;
  return s;
}

export function meetsThreshold(sev: Severity, threshold: Severity): boolean {
  return SEVERITY_ORDER[sev] >= SEVERITY_ORDER[threshold];
}
