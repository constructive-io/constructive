import type { Grade, ScoringConfig } from '../config/types';
import type { Finding, Severity } from '../types';
import { meetsThreshold } from '../types';

export interface ScoreDeduction {
  code: string;
  count: number;
  points: number;
}

export interface Score {
  /** 0-100. */
  value: number;
  grade: Grade;
  /** Scoring model identifier ('density' or 'weighted'). */
  model: string;
  /** Per-rule deductions (weighted) or risk-point contributions (density), largest first. */
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
  const scorable = findings.filter((f) => f.exposed !== false && f.category !== 'meta');

  const byRule = new Map<string, { count: number; points: number }>();
  for (const f of scorable) {
    let weight = perRule[f.code] ?? weights[f.severity] ?? 0;
    if (f.direction === 'fail-closed') weight *= failClosedWeight;
    if (weight <= 0) continue;
    const entry = byRule.get(f.code) ?? { count: 0, points: 0 };
    entry.count += 1;
    entry.points += weight;
    byRule.set(f.code, entry);
  }

  const deductions: ScoreDeduction[] = [...byRule.entries()]
    .map(([code, { count, points }]) => ({ code, count, points }))
    .sort((a, b) => b.points - a.points || a.code.localeCompare(b.code));

  const riskPoints = deductions.reduce((sum, d) => sum + d.points, 0);
  const exposedTables = Math.max(1, context.exposedTables ?? 1);
  const density = riskPoints / exposedTables;

  let value = Math.round(100 * Math.exp(-k * density) * 10) / 10;

  const cap = config.unknownExposureCap ?? DEFAULT_UNKNOWN_EXPOSURE_CAP;
  const capped = context.exposureKnown === false && cap !== false && value > cap;
  if (capped) value = cap;

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
    ...(capped ? { cappedByUnknownExposure: true } : {})
  };
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

  const scorable = findings.filter((f) => f.exposed !== false && f.category !== 'meta');

  const byRule = new Map<string, { count: number; points: number }>();
  for (const f of scorable) {
    const weight = perRule[f.code] ?? weights[f.severity] ?? 0;
    const entry = byRule.get(f.code) ?? { count: 0, points: 0 };
    entry.count += 1;
    entry.points += weight;
    byRule.set(f.code, entry);
  }

  const deductions: ScoreDeduction[] = [...byRule.entries()]
    .map(([code, { count, points }]) => ({ code, count, points: Math.min(points, cap) }))
    .filter((d) => d.points > 0)
    .sort((a, b) => b.points - a.points || a.code.localeCompare(b.code));

  const total = deductions.reduce((sum, d) => sum + d.points, 0);
  let value = Math.max(0, Math.round((100 - total) * 10) / 10);

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
