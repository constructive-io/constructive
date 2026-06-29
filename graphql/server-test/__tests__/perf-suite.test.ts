import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { redactSecrets, writeJsonArtifact } from '../perf/src/artifacts';
import { assertPerfBenchmarkAllowed, PerfGuardError } from '../perf/src/ci-guard';
import { loadPerfConfig } from '../perf/src/config';
import { BenchmarkContextManager } from '../perf/src/context';
import { evaluateCaseGates } from '../perf/src/gates';
import { expandMatrixCases } from '../perf/src/matrix';
import { captureMemorySnapshot } from '../perf/src/memory';
import { percentile, summarizeOutcomes } from '../perf/src/stats';
import type {
  BenchmarkContext,
  MatrixCase,
  PerfRunConfig,
  PublicPreflightResult,
  RouteProbeSummary,
  RunArtifactPaths,
} from '../perf/src/types';

const baseEnv = (overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  PERF_BENCHMARK: '1',
  ...overrides,
});

describe('perf config loading', () => {
  it('applies precedence defaults < group < PERF_SPEC < env overrides', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'constructive-perf-config-'));
    const specPath = path.join(dir, 'overlay.json');
    await fs.writeFile(
      specPath,
      JSON.stringify({
        routingModes: ['public'],
        cacheModes: ['old'],
        scaleProfile: { name: 'spec-scale', k: 7, durationSeconds: 11, workers: 2 },
        publicPreflight: { allowUnderProvisioned: true },
      })
    );

    const config = loadPerfConfig(baseEnv({
      PERF_CONFIG_GROUP: 'private-cache-compare',
      PERF_SPEC: specPath,
      PERF_K: '3',
      PERF_CACHE_MODES: 'new',
      PERF_DURATION_SECONDS: '9',
      PERF_WORKERS: '4',
      PERF_CONNECTION_POLICY: 'per-case',
      PERF_CAPTURE_MEMORY: '0',
    }));

    expect(config.routingModes).toEqual(['public']);
    expect(config.cacheModes).toEqual(['new']);
    expect(config.scaleProfile).toMatchObject({ name: 'spec-scale', k: 3, durationSeconds: 9, workers: 4 });
    expect(config.publicPreflight.allowUnderProvisioned).toBe(true);
    expect(config.connectionPolicy).toBe('per-case');
    expect(config.captureMemory).toBe(false);
    expect(config.source.specPath).toBe(specPath);
  });
});

describe('perf execution guard', () => {
  it('requires explicit PERF_BENCHMARK opt-in', () => {
    expect(() => assertPerfBenchmarkAllowed({})).toThrow(PerfGuardError);
    expect(() => assertPerfBenchmarkAllowed({ PERF_BENCHMARK: '1' })).not.toThrow();
  });

  it('requires ALLOW_PERF_IN_CI when CI is true', () => {
    expect(() => assertPerfBenchmarkAllowed({ PERF_BENCHMARK: '1', CI: 'true' })).toThrow(PerfGuardError);
    expect(() => assertPerfBenchmarkAllowed({ PERF_BENCHMARK: '1', CI: 'true', ALLOW_PERF_IN_CI: '1' })).not.toThrow();
  });
});

describe('matrix expansion and context compatibility', () => {
  it('expands matrix in deterministic routing/cache order', () => {
    const config = loadPerfConfig(baseEnv({
      PERF_ROUTING_MODES: 'public,private',
      PERF_CACHE_MODES: 'new,old',
      PERF_K: '2',
    }));

    expect(expandMatrixCases(config).map((item) => item.caseId)).toEqual([
      'private__old__smoke__metadata-read',
      'private__new__smoke__metadata-read',
      'public__old__smoke__business-crud',
      'public__new__smoke__business-crud',
    ]);
  });

  it('uses routing/cache in compatibility keys and honors connection policy in config', () => {
    const config = loadPerfConfig(baseEnv({ PERF_CONNECTION_POLICY: 'per-case' }));
    const manager = new BenchmarkContextManager(config);
    const matrixCase = expandMatrixCases(config)[0];

    expect(config.connectionPolicy).toBe('per-case');
    expect(manager.compatibilityKeyFor(matrixCase)).toContain('routing=private');
    expect(manager.compatibilityKeyFor(matrixCase)).toContain('cache=new');
  });
});

describe('artifact redaction', () => {
  it('redacts secret-like fields and auth header values before writing JSON', async () => {
    const redacted = redactSecrets({
      headers: { Authorization: 'Bearer super-secret-token', Cookie: 'sid=abc' },
      nested: { password: 'abc123', message: 'Basic abcdef' },
    });
    expect(JSON.stringify(redacted)).not.toContain('super-secret-token');
    expect(JSON.stringify(redacted)).not.toContain('sid=abc');
    expect(JSON.stringify(redacted)).not.toContain('abc123');

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'constructive-perf-artifact-'));
    const artifactPath = path.join(dir, 'artifact.json');
    await writeJsonArtifact(artifactPath, { schemaVersion: 1, Authorization: 'Bearer topsecret' });
    const written = await fs.readFile(artifactPath, 'utf8');
    expect(written).toContain('[REDACTED]');
    expect(written).not.toContain('topsecret');
  });
});

describe('memory artifacts', () => {
  it('records unavailable debug endpoints without fabricating memory data', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'constructive-perf-memory-'));
    const config = loadPerfConfig(baseEnv({ PERF_RUN_DIR: dir }));
    const artifacts: RunArtifactPaths = {
      runDir: dir,
      summaryPath: path.join(dir, 'summary.json'),
      casesDir: path.join(dir, 'cases'),
      preflightDir: path.join(dir, 'preflight'),
      memoryDir: path.join(dir, 'memory'),
      errorsDir: path.join(dir, 'errors'),
    };
    const context = {
      id: 'ctx-test',
      serverUrl: 'http://127.0.0.1:1',
      conn: {
        request: {
          get: async () => ({ status: 404, text: 'not found', body: {} }),
        },
      },
    } as unknown as BenchmarkContext;

    const result = await captureMemorySnapshot({
      context,
      config,
      artifacts,
      caseId: 'case-test',
      phase: 'before',
    });

    expect(result).toMatchObject({ ok: false, status: 'unavailable' });
    const written = JSON.parse(await fs.readFile(path.join(dir, 'memory', 'case-test-before.json'), 'utf8'));
    expect(written).toMatchObject({
      schemaVersion: 1,
      ok: false,
      status: 'unavailable',
      httpStatus: 404,
    });
    expect(written.snapshot).toBeUndefined();
  });
});

describe('stats', () => {
  it('calculates percentiles and load summaries', () => {
    expect(percentile([10, 30, 20, 40], 0.5)).toBe(20);
    expect(percentile([10, 30, 20, 40], 0.95)).toBe(40);
    expect(percentile(Array.from({ length: 200_000 }, (_, index) => index), 1)).toBe(199_999);
    const report = summarizeOutcomes({
      durationSeconds: 2,
      workers: 1,
      errorSampleLimit: 20,
      outcomes: [
        { ok: true, latencyMs: 10, operation: 'a', requestProfileId: 'r1', unexpectedGraphqlErrors: 0 },
        { ok: false, latencyMs: 30, operation: 'a', requestProfileId: 'r1', unexpectedGraphqlErrors: 1, error: { at: new Date().toISOString(), message: 'bad' } },
      ],
    });
    expect(report.totalRequests).toBe(2);
    expect(report.failedRequests).toBe(1);
    expect(report.unexpectedGraphqlErrors).toBe(1);
    expect(report.qps).toBe(1);
    expect(report.operations.a).toEqual({ total: 2, failed: 1 });
  });
});

describe('preflight hard gate evaluation', () => {
  it('converts preflight and route probe failures into hard gate failures', () => {
    const routeProbe: RouteProbeSummary = {
      ok: false,
      attempted: 1,
      succeeded: 0,
      failed: 1,
      unexpectedGraphqlErrors: 1,
      errorSamples: [],
    };
    const preflight = {
      ok: false,
      hardGateFailures: ['DBPM provision did not complete without unexpected errors'],
      routeProbe,
      errorSamples: [],
    } as PublicPreflightResult;

    const gates = evaluateCaseGates({ preflight, routeProbe, captureMemory: false });
    expect(gates.hardGateFailures).toContain('preflight: DBPM provision did not complete without unexpected errors');
    expect(gates.hardGateFailures).toContain('route probes failed');
    expect(gates.hardGateFailures).toContain('route probes returned unexpected GraphQL errors');
  });
});
