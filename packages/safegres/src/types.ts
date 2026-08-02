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
   * Whether the finding's table is on the resolved exposure surface — i.e.
   * reachable on the *primary* plane. `undefined` when no exposure surface is
   * known (everything is assumed reachable).
   */
  exposed?: boolean;
  /**
   * Every access plane the finding is reachable on, by name. A relation that
   * is internal to the API can still be reachable by a role holding a direct
   * connection, and this is where that shows up. Not part of a finding's
   * identity: baselines and comparisons key on the finding, not on who can
   * reach it.
   */
  planes?: string[];
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
  /**
   * Proof attached by `--explain`: the plan the database produced for the
   * query shape this finding is a claim about.
   */
  evidence?: FindingEvidence;
}

/**
 * Planner evidence for a finding. `refuted` means the planner disagreed with
 * the catalog inference — the finding is reported but no longer scored.
 */
export interface FindingEvidence {
  source: 'explain';
  status: 'confirmed' | 'refuted' | 'inconclusive';
  /** The probe query, with parameters left unbound. */
  probe: string;
  /** Plan node types, outermost first. */
  plan: string;
  /** Why an inconclusive probe was inconclusive. */
  note?: string;
}

export interface Summary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

/**
 * One graded access plane: a way into the database, with its own score.
 *
 * The primary plane is the declared API surface, and its score *is*
 * `report.score` — secondary planes never move it. They answer the question
 * the headline cannot: what does this database grade for somebody who does
 * not come through the API?
 */
export interface PlaneReport {
  name: string;
  kind: 'api' | 'role' | 'schema';
  /** The headline plane. Exactly one plane is primary. */
  primary: boolean;
  /** Adapter name, `config`, or `none`. */
  source: string;
  schemas: string[];
  roles?: string[];
  /** Relations the plane reaches (the density denominator). */
  exposedTables: number;
  /** Role planes: the most direct way the reach arrives. */
  reachedVia?: 'grant' | 'PUBLIC' | 'inheritance';
  /** Security score for this plane, same model as the headline. */
  score: import('./score/score').Score;
  /** Severity counts for the findings reachable on this plane. */
  summary: Summary;
  /** Present when the plane was reported but deliberately not graded. */
  skipped?: string;
}

/** The resolved exposure surface an audit was scored against. */
export interface ExposureReport {
  /** True when a surface was configured or auto-resolved. */
  known: boolean;
  /** Where the surface came from: an adapter name, `config`, or `none`. */
  source: string;
  /** Name of the primary plane. */
  plane?: string;
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
  /**
   * Diff against a committed perf baseline (`--perf-baseline`): which findings
   * are new debt, which were fixed, which are accepted.
   */
  diff?: import('./perf/baseline').PerfDiff;
  /** Runtime-statistics provenance, present when the audit ran with `--stats`. */
  stats?: PerfStatsReport;
  /**
   * Access-path classification: how many foreign keys X1 was not applied to,
   * because nothing reads them. Reported so a suppression this broad is never
   * silent.
   */
  paths?: PerfPathsReport;
  /** Planner-proof summary, present when the audit ran with `--explain`. */
  explain?: import('./perf/explain').ExplainReport;
}

/**
 * What the access-path signals found, and what X1 did about it. Reported so
 * the evidence is visible even when — as by default — it changes nothing.
 */
export interface PerfPathsReport {
  /** Foreign keys examined. */
  total: number;
  /** Keys with a `read` signal: an RLS policy or a view names the column. */
  read: number;
  /** Keys whose only signals are shape: they look like provisioning pointers. */
  writeOnceShaped: number;
  /** Tables carrying enough write-once pointers to look like config records. */
  tables: number;
  /** What X1 did with the write-once-shaped keys. */
  onWriteOncePointer: 'report' | 'demote' | 'suppress';
}

/** Where the `S*` findings' numbers came from, and how much to trust them. */
export interface PerfStatsReport {
  source: 'live';
  /** Tables whose cumulative statistics were read. */
  tables: number;
  /** When the counters were last reset — the window the numbers describe. */
  statsReset: string | null;
  /** Whether `S*` findings counted toward the perf score. */
  scored: boolean;
  /** Non-fatal gaps, e.g. `pg_stat_statements` not installed. */
  notes?: string[];
}

/**
 * The per-role exposure report: the direct answer to "what can role X
 * access?", computed over effective grants (direct, TO PUBLIC, inherited)
 * for the configured untrusted roles. Present whenever such roles are
 * configured (e.g. L5/R1 options), independent of any findings.
 */
export interface RoleAccessReport {
  roles: import('./checks/lattice').RoleAccessEntry[];
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
   * Every graded access plane, primary first. `planes[0].score` is
   * `report.score`; the rest are advisory unless `failOn.planes` opts them
   * into gating.
   */
  planes?: PlaneReport[];
  /** Effective per-role access, for the configured untrusted roles. */
  roleAccess?: RoleAccessReport;
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
  /**
   * Movement against a previous run (`--compare`): score deltas, severity
   * deltas and the rules that changed. A report describes a database; this is
   * the only part that describes a change to one.
   */
  comparison?: import('./report/compare').ReportComparison;
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
