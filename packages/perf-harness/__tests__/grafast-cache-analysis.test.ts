import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';

import {
  analyzeReports,
  type GrafastCacheReports,
} from '../src/benchmarks/grafast-cache/analyze';
import type { BenchmarkReport } from '../src/types';

const resultsDirectory = resolve(
  __dirname,
  '../benchmarks/grafast-cache/results'
);
const packageRoot = resolve(__dirname, '..');

const readJson = (filename: string): unknown =>
  JSON.parse(readFileSync(resolve(resultsDirectory, filename), 'utf8'));

const readReport = (filename: GrafastCacheReportName): BenchmarkReport =>
  JSON.parse(
    gunzipSync(
      readFileSync(resolve(resultsDirectory, `${filename}.gz`))
    ).toString('utf8')
  ) as BenchmarkReport;

type GrafastCacheReportName = keyof GrafastCacheReports;

const reports = (): GrafastCacheReports => ({
  'micro.json': readReport('micro.json'),
  'postgres.json': readReport('postgres.json'),
  'variants.json': readReport('variants.json'),
});

const cloneReports = (): GrafastCacheReports =>
  JSON.parse(JSON.stringify(reports())) as GrafastCacheReports;

describe('Grafast cache report analyzer', () => {
  test('matches both committed summaries across all 232 raw report samples', () => {
    const analysis = analyzeReports(reports());
    expect(analysis.summary).toEqual(readJson('summary.json'));
    expect(analysis.postgresSummary).toEqual(readJson('postgres-summary.json'));
  });

  test('compiled CLI reads a temporary results directory and writes both summaries', () => {
    const analysis = analyzeReports(reports());
    const temporaryDirectory = mkdtempSync(
      resolve(tmpdir(), 'grafast-cache-analysis-')
    );
    try {
      for (const filename of ['micro.json', 'postgres.json', 'variants.json']) {
        cpSync(
          resolve(resultsDirectory, `${filename}.gz`),
          resolve(temporaryDirectory, `${filename}.gz`)
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
      expect(
        JSON.parse(
          readFileSync(resolve(temporaryDirectory, 'summary.json'), 'utf8')
        )
      ).toEqual(analysis.summary);
      expect(
        JSON.parse(
          readFileSync(
            resolve(temporaryDirectory, 'postgres-summary.json'),
            'utf8'
          )
        )
      ).toEqual(analysis.postgresSummary);
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test('rejects a failed run', () => {
    const malformed = cloneReports();
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
    const malformed = cloneReports();
    const run = malformed['micro.json'].runs[0];
    if (run.result.status !== 'ok' || run.result.metadata === undefined) {
      throw new Error('fixture run must include metadata');
    }
    run.result.metadata.inputHash = 'synthetic-mismatch';
    expect(() => analyzeReports(malformed)).toThrow(/mismatched input hashes/);
  });

  test('rejects duplicate worker PIDs', () => {
    const malformed = cloneReports();
    const first = malformed['micro.json'].runs[0].result;
    const second = malformed['micro.json'].runs[1].result;
    if (first.status !== 'ok' || second.status !== 'ok') {
      throw new Error('fixture runs must succeed');
    }
    second.pid = first.pid;
    expect(() => analyzeReports(malformed)).toThrow(/worker PID validation/);
  });

  test('rejects duplicate PostgreSQL case and repetition pairs', () => {
    const malformed = cloneReports();
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
