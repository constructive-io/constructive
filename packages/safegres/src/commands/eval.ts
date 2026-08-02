/**
 * `safegres eval` — grade the auditor against a corpus with known answers.
 *
 * The audit answers "what is wrong with this database". Eval answers the
 * question one level up: *is the auditor right?* It deploys each corpus case
 * into a live database, audits it under a sealed preset, and grades the report
 * against the case's answer key — recall (every expected finding present) and
 * precision (nothing the case forbids).
 *
 * That makes it three things with one implementation: safegres's own
 * calibration check, a harness an agent can be scored against (fix the case,
 * re-run, require the findings to disappear), and a demonstration that the
 * rules mean what the docs say.
 */

import type { Grade, SafegresConfig } from '../config/types';
import { type CaseResult, corpusBootstrap, type CorpusCase, gradeCase, loadCorpus } from '../corpus';
import { asExecutor, type QueryExecutor } from '../pg/introspect';
import { audit } from './audit';

export interface EvalOptions {
  /**
   * The configuration cases are graded under. Normally a sealed preset: the
   * corpus measures the rules, so a local config file editing them would be
   * measuring the wrong thing.
   */
  config?: SafegresConfig;
  /** The preset name, recorded in each report's provenance. */
  preset?: string;
  /** Corpus directory. Defaults to the corpus shipped with the package. */
  corpus?: string;
  /** Case ids (or id prefixes) to run. Defaults to all of them. */
  cases?: string[];
  /** Skip the role bootstrap — for a database that already has the roles. */
  skipBootstrap?: boolean;
  /** Leave each case's schemas in the database instead of dropping them. */
  keep?: boolean;
  /** Called as each case finishes, for streaming progress. */
  onResult?: (result: EvalCaseResult) => void;
}

export interface EvalCaseResult extends CaseResult {
  title: string;
  dimension: CorpusCase['dimension'];
  /** The score on the case's own dimension, after its flaw is accounted for. */
  score: number;
  grade: Grade;
  /** The answer key, so a failing case reads as an instruction. */
  fix: string;
}

export interface EvalReport {
  generatedAt: string;
  /** The preset every case was graded under. */
  preset?: string;
  /** Configuration fingerprint shared by every case's report. */
  fingerprint?: string;
  sealed: boolean;
  total: number;
  passed: number;
  /** Expected findings produced / expected findings total. */
  recall: number;
  /** Cases that produced no forbidden finding / cases total. */
  precision: number;
  results: EvalCaseResult[];
}

function selectCases(all: CorpusCase[], ids?: string[]): CorpusCase[] {
  if (!ids || ids.length === 0) return all;
  const selected = all.filter((c) => ids.some((id) => c.id === id || c.id.startsWith(id)));
  if (selected.length === 0) {
    throw new Error(`No corpus case matches ${ids.join(', ')}. Available: ${all.map((c) => c.id).join(', ')}`);
  }
  return selected;
}

/**
 * Deploy, audit and grade every selected case. Each case owns its schemas —
 * its SQL drops them first — so cases neither see nor disturb each other, and
 * the database is left as it was found unless `keep` says otherwise.
 */
export async function runEval(
  client: QueryExecutor,
  options: EvalOptions = {}
): Promise<EvalReport> {
  const exec = asExecutor(client);
  const cases = selectCases(loadCorpus(options.corpus), options.cases);

  if (!options.skipBootstrap) await exec.query(corpusBootstrap());

  const results: EvalCaseResult[] = [];
  let fingerprint: string | undefined;
  let sealed = false;

  for (const c of cases) {
    await exec.query(c.sql);
    try {
      const report = await audit(exec, {
        config: options.config,
        exposure: c.exposure,
        schemas: c.exposure.schemas,
        perf: true,
        sealed: true,
        ...(options.preset ? { preset: options.preset } : {})
      });
      fingerprint ??= report.provenance?.fingerprint;
      sealed = report.provenance?.sealed ?? false;

      const score = c.dimension === 'perf' ? report.perf?.score : report.score;
      const result: EvalCaseResult = {
        ...gradeCase(report, c),
        title: c.title,
        dimension: c.dimension,
        score: score?.value ?? 100,
        grade: score?.grade ?? 'A+',
        fix: c.fix
      };
      results.push(result);
      options.onResult?.(result);
    } finally {
      if (!options.keep) {
        for (const schema of c.exposure.schemas ?? []) {
          await exec.query(`DROP SCHEMA IF EXISTS ${quoteIdent(schema)} CASCADE`);
        }
      }
    }
  }

  const expected = results.reduce((n, r) => n + r.found.length + r.missed.length, 0);
  const found = results.reduce((n, r) => n + r.found.length, 0);
  const clean = results.filter((r) => r.falsePositives.length === 0).length;

  return {
    generatedAt: new Date().toISOString(),
    ...(options.preset ? { preset: options.preset } : {}),
    ...(fingerprint ? { fingerprint } : {}),
    sealed,
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    recall: expected === 0 ? 1 : found / expected,
    precision: results.length === 0 ? 1 : clean / results.length,
    results
  };
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
