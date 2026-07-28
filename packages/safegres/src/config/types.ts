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

export interface ScoringConfig {
  /** Points deducted per finding of each severity. */
  weights?: Partial<Record<Severity, number>>;
  /** Per-rule weight override — beats the severity weight. */
  perRuleWeights?: Record<string, number>;
  /** Cap on total deduction any single rule can contribute. */
  maxDeductionPerRule?: number;
  /** Any finding at/above this severity caps the grade (e.g. 'critical' -> 'C'). */
  floorOnCritical?: Grade | false;
  /** Minimum score for each grade; anything below the lowest is 'F'. */
  gradeBands?: Partial<Record<Exclude<Grade, 'F'>, number>>;
}

export interface FailOnConfig {
  /** Exit non-zero if any finding is at/above this severity. */
  severity?: Severity;
  /** Exit non-zero if the score is below this value (0-100). */
  score?: number;
  /** Exit non-zero if the grade is below this letter. */
  grade?: Grade;
}

/**
 * The full safegres configuration, loadable from `safegres.config.{ts,js,mjs,cjs}`,
 * `.safegresrc{,.json,.yaml,.yml,.js}`, `safegres.json`, or the `"safegres"`
 * key in package.json.
 */
export interface SafegresConfig {
  /** Presets (`safegres:recommended`, …), relative paths, or npm packages. */
  extends?: string | string[];
  schemas?: string[];
  excludeSchemas?: string[];
  roles?: string[];
  excludeRoles?: string[];
  rules?: RulesConfig;
  overrides?: OverrideEntry[];
  scoring?: ScoringConfig;
  failOn?: FailOnConfig;
}
