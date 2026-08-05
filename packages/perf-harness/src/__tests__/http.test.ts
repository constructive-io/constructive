import http from 'node:http';

import {
  createWorkloadCapture,
  deterministicCanaryOffset,
  deterministicOperationOffset,
  jsonPointerValues,
  resolveOfferedLoad,
  resolveWarmupTimeoutMs,
  rotatingCanaryIndex,
  runWorkload
} from '../http';
import type { GraphqlSurface, TenantTarget } from '../types';

describe('open-loop workload', () => {
  let server: http.Server;
  let url: string;
  let activeSlowRequests = 0;
  let peakSlowRequests = 0;
  let slowWarmRequests = 0;
  const verificationVariables: Array<Record<string, unknown>> = [];

  beforeAll(async () => {
    server = http.createServer(async (request, response) => {
      let raw = '';
      for await (const chunk of request) raw += String(chunk);
      const payload = JSON.parse(raw || '{}') as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      const query = payload.query ?? '';
      if (query.includes('Slow')) {
        if (query.includes('SlowWarm')) slowWarmRequests++;
        activeSlowRequests++;
        peakSlowRequests = Math.max(peakSlowRequests, activeSlowRequests);
        await new Promise((resolve) => setTimeout(resolve, 40));
        activeSlowRequests--;
      }
      const physicalDatabaseIdentity = query.includes('ForeignPhysicalOracle')
        ? 'physical-db-b'
        : query.includes('MissingPhysicalOracle')
          ? undefined
          : 'physical-db-a';
      response.setHeader('content-type', 'application/json');
      if (query.includes('PartialForeignCanary')) {
        response.end(JSON.stringify({
          data: { tenantToken: 'tenant-b-token' },
          errors: [{ message: 'partial resolver failure', extensions: { code: 'PARTIAL' } }]
        }));
        return;
      }
      if (query.includes('UniversalRows')) {
        const nodes = query.includes('Empty')
          ? []
          : query.includes('Foreign')
            ? [
              { physicalDatabaseIdentity: 'physical-db-a' },
              { physicalDatabaseIdentity: 'physical-db-b' }
            ]
            : [{ physicalDatabaseIdentity: 'physical-db-a' }];
        response.end(JSON.stringify({ data: { documents: { nodes } } }));
        return;
      }
      if (query.includes('CorrelatedUploadSubject')) {
        response.end(JSON.stringify({
          data: { uploadAppFile: { fileId: 'file-current' } }
        }));
        return;
      }
      if (query.includes('AmbiguousCorrelationSubject')) {
        response.end(JSON.stringify({
          data: {
            uploads: [{ fileId: 'file-one' }, { fileId: 'file-two' }]
          }
        }));
        return;
      }
      if (query.includes('MissingCorrelationSubject')) {
        response.end(JSON.stringify({ data: { uploadAppFile: {} } }));
        return;
      }
      if (query.includes('VerifyCorrelatedUpload')) {
        verificationVariables.push(payload.variables ?? {});
        response.end(JSON.stringify({
          data: {
            physicalDatabaseIdentity: payload.variables?.fileId === 'file-current'
              ? 'physical-db-a'
              : 'physical-db-b'
          }
        }));
        return;
      }
      response.end(JSON.stringify({
        data: {
          tenantToken: 'tenant-a-token',
          ...(physicalDatabaseIdentity === undefined
            ? {}
            : { physicalDatabaseIdentity })
        },
        extensions: { note: 'tenant-b-token appears outside the asserted path' }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server has no TCP address');
    url = `http://127.0.0.1:${address.port}/graphql`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const surface = (
    name: string,
    warmupQuery = '{ tenantToken }',
    operationQuery = '{ tenantToken }'
  ): GraphqlSurface => ({
    name,
    buildContract: `tenant-a-${name}`,
    url,
    warmup: { name: 'warm', capability: 'generated', query: warmupQuery },
    operations: [
      { name: 'generated', capability: 'generated', weight: 0.1, query: operationQuery },
      { name: 'search', capability: 'bm25', weight: 0.1, query: operationQuery }
    ],
    canaries: [{
      name: 'cross-schema',
      query: '{ tenantToken }',
      forbiddenMatches: [{ path: '/data/tenantToken', value: 'tenant-b-token' }],
      requiredMatches: [{ path: '/data/tenantToken', value: 'tenant-a-token' }]
    }]
  });

  it('stably staggers weighted operation cursors across tenant surfaces', () => {
    const offsets = [
      deterministicOperationOffset('physical-customer-0001', 'a', 100),
      deterministicOperationOffset('physical-customer-0001', 'b', 100),
      deterministicOperationOffset('physical-customer-0002', 'a', 100)
    ];
    expect(new Set(offsets).size).toBe(3);
    expect(deterministicOperationOffset('physical-customer-0001', 'a', 100))
      .toBe(offsets[0]);
    expect(offsets.every((offset) => offset >= 0 && offset < 100)).toBe(true);
    expect(deterministicOperationOffset('tenant', 'api', 0)).toBe(0);
  });

  it('fails operation samples closed with stable missing and forbidden oracle codes', async () => {
    const run = async (query: string) => {
      const api = surface('api', '{ tenantToken }', query);
      api.operations = [{
        name: 'physical-read',
        capability: 'generated',
        query,
        requiredMatches: [{
          path: '/data/physicalDatabaseIdentity',
          value: 'physical-db-a'
        }],
        forbiddenMatches: [{
          path: '/data/physicalDatabaseIdentity',
          value: 'physical-db-b'
        }]
      }];
      return runWorkload([{ id: 'tenant-a', surfaces: [api] }], {
        durationSec: 0.02,
        rps: 1,
        minWorkloadRequestsPerSurface: 1,
        requestTimeoutMs: 1_000,
        maxInFlight: 1,
        canaryIntervalSec: 1,
        warmupTimeoutMs: 1_000,
        warmupTimeoutPerSurfaceMs: 100,
        warmupConcurrency: 1
      });
    };

    const missing = await run('query MissingPhysicalOracle { physicalDatabaseIdentity }');
    expect(missing.samples.find((sample) => sample.phase === 'coverage'))
      .toMatchObject({
        ok: false,
        oracleConfigured: true,
        oracleConclusive: false,
        oracleViolation: false,
        errorCode: 'GRAPHQL_OPERATION_ORACLE_MISSING'
      });

    const forbidden = await run('query ForeignPhysicalOracle { physicalDatabaseIdentity }');
    expect(forbidden.samples.find((sample) => sample.phase === 'coverage'))
      .toMatchObject({
        ok: false,
        oracleConfigured: true,
        oracleViolation: true,
        errorCode: 'GRAPHQL_OPERATION_ORACLE_FORBIDDEN'
      });
  });

  it('enforces nonempty cardinality and every-value invariants across collections', async () => {
    const run = async (query: string, requiredMatches: any[]) => {
      const api = surface('api', '{ tenantToken }', query);
      api.operations = [{
        name: 'universal-read',
        capability: 'generated',
        query,
        requiredMatches,
        forbiddenMatches: [{
          path: '/data/documents/nodes/*/physicalDatabaseIdentity',
          value: 'physical-db-c'
        }],
        invariants: [{
          path: '/data/documents/nodes/*/physicalDatabaseIdentity',
          everyEquals: 'physical-db-a',
          min: 1,
          max: 1
        }]
      }];
      return runWorkload([{ id: 'tenant-a', surfaces: [api] }], {
        durationSec: 0.02,
        rps: 1,
        minWorkloadRequestsPerSurface: 1,
        requestTimeoutMs: 1_000,
        maxInFlight: 1,
        canaryIntervalSec: 1,
        warmupTimeoutMs: 1_000,
        warmupTimeoutPerSurfaceMs: 100,
        warmupConcurrency: 1
      });
    };

    const foreign = await run('query UniversalRowsForeign { documents { nodes { physicalDatabaseIdentity } } }', [{
      path: '/data/documents/nodes/0/physicalDatabaseIdentity',
      value: 'physical-db-a'
    }]);
    expect(foreign.samples.find((sample) => sample.phase === 'coverage'))
      .toMatchObject({
        ok: false,
        oracleConclusive: true,
        oracleViolation: true,
        oracleUnavailable: false,
        errorCode: 'GRAPHQL_OPERATION_ORACLE_INVARIANT_UNEXPECTED'
      });

    const empty = await run('query UniversalRowsEmpty { documents { nodes { physicalDatabaseIdentity } } }', [{
      path: '/data/documents/nodes',
      value: []
    }]);
    expect(empty.samples.find((sample) => sample.phase === 'coverage'))
      .toMatchObject({
        ok: false,
        oracleConclusive: false,
        oracleViolation: false,
        oracleUnavailable: false,
        errorCode: 'GRAPHQL_OPERATION_ORACLE_INVARIANT_MISSING'
      });
  });

  it('keeps forbidden canary evidence conclusive when GraphQL also returns errors', async () => {
    const api = surface('api');
    api.canaries = [{
      name: 'partial-foreign',
      query: 'query PartialForeignCanary { tenantToken }',
      requiredMatches: [{ path: '/data/tenantToken', value: 'tenant-a-token' }],
      forbiddenMatches: [{ path: '/data/tenantToken', value: 'tenant-b-token' }]
    }];
    const result = await runWorkload([{ id: 'tenant-a', surfaces: [api] }], {
      durationSec: 0.02,
      rps: 1,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 1,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 1
    });
    expect(result.canaries).toHaveLength(2);
    expect(result.canaries.every((canary) =>
      canary.conclusive && canary.violation
    )).toBe(true);
    expect(result.canaries[0].detail).toBe('GRAPHQL_OPERATION_ORACLE_FORBIDDEN');
  });

  it('uses an untimed post-coverage query as mutation side-effect evidence', async () => {
    const api = surface('api', '{ tenantToken }', 'mutation UploadSubject { __typename }');
    api.operations = [{
      name: 'upload-subject',
      capability: 'uploads',
      query: 'mutation UploadSubject { __typename }',
      postCoverageVerification: {
        query: 'query VerifySideEffect { physicalDatabaseIdentity }',
        requiredMatches: [{
          path: '/data/physicalDatabaseIdentity',
          value: 'physical-db-a'
        }],
        forbiddenMatches: [{
          path: '/data/physicalDatabaseIdentity',
          value: 'physical-db-b'
        }]
      }
    }];
    const result = await runWorkload([{ id: 'tenant-a', surfaces: [api] }], {
      durationSec: 0.02,
      rps: 1,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 1,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 1
    });
    expect(result.samples.find((sample) => sample.phase === 'coverage'))
      .toMatchObject({
        operation: 'upload-subject',
        ok: true,
        oracleConfigured: true,
        oracleConclusive: true,
        oracleViolation: false,
        postCoverageVerification: true
      });
  });

  it('extracts post-verification variables exactly from the primary response', async () => {
    verificationVariables.length = 0;
    const api = surface('api', '{ tenantToken }', 'mutation CorrelatedUploadSubject { uploadAppFile { fileId } }');
    api.operations = [{
      name: 'correlated-upload',
      capability: 'uploads',
      query: 'mutation CorrelatedUploadSubject { uploadAppFile { fileId } }',
      postCoverageVerification: {
        query: 'query VerifyCorrelatedUpload($fileId: ID!, $contentHash: String!) { physicalDatabaseIdentity }',
        variables: { contentHash: 'current-hash' },
        variablesFromResponse: { fileId: '/data/uploadAppFile/fileId' },
        requiredMatches: [{
          path: '/data/physicalDatabaseIdentity',
          value: 'physical-db-a'
        }],
        forbiddenMatches: [{
          path: '/data/physicalDatabaseIdentity',
          value: 'physical-db-b'
        }]
      }
    }];
    const result = await runWorkload([{ id: 'tenant-a', surfaces: [api] }], {
      durationSec: 0.02,
      rps: 1,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 1,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 1
    });
    expect(result.samples.find((sample) => sample.phase === 'coverage'))
      .toMatchObject({
        ok: true,
        oracleConclusive: true,
        postCoverageVerification: true
      });
    expect(verificationVariables).toEqual([{
      contentHash: 'current-hash',
      fileId: 'file-current'
    }]);
  });

  it('fails post-verification before I/O on missing or ambiguous correlation evidence', async () => {
    const run = async (query: string, pointer: string) => {
      const api = surface('api', '{ tenantToken }', query);
      api.operations = [{
        name: 'correlation-failure',
        capability: 'uploads',
        query,
        postCoverageVerification: {
          query: 'query VerifyCorrelatedUpload($fileId: ID!) { physicalDatabaseIdentity }',
          variablesFromResponse: { fileId: pointer },
          requiredMatches: [{
            path: '/data/physicalDatabaseIdentity',
            value: 'physical-db-a'
          }],
          forbiddenMatches: [{
            path: '/data/physicalDatabaseIdentity',
            value: 'physical-db-b'
          }]
        }
      }];
      return runWorkload([{ id: 'tenant-a', surfaces: [api] }], {
        durationSec: 0.02,
        rps: 1,
        minWorkloadRequestsPerSurface: 1,
        requestTimeoutMs: 1_000,
        maxInFlight: 1,
        canaryIntervalSec: 1,
        warmupTimeoutMs: 1_000,
        warmupTimeoutPerSurfaceMs: 100,
        warmupConcurrency: 1
      });
    };

    verificationVariables.length = 0;
    const missing = await run(
      'mutation MissingCorrelationSubject { uploadAppFile { fileId } }',
      '/data/uploadAppFile/fileId'
    );
    expect(missing.samples.find((sample) => sample.phase === 'coverage'))
      .toMatchObject({
        ok: false,
        oracleConclusive: false,
        oracleUnavailable: false,
        errorCode: 'GRAPHQL_POST_COVERAGE_VARIABLE_MISSING'
      });

    const ambiguous = await run(
      'mutation AmbiguousCorrelationSubject { uploads { fileId } }',
      '/data/uploads/*/fileId'
    );
    expect(ambiguous.samples.find((sample) => sample.phase === 'coverage'))
      .toMatchObject({
        ok: false,
        oracleConclusive: false,
        oracleUnavailable: false,
        errorCode: 'GRAPHQL_POST_COVERAGE_VARIABLE_AMBIGUOUS'
      });
    expect(verificationVariables).toEqual([]);
  });

  it('rotates through a stable, staggered 14-round canary permutation', () => {
    const permutation = (tenantId: string, surfaceName: string) =>
      Array.from({ length: 14 }, (_unused, index) =>
        rotatingCanaryIndex(tenantId, surfaceName, 14, index + 1)
      );
    const first = permutation('physical-customer-0001', 'api');
    expect(new Set(first)).toEqual(new Set(Array.from({ length: 14 }, (_, index) => index)));
    expect(permutation('physical-customer-0001', 'api')).toEqual(first);
    const offsets = [
      deterministicCanaryOffset('physical-customer-0001', 'api', 14),
      deterministicCanaryOffset('physical-customer-0001', 'admin', 14),
      deterministicCanaryOffset('physical-customer-0002', 'api', 14)
    ];
    expect(new Set(offsets).size).toBeGreaterThan(1);
    expect(permutation('physical-customer-0001', 'admin')).not.toEqual(first);
  });

  it('runs four rotating periodic canaries in four strict timed rounds', async () => {
    const api = surface('api');
    api.canaries = Array.from({ length: 4 }, (_, index) => ({
      name: `canary-${index}`,
      query: '{ tenantToken }',
      forbiddenMatches: [{ path: '/data/tenantToken', value: 'tenant-b-token' }],
      requiredMatches: [{ path: '/data/tenantToken', value: 'tenant-a-token' }]
    }));
    const result = await runWorkload([{ id: 'tenant-a', surfaces: [api] }], {
      durationSec: 0.25,
      rps: 4,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 4,
      canaryIntervalSec: 0.05,
      periodicCanarySchedule: 'rotating-one',
      canaryConcurrency: 2,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 1
    });

    const periodic = result.canaries.filter((canary) => canary.phase === 'periodic');
    expect(periodic).toHaveLength(4);
    expect(periodic.map((canary) => canary.periodicRound)).toEqual([1, 2, 3, 4]);
    expect(new Set(periodic.map((canary) => canary.canary))).toEqual(
      new Set(api.canaries.map((canary) => canary.name))
    );
    expect(result.canaries.filter((canary) => canary.phase === 'initial')).toHaveLength(4);
    expect(result.canaries.filter((canary) => canary.phase === 'final')).toHaveLength(4);
    expect(result.canarySchedule).toMatchObject({
      schedule: 'rotating-one',
      planned: 4,
      started: 4,
      completed: 4,
      missed: 0,
      checksPlanned: 4,
      checksStarted: 4,
      checksCompleted: 4
    });
    expect(periodic.every((canary) =>
      Date.parse(canary.completedAt) >= Date.parse(canary.startedAt)
      && canary.latencyMs >= 0
    )).toBe(true);
  });

  it('serializes overlapping rounds without dropping them and records deadline-late drain', async () => {
    const api = surface('api');
    api.canaries = [{
      name: 'slow-canary',
      query: '{ SlowCanary: tenantToken }',
      forbiddenMatches: [{ path: '/data/tenantToken', value: 'tenant-b-token' }],
      requiredMatches: [{ path: '/data/tenantToken', value: 'tenant-a-token' }]
    }];
    const startedAt = performance.now();
    const result = await runWorkload([{ id: 'tenant-a', surfaces: [api] }], {
      durationSec: 0.1,
      rps: 1,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 2,
      canaryIntervalSec: 0.02,
      periodicCanarySchedule: 'rotating-one',
      canaryConcurrency: 1,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 1
    });

    expect(performance.now() - startedAt).toBeLessThan(1_500);
    expect(result.canaries.filter((canary) => canary.phase === 'periodic')).toHaveLength(4);
    expect(result.canarySchedule).toMatchObject({
      planned: 4,
      started: 4,
      completed: 4,
      missed: 0
    });
    expect(result.canarySchedule.overlapped).toBeGreaterThan(0);
    expect(result.canarySchedule.deadlineLate).toBeGreaterThan(0);
    expect(result.canarySchedule.rounds.every((round) =>
      round.targetsStarted === 1
      && round.targetsCompleted === 1
      && round.checksCompleted === 1
    )).toBe(true);
  });

  it('warms every surface and proves every configured operation received traffic', async () => {
    const tenants: TenantTarget[] = [{
      id: 'tenant-a',
      surfaces: [surface('api')]
    }];
    const result = await runWorkload(tenants, {
      durationSec: 0.2,
      rps: 10,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 4,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 1
    });

    expect(result.warmedSurfaces.get('tenant-a')).toEqual(new Set(['api']));
    expect(result.capabilities).toEqual(new Set(['generated', 'bm25']));
    expect(result.capabilitiesByTenantSurface.get('tenant-a/api'))
      .toEqual(new Set(['generated', 'bm25']));
    expect(new Set(result.samples.filter((sample) => sample.ok).map((sample) => sample.operation)))
      .toEqual(new Set(['generated', 'search']));
    expect(result.canaries.length).toBeGreaterThanOrEqual(2);
    expect(result.canaries.every((canary) => canary.conclusive && !canary.violation)).toBe(true);
    expect(result.missedArrivals).toBe(0);
  });

  it('signals the warm boundary after coverage and initial canaries but before timed load', async () => {
    const tenants: TenantTarget[] = [{
      id: 'tenant-a',
      surfaces: [surface('api'), surface('admin')]
    }];
    const capture = createWorkloadCapture();
    let boundaryCalls = 0;

    const result = await runWorkload(tenants, {
      durationSec: 0.1,
      rps: 20,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 4,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 2
    }, async () => {
      boundaryCalls++;
      expect(capture.warmedSurfaces.get('tenant-a')).toEqual(new Set(['api', 'admin']));
      expect(capture.samples.filter((sample) => sample.phase === 'coverage')).toHaveLength(4);
      expect(capture.samples.filter((sample) => sample.phase === 'workload')).toHaveLength(0);
      expect(capture.capabilitiesByTenantSurface.get('tenant-a/api'))
        .toEqual(new Set(['generated', 'bm25']));
      expect(capture.capabilitiesByTenantSurface.get('tenant-a/admin'))
        .toEqual(new Set(['generated', 'bm25']));
      expect(capture.canaries).toHaveLength(2);
      expect(capture.canaries.every((canary) => canary.conclusive && !canary.violation))
        .toBe(true);
    }, capture);

    expect(boundaryCalls).toBe(1);
    expect(result.samples.some((sample) => sample.phase === 'workload')).toBe(true);
    expect(result.canaries.length).toBeGreaterThan(2);
  });

  it('fails closed before timed load when the warm-boundary callback rejects', async () => {
    const tenants: TenantTarget[] = [{
      id: 'tenant-a',
      surfaces: [surface('api')]
    }];
    const capture = createWorkloadCapture();

    await expect(runWorkload(tenants, {
      durationSec: 0.1,
      rps: 20,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 4,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 1
    }, async () => {
      expect(capture.samples.filter((sample) => sample.phase === 'coverage')).toHaveLength(2);
      expect(capture.canaries).toHaveLength(1);
      throw new Error('warm-boundary setup failed');
    }, capture)).rejects.toThrow('warm-boundary setup failed');

    expect(capture.samples.filter((sample) => sample.phase === 'workload')).toHaveLength(0);
  });

  it('submits each surface canary sequentially so validation cannot monopolize its pool', async () => {
    peakSlowRequests = 0;
    const api = surface('api');
    api.canaries = Array.from({ length: 4 }, (_, index) => ({
      name: `slow-canary-${index}`,
      query: `{ SlowCanary${index}: tenantToken }`,
      forbiddenMatches: [{ path: '/data/tenantToken', value: 'tenant-b-token' }],
      requiredMatches: [{ path: '/data/tenantToken', value: 'tenant-a-token' }]
    }));

    const result = await runWorkload([{ id: 'tenant-a', surfaces: [api] }], {
      durationSec: 0.02,
      rps: 1,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 8,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 1
    });

    expect(result.canaries).toHaveLength(8);
    expect(result.canaries.every((canary) => canary.conclusive && !canary.violation))
      .toBe(true);
    expect(peakSlowRequests).toBe(1);
  });

  it('uses typed JSON pointers, including wildcards, instead of raw response substrings', () => {
    const body = {
      data: { rows: [{ token: 'tenant-a' }, { token: 'tenant-b' }] },
      extensions: { note: 'tenant-c' }
    };
    expect(jsonPointerValues(body, '/data/rows/*/token')).toEqual(['tenant-a', 'tenant-b']);
    expect(jsonPointerValues(body, '/data/missing')).toEqual([]);
    expect(jsonPointerValues(body, '/extensions/note')).toEqual(['tenant-c']);
  });

  it('bounds concurrent warmups with the configured limit', async () => {
    peakSlowRequests = 0;
    slowWarmRequests = 0;
    const tenants: TenantTarget[] = [{
      id: 'tenant-a',
      surfaces: Array.from({ length: 5 }, (_, index) =>
        surface(`api-${index}`, `{ SlowWarm${index}: tenantToken }`)
      )
    }];

    const result = await runWorkload(tenants, {
      durationSec: 0.02,
      rps: 1,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 8,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 2_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 2
    });

    expect(result.warmedSurfaces.get('tenant-a')?.size).toBe(5);
    expect(peakSlowRequests).toBeLessThanOrEqual(2);
  });

  it('uses one global warmup deadline instead of starting queued work after expiry', async () => {
    slowWarmRequests = 0;
    const tenants: TenantTarget[] = [{
      id: 'tenant-a',
      surfaces: Array.from({ length: 5 }, (_, index) =>
        surface(`api-${index}`, `{ SlowWarm${index}: tenantToken }`)
      )
    }];

    const result = await runWorkload(tenants, {
      durationSec: 0.02,
      rps: 1,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 1,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 10,
      warmupTimeoutPerSurfaceMs: 1,
      warmupConcurrency: 1
    });

    expect(slowWarmRequests).toBeLessThanOrEqual(1);
    expect(result.warmedSurfaces.get('tenant-a')).toBeUndefined();
  });

  it('records saturated arrivals as failures without dispatching a catch-up burst', async () => {
    peakSlowRequests = 0;
    const tenants: TenantTarget[] = [{
      id: 'tenant-a',
      surfaces: [surface('api', '{ tenantToken }', '{ SlowOperation: tenantToken }')]
    }];

    const result = await runWorkload(tenants, {
      durationSec: 0.12,
      rps: 100,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 1,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 1
    });

    expect(result.missedArrivals).toBeGreaterThan(0);
    expect(result.samples.filter((sample) =>
      sample.errorCode === 'LOAD_GENERATOR_MISSED_ARRIVAL'
    )).toHaveLength(result.missedArrivals);
    expect(peakSlowRequests).toBe(1);
  });

  it('measures workload latency from the scheduled open-loop arrival', async () => {
    const tenants: TenantTarget[] = [{
      id: 'tenant-a',
      surfaces: [surface('api', '{ tenantToken }', '{ SlowOperation: tenantToken }')]
    }];

    const result = await runWorkload(tenants, {
      durationSec: 0.08,
      rps: 20,
      minWorkloadRequestsPerSurface: 1,
      requestTimeoutMs: 1_000,
      maxInFlight: 2,
      canaryIntervalSec: 1,
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 100,
      warmupConcurrency: 1
    });

    const dispatched = result.samples.filter((sample) =>
      sample.phase === 'workload'
      && sample.errorCode !== 'LOAD_GENERATOR_MISSED_ARRIVAL'
    );
    expect(dispatched.length).toBeGreaterThan(0);
    expect(dispatched.every((sample) => sample.scheduledAtMs != null)).toBe(true);
    expect(dispatched.every((sample) => sample.latencyMs >= 35)).toBe(true);
  });

  it('resolves fixed-total and per-tenant offered load explicitly', () => {
    expect(resolveOfferedLoad({ rps: 50 }, 10)).toEqual({
      mode: 'fixed-total',
      configuredRps: 50,
      tenantCount: 10,
      totalRps: 50,
      rpsPerTenant: 5
    });
    expect(resolveOfferedLoad({ rpsPerTenant: 2 }, 10)).toEqual({
      mode: 'per-tenant',
      configuredRps: 2,
      tenantCount: 10,
      totalRps: 20,
      rpsPerTenant: 2
    });
    expect(() => resolveOfferedLoad({ rps: 1, rpsPerTenant: 1 }, 1))
      .toThrow('exactly one');
  });

  it('scales the global warmup deadline by concurrency waves', () => {
    expect(resolveWarmupTimeoutMs({
      warmupTimeoutMs: 1_000,
      warmupTimeoutPerSurfaceMs: 500,
      warmupConcurrency: 2
    }, 10)).toBe(2_500);
    expect(resolveWarmupTimeoutMs({
      warmupTimeoutMs: 10_000,
      warmupTimeoutPerSurfaceMs: 500,
      warmupConcurrency: 2
    }, 10)).toBe(10_000);
  });
});
