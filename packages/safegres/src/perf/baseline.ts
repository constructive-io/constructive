/**
 * Perf baseline: a committed snapshot of accepted performance debt.
 *
 * The point is the ratchet. A large schema will not reach a clean perf report
 * in one pass, but it can refuse to get worse: commit the current findings,
 * then fail CI only on findings that are *not* in the baseline.
 *
 * Only the identity of a finding is stored — code, relation, policy, and the
 * one context field that distinguishes findings of the same code on the same
 * relation. Messages, severities and hints may be reworded between safegres
 * versions without invalidating a committed baseline.
 */

import type { Finding } from '../types';

export interface PerfBaseline {
  version: 1;
  findings: BaselineFinding[];
}

export interface BaselineFinding {
  code: string;
  schema?: string;
  table?: string;
  policy?: string;
  /** The rule-specific subject: constraint, index, column, expression, or function. */
  subject?: string;
}

export interface PerfDiff {
  /** Findings present now but absent from the baseline — new debt. */
  added: Finding[];
  /** Baseline entries no longer produced — fixed, or the relation is gone. */
  removed: BaselineFinding[];
  /** Findings that matched the baseline — accepted debt, still reported. */
  accepted: Finding[];
}

/**
 * Context keys that identify *which* object a finding is about, in priority
 * order (X3 carries both `expression` and `column`; the expression is the
 * narrower identity). Rules that can only fire once per relation — X6 — set
 * none of these and are keyed by code + relation alone.
 */
const SUBJECT_KEYS = ['constraint', 'index', 'expression', 'column', 'function'] as const;

export function subjectOf(finding: Finding): string | undefined {
  const context = finding.context;
  if (!context) return undefined;
  for (const key of SUBJECT_KEYS) {
    const value = context[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

export function findingKey(entry: BaselineFinding): string {
  return [entry.code, entry.schema ?? '', entry.table ?? '', entry.policy ?? '', entry.subject ?? ''].join('|');
}

export function toBaselineFinding(finding: Finding): BaselineFinding {
  const subject = subjectOf(finding);
  return {
    code: finding.code,
    ...(finding.schema ? { schema: finding.schema } : {}),
    ...(finding.table ? { table: finding.table } : {}),
    ...(finding.policy ? { policy: finding.policy } : {}),
    ...(subject ? { subject } : {})
  };
}

export function toPerfBaseline(findings: Finding[]): PerfBaseline {
  const seen = new Set<string>();
  const out: BaselineFinding[] = [];
  for (const finding of findings) {
    const entry = toBaselineFinding(finding);
    const key = findingKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  out.sort((a, b) => findingKey(a).localeCompare(findingKey(b)));
  return { version: 1, findings: out };
}

export function diffPerf(findings: Finding[], baseline: PerfBaseline): PerfDiff {
  const baseKeys = new Set(baseline.findings.map(findingKey));
  const currentKeys = new Set<string>();

  const added: Finding[] = [];
  const accepted: Finding[] = [];
  for (const finding of findings) {
    const key = findingKey(toBaselineFinding(finding));
    currentKeys.add(key);
    if (baseKeys.has(key)) accepted.push(finding);
    else added.push(finding);
  }

  const removed = baseline.findings.filter((entry) => !currentKeys.has(findingKey(entry)));
  return { added, removed, accepted };
}

export function parsePerfBaseline(raw: string): PerfBaseline {
  const data = JSON.parse(raw) as Partial<PerfBaseline>;
  if (data.version !== 1 || !Array.isArray(data.findings)) {
    throw new Error('invalid perf baseline: expected { version: 1, findings: [...] }');
  }
  return { version: 1, findings: data.findings as BaselineFinding[] };
}

export function serializePerfBaseline(baseline: PerfBaseline): string {
  return JSON.stringify(baseline, null, 2) + '\n';
}
