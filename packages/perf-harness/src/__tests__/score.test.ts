import { createHash } from 'node:crypto';

import { rotatingCanaryIndex } from '../http';
import {
  alignedServiceMemoryCoverage,
  alignedServiceMemoryPeak,
  compareDensity,
  heapGrowthMiBPerHour,
  percentile,
  retainedMemoryGrowth,
  type ScoreInput,
  scoreRun,
  summarizeCapacityBoundaries} from '../score';
import type {
  AcceptanceGates,
  ArmProvenance,
  DensityRunResult,
  MemorySnapshot,
  PostgresRunAttestationEvidence,
  RetainedMemoryCheckpoint,
  TenantTarget
} from '../types';

const gates: AcceptanceGates = {
  maxErrorRate: 0.005,
  maxP99Ms: 150,
  maxPostWarmupHeapGrowthMiBPerHour: 5,
  minMedianDensityImprovement: 0.15,
  minAdditionalTenantsEveryRun: 1,
  maxAlignedMemorySampleGapMs: 900_000,
  minAlignedMemoryCoverageRatio: 0.99,
  requireZeroBleed: true,
  requireNoPostWarmupEvictions: true,
  requireNoPostWarmupBuildRefusals: true,
  requireNoPostWarmupBuilds: true,
  requirePostgresMemoryTelemetry: true,
  requireFreshPostgresRunAttestation: false,
  requireRetainedMemoryCheckpoints: true,
  requirePhysicalDatabaseTelemetry: false,
  requireConclusiveCanaries: true,
  requireCompletePeriodicCanaryCoverage: false,
  requireConclusiveOperationOracles: false,
  requireExplicitCustomerTopology: false,
  requiredCacheAdmissionMode: null
};

const tenant: TenantTarget = {
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
      forbiddenMatches: [{ path: '/data/tenantToken', value: 'tenant-b' }],
      requiredMatches: [{ path: '/data/tenantToken', value: 'tenant-a' }]
    }]
  }]
};

const memory = (minute: number, heapMiB: number, evictions = 0): MemorySnapshot => ({
  timestamp: new Date(Date.UTC(2026, 6, 31, 0, minute)).toISOString(),
  pid: 42,
  nodeEnv: 'production',
  heapLimitBytes: 1024 * 1024 ** 2,
  heapUsedBytes: heapMiB * 1024 ** 2,
  rssBytes: 200 * 1024 ** 2,
  processPeakRssBytes: 220 * 1024 ** 2,
  cacheSize: 1,
  residentBuildContractFingerprints: ['tenant-a-api'],
  residentBuildContracts: ['tenant-a-api'],
  evictions,
  buildRefusals: 0,
  buildsStarted: 1,
  buildsSucceeded: 1,
  buildMaxMs: 80,
  pgPoolCacheSize: 2,
  pgPoolLeasedPools: 1,
  pgPoolActiveLeases: 1,
  pgPoolCapacityEvictions: 0,
  pgPoolCapacityRefusals: 0,
  pgPoolDisposalFailures: 0,
  cacheCountersAvailable: true,
  buildCountersAvailable: true
});

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(record[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

const retainedCheckpoint = (
  minute: number,
  heapMiB: number,
  externalMiB = 10
): RetainedMemoryCheckpoint => {
  const state = {
    pid: 42,
    graphileInFlight: 0,
    residentBuildContracts: ['tenant-a-api'],
    residentBuildContractFingerprints: ['tenant-a-api'],
    counters: { buildsStarted: 1, evictions: 0 }
  };
  const stateSha256 = `sha256:${createHash('sha256')
    .update(canonicalJson(state))
    .digest('hex')}`;
  const guard = {
    pid: 42,
    graphileInFlight: 0,
    residentBuildContracts: ['tenant-a-api'],
    stateSha256,
    state
  };
  return {
    version: 1,
    fixture: 'physical-database-density-v1',
    pid: 42,
    gcRounds: 8,
    stableSampleCount: 3,
    stable: true,
    samples: Array.from({ length: 8 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 6, 31, 0, minute, 0, index)).toISOString(),
      monotonicNs: String(BigInt(minute) * 60_000_000_000n + BigInt(index + 1)),
      heapUsedBytes: heapMiB * 1024 ** 2,
      externalBytes: externalMiB * 1024 ** 2,
      arrayBuffersBytes: 2 * 1024 ** 2,
      rssBytes: 200 * 1024 ** 2
    })),
    guardBefore: guard,
    guardAfter: guard,
    errors: []
  };
};

const retainedCheckpointWithState = (
  minute: number,
  state: Record<string, unknown>
): RetainedMemoryCheckpoint => {
  const checkpoint = retainedCheckpoint(minute, minute === 0 ? 100 : 101);
  const stateHash = `sha256:${createHash('sha256')
    .update(canonicalJson(state))
    .digest('hex')}`;
  const residentBuildContracts = Array.isArray(state.residentBuildContracts)
    ? state.residentBuildContracts as string[]
    : ['tenant-a-api'];
  const guard = {
    pid: 42,
    graphileInFlight: 0,
    residentBuildContracts,
    stateSha256: stateHash,
    state
  };
  return { ...checkpoint, guardBefore: guard, guardAfter: guard };
};

const retainedPhysicalState = (
  httpRequestsStarted: number,
  httpRequestsCompleted: number,
  realtimeConnectionsActive = 1
): Record<string, unknown> => ({
  pid: 42,
  graphileInFlight: 0,
  residentBuildContracts: ['tenant-a-api'],
  residentBuildContractFingerprints: ['tenant-a-api'],
  cacheCounters: {
    httpRequestsStarted,
    httpRequestsCompleted,
    websocketUpgradesStarted: 1,
    websocketUpgradesCompleted: 0,
    evictions: { lru: 0 },
    buildRefusals: { resident_capacity: 0 }
  },
  realtime: { connectionsExpected: 1, connectionsActive: realtimeConnectionsActive }
});

const provenance: ArmProvenance = {
  cwd: '/workspace/constructive',
  command: ['/usr/bin/node', '/workspace/constructive/dist/server.js'],
  gitHead: 'a'.repeat(40),
  worktreeDirty: false,
  gitStatusSha256: 'b'.repeat(64),
  lockfilePath: '/workspace/constructive/pnpm-lock.yaml',
  lockfileSha256: 'c'.repeat(64),
  entryPath: '/workspace/constructive/dist/server.js',
  entrySha256: 'd'.repeat(64),
  serverPid: 42,
  v8Profile: 'stock',
  nodeOptions: '--max-old-space-size=1024',
  nodeOptionsArgv: ['--max-old-space-size=1024'],
  nodeExecArgv: [],
  effectiveNodeRuntimeFlags: ['--max-old-space-size=1024'],
  planSha256: 'e'.repeat(64),
  fleetSha256: 'f'.repeat(64),
  node: process.version,
  v8: process.versions.v8,
  platform: 'linux',
  architecture: 'x64',
  runOrderSeed: 'test-seed',
  runOrderIndex: 1,
  memoryPolicy: {
    configuredMaxOldSpaceMiB: 1024,
    expectedV8HeapLimitBytes: 1024 * 1024 ** 2,
    graphileCacheMax: null,
    graphileCacheInstanceHeapBytes: null,
    graphileCacheServerReserveBytes: null,
    graphileCacheBuildReserveBytes: null,
    graphileCacheRssLimitBytes: null,
    graphileCacheRssBuildReserveBytes: null,
    graphileCacheCalibrationId: null,
    graphileCacheAdmissionMode: null,
    graphileBuildMaxConcurrency: null
  }
};

const qualifyingInput = (): ScoreInput => ({
  arm: 'scoped-introspection',
  evidenceMode: 'qualification',
  campaignId: '8'.repeat(64),
  scheduleSha256: '9'.repeat(64),
  previousResultPayloadSha256: null,
  qualificationCohortSha256: 'a'.repeat(64),
  introspectionMode: 'scoped-required',
  heapMiB: 1024,
  repetition: 1,
  expectedMatrixRepetitions: 1,
  runKind: 'matrix',
  runOrderSeed: 'test-seed',
  runOrderIndex: 1,
  startedAt: '2026-07-31T00:00:00.000Z',
  endedAt: '2026-07-31T00:15:00.000Z',
  configuredDurationSec: 900,
  workloadDurationMs: 900_000,
  artifactDir: '/tmp/result',
  tenants: [tenant],
  warmedSurfaces: new Map([['tenant-a', new Set(['api'])]]),
  warmupLatencies: [80],
  resolvedWarmupTimeoutMs: 180_000,
  offeredLoad: {
    mode: 'per-tenant',
    configuredRps: 1,
    tenantCount: 1,
    totalRps: 1,
    rpsPerTenant: 1
  },
  canaryIntervalSec: 60,
  periodicCanarySchedule: 'full-sweep',
  canarySchedule: null,
  minWorkloadRequestsPerSurface: 1,
  samples: [{
    tenantId: 'tenant-a',
    surface: 'api',
    operation: 'read',
    capability: 'graphile',
    latencyMs: 20,
    status: 200,
    ok: true,
    phase: 'workload'
  }],
  canaries: [{
    tenantId: 'tenant-a',
    surface: 'api',
    canary: 'cross-schema',
    phase: 'initial',
    scheduledAt: '2026-07-31T00:00:00.000Z',
    startedAt: '2026-07-31T00:00:00.000Z',
    completedAt: '2026-07-31T00:00:00.020Z',
    latencyMs: 20,
    conclusive: true,
    violation: false
  }],
  memorySnapshots: [memory(0, 100), memory(15, 101)],
  postWarmupSnapshots: [memory(0, 100), memory(15, 101)],
  postWarmupNodeRssSnapshots: [memory(0, 100), memory(15, 101)].map(
    ({ timestamp, rssBytes }) => ({
      timestamp,
      pid: 42,
      source: 'proc',
      rssBytes: rssBytes!
    })
  ),
  retainedMemory: {
    baseline: retainedCheckpoint(0, 100),
    final: retainedCheckpoint(15, 101),
    errors: []
  },
  memorySampleErrors: [],
  postgresSnapshots: [
    {
      timestamp: '2026-07-31T00:00:00.100Z',
      containerId: '4'.repeat(64),
      cgroupIdentitySha256: `sha256:${'5'.repeat(64)}`,
      usedBytes: 100,
      limitBytes: 1_000,
      source: 'cgroup-v2',
      cgroupV2: {
        currentBytes: 100,
        peakBytes: 150,
        maxBytes: 1_000,
        stat: {},
        events: { oom: 0, oom_kill: 0 }
      },
      raw: '100B / 1000B'
    },
    {
      timestamp: '2026-07-31T00:15:00.100Z',
      containerId: '4'.repeat(64),
      cgroupIdentitySha256: `sha256:${'5'.repeat(64)}`,
      usedBytes: 120,
      limitBytes: 1_000,
      source: 'cgroup-v2',
      cgroupV2: {
        currentBytes: 120,
        peakBytes: 180,
        maxBytes: 1_000,
        stat: {},
        events: { oom: 0, oom_kill: 0 }
      },
      raw: '120B / 1000B'
    }
  ],
  postgresSampleErrors: [],
  missedArrivals: 0,
  requiredCapabilities: ['graphile'],
  requiredCanaries: ['cross-schema'],
  gates,
  serverExit: null,
  provenance,
  provenanceErrors: [],
  realtimeDeliveryCoverage: {
    version: 2,
    deliveryIntervalMs: 60_000,
    workloadStartedAt: '2026-07-31T00:00:00.000Z',
    workloadDeadlineAt: '2026-07-31T00:15:00.000Z',
    workloadEndedAt: '2026-07-31T00:15:00.000Z',
    expectedRecurringRounds: 0,
    startedRecurringRounds: 0,
    verifiedRecurringRounds: 0,
    deadlineLateRecurringRounds: 0,
    primeRequests: 0,
    primeResponseP99Ms: 0,
    deliveryP99Ms: 0,
    complete: true,
    surfaces: []
  },
  externalServer: false,
  executionErrors: []
});

const postgresRunAttestation = (): PostgresRunAttestationEvidence => ({
  version: 1,
  kind: 'physical-density-measurement-attestation-v1',
  artifactPath: '/tmp/result/postgres-run-attestation.json',
  artifactSha256: `sha256:${'1'.repeat(64)}`,
  payloadSha256: `sha256:${'2'.repeat(64)}`,
  epochId: `sha256:${'3'.repeat(64)}`,
  arm: 'scoped-introspection',
  heapMiB: 1024,
  tenantCount: 1,
  repetition: 1,
  runOrderIndex: 1,
  planSha256: `sha256:${'e'.repeat(64)}`,
  fleetSha256: `sha256:${'f'.repeat(64)}`,
  containerId: '4'.repeat(64),
  containerStartedAt: '2026-07-31T00:00:00.000Z',
  cgroupIdentitySha256: `sha256:${'5'.repeat(64)}`,
  containerConfigurationSha256: `sha256:${'6'.repeat(64)}`,
  postgresSystemIdentifier: '7421234567890123456',
  postgresStartedAt: '2026-07-31T00:00:00.010Z',
  cloneId: 'measurement-unique-clone',
  cloneAttestationSetSha256: `sha256:${'7'.repeat(64)}`,
  cloneNonceSetSha256: `sha256:${'8'.repeat(64)}`,
  liveContractSetSha256: `sha256:${'9'.repeat(64)}`,
  manifestSha256: `sha256:${'a'.repeat(64)}`,
  containerTemplateSha256: `sha256:${'b'.repeat(64)}`,
  canonicalDatabaseContractFingerprint: `sha256:${'c'.repeat(64)}`,
  freshContainerForRun: true,
  cgroupV2Verified: true,
  liveCustomerContractsAudited: 1,
  catalogCacheState: 'warmed-by-live-contract-audit'
});

const strictCanaryInput = (): ScoreInput => {
  const input = qualifyingInput();
  input.tenants = input.tenants.map((configuredTenant) => ({
    ...configuredTenant,
    surfaces: configuredTenant.surfaces.map((configuredSurface) => ({
      ...configuredSurface,
      canaries: [...configuredSurface.canaries]
    }))
  }));
  const surface = input.tenants[0].surfaces[0];
  surface.canaries = [
    ...surface.canaries,
    {
      name: 'prepared-reuse',
      query: '{ __typename }',
      forbiddenMatches: [{ path: '/data/tenantToken', value: 'tenant-b' }],
      requiredMatches: [{ path: '/data/tenantToken', value: 'tenant-a' }]
    }
  ];
  input.requiredCanaries = ['cross-schema', 'prepared-reuse'];
  input.canaryIntervalSec = 300;
  input.periodicCanarySchedule = 'rotating-one';
  input.gates = { ...input.gates, requireCompletePeriodicCanaryCoverage: true };
  const startedMs = Date.parse('2026-07-31T00:00:00.000Z');
  const evidence = (
    canary: string,
    phase: 'initial' | 'periodic' | 'final',
    scheduledMs: number,
    periodicRound?: number
  ) => ({
    tenantId: 'tenant-a',
    surface: 'api',
    canary,
    phase,
    ...(periodicRound != null ? { periodicRound } : {}),
    scheduledAt: new Date(scheduledMs).toISOString(),
    startedAt: new Date(scheduledMs + 10).toISOString(),
    completedAt: new Date(scheduledMs + 20).toISOString(),
    latencyMs: phase === 'periodic' ? 5_000 : 10,
    conclusive: true,
    violation: false
  });
  const initial = surface.canaries.map((canary) =>
    evidence(canary.name, 'initial', startedMs - 1_000)
  );
  const periodic = [1, 2].map((periodicRound) => {
    const canary = surface.canaries[rotatingCanaryIndex(
      'tenant-a',
      'api',
      surface.canaries.length,
      periodicRound
    )];
    return evidence(
      canary.name,
      'periodic',
      startedMs + periodicRound * 300_000,
      periodicRound
    );
  });
  const final = surface.canaries.map((canary) =>
    evidence(canary.name, 'final', startedMs + 900_000)
  );
  input.canaries = [...initial, ...periodic, ...final];
  input.canarySchedule = {
    schedule: 'rotating-one',
    intervalMs: 300_000,
    durationMs: 900_000,
    canaryConcurrency: 1,
    startedAt: new Date(startedMs).toISOString(),
    deadlineAt: new Date(startedMs + 900_000).toISOString(),
    planned: 2,
    started: 2,
    completed: 2,
    missed: 0,
    overlapped: 0,
    deadlineLate: 0,
    checksPlanned: 2,
    checksStarted: 2,
    checksCompleted: 2,
    rounds: [1, 2].map((periodicRound) => ({
      periodicRound,
      plannedAt: new Date(startedMs + periodicRound * 300_000).toISOString(),
      startedAt: new Date(startedMs + periodicRound * 300_000 + 10).toISOString(),
      completedAt: new Date(startedMs + periodicRound * 300_000 + 20).toISOString(),
      targetsPlanned: 1,
      targetsStarted: 1,
      targetsCompleted: 1,
      checksPlanned: 1,
      checksStarted: 1,
      checksCompleted: 1,
      overlapped: false,
      deadlineLate: false,
      startDelayMs: 10,
      durationMs: 10
    }))
  };
  return input;
};

describe('density scoring', () => {
  it('uses nearest-rank percentiles', () => {
    expect(percentile([40, 10, 30, 20], 0.5)).toBe(20);
    expect(percentile([40, 10, 30, 20], 0.99)).toBe(40);
  });

  it('qualifies only an exact fresh PostgreSQL run/server binding', () => {
    const input = qualifyingInput();
    const attestation = postgresRunAttestation();
    input.gates = { ...input.gates, requireFreshPostgresRunAttestation: true };
    input.postgresRunAttestation = attestation;
    input.provenance = {
      ...input.provenance!,
      command: [
        ...input.provenance!.command,
        '--expected-manifest-sha256', attestation.manifestSha256,
        '--clone-id', attestation.cloneId
      ]
    };
    expect(scoreRun(input).accepted).toBe(true);

    input.postgresRunAttestation = {
      ...attestation,
      freshContainerForRun: false
    };
    expect(scoreRun(input).failures).toContain(
      'fresh PostgreSQL run attestation is incomplete or mismatched'
    );
    input.postgresRunAttestation = null;
    expect(scoreRun(input).failures).toContain(
      'fresh PostgreSQL run attestation unavailable'
    );
  });

  it('requires Linux /proc samples for the exact server PID to qualify', () => {
    const nonLinux = qualifyingInput();
    nonLinux.provenance = { ...nonLinux.provenance!, platform: 'darwin' };
    expect(scoreRun(nonLinux).failures).toContain(
      'qualification requires exact-PID Linux /proc RSS evidence'
    );

    const wrongPid = qualifyingInput();
    wrongPid.postWarmupNodeRssSnapshots = wrongPid.postWarmupNodeRssSnapshots.map(
      (snapshot) => ({ ...snapshot, pid: 999 })
    );
    expect(scoreRun(wrongPid).failures).toContain(
      'qualification requires exact-PID Linux /proc RSS evidence'
    );

    const endpointRss = qualifyingInput();
    endpointRss.postWarmupNodeRssSnapshots = endpointRss.postWarmupNodeRssSnapshots.map(
      (snapshot) => ({ ...snapshot, source: 'authenticated-endpoint' })
    );
    expect(scoreRun(endpointRss).failures).toContain(
      'qualification requires exact-PID Linux /proc RSS evidence'
    );
  });

  it('measures a linear heap slope in MiB per hour', () => {
    expect(heapGrowthMiBPerHour([memory(0, 100), memory(30, 102), memory(60, 104)]))
      .toBeCloseTo(4, 5);
  });

  it('uses conservative converged bookends for retained heap and external growth', () => {
    const summary = retainedMemoryGrowth({
      baseline: retainedCheckpoint(0, 100, 10),
      final: retainedCheckpoint(15, 101, 10.5),
      errors: []
    }, 42, new Set(['tenant-a-api']));
    expect(summary.errors).toEqual([]);
    expect(summary.heapMiBPerHour).toBeCloseTo(4, 4);
    expect(summary.externalMiBPerHour).toBeCloseTo(2, 4);
    expect(summary.durationSec).toBeCloseTo(900, 4);
  });

  it('reports zero and negative retained growth without clamping', () => {
    const zero = retainedMemoryGrowth({
      baseline: retainedCheckpoint(0, 100),
      final: retainedCheckpoint(15, 100),
      errors: []
    });
    const negative = retainedMemoryGrowth({
      baseline: retainedCheckpoint(0, 100),
      final: retainedCheckpoint(15, 99),
      errors: []
    });
    expect(zero.heapMiBPerHour).toBe(0);
    expect(zero.externalMiBPerHour).toBe(0);
    expect(negative.heapMiBPerHour).toBeCloseTo(-4, 4);
  });

  it('independently enforces the one-MiB convergence envelope', () => {
    const within = retainedCheckpoint(15, 100);
    const outside = retainedCheckpoint(15, 100);
    within.samples.slice(-3).forEach((sample, index) => {
      sample.heapUsedBytes += [0, 0.4, 0.9][index] * 1024 ** 2;
    });
    outside.samples.slice(-3).forEach((sample, index) => {
      sample.heapUsedBytes += [0, 2, 0][index] * 1024 ** 2;
    });
    expect(retainedMemoryGrowth({
      baseline: retainedCheckpoint(0, 100),
      final: within,
      errors: []
    }).errors).toEqual([]);
    expect(retainedMemoryGrowth({
      baseline: retainedCheckpoint(0, 100),
      final: outside,
      errors: []
    }).errors).toContain('final retained heapUsedBytes samples did not converge');
  });

  it('keeps raw heap OLS diagnostic and gates on retained bookends', () => {
    const input = qualifyingInput();
    input.postWarmupSnapshots = [memory(0, 100), memory(15, 200)];
    input.memorySnapshots = input.postWarmupSnapshots;
    const result = scoreRun(input);
    expect(result.rawPostWarmupHeapGrowthMiBPerHour).toBeCloseTo(400, 4);
    expect(result.retainedHeapGrowthMiBPerHour).toBeCloseTo(4, 4);
    expect(result.accepted).toBe(true);
  });

  it('allows only balanced HTTP lifecycle progress between retained bookends', () => {
    const baseline = retainedCheckpointWithState(0, retainedPhysicalState(10, 10));
    const balanced = retainedCheckpointWithState(15, retainedPhysicalState(110, 110));
    expect(retainedMemoryGrowth({ baseline, final: balanced, errors: [] }).errors)
      .toEqual([]);

    const unbalanced = retainedCheckpointWithState(15, retainedPhysicalState(110, 109));
    expect(retainedMemoryGrowth({ baseline, final: unbalanced, errors: [] }).errors)
      .toContain(
        'retained-memory HTTP handler delta is unbalanced: started=100, completed=99'
      );

    const changedTopology = retainedCheckpointWithState(
      15,
      retainedPhysicalState(110, 110, 2)
    );
    expect(retainedMemoryGrowth({ baseline, final: changedTopology, errors: [] }).errors)
      .toContain('retained-memory residency or non-HTTP counters changed across the workload');
  });

  it('compares physical residency through stable fingerprints, not process-local HMAC keys', () => {
    const state = {
      pid: 42,
      graphileInFlight: 0,
      residentBuildContracts: ['graphile:v1:process-local-hmac'],
      residentBuildContractFingerprints: ['tenant-a-api'],
      counters: { buildsStarted: 1, evictions: 0 }
    };
    const summary = retainedMemoryGrowth({
      baseline: retainedCheckpointWithState(0, state),
      final: retainedCheckpointWithState(15, state),
      errors: []
    }, 42, new Set(['tenant-a-api']), true);
    expect(summary.errors).toEqual([]);

    const missingStable = { ...state };
    delete (missingStable as Partial<typeof state>).residentBuildContractFingerprints;
    expect(retainedMemoryGrowth({
      baseline: retainedCheckpointWithState(0, missingStable),
      final: retainedCheckpointWithState(15, missingStable),
      errors: []
    }, 42, new Set(['tenant-a-api']), true).errors).toContain(
      'baseline retained-memory residency set mismatch'
    );
  });

  it('rejects retained external growth even when V8 retained heap passes', () => {
    const input = qualifyingInput();
    input.retainedMemory.final = retainedCheckpoint(15, 101, 12);
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.failures).toContain(
      'retained external-memory growth 8.00MiB/hour exceeds 5'
    );
  });

  it('fails closed when a retained checkpoint is unstable', () => {
    const input = qualifyingInput();
    input.retainedMemory.final = {
      ...input.retainedMemory.final!,
      stable: false,
      errors: ['PDCF_RETAINED_HEAP_NOT_CONVERGED']
    };
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.failures.some((failure) =>
      failure.includes('retained-memory checkpoint errors')
    )).toBe(true);
  });

  it('falls back to the raw heap-growth gate when retained checkpoints are optional', () => {
    const input = qualifyingInput();
    input.gates = { ...input.gates, requireRetainedMemoryCheckpoints: false };
    input.retainedMemory = { baseline: null, final: null, errors: [] };
    const accepted = scoreRun(input);
    expect(accepted.accepted).toBe(true);
    expect(accepted.retainedHeapGrowthMiBPerHour).toBeNull();
    expect(accepted.retainedMemoryCheckpointErrors).toEqual([
      'baseline retained-memory checkpoint is unavailable',
      'final retained-memory checkpoint is unavailable'
    ]);

    input.postWarmupSnapshots = [memory(0, 100), memory(15, 110)];
    input.memorySnapshots = input.postWarmupSnapshots;
    const rejected = scoreRun(input);
    expect(rejected.accepted).toBe(false);
    expect(rejected.failures).toContain('heap growth 40.00MiB/hour exceeds 5');
  });

  it('scores the service footprint from near-simultaneous current RSS and PostgreSQL samples', () => {
    const node = [
      { ...memory(0, 100), rssBytes: 200 },
      { ...memory(1, 100), rssBytes: 250 }
    ];
    const postgres = [
      { timestamp: '2026-07-31T00:00:00.100Z', usedBytes: 50, limitBytes: 1_000, raw: '' },
      { timestamp: '2026-07-31T00:01:00.100Z', usedBytes: 80, limitBytes: 1_000, raw: '' }
    ];
    expect(alignedServiceMemoryPeak(node, postgres)).toEqual({
      bytes: 330,
      nodeRssBytes: 250,
      postgresBytes: 80,
      timestamp: '2026-07-31T00:01:00.000Z',
      samples: 2,
      maxSkewMs: 100
    });
    expect(alignedServiceMemoryPeak(node, [{
      ...postgres[0],
      timestamp: '2026-07-31T00:10:00.000Z'
    }])).toBeNull();
    expect(alignedServiceMemoryCoverage(
      node,
      postgres,
      Date.parse('2026-07-31T00:00:00.000Z'),
      60_000
    )).toMatchObject({
      expectedDurationMs: 60_000,
      coveredDurationMs: 60_000,
      coverageRatio: 1,
      maxGapMs: 60_000
    });
  });

  it('uses cgroup memory.peak for the conservative denominator and limits current fallback to diagnostics', () => {
    const qualifying = scoreRun(qualifyingInput());
    expect(qualifying.serviceMemoryUpperBoundPostgresSource)
      .toBe('cgroup-v2-memory.peak');
    expect(qualifying.serviceMemoryUpperBoundBytes)
      .toBe(220 * 1024 ** 2 + 180);

    const missingPeak = qualifyingInput();
    missingPeak.postgresSnapshots = missingPeak.postgresSnapshots.map((snapshot) => ({
      ...snapshot,
      cgroupV2: { ...snapshot.cgroupV2!, peakBytes: null as number | null }
    }));
    const rejected = scoreRun(missingPeak);
    expect(rejected.serviceMemoryUpperBoundBytes).toBeNull();
    expect(rejected.failures).toEqual(expect.arrayContaining([
      'PostgreSQL cgroup-v2 memory.peak telemetry unavailable for conservative denominator',
      'conservative service-memory upper bound unavailable'
    ]));

    const mismatchedCurrent = qualifyingInput();
    mismatchedCurrent.postgresSnapshots[0] = {
      ...mismatchedCurrent.postgresSnapshots[0],
      usedBytes: mismatchedCurrent.postgresSnapshots[0].usedBytes + 1
    };
    expect(scoreRun(mismatchedCurrent).failures).toContain(
      'PostgreSQL cgroup-v2 telemetry was incomplete'
    );

    missingPeak.evidenceMode = 'diagnostic';
    const diagnostic = scoreRun(missingPeak);
    expect(diagnostic.serviceMemoryUpperBoundPostgresSource)
      .toBe('sampled-current-diagnostic');
    expect(diagnostic.serviceMemoryUpperBoundBytes)
      .toBe(220 * 1024 ** 2 + 120);
  });

  it('requires aligned cgroup telemetry to cover the entire post-warm workload at bounded cadence', () => {
    const input = qualifyingInput();
    input.gates = {
      ...input.gates,
      maxAlignedMemorySampleGapMs: 1_000,
      minAlignedMemoryCoverageRatio: 0.99
    };
    const startedAtMs = Date.parse('2026-07-31T00:00:00.000Z');
    input.postWarmupNodeRssSnapshots = Array.from({ length: 901 }, (_unused, index) => ({
      timestamp: new Date(startedAtMs + index * 1_000).toISOString(),
      pid: 42,
      source: 'proc' as const,
      rssBytes: 200 * 1024 ** 2
    }));
    input.postgresSnapshots = Array.from({ length: 901 }, (_unused, index) => ({
      timestamp: new Date(startedAtMs + index * 1_000 + 100).toISOString(),
      usedBytes: 100 + index,
      limitBytes: 1_000_000,
      source: 'cgroup-v2' as const,
      cgroupV2: {
        currentBytes: 100 + index,
        peakBytes: 1_000 + index,
        maxBytes: 1_000_000,
        stat: {},
        events: { oom: 0, oom_kill: 0 }
      },
      raw: ''
    }));
    const complete = scoreRun(input);
    expect(complete.accepted).toBe(true);
    expect(complete.alignedServiceMemoryCoverageRatio).toBe(1);
    expect(complete.alignedServiceMemoryMaxGapMs).toBe(1_000);

    const densePostgresSnapshots = input.postgresSnapshots;
    input.postgresSnapshots = densePostgresSnapshots.filter((_snapshot, index) =>
      index % 2 === 0
    );
    const sparsePostgres = scoreRun(input);
    expect(sparsePostgres.accepted).toBe(false);
    expect(sparsePostgres.alignedServiceMemoryMaxGapMs).toBe(2_000);
    expect(sparsePostgres.failures).toContain(
      'aligned service-memory maximum sample gap 2000ms exceeds 1000ms'
    );
    input.postgresSnapshots = densePostgresSnapshots;

    input.postWarmupNodeRssSnapshots = input.postWarmupNodeRssSnapshots.slice(0, -10);
    input.postgresSnapshots = input.postgresSnapshots.slice(0, -10);
    const truncated = scoreRun(input);
    expect(truncated.accepted).toBe(false);
    expect(truncated.failures).toEqual(expect.arrayContaining([
      expect.stringContaining('maximum sample gap 10000ms exceeds 1000ms'),
      expect.stringContaining('workload coverage 98.89% is below 99.00%')
    ]));
  });

  it('qualifies only a complete, conclusive, resident tenant', () => {
    const result = scoreRun(qualifyingInput());
    expect(result.accepted).toBe(true);
    expect(result.qualifiedCustomers).toBe(1);
    expect(result.qualifiedTenants).toBe(1);
    expect(result.tenantsPerConfiguredOldSpaceGiB).toBe(1);
    expect(result.configuredCustomersPerAlignedServiceGiB).toBeGreaterThan(0);
    expect(result.observedHeapLimitBytes).toBe(1024 * 1024 ** 2);
    expect(result).toMatchObject({
      pgPoolCacheSize: 2,
      pgPoolLeasedPools: 1,
      pgPoolActiveLeases: 1,
      postWarmupPgPoolCapacityEvictions: 0,
      postWarmupPgPoolCapacityRefusals: 0,
      postWarmupPgPoolDisposalFailures: 0
    });
  });

  it('requires conclusive per-operation coverage evidence when the gate is enabled', () => {
    const input = qualifyingInput();
    input.gates = { ...input.gates, requireConclusiveOperationOracles: true };
    input.tenants[0].surfaces[0].operations[0] = {
      ...input.tenants[0].surfaces[0].operations[0],
      requiredMatches: [{
        path: '/data/physicalDatabaseIdentity',
        value: 'physical-db-a'
      }],
      forbiddenMatches: [{
        path: '/data/physicalDatabaseIdentity',
        value: 'physical-db-b'
      }]
    };
    input.samples.unshift({
      tenantId: 'tenant-a',
      surface: 'api',
      operation: 'read',
      capability: 'graphile',
      latencyMs: 10,
      status: 200,
      ok: true,
      phase: 'coverage',
      oracleConfigured: true,
      oracleConclusive: true,
      oracleViolation: false
    });
    expect(scoreRun(input).accepted).toBe(true);

    input.samples[0] = {
      ...input.samples[0],
      ok: false,
      oracleConclusive: false,
      errorCode: 'GRAPHQL_OPERATION_ORACLE_MISSING'
    };
    const missing = scoreRun(input);
    expect(missing.accepted).toBe(false);
    expect(missing.operationOracleInconclusive).toBe(1);
    expect(missing.missingOperationOracles).toEqual(['tenant-a/api/read']);
    expect(missing.failures).toEqual(expect.arrayContaining([
      'GraphQL operation response oracles inconclusive=1',
      'missing GraphQL operation response oracles: tenant-a/api/read'
    ]));

    input.samples[0] = {
      ...input.samples[0],
      oracleConclusive: true,
      oracleViolation: true,
      errorCode: 'GRAPHQL_OPERATION_ORACLE_FORBIDDEN'
    };
    const forbidden = scoreRun(input);
    expect(forbidden.operationOracleViolations).toBe(1);
    expect(forbidden.failures).toContain(
      'GraphQL operation response oracle violations=1'
    );
  });

  it('keeps the 0.5% request-error budget without treating unavailable oracles as bleed', () => {
    const input = qualifyingInput();
    input.gates = { ...input.gates, requireConclusiveOperationOracles: true };
    input.tenants[0].surfaces[0].operations[0] = {
      ...input.tenants[0].surfaces[0].operations[0],
      requiredMatches: [{ path: '/data/physicalDatabaseIdentity', value: 'physical-db-a' }],
      forbiddenMatches: [{ path: '/data/physicalDatabaseIdentity', value: 'physical-db-b' }]
    };
    const baseSample = {
      tenantId: 'tenant-a',
      surface: 'api',
      operation: 'read',
      capability: 'graphile',
      latencyMs: 20,
      status: 200,
      ok: true,
      phase: 'workload' as const,
      oracleConfigured: true,
      oracleConclusive: true,
      oracleViolation: false,
      oracleUnavailable: false
    };
    input.samples = [
      {
        ...baseSample,
        phase: 'coverage',
      },
      ...Array.from({ length: 199 }, () => ({ ...baseSample })),
      {
        ...baseSample,
        status: 0,
        ok: false,
        errorCode: 'TIMEOUT',
        oracleConclusive: false,
        oracleUnavailable: true
      }
    ];
    const result = scoreRun(input);
    expect(result.accepted).toBe(true);
    expect(result.errorRate).toBe(0.005);
    expect(result.operationOracleInconclusive).toBe(0);
    expect(result.operationOracleViolations).toBe(0);
  });

  it('requires exactly one conclusive coverage result per operation', () => {
    const input = qualifyingInput();
    input.gates = { ...input.gates, requireConclusiveOperationOracles: true };
    input.tenants[0].surfaces[0].operations[0] = {
      ...input.tenants[0].surfaces[0].operations[0],
      requiredMatches: [{ path: '/data/physicalDatabaseIdentity', value: 'physical-db-a' }],
      forbiddenMatches: [{ path: '/data/physicalDatabaseIdentity', value: 'physical-db-b' }]
    };
    const coverage = {
      tenantId: 'tenant-a',
      surface: 'api',
      operation: 'read',
      capability: 'graphile',
      latencyMs: 10,
      status: 200,
      ok: true,
      phase: 'coverage' as const,
      oracleConfigured: true,
      oracleConclusive: true,
      oracleViolation: false
    };
    input.samples.unshift(coverage, { ...coverage });
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.missingOperationOracles).toEqual(['tenant-a/api/read']);
  });

  it('requires exact initial, rotating periodic, and final canary evidence', () => {
    const accepted = scoreRun(strictCanaryInput());
    expect(accepted.accepted).toBe(true);
    expect(accepted).toMatchObject({
      customerWorkloadRps: 1 / 900,
      periodicValidationRps: 2 / 900,
      achievedRps: 1 / 900,
      p99Ms: 20
    });
    expect(accepted.combinedHttpRps).toBeCloseTo(3 / 900, 12);

    for (const phase of ['initial', 'periodic', 'final'] as const) {
      const input = strictCanaryInput();
      const removed = input.canaries.findIndex((canary) => canary.phase === phase);
      input.canaries.splice(removed, 1);
      const result = scoreRun(input);
      expect(result.accepted).toBe(false);
      expect(result.failures.some((failure) =>
        failure.includes('missing exact canary evidence')
      )).toBe(true);
      if (phase === 'periodic') {
        expect(result.failures.some((failure) =>
          failure.includes('periodic canary coverage is incomplete')
        )).toBe(true);
        expect(result.failures.some((failure) =>
          failure.includes('periodic target/round evidence mismatch')
        )).toBe(true);
      }
    }
  });

  it('rejects missing, duplicate, and deadline-late periodic rounds', () => {
    const missingRound = strictCanaryInput();
    missingRound.canarySchedule!.completed = 1;
    missingRound.canarySchedule!.missed = 1;
    missingRound.canarySchedule!.rounds[1].completedAt = null;
    let result = scoreRun(missingRound);
    expect(result.accepted).toBe(false);
    expect(result.failures.some((failure) =>
      failure.includes('periodic canary rounds planned=2 started=2 completed=1 missed=1')
    )).toBe(true);

    const duplicate = strictCanaryInput();
    duplicate.canaries.push({ ...duplicate.canaries.find((canary) =>
      canary.phase === 'periodic'
    )! });
    result = scoreRun(duplicate);
    expect(result.accepted).toBe(false);
    expect(result.failures.some((failure) =>
      failure.includes('duplicate exact canary evidence')
    )).toBe(true);

    const late = strictCanaryInput();
    const deadlineMs = Date.parse(late.canarySchedule!.deadlineAt);
    late.canarySchedule!.deadlineLate = 1;
    late.canarySchedule!.rounds[1].deadlineLate = true;
    late.canarySchedule!.rounds[1].completedAt = new Date(deadlineMs + 1).toISOString();
    const lateResult = late.canaries.find((canary) =>
      canary.phase === 'periodic' && canary.periodicRound === 2
    )!;
    lateResult.completedAt = new Date(deadlineMs + 1).toISOString();
    result = scoreRun(late);
    expect(result.accepted).toBe(false);
    expect(result.failures.some((failure) =>
      failure.includes('periodic canary rounds completed after deadline')
    )).toBe(true);
  });

  it('fails closed when raw cgroup samples omit OOM event counters', () => {
    const input = qualifyingInput();
    input.postgresSnapshots = input.postgresSnapshots.map((snapshot) => ({
      ...snapshot,
      source: 'cgroup-v2' as const,
      cgroupV2: {
        currentBytes: snapshot.usedBytes,
        peakBytes: snapshot.usedBytes,
        maxBytes: snapshot.limitBytes,
        stat: {},
        events: {}
      }
    }));
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.postgresOomEvents).toBeNull();
    expect(result.failures).toContain('PostgreSQL cgroup OOM event telemetry unavailable');
  });

  it('never qualifies a smoke-length run or an eviction', () => {
    const input = qualifyingInput();
    input.endedAt = '2026-07-31T00:00:05.000Z';
    input.configuredDurationSec = 5;
    input.workloadDurationMs = 5_000;
    input.memorySnapshots = [memory(0, 100), memory(1, 100, 1)];
    input.postWarmupSnapshots = input.memorySnapshots;
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.qualifiedTenants).toBe(0);
    expect(result.failures).toEqual(expect.arrayContaining([
      expect.stringContaining('15-minute'),
      expect.stringContaining('evictions=1')
    ]));
  });

  it('rejects matching cache counts with the wrong resident build identity', () => {
    const input = qualifyingInput();
    input.memorySnapshots = input.memorySnapshots.map((snapshot): MemorySnapshot => ({
      ...snapshot,
      residentBuildContracts: ['tenant-b-api']
    }));
    input.postWarmupSnapshots = input.memorySnapshots;
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.failures).toContain('resident Graphile build contracts missing: tenant-a-api');
  });

  it('requires successful capability traffic for each configured tenant surface', () => {
    const input = qualifyingInput();
    input.tenants = [{
      ...tenant,
      surfaces: tenant.surfaces.map((surface) => ({
        ...surface,
        operations: [
          ...surface.operations,
          { name: 'search', capability: 'bm25', query: '{ search }' }
        ]
      }))
    }];
    input.requiredCapabilities = ['graphile', 'bm25'];
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.tenants[0]).toMatchObject({
      missingOperations: ['api/search'],
      missingCapabilities: ['api/bm25', 'required/bm25']
    });
    expect(result.missingCapabilities).toEqual([
      'tenant-a/api/bm25',
      'tenant-a/required/bm25'
    ]);
  });

  it('does not let a healthy aggregate hide a surface that exceeds its SLA', () => {
    const input = qualifyingInput();
    const apiSurface = input.tenants[0].surfaces[0];
    input.tenants = [{
      ...input.tenants[0],
      surfaces: [
        apiSurface,
        { ...apiSurface, name: 'admin' }
      ]
    }];
    input.warmedSurfaces = new Map([['tenant-a', new Set(['api', 'admin'])]]);
    input.samples = ['api', 'admin'].flatMap((surface) =>
      Array.from({ length: 125 }, (_unused, index) => ({
        ...input.samples[0],
        surface,
        ok: !(surface === 'admin' && index === 0),
        status: surface === 'admin' && index === 0 ? 500 : 200
      }))
    );
    input.canaries = ['api', 'admin'].map((surface) => ({
      ...input.canaries[0],
      surface
    }));
    const result = scoreRun(input);
    expect(result.errorRate).toBe(0.004);
    expect(result.errorRate).toBeLessThanOrEqual(input.gates.maxErrorRate);
    expect(result.tenants[0].surfaces.find(({ surface }) => surface === 'admin'))
      .toMatchObject({ errorRate: 0.008, qualified: false });
    expect(result.accepted).toBe(false);
  });

  it('does not let coverage-only traffic qualify a resident surface', () => {
    const input = qualifyingInput();
    input.samples[0].phase = 'coverage';
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.tenants[0]).toMatchObject({
      surfacesWithTraffic: 0,
      missingSurfaces: ['api']
    });
  });

  it('keeps coverage samples out of workload latency and error metrics', () => {
    const input = qualifyingInput();
    input.samples.unshift({
      tenantId: 'tenant-a',
      surface: 'api',
      operation: 'read',
      capability: 'graphile',
      latencyMs: 5_000,
      status: 500,
      ok: false,
      phase: 'coverage',
      errorCode: 'GRAPHQL_ERROR'
    });
    const result = scoreRun(input);
    expect(result.accepted).toBe(true);
    expect(result).toMatchObject({
      coverageRequests: 1,
      workloadRequests: 1,
      errors: 0,
      p99Ms: 20
    });
  });

  it('rejects missing process RSS, missed arrivals, and incomplete provenance', () => {
    const input = qualifyingInput();
    input.memorySnapshots = input.memorySnapshots.map((snapshot): MemorySnapshot => ({
      ...snapshot,
      processPeakRssBytes: null,
      pgPoolCacheSize: null
    }));
    input.postWarmupSnapshots = input.memorySnapshots;
    input.missedArrivals = 2;
    input.provenance = { ...provenance, entrySha256: null };
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([
      'load generator missed scheduled arrivals=2',
      'OS process peak RSS telemetry unavailable',
      'PostgreSQL pool-cache telemetry unavailable',
      expect.stringContaining('server provenance incomplete: entrySha256')
    ]));
  });

  it('rejects post-warmup PostgreSQL pool churn and disposal failures', () => {
    const input = qualifyingInput();
    input.postWarmupSnapshots = [
      memory(0, 100),
      {
        ...memory(15, 101),
        pgPoolCapacityEvictions: 1,
        pgPoolCapacityRefusals: 1,
        pgPoolDisposalFailures: 1
      }
    ];
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([
      'post-warmup PostgreSQL pool capacity evictions=1',
      'post-warmup PostgreSQL pool capacity refusals=1',
      'post-warmup PostgreSQL pool disposal failures=1'
    ]));
  });

  it('rejects cache, build, and pool counters that reset during the workload', () => {
    const input = qualifyingInput();
    input.postWarmupSnapshots = [
      {
        ...memory(0, 100, 2),
        buildRefusals: 2,
        buildsStarted: 2,
        pgPoolCapacityEvictions: 2,
        pgPoolCapacityRefusals: 2,
        pgPoolDisposalFailures: 2
      },
      {
        ...memory(7, 100, 3),
        buildRefusals: 3,
        buildsStarted: 3,
        pgPoolCapacityEvictions: 3,
        pgPoolCapacityRefusals: 3,
        pgPoolDisposalFailures: 3
      },
      {
        ...memory(15, 101, 2),
        buildRefusals: 2,
        buildsStarted: 2,
        pgPoolCapacityEvictions: 2,
        pgPoolCapacityRefusals: 2,
        pgPoolDisposalFailures: 2
      }
    ];
    const result = scoreRun(input);
    expect(result.accepted).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([
      'post-warmup evictions=unknown',
      'post-warmup build refusals=unknown',
      'post-warmup builds=unknown',
      'post-warmup PostgreSQL pool capacity evictions=unknown',
      'post-warmup PostgreSQL pool capacity refusals=unknown',
      'post-warmup PostgreSQL pool disposal failures=unknown'
    ]));
  });

  it('requires physical database, backend, pool-client, and realtime residency when enabled', () => {
    const input = qualifyingInput();
    input.gates = { ...gates, requirePhysicalDatabaseTelemetry: true };
    input.provenance = {
      ...provenance,
      memoryPolicy: {
        ...provenance.memoryPolicy!,
        graphileCacheCalibrationId: 'measured-cache-v1'
      }
    };
    input.tenants = [{
      ...tenant,
      databases: [{
        id: 'logical:tenant-a',
        physicalDatabase: 'physical_tenant_a',
        apis: [{
          id: 'api:tenant-a',
          runtimePoolIdentity: 'pg:v1:tenant-a',
          physicalSchemas: ['tenant_a'],
          routingLabels: ['tenant-a.localhost'],
          realtime: true,
          surfaces: ['api']
        }]
      }]
    }];
    input.memorySnapshots = input.memorySnapshots.map((snapshot): MemorySnapshot => ({
      ...snapshot,
      cacheConfiguredMax: 3,
      cacheBudgetCapacity: 3,
      cacheInstanceHeapBytes: 16 * 1024 ** 2,
      cacheCalibrationId: 'measured-cache-v1',
      physicalDatabases: 1,
      postgresContainerDedicated: true,
      unexpectedPostgresDatabases: 0,
      postgresBackendTotal: 1,
      pgPoolTotalClients: 1,
      pgPoolIdleClients: 0,
      pgPoolWaitingClients: 0,
      runtimePoolTelemetryScope: 'runtime-only-exact-identities',
      runtimePoolTelemetryAvailable: true,
      runtimePoolRequestedMaxUses: null,
      runtimePoolEffectiveMaxUses: null,
      runtimePoolEffectiveMaxUsesKnown: true,
      runtimePoolMaxUsesExact: true,
      runtimePoolExpectedPools: 1,
      runtimePoolObservedPools: 1,
      runtimePoolTotalClients: 1,
      runtimePoolIdleClients: 0,
      runtimePoolWaitingClients: 0,
      realtimeManagersExpected: 1,
      realtimeManagersActive: 1,
      realtimeTransportsExpected: 1,
      realtimeTransportsActive: 1,
      realtimeNotificationMode: 'dedicated'
    }));
    input.postWarmupSnapshots = input.memorySnapshots;
    const accepted = scoreRun(input);
    expect(accepted.accepted).toBe(true);
    expect(accepted).toMatchObject({
      residentPhysicalDatabases: 1,
      cacheConfiguredMax: 3,
      cacheBudgetCapacity: 3,
      cacheCalibrationId: 'measured-cache-v1',
      postgresContainerDedicated: true,
      unexpectedPostgresDatabases: 0,
      postgresBackendPeak: 1,
      pgPoolTotalClients: 1,
      runtimePoolExpectedPools: 1,
      runtimePoolObservedPools: 1,
      residentRealtimeManagers: 1,
      residentRealtimeTransports: 1
    });

    input.postWarmupSnapshots = input.memorySnapshots.map((snapshot): MemorySnapshot => ({
      ...snapshot,
      runtimePoolRequestedMaxUses: 1,
      runtimePoolEffectiveMaxUses: 1
    }));
    const singleCheckout = scoreRun(input);
    expect(singleCheckout.accepted).toBe(true);
    expect(singleCheckout).toMatchObject({
      runtimePoolRequestedMaxUses: 1,
      runtimePoolEffectiveMaxUses: 1
    });

    const exactRuntimePoolSnapshots = input.postWarmupSnapshots;
    input.postWarmupSnapshots = exactRuntimePoolSnapshots.map((snapshot, index) => ({
      ...snapshot,
      runtimePoolExpectedPools: index === 0 ? 1 : 2,
      runtimePoolObservedPools: index === 0 ? 1 : 2
    }));
    const inexactCardinality = scoreRun(input);
    expect(inexactCardinality.accepted).toBe(false);
    expect(inexactCardinality.failures).toContain(
      'exact runtime PostgreSQL pool telemetry unavailable or inconsistent; observed=unknown, expected=1'
    );

    input.postWarmupSnapshots = exactRuntimePoolSnapshots.map((snapshot, index) => ({
      ...snapshot,
      runtimePoolIdleClients: index === 0 ? 1 : 0
    }));
    expect(scoreRun(input).failures).toContain(
      'runtime PostgreSQL maxUses=1 retained idle clients after warmup'
    );

    input.postWarmupSnapshots = input.memorySnapshots.map((snapshot): MemorySnapshot => ({
      ...snapshot,
      postgresBackendTotal: null
    }));
    const rejected = scoreRun(input);
    expect(rejected.accepted).toBe(false);
    expect(rejected.failures).toContain('physical PostgreSQL backend telemetry unavailable');
  });

  it('qualifies shared realtime from exact broker evidence without requiring one backend per API', () => {
    const input = qualifyingInput();
    const residentContracts = [
      'tenant-a-api',
      'tenant-a-admin',
      'tenant-a-private'
    ];
    input.gates = { ...gates, requirePhysicalDatabaseTelemetry: true };
    input.provenance = {
      ...provenance,
      memoryPolicy: {
        ...provenance.memoryPolicy!,
        graphileCacheCalibrationId: 'measured-cache-v1'
      }
    };
    input.tenants = [{
      ...tenant,
      surfaces: [
        tenant.surfaces[0],
        { ...tenant.surfaces[0], name: 'admin', buildContract: 'tenant-a-admin' },
        { ...tenant.surfaces[0], name: 'private', buildContract: 'tenant-a-private' }
      ],
      databases: [{
        id: 'logical:tenant-a',
        physicalDatabase: 'physical_tenant_a',
        apis: ['api', 'admin', 'private'].map((name) => ({
          id: `${name}:tenant-a`,
          runtimePoolIdentity: `pg:v1:tenant-a:${name}`,
          physicalSchemas: [`tenant_a_${name}`],
          routingLabels: [`${name}.tenant-a.localhost`],
          realtime: true,
          surfaces: [name]
        }))
      }]
    }];
    input.warmedSurfaces = new Map([[
      'tenant-a',
      new Set(['api', 'admin', 'private'])
    ]]);
    input.samples = ['api', 'admin', 'private'].map((surface) => ({
      ...input.samples[0],
      surface
    }));
    input.canaries = ['api', 'admin', 'private'].map((surface) => ({
      ...input.canaries[0],
      surface
    }));
    input.memorySnapshots = input.memorySnapshots.map((snapshot): MemorySnapshot => ({
      ...snapshot,
      cacheSize: 3,
      residentBuildContractFingerprints: residentContracts,
      residentBuildContracts: residentContracts,
      cacheConfiguredMax: 3,
      cacheBudgetCapacity: 3,
      cacheInstanceHeapBytes: 16 * 1024 ** 2,
      cacheCalibrationId: 'measured-cache-v1',
      physicalDatabases: 1,
      postgresContainerDedicated: true,
      unexpectedPostgresDatabases: 0,
      postgresBackendTotal: 1,
      pgPoolTotalClients: 1,
      pgPoolIdleClients: 0,
      pgPoolWaitingClients: 0,
      runtimePoolTelemetryScope: 'runtime-only-exact-identities',
      runtimePoolTelemetryAvailable: true,
      runtimePoolRequestedMaxUses: null,
      runtimePoolEffectiveMaxUses: null,
      runtimePoolEffectiveMaxUsesKnown: true,
      runtimePoolMaxUsesExact: true,
      runtimePoolExpectedPools: 3,
      runtimePoolObservedPools: 3,
      runtimePoolTotalClients: 1,
      runtimePoolIdleClients: 0,
      runtimePoolWaitingClients: 0,
      realtimeManagersExpected: 3,
      realtimeManagersActive: 3,
      realtimeTransportsExpected: 3,
      realtimeTransportsActive: 3,
      realtimeNotificationMode: 'shared-exact' as const,
      notificationBrokers: 1,
      notificationListenerConnections: 1,
      notificationBrokerLeases: 3,
      notificationBrokerTopics: 3,
      notificationBrokerSubscribers: 3,
      notificationBrokerQueueOverflows: 0,
      notificationBrokerFatalFailures: 0,
      notificationAuditIdentities: 1,
      notificationAuditsHealthy: 1,
      notificationAuditsFailed: 0,
      notificationAuditsStale: 0,
      notificationAuditAttempts: 3,
      notificationAuditFailures: 0,
      notificationAuditActiveDatabaseTargets: 1,
      notificationAuditDatabaseConflicts: 0
    }));
    input.postWarmupSnapshots = input.memorySnapshots;
    const bindRetainedResidency = (
      checkpoint: RetainedMemoryCheckpoint
    ): RetainedMemoryCheckpoint => {
      const state = {
        ...checkpoint.guardAfter.state,
        residentBuildContracts: residentContracts,
        residentBuildContractFingerprints: residentContracts
      };
      const guard = {
        ...checkpoint.guardAfter,
        residentBuildContracts: residentContracts,
        state,
        stateSha256: `sha256:${createHash('sha256')
          .update(canonicalJson(state))
          .digest('hex')}`
      };
      return { ...checkpoint, guardBefore: guard, guardAfter: guard };
    };
    input.retainedMemory = {
      baseline: bindRetainedResidency(input.retainedMemory!.baseline!),
      final: bindRetainedResidency(input.retainedMemory!.final!),
      errors: []
    };

    const accepted = scoreRun(input);
    expect(accepted.failures).toEqual([]);
    expect(accepted.accepted).toBe(true);
    expect(accepted).toMatchObject({
      realtimeNotificationMode: 'shared-exact',
      notificationBrokers: 1,
      notificationListenerConnections: 1,
      notificationBrokerLeases: 3,
      notificationBrokerSubscribers: 3,
      postgresBackendPeak: 1,
      pgPoolTotalClients: 1
    });

    input.postWarmupSnapshots = input.memorySnapshots.map((snapshot) => ({
      ...snapshot,
      notificationBrokerSubscribers: 2
    }));
    const rejected = scoreRun(input);
    expect(rejected.accepted).toBe(false);
    expect(rejected.failures).toContain(
      'shared realtime broker residency or listener-role attestation is not exact'
    );
  });

  it('binds required cache admission to both live telemetry and pinned provenance', () => {
    const input = qualifyingInput();
    input.gates = {
      ...input.gates,
      requiredCacheAdmissionMode: 'preserve-resident'
    };
    input.provenance = {
      ...provenance,
      memoryPolicy: {
        ...provenance.memoryPolicy!,
        graphileCacheAdmissionMode: 'preserve-resident'
      }
    };
    input.memorySnapshots = input.memorySnapshots.map((snapshot) => ({
      ...snapshot,
      cacheAdmissionMode: 'preserve-resident' as const
    }));
    input.postWarmupSnapshots = input.memorySnapshots;
    const accepted = scoreRun(input);
    expect(accepted.accepted).toBe(true);
    expect(accepted.cacheAdmissionMode).toBe('preserve-resident');

    input.postWarmupSnapshots = input.memorySnapshots.map((snapshot) => ({
      ...snapshot,
      cacheAdmissionMode: 'evict-idle' as const
    }));
    const liveMismatch = scoreRun(input);
    expect(liveMismatch.accepted).toBe(false);
    expect(liveMismatch.failures).toContain(
      'live Graphile cache admission mode=evict-idle, required preserve-resident'
    );

    input.postWarmupSnapshots = input.memorySnapshots;
    input.provenance.memoryPolicy!.graphileCacheAdmissionMode = 'evict-idle';
    const pinnedMismatch = scoreRun(input);
    expect(pinnedMismatch.accepted).toBe(false);
    expect(pinnedMismatch.failures).toContain(
      'pinned Graphile cache admission mode=evict-idle, required preserve-resident'
    );
  });

  const densityRun = (
    arm: string,
    configuredTenants: number,
    accepted: boolean,
    peakRssDensity: number,
    repetition = 1,
    expectedMatrixRepetitions = 1,
    heapMiB = 1024
  ): DensityRunResult => ({
    schemaVersion: 6,
    runKind: 'matrix',
    evidenceMode: 'qualification',
    qualificationCohortSha256: 'a'.repeat(64),
    arm,
    repetition,
    expectedMatrixRepetitions,
    accepted,
    configuredCustomers: configuredTenants,
    qualifiedCustomers: accepted ? configuredTenants : 0,
    qualifiedTenants: accepted ? configuredTenants : 0,
    tenantsPerConfiguredOldSpaceGiB: accepted
      ? configuredTenants / (heapMiB / 1024)
      : 0,
    tenantsPerPeakRssGiB: accepted ? peakRssDensity : null,
    customersPerAlignedServiceGiB: accepted ? peakRssDensity : null,
    customersPerServiceMemoryUpperBoundGiB: accepted ? peakRssDensity : null,
    heapMiB,
    configuredTenants
  } as unknown as DensityRunResult);

  it('requires an all-repetition pass and a higher failure to establish capacity', () => {
    const runs = [
      densityRun('scoped-introspection', 1, true, 2, 1, 2),
      densityRun('scoped-introspection', 1, true, 2.1, 2, 2),
      densityRun('scoped-introspection', 2, true, 3, 1, 2),
      densityRun('scoped-introspection', 2, true, 3.1, 2, 2),
      densityRun('scoped-introspection', 3, false, 0, 1, 2),
      densityRun('scoped-introspection', 3, false, 0, 2, 2)
    ];
    expect(summarizeCapacityBoundaries(runs)[0]).toMatchObject({
      highestAllRepetitionsPass: 2,
      lowestGreaterFail: 3,
      monotonicQualification: true,
      capacityBoundaryReached: true,
      incompleteTenantCounts: []
    });

    runs.pop();
    expect(summarizeCapacityBoundaries(runs)[0]).toMatchObject({
      capacityBoundaryReached: false,
      incompleteTenantCounts: [3]
    });
  });

  it('rejects non-monotonic and duplicate repetition boundaries', () => {
    const nonMonotonic = [
      densityRun('scoped-introspection', 1, false, 0),
      densityRun('scoped-introspection', 2, true, 2),
      densityRun('scoped-introspection', 3, false, 0)
    ];
    expect(summarizeCapacityBoundaries(nonMonotonic)[0]).toMatchObject({
      highestAllRepetitionsPass: 2,
      monotonicQualification: false,
      capacityBoundaryReached: false
    });

    const duplicateRepetition = [
      densityRun('scoped-introspection', 1, true, 1, 1, 2),
      densityRun('scoped-introspection', 1, true, 1, 1, 2),
      densityRun('scoped-introspection', 2, false, 0, 1, 2),
      densityRun('scoped-introspection', 2, false, 0, 2, 2)
    ];
    expect(summarizeCapacityBoundaries(duplicateRepetition)[0]).toMatchObject({
      capacityBoundaryReached: false,
      incompleteTenantCounts: [1]
    });
  });

  it('decides improvement from actual service memory and keeps heap metrics diagnostic', () => {
    const baseline = [
      densityRun('cache-governor-stock', 1, true, 1),
      densityRun('cache-governor-stock', 2, false, 0),
      densityRun('cache-governor-stock', 3, false, 0)
    ];
    const candidate = [
      densityRun('scoped-introspection', 1, true, 1),
      densityRun('scoped-introspection', 2, true, 1.3),
      densityRun('scoped-introspection', 3, false, 0)
    ];
    expect(compareDensity(baseline, candidate, gates)).toMatchObject({
      materiallyBetter: true,
      everyHeapAddsTenants: true,
      capacityBoundariesComplete: true,
      pairedMatrixComplete: true,
      configuredOldSpaceMedianImprovement: 1,
      configuredOldSpaceNonRegression: true,
      peakRssNonRegression: true
    });
    expect(compareDensity(baseline, candidate, gates).peakRssMedianImprovement)
      .toBeCloseTo(0.3, 10);

    candidate[1].tenantsPerPeakRssGiB = 0.9;
    expect(compareDensity(baseline, candidate, gates)).toMatchObject({
      materiallyBetter: true,
      peakRssNonRegression: false
    });

    candidate[1].customersPerAlignedServiceGiB = 0.9;
    candidate[1].customersPerServiceMemoryUpperBoundGiB = 0.9;
    expect(compareDensity(baseline, candidate, gates)).toMatchObject({
      materiallyBetter: false,
      alignedServiceNonRegression: false,
      serviceMemoryUpperBoundNonRegression: false
    });
  });

  it('requires the additional-customer gate in every paired repetition', () => {
    const matrix = (
      arm: string,
      capacities: [number, number]
    ): DensityRunResult[] => [1, 2, 3, 4].flatMap((count) => [1, 2].map((repetition) =>
      densityRun(
        arm,
        count,
        count <= capacities[repetition - 1],
        count <= capacities[repetition - 1] ? count : 0,
        repetition,
        2
      )
    ));

    const baseline = matrix('cache-governor-stock', [1, 2]);
    const aggregateOnlyImprovement = matrix('scoped-introspection', [2, 2]);
    const aggregateComparison = compareDensity(
      baseline,
      aggregateOnlyImprovement,
      gates
    );
    expect(aggregateComparison.baselineBoundaries[0].highestAllRepetitionsPass).toBe(1);
    expect(aggregateComparison.candidateBoundaries[0].highestAllRepetitionsPass).toBe(2);
    expect(aggregateComparison.capacityBoundariesComplete).toBe(true);
    expect(aggregateComparison.everyHeapAddsTenants).toBe(false);
    expect(aggregateComparison.materiallyBetter).toBe(false);

    const everyRepetitionImproves = matrix('scoped-introspection', [2, 3]);
    expect(compareDensity(baseline, everyRepetitionImproves, gates)).toMatchObject({
      everyHeapAddsTenants: true,
      materiallyBetter: true
    });
  });

  it('rejects an unbracketed per-repetition capacity even when the aggregate boundary exists', () => {
    const baseline = [1, 2, 3].flatMap((count) => [1, 2].map((repetition) =>
      densityRun(
        'cache-governor-stock',
        count,
        count <= repetition,
        count <= repetition ? count : 0,
        repetition,
        2
      )
    ));
    const candidate = [1, 2, 3].flatMap((count) => [1, 2].map((repetition) =>
      densityRun(
        'scoped-introspection',
        count,
        count <= repetition + 1,
        count <= repetition + 1 ? count : 0,
        repetition,
        2
      )
    ));
    expect(summarizeCapacityBoundaries(candidate)[0].capacityBoundaryReached).toBe(true);
    expect(compareDensity(baseline, candidate, gates)).toMatchObject({
      everyHeapAddsTenants: false,
      materiallyBetter: false
    });
  });

  it('does not call an unbracketed or incomplete matrix materially better', () => {
    const baseline = [
      densityRun('cache-governor-stock', 1, true, 1),
      densityRun('cache-governor-stock', 2, false, 0)
    ];
    const candidate = [
      densityRun('scoped-introspection', 1, true, 1),
      densityRun('scoped-introspection', 2, true, 1.3)
    ];
    expect(compareDensity(baseline, candidate, gates)).toMatchObject({
      materiallyBetter: false,
      capacityBoundariesComplete: false,
      pairedMatrixComplete: true
    });
    expect(compareDensity(baseline, candidate.slice(0, 1), gates)).toMatchObject({
      materiallyBetter: false,
      pairedMatrixComplete: false
    });
  });
});
