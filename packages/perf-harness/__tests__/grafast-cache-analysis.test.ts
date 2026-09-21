import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

import {
  analyzeReports,
  type GrafastCacheReports,
} from '../src/benchmarks/grafast-cache/analyze';
import type { BenchmarkReport } from '../src/types';

const packageRoot = resolve(__dirname, '..');

// Synthetic values exercise statistics and validation without recorded timings.
// Eight repetitions and 20/6/3 cases satisfy the suite's completeness contract;
// all numbers are generated here, and expected statistics below are hand-calculated.
const reports = (): GrafastCacheReports => {
  const makeReport = (
    name: keyof GrafastCacheReports,
    caseNames: string[],
    pidBase: number
  ): BenchmarkReport => {
    const cases = caseNames.map((caseName) => ({
      name: caseName,
      workerConfig: {},
    }));
    const runs = caseNames.flatMap((caseName, caseIndex) => {
      const repetitions =
        caseIndex % 2 === 0
          ? [8, 1, 6, 3, 2, 7, 4, 5]
          : [5, 4, 7, 2, 3, 6, 1, 8];
      return repetitions.map((repetition) => {
        const base = 2 * repetition;
        const value = caseName.endsWith('-example')
          ? base + 2
          : caseName.endsWith('-large')
            ? base / 2
            : base;
        const group = name === 'postgres.json' ? caseName.split('-')[1] : name;
        const inputHash = `synthetic-${group}`;
        const snapshot = {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
          arrayBuffers: 0,
        };
        return {
          caseName,
          repetition,
          position: caseIndex + 1,
          result: {
            status: 'ok' as const,
            pid: pidBase + 8 * caseIndex + repetition,
            caseName,
            buildMs: 1,
            schemaHash: 'synthetic-schema',
            schemaTypeCount: 1,
            runtimeVerified: true as const,
            caseValidation: { passed: true, errors: [] },
            memory: {
              baseline: snapshot,
              afterBuild: snapshot,
              delta: snapshot,
              processPeakRss: 0,
            },
            metadata: {
              configurationSource: 'grafast-schema-extensions',
              workload: group,
              ...(name === 'postgres.json'
                ? { queryStreamHash: inputHash }
                : { inputHash }),
              requests: 10,
              cpuMs: 20 * value,
              measuredPlans: repetition,
              retainedWorkloadHeapBytes: value * 1048576,
              requestLatencyMs: { mean: value, p95: 2 * value, p99: 3 * value },
            },
          },
        };
      });
    });
    return {
      format: 'constructive-performance-suite/v1',
      generatedAt: '2000-01-01T00:00:00.000Z',
      node: 'synthetic',
      platform: 'synthetic',
      architecture: 'synthetic',
      suite: { name, cases },
      config: { repetitions: 8, seed: 1, order: null, workerTimeoutMs: 300000 },
      schedule: runs.map(({ caseName, repetition, position }) => ({
        caseName,
        repetition,
        position,
      })),
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
    };
  };
  return {
    'micro.json': makeReport(
      'micro.json',
      Array.from({ length: 20 }, (_, i) => `micro-${i}`),
      1000
    ),
    'postgres.json': makeReport(
      'postgres.json',
      [32, 600].flatMap((size) =>
        ['defaults', 'example', 'large'].map((arm) => `pg-${size}-${arm}`)
      ),
      2000
    ),
    'variants.json': makeReport(
      'variants.json',
      [8, 50, 128].map((cap) => `variants-${cap}`),
      3000
    ),
  };
};

const expectedCase = {
  requestMeanMs: { median: 9, min: 2, max: 16 },
  requestP95Ms: { median: 18, min: 4, max: 32 },
  requestP99Ms: { median: 27, min: 6, max: 48 },
  cpuMsPerRequest: { median: 18, min: 4, max: 32 },
  retainedMiB: { median: 9, min: 2, max: 16 },
  newPlans: { median: 4.5, min: 1, max: 8 },
  requestsPerProcess: 10,
  samples: 8,
};

const assertExpectedAnalysis = (
  analysis: ReturnType<typeof analyzeReports>
): void => {
  expect(analysis.summary.finalFreshProcesses).toBe(232);
  expect(Object.keys(analysis.summary.reports['micro.json'])).toHaveLength(20);
  expect(Object.keys(analysis.summary.reports['postgres.json'])).toHaveLength(
    6
  );
  expect(Object.keys(analysis.summary.reports['variants.json'])).toHaveLength(
    3
  );
  expect(analysis.summary.reports['micro.json']['micro-0']).toEqual(
    expectedCase
  );
  expect(analysis.summary.reports['variants.json']['variants-8']).toEqual(
    expectedCase
  );
  expect(analysis.postgresSummary.sampleSummary['pg-32-defaults']).toEqual({
    mean_ms: { median: 9, min: 2, max: 16 },
    p95_ms: { median: 18, min: 4, max: 32 },
    p99_ms: { median: 27, min: 6, max: 48 },
    cpu_ms_per_request: { median: 18, min: 4, max: 32 },
    retained_mib: { median: 9, min: 2, max: 16 },
    new_plans: { median: 4.5, min: 1, max: 8 },
    samples: 8,
  });
  for (const size of [32, 600]) {
    for (const key of [
      'mean_ms',
      'p95_ms',
      'cpu_ms_per_request',
      'retained_mib',
    ] as const) {
      // Median of eight paired percentages is 22.5%, not the 22.222...%
      // obtained by comparing medians. Opposite sample order tests pairing by repetition.
      const example =
        analysis.postgresSummary.pairedPercentChangeVsDefaults[
          `pg-${size}-example`
        ][key];
      expect(example.median).toBeCloseTo(22.5, 12);
      expect(example.min).toBe(12.5);
      expect(example.max).toBe(100);
      expect(
        analysis.postgresSummary.pairedPercentChangeVsDefaults[
          `pg-${size}-large`
        ][key]
      ).toEqual({ median: -50, min: -50, max: -50 });
    }
  }
};

describe('Grafast cache report analyzer', () => {
  test('computes known statistics and paired changes from synthetic samples', () => {
    assertExpectedAnalysis(analyzeReports(reports()));
  });

  test('compiled CLI reads a temporary results directory and writes both summaries', () => {
    const input = reports();
    const temporaryDirectory = mkdtempSync(
      resolve(tmpdir(), 'grafast-cache-analysis-')
    );
    try {
      for (const [filename, report] of Object.entries(input)) {
        writeFileSync(
          resolve(temporaryDirectory, `${filename}.gz`),
          gzipSync(JSON.stringify(report))
        );
      }
      const result = spawnSync(
        process.execPath,
        [
          resolve(packageRoot, 'dist/benchmarks/grafast-cache/analyze.js'),
          '--results-dir',
          temporaryDirectory,
        ],
        { cwd: packageRoot, encoding: 'utf8', timeout: 30_000 }
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      assertExpectedAnalysis({
        summary: JSON.parse(
          readFileSync(resolve(temporaryDirectory, 'summary.json'), 'utf8')
        ),
        postgresSummary: JSON.parse(
          readFileSync(
            resolve(temporaryDirectory, 'postgres-summary.json'),
            'utf8'
          )
        ),
      });
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test('rejects a failed run', () => {
    const malformed = reports();
    const run = malformed['micro.json'].runs[0];
    if (run.result.status !== 'ok') throw new Error('fixture run must succeed');
    run.result = {
      status: 'error',
      pid: run.result.pid,
      caseName: run.caseName,
      error: 'synthetic failure',
    };
    expect(() => analyzeReports(malformed)).toThrow(/did not succeed/);
  });

  test('rejects mismatched workload input hashes', () => {
    const malformed = reports();
    const run = malformed['micro.json'].runs[0];
    if (run.result.status !== 'ok' || run.result.metadata === undefined) {
      throw new Error('fixture run must include metadata');
    }
    run.result.metadata.inputHash = 'synthetic-mismatch';
    expect(() => analyzeReports(malformed)).toThrow(/mismatched input hashes/);
  });

  test('rejects duplicate worker PIDs', () => {
    const malformed = reports();
    const first = malformed['micro.json'].runs[0].result;
    const second = malformed['micro.json'].runs[1].result;
    if (first.status !== 'ok' || second.status !== 'ok') {
      throw new Error('fixture runs must succeed');
    }
    second.pid = first.pid;
    expect(() => analyzeReports(malformed)).toThrow(/worker PID validation/);
  });

  test('rejects duplicate PostgreSQL case and repetition pairs', () => {
    const malformed = reports();
    const first = malformed['postgres.json'].runs[0];
    const second = malformed['postgres.json'].runs[1];
    second.caseName = first.caseName;
    second.repetition = first.repetition;
    if (second.result.status !== 'ok') {
      throw new Error('fixture run must succeed');
    }
    second.result.caseName = first.caseName;
    expect(() => analyzeReports(malformed)).toThrow(
      /duplicate case\/repetition pair/
    );
  });
});
