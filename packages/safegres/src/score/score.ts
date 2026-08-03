import type { Grade, ScoringConfig } from '../config/types';
import { RULES_BY_CODE } from '../rules/registry';
import type { Finding, Severity } from '../types';
import { meetsThreshold } from '../types';

export interface ScoreDeduction {
  code: string;
  count: number;
  points: number;
  /**
   * What the audit would score if this rule were its only problem — the same
   * curve applied to this rule's points alone. Grades the rule rather than
   * the database.
   */
  score: number;
  grade: Grade;
  /**
   * Score the audit would *gain* by taking this rule to zero. Not
   * interchangeable with `score`: because the curve is exponential a rule's
   * payoff depends on how much other debt exists, so the same fix is worth
   * more once the rest is clean.
   */
  potential: number;
  /**
   * The rule contributes no points by construction — every finding is
   * `info`-weighted or fail-closed. Reported so a run cannot imply that
   * fixing them would move the score; it cannot.
   */
  unscored?: boolean;
  /**
   * The rule's raw points exceeded `maxRuleDensity` and were cut to it. The
   * finding count is unchanged: what is capped is the rule's influence on the
   * score, not the size of the problem it reports.
   */
  capped?: boolean;
  /**
   * Distinct units of repair behind `count`, when a rule declares one
   * (`RuleMeta.dedupBy`). Points are charged per unit, so a rule that emits
   * one finding per (relation × function) pair costs what fixing it costs.
   */
  units?: number;
}

export interface Score {
  /** 0-100. */
  value: number;
  grade: Grade;
  /** Scoring model identifier ('density' or 'weighted'). */
  model: string;
  /**
   * Every rule that produced a scorable finding, largest deduction first,
   * with its own score, grade and payoff-to-fix. Rules that contribute no
   * points (info-weighted, fail-closed) are listed last and flagged
   * `unscored` rather than omitted — a report that silently drops them
   * implies that fixing them would help, and it would not.
   */
  deductions: ScoreDeduction[];
  /** Density model: risk points per exposed table. */
  density?: number;
  /** Density model: the exposed-table denominator. */
  exposedTables?: number;
  /** True when the score was capped because no exposure surface was known. */
  cappedByUnknownExposure?: boolean;
}

/** Context the audit supplies for exposure-aware scoring. */
export interface ScoreContext {
  /** Number of tables on the exposed surface (the density denominator). */
  exposedTables?: number;
  /** Whether an exposure surface was configured/resolved. */
  exposureKnown?: boolean;
}

export const DEFAULT_WEIGHTS: Record<Severity, number> = {
  critical: 25,
  high: 10,
  medium: 4,
  low: 1,
  info: 0
};

export const DEFAULT_GRADE_BANDS: Record<Exclude<Grade, 'F'>, number> = {
  'A+': 97,
  A: 90,
  B: 80,
  C: 65,
  D: 50
};

const DEFAULT_MAX_DEDUCTION_PER_RULE = 40;
const DEFAULT_MAX_RULE_DENSITY = 0.5;
const DEFAULT_DENSITY_K = 0.17;
const DEFAULT_UNKNOWN_EXPOSURE_CAP = 80;
const DEFAULT_FAIL_CLOSED_WEIGHT = 0;

/**
 * Compute the audit score. The score is config-driven by design: disabling
 * or retuning rules changes the findings and therefore the score, and only
 * findings on the exposed surface count (see `Finding.exposed`).
 */
export function computeScore(
  findings: Finding[],
  config: ScoringConfig = {},
  context: ScoreContext = {}
): Score {
  const model = config.model ?? 'density';
  return model === 'weighted'
    ? computeWeightedScore(findings, config, context)
    : computeDensityScore(findings, config, context);
}

/**
 * Density scoring: severity-weighted *scorable* findings per exposed table
 * with exponential falloff — does not saturate on large schemas.
 *
 *   score = 100 · exp(−k · riskPoints / exposedTables)
 *
 * Scorable findings are those on the exposed surface (`exposed !== false`)
 * that are not fail-closed (fail-closed weights are multiplied by
 * `failClosedWeight`, default 0 — denied-at-runtime hygiene doesn't reduce
 * the score). With the default k, one critical per ~10 exposed tables lands
 * around a C; one critical per table is an F.
 *
 * Two things keep a rule's *shape* out of the arithmetic. Points are charged
 * per unit of repair, not per finding, for rules that declare one — a rule
 * emitting a row per (relation × function) pair costs what fixing it costs.
 * And each rule's total is capped at a fraction of the points that would fail
 * an audit alone (`maxRuleDensity`), so no single rule can decide the grade.
 */
function computeDensityScore(
  findings: Finding[],
  config: ScoringConfig,
  context: ScoreContext
): Score {
  const weights = { ...DEFAULT_WEIGHTS, ...(config.weights ?? {}) };
  const perRule = config.perRuleWeights ?? {};
  const bands = { ...DEFAULT_GRADE_BANDS, ...(config.gradeBands ?? {}) };
  const floor = config.floorOnCritical === undefined ? 'C' : config.floorOnCritical;
  const k = config.densityK ?? DEFAULT_DENSITY_K;
  const failClosedWeight = config.failClosedWeight ?? DEFAULT_FAIL_CLOSED_WEIGHT;

  // Meta findings (e.g. W1) are advisories about the audit itself — the
  // unknown-exposure cap is their penalty, not weighted points.
  const scorable = findings.filter((f) => f.exposed !== false && !f.acknowledged && f.category !== 'meta');

  const exposedTables = Math.max(1, context.exposedTables ?? 1);

  const byRule = new Map<string, RuleTally>();
  for (const f of scorable) {
    let weight = perRule[f.code] ?? weights[f.severity] ?? 0;
    if (f.direction === 'fail-closed') weight *= failClosedWeight;
    const entry = byRule.get(f.code) ?? { count: 0, points: 0, units: new Set<string>() };
    entry.count += 1;
    // A rule with a declared unit of repair is charged once per unit: the
    // second finding against the same function is the same fix, and letting
    // it charge again grades fan-out rather than risk.
    const unit = repairUnit(f);
    if (unit === undefined || !entry.units.has(unit)) {
      entry.points += Math.max(0, weight);
      if (unit !== undefined) entry.units.add(unit);
    }
    byRule.set(f.code, entry);
  }

  // No single rule may contribute more than `maxRuleDensity` of the points
  // that would take the score to F alone — at the default half, one rule can
  // cost two grade bands but an F still takes breadth. Solved from the curve
  // rather than fixed, so retuning `k` or the bands moves the cap with them.
  const maxRuleDensity = config.maxRuleDensity ?? DEFAULT_MAX_RULE_DENSITY;
  const pointsToF = (Math.log(100 / (bands.D || 50)) / k) * exposedTables;
  const ruleCap = maxRuleDensity === false ? Infinity : maxRuleDensity * pointsToF;

  const capped = new Map<string, { count: number; points: number; raw: number; units?: number }>();
  for (const [code, tally] of byRule) {
    capped.set(code, {
      count: tally.count,
      points: Math.min(tally.points, ruleCap),
      raw: tally.points,
      ...(tally.units.size > 0 ? { units: tally.units.size } : {})
    });
  }

  const riskPoints = [...capped.values()].reduce((sum, r) => sum + r.points, 0);
  const density = riskPoints / exposedTables;
  const curve = (points: number) => round1(100 * Math.exp((-k * points) / exposedTables));

  let value = round1(100 * Math.exp(-k * density));

  const deductions: ScoreDeduction[] = [...capped.entries()]
    .map(([code, { count, points, raw, units }]) => ({
      code,
      count,
      points,
      score: curve(points),
      grade: gradeFor(curve(points), bands),
      potential: round1(curve(riskPoints - points) - value),
      ...(units !== undefined && units !== count ? { units } : {}),
      ...(raw > points ? { capped: true } : {}),
      ...(points === 0 ? { unscored: true } : {})
    }))
    .sort(byPayoff);

  const unknownCap = config.unknownExposureCap ?? DEFAULT_UNKNOWN_EXPOSURE_CAP;
  const cappedByUnknown = context.exposureKnown === false && unknownCap !== false && value > unknownCap;
  if (cappedByUnknown) value = unknownCap;

  let grade = gradeFor(value, bands);
  if (
    floor
    && scorable.some(
      (f) => f.direction !== 'fail-closed' && meetsThreshold(f.severity, 'critical')
    )
  ) {
    grade = worseOf(grade, floor);
  }

  return {
    value,
    grade,
    model: 'density',
    deductions,
    density: Math.round(density * 1000) / 1000,
    exposedTables,
    ...(cappedByUnknown ? { cappedByUnknownExposure: true } : {})
  };
}

interface RuleTally {
  count: number;
  points: number;
  /** Distinct repair units seen, for rules that declare one. */
  units: Set<string>;
}

/**
 * The finding's unit of repair, from the rule's declared `dedupBy` path.
 * `undefined` when the rule declares none — one finding, one unit.
 */
function repairUnit(finding: Finding): string | undefined {
  const path = RULES_BY_CODE.get(finding.code)?.dedupBy;
  if (!path) return undefined;
  let value: unknown = finding;
  for (const key of path.split('.')) {
    if (value === null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return typeof value === 'string' ? value : undefined;
}

/**
 * Legacy weighted-deduction scoring (Lighthouse-style): each finding deducts
 * points by severity (or per-rule override), capped per rule so one noisy
 * rule can't zero the score alone. Any critical finding floors the grade
 * (default 'C'). Saturates on large schemas — prefer the density model.
 */
function computeWeightedScore(
  findings: Finding[],
  config: ScoringConfig,
  context: ScoreContext
): Score {
  const weights = { ...DEFAULT_WEIGHTS, ...(config.weights ?? {}) };
  const perRule = config.perRuleWeights ?? {};
  const cap = config.maxDeductionPerRule ?? DEFAULT_MAX_DEDUCTION_PER_RULE;
  const bands = { ...DEFAULT_GRADE_BANDS, ...(config.gradeBands ?? {}) };
  const floor = config.floorOnCritical === undefined ? 'C' : config.floorOnCritical;

  const scorable = findings.filter((f) => f.exposed !== false && !f.acknowledged && f.category !== 'meta');

  const byRule = new Map<string, { count: number; points: number }>();
  for (const f of scorable) {
    const weight = perRule[f.code] ?? weights[f.severity] ?? 0;
    const entry = byRule.get(f.code) ?? { count: 0, points: 0 };
    entry.count += 1;
    entry.points += weight;
    byRule.set(f.code, entry);
  }

  const byRuleCapped = [...byRule.entries()].map(
    ([code, { count, points }]) => [code, { count, points: Math.min(points, cap) }] as const
  );

  const total = byRuleCapped.reduce((sum, [, r]) => sum + r.points, 0);
  let value = Math.max(0, round1(100 - total));

  const remainder = (points: number) => Math.max(0, round1(100 - (total - points)));
  const deductions: ScoreDeduction[] = byRuleCapped
    .map(([code, { count, points }]) => ({
      code,
      count,
      points,
      score: Math.max(0, round1(100 - points)),
      grade: gradeFor(Math.max(0, round1(100 - points)), bands),
      potential: round1(remainder(points) - value),
      ...(points === 0 ? { unscored: true } : {})
    }))
    .sort(byPayoff);

  const unknownCap = config.unknownExposureCap ?? DEFAULT_UNKNOWN_EXPOSURE_CAP;
  const capped = context.exposureKnown === false && unknownCap !== false && value > unknownCap;
  if (capped) value = unknownCap;

  let grade = gradeFor(value, bands);
  if (floor && scorable.some((f) => meetsThreshold(f.severity, 'critical'))) {
    grade = worseOf(grade, floor);
  }

  return {
    value,
    grade,
    model: 'weighted',
    deductions,
    ...(capped ? { cappedByUnknownExposure: true } : {})
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Scored rules first, largest deduction at the top; unscored rules last, in
 * code order. Points and payoff rank identically under a monotone curve, so
 * this keeps the existing "top deductions" output stable.
 */
function byPayoff(a: ScoreDeduction, b: ScoreDeduction): number {
  if (!!a.unscored !== !!b.unscored) return a.unscored ? 1 : -1;
  return b.points - a.points || a.code.localeCompare(b.code);
}

const GRADE_ORDER: Grade[] = ['A+', 'A', 'B', 'C', 'D', 'F'];

function gradeFor(value: number, bands: Record<Exclude<Grade, 'F'>, number>): Grade {
  for (const grade of GRADE_ORDER) {
    if (grade === 'F') break;
    if (value >= bands[grade]) return grade;
  }
  return 'F';
}

function worseOf(a: Grade, b: Grade): Grade {
  return GRADE_ORDER.indexOf(a) >= GRADE_ORDER.indexOf(b) ? a : b;
}

/** True when `grade` is at least as good as `minimum`. */
export function meetsGrade(grade: Grade, minimum: Grade): boolean {
  return GRADE_ORDER.indexOf(grade) <= GRADE_ORDER.indexOf(minimum);
}
