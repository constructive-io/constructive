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
  scoring?: ScoringConfig;
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
