import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_RUN_ORDER_SEED,
  hasExactHostileValidationEvidence,
  resolveTemplate,
  soakArmName,
  tenantCountsForHeap
} from './config';
import {
  assertResultSemanticReplay,
  bindResultEvidence,
  readRegularEvidenceFile,
  RESULT_RAW_EVIDENCE_FILES,
  validateResultEvidenceBinding
} from './evidence';
import { postgresRunIdentityClaims } from './run-attestation';
import {
  buildRunSchedule,
  scheduleJobsForPlan,
  scheduleManifestSha256,
  type CampaignScheduleJob,
  type CampaignScheduleManifestV1
} from './schedule';
import { compareDensity, percentile, summarizeCapacityBoundaries } from './score';
import type { DensityPlanV1, DensityRunResult, FleetV1 } from './types';

const GIB = 1024 ** 3;

const SHA256 = /^[a-f0-9]{64}$/;

const sha256 = (value: string | Buffer): string => createHash('sha256')
  .update(value)
  .digest('hex');

export { bindResultEvidence, RESULT_RAW_EVIDENCE_FILES };

const RESULT_V6_REQUIRED_KEYS = `
schemaVersion runKind evidenceMode campaignId scheduleSha256 previousResultPayloadSha256
qualificationCohortSha256 arm commit
introspectionMode heapMiB configuredCustomers configuredTenants fleetShape
repetition expectedMatrixRepetitions runOrderSeed runOrderIndex startedAt endedAt
durationSec warmupMaxMs resolvedWarmupTimeoutMs offeredLoad requests
coverageRequests workloadRequests errors customerWorkloadRps periodicValidationRps realtimeValidationRps
combinedHttpRps achievedRps missedArrivals errorRate p50Ms p95Ms p99Ms
peakHeapBytes peakRssBytes observedHeapLimitBytes residentInstances
expectedResidentInstances cacheConfiguredMax cacheBudgetCapacity cacheInstanceHeapBytes
cacheCalibrationId cacheAdmissionMode warmObservedHeapDeltaPerInstanceBytes
postWarmupHeapGrowthMiBPerHour rawPostWarmupHeapGrowthMiBPerHour
retainedHeapGrowthMiBPerHour retainedExternalGrowthMiBPerHour
retainedMemoryDurationSec retainedHeapBaselineBytes retainedHeapFinalBytes
retainedExternalBaselineBytes retainedExternalFinalBytes retainedMemoryCheckpointErrors
postWarmupEvictions postWarmupBuildRefusals postWarmupBuilds pgPoolCacheSize
pgPoolLeasedPools pgPoolActiveLeases postWarmupPgPoolCapacityEvictions
postWarmupPgPoolCapacityRefusals postWarmupPgPoolDisposalFailures coldBuildMaxMs
memorySampleErrors postgresBaselineBytes postgresWarmBoundaryBytes postgresPeakBytes
postgresWorkingSetPeakBytes postgresCgroupV2PeakBytes postgresCgroupV2Samples
postgresOomEvents postgresBackendPeak residentPhysicalDatabases postgresContainerDedicated
unexpectedPostgresDatabases pgPoolTotalClients pgPoolIdleClients pgPoolWaitingClients
runtimePoolRequestedMaxUses runtimePoolEffectiveMaxUses runtimePoolExpectedPools
runtimePoolObservedPools runtimePoolTotalClients runtimePoolIdleClients
runtimePoolWaitingClients
residentRealtimeManagers residentRealtimeTransports realtimeNotificationMode
realtimeDeliveryCoverage notificationBrokers notificationListenerConnections
notificationBrokerLeases notificationBrokerTopics notificationBrokerSubscribers
notificationBrokerQueueOverflows notificationBrokerFatalFailures notificationAuditIdentities
notificationAuditsHealthy notificationAuditsFailed notificationAuditsStale
notificationAuditAttempts notificationAuditFailures notificationAuditActiveDatabaseTargets
notificationAuditDatabaseConflicts postgresColdBuildSpikeBytes postgresSampleErrors
alignedServicePeakBytes alignedServicePeakNodeRssBytes alignedServicePeakPostgresBytes
alignedServicePeakTimestamp alignedServiceMemorySamples alignedServiceMemoryMaxSkewMs
alignedServiceMemoryCoverageRatio alignedServiceMemoryCoveredDurationMs
alignedServiceMemoryExpectedDurationMs alignedServiceMemoryMaxGapMs
serviceMemoryUpperBoundBytes serviceMemoryUpperBoundPostgresSource capabilitiesExercised
missingCapabilities missingCanaries canarySchedule canaryChecks canaryInconclusive
bleedViolations operationOracleChecks operationOracleInconclusive operationOracleViolations
missingOperationOracles tenants qualifiedCustomers qualifiedTenants
tenantsPerConfiguredOldSpaceGiB tenantsPerPeakRssGiB customersPerAlignedServiceGiB
customersPerServiceMemoryUpperBoundGiB configuredCustomersPerAlignedServiceGiB
configuredCustomersPerServiceMemoryUpperBoundGiB accepted failures serverExit provenance
provenanceErrors postgresRunAttestation evidenceBinding artifactDir
`.trim().split(/\s+/);

export const readResults = (file: string): unknown[] => fs.readFileSync(file, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(
        `invalid result JSONL record ${index + 1}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

const finite = (value: unknown): value is number => typeof value === 'number'
  && Number.isFinite(value);

const closeEnough = (left: number, right: number): boolean =>
  Math.abs(left - right) <= Math.max(1e-9, Math.abs(right) * 1e-9);

export interface ResultMatrixValidation {
  complete: boolean;
  expectedCoordinates: number;
  observedCoordinates: number;
  missing: string[];
  duplicates: string[];
  diagnostic: string[];
  soakExpected: boolean;
  soakObserved: number;
  soakComplete: boolean;
}

const resultCoordinate = (result: Pick<
DensityRunResult,
'arm' | 'heapMiB' | 'configuredTenants' | 'repetition'
>): string => [
  result.arm,
  result.heapMiB,
  result.configuredTenants,
  result.repetition
].join('/');

const expectedMatrixCoordinates = (plan: DensityPlanV1): string[] => plan.arms.flatMap(
  (arm) => plan.heapMiB.flatMap((heapMiB) => tenantCountsForHeap(plan, heapMiB).flatMap(
    (configuredTenants) => Array.from({ length: plan.repetitions }, (_unused, index) => [
      arm.name,
      heapMiB,
      configuredTenants,
      index + 1
    ].join('/'))
  ))
);

interface CampaignEvidence {
  manifest: CampaignScheduleManifestV1;
  scheduleSha256: string;
  evidenceMode: 'qualification' | 'diagnostic';
  qualificationBlockers: string[];
}

const canonicalIsoTimestamp = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};

const requireCampaignJob = (value: unknown, label: string): CampaignScheduleJob => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const record = value as Record<string, unknown>;
  const expectedKeys = [
    'runKind',
    'arm',
    'heapMiB',
    'tenantCount',
    'repetition',
    'orderIndex'
  ];
  if (
    Object.keys(record).length !== expectedKeys.length
    || expectedKeys.some((key) => !Object.prototype.hasOwnProperty.call(record, key))
  ) {
    throw new Error(`${label} has an invalid shape`);
  }
  if (
    !['matrix', 'soak'].includes(String(record.runKind))
    || typeof record.arm !== 'string'
    || record.arm.length === 0
    || !Number.isSafeInteger(record.heapMiB)
    || (record.heapMiB as number) <= 0
    || !Number.isSafeInteger(record.tenantCount)
    || (record.tenantCount as number) <= 0
    || !Number.isSafeInteger(record.repetition)
    || (record.repetition as number) <= 0
    || !Number.isSafeInteger(record.orderIndex)
    || (record.orderIndex as number) <= 0
  ) {
    throw new Error(`${label} is invalid`);
  }
  return record as unknown as CampaignScheduleJob;
};

const readCampaignEvidence = (
  plan: DensityPlanV1,
  campaignId: string
): CampaignEvidence => {
  if (!SHA256.test(campaignId)) throw new Error('campaign identity is invalid');
  const root = fs.realpathSync(plan.artifactDir);
  const file = path.join(root, `campaign-${campaignId}.json`);
  const relative = path.relative(root, path.resolve(file));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('campaign manifest escaped the configured artifact root');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readRegularEvidenceFile(file).toString('utf8'));
  } catch (error) {
    throw new Error(
      `campaign manifest is unavailable or invalid: `
      + `${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('campaign manifest must be an object');
  }
  const record = raw as Record<string, unknown>;
  const expectedKeys = [
    'version',
    'campaignId',
    'campaignStartedAt',
    'runOrderSeed',
    'planSha256',
    'fleetSha256',
    'node',
    'v8',
    'platform',
    'architecture',
    'jobs',
    'scheduleSha256',
    'evidenceMode',
    'qualificationBlockers'
  ];
  if (
    Object.keys(record).length !== expectedKeys.length
    || expectedKeys.some((key) => !Object.prototype.hasOwnProperty.call(record, key))
  ) {
    throw new Error('campaign manifest has an invalid shape');
  }
  if (
    record.version !== 1
    || record.campaignId !== campaignId
    || !canonicalIsoTimestamp(record.campaignStartedAt)
    || typeof record.runOrderSeed !== 'string'
    || record.runOrderSeed.length === 0
    || typeof record.planSha256 !== 'string'
    || !SHA256.test(record.planSha256)
    || typeof record.fleetSha256 !== 'string'
    || !SHA256.test(record.fleetSha256)
    || typeof record.node !== 'string'
    || record.node.length === 0
    || typeof record.v8 !== 'string'
    || record.v8.length === 0
    || typeof record.platform !== 'string'
    || record.platform.length === 0
    || typeof record.architecture !== 'string'
    || record.architecture.length === 0
    || typeof record.scheduleSha256 !== 'string'
    || !SHA256.test(record.scheduleSha256)
    || !['qualification', 'diagnostic'].includes(String(record.evidenceMode))
    || !Array.isArray(record.qualificationBlockers)
    || record.qualificationBlockers.some((blocker) =>
      typeof blocker !== 'string' || blocker.length === 0)
    || new Set(record.qualificationBlockers).size !== record.qualificationBlockers.length
    || !Array.isArray(record.jobs)
    || record.jobs.length === 0
  ) {
    throw new Error('campaign manifest is invalid');
  }
  const jobs = record.jobs.map((job, index) =>
    requireCampaignJob(job, `campaign manifest job ${index + 1}`));
  if (jobs.some((job, index) => job.orderIndex !== index + 1)) {
    throw new Error('campaign manifest run order is not contiguous');
  }
  const manifest: CampaignScheduleManifestV1 = {
    version: 1,
    campaignId,
    campaignStartedAt: record.campaignStartedAt as string,
    runOrderSeed: record.runOrderSeed as string,
    planSha256: record.planSha256 as string,
    fleetSha256: record.fleetSha256 as string,
    node: record.node as string,
    v8: record.v8 as string,
    platform: record.platform as NodeJS.Platform,
    architecture: record.architecture as string,
    jobs
  };
  if (scheduleManifestSha256(manifest) !== record.scheduleSha256) {
    throw new Error('campaign manifest does not match its schedule SHA-256');
  }
  return {
    manifest,
    scheduleSha256: record.scheduleSha256,
    evidenceMode: record.evidenceMode as CampaignEvidence['evidenceMode'],
    qualificationBlockers: record.qualificationBlockers as string[]
  };
};

const exactHostileEvidenceAvailable = (plan: DensityPlanV1): boolean => {
  if (!hasExactHostileValidationEvidence(plan)) return false;
  return plan.arms.every((arm) => {
    const binding = plan.qualification!.hostileValidationEvidence![arm.name];
    if (!path.isAbsolute(binding.artifactFile)) return false;
    try {
      const bytes = readRegularEvidenceFile(binding.artifactFile);
      if (sha256(bytes) !== binding.artifactSha256) return false;
      const raw = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
      return raw.version === 1
        && raw.kind === binding.kind
        && raw.passed === true
        && raw.arm === arm.name
        && raw.runtimeArtifactFingerprint === binding.runtimeArtifactFingerprint
        && raw.configurationFingerprint === binding.configurationFingerprint;
    } catch {
      return false;
    }
  });
};

export const validateResultSet = (
  input: unknown[],
  plan: DensityPlanV1,
  fleet: FleetV1
): { results: DensityRunResult[]; matrix: ResultMatrixValidation } => {
  if (input.length === 0) throw new Error('result set contains no campaign records');
  const planSha256 = plan.sourceSha256 ?? sha256(JSON.stringify(plan));
  const fleetSha256 = fleet.sourceSha256 ?? sha256(JSON.stringify(fleet));
  const cohortSha256 = sha256(`${planSha256}\0${fleetSha256}`);
  const armByName = new Map(plan.arms.map((arm) => [arm.name, arm]));
  const expected = new Set(expectedMatrixCoordinates(plan));
  const firstRecord = input[0] && typeof input[0] === 'object' && !Array.isArray(input[0])
    ? input[0] as Record<string, unknown>
    : null;
  if (!firstRecord || typeof firstRecord.campaignId !== 'string') {
    throw new Error('result record 1 has no campaign identity');
  }
  const campaign = readCampaignEvidence(plan, firstRecord.campaignId);
  const canonicalMatrix = buildRunSchedule(
    plan,
    plan.arms,
    plan.heapMiB,
    plan.repetitions
  );
  const canonicalJobs = scheduleJobsForPlan(plan, canonicalMatrix, true);
  const canonicalQualificationSchedule = JSON.stringify(campaign.manifest.jobs)
    === JSON.stringify(canonicalJobs);
  const hostileEvidenceReady = exactHostileEvidenceAvailable(plan);
  if (
    campaign.manifest.planSha256 !== planSha256
    || campaign.manifest.fleetSha256 !== fleetSha256
    || campaign.manifest.runOrderSeed !== (plan.runOrderSeed ?? DEFAULT_RUN_ORDER_SEED)
  ) {
    throw new Error('campaign manifest does not match the plan/fleet cohort');
  }
  if (campaign.evidenceMode === 'qualification') {
    if (campaign.manifest.platform !== 'linux') {
      throw new Error('qualification campaign was not executed on Linux');
    }
    if (campaign.qualificationBlockers.length > 0) {
      throw new Error('qualification campaign contains prerequisite blockers');
    }
    if (!canonicalQualificationSchedule) {
      throw new Error('qualification campaign schedule is not the exact configured schedule');
    }
    if (!hostileEvidenceReady) {
      throw new Error(
        'qualification campaign lacks exact-runtime hostile validation evidence'
      );
    }
  }
  let previousResultPayloadSha256: string | null = null;
  let previousEndedAtMs = Date.parse(campaign.manifest.campaignStartedAt);
  const seen = new Map<string, number>();
  const diagnostic: string[] = [];
  let soakObserved = 0;
  const results = input.map((raw, index): DensityRunResult => {
    const label = `result record ${index + 1}`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`${label} must be an object`);
    }
    const rawRecord = raw as Record<string, unknown>;
    const missingKeys = RESULT_V6_REQUIRED_KEYS.filter((key) =>
      !Object.prototype.hasOwnProperty.call(rawRecord, key)
    );
    const unexpectedKeys = Object.keys(rawRecord).filter((key) =>
      !RESULT_V6_REQUIRED_KEYS.includes(key)
    );
    if (missingKeys.length > 0 || unexpectedKeys.length > 0) {
      throw new Error(
        `${label} does not match the complete result-v6 shape; `
        + `missing=${missingKeys.join(',') || 'none'}; `
        + `unexpected=${unexpectedKeys.join(',') || 'none'}`
      );
    }
    const result = raw as DensityRunResult;
    const arm = armByName.get(result.arm);
    const scheduled = campaign.manifest.jobs[index];
    if (result.schemaVersion !== 6) throw new Error(`${label} schemaVersion must be 6`);
    if (!scheduled) throw new Error(`${label} exceeds the campaign schedule`);
    if (
      result.campaignId !== campaign.manifest.campaignId
      || result.scheduleSha256 !== campaign.scheduleSha256
      || result.evidenceMode !== campaign.evidenceMode
      || result.previousResultPayloadSha256 !== previousResultPayloadSha256
      || result.runOrderIndex !== index + 1
      || scheduled.orderIndex !== result.runOrderIndex
      || scheduled.runKind !== result.runKind
      || scheduled.arm !== result.arm
      || scheduled.heapMiB !== result.heapMiB
      || scheduled.tenantCount !== result.configuredTenants
      || scheduled.repetition !== result.repetition
    ) {
      throw new Error(`${label} does not match the campaign schedule or result chain`);
    }
    if (
      !canonicalIsoTimestamp(result.startedAt)
      || !canonicalIsoTimestamp(result.endedAt)
      || Date.parse(result.startedAt) < previousEndedAtMs
      || Date.parse(result.endedAt) < Date.parse(result.startedAt)
    ) {
      throw new Error(`${label} campaign chronology is invalid or overlapping`);
    }
    if (typeof result.artifactDir !== 'string' || result.artifactDir.length === 0) {
      throw new Error(`${label} artifactDir is invalid`);
    }
    validateResultEvidenceBinding(result, label);
    previousResultPayloadSha256 = result.evidenceBinding!.resultPayloadSha256;
    previousEndedAtMs = Date.parse(result.endedAt);
    if (!arm) throw new Error(`${label} uses unconfigured arm '${String(result.arm)}'`);
    assertResultSemanticReplay(result, plan, fleet, label);
    if (!['matrix', 'soak'].includes(result.runKind)) throw new Error(`${label} runKind is invalid`);
    if (!['qualification', 'diagnostic'].includes(result.evidenceMode)) {
      throw new Error(`${label} evidenceMode is invalid`);
    }
    if (result.qualificationCohortSha256 !== cohortSha256) {
      throw new Error(`${label} qualification cohort does not match plan/fleet bytes`);
    }
    if (
      !Number.isSafeInteger(result.heapMiB)
      || !plan.heapMiB.includes(result.heapMiB)
      || !Number.isSafeInteger(result.configuredTenants)
      || result.configuredTenants <= 0
      || result.configuredTenants !== result.configuredCustomers
      || result.configuredTenants > fleet.tenants.length
      || !Number.isSafeInteger(result.repetition)
      || result.repetition <= 0
      || result.expectedMatrixRepetitions !== plan.repetitions
    ) {
      throw new Error(`${label} matrix coordinate is invalid`);
    }
    if (result.runKind === 'matrix') {
      if (!tenantCountsForHeap(plan, result.heapMiB).includes(result.configuredTenants)) {
        throw new Error(`${label} tenant count is not configured for heap ${result.heapMiB}`);
      }
      const coordinate = resultCoordinate(result);
      seen.set(coordinate, (seen.get(coordinate) ?? 0) + 1);
      if (result.evidenceMode !== 'qualification') diagnostic.push(coordinate);
    } else {
      const soak = plan.soak;
      if (!soak?.enabled) {
        throw new Error(`${label} contains soak evidence but plan.soak is not enabled`);
      }
      soakObserved++;
      const expectedSoakArm = soakArmName(plan);
      if (
        result.arm !== expectedSoakArm
        || result.heapMiB !== soak.heapMiB
        || result.configuredTenants !== soak.tenantCount
        || result.repetition !== plan.repetitions + 1
        || (
          result.evidenceMode === 'qualification'
          && result.runOrderIndex !== expected.size + 1
        )
      ) {
        throw new Error(`${label} does not match the configured soak coordinate`);
      }
      if (
        result.accepted
        && (
          !finite(result.durationSec)
          || result.durationSec < soak.durationSec * 0.99
          || result.durationSec > soak.durationSec * 1.01
        )
      ) {
        throw new Error(`${label} accepted soak duration does not match plan.soak.durationSec`);
      }
    }
    const provenance = result.provenance;
    if (
      !provenance
      || provenance.planSha256 !== planSha256
      || provenance.fleetSha256 !== fleetSha256
      || provenance.runOrderSeed !== (plan.runOrderSeed ?? DEFAULT_RUN_ORDER_SEED)
      || provenance.runOrderIndex !== result.runOrderIndex
      || provenance.worktreeDirty !== false
      || !provenance.gitHead
      || !provenance.gitStatusSha256
      || !provenance.entrySha256
      || !provenance.lockfileSha256
      || !provenance.node
      || !provenance.v8
      || provenance.node !== campaign.manifest.node
      || provenance.v8 !== campaign.manifest.v8
      || provenance.platform !== campaign.manifest.platform
      || provenance.architecture !== campaign.manifest.architecture
    ) {
      throw new Error(`${label} provenance is incomplete or does not match the plan/fleet cohort`);
    }
    if (
      (arm.commit && !provenance.gitHead.startsWith(arm.commit))
      || (arm.entrySha256 && provenance.entrySha256 !== arm.entrySha256)
      || (arm.lockfileSha256 && provenance.lockfileSha256 !== arm.lockfileSha256)
      || result.commit !== (arm.commit ?? null)
      || result.introspectionMode !== arm.introspectionMode
    ) {
      throw new Error(`${label} arm provenance does not match its configured arm`);
    }
    if (!Array.isArray(result.provenanceErrors) || result.provenanceErrors.length > 0) {
      throw new Error(`${label} contains provenance validation errors`);
    }
    if (
      typeof result.accepted !== 'boolean'
      || !Array.isArray(result.failures)
      || !Number.isSafeInteger(result.qualifiedCustomers)
      || result.qualifiedCustomers < 0
      || result.qualifiedCustomers > result.configuredTenants
      || result.qualifiedCustomers !== result.qualifiedTenants
      || result.accepted !== (result.failures.length === 0)
      || (result.accepted && (
        result.failures.length > 0 || result.qualifiedCustomers !== result.configuredTenants
      ))
      || (!result.accepted && result.qualifiedCustomers !== 0)
    ) {
      throw new Error(`${label} acceptance fields are internally inconsistent`);
    }
    const expectedOldSpaceDensity = result.qualifiedCustomers / (result.heapMiB / 1024);
    if (!finite(result.tenantsPerConfiguredOldSpaceGiB)
      || !closeEnough(result.tenantsPerConfiguredOldSpaceGiB, expectedOldSpaceDensity)) {
      throw new Error(`${label} configured-old-space density is inconsistent`);
    }
    const densityPairs: Array<[number | null, number | null]> = [
      [result.alignedServicePeakBytes, result.customersPerAlignedServiceGiB],
      [result.serviceMemoryUpperBoundBytes, result.customersPerServiceMemoryUpperBoundGiB],
      [result.peakRssBytes, result.tenantsPerPeakRssGiB]
    ];
    for (const [bytes, density] of densityPairs) {
      if (bytes == null) {
        if (density != null) throw new Error(`${label} density exists without its memory denominator`);
      } else if (
        !finite(bytes)
        || bytes <= 0
        || !finite(density)
        || !closeEnough(density, result.qualifiedCustomers / (bytes / GIB))
      ) {
        throw new Error(`${label} density does not match qualified customers and memory bytes`);
      }
    }
    const configuredDensityPairs: Array<[number | null, number | null]> = [
      [result.alignedServicePeakBytes, result.configuredCustomersPerAlignedServiceGiB],
      [
        result.serviceMemoryUpperBoundBytes,
        result.configuredCustomersPerServiceMemoryUpperBoundGiB
      ]
    ];
    for (const [bytes, density] of configuredDensityPairs) {
      if (bytes == null) {
        if (density != null) throw new Error(`${label} diagnostic density has no denominator`);
      } else if (
        !finite(bytes)
        || bytes <= 0
        || !finite(density)
        || !closeEnough(density, result.configuredCustomers / (bytes / GIB))
      ) {
        throw new Error(`${label} configured-customer diagnostic density is inconsistent`);
      }
    }
    if (
      result.requests !== result.workloadRequests
      || result.achievedRps !== result.customerWorkloadRps
      || !closeEnough(
        result.combinedHttpRps,
        result.customerWorkloadRps
          + result.periodicValidationRps
          + result.realtimeValidationRps
      )
      || !finite(result.errorRate)
      || !closeEnough(
        result.errorRate,
        result.requests > 0 ? result.errors / result.requests : 1
      )
    ) {
      throw new Error(`${label} workload counters or rates are internally inconsistent`);
    }
    const realtime = result.realtimeDeliveryCoverage;
    if (realtime != null) {
      const startedAtMs = Date.parse(realtime.workloadStartedAt);
      const deadlineAtMs = Date.parse(realtime.workloadDeadlineAt);
      const endedAtMs = realtime.workloadEndedAt == null
        ? NaN
        : Date.parse(realtime.workloadEndedAt);
      const expectedRoundsPerSurface = Math.max(
        0,
        Math.ceil((deadlineAtMs - startedAtMs) / realtime.deliveryIntervalMs) - 1
      );
      const aggregate = realtime.surfaces.reduce((summary, surface) => ({
        expected: summary.expected + surface.expectedRecurringRounds,
        started: summary.started + surface.startedRecurringRounds,
        verified: summary.verified + surface.verifiedRecurringRounds,
        primeRequests: summary.primeRequests + surface.primeRequests
      }), { expected: 0, started: 0, verified: 0, primeRequests: 0 });
      const complete = (
        Number.isFinite(endedAtMs)
        && endedAtMs >= deadlineAtMs
        && realtime.startedRecurringRounds === realtime.expectedRecurringRounds
        && realtime.verifiedRecurringRounds === realtime.expectedRecurringRounds
        && realtime.deadlineLateRecurringRounds === 0
        && realtime.surfaces.every((surface) =>
          surface.issuedCorrelationSha256 === surface.verifiedCorrelationSha256
        )
      );
      const surfaceKeys = realtime.surfaces.map((surface) =>
        `${surface.tenantId}\0${surface.surface}\0${surface.route}`
      );
      const expectedRealtimeSurfaceKeys = fleet.tenants
        .slice(0, result.configuredTenants)
        .flatMap((tenant) => tenant.surfaces
          .filter((surface) => surface.realtime != null)
          .map((surface) => {
            const url = resolveTemplate(surface.url, {
              port: arm.port,
              mode: arm.introspectionMode
            });
            return `${tenant.id}\0${surface.name}\0${new URL(url).pathname}`;
          }))
        .sort();
      if (
        realtime.version !== 2
        || !Number.isSafeInteger(realtime.deliveryIntervalMs)
        || realtime.deliveryIntervalMs <= 0
        || !Number.isSafeInteger(realtime.primeRequests)
        || realtime.primeRequests < 0
        || !finite(realtime.primeResponseP99Ms)
        || realtime.primeResponseP99Ms < 0
        || !finite(realtime.deliveryP99Ms)
        || realtime.deliveryP99Ms < 0
        || !Number.isFinite(startedAtMs)
        || !Number.isFinite(deadlineAtMs)
        || deadlineAtMs <= startedAtMs
        || !Array.isArray(realtime.surfaces)
        || new Set(surfaceKeys).size !== surfaceKeys.length
        || JSON.stringify([...surfaceKeys].sort())
          !== JSON.stringify(expectedRealtimeSurfaceKeys)
        || realtime.surfaces.some((surface) =>
          surface.expectedRecurringRounds !== expectedRoundsPerSurface
          || !Number.isSafeInteger(surface.startedRecurringRounds)
          || !Number.isSafeInteger(surface.verifiedRecurringRounds)
          || surface.startedRecurringRounds < surface.verifiedRecurringRounds
          || !Number.isSafeInteger(surface.primeRequests)
          || surface.primeRequests < 0
          || !finite(surface.primeResponseP99Ms)
          || surface.primeResponseP99Ms < 0
          || !finite(surface.deliveryP99Ms)
          || surface.deliveryP99Ms < 0
          || !/^[a-f0-9]{64}$/.test(surface.issuedCorrelationSha256)
          || !/^[a-f0-9]{64}$/.test(surface.verifiedCorrelationSha256)
        )
        || aggregate.expected !== realtime.expectedRecurringRounds
        || aggregate.started !== realtime.startedRecurringRounds
        || aggregate.verified !== realtime.verifiedRecurringRounds
        || aggregate.primeRequests !== realtime.primeRequests
        || !closeEnough(
          result.realtimeValidationRps,
          result.durationSec > 0 ? realtime.primeRequests / result.durationSec : 0
        )
        || realtime.complete !== complete
        || (result.accepted && !complete)
      ) {
        throw new Error(`${label} recurring realtime coverage is inconsistent`);
      }
    } else if (result.accepted) {
      throw new Error(`${label} accepted without recurring realtime coverage evidence`);
    }
    if (
      !Array.isArray(result.tenants)
      || (result.accepted && result.tenants.length !== result.configuredTenants)
      || (!result.accepted && ![0, result.configuredTenants].includes(result.tenants.length))
    ) {
      throw new Error(`${label} does not contain one scored result per configured customer`);
    }
    for (const tenant of result.tenants) {
      if (
        !Array.isArray(tenant.surfaces)
        || tenant.surfaces.length !== tenant.surfacesConfigured
        || (tenant.qualified && !tenant.surfaces.every((surface) => surface.qualified))
      ) {
        throw new Error(`${label} customer/surface qualification evidence is inconsistent`);
      }
    }
    if (plan.gates.requireFreshPostgresRunAttestation) {
      const attestation = result.postgresRunAttestation;
      if (
        !attestation
        || attestation.planSha256 !== `sha256:${planSha256}`
        || attestation.fleetSha256 !== `sha256:${fleetSha256}`
        || attestation.arm !== result.arm
        || attestation.heapMiB !== result.heapMiB
        || attestation.tenantCount !== result.configuredTenants
        || attestation.repetition !== result.repetition
        || attestation.runOrderIndex !== result.runOrderIndex
      ) {
        throw new Error(`${label} PostgreSQL attestation does not match its matrix coordinate`);
      }
    }
    return result;
  });
  const missing = [...expected].filter((coordinate) => !seen.has(coordinate)).sort();
  const duplicates = [...seen]
    .filter(([_coordinate, count]) => count !== 1)
    .map(([coordinate]) => coordinate)
    .sort();
  const soakExpected = plan.soak?.enabled === true;
  const soakResults = results.filter((result) => result.runKind === 'soak');
  const soakComplete = !soakExpected
    ? soakObserved === 0
    : soakObserved === 1
      && soakResults[0].evidenceMode === 'qualification'
      && soakResults[0].accepted;
  return {
    results,
    matrix: {
      complete: plan.qualification != null
        && missing.length === 0
        && duplicates.length === 0
        && diagnostic.length === 0
        && seen.size === expected.size
        && input.length === campaign.manifest.jobs.length
        && canonicalQualificationSchedule
        && campaign.evidenceMode === 'qualification'
        && campaign.manifest.platform === 'linux'
        && campaign.qualificationBlockers.length === 0
        && hostileEvidenceReady
        && soakComplete,
      expectedCoordinates: expected.size,
      observedCoordinates: seen.size,
      missing,
      duplicates,
      diagnostic: diagnostic.sort(),
      soakExpected,
      soakObserved,
      soakComplete
    }
  };
};

const formatNumber = (value: number | null, digits = 2): string => value == null
  ? 'n/a'
  : Number.isFinite(value) ? value.toFixed(digits) : String(value);

const medianNullable = (values: Array<number | null>): number | null => {
  const available = values.filter((value): value is number => value != null);
  return available.length > 0 ? percentile(available, 0.5) : null;
};

const toMiB = (value: number | null): number | null => value == null
  ? null
  : value / 1024 ** 2;

export const rejectDuplicatePostgresRunEpochs = (
  input: DensityRunResult[]
): DensityRunResult[] => {
  const counts = new Map<string, number>();
  for (const run of input) {
    const evidence = run.postgresRunAttestation;
    if (!evidence) continue;
    for (const claim of postgresRunIdentityClaims(evidence)) {
      counts.set(claim, (counts.get(claim) ?? 0) + 1);
    }
  }
  const duplicates = new Set([...counts]
    .filter(([_claim, count]) => count > 1)
    .map(([claim]) => claim));
  return input.map((run) => {
    const evidence = run.postgresRunAttestation;
    if (!evidence) return run;
    const reused = postgresRunIdentityClaims(evidence)
      .filter((claim) => duplicates.has(claim));
    if (reused.length === 0) return run;
    const failure = `PostgreSQL container/clone identities reused across matrix: ${reused.join(', ')}`;
    return {
      ...run,
      accepted: false,
      qualifiedCustomers: 0,
      qualifiedTenants: 0,
      tenantsPerConfiguredOldSpaceGiB: 0,
      tenantsPerPeakRssGiB: 0,
      customersPerAlignedServiceGiB: 0,
      customersPerServiceMemoryUpperBoundGiB: 0,
      failures: run.failures.includes(failure)
        ? run.failures
        : [...run.failures, failure]
    };
  });
};

export const renderReport = (
  inputResults: unknown[],
  plan: DensityPlanV1,
  fleet: FleetV1
): string => {
  const validated = validateResultSet(inputResults, plan, fleet);
  const results = rejectDuplicatePostgresRunEpochs(validated.results);
  const matrixResults = results.filter((result) => result.runKind === 'matrix');
  const soakResults = results.filter((result) => result.runKind === 'soak');
  const soakComplete = !validated.matrix.soakExpected
    ? soakResults.length === 0
    : soakResults.length === 1
      && soakResults[0].evidenceMode === 'qualification'
      && soakResults[0].accepted;
  const qualificationEvidenceComplete = validated.matrix.complete && soakComplete;
  const gates = plan.gates;
  const groups = new Map<string, DensityRunResult[]>();
  for (const result of matrixResults) {
    const key = `${result.arm}|${result.heapMiB}|${result.configuredTenants}`;
    const group = groups.get(key) ?? [];
    group.push(result);
    groups.set(key, group);
  }
  const lines = [
    '# Graphile customer-density results',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Evidence mode: **${qualificationEvidenceComplete ? 'qualification' : 'diagnostic'}**. Full configured matrix: ${validated.matrix.observedCoordinates}/${validated.matrix.expectedCoordinates} coordinates; missing=${validated.matrix.missing.length}; duplicates=${validated.matrix.duplicates.length}; diagnostic-only=${validated.matrix.diagnostic.length}; configured soak=${validated.matrix.soakExpected ? `${validated.matrix.soakObserved}/1, accepted=${soakComplete ? 'yes' : 'no'}` : 'disabled'}.`,
    '',
    'A customer counts only when every declared GraphQL surface and realtime transport stays resident and serves the full qualification workload, all isolation canaries are conclusive, bleed is zero, error rate and p99 meet their gates, required capabilities ran, PostgreSQL telemetry completed, and post-warmup Graphile and PostgreSQL pool eviction/refusal/build/disposal counters remain unchanged. The primary memory denominator is the maximum post-warmup time-aligned sum of current Node RSS and raw PostgreSQL cgroup-v2 memory charge when available; the all-phase high-water upper bound, Docker working set, configured V8, and Node-only RSS remain diagnostics.',
    '',
    'Qualifying physical-database runs use a full live DDL/ACL audit before the Graphile timer starts. That audit intentionally warms PostgreSQL catalogs, so the build column is post-attestation warm-catalog latency, not a pristine-catalog cold-build claim. Every arm receives the same audit, and reused container/clone epochs are rejected across the complete result set.',
    '',
    '| Arm | Old-space MiB | Customers | Physical DBs | Dedicated PG | Runs | Accepted | Warm observed heap delta MiB/instance | Post-attestation build ms | PG baseline MiB | PG warm-boundary MiB | PG spike MiB | PG raw peak MiB | PG working-set peak MiB | Node peak RSS MiB | Aligned Node+PG peak MiB | Conservative service upper bound MiB | Offered RPS | Customer workload RPS | Periodic validation RPS | Realtime validation RPS | Combined HTTP RPS | workload p99 ms | PG pools | PG active leases | PG backends | Pool clients | Realtime managers | Realtime transports | Qualified customers/aligned service GiB | Qualified customers/service upper-bound GiB | Configured customers/aligned service GiB (diagnostic) | Configured customers/service upper-bound GiB (diagnostic) | Customers/configured old-space GiB | Customers/Node peak RSS GiB |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  ];
  for (const group of [...groups.values()].sort((a, b) => {
    const left = `${a[0].arm}:${a[0].heapMiB}:${a[0].configuredTenants}`;
    const right = `${b[0].arm}:${b[0].heapMiB}:${b[0].configuredTenants}`;
    return left.localeCompare(right);
  })) {
    const first = group[0];
    lines.push([
      `| ${first.arm}`,
      first.heapMiB,
      first.configuredTenants,
      formatNumber(medianNullable(group.map(
        (run) => run.residentPhysicalDatabases ?? null
      )), 0),
      group.every((run) => run.postgresContainerDedicated === true) ? 'yes' : 'no',
      group.length,
      group.filter((run) => run.accepted).length,
      formatNumber(toMiB(medianNullable(group.map(
        (run) => run.warmObservedHeapDeltaPerInstanceBytes
      ))), 1),
      formatNumber(medianNullable(group.map((run) => run.coldBuildMaxMs)), 1),
      formatNumber(toMiB(medianNullable(group.map((run) => run.postgresBaselineBytes))), 1),
      formatNumber(toMiB(medianNullable(group.map(
        (run) => run.postgresWarmBoundaryBytes
      ))), 1),
      formatNumber(toMiB(medianNullable(group.map((run) => run.postgresColdBuildSpikeBytes))), 1),
      formatNumber(toMiB(medianNullable(group.map((run) => run.postgresPeakBytes))), 1),
      formatNumber(toMiB(medianNullable(group.map(
        (run) => run.postgresWorkingSetPeakBytes ?? null
      ))), 1),
      formatNumber(toMiB(medianNullable(group.map((run) => run.peakRssBytes))), 1),
      formatNumber(toMiB(medianNullable(group.map((run) => run.alignedServicePeakBytes))), 1),
      formatNumber(toMiB(medianNullable(group.map((run) => run.serviceMemoryUpperBoundBytes))), 1),
      formatNumber(percentile(group.map((run) => run.offeredLoad.totalRps), 0.5), 1),
      formatNumber(percentile(group.map(
        (run) => run.customerWorkloadRps ?? run.achievedRps
      ), 0.5), 1),
      formatNumber(percentile(group.map(
        (run) => run.periodicValidationRps ?? 0
      ), 0.5), 1),
      formatNumber(percentile(group.map(
        (run) => run.realtimeValidationRps ?? 0
      ), 0.5), 1),
      formatNumber(percentile(group.map((run) =>
        run.combinedHttpRps
          ?? (run.customerWorkloadRps ?? run.achievedRps)
            + (run.periodicValidationRps ?? 0)
            + (run.realtimeValidationRps ?? 0)
      ), 0.5), 1),
      formatNumber(percentile(group.map((run) => run.p99Ms), 0.5), 1),
      formatNumber(medianNullable(group.map((run) => run.pgPoolCacheSize)), 0),
      formatNumber(medianNullable(group.map((run) => run.pgPoolActiveLeases)), 0),
      formatNumber(medianNullable(group.map((run) => run.postgresBackendPeak ?? null)), 0),
      formatNumber(medianNullable(group.map((run) => run.pgPoolTotalClients ?? null)), 0),
      formatNumber(medianNullable(group.map((run) => run.residentRealtimeManagers ?? null)), 0),
      formatNumber(medianNullable(group.map((run) => run.residentRealtimeTransports ?? null)), 0),
      formatNumber(medianNullable(group.map((run) => run.customersPerAlignedServiceGiB))),
      formatNumber(medianNullable(group.map(
        (run) => run.customersPerServiceMemoryUpperBoundGiB
      ))),
      formatNumber(medianNullable(group.map(
        (run) => run.configuredCustomersPerAlignedServiceGiB
      ))),
      formatNumber(medianNullable(group.map(
        (run) => run.configuredCustomersPerServiceMemoryUpperBoundGiB
      ))),
      formatNumber(percentile(group.map(
        (run) => run.tenantsPerConfiguredOldSpaceGiB
      ), 0.5)),
      `${formatNumber(medianNullable(group.map((run) => run.tenantsPerPeakRssGiB)))} |`
    ].join(' | '));
  }

  const boundaries = summarizeCapacityBoundaries(matrixResults);
  lines.push(
    '',
    '## Capacity boundaries',
    '',
    '| Arm | Old-space MiB | Highest all-repetitions customer pass | Lowest greater fail | Monotonic | Boundary reached | Incomplete counts | Customers/aligned service GiB | Customers/service upper-bound GiB | Customers/configured old-space GiB | Customers/Node peak RSS GiB |',
    '|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|',
    ...boundaries.map((boundary) => [
      `| ${boundary.arm}`,
      boundary.heapMiB,
      boundary.highestAllRepetitionsPass ?? 'n/a',
      boundary.lowestGreaterFail ?? 'n/a',
      boundary.monotonicQualification ? 'yes' : 'no',
      boundary.capacityBoundaryReached ? 'yes' : 'no',
      boundary.incompleteTenantCounts.join(',') || 'none',
      formatNumber(boundary.medianCustomersPerAlignedServiceGiB),
      formatNumber(boundary.medianCustomersPerServiceMemoryUpperBoundGiB),
      formatNumber(boundary.medianTenantsPerConfiguredOldSpaceGiB),
      `${formatNumber(boundary.medianTenantsPerPeakRssGiB)} |`
    ].join(' | ')),
    '',
    '## Candidate decisions',
    '',
  );
  const baselineArm = plan.qualification?.baselineArm ?? plan.arms[0]?.name;
  const baseline = matrixResults.filter((result) => result.arm === baselineArm);
  const candidateArms = plan.arms
    .map((arm) => arm.name)
    .filter((arm) =>
      arm !== baselineArm && matrixResults.some((result) => result.arm === arm)
    );
  if (!plan.qualification) {
    lines.push('This plan is diagnostic-only; it has no qualification contract.', '');
  } else if (candidateArms.length === 0) {
    lines.push('No configured candidate arms were executed.', '');
  } else {
    for (const candidateArm of candidateArms) {
      const candidate = matrixResults.filter((result) => result.arm === candidateArm);
      const comparison = compareDensity(baseline, candidate, gates);
      const materiallyBetter = qualificationEvidenceComplete && comparison.materiallyBetter;
      lines.push(
        `### ${candidateArm} vs ${baselineArm}`,
        '',
        `Materially better: **${materiallyBetter ? 'yes' : 'no'}**. Median aligned Node+PostgreSQL density improvement: ${formatNumber(comparison.alignedServiceMedianImprovement * 100, 1)}%; conservative service upper-bound density improvement: ${formatNumber(comparison.serviceMemoryUpperBoundMedianImprovement * 100, 1)}%; both actual service-memory measures avoid per-heap regression: ${comparison.alignedServiceNonRegression && comparison.serviceMemoryUpperBoundNonRegression ? 'yes' : 'no'}; configured-old-space diagnostic improvement: ${formatNumber(comparison.configuredOldSpaceMedianImprovement * 100, 1)}%; Node-only peak-RSS diagnostic improvement: ${formatNumber(comparison.peakRssMedianImprovement * 100, 1)}%; every paired heap adds the required customer count: ${comparison.everyHeapAddsTenants ? 'yes' : 'no'}; capacity boundaries are complete: ${comparison.capacityBoundariesComplete ? 'yes' : 'no'}; matrices are exactly paired: ${comparison.pairedMatrixComplete ? 'yes' : 'no'}; full configured qualification evidence, including soak when enabled, is present: ${qualificationEvidenceComplete ? 'yes' : 'no'}.`,
        ''
      );
    }
  }
  lines.push(
    'Failed and incomplete runs remain in the denominator. Missing arms, heaps, tenant counts, repetitions, short smoke workloads, unavailable memory telemetry, and inconclusive canaries are not treated as passing evidence.',
    '',
    '## Soak runs',
    '',
    'Soak records validate the selected maximum-density candidate over time; they are excluded from every matrix median, capacity boundary, and candidate comparison above.',
    '',
    '| Arm | Old-space MiB | Customers | Duration sec | Accepted | workload p99 ms | Aligned Node+PG peak MiB | Customers/aligned service GiB | Heap growth MiB/hour |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|'
  );
  if (soakResults.length === 0) {
    lines.push('| none | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |');
  } else {
    for (const result of soakResults) {
      lines.push([
        `| ${result.arm}`,
        result.heapMiB,
        result.configuredTenants,
        formatNumber(result.durationSec, 0),
        result.accepted ? 'yes' : 'no',
        formatNumber(result.p99Ms, 1),
        formatNumber(toMiB(result.alignedServicePeakBytes), 1),
        formatNumber(result.customersPerAlignedServiceGiB),
        `${formatNumber(result.retainedHeapGrowthMiBPerHour)} |`
      ].join(' | '));
    }
  }
  lines.push(
    '',
    '## Run failures',
    ''
  );
  const failed = results.filter((result) => !result.accepted);
  if (failed.length === 0) lines.push('None.');
  else for (const result of failed) {
    lines.push(`- ${result.arm} h${result.heapMiB} t${result.configuredTenants} r${result.repetition}: ${result.failures.join('; ')}`);
  }
  return `${lines.join('\n')}\n`;
};

export const writeReport = (
  resultsFile: string,
  outputFile: string,
  plan: DensityPlanV1,
  fleet: FleetV1
): void => {
  const report = renderReport(readResults(resultsFile), plan, fleet);
  fs.mkdirSync(path.dirname(path.resolve(outputFile)), { recursive: true });
  fs.writeFileSync(path.resolve(outputFile), report, 'utf8');
};
