import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import { loadConfig } from '../src/config/loader';
import { type CorpusCase, gradeCase, loadCorpus } from '../src/corpus';
import { SEVERITY_ORDER } from '../src/types';

jest.setTimeout(300000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

const CORPUS = loadCorpus();
/** Sealed: the corpus is graded by the shipped preset, never by a local file. */
const { config } = loadConfig({ sealed: true, preset: 'recommended' });

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  await pg.any(fs.readFileSync(path.resolve(__dirname, '..', 'corpus', 'bootstrap.sql'), 'utf8'));
  for (const c of CORPUS) await pg.any(c.sql);
});

afterAll(async () => {
  if (teardown) await teardown();
});

async function auditCase(c: CorpusCase) {
  return audit(pg.client, {
    config,
    exposure: c.exposure,
    schemas: c.exposure.schemas,
    perf: true,
    sealed: true,
    preset: 'recommended'
  });
}

describe('evaluation corpus', () => {
  it('ships cases covering both dimensions', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(20);
    expect(CORPUS.some((c) => c.dimension === 'security')).toBe(true);
    expect(CORPUS.some((c) => c.dimension === 'perf')).toBe(true);
    // Every case must document its answer: an unexplained fixture is a
    // regression test, not an evaluation.
    for (const c of CORPUS) {
      expect(`${c.id}:${c.expect.length > 0 && c.fix.length > 0}`).toBe(`${c.id}:true`);
    }
  });

  it.each(CORPUS.map((c) => [c.id, c] as const))('%s produces its documented findings', async (_id, c) => {
    const report = await auditCase(c);
    const result = gradeCase(report, c);
    expect({
      id: result.id,
      missed: result.missed.map((e) => `${e.code}${e.relation ? ` @ ${e.relation}` : ''}`),
      falsePositives: result.falsePositives
    }).toEqual({ id: c.id, missed: [], falsePositives: [] });

    if (c.worstSeverity) {
      const worst = report.findings
        .filter((f) => f.exposed)
        .reduce((acc, f) => Math.max(acc, SEVERITY_ORDER[f.severity]), 0);
      expect(`${c.id}:${worst}`).toBe(`${c.id}:${SEVERITY_ORDER[c.worstSeverity]}`);
    }
  });

  it('costs points wherever the flaw carries weight', async () => {
    for (const c of CORPUS) {
      const report = await auditCase(c);
      const score = c.dimension === 'perf' ? report.perf?.score : report.score;
      const codes = new Set(c.expect.map((e) => e.code));
      // Some findings are weightless by construction — `info` severities and
      // fail-closed rules, which report a locked door rather than an open one.
      // A case made only of those must score 100; any case that deducts must
      // not, and the score must agree with its own deduction list either way.
      const weighted = (score?.deductions ?? []).some((d) => codes.has(d.code) && d.points > 0);
      expect(`${c.id}:${(score?.value ?? 100) < 100}`).toBe(`${c.id}:${weighted}`);
    }
  });
});
