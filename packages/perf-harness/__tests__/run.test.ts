import { resolve } from 'node:path';

import { parseRunOptions, runMatrix } from '../src/run';

describe('matrix runner', () => {
  test('parses the exact four-arm order', () => {
    const options = parseRunOptions([
      '--database-url',
      'postgres:///test',
      '--schemas',
      'app,private',
      '--allowed-dependency-schemas',
      'shared',
      '--order',
      'stock,scoped,retire,scoped-retire',
      '--repetitions',
      '2',
    ]);
    expect(options.schemas).toEqual(['app', 'private']);
    expect(options.allowedDependencySchemas).toEqual(['shared']);
    expect(options.order).toEqual([
      'stock',
      'scoped',
      'retire',
      'scoped-retire',
    ]);
  });

  test('requires all four fresh workers to agree on schema identity', async () => {
    const options = parseRunOptions([
      '--database-url',
      'postgres:///not-used-by-fake-worker',
      '--schemas',
      'example',
      '--repetitions',
      '1',
      '--order',
      'stock,scoped,retire,scoped-retire',
    ]);
    const report = await runMatrix(
      options,
      resolve(__dirname, 'fixtures/fake-worker.js')
    );
    expect(report.validation).toEqual(
      expect.objectContaining({
        allRunsSucceeded: true,
        freshProcessPerRun: true,
        schemaEquivalent: true,
        schemaHash: 'fixture-schema-hash',
        errors: [],
      })
    );
    expect(new Set(report.runs.map((run) => run.result.pid)).size).toBe(4);
    expect(report.comparisons).toEqual(
      expect.objectContaining({
        scopedVsStock: expect.any(Object),
        retireVsStock: expect.any(Object),
        combinedVsStock: expect.any(Object),
        retireWithinScoped: expect.any(Object),
        scopedWithinRetire: expect.any(Object),
      })
    );
  });
});
