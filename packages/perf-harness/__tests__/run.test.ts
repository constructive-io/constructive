import { resolve } from 'node:path';

import { cliMain, runBenchmarkSuite } from '../src/run';

describe('generic suite runner', () => {
  test('requires the database URL as an explicit CLI argument', async () => {
    await expect(
      cliMain(['prepare', '--schema', 'cperf_explicit_cli'])
    ).rejects.toThrow('--database-url is required');
  });

  test('validates fresh processes and schema groups without fixed case names', async () => {
    const report = await runBenchmarkSuite(
      {
        name: 'test-suite',
        cases: ['alpha', 'beta', 'gamma'].map((name, index) => ({
          name,
          workerConfig: { value: index + 1, schemaHash: 'same' },
          expectedSchemaGroup: 'schema',
        })),
      },
      {
        databaseUrl: 'postgres:///not-used-by-fake-worker',
        repetitions: 1,
        seed: 1,
        order: ['alpha', 'beta', 'gamma'],
      },
      resolve(__dirname, 'fixtures/fake-worker.js')
    );
    expect(report.validation).toEqual(
      expect.objectContaining({
        allRunsSucceeded: true,
        freshProcessPerRun: true,
        caseValidationPassed: true,
        schemaGroupsEquivalent: true,
        schemaGroups: { schema: 'same' },
        errors: [],
      })
    );
    expect(new Set(report.runs.map((run) => run.result.pid)).size).toBe(3);
    expect(JSON.stringify(report)).not.toContain('postgres:///');
  });
});
