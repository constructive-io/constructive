import { analyzePairedMetric } from '../src/scoped-introspection-analysis';
import type {
  BenchmarkReport,
  BenchmarkRun,
  SuccessfulWorkerResult,
} from '../src/types';

const result = (
  caseName: string,
  pid: number,
  value: number
): SuccessfulWorkerResult => ({
  status: 'ok',
  pid,
  caseName,
  buildMs: value,
  schemaHash: 'same',
  schemaTypeCount: 1,
  runtimeVerified: true,
  caseValidation: { passed: true, errors: [] },
  memory: {
    baseline: {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0,
    },
    afterBuild: {
      rss: value,
      heapTotal: value,
      heapUsed: value,
      external: value,
      arrayBuffers: value,
    },
    delta: {
      rss: value,
      heapTotal: value,
      heapUsed: value,
      external: value,
      arrayBuffers: value,
    },
    processPeakRss: value,
  },
});

const report = (runs: BenchmarkRun[], repetitions = 3): BenchmarkReport => ({
  format: 'constructive-performance-suite/v1',
  generatedAt: '2026-08-19T00:00:00.000Z',
  node: 'v22',
  platform: 'darwin',
  architecture: 'arm64',
  suite: { name: 'test', cases: [] },
  config: { repetitions, seed: 1, order: null },
  schedule: [],
  runs,
  validation: {
    allRunsSucceeded: true,
    freshProcessPerRun: true,
    caseValidationPassed: true,
    schemaGroupsEquivalent: true,
    schemaGroups: {},
    errors: [],
  },
  summaries: {},
});

describe('scoped introspection paired analysis', () => {
  it('reports distributions and the median paired percent change', () => {
    const runs: BenchmarkRun[] = [];
    [100, 200, 300].forEach((value, index) => {
      runs.push({
        repetition: index + 1,
        position: 1,
        caseName: 'stock',
        result: result('stock', index + 1, value),
      });
      runs.push({
        repetition: index + 1,
        position: 2,
        caseName: 'scoped',
        result: result('scoped', index + 11, value / 2),
      });
    });
    const analysis = analyzePairedMetric(report(runs), (item) => item.buildMs);
    expect(analysis.status).toBe('ok');
    expect(analysis.stock).toEqual({
      sampleCount: 3,
      p50: 200,
      p95: 300,
      min: 100,
      max: 300,
    });
    expect(analysis.pairedMedianPercentChange).toBe(-50);
  });

  it('does not synthesize a percentage from incomplete pairs', () => {
    const analysis = analyzePairedMetric(
      report([
        {
          repetition: 1,
          position: 1,
          caseName: 'stock',
          result: result('stock', 1, 100),
        },
      ]),
      (item) => item.buildMs
    );
    expect(analysis.status).toBe('unavailable');
    expect(analysis.pairedMedianPercentChange).toBeNull();
  });
});
