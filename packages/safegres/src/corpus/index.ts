/**
 * The evaluation corpus: small schemas with a deliberate flaw and a written-down
 * answer.
 *
 * It exists because "the score went up" is not evidence of anything on its own.
 * A corpus with known answers turns safegres into a measuring instrument you
 * can calibrate: every case names the findings a correct audit must produce, so
 * a run can be graded on recall (did it find the flaw?) rather than on a number
 * whose provenance nobody can check. It is used three ways —
 *
 *   1. safegres's own regression suite (`__tests__/corpus.test.ts`);
 *   2. an evaluation harness for an agent asked to *fix* the case: audit,
 *      hand the findings over, re-audit, and require the expected findings to
 *      be gone without new ones appearing;
 *   3. worked examples — each case is short enough to read.
 *
 * Cases live in `corpus/cases/<id>/` as `schema.sql` plus `case.json`, i.e.
 * data, not code: another tool can consume the corpus without running ours.
 */

import * as fs from 'fs';
import * as path from 'path';

import type { ExposureConfig } from '../config/types';
import type { Finding, Report, Severity } from '../types';

/** One expected finding: a rule code, optionally pinned to a relation. */
export interface ExpectedFinding {
  code: string;
  /** `schema.table`, when the case has more than one relation in play. */
  relation?: string;
  /** Why this is the right answer — the part a reader learns from. */
  note?: string;
}

export interface CorpusCase {
  id: string;
  title: string;
  /** Which axis the flaw is on. A case may be graded on both. */
  dimension: 'security' | 'perf';
  /** The SQL that builds the case, as committed. */
  sql: string;
  /** The surface the case is graded against — its whole point, for most cases. */
  exposure: ExposureConfig;
  /** Findings a correct audit must produce. */
  expect: ExpectedFinding[];
  /** Rule codes that must NOT fire: the false positives this case guards. */
  forbid?: string[];
  /** Worst severity the case should produce, as a coarse sanity check. */
  worstSeverity?: Severity;
  /** How the flaw is fixed, in one sentence — the answer key. */
  fix: string;
}

interface CaseFile extends Omit<CorpusCase, 'sql' | 'id'> {
  id?: string;
}

/**
 * The corpus shipped with the package. Two candidates because the package
 * publishes from `dist/`, where the corpus sits one directory closer.
 */
export function corpusDir(): string {
  const candidates = [
    path.resolve(__dirname, '..', 'corpus', 'cases'),
    path.resolve(__dirname, '..', '..', 'corpus', 'cases')
  ];
  const found = candidates.find((dir) => fs.existsSync(dir));
  if (!found) throw new Error(`Corpus not found. Looked in: ${candidates.join(', ')}`);
  return found;
}

/**
 * The SQL creating the roles every case is graded against (`corpus_anon`,
 * `corpus_user`). Idempotent, so a harness can run it before every case.
 */
export function corpusBootstrap(dir: string = corpusDir()): string {
  return fs.readFileSync(path.resolve(dir, '..', 'bootstrap.sql'), 'utf8');
}

/** Load every case in `dir` (default: the shipped corpus), ordered by id. */
export function loadCorpus(dir: string = corpusDir()): CorpusCase[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => loadCase(path.join(dir, e.name)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Load a single case directory (`case.json` + `schema.sql`). */
export function loadCase(dir: string): CorpusCase {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'case.json'), 'utf8')) as CaseFile;
  return {
    ...meta,
    id: meta.id ?? path.basename(dir),
    sql: fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8')
  };
}

export interface CaseResult {
  id: string;
  /** Expected findings the audit produced. */
  found: ExpectedFinding[];
  /** Expected findings the audit missed — recall failures. */
  missed: ExpectedFinding[];
  /** Forbidden rule codes the audit produced — precision failures. */
  falsePositives: string[];
  /** True when nothing was missed and nothing forbidden fired. */
  passed: boolean;
}

function matches(finding: Finding, expected: ExpectedFinding): boolean {
  if (finding.code !== expected.code) return false;
  if (!expected.relation) return true;
  return `${finding.schema}.${finding.table}` === expected.relation;
}

/**
 * Grade a report against the case it was produced from. Deliberately not a
 * strict equality check on the finding set: a case pins the findings that
 * define it, and a later release adding an unrelated advisory should not
 * invalidate the corpus. What a case *does* pin negatively goes in `forbid`.
 */
export function gradeCase(report: Report, testCase: CorpusCase): CaseResult {
  const findings = report.findings;
  const found = testCase.expect.filter((e) => findings.some((f) => matches(f, e)));
  const missed = testCase.expect.filter((e) => !findings.some((f) => matches(f, e)));
  const falsePositives = [...new Set(findings.map((f) => f.code))].filter((code) =>
    (testCase.forbid ?? []).includes(code)
  );
  return {
    id: testCase.id,
    found,
    missed,
    falsePositives,
    passed: missed.length === 0 && falsePositives.length === 0
  };
}
