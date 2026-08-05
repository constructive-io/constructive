import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { resolveTenants } from '../config';
import {
  bindResultEvidence,
  RESULT_RAW_EVIDENCE_FILES,
  writeScoreContext
} from '../evidence';
import {
  rejectDuplicatePostgresRunEpochs,
  renderReport
} from '../report';
import {
  buildRunSchedule,
  scheduleJobsForPlan,
  scheduleManifestSha256,
  type CampaignScheduleManifestV1
} from '../schedule';
import { scoreRun, type ScoreInput } from '../score';
import type {
  AcceptanceGates,
  ArmPlan,
  DensityPlanV1,
  DensityRunResult,
  FleetV1,
  MemorySnapshot,
  PostgresMemorySnapshot,
  RealtimeDeliveryCoverage
} from '../types';

const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-report-test-'));
const planSha256 = 'a'.repeat(64);
const fleetSha256 = 'b'.repeat(64);
const CAPACITY_ERROR = `CAPACITY:sha256:${'9'.repeat(64)}`;
const campaignId = '7'.repeat(64);
const cohortSha256 = createHash('sha256')
  .update(`${planSha256}\0${fleetSha256}`)
  .digest('hex');

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

const arms: ArmPlan[] = ['cache-governor-stock', 'scoped-introspection'].map(
  (name, index) => ({
    name,
    command: ['node', 'server.cjs'],
    port: 3345 + index,
    readinessUrl: `http://127.0.0.1:${3345 + index}/healthz`,
    memoryUrl: `http://127.0.0.1:${3345 + index}/debug/memory`,
    introspectionMode: 'scoped-required'
  })
);

const fleet: FleetV1 = {
  version: 1,
  sourceSha256: fleetSha256,
  tenants: [1, 2, 3].map((index) => ({
    id: `tenant-${index}`,
    surfaces: [{
      name: 'api',
      buildContract: `tenant-${index}-api`,
      url: 'http://127.0.0.1:{port}/graphql',
      warmup: {
        name: 'warm',
        capability: 'graphile',
        query: '{ __typename }'
      },
      operations: [{
        name: 'read',
        capability: 'graphile',
        query: '{ __typename }'
      }],
      canaries: [{
        name: 'cross-schema',
        query: '{ __typename }',
        requiredMatches: [{ path: '/data/tenant', value: `tenant-${index}` }],
        forbiddenMatches: [{ path: '/data/tenant', value: 'foreign' }]
      }]
    }]
  }))
};

const plan: DensityPlanV1 = {
  version: 1,
  sourceSha256: planSha256,
  fleetFile: 'fleet.json',
  artifactDir: artifactRoot,
  arms,
  heapMiB: [1024],
  tenantCounts: [1, 2, 3],
  repetitions: 1,
  runOrderSeed: 'test-seed',
  requiredCapabilities: ['graphile'],
  requiredCanaries: ['cross-schema'],
  workload: {
    durationSec: 900,
    rpsPerTenant: 1,
    minWorkloadRequestsPerSurface: 1,
    requestTimeoutMs: 1_000,
    maxInFlight: 4,
    canaryIntervalSec: 60,
    warmupTimeoutMs: 1_000,
    warmupTimeoutPerSurfaceMs: 1_000,
    warmupConcurrency: 4
  },
  gates,
  qualification: {
    baselineArm: 'cache-governor-stock',
    requiredHeapMiB: [1024],
    minimumRepetitions: 1
  }
};

for (const [index, arm] of arms.entries()) {
  const runtimeArtifactFingerprint = `sha256:${String(index + 1).repeat(64)}`;
  const configurationFingerprint = `sha256:${String(index + 3).repeat(64)}`;
  const artifactFile = path.join(artifactRoot, `hostile-${arm.name}.json`);
  const artifact = {
    version: 1,
    kind: 'exact-runtime-hostile-validation-v1',
    passed: true,
    arm: arm.name,
    runtimeArtifactFingerprint,
    configurationFingerprint
  };
  const bytes = `${JSON.stringify(artifact, null, 2)}\n`;
  fs.writeFileSync(artifactFile, bytes, 'utf8');
  plan.qualification!.hostileValidationEvidence ??= {};
  plan.qualification!.hostileValidationEvidence[arm.name] = {
    version: 1,
    kind: 'exact-runtime-hostile-validation-v1',
    artifactFile,
    artifactSha256: createHash('sha256').update(bytes).digest('hex'),
    runtimeArtifactFingerprint,
    configurationFingerprint
  };
}

let activePlan = plan;
let activeSchedule: ReturnType<typeof buildRunSchedule> = [];
let activeScheduleSha256 = '';
let previousResultPayloadSha256: string | null = null;

const beginCampaign = (targetPlan: DensityPlanV1): void => {
  activePlan = targetPlan;
  activeSchedule = buildRunSchedule(
    targetPlan,
    targetPlan.arms,
    targetPlan.heapMiB,
    targetPlan.repetitions
  );
  const manifest: CampaignScheduleManifestV1 = {
    version: 1,
    campaignId,
    campaignStartedAt: '2026-08-01T23:59:00.000Z',
    runOrderSeed: targetPlan.runOrderSeed!,
    planSha256,
    fleetSha256,
    node: process.version,
    v8: process.versions.v8,
    platform: 'linux',
    architecture: 'x64',
    jobs: scheduleJobsForPlan(targetPlan, activeSchedule, true)
  };
  activeScheduleSha256 = scheduleManifestSha256(manifest);
  fs.writeFileSync(
    path.join(artifactRoot, `campaign-${campaignId}.json`),
    `${JSON.stringify({
      ...manifest,
      scheduleSha256: activeScheduleSha256,
      evidenceMode: 'qualification',
      qualificationBlockers: []
    }, null, 2)}\n`,
    'utf8'
  );
  previousResultPayloadSha256 = null;
};

const realtimeCoverage = (
  startedAt: string,
  endedAt: string,
  durationSec: number
): RealtimeDeliveryCoverage => ({
  version: 2,
  deliveryIntervalMs: 60_000,
  workloadStartedAt: startedAt,
  workloadDeadlineAt: new Date(Date.parse(startedAt) + durationSec * 1000).toISOString(),
  workloadEndedAt: endedAt,
  expectedRecurringRounds: 0,
  startedRecurringRounds: 0,
  verifiedRecurringRounds: 0,
  deadlineLateRecurringRounds: 0,
  primeRequests: 0,
  primeResponseP99Ms: 0,
  deliveryP99Ms: 0,
  complete: true,
  surfaces: []
});

const memorySnapshot = (
  timestamp: string,
  contracts: string[],
  nodeRssBytes: number
): MemorySnapshot => ({
  timestamp,
  pid: 123,
  nodeEnv: 'production',
  heapLimitBytes: 1024 * 1024 ** 2,
  heapUsedBytes: 100 * 1024 ** 2,
  rssBytes: nodeRssBytes,
  processPeakRssBytes: nodeRssBytes,
  cacheSize: contracts.length,
  residentBuildContractFingerprints: contracts,
  residentBuildContracts: contracts,
  evictions: 0,
  buildRefusals: 0,
  buildsStarted: contracts.length,
  buildsSucceeded: contracts.length,
  buildMaxMs: 80,
  pgPoolCacheSize: contracts.length,
  pgPoolLeasedPools: 0,
  pgPoolActiveLeases: 0,
  pgPoolCapacityEvictions: 0,
  pgPoolCapacityRefusals: 0,
  pgPoolDisposalFailures: 0,
  cacheCountersAvailable: true,
  buildCountersAvailable: true
});

const postgresSnapshot = (
  timestamp: string,
  postgresBytes: number
): PostgresMemorySnapshot => ({
  timestamp,
  usedBytes: postgresBytes,
  limitBytes: 8 * 1024 ** 3,
  source: 'cgroup-v2',
  cgroupV2: {
    currentBytes: postgresBytes,
    peakBytes: postgresBytes,
    maxBytes: 8 * 1024 ** 3,
    stat: {},
    events: { oom: 0, oom_kill: 0 }
  },
  raw: `${postgresBytes}B / 8GiB`
});

let artifactSequence = 0;

const scoreInput = (
  armName: string,
  configuredCustomers: number,
  desiredServiceDensity: number,
  executionErrors: string[] = [],
  options: { runKind?: 'matrix' | 'soak'; durationSec?: number } = {}
): ScoreInput => {
  const arm = arms.find((candidate) => candidate.name === armName)!;
  const tenants = resolveTenants(fleet.tenants.slice(0, configuredCustomers), arm);
  const durationSec = options.durationSec ?? 900;
  const runKind = options.runKind ?? 'matrix';
  const repetition = runKind === 'soak' ? activePlan.repetitions + 1 : 1;
  const scheduled = scheduleJobsForPlan(activePlan, activeSchedule, true).find((job) =>
    job.runKind === runKind
    && job.arm === armName
    && job.heapMiB === 1024
    && job.tenantCount === configuredCustomers
    && job.repetition === repetition
  );
  if (!scheduled) throw new Error('test coordinate is absent from the active campaign');
  const startedAt = new Date(
    Date.parse('2026-08-02T00:00:00.000Z')
    + (scheduled.orderIndex - 1) * 10_000_000
  ).toISOString();
  const endedAt = new Date(Date.parse(startedAt) + durationSec * 1000).toISOString();
  const targetServiceBytes = Math.round(
    configuredCustomers / desiredServiceDensity * 1024 ** 3
  );
  const nodeRssBytes = Math.max(256 * 1024 ** 2, Math.floor(targetServiceBytes * 0.6));
  const postgresBytes = Math.max(1, targetServiceBytes - nodeRssBytes);
  const contracts = tenants.flatMap((tenant) =>
    tenant.surfaces.map((surface) => surface.buildContract));
  const memorySnapshots = [
    memorySnapshot(startedAt, contracts, nodeRssBytes),
    memorySnapshot(endedAt, contracts, nodeRssBytes)
  ];
  const postgresSnapshots = [
    postgresSnapshot(startedAt, postgresBytes),
    postgresSnapshot(endedAt, postgresBytes)
  ];
  const runOrderIndex = scheduled.orderIndex;
  const artifactDir = path.join(artifactRoot, String(++artifactSequence));
  const provenance: ScoreInput['provenance'] = {
    cwd: '/tmp/repo',
    command: ['node', 'server.cjs'],
    gitHead: 'c'.repeat(40),
    worktreeDirty: false,
    gitStatusSha256: 'd'.repeat(64),
    lockfilePath: '/tmp/repo/pnpm-lock.yaml',
    lockfileSha256: 'e'.repeat(64),
    entryPath: '/tmp/repo/server.cjs',
    entrySha256: 'f'.repeat(64),
    serverPid: 123,
    v8Profile: 'stock',
    nodeOptions: '--max-old-space-size=1024',
    nodeOptionsArgv: ['--max-old-space-size=1024'],
    nodeExecArgv: [],
    effectiveNodeRuntimeFlags: ['--max-old-space-size=1024'],
    planSha256,
    fleetSha256,
    node: process.version,
    v8: process.versions.v8,
    platform: 'linux',
    architecture: 'x64',
    runOrderSeed: 'test-seed',
    runOrderIndex,
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
  return {
    arm: armName,
    evidenceMode: 'qualification',
    campaignId,
    scheduleSha256: activeScheduleSha256,
    previousResultPayloadSha256,
    qualificationCohortSha256: cohortSha256,
    introspectionMode: arm.introspectionMode,
    heapMiB: 1024,
    repetition,
    expectedMatrixRepetitions: 1,
    runKind,
    runOrderSeed: 'test-seed',
    runOrderIndex,
    startedAt,
    endedAt,
    configuredDurationSec: durationSec,
    workloadDurationMs: durationSec * 1000,
    artifactDir,
    tenants,
    warmedSurfaces: new Map(tenants.map((tenant) => [
      tenant.id,
      new Set(tenant.surfaces.map((surface) => surface.name))
    ])),
    warmupLatencies: tenants.map(() => 80),
    resolvedWarmupTimeoutMs: 1_000,
    offeredLoad: {
      mode: 'per-tenant',
      configuredRps: 1,
      tenantCount: configuredCustomers,
      totalRps: configuredCustomers,
      rpsPerTenant: 1
    },
    canaryIntervalSec: 60,
    periodicCanarySchedule: 'full-sweep',
    canarySchedule: null,
    minWorkloadRequestsPerSurface: 1,
    samples: tenants.flatMap((tenant) => tenant.surfaces.map((surface) => ({
      tenantId: tenant.id,
      surface: surface.name,
      operation: 'read',
      capability: 'graphile',
      latencyMs: 25,
      status: 200,
      ok: true,
      phase: 'workload' as const
    }))),
    canaries: tenants.flatMap((tenant) => tenant.surfaces.map((surface) => ({
      tenantId: tenant.id,
      surface: surface.name,
      canary: 'cross-schema',
      phase: 'initial' as const,
      scheduledAt: startedAt,
      startedAt,
      completedAt: new Date(Date.parse(startedAt) + 20).toISOString(),
      latencyMs: 20,
      conclusive: true,
      violation: false
    }))),
    memorySnapshots,
    postWarmupSnapshots: memorySnapshots,
    postWarmupNodeRssSnapshots: memorySnapshots.map((snapshot) => ({
      timestamp: snapshot.timestamp,
      pid: 123,
      source: 'proc' as const,
      rssBytes: snapshot.rssBytes!
    })),
    retainedMemory: { baseline: null, final: null, errors: [] },
    memorySampleErrors: [],
    postgresSnapshots,
    postgresSampleErrors: [],
    missedArrivals: 0,
    requiredCapabilities: ['graphile'],
    requiredCanaries: ['cross-schema'],
    gates,
    serverExit: null,
    provenance: {
      ...provenance,
      runOrderIndex
    },
    provenanceErrors: [],
    postgresRunAttestation: null,
    realtimeDeliveryCoverage: realtimeCoverage(startedAt, endedAt, durationSec),
    externalServer: false,
    executionErrors
  };
};

const writeJson = (file: string, value: unknown): void => {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const persistResult = (input: ScoreInput): DensityRunResult => {
  fs.mkdirSync(input.artifactDir, { recursive: true });
  writeJson(path.join(input.artifactDir, 'memory.json'), {
    snapshots: input.memorySnapshots,
    osSnapshots: input.postWarmupNodeRssSnapshots,
    errors: input.memorySampleErrors,
    warmupIndex: 0,
    osWarmupIndex: 0,
    osPeakRssBytes: Math.max(...input.postWarmupNodeRssSnapshots.map(
      (snapshot) => snapshot.rssBytes
    ))
  });
  writeJson(path.join(input.artifactDir, 'postgres-memory.json'), {
    snapshots: input.postgresSnapshots,
    errors: input.postgresSampleErrors
  });
  writeJson(path.join(input.artifactDir, 'canaries.json'), input.canaries);
  writeJson(path.join(input.artifactDir, 'canary-schedule.json'), input.canarySchedule);
  fs.writeFileSync(
    path.join(input.artifactDir, 'requests.ndjson'),
    `${input.samples.map((sample) => JSON.stringify(sample)).join('\n')}\n`,
    'utf8'
  );
  writeJson(path.join(input.artifactDir, 'workload-progress.json'), {
    warmedSurfaces: [...input.warmedSurfaces].map(([tenantId, surfaces]) => ({
      tenantId,
      surfaces: [...surfaces].sort()
    })),
    warmupLatencies: input.warmupLatencies,
    samples: input.samples.length,
    canaries: input.canaries.length,
    canarySchedule: input.canarySchedule,
    offeredLoad: input.offeredLoad,
    resolvedWarmupTimeoutMs: input.resolvedWarmupTimeoutMs,
    workloadDurationMs: input.workloadDurationMs
  });
  writeJson(path.join(input.artifactDir, 'retained-memory.json'), input.retainedMemory);
  writeJson(path.join(input.artifactDir, 'realtime-driver.json'), [{
    phase: 'timed-coverage-complete',
    timestamp: input.endedAt,
    snapshot: {
      expected: 0,
      active: 0,
      verified: 0,
      deliveryIntervalMs: input.realtimeDeliveryCoverage!.deliveryIntervalMs,
      deliveryEvents: 0,
      deliveryRoundsStarted: 0,
      deliveryRoundsVerified: 0,
      deliveryRoundsPending: 0,
      timedCoverage: input.realtimeDeliveryCoverage,
      errors: [],
      surfaces: []
    }
  }]);
  const result = scoreRun(input);
  writeScoreContext(input.artifactDir, input, {
    planSha256,
    fleetSha256,
    campaignId: input.campaignId,
    scheduleSha256: input.scheduleSha256,
    previousResultPayloadSha256: input.previousResultPayloadSha256,
    notBeforeEpochMs: Date.parse(input.startedAt)
  });
  bindResultEvidence(result);
  previousResultPayloadSha256 = result.evidenceBinding!.resultPayloadSha256;
  return result;
};

const persistConfiguredMatrix = (): DensityRunResult[] => activeSchedule.map((job) => {
  const baseline = job.arm.name === 'cache-governor-stock';
  const acceptedBoundary = baseline ? 1 : 2;
  return persistResult(scoreInput(
    job.arm.name,
    job.tenantCount,
    baseline ? 1 : 2,
    job.tenantCount <= acceptedBoundary ? [] : [CAPACITY_ERROR]
  ));
});

describe('density report', () => {
  beforeEach(() => beginCampaign(plan));

  it('rejects a semantically edited result even after its public hashes are rebound', () => {
    const first = activeSchedule[0];
    const value = persistResult(scoreInput(first.arm.name, first.tenantCount, 1));
    value.p99Ms += 1;
    bindResultEvidence(value);
    expect(() => renderReport([value], plan, fleet)).toThrow(
      'does not match semantic replay of raw evidence'
    );

    beginCampaign(plan);
    const divergent = persistResult(scoreInput(first.arm.name, first.tenantCount, 1));
    fs.appendFileSync(path.join(divergent.artifactDir, 'requests.ndjson'), '{}\n');
    expect(() => renderReport([divergent], plan, fleet)).toThrow(
      'raw evidence file does not match: requests.ndjson'
    );
  });

  it('renders an exactly paired capacity decision from replayed evidence', () => {
    const results = persistConfiguredMatrix();
    const report = renderReport(results, plan, fleet);
    expect(report).toContain('Customers/aligned service GiB');
    expect(report).toContain('Customer workload RPS');
    expect(report).toContain('Periodic validation RPS');
    expect(report).toContain('Realtime validation RPS');
    expect(report).toContain('matrices are exactly paired: yes');
    expect(report).toContain('Materially better: **yes**');
  });

  it('rejects reordered, cross-campaign, and overlapping result ledgers', () => {
    const results = persistConfiguredMatrix();
    expect(() => renderReport([
      results[1],
      results[0],
      ...results.slice(2)
    ], plan, fleet)).toThrow('campaign schedule or result chain');

    const spliced = { ...results[1], campaignId: '8'.repeat(64) };
    bindResultEvidence(spliced);
    expect(() => renderReport([
      results[0],
      spliced,
      ...results.slice(2)
    ], plan, fleet)).toThrow('campaign schedule or result chain');

    const overlapping = {
      ...results[1],
      startedAt: results[0].startedAt
    };
    bindResultEvidence(overlapping);
    expect(() => renderReport([
      results[0],
      overlapping,
      ...results.slice(2)
    ], plan, fleet)).toThrow('campaign chronology is invalid or overlapping');
  });

  it('rejects qualification without exact-runtime hostile validation artifacts', () => {
    const unboundPlan: DensityPlanV1 = {
      ...plan,
      qualification: {
        baselineArm: plan.qualification!.baselineArm,
        requiredHeapMiB: [...plan.qualification!.requiredHeapMiB],
        minimumRepetitions: plan.qualification!.minimumRepetitions
      }
    };
    beginCampaign(unboundPlan);
    const first = activeSchedule[0];
    const result = persistResult(scoreInput(first.arm.name, first.tenantCount, 1));
    expect(() => renderReport([result], unboundPlan, fleet)).toThrow(
      'lacks exact-runtime hostile validation evidence'
    );
  });

  it('rejects malformed nested request evidence after rebinding its artifact hash', () => {
    const first = activeSchedule[0];
    const result = persistResult(scoreInput(first.arm.name, first.tenantCount, 1));
    const requestsFile = path.join(result.artifactDir, 'requests.ndjson');
    const request = JSON.parse(fs.readFileSync(requestsFile, 'utf8').trim());
    request.latencyMs = null;
    fs.writeFileSync(requestsFile, `${JSON.stringify(request)}\n`, 'utf8');
    bindResultEvidence(result);
    expect(() => renderReport([result], plan, fleet)).toThrow(
      'latencyMs must be finite'
    );
  });

  it('requires one configured qualifying soak without mixing it into the matrix', () => {
    const soakPlan: DensityPlanV1 = {
      ...plan,
      soak: {
        enabled: true,
        arm: 'scoped-introspection',
        durationSec: 7_200,
        tenantCount: 2,
        heapMiB: 1024
      }
    };
    beginCampaign(soakPlan);
    const matrix = persistConfiguredMatrix();
    expect(renderReport(matrix, soakPlan, fleet)).toContain(
      'configured soak=0/1, accepted=no'
    );
    const soak = persistResult(scoreInput(
      'scoped-introspection',
      2,
      2,
      [],
      { runKind: 'soak', durationSec: 7_200 }
    ));
    const report = renderReport([...matrix, soak], soakPlan, fleet);
    expect(report).toContain('configured soak=1/1, accepted=yes');
    expect(report).toContain('Materially better: **yes**');
  });

  it('rejects reuse of any PostgreSQL container, cluster, clone, or nonce identity', () => {
    const first = persistResult(scoreInput(
      activeSchedule[0].arm.name,
      activeSchedule[0].tenantCount,
      2
    ));
    const second = persistResult(scoreInput(
      activeSchedule[1].arm.name,
      activeSchedule[1].tenantCount,
      2
    ));
    const evidence = {
      epochId: `sha256:${'1'.repeat(64)}`,
      containerId: '2'.repeat(64),
      cgroupIdentitySha256: `sha256:${'3'.repeat(64)}`,
      postgresSystemIdentifier: '7421234567890123456',
      cloneId: 'measurement-clone-1',
      cloneAttestationSetSha256: `sha256:${'4'.repeat(64)}`,
      cloneNonceSetSha256: `sha256:${'5'.repeat(64)}`
    } as DensityRunResult['postgresRunAttestation'];
    first.postgresRunAttestation = evidence;
    second.postgresRunAttestation = {
      ...evidence!,
      epochId: `sha256:${'6'.repeat(64)}`,
      containerId: '7'.repeat(64),
      cgroupIdentitySha256: `sha256:${'8'.repeat(64)}`,
      postgresSystemIdentifier: '8421234567890123456',
      cloneId: 'measurement-clone-2',
      cloneAttestationSetSha256: `sha256:${'9'.repeat(64)}`
    };
    const rejected = rejectDuplicatePostgresRunEpochs([first, second]);
    expect(rejected.every((run) => !run.accepted)).toBe(true);
    expect(rejected.every((run) => run.failures.some((failure) =>
      failure.includes('clone-nonce-set:')
    ))).toBe(true);
  });

  it('binds every fixed raw-evidence file including the score context', () => {
    expect(RESULT_RAW_EVIDENCE_FILES).toContain('score-context.json');
  });
});
