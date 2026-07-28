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
  /** Scoring model identifier (currently always 'weighted'). */
  model: string;
  /** Per-rule deductions, largest first. */
  deductions: ScoreDeduction[];
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

/**
 * Weighted-deduction scoring (Lighthouse-style): each finding deducts points
 * by severity (or per-rule override), capped per rule so one noisy rule can't
 * zero the score alone. Any critical finding floors the grade (default 'C').
 *
 * The score is config-driven by design: disabling or retuning rules changes
 * the findings and therefore the score.
 */
export function computeScore(findings: Finding[], config: ScoringConfig = {}): Score {
  const weights = { ...DEFAULT_WEIGHTS, ...(config.weights ?? {}) };
  const perRule = config.perRuleWeights ?? {};
  const cap = config.maxDeductionPerRule ?? DEFAULT_MAX_DEDUCTION_PER_RULE;
  const bands = { ...DEFAULT_GRADE_BANDS, ...(config.gradeBands ?? {}) };
  const floor = config.floorOnCritical === undefined ? 'C' : config.floorOnCritical;

  const byRule = new Map<string, { count: number; points: number }>();
  for (const f of findings) {
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
  const value = Math.max(0, Math.round((100 - total) * 10) / 10);

  let grade = gradeFor(value, bands);
  if (floor && findings.some((f) => meetsThreshold(f.severity, 'critical'))) {
    grade = worseOf(grade, floor);
  }

  return { value, grade, model: 'weighted', deductions };
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
