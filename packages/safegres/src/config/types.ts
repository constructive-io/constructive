import type { Severity } from '../types';

/**
 * `'off'` disables a rule; a severity retunes it; `[severity, options]`
 * reserves room for rule-specific options (forward-compatible).
 */
export type RuleSetting = 'off' | Severity | [Severity, Record<string, unknown>];

/**
 * Rule settings keyed by rule code or prefix wildcard (`A*`, `P*`, `*`).
 * Exact codes always win over wildcards.
 */
export type RulesConfig = Record<string, RuleSetting>;

/** Per-scope retuning, ESLint `overrides`-style. */
export interface OverrideEntry {
  /**
   * Glob patterns matched against the qualified `schema.table` name
   * (`*` matches any run of characters), e.g. `public.audit_log`, `metrics.*`.
   */
  tables: string[];
  rules: RulesConfig;
}

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * The exposure surface: what is actually reachable through the exposed APIs.
 * Findings on non-exposed schemas contribute nothing to the score — they are
 * reported as internal advisories. When no surface is configured or
 * resolvable, the whole database is assumed reachable, a W1 warning is
 * emitted, and the score is capped.
 */
export interface ExposureConfig {
  /**
   * How to resolve the surface:
   * - `static` (default): use `schemas` / `roles` as given.
   * - `constructive`: introspect the Constructive routing plane
   *   (`routing_public.apis` → `api_schemas` → `metaschema_public.schema`,
   *   plus the platform plane) to discover exposed schemas and API roles.
   */
  resolver?: 'static' | 'constructive';
  /** Schemas reachable from the exposed APIs (static resolver). */
  schemas?: string[];
  /** Roles reachable from the API edge (static resolver). */
  roles?: string[];
}

/**
 * Declared-public surface: intent, stated in config. Open reads on declared
 * tables are acknowledged — reported as info and excluded from the score.
 * Open reads anywhere else stay findings, even in `*_public`-named schemas;
 * naming is never treated as intent.
 */
export interface PublicConfig {
  /**
   * Glob patterns matched against the qualified `schema.table` name
   * (`*` matches any run of characters) for tables whose open SELECT
   * (`USING (true)`) policies are by design, e.g. reference/pricing tables
   * or a deliberate public directory.
   */
  read?: string[];
}

export interface ScoringConfig {
  /**
   * Scoring model:
   * - `density` (default): severity-weighted findings per exposed table with
   *   exponential falloff — does not saturate on large schemas.
   * - `weighted`: legacy flat deductions with a per-rule cap.
   */
  model?: 'density' | 'weighted';
  /** Points deducted per finding of each severity. */
  weights?: Partial<Record<Severity, number>>;
  /** Per-rule weight override — beats the severity weight. */
  perRuleWeights?: Record<string, number>;
  /** Cap on total deduction any single rule can contribute (weighted model). */
  maxDeductionPerRule?: number;
  /**
   * Multiplier applied to fail-closed findings' weights (density model).
   * Default 0 — denied-at-runtime hygiene findings don't reduce the score.
   */
  failClosedWeight?: number;
  /** Density falloff constant (density model). Default 0.17. */
  densityK?: number;
  /**
   * Maximum score when no exposure surface is configured/resolvable.
   * Default 80. `false` disables the cap.
   */
  unknownExposureCap?: number | false;
  /** Any finding at/above this severity caps the grade (e.g. 'critical' -> 'C'). */
  floorOnCritical?: Grade | false;
  /** Minimum score for each grade; anything below the lowest is 'F'. */
  gradeBands?: Partial<Record<Exclude<Grade, 'F'>, number>>;
}

/**
 * The optional performance dimension: index-hygiene and policy-cost rules
 * (`X*`, plus P1/P1b), scored on their own axis against the same exposure
 * surface. Off by default — `safegres perf` / `--perf` / `enabled: true`.
 */
export interface PerfConfig {
  /** Collect and score perf findings without passing `--perf`. */
  enabled?: boolean;
  /**
   * Rule settings for perf-dimension codes only. Applied on top of the
   * top-level `rules`; naming a security rule here is a config error.
   */
  rules?: RulesConfig;
  /**
   * Glob patterns matched against the qualified `schema.table` name for
   * tables whose perf findings are intentional (cold audit logs, tiny
   * lookup tables the planner will seq-scan anyway). Acknowledged findings
   * are reported as info and excluded from the perf score.
   */
  ignore?: string[];
  /** Scoring settings for the perf axis (defaults mirror the security score). */
  scoring?: PerfScoringConfig;
  /** Runtime statistics (`--stats`, `S*`). Off unless enabled here or by flag. */
  stats?: PerfStatsConfig;
  /** Planner proof (`--explain`). Off unless enabled here or by flag. */
  explain?: PerfExplainConfig;
}

export interface PerfScoringConfig extends ScoringConfig {
  /**
   * Whether runtime-statistics findings (`S*`) count toward the perf score.
   * Default true — asking for `--stats` is the opt-in. Set false to keep the
   * grade purely deterministic and read the `S*` findings as advisories.
   */
  includeStats?: boolean;
}

/**
 * Thresholds for the runtime-statistics rules. Every one is a floor: below
 * it the workload hasn't said enough for the finding to mean anything.
 */
export interface PerfStatsConfig {
  /** Collect and check runtime statistics without passing `--stats`. */
  enabled?: boolean;
  /** Ignore tables with fewer live rows than this. Default 1000. */
  minRows?: number;
  /** S1 fires when sequential scans exceed index scans by this factor. Default 10. */
  seqScanRatio?: number;
  /** S2 ignores indexes smaller than this many bytes. Default 1048576 (1 MiB). */
  minIndexBytes?: number;
  /** S3 fires above this dead/live tuple ratio. Default 0.2. */
  deadTupleRatio?: number;
  /** S4 fires for statements at or above this share of total time. Default 0.05. */
  minTimeShare?: number;
  /** S4 reports at most this many statements. Default 5. */
  topStatements?: number;
}

export interface PerfExplainConfig {
  /** Probe findings with EXPLAIN without passing `--explain`. */
  enabled?: boolean;
  /**
   * Below this planner row estimate a sequential scan is the right plan, so a
   * probe can refute a finding but never confirm one. Default 1000.
   */
  minRows?: number;
}

/**
 * Extension objects are a database's `node_modules`: they live in the same
 * catalog and scan like anything else, but they are the extension author's
 * to secure and tune, and altering them breaks `pg_dump` and upgrades.
 */
export interface ExtensionsConfig {
  /**
   * Skip relations an extension owns (`pg_depend.deptype = 'e'`) and their
   * partitions. Default `true`. Set `false` to audit them anyway — useful
   * when auditing an extension itself.
   */
  skipOwned?: boolean;
  /**
   * Extension names whose *schemas* are skipped wholesale, for objects an
   * extension creates at runtime and never registers as dependencies.
   * `pg_partman` is the motivating case: its child partitions and templates
   * carry no dependency on the extension, so ownership alone misses them.
   * Unknown or uninstalled names are ignored.
   */
  ignore?: string[];
}

export interface FailOnConfig {
  /** Exit non-zero if any finding is at/above this severity. */
  severity?: Severity;
  /** Exit non-zero if the score is below this value (0-100). */
  score?: number;
  /** Exit non-zero if the grade is below this letter. */
  grade?: Grade;
  /** Exit non-zero if the perf score is below this value (0-100). */
  perfScore?: number;
  /** Exit non-zero if the perf grade is below this letter. */
  perfGrade?: Grade;
}

/**
 * The full safegres configuration, loadable from `safegres.config.{ts,js,mjs,cjs}`,
 * `.safegresrc{,.json,.yaml,.yml,.js}`, `safegres.json`, or the `"safegres"`
 * key in package.json.
 */
export interface SafegresConfig {
  /** Presets (`safegres:recommended`, …), relative paths, or npm packages. */
  extends?: string | string[];
  /** The exposed API surface — what the score is computed against. */
  exposure?: ExposureConfig;
  /** Tables whose open reads are deliberate (declared public surface). */
  public?: PublicConfig;
  /** How to treat objects belonging to installed extensions. */
  extensions?: ExtensionsConfig;
  /** The optional performance dimension. */
  perf?: PerfConfig;
  schemas?: string[];
  excludeSchemas?: string[];
  roles?: string[];
  excludeRoles?: string[];
  rules?: RulesConfig;
  overrides?: OverrideEntry[];
  scoring?: ScoringConfig;
  failOn?: FailOnConfig;
}
