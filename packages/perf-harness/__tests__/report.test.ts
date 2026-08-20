import {
  compareCases,
  summarizeCase,
  validateSchemaGroups,
} from '../src/report';
import type { BenchmarkRun, SuccessfulWorkerResult } from '../src/types';

const result = (caseName: string, value: number): SuccessfulWorkerResult => ({
  status: 'ok',
  pid: value,
  caseName,
  buildMs: value,
  schemaHash: 'same',
  schemaTypeCount: 10,
  runtimeVerified: true,
  caseValidation: { passed: true, errors: [] },
  memory: {
    baseline: {
      rss: 10,
      heapTotal: 10,
      heapUsed: 10,
      external: 10,
      arrayBuffers: 10,
    },
    afterBuild: {
      rss: value,
      heapTotal: value,
      heapUsed: value,
      external: value,
      arrayBuffers: value,
    },
    delta: {
      rss: value - 10,
      heapTotal: value - 10,
      heapUsed: value - 10,
      external: value - 10,
      arrayBuffers: value - 10,
    },
    processPeakRss: value,
  },
});

describe('generic reports', () => {
  test('summarizes arbitrary cases and compares medians', () => {
    const runs: BenchmarkRun[] = [10, 30, 20].map((value, index) => ({
      repetition: index + 1,
      position: 1,
      caseName: 'base',
      result: result('base', value),
    }));
    runs.push(
      ...[5, 15, 10].map((value, index) => ({
        repetition: index + 1,
        position: 2,
        caseName: 'candidate',
        result: result('candidate', value),
      }))
    );
    const base = summarizeCase(runs, 'base')!;
    const candidate = summarizeCase(runs, 'candidate')!;
    expect(
      compareCases('base', 'candidate', base, candidate).buildMs.percentChange
    ).toBe(-50);
    expect(
      validateSchemaGroups(
        [
          { name: 'base', workerConfig: null, expectedSchemaGroup: 'schema' },
          {
            name: 'candidate',
            workerConfig: null,
            expectedSchemaGroup: 'schema',
          },
        ],
        runs
      )
    ).toEqual({ equivalent: true, hashes: { schema: 'same' }, errors: [] });
  });
});
