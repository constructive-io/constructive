/**
 * Report types for the safegres audit.
 *
 * Kept intentionally minimal and dependency-free so they can be imported
 * by downstream packages (e.g. `@constructive-db/rls-audit-constructive`)
 * without pulling in `pg` or `pgsql-parser`.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Which way a finding fails:
 * - `fail-open`   — the untrusted side can read/write more than intended (a leak).
 * - `fail-closed` — the operation is denied at runtime; an availability/hygiene
 *                   concern, not an exposure. Excluded from the score by default.
 * - `neutral`     — directionless (performance, meta).
 */
export type Direction = 'fail-open' | 'fail-closed' | 'neutral';

/**
 * Which axis a finding is scored on. `security` findings drive `report.score`;
 * `perf` findings drive `report.perf.score`. The two are never mixed — a
 * database can be an A+ on security and a D on index hygiene, and both
 * numbers stay meaningful.
 */
export type Dimension = 'security' | 'perf';

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
  category: 'flags' | 'coverage' | 'anti-pattern' | 'index' | 'sync' | 'match' | 'meta';
  /** Leak vs deny vs directionless. Stamped from the rule registry. */
  direction?: Direction;
  /** Scoring axis. Stamped from the rule registry; defaults to `security`. */
  dimension?: Dimension;
  /**
   * Whether the finding's table is on the resolved exposure surface.
   * `undefined` when no exposure surface is known (everything is assumed
   * reachable).
   */
  exposed?: boolean;
  /**
   * The finding is acknowledged by config as intentional (e.g. an open read
   * on a table declared in `public.read`) — reported, but excluded from the
   * score.
   */
  acknowledged?: boolean;
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

/** The resolved exposure surface an audit was scored against. */
export interface ExposureReport {
  /** True when a surface was configured or auto-resolved. */
  known: boolean;
  /** Where the surface came from. */
  source: 'config' | 'constructive' | 'none';
  /** Schemas reachable from the exposed APIs. Empty when unknown. */
  schemas: string[];
  /** API-edge roles, when the resolver can discover them. */
  roles?: string[];
  /** Tables on the exposed surface (the score denominator). */
  exposedTables: number;
  /** All tables the audit introspected. */
  totalTables: number;
}

/**
 * The optional performance dimension (`--perf`): index-hygiene and
 * policy-cost findings, scored on their own 0-100 axis against the same
 * exposure surface.
 */
export interface PerfReport {
  /** Perf-dimension findings (also present in `report.findings`). */
  findings: Finding[];
  summary: Summary;
  /** Perf score — computed only over perf-dimension findings. */
  score: import('./score/score').Score;
}

export interface Report {
  version: string;
  generatedAt: string;
  summary: Summary;
  findings: Finding[];
  /** Config-driven audit score (weighted deductions, 0-100 + grade). */
  score?: import('./score/score').Score;
  /** Performance dimension, present when the audit ran with `perf` enabled. */
  perf?: PerfReport;
  /** The exposure surface the score was computed against. */
  exposure?: ExposureReport;
  /**
   * Unscored call-graph audit (`--call-graph`): trust boundaries reachable
   * from the exposed entry points, for human review.
   */
  callGraph?: import('./callgraph/graph').CallGraphReport;
  /**
   * Diff against a committed call-graph baseline (`--baseline`): trust
   * boundaries added since the snapshot (require sign-off) and boundaries
   * that were resolved.
   */
  callGraphDiff?: import('./callgraph/baseline').CallGraphDiff;
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
