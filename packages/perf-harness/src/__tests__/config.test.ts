import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  armEnvironmentForHeap,
  assertIsolatedPort,
  assertLoopbackObservabilityUrl,
  assertLoopbackRetainedHeapCheckpointUrl,
  loadFleet,
  loadPlan,
  resolveTemplate,
  tenantCountsForHeap,
  validateAcceptanceGates,
  validateCoverage,
  validateWorkloadPlan} from '../config';
import type { AcceptanceGates, DensityPlanV1, FleetV1 } from '../types';

const validGates: AcceptanceGates = {
  maxErrorRate: 0.005,
  maxP99Ms: 150,
  maxPostWarmupHeapGrowthMiBPerHour: 5,
  minMedianDensityImprovement: 0.15,
  minAdditionalTenantsEveryRun: 1,
  requireZeroBleed: true,
  requireNoPostWarmupEvictions: true,
  requireNoPostWarmupBuildRefusals: true,
  requireNoPostWarmupBuilds: true,
  requirePostgresMemoryTelemetry: false,
  requireFreshPostgresRunAttestation: false,
  requireRetainedMemoryCheckpoints: false,
  requirePhysicalDatabaseTelemetry: false,
  requireConclusiveCanaries: true,
  requireCompletePeriodicCanaryCoverage: false,
  requireConclusiveOperationOracles: false,
  requireExplicitCustomerTopology: false,
  requiredCacheAdmissionMode: null
};

describe('density harness configuration', () => {
  it.each(Object.keys(validGates) as Array<keyof AcceptanceGates>)(
    'fails closed when acceptance gate %s is omitted',
    (key) => {
      const malformed: Partial<AcceptanceGates> = { ...validGates };
      delete malformed[key];
      expect(() => validateAcceptanceGates(malformed as AcceptanceGates)).toThrow(
        `plan.gates.${key}`
      );
    }
  );

  it('validates optional aligned-memory cadence and workload-coverage gates', () => {
    expect(() => validateAcceptanceGates({
      ...validGates,
      maxAlignedMemorySampleGapMs: 1_000,
      minAlignedMemoryCoverageRatio: 0.99
    })).not.toThrow();
    expect(() => validateAcceptanceGates({
      ...validGates,
      maxAlignedMemorySampleGapMs: 0
    })).toThrow('plan.gates.maxAlignedMemorySampleGapMs must be positive');
    expect(() => validateAcceptanceGates({
      ...validGates,
      minAlignedMemoryCoverageRatio: 1.01
    })).toThrow('plan.gates.minAlignedMemoryCoverageRatio must be at most 1');
  });

  it('refuses shared workspace ports by default', () => {
    expect(() => assertIsolatedPort(3000)).toThrow('reserved shared-workspace port');
    expect(() => assertIsolatedPort(5432)).toThrow('reserved shared-workspace port');
    expect(() => assertIsolatedPort(3345)).not.toThrow();
    expect(() => assertIsolatedPort(3000, true)).not.toThrow();
  });

  it('resolves only known template variables', () => {
    expect(resolveTemplate('http://127.0.0.1:{port}/{mode}', {
      port: 3345,
      mode: 'stock'
    })).toBe('http://127.0.0.1:3345/stock');
    expect(() => resolveTemplate('{missing}', {})).toThrow("unknown template variable 'missing'");
  });

  it('accepts exactly one offered-load mode and validates workload traffic budgets', () => {
    const workload = {
      durationSec: 900,
      rps: 50,
      minWorkloadRequestsPerSurface: 10,
      requestTimeoutMs: 30_000,
      maxInFlight: 128,
      canaryIntervalSec: 60,
      warmupTimeoutMs: 180_000,
      warmupTimeoutPerSurfaceMs: 2_000
    };
    expect(() => validateWorkloadPlan(workload)).not.toThrow();
    expect(() => validateWorkloadPlan({
      ...workload,
      rps: undefined,
      rpsPerTenant: 0.2
    })).not.toThrow();
    expect(() => validateWorkloadPlan({ ...workload, rpsPerTenant: 1 }))
      .toThrow('exactly one');
    expect(() => validateWorkloadPlan({
      ...workload,
      rps: undefined,
      rpsPerTenant: undefined
    })).toThrow('exactly one');
    expect(() => validateWorkloadPlan({
      ...workload,
      minWorkloadRequestsPerSurface: 0
    })).toThrow('minWorkloadRequestsPerSurface');
    expect(() => validateWorkloadPlan({
      ...workload,
      periodicCanarySchedule: 'rotating-one',
      canaryConcurrency: 16
    })).not.toThrow();
    expect(() => validateWorkloadPlan({
      ...workload,
      periodicCanarySchedule: 'drop-overlap' as any
    })).toThrow('periodicCanarySchedule');
    expect(() => validateWorkloadPlan({
      ...workload,
      canaryConcurrency: 0
    })).toThrow('canaryConcurrency');
  });

  it('resolves heap-specific ramps with a legacy fallback', () => {
    const plan = {
      tenantCounts: [1, 2],
      tenantCountsByHeapMiB: { 2048: [4, 8] }
    } as unknown as DensityPlanV1;
    expect(tenantCountsForHeap(plan, 1024)).toEqual([1, 2]);
    expect(tenantCountsForHeap(plan, 2048)).toEqual([4, 8]);
    expect(() => tenantCountsForHeap({} as DensityPlanV1, 4096))
      .toThrow('no tenant-count ramp');
  });

  it('overrides only the selected heap-specific environment', () => {
    const arm = {
      env: { SHARED: 'base', OVERRIDE: 'base' },
      envByHeapMiB: {
        1024: { OVERRIDE: 'one', CALIBRATION: 'cal-1' },
        2048: { OVERRIDE: 'two', CALIBRATION: 'cal-2' }
      }
    };
    expect(armEnvironmentForHeap(arm, 1024)).toEqual({
      SHARED: 'base',
      OVERRIDE: 'one',
      CALIBRATION: 'cal-1'
    });
    expect(armEnvironmentForHeap(arm, 2048).CALIBRATION).toBe('cal-2');
  });

  it('requires a complete and exact heap-specific environment map', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-plan-env-'));
    const file = path.join(directory, 'plan.json');
    const plan: any = {
      version: 1,
      fleetFile: 'fleet.json',
      artifactDir: 'artifacts',
      arms: [{
        name: 'calibrated',
        port: 3345,
        readinessUrl: 'http://127.0.0.1:3345/healthz',
        memoryUrl: 'http://127.0.0.1:3345/debug/memory',
        introspectionMode: 'stock',
        envByHeapMiB: { 1024: { GRAPHILE_CACHE_CALIBRATION_ID: 'cal-1' } }
      }],
      heapMiB: [1024, 2048],
      tenantCounts: [1],
      repetitions: 1,
      requiredCapabilities: ['graphile'],
      requiredCanaries: ['cross-schema'],
      workload: {
        durationSec: 900,
        rpsPerTenant: 1,
        minWorkloadRequestsPerSurface: 1,
        requestTimeoutMs: 30_000,
        maxInFlight: 1,
        canaryIntervalSec: 60,
        warmupTimeoutMs: 30_000,
        warmupTimeoutPerSurfaceMs: 30_000
      },
      gates: { ...validGates, requireExplicitCustomerTopology: false }
    };
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).toThrow("envByHeapMiB is missing heap '2048'");
    plan.arms[0].envByHeapMiB['2048'] = { GRAPHILE_CACHE_CALIBRATION_ID: 'cal-2' };
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).not.toThrow();
    plan.arms[0].envByHeapMiB['4096'] = { GRAPHILE_CACHE_CALIBRATION_ID: 'cal-3' };
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).toThrow("contains unconfigured heap '4096'");
  });

  it('validates an enabled soak against an exact configured arm and heap', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-plan-soak-'));
    const file = path.join(directory, 'plan.json');
    const plan: any = {
      version: 1,
      fleetFile: 'fleet.json',
      artifactDir: 'artifacts',
      arms: [{
        name: 'candidate',
        port: 3345,
        readinessUrl: 'http://127.0.0.1:3345/healthz',
        memoryUrl: 'http://127.0.0.1:3345/debug/memory',
        introspectionMode: 'scoped-required'
      }],
      heapMiB: [1024],
      tenantCounts: [1],
      repetitions: 1,
      requiredCapabilities: ['graphile'],
      requiredCanaries: ['cross-schema'],
      workload: {
        durationSec: 900,
        rpsPerTenant: 1,
        minWorkloadRequestsPerSurface: 1,
        requestTimeoutMs: 30_000,
        maxInFlight: 1,
        canaryIntervalSec: 60,
        warmupTimeoutMs: 30_000,
        warmupTimeoutPerSurfaceMs: 30_000
      },
      gates: validGates,
      soak: {
        enabled: true,
        arm: 'candidate',
        durationSec: 7_200,
        tenantCount: 1,
        heapMiB: 1024
      }
    };
    const write = (): void => fs.writeFileSync(file, JSON.stringify(plan));

    write();
    expect(() => loadPlan(file)).not.toThrow();
    plan.soak.heapMiB = 2048;
    write();
    expect(() => loadPlan(file)).toThrow('plan.soak.heapMiB=2048 is not configured');
    plan.soak.heapMiB = 1024;
    plan.soak.arm = 'missing';
    write();
    expect(() => loadPlan(file)).toThrow("plan.soak.arm 'missing' is not configured");
    plan.soak.arm = 'candidate';
    plan.soak.durationSec = 1.5;
    write();
    expect(() => loadPlan(file)).toThrow('plan.soak.durationSec must be a safe integer');

    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('sends observability credentials only to the exact loopback memory route', () => {
    expect(() => assertLoopbackObservabilityUrl(
      'http://127.0.0.1:3345/debug/memory',
      3345
    )).not.toThrow();
    expect(() => assertLoopbackObservabilityUrl(
      'http://[::1]:3345/debug/memory',
      3345
    )).not.toThrow();
    expect(() => assertLoopbackObservabilityUrl(
      'https://example.com:3345/debug/memory',
      3345
    )).toThrow('memoryUrl must be the credential-free URL');
    expect(() => assertLoopbackObservabilityUrl(
      'http://127.0.0.1:3345/debug/memory?token=secret',
      3345
    )).toThrow('memoryUrl must be the credential-free URL');
  });

  it('accepts only the exact credential-free retained-memory checkpoint route', () => {
    expect(() => assertLoopbackRetainedHeapCheckpointUrl(
      'http://127.0.0.1:3345/__cperf/retained-memory-checkpoint',
      3345
    )).not.toThrow();
    expect(() => assertLoopbackRetainedHeapCheckpointUrl(
      'http://127.0.0.1:3345/__cperf/retained-memory-checkpoint?token=secret',
      3345
    )).toThrow('retainedHeapCheckpointUrl must be the credential-free URL');
    expect(() => assertLoopbackRetainedHeapCheckpointUrl(
      'https://example.com:3345/__cperf/retained-memory-checkpoint',
      3345
    )).toThrow('retainedHeapCheckpointUrl must be the credential-free URL');
  });

  it('requires spawned arms to expose GC and explicitly enable the checkpoint', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-plan-gc-'));
    const file = path.join(directory, 'plan.json');
    const plan: any = {
      version: 1,
      fleetFile: 'fleet.json',
      artifactDir: 'artifacts',
      arms: [{
        name: 'candidate',
        commit: 'a'.repeat(40),
        command: [process.execPath, '/tmp/server.cjs'],
        port: 3345,
        readinessUrl: 'http://127.0.0.1:3345/healthz',
        memoryUrl: 'http://127.0.0.1:3345/debug/memory',
        retainedHeapCheckpointUrl:
          'http://127.0.0.1:{port}/__cperf/retained-memory-checkpoint',
        introspectionMode: 'stock',
        env: {}
      }],
      heapMiB: [1024],
      tenantCounts: [1],
      repetitions: 1,
      requiredCapabilities: ['graphile'],
      requiredCanaries: ['cross-schema'],
      workload: {
        durationSec: 900,
        rpsPerTenant: 1,
        minWorkloadRequestsPerSurface: 1,
        requestTimeoutMs: 30_000,
        maxInFlight: 1,
        canaryIntervalSec: 60,
        warmupTimeoutMs: 30_000,
        warmupTimeoutPerSurfaceMs: 30_000
      },
      gates: {
        ...validGates,
        requireExplicitCustomerTopology: false,
        requireRetainedMemoryCheckpoints: true
      }
    };
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).toThrow('--expose-gc');
    plan.arms[0].command.splice(1, 0, '--expose-gc');
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).toThrow('GRAPHQL_CPERF_RETAINED_HEAP_ENABLED=true');
    plan.arms[0].env.GRAPHQL_CPERF_RETAINED_HEAP_ENABLED = 'true';
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).not.toThrow();
    plan.arms[0].v8Profile = 'jitless-optimize-for-size';
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).not.toThrow();
    plan.arms[0].v8Profile = 'baseline-optimize-for-size';
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).not.toThrow();
    plan.arms[0].v8Profile = 'jitless-optimize-for-size';
    plan.arms[0].command.splice(1, 0, '--jitless');
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).toThrow('managed V8 flags through v8Profile');
    plan.arms[0].command.splice(1, 1);
    plan.arms[0].v8Profile = 'arbitrary-flags';
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).toThrow('unknown v8Profile');
    plan.arms[0].v8Profile = 'stock';
    plan.gates.requiredCacheAdmissionMode = 'drop-resident';
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).toThrow('requiredCacheAdmissionMode');
  });

  it('requires a concrete fresh PostgreSQL prepare and server binding', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-plan-pg-run-'));
    const file = path.join(directory, 'plan.json');
    const plan: any = {
      version: 1,
      fleetFile: 'fleet.json',
      artifactDir: 'artifacts',
      arms: [{
        name: 'candidate',
        commit: 'a'.repeat(40),
        command: [process.execPath, '/tmp/server.cjs'],
        port: 3345,
        readinessUrl: 'http://127.0.0.1:3345/healthz',
        memoryUrl: 'http://127.0.0.1:3345/debug/memory',
        introspectionMode: 'stock'
      }],
      heapMiB: [1024],
      tenantCounts: [1],
      repetitions: 1,
      requiredCapabilities: ['graphile'],
      requiredCanaries: ['cross-schema'],
      workload: {
        durationSec: 900,
        rpsPerTenant: 1,
        minWorkloadRequestsPerSurface: 1,
        requestTimeoutMs: 30_000,
        maxInFlight: 1,
        canaryIntervalSec: 60,
        warmupTimeoutMs: 30_000,
        warmupTimeoutPerSurfaceMs: 30_000
      },
      gates: {
        ...validGates,
        requireExplicitCustomerTopology: false,
        requireFreshPostgresRunAttestation: true
      }
    };
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).toThrow('postgresRunAttestation.command');
    plan.arms[0].postgresRunAttestation = {
      command: [process.execPath, '/tmp/audit.cjs'],
      prepareCommand: [process.execPath, '/tmp/prepare.cjs']
    };
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).toThrow('does not bind the fresh PostgreSQL fixture');
    plan.arms[0].command.push(
      '{postgresManifestFile}',
      '{postgresSecretsFile}',
      '{postgresManifestSha256}',
      '{postgresCloneId}'
    );
    plan.arms[0].postgresRunAttestation.prepareCommand.push(
      '{postgresFixtureDir}',
      '{arm}',
      '{heapMiB}',
      '{tenantCount}',
      '{repetition}',
      '{runOrderIndex}'
    );
    plan.arms[0].postgresRunAttestation.command.push(
      '{postgresManifestFile}',
      '{postgresSecretsFile}',
      '{attestationFile}',
      '{planSha256}',
      '{fleetSha256}',
      '{notBeforeEpochMs}'
    );
    fs.writeFileSync(file, JSON.stringify(plan));
    expect(() => loadPlan(file)).not.toThrow();
  });

  it('rejects a surface without isolation canaries', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-config-'));
    const file = path.join(directory, 'fleet.json');
    fs.writeFileSync(file, JSON.stringify({
      version: 1,
      tenants: [{
        id: 'tenant-a',
        surfaces: [{
          name: 'api',
          buildContract: 'tenant-a-api',
          url: 'http://127.0.0.1:3345/graphql',
          warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
          operations: [{ name: 'read', capability: 'graphile', query: '{ __typename }' }],
          canaries: []
        }]
      }]
    }));
    expect(() => loadFleet(file)).toThrow('has no isolation canaries');
  });

  it('rejects a canary that can pass on an empty result', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-config-'));
    const file = path.join(directory, 'fleet.json');
    fs.writeFileSync(file, JSON.stringify({
      version: 1,
      tenants: [{
        id: 'tenant-a',
        surfaces: [{
          name: 'api',
          buildContract: 'tenant-a-api',
          url: 'http://127.0.0.1:3345/graphql',
          warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
          operations: [{ name: 'read', capability: 'graphile', query: '{ __typename }' }],
          canaries: [{
            name: 'cross-schema',
            query: '{ __typename }',
            forbiddenMatches: [{ path: '/data/token', value: 'tenant-b' }]
          }]
        }]
      }]
    }));
    expect(() => loadFleet(file)).toThrow('requiredMatches');
  });

  it('validates paired operation oracles and post-coverage verification queries', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-operation-oracle-'));
    const file = path.join(directory, 'fleet.json');
    const operation: any = {
      name: 'upload',
      capability: 'uploads',
      query: 'mutation { upload { id } }',
      postCoverageVerification: {
        query: 'query ($fileId: UUID!, $contentHash: String!) { uploadedFiles(where: { id: { equalTo: $fileId }, contentHash: { equalTo: $contentHash } }) { nodes { physicalDatabaseIdentity } } }',
        variables: { contentHash: 'fixture-hash' },
        variablesFromResponse: { fileId: '/data/upload/id' },
        requiredMatches: [{
          path: '/data/uploadedFiles/nodes/0/physicalDatabaseIdentity',
          value: 'physical-db-a'
        }],
        forbiddenMatches: [{
          path: '/data/uploadedFiles/nodes/0/physicalDatabaseIdentity',
          value: 'physical-db-b'
        }],
        invariants: [{
          path: '/data/uploadedFiles/nodes/*/physicalDatabaseIdentity',
          everyEquals: 'physical-db-a',
          min: 1,
          max: 1
        }]
      }
    };
    const fleet = {
      version: 1,
      tenants: [{
        id: 'tenant-a',
        surfaces: [{
          name: 'api',
          buildContract: 'tenant-a-api',
          url: 'http://127.0.0.1:3345/graphql',
          warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
          operations: [operation],
          canaries: [{
            name: 'cross-schema',
            query: '{ __typename }',
            requiredMatches: [{ path: '/data/token', value: 'tenant-a' }],
            forbiddenMatches: [{ path: '/data/token', value: 'tenant-b' }]
          }]
        }]
      }]
    };
    fs.writeFileSync(file, JSON.stringify(fleet));
    expect(() => loadFleet(file)).not.toThrow();

    operation.postCoverageVerification.variablesFromResponse.contentHash =
      '/data/upload/contentHash';
    fs.writeFileSync(file, JSON.stringify(fleet));
    expect(() => loadFleet(file)).toThrow('collides with a static variable');
    delete operation.postCoverageVerification.variablesFromResponse.contentHash;

    operation.postCoverageVerification.invariants[0].min = 0;
    fs.writeFileSync(file, JSON.stringify(fleet));
    expect(() => loadFleet(file)).toThrow('min must be a positive safe integer');
    operation.postCoverageVerification.invariants[0].min = 1;

    delete operation.postCoverageVerification.forbiddenMatches;
    fs.writeFileSync(file, JSON.stringify(fleet));
    expect(() => loadFleet(file)).toThrow(
      'postCoverageVerification.forbiddenMatches'
    );

    delete operation.postCoverageVerification;
    operation.requiredMatches = [{ path: '/data/token', value: 'tenant-a' }];
    fs.writeFileSync(file, JSON.stringify(fleet));
    expect(() => loadFleet(file)).toThrow(
      'must configure requiredMatches and forbiddenMatches together'
    );
  });

  it('validates exact realtime probes and keeps sensitive headers environment-backed', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-realtime-fleet-'));
    const file = path.join(directory, 'fleet.json');
    const surface: any = {
      name: 'api',
      buildContract: 'customer-a-api',
      url: 'http://127.0.0.1:3345/customer/customer-a/tenant/a/graphql',
      headers: { 'accept-language': 'es' },
      warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
      operations: [{ name: 'read', capability: 'graphile', query: '{ __typename }' }],
      canaries: [{
        name: 'cross-schema',
        query: '{ token }',
        requiredMatches: [{ path: '/data/token', value: 'tenant-a' }],
        forbiddenMatches: [{ path: '/data/token', value: 'tenant-b' }]
      }],
      realtime: {
        headersFromEnvironment: { authorization: 'CPERF_RUNTIME_TOKEN' },
        subscription: {
          query: 'subscription { event { token } }',
          requiredMatches: [{ path: '/data/event/token', value: 'tenant-a' }],
          forbiddenMatches: [{ path: '/data/event/token', value: 'tenant-b' }]
        },
        prime: {
          query: 'mutation Prime($payload: String!) { prime(payload: $payload) { token payload } }',
          variables: { payload: 'configured-placeholder' },
          requiredMatches: [{ path: '/data/prime/token', value: 'tenant-a' }],
          forbiddenMatches: [{ path: '/data/prime/token', value: 'tenant-b' }]
        },
        correlation: {
          primeVariable: 'payload',
          primeResponsePath: '/data/prime/payload',
          subscriptionEventPath: '/data/event/payload'
        }
      }
    };
    const fleet: any = {
      version: 1,
      tenants: [{
        id: 'customer-a',
        databases: [{
          id: 'database-a',
          physicalDatabase: 'customer_a',
          apis: [{
            id: 'api-a',
            runtimePoolIdentity: 'pg:v1:customer-a',
            physicalSchemas: ['tenant_a'],
            routingLabels: ['customer-a'],
            realtime: true,
            surfaces: ['api']
          }]
        }],
        surfaces: [surface]
      }]
    };
    fs.writeFileSync(file, JSON.stringify(fleet));
    expect(() => loadFleet(file)).not.toThrow();

    surface.realtime.subscription.requiredMatches.push({
      path: '/data/event/payload',
      value: 'configured-placeholder'
    });
    fs.writeFileSync(file, JSON.stringify(fleet));
    expect(() => loadFleet(file)).toThrow(
      'correlation paths must not carry a static required match'
    );
    surface.realtime.subscription.requiredMatches.pop();

    surface.realtime.correlation.subscriptionEventPath = '/data/event/*/payload';
    fs.writeFileSync(file, JSON.stringify(fleet));
    expect(() => loadFleet(file)).toThrow('realtime.correlation is invalid');
    surface.realtime.correlation.subscriptionEventPath = '/data/event/payload';

    surface.realtime.correlation.subscriptionEventPath = '/data/event/~2payload';
    fs.writeFileSync(file, JSON.stringify(fleet));
    expect(() => loadFleet(file)).toThrow('realtime.correlation is invalid');
    surface.realtime.correlation.subscriptionEventPath = '/data/event/payload';

    surface.headers.authorization = 'persisted-secret';
    fs.writeFileSync(file, JSON.stringify(fleet));
    expect(() => loadFleet(file)).toThrow(
      'authorization must use realtime.headersFromEnvironment'
    );
  });

  it('fails coverage when a required canary is absent from any surface', () => {
    const fleet = {
      version: 1,
      tenants: [{
        id: 'tenant-a',
        surfaces: [{
          name: 'api',
          buildContract: 'tenant-a-api',
          url: 'http://127.0.0.1:3345/graphql',
          warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
          operations: [{ name: 'read', capability: 'graphile', query: '{ __typename }' }],
          canaries: [{
            name: 'cross-schema',
            query: '{ canary }',
            forbiddenMatches: [{ path: '/data/canary', value: 'tenant-b' }],
            requiredMatches: [{ path: '/data/canary', value: 'tenant-a' }]
          }]
        }]
      }]
    } as FleetV1;
    const plan = {
      tenantCounts: [1],
      requiredCapabilities: ['graphile'],
      requiredCanaries: ['cross-schema', 'prepared-reuse']
    } as DensityPlanV1;
    expect(() => validateCoverage(plan, fleet)).toThrow('lacks canaries: prepared-reuse');
  });

  it('requires every tenant to configure every required capability', () => {
    const surface = (tenant: string, capability: string) => ({
      name: 'api',
      buildContract: `${tenant}-api`,
      url: 'http://127.0.0.1:3345/graphql',
      warmup: { name: 'warm', capability, query: '{ __typename }' },
      operations: [{ name: 'read', capability, query: '{ __typename }' }],
      canaries: [{
        name: 'cross-schema',
        query: '{ token }',
        forbiddenMatches: [{ path: '/data/token', value: 'other' }],
        requiredMatches: [{ path: '/data/token', value: tenant }]
      }]
    });
    const fleet = {
      version: 1,
      tenants: [
        { id: 'tenant-a', surfaces: [surface('tenant-a', 'graphile')] },
        { id: 'tenant-b', surfaces: [surface('tenant-b', 'bm25')] }
      ]
    } as FleetV1;
    const plan = {
      tenantCounts: [2],
      requiredCapabilities: ['graphile', 'bm25'],
      requiredCanaries: ['cross-schema']
    } as DensityPlanV1;

    expect(() => validateCoverage(plan, fleet)).toThrow(
      'tenant-a has no operations for capabilities: bm25'
    );
  });

  it('requires an exact contract for every arm when arm-specific identities are used', () => {
    const fleet = {
      version: 1,
      tenants: [{
        id: 'tenant-a',
        surfaces: [{
          name: 'api',
          buildContract: '',
          buildContracts: { stock: 'stock-hash' },
          url: 'http://127.0.0.1:{port}/graphql',
          warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
          operations: [{ name: 'read', capability: 'graphile', query: '{ __typename }' }],
          canaries: [{
            name: 'cross-schema',
            query: '{ token }',
            forbiddenMatches: [{ path: '/data/token', value: 'tenant-b' }],
            requiredMatches: [{ path: '/data/token', value: 'tenant-a' }]
          }]
        }]
      }]
    } as FleetV1;
    const plan = {
      arms: [
        { name: 'stock' },
        { name: 'scoped' }
      ],
      tenantCounts: [1],
      requiredCapabilities: ['graphile'],
      requiredCanaries: ['cross-schema']
    } as DensityPlanV1;

    expect(() => validateCoverage(plan, fleet)).toThrow(
      'lacks exact build contracts for arms: scoped'
    );
  });

  it('rejects one build contract reused across different tenants', () => {
    const makeTenant = (id: string) => ({
      id,
      surfaces: [{
        name: 'api',
        buildContract: 'shared-contract',
        url: 'http://127.0.0.1:3345/graphql',
        warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
        operations: [{ name: 'read', capability: 'graphile', query: '{ __typename }' }],
        canaries: [{
          name: 'cross-schema',
          query: '{ token }',
          forbiddenMatches: [{ path: '/data/token', value: 'other' }],
          requiredMatches: [{ path: '/data/token', value: id }]
        }]
      }]
    });
    const fleet = {
      version: 1,
      tenants: [makeTenant('tenant-a'), makeTenant('tenant-b')]
    } as FleetV1;
    const plan = {
      tenantCounts: [1, 2],
      requiredCapabilities: ['graphile'],
      requiredCanaries: ['cross-schema']
    } as DensityPlanV1;
    expect(() => validateCoverage(plan, fleet)).toThrow(
      "build contract 'shared-contract' for arm 'default' is reused across tenants"
    );
  });

  it('requires an explicit customer/database/API map for qualifying fleets', () => {
    const surface = {
      name: 'api',
      buildContract: 'tenant-a-build',
      url: 'http://127.0.0.1:3345/graphql',
      warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
      operations: [{ name: 'read', capability: 'graphile', query: '{ __typename }' }],
      canaries: [{
        name: 'cross-schema',
        query: '{ token }',
        forbiddenMatches: [{ path: '/data/token', value: 'tenant-b' }],
        requiredMatches: [{ path: '/data/token', value: 'tenant-a' }]
      }]
    };
    const fleet = {
      version: 1,
      tenants: [{ id: 'customer-a', surfaces: [surface] }]
    } as FleetV1;
    const plan = {
      tenantCounts: [1],
      requiredCapabilities: ['graphile'],
      requiredCanaries: ['cross-schema'],
      gates: { requireExplicitCustomerTopology: true }
    } as DensityPlanV1;
    expect(() => validateCoverage(plan, fleet)).toThrow(
      'customer-a has no explicit customer -> database -> API topology'
    );
  });

  it('rejects one runtime pool identity reused across customers', () => {
    const customer = (id: string) => ({
      id,
      databases: [{
        id: `${id}-database`,
        physicalDatabase: 'fixture',
        apis: [{
          id: `${id}-api`,
          runtimePoolIdentity: 'pg:v1:shared',
          physicalSchemas: [`${id}_api`],
          routingLabels: [`${id}.api.localhost`],
          realtime: false,
          surfaces: ['api']
        }]
      }],
      surfaces: [{
        name: 'api',
        buildContract: `${id}-build`,
        url: 'http://127.0.0.1:3345/graphql',
        warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
        operations: [{ name: 'read', capability: 'graphile', query: '{ __typename }' }],
        canaries: [{
          name: 'cross-schema',
          query: '{ token }',
          forbiddenMatches: [{ path: '/data/token', value: 'other' }],
          requiredMatches: [{ path: '/data/token', value: id }]
        }]
      }]
    });
    const fleet = {
      version: 1,
      tenants: [customer('customer-a'), customer('customer-b')]
    } as FleetV1;
    const plan = {
      tenantCounts: [1, 2],
      requiredCapabilities: ['graphile'],
      requiredCanaries: ['cross-schema'],
      gates: { requireExplicitCustomerTopology: true }
    } as DensityPlanV1;
    expect(() => validateCoverage(plan, fleet)).toThrow(
      "runtime pool identity 'pg:v1:shared' for arm 'default' is reused across customers"
    );
  });

  it('rejects a strict rotating qualification with fewer rounds than canaries', () => {
    const canaries = Array.from({ length: 4 }, (_, index) => ({
      name: `canary-${index}`,
      query: '{ token }',
      forbiddenMatches: [{ path: '/data/token', value: 'tenant-b' }],
      requiredMatches: [{ path: '/data/token', value: 'tenant-a' }]
    }));
    const fleet = {
      version: 1,
      tenants: [{
        id: 'customer-a',
        surfaces: [{
          name: 'api',
          buildContract: 'customer-a-api',
          url: 'http://127.0.0.1:3345/graphql',
          warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
          operations: [{ name: 'read', capability: 'graphile', query: '{ __typename }' }],
          canaries
        }]
      }]
    } as FleetV1;
    const plan = {
      tenantCounts: [1],
      requiredCapabilities: ['graphile'],
      requiredCanaries: canaries.map((canary) => canary.name),
      workload: {
        durationSec: 120,
        rps: 1,
        minWorkloadRequestsPerSurface: 1,
        requestTimeoutMs: 1_000,
        maxInFlight: 1,
        canaryIntervalSec: 60,
        periodicCanarySchedule: 'rotating-one',
        warmupTimeoutMs: 1_000,
        warmupTimeoutPerSurfaceMs: 100
      },
      gates: {
        requireExplicitCustomerTopology: false,
        requireCompletePeriodicCanaryCoverage: true
      }
    } as DensityPlanV1;
    expect(() => validateCoverage(plan, fleet)).toThrow(
      'rotating periodic canary schedule has 1 timed rounds but a qualifying surface configures 4 canaries'
    );
    plan.workload.durationSec = 300;
    expect(() => validateCoverage(plan, fleet)).not.toThrow();
  });
});
