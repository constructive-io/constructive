import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  armEnvironmentForHeap,
  assertLoopbackObservabilityUrl,
  assertLoopbackRetainedHeapCheckpointUrl,
  DEFAULT_RUN_ORDER_SEED,
  hasExactHostileValidationEvidence,
  resolveTenants,
  resolveTemplate,
  soakArmName,
  tenantCountsForHeap,
  validateCoverage
} from './config';
import {
  createWorkloadCapture,
  resolveOfferedLoad,
  resolveWarmupTimeoutMs,
  runWorkload,
  type WorkloadCapture,
  type WorkloadResult
} from './http';
import { bindResultEvidence, writeScoreContext } from './evidence';
import {
  normalizeRetainedMemoryCheckpoint,
  startMemorySampler
} from './memory';
import { startPostgresMemorySampler } from './postgres';
import { startArmProcess } from './process';
import { createRealtimeDriver, type RealtimeDriverSnapshot } from './realtime';
import {
  buildRunSchedule,
  sameRunSchedule,
  scheduleJobsForPlan,
  scheduleManifestSha256,
  type CampaignScheduleManifestV1
} from './schedule';
import {
  collectPostgresRunAttestation,
  postgresRunIdentityClaims
} from './run-attestation';
import {
  scoreRun,
  summarizeCapacityBoundaries,
  type ScoreInput
} from './score';
import type {
  ArmPlan,
  ArmProvenance,
  DensityPlanV1,
  DensityRunResult,
  FleetV1,
  PostgresRunAttestationEvidence,
  ResolvedMemoryPolicy,
  RetainedMemoryCheckpoint,
  RetainedMemoryCheckpointPair,
  RealtimeDeliveryCoverage,
  WorkloadPlan
} from './types';

export interface RunSelection {
  arms?: string[];
  heaps?: number[];
  tenantCounts?: number[];
  repetitions?: number;
  smoke?: boolean;
}

export { buildRunSchedule } from './schedule';

interface RunContext {
  expectedMatrixRepetitions: number;
  runKind: 'matrix' | 'soak';
  evidenceMode: 'qualification' | 'diagnostic';
  campaignId: string;
  scheduleSha256: string;
  previousResultPayloadSha256: string | null;
  qualificationCohortSha256: string;
  runOrderSeed: string;
  runOrderIndex: number;
  planSha256: string;
  fleetSha256: string;
  notBeforeEpochMs: number;
  claimPostgresRunIdentity(
    evidence: PostgresRunAttestationEvidence
  ): string | null;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const executionErrorEvidence = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  const code = message.match(/(?:^|\b)([A-Z][A-Z0-9_]{2,})(?=\b|:)/)?.[1]
    ?? 'CPERF_EXECUTION_FAILED';
  return `${code}:sha256:${sha256(message)}`;
};

const writeResult = (
  root: string,
  result: DensityRunResult,
  input: ScoreInput,
  context: Pick<
  RunContext,
  | 'planSha256'
  | 'fleetSha256'
  | 'notBeforeEpochMs'
  | 'campaignId'
  | 'scheduleSha256'
  | 'previousResultPayloadSha256'
  >
): void => {
  fs.mkdirSync(result.artifactDir, { recursive: true });
  writeScoreContext(result.artifactDir, input, context);
  bindResultEvidence(result);
  fs.writeFileSync(
    path.join(result.artifactDir, 'result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8'
  );
  fs.mkdirSync(root, { recursive: true });
  const serialized = `${JSON.stringify(result)}\n`;
  fs.appendFileSync(path.join(root, 'results.ndjson'), serialized, 'utf8');
  fs.appendFileSync(
    path.join(root, `results-${context.campaignId}.ndjson`),
    serialized,
    'utf8'
  );
};

const writeJson = (file: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeExclusiveJson = (file: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx'
  });
};

const invokePostWarmupHook = async (
  arm: ArmPlan,
  heapMiB: number,
  tenantCount: number,
  artifactDir: string,
  headers: Readonly<Record<string, string>>
): Promise<void> => {
  if (!arm.postWarmupUrl) return;
  const url = resolveTemplate(arm.postWarmupUrl, {
    heapMiB,
    port: arm.port,
    artifactDir,
    mode: arm.introspectionMode,
    tenantCount
  });
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'http:'
    || !['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)
    || Number(parsed.port) !== arm.port
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
  ) {
    throw new Error(`postWarmupUrl must be an authenticated loopback URL on port ${arm.port}`);
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(60_000)
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `post-warmup hook failed with HTTP ${response.status}: ${responseText.slice(0, 512)}`
    );
  }
  let responseBody: unknown = responseText;
  try {
    responseBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    // The hook contract permits a diagnostic text response.
  }
  writeJson(path.join(artifactDir, 'post-warmup-hook.json'), {
    timestamp: new Date().toISOString(),
    url: parsed.pathname,
    response: responseBody
  });
};

const invokeRetainedMemoryCheckpoint = async (
  arm: ArmPlan,
  heapMiB: number,
  tenantCount: number,
  headers: Readonly<Record<string, string>>,
  errors: string[]
): Promise<RetainedMemoryCheckpoint | null> => {
  if (!arm.retainedHeapCheckpointUrl) return null;
  const url = resolveTemplate(arm.retainedHeapCheckpointUrl, {
    heapMiB,
    port: arm.port,
    artifactDir: '',
    mode: arm.introspectionMode,
    tenantCount
  });
  assertLoopbackRetainedHeapCheckpointUrl(url, arm.port);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(60_000)
    });
    const responseText = await response.text();
    let body: unknown = null;
    try {
      body = responseText ? JSON.parse(responseText) : null;
    } catch {
      errors.push('retained-memory checkpoint returned non-JSON data');
    }
    const checkpoint = normalizeRetainedMemoryCheckpoint(body);
    if (!checkpoint) {
      const serverMessage = typeof (body as any)?.error?.message === 'string'
        ? `: ${(body as any).error.message}`
        : '';
      errors.push(
        `retained-memory checkpoint response was invalid (HTTP ${response.status})${serverMessage}`
      );
      return null;
    }
    if (!response.ok) {
      errors.push(`retained-memory checkpoint failed with HTTP ${response.status}`);
    }
    return checkpoint;
  } catch (error) {
    errors.push(
      `retained-memory checkpoint request failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
};

const resolvedMemoryPolicy = (
  arm: ArmPlan,
  heapMiB: number,
  expectedV8HeapLimitBytes: number | null
): ResolvedMemoryPolicy => {
  const env = { ...process.env, ...armEnvironmentForHeap(arm, heapMiB) };
  const value = (name: string): string | null => env[name]?.trim() || null;
  return {
    configuredMaxOldSpaceMiB: heapMiB,
    expectedV8HeapLimitBytes,
    graphileCacheMax: value('GRAPHILE_CACHE_MAX'),
    graphileCacheInstanceHeapBytes: value('GRAPHILE_CACHE_INSTANCE_HEAP_BYTES'),
    graphileCacheServerReserveBytes: value('GRAPHILE_CACHE_SERVER_RESERVE_BYTES'),
    graphileCacheBuildReserveBytes: value('GRAPHILE_CACHE_BUILD_RESERVE_BYTES'),
    graphileCacheRssLimitBytes: value('GRAPHILE_CACHE_RSS_LIMIT_BYTES'),
    graphileCacheRssBuildReserveBytes: value('GRAPHILE_CACHE_RSS_BUILD_RESERVE_BYTES'),
    graphileCacheCalibrationId: value('GRAPHILE_CACHE_CALIBRATION_ID'),
    graphileCacheAdmissionMode: value('GRAPHILE_CACHE_ADMISSION_MODE'),
    graphileBuildMaxConcurrency: value('GRAPHILE_BUILD_MAX_CONCURRENCY')
  };
};

const contextualProvenance = (
  provenance: ArmProvenance,
  arm: ArmPlan,
  heapMiB: number,
  expectedV8HeapLimitBytes: number | null,
  context: RunContext
): ArmProvenance => ({
  ...provenance,
  planSha256: context.planSha256,
  fleetSha256: context.fleetSha256,
  runOrderSeed: context.runOrderSeed,
  runOrderIndex: context.runOrderIndex,
  memoryPolicy: resolvedMemoryPolicy(arm, heapMiB, expectedV8HeapLimitBytes)
});

const persistPartialArtifacts = (
  artifactDir: string,
  memory: ReturnType<typeof startMemorySampler> | null,
  postgresMemory: ReturnType<typeof startPostgresMemorySampler> | null,
  capture: WorkloadCapture,
  workloadResult: WorkloadResult | null,
  retainedMemory: RetainedMemoryCheckpointPair
): void => {
  writeJson(path.join(artifactDir, 'memory.json'), {
    snapshots: memory?.snapshots ?? [],
    osSnapshots: memory?.osSnapshots ?? [],
    errors: memory?.errors ?? [],
    warmupIndex: memory?.warmupIndex ?? -1,
    osWarmupIndex: memory?.osWarmupIndex ?? -1,
    osPeakRssBytes: memory?.osPeakRssBytes ?? null
  });
  writeJson(path.join(artifactDir, 'postgres-memory.json'), {
    snapshots: postgresMemory?.snapshots ?? [],
    errors: postgresMemory?.errors ?? []
  });
  writeJson(path.join(artifactDir, 'canaries.json'), capture.canaries);
  writeJson(path.join(artifactDir, 'canary-schedule.json'), capture.canarySchedule);
  fs.writeFileSync(
    path.join(artifactDir, 'requests.ndjson'),
    capture.samples.length > 0
      ? `${capture.samples.map((sample) => JSON.stringify(sample)).join('\n')}\n`
      : '',
    'utf8'
  );
  writeJson(path.join(artifactDir, 'workload-progress.json'), {
    warmedSurfaces: [...capture.warmedSurfaces].map(([tenantId, surfaces]) => ({
      tenantId,
      surfaces: [...surfaces].sort()
    })),
    warmupLatencies: capture.warmupLatencies,
    samples: capture.samples.length,
    canaries: capture.canaries.length,
    canarySchedule: capture.canarySchedule,
    offeredLoad: workloadResult?.offeredLoad ?? null,
    resolvedWarmupTimeoutMs: workloadResult?.resolvedWarmupTimeoutMs ?? null,
    workloadDurationMs: workloadResult?.workloadDurationMs ?? null
  });
  writeJson(path.join(artifactDir, 'retained-memory.json'), retainedMemory);
};

const artifactName = (
  arm: ArmPlan,
  heapMiB: number,
  tenantCount: number,
  repetition: number,
  suffix = 'matrix'
): string => [suffix, arm.name, `h${heapMiB}`, `t${tenantCount}`, `r${repetition}`]
  .map((part) => part.replace(/[^a-zA-Z0-9_.-]+/g, '-'))
  .join('-');

const runOne = async (
  plan: DensityPlanV1,
  fleet: FleetV1,
  arm: ArmPlan,
  heapMiB: number,
  tenantCount: number,
  repetition: number,
  workload: WorkloadPlan,
  context: RunContext,
  suffix = 'matrix'
): Promise<DensityRunResult> => {
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
  const artifactDir = path.join(
    plan.artifactDir,
    `${artifactName(arm, heapMiB, tenantCount, repetition, suffix)}-${runId}`
  );
  fs.mkdirSync(artifactDir, { recursive: true });
  let server: Awaited<ReturnType<typeof startArmProcess>> | null = null;
  let memory: ReturnType<typeof startMemorySampler> | null = null;
  let postgresMemory: ReturnType<typeof startPostgresMemorySampler> | null = null;
  let workloadResult: WorkloadResult | null = null;
  let provenance: ArmProvenance | null = null;
  let postgresRunAttestation: PostgresRunAttestationEvidence | null = null;
  let realtimeDeliveryCoverage: RealtimeDeliveryCoverage | null = null;
  const realtimeEvidence: Array<{
    phase: string;
    timestamp: string;
    snapshot: RealtimeDriverSnapshot;
  }> = [];
  const retainedMemory: RetainedMemoryCheckpointPair = {
    baseline: null,
    final: null,
    errors: []
  };
  const capture = createWorkloadCapture();
  const tenants = resolveTenants(fleet.tenants.slice(0, tenantCount), arm);
  const realtime = createRealtimeDriver(tenants, {
    // Keep connection/prime transients bounded independently of schema-build
    // concurrency; one-at-a-time setup is unnecessarily slow at 500+ surfaces.
    concurrency: Math.min(8, workload.maxInFlight),
    timeoutMs: workload.requestTimeoutMs
  });
  const recordRealtime = (phase: string): void => {
    realtimeEvidence.push({
      phase,
      timestamp: new Date().toISOString(),
      snapshot: realtime.snapshot()
    });
    writeJson(path.join(artifactDir, 'realtime-driver.json'), realtimeEvidence);
  };
  const startedAt = new Date().toISOString();
  const makeScoreInput = (
    endedAt: string,
    executionErrors: string[]
  ): ScoreInput => {
    const memorySnapshots = memory?.snapshots ?? [];
    const osSnapshots = memory?.osSnapshots ?? [];
    return {
      arm: arm.name,
      evidenceMode: context.evidenceMode,
      campaignId: context.campaignId,
      scheduleSha256: context.scheduleSha256,
      previousResultPayloadSha256: context.previousResultPayloadSha256,
      qualificationCohortSha256: context.qualificationCohortSha256,
      commit: arm.commit,
      introspectionMode: arm.introspectionMode,
      heapMiB,
      repetition,
      expectedMatrixRepetitions: context.expectedMatrixRepetitions,
      runKind: context.runKind,
      runOrderSeed: context.runOrderSeed,
      runOrderIndex: context.runOrderIndex,
      startedAt,
      endedAt,
      configuredDurationSec: workload.durationSec,
      workloadDurationMs: workloadResult?.workloadDurationMs ?? 0,
      artifactDir,
      tenants,
      warmedSurfaces: capture.warmedSurfaces,
      warmupLatencies: capture.warmupLatencies,
      resolvedWarmupTimeoutMs: workloadResult?.resolvedWarmupTimeoutMs
        ?? resolveWarmupTimeoutMs(
          workload,
          tenants.reduce((sum, tenant) => sum + tenant.surfaces.length, 0)
        ),
      offeredLoad: workloadResult?.offeredLoad
        ?? resolveOfferedLoad(workload, tenants.length),
      canaryIntervalSec: workload.canaryIntervalSec,
      periodicCanarySchedule: workload.periodicCanarySchedule ?? 'full-sweep',
      canarySchedule: capture.canarySchedule,
      minWorkloadRequestsPerSurface: workload.minWorkloadRequestsPerSurface,
      samples: capture.samples,
      canaries: capture.canaries,
      memorySnapshots,
      postWarmupSnapshots: memorySnapshots.slice(
        Math.max(0, memory?.warmupIndex ?? -1)
      ),
      postWarmupNodeRssSnapshots: osSnapshots.slice(
        Math.max(0, memory?.osWarmupIndex ?? -1)
      ),
      retainedMemory,
      memorySampleErrors: memory?.errors ?? [],
      postgresSnapshots: postgresMemory?.snapshots ?? [],
      postgresSampleErrors: postgresMemory?.errors ?? [],
      missedArrivals: capture.samples.filter(
        (sample) => sample.errorCode === 'LOAD_GENERATOR_MISSED_ARRIVAL'
      ).length,
      requiredCapabilities: plan.requiredCapabilities,
      requiredCanaries: plan.requiredCanaries,
      gates: plan.gates,
      serverExit: server?.exit ?? null,
      provenance,
      provenanceErrors: (server?.provenanceErrors ?? []).map(
        executionErrorEvidence
      ),
      postgresRunAttestation,
      realtimeDeliveryCoverage,
      externalServer: server?.external ?? false,
      executionErrors
    };
  };
  try {
    if (plan.gates.requireFreshPostgresRunAttestation) {
      postgresRunAttestation = await collectPostgresRunAttestation(arm, {
        arm: arm.name,
        heapMiB,
        tenantCount,
        repetition,
        runOrderIndex: context.runOrderIndex,
        planSha256: context.planSha256,
        fleetSha256: context.fleetSha256,
        notBeforeEpochMs: context.notBeforeEpochMs,
        artifactDir
      });
      if (postgresRunAttestation) {
        const reusedIdentity = context.claimPostgresRunIdentity(
          postgresRunAttestation
        );
        if (reusedIdentity) {
          throw new Error(
            `PostgreSQL run identity was reused: ${reusedIdentity}`
          );
        }
      }
    }
    const memoryUrl = resolveTemplate(arm.memoryUrl, {
      heapMiB,
      port: arm.port,
      artifactDir,
      mode: arm.introspectionMode
    });
    assertLoopbackObservabilityUrl(memoryUrl, arm.port);
    server = await startArmProcess(
      arm,
      heapMiB,
      artifactDir,
      tenantCount,
      postgresRunAttestation ? {
        postgresFixtureDir: path.join(artifactDir, 'postgres-fixture'),
        postgresManifestFile: path.join(
          artifactDir,
          'postgres-fixture',
          'provision.json'
        ),
        postgresSecretsFile: path.join(
          artifactDir,
          'postgres-fixture',
          'runtime-secrets.json'
        ),
        postgresManifestSha256: postgresRunAttestation.manifestSha256,
        postgresCloneId: postgresRunAttestation.cloneId
      } : {}
    );
    provenance = contextualProvenance(
      server.provenance,
      arm,
      heapMiB,
      server.expectedHeapLimitBytes,
      context
    );
    writeJson(path.join(artifactDir, 'provenance.json'), {
      ...provenance,
      expectedHeapLimitBytes: server.expectedHeapLimitBytes,
      errors: server.provenanceErrors
    });
    memory = startMemorySampler(memoryUrl, {
      expectedPid: server.pid,
      expectedHeapLimitBytes: server.expectedHeapLimitBytes,
      currentRssSource: context.evidenceMode === 'qualification' ? 'proc' : 'auto',
      headers: server.observabilityHeaders
    });
    if (arm.postgresContainer) {
      postgresMemory = startPostgresMemorySampler(arm.postgresContainer, {
        requireCgroupV2: arm.requirePostgresCgroupV2,
        ...(postgresRunAttestation ? {
          expectedContainerId: postgresRunAttestation.containerId,
          expectedContainerStartedAt: postgresRunAttestation.containerStartedAt,
          expectedCgroupIdentitySha256: postgresRunAttestation.cgroupIdentitySha256
        } : {})
      });
    }
    await Promise.all([memory.ready, postgresMemory?.ready]);
    workloadResult = await runWorkload(
      tenants,
      workload,
      async () => {
        // runWorkload invokes this at the final pre-load boundary, after its
        // schema warmups, capability coverage, and initial hostile canaries.
        // The driver owns all graphql-ws client objects, so their heap/RSS is
        // outside the measured server child. The server hook only verifies
        // that every exact-route inbound connection and manager is resident.
        await realtime.startAndVerify();
        recordRealtime('verified-before-baseline');
        await invokePostWarmupHook(
          arm,
          heapMiB,
          tenantCount,
          artifactDir,
          server!.observabilityHeaders
        );
        realtime.assertHealthy();
        if (arm.retainedHeapCheckpointUrl) {
          retainedMemory.baseline = await invokeRetainedMemoryCheckpoint(
            arm,
            heapMiB,
            tenantCount,
            server!.observabilityHeaders,
            retainedMemory.errors
          );
        }
        // Begin natural post-warm RSS/heap accounting after the benchmark-only
        // baseline GC. The sampler itself and the PostgreSQL sampler remain
        // live throughout both bookends.
        await memory!.markWarmupComplete();
        realtime.beginTimedCoverage(workload.durationSec * 1000);
      },
      capture
    );
    realtimeDeliveryCoverage = await realtime.finishTimedCoverage();
    recordRealtime('timed-coverage-complete');
    await realtime.verifyDeliveryNow();
    realtime.assertHealthy();
    recordRealtime('healthy-after-workload');
    if (arm.retainedHeapCheckpointUrl) {
      retainedMemory.final = await invokeRetainedMemoryCheckpoint(
        arm,
        heapMiB,
        tenantCount,
        server.observabilityHeaders,
        retainedMemory.errors
      );
    }
    realtime.assertHealthy();
    recordRealtime('healthy-after-final-checkpoint');
    await memory.stop();
    if (postgresMemory) await postgresMemory.stop();
    realtime.assertHealthy();
    recordRealtime('healthy-before-disposal');
    await realtime.dispose();
    recordRealtime('disposed');
    persistPartialArtifacts(
      artifactDir,
      memory,
      postgresMemory,
      capture,
      workloadResult,
      retainedMemory
    );
    const endedAt = new Date().toISOString();
    const scoreInput = makeScoreInput(endedAt, []);
    const result = scoreRun(scoreInput);
    writeResult(plan.artifactDir, result, scoreInput, context);
    return result;
  } catch (error) {
    const executionErrors = [executionErrorEvidence(error)];
    recordRealtime('failed');
    if (memory) {
      try {
        await memory.stop();
      } catch (stopError) {
        memory.errors.push(stopError instanceof Error ? stopError.message : String(stopError));
      }
    }
    if (postgresMemory) {
      try {
        await postgresMemory.stop();
      } catch (stopError) {
        postgresMemory.errors.push(
          stopError instanceof Error ? stopError.message : String(stopError)
        );
      }
    }
    try {
      await realtime.dispose();
      recordRealtime('disposed-after-failure');
    } catch (disposeError) {
      executionErrors.push(executionErrorEvidence(disposeError));
      recordRealtime('dispose-failed');
    }
    persistPartialArtifacts(
      artifactDir,
      memory,
      postgresMemory,
      capture,
      workloadResult,
      retainedMemory
    );
    const scoreInput = makeScoreInput(
      new Date().toISOString(),
      executionErrors
    );
    const result = scoreRun(scoreInput);
    writeResult(plan.artifactDir, result, scoreInput, context);
    return result;
  } finally {
    if (memory) await memory.stop();
    if (postgresMemory) await postgresMemory.stop();
    try {
      await realtime.dispose();
    } catch {
      // Disposal was already attempted and recorded in the main path.
    }
    await server?.stop();
  }
};

export const runDensityPlan = async (
  plan: DensityPlanV1,
  fleet: FleetV1,
  selection: RunSelection = {}
): Promise<DensityRunResult[]> => {
  validateCoverage(plan, fleet);
  const arms = plan.arms.filter((arm) => !selection.arms || selection.arms.includes(arm.name));
  if (arms.length === 0) throw new Error('run selection contains no known arms');
  const heaps = selection.heaps ?? (selection.smoke ? plan.heapMiB.slice(0, 1) : plan.heapMiB);
  const repetitions = selection.smoke ? 1 : selection.repetitions ?? plan.repetitions;
  if (!Number.isInteger(repetitions) || repetitions <= 0) {
    throw new Error('run repetitions must be a positive integer');
  }
  const tenantCountsOverride = selection.tenantCounts
    ?? (selection.smoke ? tenantCountsForHeap(plan, heaps[0]).slice(0, 1) : undefined);
  const schedule = buildRunSchedule(
    plan,
    arms,
    heaps,
    repetitions,
    tenantCountsOverride
  );
  const configuredSchedule = buildRunSchedule(
    plan,
    plan.arms,
    plan.heapMiB,
    plan.repetitions
  );
  const exactConfiguredMatrix = sameRunSchedule(schedule, configuredSchedule);
  for (const job of schedule) {
    if (job.tenantCount > fleet.tenants.length) {
      throw new Error(`fleet has ${fleet.tenants.length} tenants, requested ${job.tenantCount}`);
    }
  }
  const results: DensityRunResult[] = [];
  const runOrderSeed = plan.runOrderSeed ?? DEFAULT_RUN_ORDER_SEED;
  const planSha256 = plan.sourceSha256 ?? sha256(JSON.stringify(plan));
  const fleetSha256 = fleet.sourceSha256 ?? sha256(JSON.stringify(fleet));
  const qualificationCohortSha256 = sha256(`${planSha256}\0${fleetSha256}`);
  const hostileEvidenceReady = hasExactHostileValidationEvidence(plan);
  const evidenceMode = plan.qualification
    && exactConfiguredMatrix
    && !selection.smoke
    && process.platform === 'linux'
    && hostileEvidenceReady
    ? 'qualification'
    : 'diagnostic';
  const campaignId = randomBytes(32).toString('hex');
  const campaignStartedAt = new Date().toISOString();
  const scheduleManifest: CampaignScheduleManifestV1 = {
    version: 1,
    campaignId,
    campaignStartedAt,
    runOrderSeed,
    planSha256,
    fleetSha256,
    node: process.version,
    v8: process.versions.v8,
    platform: process.platform,
    architecture: process.arch,
    jobs: scheduleJobsForPlan(plan, schedule, !selection.smoke)
  };
  const scheduleSha256 = scheduleManifestSha256(scheduleManifest);
  writeExclusiveJson(path.join(plan.artifactDir, `campaign-${campaignId}.json`), {
    ...scheduleManifest,
    scheduleSha256,
    evidenceMode,
    qualificationBlockers: [
      ...(!plan.qualification ? ['qualification-plan-missing'] : []),
      ...(!exactConfiguredMatrix ? ['noncanonical-or-partial-schedule'] : []),
      ...(selection.smoke ? ['smoke-run'] : []),
      ...(process.platform !== 'linux' ? ['linux-required'] : []),
      ...(!hostileEvidenceReady ? ['exact-hostile-validation-evidence-required'] : [])
    ]
  });
  if (evidenceMode === 'diagnostic' && plan.qualification) {
    process.stdout.write(
      `[cperf] campaign=${campaignId} diagnostic qualification prerequisites were not met\n`
    );
  }
  const claimedPostgresRunIdentities = new Set<string>();
  const claimPostgresRunIdentity = (
    evidence: PostgresRunAttestationEvidence
  ): string | null => {
    const claims = postgresRunIdentityClaims(evidence);
    const reused = claims.find((claim) => claimedPostgresRunIdentities.has(claim));
    if (reused) return reused;
    for (const claim of claims) claimedPostgresRunIdentities.add(claim);
    return null;
  };

  let previousResultPayloadSha256: string | null = null;
  for (const job of schedule) {
    const workload: WorkloadPlan = selection.smoke
      ? {
        ...plan.workload,
        durationSec: 5,
        ...(plan.workload.rps != null
          ? { rps: Math.min(plan.workload.rps, 5), rpsPerTenant: undefined }
          : {
            rps: undefined,
            rpsPerTenant: Math.min(plan.workload.rpsPerTenant!, 5 / job.tenantCount)
          })
      }
      : plan.workload;
    const result = await runOne(
      plan,
      fleet,
      job.arm,
      job.heapMiB,
      job.tenantCount,
      job.repetition,
      workload,
      {
        expectedMatrixRepetitions: plan.repetitions,
        runKind: 'matrix',
        evidenceMode,
        campaignId,
        scheduleSha256,
        previousResultPayloadSha256,
        qualificationCohortSha256,
        runOrderSeed,
        runOrderIndex: job.orderIndex,
        planSha256,
        fleetSha256,
        notBeforeEpochMs: Date.now(),
        claimPostgresRunIdentity
      }
    );
    results.push(result);
    previousResultPayloadSha256 = result.evidenceBinding?.resultPayloadSha256 ?? null;
    if (!previousResultPayloadSha256) {
      throw new Error('persisted result is missing its evidence payload binding');
    }
    process.stdout.write(
      `[cperf] order=${job.orderIndex} ${job.arm.name} heap=${job.heapMiB} `
      + `customers=${job.tenantCount} run=${job.repetition} accepted=${result.accepted} `
      + `customersPerAlignedServiceGiB=${result.customersPerAlignedServiceGiB?.toFixed(2) ?? 'n/a'}\n`
    );
  }

  if (!selection.smoke && plan.soak?.enabled) {
    const configuredSoakArm = soakArmName(plan);
    const candidate = arms.find((arm) => arm.name === configuredSoakArm);
    if (!candidate) {
      throw new Error(`soak enabled but arm '${configuredSoakArm}' is not selected`);
    }
    results.push(await runOne(
      plan,
      fleet,
      candidate,
      plan.soak.heapMiB,
      plan.soak.tenantCount,
      plan.repetitions + 1,
      { ...plan.workload, durationSec: plan.soak.durationSec },
      {
        expectedMatrixRepetitions: plan.repetitions,
        runKind: 'soak',
        evidenceMode,
        campaignId,
        scheduleSha256,
        previousResultPayloadSha256,
        qualificationCohortSha256,
        runOrderSeed,
        runOrderIndex: schedule.length + 1,
        planSha256,
        fleetSha256,
        notBeforeEpochMs: Date.now(),
        claimPostgresRunIdentity
      },
      'soak'
    ));
    previousResultPayloadSha256 = results[results.length - 1]
      .evidenceBinding?.resultPayloadSha256 ?? null;
    if (!previousResultPayloadSha256) {
      throw new Error('persisted soak result is missing its evidence payload binding');
    }
  }
  writeJson(
    path.join(plan.artifactDir, `capacity-boundaries-${campaignId}.json`),
    {
      version: 1,
      runOrderSeed,
      planSha256,
      fleetSha256,
      campaignId,
      scheduleSha256,
      boundaries: summarizeCapacityBoundaries(results)
    }
  );
  return results;
};
