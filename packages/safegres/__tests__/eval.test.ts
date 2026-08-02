import { getConnections, PgTestClient } from 'pgsql-test';

import { runEval } from '../src/commands/eval';
import { loadConfig } from '../src/config/loader';
import { loadCorpus } from '../src/corpus';

jest.setTimeout(300000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

const { config } = loadConfig({ sealed: true, preset: 'recommended' });
/** A security case and a perf case: enough to prove both axes are graded. */
const CASES = ['01-anon-write-grant', '17-foreign-key-without-index'];

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('runEval', () => {
  it('grades the selected cases and leaves the database as it found it', async () => {
    const report = await runEval(pg.client, { config, preset: 'recommended', cases: CASES });

    expect(report.results.map((r) => r.id)).toEqual(CASES);
    expect({ passed: report.passed, total: report.total }).toEqual({ passed: 2, total: 2 });
    expect({ recall: report.recall, precision: report.precision }).toEqual({ recall: 1, precision: 1 });
    expect(report.sealed).toBe(true);
    expect(report.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    // Each case's flaw costs points on its own axis.
    for (const r of report.results) expect(`${r.id}:${r.score < 100}`).toBe(`${r.id}:true`);

    const schemas = loadCorpus()
      .filter((c) => CASES.includes(c.id))
      .flatMap((c) => c.exposure.schemas ?? []);
    const { rows } = await pg.client.query(
      'SELECT nspname FROM pg_namespace WHERE nspname = ANY($1)',
      [schemas]
    );
    expect(rows).toEqual([]);
  });

  it('keeps the schemas when asked, and accepts an id prefix', async () => {
    const report = await runEval(pg.client, { config, cases: ['01'], keep: true });
    expect(report.results.map((r) => r.id)).toEqual(['01-anon-write-grant']);

    const { rows } = await pg.client.query(
      'SELECT nspname FROM pg_namespace WHERE nspname = $1',
      ['c_anon_write_grant']
    );
    expect(rows).toHaveLength(1);
    await pg.client.query('DROP SCHEMA c_anon_write_grant CASCADE');
  });

  it('refuses a selection that matches nothing', async () => {
    await expect(runEval(pg.client, { config, cases: ['nope'] })).rejects.toThrow(/No corpus case/);
  });
});
