/**
 * Comparison against a previous run (`--compare <file>`).
 *
 * A report says what the database is; it never says what changed. In CI that
 * is the only question a reviewer has — the PR comment reads "Performance 75.0
 * (C)" whether the branch improved it by ten points or cost ten, and the
 * numbers are only legible to someone who remembers yesterday's.
 *
 * The previous run is supplied as a file rather than inferred: a scanner has
 * no memory and no business acquiring one, so CI decides what "previous" means
 * (the artifact from the base branch, a committed scoreboard) and passes it in.
 * Any `renderJson` output works as input, so nothing extra has to be produced
 * for this to be usable — but `toSnapshot` exists for the case where a full
 * report is too large to keep around, since only the aggregates are read.
 */

import type { Grade } from '../config/types';
import type { Score } from '../score/score';
import type { Report, Severity, Summary } from '../types';
import { newSummary } from '../types';

/** The aggregate slice of a report that a comparison reads. */
export interface ReportSnapshot {
  /** safegres version that produced the run. */
  version?: string;
  generatedAt?: string;
  /** Free-form label for the run — a git ref, a commit sha, "main". */
  ref?: string;
  summary: Summary;
  security?: DimensionSnapshot;
  perf?: DimensionSnapshot;
}

export interface DimensionSnapshot {
  value: number;
  grade: Grade;
  findings: number;
  /** Finding count per rule code. */
  rules: Record<string, number>;
}

export interface ScoreDelta {
  before: number;
  after: number;
  /** `after - before`, rounded to one decimal. Positive is an improvement. */
  delta: number;
  gradeBefore: Grade;
  gradeAfter: Grade;
  /** Findings before → after. */
  findingsBefore: number;
  findingsAfter: number;
}

export interface RuleDelta {
  code: string;
  before: number;
  after: number;
  /** `after - before`. Positive means the rule fires more than it used to. */
  delta: number;
  dimension: 'security' | 'perf';
  /**
   * The previous run reported nothing for this code — a rule that did not
   * exist in that version, or a dimension it never ran. Distinct from a real
   * zero: `before: 0` means the rule ran and found nothing, and an increase
   * off it is a regression; this means the movement is unknown, and rendering
   * it as one is how a scanner upgrade comes out looking like a catastrophe.
   */
  unmeasuredBefore?: boolean;
}

export interface ReportComparison {
  /** Where the previous numbers came from, for the reader. */
  previous: { ref?: string; generatedAt?: string; version?: string };
  security?: ScoreDelta;
  perf?: ScoreDelta;
  /** Severity counts, before → after. */
  summary: Record<Severity, { before: number; after: number; delta: number }>;
  /** Rules whose finding count moved, largest regression first. */
  rules: RuleDelta[];
  /** Nothing moved: same scores, same counts, same rules. */
  unchanged: boolean;
}

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

function dimensionSnapshot(score: Score | undefined, findings: number): DimensionSnapshot | undefined {
  if (!score) return undefined;
  const rules: Record<string, number> = {};
  for (const d of score.deductions) rules[d.code] = d.count;
  return { value: score.value, grade: score.grade, findings, rules };
}

/** Reduce a report to the aggregates a comparison needs. */
export function toSnapshot(report: Report, meta: { ref?: string } = {}): ReportSnapshot {
  const perfFindings = report.perf?.findings.length ?? 0;
  return {
    version: report.version,
    generatedAt: report.generatedAt,
    ...(meta.ref !== undefined && { ref: meta.ref }),
    summary: report.summary,
    ...(report.score && {
      security: dimensionSnapshot(report.score, report.findings.length - perfFindings)
    }),
    ...(report.perf && { perf: dimensionSnapshot(report.perf.score, perfFindings) })
  };
}

export function serializeSnapshot(snapshot: ReportSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

/**
 * Read a previous run from JSON. Accepts either a snapshot or a full report —
 * the two are distinguished by the presence of `findings`, so CI can hand over
 * whatever it already has on disk.
 */
export function parseSnapshot(json: string): ReportSnapshot {
  const parsed = JSON.parse(json) as Partial<Report> & Partial<ReportSnapshot>;
  if (Array.isArray(parsed.findings)) return toSnapshot(parsed as Report);
  if (!parsed.summary) {
    throw new Error('not a safegres report or snapshot: no "summary"');
  }
  return parsed as ReportSnapshot;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function scoreDelta(
  before: DimensionSnapshot | undefined,
  after: DimensionSnapshot | undefined
): ScoreDelta | undefined {
  if (!before || !after) return undefined;
  return {
    before: before.value,
    after: after.value,
    delta: round(after.value - before.value),
    gradeBefore: before.grade,
    gradeAfter: after.grade,
    findingsBefore: before.findings,
    findingsAfter: after.findings
  };
}

function ruleDeltas(
  dimension: 'security' | 'perf',
  before: DimensionSnapshot | undefined,
  after: DimensionSnapshot | undefined
): RuleDelta[] {
  if (!before && !after) return [];
  const codes = new Set([
    ...Object.keys(before?.rules ?? {}),
    ...Object.keys(after?.rules ?? {})
  ]);
  const out: RuleDelta[] = [];
  for (const code of codes) {
    const measured = before?.rules[code] !== undefined;
    const b = before?.rules[code] ?? 0;
    const a = after?.rules[code] ?? 0;
    if (a === b) continue;
    out.push({
      code,
      before: b,
      after: a,
      delta: a - b,
      dimension,
      ...(measured ? {} : { unmeasuredBefore: true })
    });
  }
  return out;
}

/** Diff a fresh report against a previous run. */
export function compareReports(previous: ReportSnapshot, current: Report): ReportComparison {
  const now = toSnapshot(current);

  const summary = {} as ReportComparison['summary'];
  const prevSummary = previous.summary ?? newSummary();
  for (const sev of SEVERITIES) {
    const before = prevSummary[sev] ?? 0;
    const after = now.summary[sev] ?? 0;
    summary[sev] = { before, after, delta: after - before };
  }

  const rules = [
    ...ruleDeltas('security', previous.security, now.security),
    ...ruleDeltas('perf', previous.perf, now.perf)
  ]
    // Regressions first, then improvements; rules with no previous reading
    // last, since they are not movement and should not lead the table.
    .sort(
      (a, b) =>
        Number(a.unmeasuredBefore ?? false) - Number(b.unmeasuredBefore ?? false)
        || b.delta - a.delta
        || a.code.localeCompare(b.code)
    );

  const security = scoreDelta(previous.security, now.security);
  const perf = scoreDelta(previous.perf, now.perf);

  return {
    previous: {
      ...(previous.ref !== undefined && { ref: previous.ref }),
      ...(previous.generatedAt !== undefined && { generatedAt: previous.generatedAt }),
      ...(previous.version !== undefined && { version: previous.version })
    },
    ...(security && { security }),
    ...(perf && { perf }),
    summary,
    rules,
    unchanged:
      rules.length === 0
      && (security?.delta ?? 0) === 0
      && (perf?.delta ?? 0) === 0
      && SEVERITIES.every((sev) => summary[sev].delta === 0)
  };
}

/**
 * `+2.3` / `−1.4` / `0`, with a real minus sign. Rendering-only, but shared:
 * the markdown and pretty renderers must not disagree about which direction a
 * number moved.
 */
export function formatDelta(delta: number, digits = 0): string {
  if (delta === 0) return '0';
  const magnitude = Math.abs(delta).toFixed(digits);
  return delta > 0 ? `+${magnitude}` : `−${magnitude}`;
}
