import fs from 'fs';
import os from 'os';
import path from 'path';

import { redact, toRedactedErrorSample, writeJsonArtifact } from '../src/artifacts';
import { enforcePerfOptIn } from '../src/ci-guard';
import { discoverConstructiveLocalPath, loadPerfConfig } from '../src/config';
import { expandMatrix } from '../src/matrix';
import { buildPublicOperationProfiles } from '../src/operations';
import { buildPrivateProfiles } from '../src/profiles';
import { summarizeOutcomes } from '../src/stats';
import type { RequestOutcome, RequestProfile } from '../src/types';

const makeConstructiveLocal = (root: string): string => {
  const service = path.join(root, 'constructive-db', 'services', 'constructive-local');
  fs.mkdirSync(service, { recursive: true });
  fs.writeFileSync(path.join(service, 'pgpm.plan'), '%syntax-version=1.0.0\n%project=constructive-local\n');
  fs.writeFileSync(path.join(service, 'constructive-local.control'), 'default_version = 0.0.1\n');
  return service;
};

describe('perf suite harness', () => {
  it('requires explicit local opt-in', () => {
    expect(() => enforcePerfOptIn({})).toThrow(/PERF_BENCHMARK=1/);
    expect(() => enforcePerfOptIn({ PERF_BENCHMARK: '1' })).not.toThrow();
  });

  it('requires an additional CI opt-in', () => {
    expect(() => enforcePerfOptIn({ PERF_BENCHMARK: '1', CI: 'true' })).toThrow(/ALLOW_PERF_IN_CI=1/);
    expect(() =>
      enforcePerfOptIn({ PERF_BENCHMARK: '1', CI: 'true', ALLOW_PERF_IN_CI: '1' })
    ).not.toThrow();
  });

  it('discovers constructive-local through override and sibling layout', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-path-'));
    const service = makeConstructiveLocal(root);
    expect(discoverConstructiveLocalPath({ env: { PERF_CONSTRUCTIVE_LOCAL_PATH: service } })).toBe(service);

    const constructive = path.join(root, 'constructive');
    fs.mkdirSync(path.join(constructive, 'graphql', 'server-test'), { recursive: true });
    expect(discoverConstructiveLocalPath({ cwd: path.join(constructive, 'graphql', 'server-test'), env: {} })).toBe(service);
  });

  it('loads config groups with deterministic env overrides', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-config-'));
    const service = makeConstructiveLocal(root);
    const configPath = path.join(root, 'custom-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ name: 'custom-k2' }));
    const config = loadPerfConfig({
      PERF_CONSTRUCTIVE_LOCAL_PATH: service,
      PERF_CONFIG_GROUP: 'k10-5min',
      PERF_CONFIG_PATH: configPath,
      PERF_ROUTING_MODES: 'public,private',
      PERF_CACHE_MODES: 'new',
      PERF_K: '2',
      PERF_DURATION_SECONDS: '1',
      PERF_WORKERS: '1',
      PERF_CAPTURE_MEMORY: '0',
      PERF_GRAPHILE_CACHE_MAX: '25',
      PERF_MULTI_TENANCY_CACHE_MAX: '15',
      PERF_PG_CACHE_MAX: '25',
    });

    expect(config.routingModes).toEqual(['public', 'private']);
    expect(config.cacheModes).toEqual(['new']);
    expect(config.scaleProfile).toMatchObject({ k: 2, durationSeconds: 1, workers: 1 });
    expect(config.captureMemory).toBe(false);
    expect(config.constructiveLocalPath).toBe(service);
    expect(config.configPath).toBe(configPath);
    expect(config.name).toBe('custom-k2');
    expect(config.cacheSizes).toEqual({ graphileCacheMax: 25, multiTenancyCacheMax: 15, pgCacheMax: 25 });
    expect(config.effectiveCacheEnv).toEqual({
      GRAPHILE_CACHE_MAX: '25',
      GRAPHILE_MULTI_TENANCY_CACHE_MAX: '15',
      PG_CACHE_MAX: '25',
    });
  });

  it('expands matrix cases deterministically', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-matrix-'));
    const service = makeConstructiveLocal(root);
    const config = loadPerfConfig({
      PERF_CONSTRUCTIVE_LOCAL_PATH: service,
      PERF_CONFIG_GROUP: 'k10-5min',
      PERF_DURATION_SECONDS: '1',
    });

    expect(expandMatrix(config).map((item) => item.caseId)).toEqual([
      'private-old-k10-5min-cache-key-shared',
      'private-new-k10-5min-cache-key-shared',
      'public-old-k10-5min-business-crud',
      'public-new-k10-5min-business-crud',
    ]);
  });

  it('builds private shared and distinct cache-key pressure profiles', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-private-profiles-'));
    const service = makeConstructiveLocal(root);
    const sharedConfig = loadPerfConfig({
      PERF_CONSTRUCTIVE_LOCAL_PATH: service,
      PERF_CONFIG_GROUP: 'private-cache-compare',
      PERF_K: '4',
      PERF_DURATION_SECONDS: '1',
    });
    const sharedCase = expandMatrix(sharedConfig)[0];
    const shared = buildPrivateProfiles(sharedCase, sharedConfig);

    expect(shared.requestProfiles).toHaveLength(4);
    expect(new Set(shared.requestProfiles.map((profile) => profile.routeKey)).size).toBe(4);
    expect(new Set(shared.requestProfiles.map((profile) => profile.metadata.expectedBuildKeyGroup)).size).toBe(1);

    const distinctConfig = loadPerfConfig({
      PERF_CONSTRUCTIVE_LOCAL_PATH: service,
      PERF_CONFIG_GROUP: 'private-cache-distinct',
      PERF_K: '4',
      PERF_DURATION_SECONDS: '1',
    });
    const distinctCase = expandMatrix(distinctConfig)[0];
    const distinct = buildPrivateProfiles(distinctCase, distinctConfig);

    expect(distinct.requestProfiles).toHaveLength(4);
    expect(new Set(distinct.requestProfiles.map((profile) => profile.routeKey)).size).toBe(4);
    expect(new Set(distinct.requestProfiles.map((profile) => profile.metadata.expectedBuildKeyGroup)).size).toBe(4);
  });

  it('builds public CRUD operation profiles from DBPM metadata', () => {
    const operations = buildPublicOperationProfiles('business-crud');
    expect(operations.map((operation) => operation.name)).toEqual([
      'public.business.create',
      'public.business.getById',
      'public.business.updateById',
      'public.business.listRecent',
      'public.typename',
    ]);

    const requestProfile: RequestProfile = {
      id: 'public-dbpm-1',
      routingMode: 'public',
      routeKey: 'perf.localhost',
      headers: { Host: 'perf.localhost' },
      description: 'test profile',
      benchmarkOwned: true,
      metadata: {
        listField: 'perfItems',
        createField: 'createPerfItem',
        updateField: 'updatePerfItem',
        createInputType: 'CreatePerfItemInput',
        updateInputType: 'UpdatePerfItemInput',
        nodeField: 'perfItem',
        patchField: 'perfItemPatch',
      },
    };
    const create = operations.find((operation) => operation.name === 'public.business.create')!;
    const update = operations.find((operation) => operation.name === 'public.business.updateById')!;

    expect(create.buildQuery?.({ sequence: 1, requestProfile, config: {} as any, matrixCase: {} as any }))
      .toContain('mutation PerfPublicBusinessCreate($input: CreatePerfItemInput!)');
    expect(create.buildVariables?.({ sequence: 1, requestProfile, config: { benchmarkOwnedPrefix: 'perf' } as any, matrixCase: {} as any }))
      .toEqual({ input: { perfItem: { label: 'perf-public-dbpm-1-1' } } });
    expect(update.requiresExistingRow).toBe(true);
    expect(update.buildVariables?.({
      sequence: 2,
      rowId: 'row-1',
      requestProfile,
      config: { benchmarkOwnedPrefix: 'perf' } as any,
      matrixCase: {} as any,
    })).toEqual({ input: { id: 'row-1', perfItemPatch: { label: 'perf-public-dbpm-1-2' } } });
  });

  it('redacts secrets in nested reports and error samples', async () => {
    const value = redact({
      headers: {
        Authorization: 'Bearer abc.def',
        cookie: 'session=secret',
      },
      url: 'https://example.test?token=secret&ok=1',
    });

    expect(JSON.stringify(value)).not.toContain('abc.def');
    expect(JSON.stringify(value)).not.toContain('session=secret');
    expect(JSON.stringify(value)).not.toContain('token=secret');

    const sample = toRedactedErrorSample({ message: 'Authorization=Bearer abc.def password=hunter2' });
    expect(JSON.stringify(sample)).not.toContain('hunter2');

    const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'perf-artifact-')), 'artifact.json');
    await writeJsonArtifact(target, { schemaVersion: 1, Authorization: 'Bearer abc.def' });
    expect(fs.readFileSync(target, 'utf8')).not.toContain('abc.def');
  });

  it('summarizes large latency arrays without spreading', () => {
    const outcomes: RequestOutcome[] = Array.from({ length: 150_000 }, (_, index) => ({
      ok: true,
      latencyMs: index % 200,
      operation: 'op',
      requestProfileId: 'profile',
      status: 200,
      unexpectedGraphqlErrors: 0,
    }));

    const report = summarizeOutcomes({
      outcomes,
      durationMs: 1000,
      durationSeconds: 1,
      workers: 1,
      errorSampleLimit: 20,
      failFast: { triggered: false },
    });

    expect(report.totalRequests).toBe(150_000);
    expect(report.latencyMs.max).toBe(199);
    expect(report.failedRequests).toBe(0);
  });
});
