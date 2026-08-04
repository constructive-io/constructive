import { createHash } from 'node:crypto';

import { periodicCanaryRoundCount, rotatingCanaryIndex } from './http';
import type {
  AcceptanceGates,
  ArmProvenance,
  CanaryResult,
  CanaryScheduleSummary,
  CustomerFleetShape,
  DensityCapacityBoundary,
  DensityRunResult,
  MemorySnapshot,
  NodeRssSnapshot,
  PeriodicCanarySchedule,
  PostgresMemorySnapshot,
  PostgresRunAttestationEvidence,
  RequestSample,
  RealtimeDeliveryCoverage,
  ResolvedOfferedLoad,
  RetainedMemoryCheckpoint,
  RetainedMemoryCheckpointPair,
  RetainedMemoryGuard,
  SurfaceResult,
  TenantResult,
  TenantTarget
} from './types';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const DEFAULT_MEMORY_ALIGNMENT_SKEW_MS = 500;
export const DEFAULT_MAX_ALIGNED_MEMORY_SAMPLE_GAP_MS = 1_000;
export const DEFAULT_MIN_ALIGNED_MEMORY_COVERAGE_RATIO = 0.99;

export interface AlignedServiceMemoryPeak {
  bytes: number;
  nodeRssBytes: number;
  postgresBytes: number;
  timestamp: string;
  samples: number;
  maxSkewMs: number;
}

interface AlignedServiceMemorySample {
  bytes: number;
  nodeRssBytes: number;
  postgresBytes: number;
  timestamp: string;
  timeMs: number;
  skewMs: number;
}

export interface AlignedServiceMemoryCoverage {
  expectedDurationMs: number;
  coveredDurationMs: number;
  coverageRatio: number;
  maxGapMs: number;
  maxPairedSampleGapMs: number;
  maxNodeSampleGapMs: number;
  maxPostgresSampleGapMs: number;
  firstSampleTimestamp: string | null;
  lastSampleTimestamp: string | null;
}

const alignedServiceMemorySamples = (
  memorySnapshots: Array<Pick<MemorySnapshot, 'timestamp' | 'rssBytes'>>,
  postgresSnapshots: PostgresMemorySnapshot[],
  allowedSkewMs: number
): AlignedServiceMemorySample[] => {
  const postgres = postgresSnapshots
    .map((snapshot) => ({ snapshot, timeMs: Date.parse(snapshot.timestamp) }))
    .filter(({ snapshot, timeMs }) =>
      Number.isFinite(timeMs)
      && Number.isFinite(snapshot.usedBytes)
      && snapshot.usedBytes >= 0
    )
    .sort((left, right) => left.timeMs - right.timeMs);
  if (postgres.length === 0) return [];

  let postgresIndex = 0;
  const samples: AlignedServiceMemorySample[] = [];
  const node = memorySnapshots
    .map((snapshot) => ({ snapshot, timeMs: Date.parse(snapshot.timestamp) }))
    .filter(({ snapshot, timeMs }) =>
      Number.isFinite(timeMs)
      && snapshot.rssBytes != null
      && Number.isFinite(snapshot.rssBytes)
      && snapshot.rssBytes > 0
    )
    .sort((left, right) => left.timeMs - right.timeMs);

  for (const { snapshot, timeMs } of node) {
    while (
      postgresIndex + 1 < postgres.length
      && Math.abs(postgres[postgresIndex + 1].timeMs - timeMs)
        <= Math.abs(postgres[postgresIndex].timeMs - timeMs)
    ) postgresIndex += 1;
    const candidate = postgres[postgresIndex];
    const skewMs = Math.abs(candidate.timeMs - timeMs);
    if (skewMs > allowedSkewMs) continue;
    samples.push({
      bytes: snapshot.rssBytes! + candidate.snapshot.usedBytes,
      nodeRssBytes: snapshot.rssBytes!,
      postgresBytes: candidate.snapshot.usedBytes,
      timestamp: snapshot.timestamp,
      timeMs,
      skewMs
    });
  }
  return samples;
};

export const alignedServiceMemoryCoverage = (
  memorySnapshots: Array<Pick<MemorySnapshot, 'timestamp' | 'rssBytes'>>,
  postgresSnapshots: PostgresMemorySnapshot[],
  expectedStartMs: number,
  expectedDurationMs: number,
  allowedSkewMs = DEFAULT_MEMORY_ALIGNMENT_SKEW_MS
): AlignedServiceMemoryCoverage | null => {
  if (!Number.isFinite(allowedSkewMs) || allowedSkewMs < 0) {
    throw new Error(`memory alignment skew must be non-negative, received ${allowedSkewMs}`);
  }
  if (!Number.isFinite(expectedStartMs) || !Number.isFinite(expectedDurationMs)
    || expectedDurationMs <= 0) return null;
  const expectedEndMs = expectedStartMs + expectedDurationMs;
  const samples = alignedServiceMemorySamples(
    memorySnapshots,
    postgresSnapshots,
    allowedSkewMs
  ).filter((sample) =>
    sample.timeMs >= expectedStartMs - allowedSkewMs
    && sample.timeMs <= expectedEndMs + allowedSkewMs
  );
  if (samples.length === 0) return null;
  const first = samples[0];
  const last = samples.at(-1)!;
  const coveredStartMs = Math.max(expectedStartMs, first.timeMs);
  const coveredEndMs = Math.min(expectedEndMs, last.timeMs);
  const coveredDurationMs = Math.max(0, coveredEndMs - coveredStartMs);
  const cadenceGap = (timestamps: number[]): number => {
    const times = [...new Set(timestamps
      .filter((timeMs) =>
        Number.isFinite(timeMs)
        && timeMs >= expectedStartMs - allowedSkewMs
        && timeMs <= expectedEndMs + allowedSkewMs
      )
      .map((timeMs) => Math.max(expectedStartMs, Math.min(expectedEndMs, timeMs))))]
      .sort((left, right) => left - right);
    if (times.length === 0) return expectedDurationMs;
    let gap = Math.max(times[0] - expectedStartMs, expectedEndMs - times.at(-1)!);
    for (let index = 1; index < times.length; index += 1) {
      gap = Math.max(gap, times[index] - times[index - 1]);
    }
    return gap;
  };
  const maxPairedSampleGapMs = cadenceGap(samples.map((sample) => sample.timeMs));
  const maxNodeSampleGapMs = cadenceGap(memorySnapshots
    .filter((snapshot) => Number.isFinite(snapshot.rssBytes) && snapshot.rssBytes! > 0)
    .map((snapshot) => Date.parse(snapshot.timestamp)));
  const maxPostgresSampleGapMs = cadenceGap(postgresSnapshots
    .filter((snapshot) => Number.isFinite(snapshot.usedBytes) && snapshot.usedBytes >= 0)
    .map((snapshot) => Date.parse(snapshot.timestamp)));
  return {
    expectedDurationMs,
    coveredDurationMs,
    coverageRatio: coveredDurationMs / expectedDurationMs,
    maxGapMs: Math.max(
      maxPairedSampleGapMs,
      maxNodeSampleGapMs,
      maxPostgresSampleGapMs
    ),
    maxPairedSampleGapMs,
    maxNodeSampleGapMs,
    maxPostgresSampleGapMs,
    firstSampleTimestamp: first.timestamp,
    lastSampleTimestamp: last.timestamp
  };
};

/**
 * Pair each current Node RSS sample with the nearest PostgreSQL cgroup sample.
 * Cumulative process HWM is deliberately excluded because adding a historical
 * Node peak to current PostgreSQL usage would not be a simultaneous service
 * footprint.
 */
export const alignedServiceMemoryPeak = (
  memorySnapshots: Array<Pick<MemorySnapshot, 'timestamp' | 'rssBytes'>>,
  postgresSnapshots: PostgresMemorySnapshot[],
  allowedSkewMs = DEFAULT_MEMORY_ALIGNMENT_SKEW_MS
): AlignedServiceMemoryPeak | null => {
  if (!Number.isFinite(allowedSkewMs) || allowedSkewMs < 0) {
    throw new Error(`memory alignment skew must be non-negative, received ${allowedSkewMs}`);
  }
  const aligned = alignedServiceMemorySamples(
    memorySnapshots,
    postgresSnapshots,
    allowedSkewMs
  );
  if (aligned.length === 0) return null;
  let peak: Omit<AlignedServiceMemoryPeak, 'samples' | 'maxSkewMs'> | null = null;
  for (const sample of aligned) {
    if (!peak || sample.bytes > peak.bytes) {
      peak = {
        bytes: sample.bytes,
        nodeRssBytes: sample.nodeRssBytes,
        postgresBytes: sample.postgresBytes,
        timestamp: sample.timestamp
      };
    }
  }
  return peak ? {
    ...peak,
    samples: aligned.length,
    maxSkewMs: Math.max(...aligned.map((sample) => sample.skewMs))
  } : null;
};

export const percentile = (values: number[], fraction: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
};

export const summarizeCustomerFleet = (
  customers: TenantTarget[]
): CustomerFleetShape => {
  const physicalDatabases = new Set<string>();
  const routingLabels = new Set<string>();
  const buildContracts = new Set<string>();
  const runtimePoolIdentities = new Set<string>();
  let logicalDatabases = 0;
  let apis = 0;
  let realtimeApis = 0;
  let surfaces = 0;
  let physicalSchemaBindings = 0;
  for (const customer of customers) {
    surfaces += customer.surfaces.length;
    for (const surface of customer.surfaces) buildContracts.add(surface.buildContract);
    for (const database of customer.databases ?? []) {
      logicalDatabases += 1;
      physicalDatabases.add(database.physicalDatabase);
      for (const api of database.apis) {
        apis += 1;
        if (api.realtime) realtimeApis += 1;
        physicalSchemaBindings += api.physicalSchemas.length;
        for (const label of api.routingLabels) routingLabels.add(label);
        runtimePoolIdentities.add(api.runtimePoolIdentity);
      }
    }
  }
  return {
    topologyComplete: customers.every((customer) => customer.databases != null),
    customers: customers.length,
    logicalDatabases,
    physicalDatabases: physicalDatabases.size,
    apis,
    realtimeApis,
    surfaces,
    physicalSchemaBindings,
    routingLabels: routingLabels.size,
    uniqueBuildContracts: buildContracts.size,
    uniqueRuntimePoolIdentities: runtimePoolIdentities.size
  };
};

const counterDelta = (
  snapshots: MemorySnapshot[],
  field: 'evictions' | 'buildRefusals' | 'buildsStarted'
): number | null => {
  if (snapshots.length < 2) return null;
  const available = field === 'buildsStarted'
    ? snapshots.every((snapshot) => snapshot.buildCountersAvailable)
    : snapshots.every((snapshot) => snapshot.cacheCountersAvailable);
  if (!available) return null;
  const values = snapshots.map((snapshot) => snapshot[field]);
  if (values.some((value) => !Number.isSafeInteger(value) || value! < 0)) return null;
  if (values.some((value, index) => index > 0 && value! < values[index - 1]!)) {
    return null;
  }
  return values.at(-1)! - values[0]!;
};

type PgPoolCounterField =
  | 'pgPoolCapacityEvictions'
  | 'pgPoolCapacityRefusals'
  | 'pgPoolDisposalFailures';

const pgPoolCounterDelta = (
  snapshots: MemorySnapshot[],
  field: PgPoolCounterField
): number | null => {
  if (snapshots.length < 2) return null;
  const values = snapshots.map((snapshot) => snapshot[field]);
  if (values.some((value) => !Number.isSafeInteger(value) || value! < 0)) return null;
  if (values.some((value, index) => index > 0 && value! < values[index - 1]!)) {
    return null;
  }
  return values.at(-1)! - values[0]!;
};

export const heapGrowthMiBPerHour = (snapshots: MemorySnapshot[]): number | null => {
  if (snapshots.length < 2 || snapshots.some((snapshot) => snapshot.heapUsedBytes == null)) {
    return null;
  }
  const points = snapshots.map((snapshot) => ({
    x: new Date(snapshot.timestamp).getTime() / 3_600_000,
    y: snapshot.heapUsedBytes! / MIB
  }));
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const numerator = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  return denominator === 0 ? null : numerator / denominator;
};

export interface RetainedMemoryGrowthSummary {
  heapMiBPerHour: number | null;
  externalMiBPerHour: number | null;
  durationSec: number | null;
  heapBaselineBytes: number | null;
  heapFinalBytes: number | null;
  externalBaselineBytes: number | null;
  externalFinalBytes: number | null;
  errors: string[];
}

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(record[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value);
};

const stateSha256 = (value: unknown): string =>
  `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;

const asRecord = (value: unknown): Record<string, unknown> | null => value
  && typeof value === 'object'
  && !Array.isArray(value)
  ? value as Record<string, unknown>
  : null;

const lifecycleCounter = (
  counters: Record<string, unknown>,
  name: string
): number | null => Number.isSafeInteger(counters[name])
  && (counters[name] as number) >= 0
  ? counters[name] as number
  : null;

/**
 * The physical fixture hashes its complete residency and monotonic counter
 * state. A single GC checkpoint must remain byte-identical, but normal HTTP
 * traffic advances its started/completed counters between the two bookends.
 * Permit only a balanced monotonic HTTP delta; every other field remains an
 * exact topology/counter comparison. WebSocket lifecycle changes are rejected
 * because qualifying transports must remain continuously resident.
 */
const validateCrossWorkloadGuardState = (
  baseline: RetainedMemoryGuard,
  final: RetainedMemoryGuard,
  errors: string[]
): void => {
  const baselineState = asRecord(baseline.state);
  const finalState = asRecord(final.state);
  if (!baselineState || !finalState) {
    errors.push('retained-memory workload guard state is invalid');
    return;
  }
  const baselineCounters = asRecord(baselineState.cacheCounters);
  const finalCounters = asRecord(finalState.cacheCounters);
  // Legacy/non-physical checkpoint producers do not expose handler lifecycle
  // counters, so retain their former exact-state requirement.
  if (!baselineCounters && !finalCounters) {
    if (baseline.stateSha256 !== final.stateSha256) {
      errors.push('retained-memory residency or counters changed across the workload');
    }
    return;
  }
  if (!baselineCounters || !finalCounters) {
    errors.push('retained-memory handler counters changed shape across the workload');
    return;
  }
  const names = [
    'httpRequestsStarted',
    'httpRequestsCompleted',
    'websocketUpgradesStarted',
    'websocketUpgradesCompleted'
  ] as const;
  const before = Object.fromEntries(names.map((name) => [
    name,
    lifecycleCounter(baselineCounters, name)
  ])) as Record<(typeof names)[number], number | null>;
  const after = Object.fromEntries(names.map((name) => [
    name,
    lifecycleCounter(finalCounters, name)
  ])) as Record<(typeof names)[number], number | null>;
  if (names.some((name) => before[name] == null || after[name] == null)) {
    errors.push('retained-memory handler counters are invalid');
    return;
  }
  const delta = Object.fromEntries(names.map((name) => [
    name,
    after[name]! - before[name]!
  ])) as Record<(typeof names)[number], number>;
  if (names.some((name) => delta[name] < 0)) {
    errors.push('retained-memory handler counters regressed across the workload');
  }
  if (delta.httpRequestsStarted !== delta.httpRequestsCompleted) {
    errors.push(
      `retained-memory HTTP handler delta is unbalanced: started=${delta.httpRequestsStarted}, completed=${delta.httpRequestsCompleted}`
    );
  }
  if (delta.websocketUpgradesStarted !== 0 || delta.websocketUpgradesCompleted !== 0) {
    errors.push(
      `retained-memory WebSocket lifecycle changed across the workload: started=${delta.websocketUpgradesStarted}, completed=${delta.websocketUpgradesCompleted}`
    );
  }
  const withoutHttpLifecycle = (
    state: Record<string, unknown>
  ): Record<string, unknown> => {
    const counters = { ...asRecord(state.cacheCounters) };
    delete counters.httpRequestsStarted;
    delete counters.httpRequestsCompleted;
    return { ...state, cacheCounters: counters };
  };
  if (
    stateSha256(withoutHttpLifecycle(baselineState))
      !== stateSha256(withoutHttpLifecycle(finalState))
  ) {
    errors.push('retained-memory residency or non-HTTP counters changed across the workload');
  }
};

const stableTail = (checkpoint: RetainedMemoryCheckpoint) =>
  checkpoint.samples.slice(-checkpoint.stableSampleCount);

const medianNumber = (values: number[]): number => percentile(values, 0.5);

const validateCheckpoint = (
  label: string,
  checkpoint: RetainedMemoryCheckpoint | null,
  expectedPid: number | null,
  errors: string[]
): checkpoint is RetainedMemoryCheckpoint => {
  if (!checkpoint) {
    errors.push(`${label} retained-memory checkpoint is unavailable`);
    return false;
  }
  let structurallyUsable = true;
  if (!checkpoint.stable) errors.push(`${label} retained-memory checkpoint is unstable`);
  errors.push(...checkpoint.errors.map((error) => `${label}: ${error}`));
  if (checkpoint.samples.length < 5 || checkpoint.samples.length > 8) {
    errors.push(`${label} retained-memory checkpoint has invalid GC sample count`);
    structurallyUsable = false;
  }
  if (checkpoint.stableSampleCount !== 3) {
    errors.push(`${label} retained-memory checkpoint must use three stable samples`);
    structurallyUsable = false;
  }
  if (
    checkpoint.pid !== checkpoint.guardBefore.pid
    || checkpoint.pid !== checkpoint.guardAfter.pid
    || (expectedPid != null && checkpoint.pid !== expectedPid)
  ) {
    errors.push(`${label} retained-memory checkpoint PID mismatch`);
  }
  for (const [guardLabel, guard] of [
    ['before', checkpoint.guardBefore],
    ['after', checkpoint.guardAfter]
  ] as const) {
    if (guard.graphileInFlight !== 0) {
      errors.push(`${label} retained-memory ${guardLabel} guard has in-flight Graphile work`);
    }
    if (stateSha256(guard.state) !== guard.stateSha256) {
      errors.push(`${label} retained-memory ${guardLabel} state hash mismatch`);
    }
    const state = guard.state as Record<string, unknown>;
    const stateContracts = Array.isArray(state.residentBuildContracts)
      ? state.residentBuildContracts
      : null;
    if (
      state.pid !== guard.pid
      || state.graphileInFlight !== guard.graphileInFlight
      || !stateContracts
      || stateContracts.length !== guard.residentBuildContracts.length
      || guard.residentBuildContracts.some(
        (contract, index) => stateContracts[index] !== contract
      )
    ) {
      errors.push(`${label} retained-memory ${guardLabel} guard summary mismatch`);
    }
  }
  if (checkpoint.guardBefore.stateSha256 !== checkpoint.guardAfter.stateSha256) {
    errors.push(`${label} retained-memory residency or counters changed during GC`);
  }
  const tail = stableTail(checkpoint);
  for (const field of ['heapUsedBytes', 'externalBytes'] as const) {
    const values = tail.map((sample) => sample[field]);
    const spread = Math.max(...values) - Math.min(...values);
    const threshold = Math.max(MIB, Math.ceil(Math.max(...values) * 0.0025));
    if (spread > threshold) {
      errors.push(`${label} retained ${field} samples did not converge`);
    }
  }
  const monotonic = checkpoint.samples.map((sample) => {
    try {
      return BigInt(sample.monotonicNs);
    } catch {
      return null;
    }
  });
  if (
    monotonic.some((value) => value == null)
    || monotonic.some((value, index) =>
      index > 0 && value! <= monotonic[index - 1]!
    )
  ) {
    errors.push(`${label} retained-memory monotonic timestamps are invalid`);
    structurallyUsable = false;
  }
  return structurallyUsable;
};

export const retainedMemoryGrowth = (
  checkpoints: RetainedMemoryCheckpointPair,
  expectedPid: number | null = null,
  expectedResidentBuildContracts: ReadonlySet<string> | null = null,
  requireStableResidentBuildFingerprints = false
): RetainedMemoryGrowthSummary => {
  const errors = [...checkpoints.errors];
  const baselineValid = validateCheckpoint(
    'baseline', checkpoints.baseline, expectedPid, errors
  );
  const finalValid = validateCheckpoint(
    'final', checkpoints.final, expectedPid, errors
  );
  if (!baselineValid || !finalValid) {
    return {
      heapMiBPerHour: null,
      externalMiBPerHour: null,
      durationSec: null,
      heapBaselineBytes: null,
      heapFinalBytes: null,
      externalBaselineBytes: null,
      externalFinalBytes: null,
      errors
    };
  }
  const baseline = checkpoints.baseline!;
  const final = checkpoints.final!;
  if (baseline.fixture !== final.fixture) {
    errors.push('retained-memory checkpoint fixture changed');
  }
  validateCrossWorkloadGuardState(
    baseline.guardAfter,
    final.guardBefore,
    errors
  );
  if (expectedResidentBuildContracts) {
    const expected = [...expectedResidentBuildContracts].sort();
    for (const [label, checkpoint] of [
      ['baseline', baseline],
      ['final', final]
    ] as const) {
      const stateFingerprints = checkpoint.guardAfter.state
        .residentBuildContractFingerprints;
      const stableFingerprints = Array.isArray(stateFingerprints)
        && stateFingerprints.every((value) => typeof value === 'string')
        ? stateFingerprints as string[]
        : null;
      const resident = [
        ...(stableFingerprints ?? checkpoint.guardAfter.residentBuildContracts)
      ].sort();
      if (
        (requireStableResidentBuildFingerprints && stableFingerprints == null)
        || new Set(resident).size !== resident.length
        || expected.length !== resident.length
        || expected.some((contract, index) => contract !== resident[index])
      ) {
        errors.push(`${label} retained-memory residency set mismatch`);
      }
    }
  }
  const baselineTail = stableTail(baseline);
  const finalTail = stableTail(final);
  const baselineNs = BigInt(baseline.samples.at(-1)!.monotonicNs);
  const finalNs = BigInt(final.samples.at(-1)!.monotonicNs);
  const durationSec = Number(finalNs - baselineNs) / 1e9;
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    errors.push('retained-memory checkpoint duration is invalid');
  }
  const heapBaselineValues = baselineTail.map((sample) => sample.heapUsedBytes);
  const heapFinalValues = finalTail.map((sample) => sample.heapUsedBytes);
  const externalBaselineValues = baselineTail.map((sample) => sample.externalBytes);
  const externalFinalValues = finalTail.map((sample) => sample.externalBytes);
  const heapBaselineBytes = medianNumber(heapBaselineValues);
  const heapFinalBytes = medianNumber(heapFinalValues);
  const externalBaselineBytes = medianNumber(externalBaselineValues);
  const externalFinalBytes = medianNumber(externalFinalValues);
  const durationHours = durationSec / 3_600;
  return {
    heapMiBPerHour: durationHours > 0
      ? (Math.max(...heapFinalValues) - Math.min(...heapBaselineValues)) / MIB
        / durationHours
      : null,
    externalMiBPerHour: durationHours > 0
      ? (Math.max(...externalFinalValues) - Math.min(...externalBaselineValues)) / MIB
        / durationHours
      : null,
    durationSec: durationSec > 0 ? durationSec : null,
    heapBaselineBytes,
    heapFinalBytes,
    externalBaselineBytes,
    externalFinalBytes,
    errors
  };
};

const tenantResult = (
  tenant: TenantTarget,
  samples: RequestSample[],
  canaries: CanaryResult[],
  warmed: Set<string>,
  requiredCapabilities: string[],
  minWorkloadRequestsPerSurface: number,
  gates: AcceptanceGates
): TenantResult => {
  const localSamples = samples.filter((sample) => sample.tenantId === tenant.id);
  const workloadSamples = localSamples.filter((sample) => sample.phase === 'workload');
  const successfulCoverage = localSamples.filter((sample) => sample.ok);
  const localCanaries = canaries.filter((canary) => canary.tenantId === tenant.id);
  const errors = workloadSamples.filter((sample) => !sample.ok).length;
  const errorRate = workloadSamples.length > 0 ? errors / workloadSamples.length : 1;
  const p99Ms = percentile(workloadSamples.map((sample) => sample.latencyMs), 0.99);
  const canaryInconclusive = localCanaries.filter((canary) => !canary.conclusive).length;
  const bleedViolations = localCanaries.filter((canary) => canary.violation).length;
  const successfulOperationKeys = new Set(successfulCoverage.map((sample) =>
    `${sample.surface}/${sample.operation}`
  ));
  const successfulCapabilities = new Set(successfulCoverage.map((sample) => sample.capability));
  const successfulCapabilityKeys = new Set(successfulCoverage.map((sample) =>
    `${sample.surface}/${sample.capability}`
  ));
  const operationOracleSamples = localSamples.filter((sample) =>
    sample.oracleConfigured === true
  );
  const operationOracleInconclusive = operationOracleSamples.filter((sample) =>
    sample.oracleUnavailable !== true
    && sample.oracleConclusive !== true
  ).length;
  const operationOracleViolations = operationOracleSamples.filter((sample) =>
    sample.oracleViolation === true
  ).length;
  const coverageOracleSamplesByKey = new Map<string, RequestSample[]>();
  for (const sample of localSamples.filter((candidate) => candidate.phase === 'coverage')) {
    const key = `${sample.surface}/${sample.operation}`;
    const evidence = coverageOracleSamplesByKey.get(key) ?? [];
    evidence.push(sample);
    coverageOracleSamplesByKey.set(key, evidence);
  }
  const conclusiveCoverageOracleKeys = new Set([...coverageOracleSamplesByKey]
    .filter(([, evidence]) => evidence.length === 1 && (
      evidence[0].ok
      && evidence[0].oracleConfigured === true
      && evidence[0].oracleConclusive === true
      && evidence[0].oracleViolation !== true
    ))
    .map(([key]) => key));
  const surfaceResults: SurfaceResult[] = tenant.surfaces.map((surface) => {
    const surfaceSamples = localSamples.filter((sample) => sample.surface === surface.name);
    const surfaceWorkload = surfaceSamples.filter((sample) => sample.phase === 'workload');
    const surfaceSuccessfulWorkload = surfaceWorkload.filter((sample) =>
      sample.ok && sample.errorCode !== 'LOAD_GENERATOR_MISSED_ARRIVAL'
    );
    const surfaceCoverage = surfaceSamples.filter((sample) => sample.ok);
    const operationNames = surface.operations.map((operation) => operation.name);
    const exercisedOperations = new Set(surfaceCoverage.map((sample) => sample.operation));
    const missingOperations = operationNames.filter((operation) =>
      !exercisedOperations.has(operation)
    );
    const configuredCapabilities = [...new Set(surface.operations.map(
      (operation) => operation.capability
    ))];
    const exercisedCapabilities = new Set(surfaceCoverage.map((sample) => sample.capability));
    const missingCapabilities = configuredCapabilities.filter((capability) =>
      !exercisedCapabilities.has(capability)
    );
    const missingOperationOracles = gates.requireConclusiveOperationOracles
      ? operationNames.filter((operation) =>
        !conclusiveCoverageOracleKeys.has(`${surface.name}/${operation}`)
      )
      : [];
    const surfaceCanaries = localCanaries.filter((canary) => canary.surface === surface.name);
    const surfaceOracleSamples = surfaceSamples.filter((sample) =>
      sample.oracleConfigured === true
    );
    const surfaceOracleInconclusive = surfaceOracleSamples.filter((sample) =>
      sample.oracleUnavailable !== true && sample.oracleConclusive !== true
    ).length;
    const surfaceOracleViolations = surfaceOracleSamples.filter((sample) =>
      sample.oracleViolation === true
    ).length;
    const surfaceErrors = surfaceWorkload.filter((sample) => !sample.ok).length;
    const surfaceErrorRate = surfaceWorkload.length > 0
      ? surfaceErrors / surfaceWorkload.length
      : 1;
    const surfaceP99Ms = percentile(surfaceWorkload.map((sample) => sample.latencyMs), 0.99);
    const surfaceCanaryInconclusive = surfaceCanaries.filter(
      (canary) => !canary.conclusive
    ).length;
    const surfaceBleedViolations = surfaceCanaries.filter(
      (canary) => canary.violation
    ).length;
    const surfaceQualified = warmed.has(surface.name)
      && surfaceSuccessfulWorkload.length >= minWorkloadRequestsPerSurface
      && missingOperations.length === 0
      && missingCapabilities.length === 0
      && missingOperationOracles.length === 0
      && surfaceErrorRate <= gates.maxErrorRate
      && surfaceP99Ms <= gates.maxP99Ms
      && (!gates.requireConclusiveCanaries || surfaceCanaryInconclusive === 0)
      && (!gates.requireZeroBleed || surfaceBleedViolations === 0)
      && (
        !gates.requireConclusiveOperationOracles
        || (surfaceOracleInconclusive === 0 && surfaceOracleViolations === 0)
      );
    return {
      surface: surface.name,
      warmed: warmed.has(surface.name),
      workloadRequests: surfaceWorkload.length,
      successfulWorkloadRequests: surfaceSuccessfulWorkload.length,
      errors: surfaceErrors,
      errorRate: surfaceErrorRate,
      p99Ms: surfaceP99Ms,
      operationsConfigured: operationNames.length,
      operationsExercised: operationNames.length - missingOperations.length,
      canaryChecks: surfaceCanaries.length,
      canaryInconclusive: surfaceCanaryInconclusive,
      bleedViolations: surfaceBleedViolations,
      operationOracleChecks: surfaceOracleSamples.length,
      operationOracleInconclusive: surfaceOracleInconclusive,
      operationOracleViolations: surfaceOracleViolations,
      missingOperations,
      missingCapabilities,
      missingOperationOracles,
      qualified: surfaceQualified
    };
  });
  const trafficSurfaceNames = new Set(surfaceResults
    .filter((surface) => surface.successfulWorkloadRequests >= minWorkloadRequestsPerSurface)
    .map((surface) => surface.surface));
  const missingSurfaces = surfaceResults
    .filter((surface) => !surface.warmed || !trafficSurfaceNames.has(surface.surface))
    .map((surface) => surface.surface);
  const configuredOperations = tenant.surfaces.flatMap((surface) =>
    surface.operations.map((operation) => `${surface.name}/${operation.name}`)
  );
  const missingOperations = configuredOperations.filter((operation) =>
    !successfulOperationKeys.has(operation)
  );
  const missingOperationOracles = gates.requireConclusiveOperationOracles
    ? configuredOperations.filter((operation) =>
      !conclusiveCoverageOracleKeys.has(operation)
    )
    : [];
  const configuredCapabilities = [...new Set(tenant.surfaces.flatMap((surface) =>
    surface.operations.map((operation) => `${surface.name}/${operation.capability}`)
  ))];
  const missingCapabilities = [
    ...configuredCapabilities.filter((capability) => !successfulCapabilityKeys.has(capability)),
    ...requiredCapabilities
      .filter((capability) => !successfulCapabilities.has(capability))
      .map((capability) => `required/${capability}`)
  ];
  const qualified = warmed.size === tenant.surfaces.length
    && surfaceResults.every((surface) => surface.qualified)
    && missingSurfaces.length === 0
    && missingOperations.length === 0
    && missingCapabilities.length === 0
    && missingOperationOracles.length === 0
    && errorRate <= gates.maxErrorRate
    && p99Ms <= gates.maxP99Ms
    && (!gates.requireConclusiveCanaries || canaryInconclusive === 0)
    && (!gates.requireZeroBleed || bleedViolations === 0)
    && (
      !gates.requireConclusiveOperationOracles
      || (
        operationOracleInconclusive === 0
        && operationOracleViolations === 0
      )
    );
  return {
    tenantId: tenant.id,
    surfacesConfigured: tenant.surfaces.length,
    surfacesWarmed: warmed.size,
    surfacesWithTraffic: trafficSurfaceNames.size,
    operationsConfigured: configuredOperations.length,
    operationsExercised: configuredOperations.length - missingOperations.length,
    requests: workloadSamples.length,
    errors,
    errorRate,
    p99Ms,
    canaryChecks: localCanaries.length,
    canaryInconclusive,
    bleedViolations,
    operationOracleChecks: operationOracleSamples.length,
    operationOracleInconclusive,
    operationOracleViolations,
    missingSurfaces,
    missingOperations,
    missingCapabilities,
    missingOperationOracles,
    surfaces: surfaceResults,
    qualified
  };
};

export interface ScoreInput {
  arm: string;
  evidenceMode: 'qualification' | 'diagnostic';
  campaignId: string;
  scheduleSha256: string;
  previousResultPayloadSha256: string | null;
  qualificationCohortSha256: string;
  commit?: string;
  introspectionMode: 'stock' | 'scoped-required';
  heapMiB: number;
  repetition: number;
  expectedMatrixRepetitions: number;
  runKind: 'matrix' | 'soak';
  runOrderSeed: string;
  runOrderIndex: number;
  startedAt: string;
  endedAt: string;
  configuredDurationSec: number;
  workloadDurationMs: number;
  artifactDir: string;
  tenants: TenantTarget[];
  warmedSurfaces: Map<string, Set<string>>;
  warmupLatencies: number[];
  resolvedWarmupTimeoutMs: number;
  offeredLoad: ResolvedOfferedLoad;
  canaryIntervalSec: number;
  periodicCanarySchedule: PeriodicCanarySchedule;
  canarySchedule: CanaryScheduleSummary | null;
  minWorkloadRequestsPerSurface: number;
  samples: RequestSample[];
  canaries: CanaryResult[];
  memorySnapshots: MemorySnapshot[];
  postWarmupNodeRssSnapshots: NodeRssSnapshot[];
  memorySampleErrors: string[];
  retainedMemory: RetainedMemoryCheckpointPair;
  postgresSnapshots: PostgresMemorySnapshot[];
  postgresSampleErrors: string[];
  postWarmupSnapshots: MemorySnapshot[];
  missedArrivals: number;
  requiredCapabilities: string[];
  requiredCanaries: string[];
  gates: AcceptanceGates;
  serverExit: DensityRunResult['serverExit'];
  provenance: ArmProvenance | null;
  provenanceErrors: string[];
  postgresRunAttestation?: PostgresRunAttestationEvidence | null;
  realtimeDeliveryCoverage: RealtimeDeliveryCoverage | null;
  externalServer: boolean;
  executionErrors: string[];
}

const SHA256 = /^[a-f0-9]{64}$/;
const EMPTY_SHA256 = createHash('sha256').update('').digest('hex');

const validateRealtimeDeliveryCoverage = (input: ScoreInput): string[] => {
  const coverage = input.realtimeDeliveryCoverage;
  if (!coverage) return ['coverage record is unavailable'];
  const failures: string[] = [];
  const startedAtMs = Date.parse(coverage.workloadStartedAt);
  const deadlineAtMs = Date.parse(coverage.workloadDeadlineAt);
  const endedAtMs = coverage.workloadEndedAt == null
    ? Number.NaN
    : Date.parse(coverage.workloadEndedAt);
  if (
    coverage.version !== 2
    || !Number.isSafeInteger(coverage.deliveryIntervalMs)
    || coverage.deliveryIntervalMs <= 0
    || !Number.isFinite(startedAtMs)
    || !Number.isFinite(deadlineAtMs)
    || !Number.isFinite(endedAtMs)
    || deadlineAtMs - startedAtMs !== input.configuredDurationSec * 1000
    || endedAtMs < deadlineAtMs
  ) failures.push('coverage timing is invalid');

  const expectedRoundsPerSurface = Math.max(
    0,
    Math.ceil(
      input.configuredDurationSec * 1000 / coverage.deliveryIntervalMs
    ) - 1
  );
  const expectedSurfaces = new Map<string, string>();
  for (const tenant of input.tenants) {
    for (const surface of tenant.surfaces.filter((candidate) => candidate.realtime)) {
      expectedSurfaces.set(
        `${tenant.id}\0${surface.name}`,
        new URL(surface.url).pathname
      );
    }
  }
  const observed = new Set<string>();
  if (expectedSurfaces.size > 0 && expectedRoundsPerSurface === 0) {
    failures.push('no recurring round fits inside the workload');
  }
  for (const surface of coverage.surfaces) {
    const key = `${surface.tenantId}\0${surface.surface}`;
    if (observed.has(key)) failures.push(`duplicate surface ${surface.tenantId}/${surface.surface}`);
    observed.add(key);
    if (expectedSurfaces.get(key) !== surface.route) {
      failures.push(`unexpected route ${surface.tenantId}/${surface.surface}`);
    }
    if (
      surface.expectedRecurringRounds !== expectedRoundsPerSurface
      || surface.startedRecurringRounds !== expectedRoundsPerSurface
      || surface.verifiedRecurringRounds !== expectedRoundsPerSurface
      || surface.primeRequests !== expectedRoundsPerSurface
    ) failures.push(`incomplete surface ${surface.tenantId}/${surface.surface}`);
    if (
      !SHA256.test(surface.issuedCorrelationSha256)
      || !SHA256.test(surface.verifiedCorrelationSha256)
      || surface.issuedCorrelationSha256 !== surface.verifiedCorrelationSha256
      || (
        expectedRoundsPerSurface === 0
        && surface.issuedCorrelationSha256 !== EMPTY_SHA256
      )
      || !Number.isFinite(surface.primeResponseP99Ms)
      || surface.primeResponseP99Ms < 0
      || !Number.isFinite(surface.deliveryP99Ms)
      || surface.deliveryP99Ms < 0
    ) failures.push(`correlation mismatch ${surface.tenantId}/${surface.surface}`);
  }
  if (
    observed.size !== expectedSurfaces.size
    || [...expectedSurfaces.keys()].some((key) => !observed.has(key))
  ) failures.push('configured realtime surface set is incomplete');

  const expectedTotal = expectedRoundsPerSurface * expectedSurfaces.size;
  if (
    coverage.expectedRecurringRounds !== expectedTotal
    || coverage.startedRecurringRounds !== expectedTotal
    || coverage.verifiedRecurringRounds !== expectedTotal
    || coverage.deadlineLateRecurringRounds !== 0
    || coverage.primeRequests !== expectedTotal
    || !Number.isFinite(coverage.primeResponseP99Ms)
    || coverage.primeResponseP99Ms < 0
    || !Number.isFinite(coverage.deliveryP99Ms)
    || coverage.deliveryP99Ms < 0
    || coverage.complete !== true
  ) failures.push('aggregate recurring delivery counters are incomplete');
  return failures;
};

type CanaryTuple = readonly [
  tenantId: string,
  surface: string,
  canary: string,
  phase: CanaryResult['phase'],
  periodicRound: number | null
];

const canaryTupleKey = (tuple: CanaryTuple): string => JSON.stringify(tuple);

const increment = (counts: Map<string, number>, key: string): void => {
  counts.set(key, (counts.get(key) ?? 0) + 1);
};

const shortList = (values: string[]): string => {
  const limit = 8;
  return values.length <= limit
    ? values.join(', ')
    : `${values.slice(0, limit).join(', ')} (+${values.length - limit} more)`;
};

/**
 * Validate isolation evidence from the fleet contract, not from artifact
 * counters. JSON-encoded tuples preserve boundaries even when tenant, surface,
 * or canary names themselves contain slashes.
 */
const validateStrictCanarySchedule = (input: ScoreInput): string[] => {
  if (!input.gates.requireCompletePeriodicCanaryCoverage) return [];
  const failures: string[] = [];
  const summary = input.canarySchedule;
  const expectedRoundCount = periodicCanaryRoundCount(
    input.configuredDurationSec * 1000,
    input.canaryIntervalSec * 1000
  );
  const expected = new Map<string, CanaryTuple>();
  const configuredCanaries = new Map<string, readonly [string, string, string]>();
  const expectedChecksByTargetRound = new Map<string, number>();
  const expectedTargetsPerRound = input.tenants.reduce(
    (sum, tenant) => sum + tenant.surfaces.length,
    0
  );

  for (const tenant of input.tenants) {
    for (const surface of tenant.surfaces) {
      for (const canary of surface.canaries) {
        configuredCanaries.set(
          JSON.stringify([tenant.id, surface.name, canary.name]),
          [tenant.id, surface.name, canary.name]
        );
        for (const phase of ['initial', 'final'] as const) {
          const tuple: CanaryTuple = [tenant.id, surface.name, canary.name, phase, null];
          expected.set(canaryTupleKey(tuple), tuple);
        }
      }
      for (let periodicRound = 1; periodicRound <= expectedRoundCount; periodicRound++) {
        const selected = input.periodicCanarySchedule === 'rotating-one'
          ? [surface.canaries[rotatingCanaryIndex(
            tenant.id,
            surface.name,
            surface.canaries.length,
            periodicRound
          )]]
          : surface.canaries;
        expectedChecksByTargetRound.set(
          JSON.stringify([tenant.id, surface.name, periodicRound]),
          selected.length
        );
        for (const canary of selected) {
          const tuple: CanaryTuple = [
            tenant.id,
            surface.name,
            canary.name,
            'periodic',
            periodicRound
          ];
          expected.set(canaryTupleKey(tuple), tuple);
        }
      }
    }
  }

  const actualCounts = new Map<string, number>();
  const periodicCoverage = new Set<string>();
  const actualChecksByTargetRound = new Map<string, number>();
  for (const result of input.canaries) {
    const round = result.phase === 'periodic'
      ? result.periodicRound ?? null
      : null;
    increment(actualCounts, canaryTupleKey([
      result.tenantId,
      result.surface,
      result.canary,
      result.phase,
      round
    ]));
    if (result.phase === 'periodic' && result.periodicRound != null) {
      periodicCoverage.add(JSON.stringify([
        result.tenantId,
        result.surface,
        result.canary
      ]));
      increment(actualChecksByTargetRound, JSON.stringify([
        result.tenantId,
        result.surface,
        result.periodicRound
      ]));
    }
    const scheduledAt = Date.parse(result.scheduledAt);
    const startedAt = Date.parse(result.startedAt);
    const completedAt = Date.parse(result.completedAt);
    if (
      (result.phase === 'periodic') !== (result.periodicRound != null)
      || (result.periodicRound != null && (
        !Number.isSafeInteger(result.periodicRound)
        || result.periodicRound <= 0
      ))
      || !Number.isFinite(scheduledAt)
      || !Number.isFinite(startedAt)
      || !Number.isFinite(completedAt)
      || startedAt + 2 < scheduledAt
      || completedAt < startedAt
      || !Number.isFinite(result.latencyMs)
      || result.latencyMs < 0
    ) {
      failures.push(
        `canary evidence has invalid timing ${JSON.stringify([
          result.tenantId,
          result.surface,
          result.canary,
          result.phase,
          round
        ])}`
      );
    }
  }

  const missing = [...expected].filter(([key]) => !actualCounts.has(key)).map(([key]) => key);
  const duplicates = [...expected].filter(([key]) => (actualCounts.get(key) ?? 0) !== 1)
    .filter(([key]) => actualCounts.has(key))
    .map(([key]) => `${key} x${actualCounts.get(key)}`);
  const unexpected = [...actualCounts].filter(([key]) => !expected.has(key))
    .map(([key, count]) => `${key} x${count}`);
  if (missing.length > 0) failures.push(`missing exact canary evidence: ${shortList(missing)}`);
  if (duplicates.length > 0) {
    failures.push(`duplicate exact canary evidence: ${shortList(duplicates)}`);
  }
  if (unexpected.length > 0) {
    failures.push(`unexpected canary evidence: ${shortList(unexpected)}`);
  }

  const missingPeriodicCoverage = [...configuredCanaries]
    .filter(([key]) => !periodicCoverage.has(key))
    .map(([key]) => key);
  if (missingPeriodicCoverage.length > 0) {
    failures.push(
      `periodic canary coverage is incomplete: ${shortList(missingPeriodicCoverage)}`
    );
  }
  const targetRoundMismatches = [...expectedChecksByTargetRound]
    .filter(([key, count]) => (actualChecksByTargetRound.get(key) ?? 0) !== count)
    .map(([key, count]) =>
      `${key} expected=${count} actual=${actualChecksByTargetRound.get(key) ?? 0}`
    );
  if (targetRoundMismatches.length > 0) {
    failures.push(
      `periodic target/round evidence mismatch: ${shortList(targetRoundMismatches)}`
    );
  }

  if (!summary) {
    failures.push('periodic canary schedule summary is unavailable');
    return failures;
  }
  if (summary.schedule !== input.periodicCanarySchedule) {
    failures.push(
      `periodic canary schedule=${summary.schedule}, expected ${input.periodicCanarySchedule}`
    );
  }
  if (
    summary.intervalMs !== input.canaryIntervalSec * 1000
    || summary.durationMs !== input.configuredDurationSec * 1000
  ) {
    failures.push('periodic canary schedule timing does not match the workload plan');
  }
  if (
    summary.planned !== expectedRoundCount
    || summary.started !== expectedRoundCount
    || summary.completed !== expectedRoundCount
    || summary.missed !== 0
  ) {
    failures.push(
      `periodic canary rounds planned=${summary.planned} started=${summary.started} `
      + `completed=${summary.completed} missed=${summary.missed}, expected ${expectedRoundCount}`
    );
  }
  const expectedChecks = [...expected.values()].filter((tuple) => tuple[3] === 'periodic').length;
  if (
    summary.checksPlanned !== expectedChecks
    || summary.checksStarted !== expectedChecks
    || summary.checksCompleted !== expectedChecks
  ) {
    failures.push(
      `periodic canary checks planned=${summary.checksPlanned} `
      + `started=${summary.checksStarted} completed=${summary.checksCompleted}, `
      + `expected ${expectedChecks}`
    );
  }

  const scheduleStart = Date.parse(summary.startedAt);
  const scheduleDeadline = Date.parse(summary.deadlineAt);
  if (
    !Number.isFinite(scheduleStart)
    || !Number.isFinite(scheduleDeadline)
    || scheduleDeadline !== scheduleStart + summary.durationMs
  ) {
    failures.push('periodic canary schedule boundary timestamps are invalid');
  }
  const wrongPeriodicSlots = input.canaries.filter((result) =>
    result.phase === 'periodic'
    && result.periodicRound != null
    && Date.parse(result.scheduledAt)
      !== scheduleStart + result.periodicRound * summary.intervalMs
  );
  if (wrongPeriodicSlots.length > 0) {
    failures.push(
      `periodic canary evidence has wrong scheduled slots: ${shortList(
        wrongPeriodicSlots.map((result) => JSON.stringify([
          result.tenantId,
          result.surface,
          result.canary,
          result.periodicRound
        ]))
      )}`
    );
  }
  const roundsByNumber = new Map(summary.rounds.map((round) => [round.periodicRound, round]));
  if (summary.rounds.length !== expectedRoundCount || roundsByNumber.size !== expectedRoundCount) {
    failures.push('periodic canary round summaries are incomplete or duplicated');
  }
  let recomputedDeadlineLate = 0;
  const recomputedOverlapped = summary.rounds.filter((round) => round.overlapped).length;
  if (summary.overlapped !== recomputedOverlapped) {
    failures.push('periodic canary overlap count does not match round summaries');
  }
  for (let periodicRound = 1; periodicRound <= expectedRoundCount; periodicRound++) {
    const round = roundsByNumber.get(periodicRound);
    if (!round) continue;
    const plannedAt = Date.parse(round.plannedAt);
    const startedAt = round.startedAt == null ? NaN : Date.parse(round.startedAt);
    const completedAt = round.completedAt == null ? NaN : Date.parse(round.completedAt);
    const expectedRoundChecks = [...expectedChecksByTargetRound]
      .filter(([key]) => (JSON.parse(key) as [string, string, number])[2] === periodicRound)
      .reduce((sum, [, count]) => sum + count, 0);
    if (
      !Number.isFinite(plannedAt)
      || plannedAt !== scheduleStart + periodicRound * summary.intervalMs
      || !Number.isFinite(startedAt)
      || !Number.isFinite(completedAt)
      || completedAt < startedAt
      || round.targetsPlanned !== expectedTargetsPerRound
      || round.targetsStarted !== round.targetsPlanned
      || round.targetsCompleted !== round.targetsPlanned
      || round.checksPlanned !== expectedRoundChecks
      || round.checksStarted !== expectedRoundChecks
      || round.checksCompleted !== expectedRoundChecks
    ) {
      failures.push(`periodic canary round ${periodicRound} summary is incomplete`);
    }
    if (completedAt > scheduleDeadline || round.deadlineLate) recomputedDeadlineLate++;
  }
  const periodicResultsLate = input.canaries.filter((result) =>
    result.phase === 'periodic'
    && Date.parse(result.completedAt) > scheduleDeadline
  ).length;
  if (
    summary.deadlineLate !== 0
    || recomputedDeadlineLate !== 0
    || periodicResultsLate !== 0
  ) {
    failures.push(
      `periodic canary rounds completed after deadline=${Math.max(
        summary.deadlineLate,
        recomputedDeadlineLate
      )}; late checks=${periodicResultsLate}`
    );
  }
  return failures;
};

export const scoreRun = (input: ScoreInput): DensityRunResult => {
  const coverageSamples = input.samples.filter((sample) => sample.phase === 'coverage');
  const workloadSamples = input.samples.filter((sample) => sample.phase === 'workload');
  const latencies = workloadSamples.map((sample) => sample.latencyMs);
  const errors = workloadSamples.filter((sample) => !sample.ok).length;
  const errorRate = workloadSamples.length > 0 ? errors / workloadSamples.length : 1;
  const tenantResults = input.tenants.map((tenant) => tenantResult(
    tenant,
    input.samples,
    input.canaries,
    input.warmedSurfaces.get(tenant.id) ?? new Set<string>(),
    input.requiredCapabilities,
    input.minWorkloadRequestsPerSurface,
    input.gates
  ));
  const fleetShape = summarizeCustomerFleet(input.tenants);
  const evictions = counterDelta(input.postWarmupSnapshots, 'evictions');
  const buildRefusals = counterDelta(input.postWarmupSnapshots, 'buildRefusals');
  const postWarmupBuilds = counterDelta(input.postWarmupSnapshots, 'buildsStarted');
  const postWarmupPgPoolCapacityEvictions = pgPoolCounterDelta(
    input.postWarmupSnapshots,
    'pgPoolCapacityEvictions'
  );
  const postWarmupPgPoolCapacityRefusals = pgPoolCounterDelta(
    input.postWarmupSnapshots,
    'pgPoolCapacityRefusals'
  );
  const postWarmupPgPoolDisposalFailures = pgPoolCounterDelta(
    input.postWarmupSnapshots,
    'pgPoolDisposalFailures'
  );
  const completePgPoolTelemetry = input.postWarmupSnapshots.length > 0
    && input.postWarmupSnapshots.every((snapshot) =>
      snapshot.pgPoolCacheSize != null
      && snapshot.pgPoolLeasedPools != null
      && snapshot.pgPoolActiveLeases != null
      && snapshot.pgPoolCapacityEvictions != null
      && snapshot.pgPoolCapacityRefusals != null
      && snapshot.pgPoolDisposalFailures != null
    );
  const pgPoolCacheSize = completePgPoolTelemetry
    ? Math.max(...input.postWarmupSnapshots.map((snapshot) => snapshot.pgPoolCacheSize!))
    : null;
  const pgPoolLeasedPools = completePgPoolTelemetry
    ? Math.max(...input.postWarmupSnapshots.map((snapshot) => snapshot.pgPoolLeasedPools!))
    : null;
  const pgPoolActiveLeases = completePgPoolTelemetry
    ? Math.max(...input.postWarmupSnapshots.map((snapshot) => snapshot.pgPoolActiveLeases!))
    : null;
  const maximumCompleteValue = (key: keyof MemorySnapshot): number | null => {
    const values = input.postWarmupSnapshots
      .map((snapshot) => snapshot[key])
      .filter((value): value is number => typeof value === 'number');
    return values.length === input.postWarmupSnapshots.length && values.length > 0
      ? Math.max(...values)
      : null;
  };
  const minimumCompleteValue = (key: keyof MemorySnapshot): number | null => {
    const values = input.postWarmupSnapshots
      .map((snapshot) => snapshot[key])
      .filter((value): value is number => typeof value === 'number');
    return values.length === input.postWarmupSnapshots.length && values.length > 0
      ? Math.min(...values)
      : null;
  };
  const postgresBackendPeak = maximumCompleteValue('postgresBackendTotal');
  const physicalDatabaseValues = input.postWarmupSnapshots
    .map((snapshot) => snapshot.physicalDatabases)
    .filter((value): value is number => typeof value === 'number');
  const residentPhysicalDatabases = physicalDatabaseValues.length
    === input.postWarmupSnapshots.length && physicalDatabaseValues.length > 0
    ? Math.min(...physicalDatabaseValues)
    : null;
  const postgresContainerScopeValues = input.postWarmupSnapshots
    .map((snapshot) => snapshot.postgresContainerDedicated)
    .filter((value): value is boolean => typeof value === 'boolean');
  const postgresContainerDedicated = postgresContainerScopeValues.length
    === input.postWarmupSnapshots.length && postgresContainerScopeValues.length > 0
    ? postgresContainerScopeValues.every(Boolean)
    : null;
  const unexpectedPostgresDatabases = maximumCompleteValue(
    'unexpectedPostgresDatabases'
  );
  const pgPoolTotalClients = maximumCompleteValue('pgPoolTotalClients');
  const pgPoolIdleClients = maximumCompleteValue('pgPoolIdleClients');
  const pgPoolWaitingClients = maximumCompleteValue('pgPoolWaitingClients');
  const completeRuntimePoolTelemetry = input.postWarmupSnapshots.length > 0
    && input.postWarmupSnapshots.every((snapshot) =>
      snapshot.runtimePoolTelemetryScope === 'runtime-only-exact-identities'
      && snapshot.runtimePoolTelemetryAvailable === true
      && snapshot.runtimePoolEffectiveMaxUsesKnown === true
      && snapshot.runtimePoolMaxUsesExact === true
      && snapshot.runtimePoolExpectedPools === fleetShape.apis
      && snapshot.runtimePoolObservedPools === fleetShape.apis
      && Number.isSafeInteger(snapshot.runtimePoolTotalClients)
      && snapshot.runtimePoolTotalClients! >= 0
      && Number.isSafeInteger(snapshot.runtimePoolIdleClients)
      && snapshot.runtimePoolIdleClients! >= 0
      && Number.isSafeInteger(snapshot.runtimePoolWaitingClients)
      && snapshot.runtimePoolWaitingClients! >= 0
      && (
        snapshot.runtimePoolRequestedMaxUses == null
        || (
          Number.isSafeInteger(snapshot.runtimePoolRequestedMaxUses)
          && snapshot.runtimePoolRequestedMaxUses > 0
        )
      )
      && snapshot.runtimePoolEffectiveMaxUses
        === snapshot.runtimePoolRequestedMaxUses
    );
  const requestedMaxUsesValues = completeRuntimePoolTelemetry
    ? [...new Set(input.postWarmupSnapshots.map(
      (snapshot) => snapshot.runtimePoolRequestedMaxUses ?? null
    ))]
    : [];
  const effectiveMaxUsesValues = completeRuntimePoolTelemetry
    ? [...new Set(input.postWarmupSnapshots.map(
      (snapshot) => snapshot.runtimePoolEffectiveMaxUses ?? null
    ))]
    : [];
  const runtimePoolRequestedMaxUses = requestedMaxUsesValues.length === 1
    ? requestedMaxUsesValues[0]
    : null;
  const runtimePoolEffectiveMaxUses = effectiveMaxUsesValues.length === 1
    ? effectiveMaxUsesValues[0]
    : null;
  const runtimePoolExpectedPools = completeRuntimePoolTelemetry
    ? minimumCompleteValue('runtimePoolExpectedPools')
    : null;
  const runtimePoolObservedPools = completeRuntimePoolTelemetry
    ? minimumCompleteValue('runtimePoolObservedPools')
    : null;
  const runtimePoolTotalClients = completeRuntimePoolTelemetry
    ? maximumCompleteValue('runtimePoolTotalClients')
    : null;
  const runtimePoolIdleClients = completeRuntimePoolTelemetry
    ? maximumCompleteValue('runtimePoolIdleClients')
    : null;
  const runtimePoolWaitingClients = completeRuntimePoolTelemetry
    ? maximumCompleteValue('runtimePoolWaitingClients')
    : null;
  const residentRealtimeManagers = minimumCompleteValue('realtimeManagersActive');
  const residentRealtimeTransports = minimumCompleteValue('realtimeTransportsActive');
  const notificationModes = input.postWarmupSnapshots
    .map((snapshot) => snapshot.realtimeNotificationMode)
    .filter((value): value is 'dedicated' | 'shared-exact' =>
      value === 'dedicated' || value === 'shared-exact'
    );
  const realtimeNotificationMode = notificationModes.length
    === input.postWarmupSnapshots.length
    && notificationModes.length > 0
    && new Set(notificationModes).size === 1
    ? notificationModes[0]
    : null;
  const notificationBrokers = minimumCompleteValue('notificationBrokers');
  const notificationListenerConnections = minimumCompleteValue(
    'notificationListenerConnections'
  );
  const notificationBrokerLeases = minimumCompleteValue('notificationBrokerLeases');
  const notificationBrokerTopics = minimumCompleteValue('notificationBrokerTopics');
  const notificationBrokerSubscribers = minimumCompleteValue(
    'notificationBrokerSubscribers'
  );
  const notificationBrokerQueueOverflows = maximumCompleteValue(
    'notificationBrokerQueueOverflows'
  );
  const notificationBrokerFatalFailures = maximumCompleteValue(
    'notificationBrokerFatalFailures'
  );
  const notificationAuditIdentities = minimumCompleteValue(
    'notificationAuditIdentities'
  );
  const notificationAuditsHealthy = minimumCompleteValue(
    'notificationAuditsHealthy'
  );
  const notificationAuditsFailed = maximumCompleteValue('notificationAuditsFailed');
  const notificationAuditsStale = maximumCompleteValue('notificationAuditsStale');
  const notificationAuditAttempts = maximumCompleteValue('notificationAuditAttempts');
  const notificationAuditFailures = maximumCompleteValue('notificationAuditFailures');
  const notificationAuditActiveDatabaseTargets = minimumCompleteValue(
    'notificationAuditActiveDatabaseTargets'
  );
  const notificationAuditDatabaseConflicts = maximumCompleteValue(
    'notificationAuditDatabaseConflicts'
  );
  const cacheConfiguredMax = minimumCompleteValue('cacheConfiguredMax');
  const cacheBudgetCapacity = minimumCompleteValue('cacheBudgetCapacity');
  const cacheInstanceHeapBytes = maximumCompleteValue('cacheInstanceHeapBytes');
  const cacheCalibrationIds = input.postWarmupSnapshots
    .map((snapshot) => snapshot.cacheCalibrationId)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
  const cacheCalibrationId = cacheCalibrationIds.length
    === input.postWarmupSnapshots.length
    && new Set(cacheCalibrationIds).size === 1
    ? cacheCalibrationIds[0]
    : null;
  const cacheAdmissionModes = input.postWarmupSnapshots
    .map((snapshot) => snapshot.cacheAdmissionMode)
    .filter((value): value is NonNullable<MemorySnapshot['cacheAdmissionMode']> =>
      value === 'evict-idle' || value === 'preserve-resident'
    );
  const cacheAdmissionMode = cacheAdmissionModes.length
    === input.postWarmupSnapshots.length
    && cacheAdmissionModes.length > 0
    && new Set(cacheAdmissionModes).size === 1
    ? cacheAdmissionModes[0]
    : null;
  const rawHeapGrowth = heapGrowthMiBPerHour(input.postWarmupSnapshots);
  const postgresPeakBytes = input.postgresSnapshots.length
    ? Math.max(...input.postgresSnapshots.map((snapshot) => snapshot.usedBytes))
    : null;
  const postgresBaselineBytes = input.postgresSnapshots[0]?.usedBytes ?? null;
  const postgresWorkingSetValues = input.postgresSnapshots
    .map((snapshot) => snapshot.workingSetBytes)
    .filter((value): value is number => value != null);
  const postgresWorkingSetPeakBytes = postgresWorkingSetValues.length > 0
    ? Math.max(...postgresWorkingSetValues)
    : null;
  const postgresCgroupV2Samples = input.postgresSnapshots.filter(
    (snapshot) => snapshot.source === 'cgroup-v2' && snapshot.cgroupV2 != null
  ).length;
  const completePostgresCgroupV2CurrentTelemetry = input.postgresSnapshots.length > 0
    && input.postgresSnapshots.every((snapshot) =>
      snapshot.source === 'cgroup-v2'
      && snapshot.cgroupV2 != null
      && Number.isSafeInteger(snapshot.cgroupV2.currentBytes)
      && snapshot.cgroupV2.currentBytes >= 0
      && snapshot.usedBytes === snapshot.cgroupV2.currentBytes
    );
  const postgresCgroupPeakValues = input.postgresSnapshots
    .map((snapshot) => snapshot.cgroupV2?.peakBytes)
    .filter((value): value is number =>
      typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    );
  const postgresCgroupV2PeakBytes = postgresCgroupPeakValues.length > 0
    ? Math.max(...postgresCgroupPeakValues)
    : null;
  const completePostgresCgroupV2PeakTelemetry = completePostgresCgroupV2CurrentTelemetry
    && postgresCgroupPeakValues.length === input.postgresSnapshots.length;
  const firstPostgresEvents = input.postgresSnapshots[0]?.cgroupV2?.events;
  const lastPostgresEvents = input.postgresSnapshots.at(-1)?.cgroupV2?.events;
  const completePostgresOomEvents = firstPostgresEvents
    && lastPostgresEvents
    && typeof firstPostgresEvents.oom === 'number'
    && typeof firstPostgresEvents.oom_kill === 'number'
    && typeof lastPostgresEvents.oom === 'number'
    && typeof lastPostgresEvents.oom_kill === 'number';
  const postgresOomEvents = completePostgresOomEvents
    ? Math.max(0, lastPostgresEvents.oom - firstPostgresEvents.oom)
      + Math.max(
        0,
        lastPostgresEvents.oom_kill - firstPostgresEvents.oom_kill
      )
    : null;
  const postWarmupStartedAtMs = input.postWarmupSnapshots[0]
    ? Date.parse(input.postWarmupSnapshots[0].timestamp)
    : Number.NaN;
  const coldBuildPostgresSnapshots = Number.isFinite(postWarmupStartedAtMs)
    ? input.postgresSnapshots.filter(
      (snapshot) => Date.parse(snapshot.timestamp) <= postWarmupStartedAtMs
    )
    : [];
  const postgresColdBuildPeakBytes = coldBuildPostgresSnapshots.length > 0
    ? Math.max(...coldBuildPostgresSnapshots.map((snapshot) => snapshot.usedBytes))
    : null;
  const postgresColdBuildSpikeBytes = postgresColdBuildPeakBytes != null
    && input.postgresSnapshots.length >= 2
    ? Math.max(0, postgresColdBuildPeakBytes - input.postgresSnapshots[0].usedBytes)
    : null;
  const postWarmupPostgresSnapshots = Number.isFinite(postWarmupStartedAtMs)
    ? input.postgresSnapshots.filter(
      // Retain the nearest preceding cgroup sample for sub-second alignment.
      (snapshot) => Date.parse(snapshot.timestamp) >= postWarmupStartedAtMs - 1_000
    )
    : [];
  const alignedPostgresSnapshots = input.evidenceMode === 'qualification'
    ? postWarmupPostgresSnapshots.filter(
      (snapshot) => snapshot.source === 'cgroup-v2' && snapshot.cgroupV2 != null
    ).map((snapshot) => ({
      ...snapshot,
      usedBytes: snapshot.cgroupV2!.currentBytes
    }))
    : postWarmupPostgresSnapshots;
  const postgresWarmBoundaryBytes = Number.isFinite(postWarmupStartedAtMs)
    && input.postgresSnapshots.length > 0
    ? input.postgresSnapshots.reduce((nearest, snapshot) =>
      Math.abs(Date.parse(snapshot.timestamp) - postWarmupStartedAtMs)
        < Math.abs(Date.parse(nearest.timestamp) - postWarmupStartedAtMs)
        ? snapshot
        : nearest
    ).usedBytes
    : null;
  const alignedServicePeak = alignedServiceMemoryPeak(
    input.postWarmupNodeRssSnapshots,
    alignedPostgresSnapshots
  );
  const alignedServiceCoverage = alignedServiceMemoryCoverage(
    input.postWarmupNodeRssSnapshots,
    alignedPostgresSnapshots,
    postWarmupStartedAtMs,
    input.workloadDurationMs
  );
  const expectedResidentInstances = new Set(input.tenants.flatMap((tenant) =>
    tenant.surfaces.map((surface) => surface.buildContract)
  )).size;
  const expectedResidentBuildContracts = new Set(input.tenants.flatMap((tenant) =>
    tenant.surfaces.map((surface) => surface.buildContract)
  ));
  const retainedGrowth = retainedMemoryGrowth(
    input.retainedMemory,
    input.provenance?.serverPid ?? null,
    expectedResidentBuildContracts,
    input.gates.requirePhysicalDatabaseTelemetry
  );
  const residentCounts = input.postWarmupSnapshots
    .map((snapshot) => snapshot.cacheSize)
    .filter((value): value is number => value != null);
  const residentInstances = residentCounts.length === input.postWarmupSnapshots.length
    && residentCounts.length > 0
    ? Math.min(...residentCounts)
    : null;
  const baselineHeapBytes = input.memorySnapshots[0]?.heapUsedBytes;
  const warmHeapBytes = input.postWarmupSnapshots[0]?.heapUsedBytes;
  const warmCacheSize = input.postWarmupSnapshots[0]?.cacheSize;
  const warmObservedHeapDeltaPerInstanceBytes = baselineHeapBytes != null
    && warmHeapBytes != null
    && warmCacheSize > 0
    ? Math.max(0, warmHeapBytes - baselineHeapBytes) / warmCacheSize
    : null;
  const successfulSamples = input.samples.filter((sample) => sample.ok);
  const capabilitiesExercised = [...new Set(successfulSamples.map((sample) => sample.capability))]
    .sort();
  const missingCapabilities = tenantResults.flatMap((tenant) =>
    tenant.missingCapabilities.map((capability) => `${tenant.tenantId}/${capability}`)
  );
  const checkedCanaries = new Set(input.canaries.map((canary) =>
    JSON.stringify([canary.tenantId, canary.surface, canary.canary])
  ));
  const missingCanaries = input.tenants.flatMap((tenant) => tenant.surfaces.flatMap((surface) =>
    input.requiredCanaries
      .filter((canary) => !checkedCanaries.has(JSON.stringify([
        tenant.id,
        surface.name,
        canary
      ])))
      .map((canary) => `${tenant.id}/${surface.name}/${canary}`)
  ));
  const operationOracleChecks = tenantResults.reduce(
    (sum, tenant) => sum + tenant.operationOracleChecks,
    0
  );
  const operationOracleInconclusive = tenantResults.reduce(
    (sum, tenant) => sum + tenant.operationOracleInconclusive,
    0
  );
  const operationOracleViolations = tenantResults.reduce(
    (sum, tenant) => sum + tenant.operationOracleViolations,
    0
  );
  const missingOperationOracles = tenantResults.flatMap((tenant) =>
    tenant.missingOperationOracles.map((operation) =>
      `${tenant.tenantId}/${operation}`
    )
  );
  const failures: string[] = validateStrictCanarySchedule(input);
  if (!/^[a-f0-9]{64}$/.test(input.campaignId)) {
    failures.push('campaign identity is unavailable or invalid');
  }
  if (!/^[a-f0-9]{64}$/.test(input.scheduleSha256)) {
    failures.push('campaign schedule binding is unavailable or invalid');
  }
  if (
    input.previousResultPayloadSha256 != null
    && !/^[a-f0-9]{64}$/.test(input.previousResultPayloadSha256)
  ) {
    failures.push('campaign result-chain pointer is invalid');
  }
  if (input.configuredDurationSec < 900) failures.push('workload shorter than the 15-minute qualification floor');
  if (input.workloadDurationMs < input.configuredDurationSec * 1000 * 0.99) {
    failures.push(`measured workload duration ${(input.workloadDurationMs / 1000).toFixed(2)}s is short`);
  }
  if (input.memorySnapshots.length === 0) failures.push('memory snapshots unavailable');
  if (input.memorySampleErrors.length > 0) failures.push(`memory sampler errors=${input.memorySampleErrors.length}`);
  if (input.provenanceErrors.length > 0) {
    failures.push(`provenance validation errors: ${input.provenanceErrors.join('; ')}`);
  }
  if (!input.provenance) {
    failures.push('server provenance unavailable');
  } else {
    const missingProvenance = [
      !input.provenance.cwd ? 'cwd' : null,
      input.provenance.command.length === 0 ? 'command' : null,
      !input.provenance.gitHead ? 'gitHead' : null,
      input.provenance.worktreeDirty !== false ? 'cleanWorktree' : null,
      !input.provenance.gitStatusSha256 ? 'gitStatusSha256' : null,
      !input.provenance.lockfileSha256 ? 'lockfileSha256' : null,
      !input.provenance.entrySha256 ? 'entrySha256' : null,
      input.provenance.serverPid == null ? 'serverPid' : null,
      !input.provenance.v8Profile ? 'v8Profile' : null,
      !input.provenance.nodeOptions ? 'nodeOptions' : null,
      !Array.isArray(input.provenance.nodeOptionsArgv) ? 'nodeOptionsArgv' : null,
      !Array.isArray(input.provenance.nodeExecArgv) ? 'nodeExecArgv' : null,
      !Array.isArray(input.provenance.effectiveNodeRuntimeFlags)
        ? 'effectiveNodeRuntimeFlags'
        : null,
      !input.provenance.planSha256 ? 'planSha256' : null,
      !input.provenance.fleetSha256 ? 'fleetSha256' : null,
      !input.provenance.node ? 'node' : null,
      !input.provenance.v8 ? 'v8' : null,
      !input.provenance.runOrderSeed ? 'runOrderSeed' : null,
      !input.provenance.memoryPolicy ? 'memoryPolicy' : null
    ].filter((value): value is string => value != null);
    if (missingProvenance.length > 0) {
      failures.push(`server provenance incomplete: ${missingProvenance.join(', ')}`);
    }
    if (
      input.evidenceMode === 'qualification'
      && (
        input.provenance.platform !== 'linux'
        || input.postWarmupNodeRssSnapshots.length === 0
        || input.postWarmupNodeRssSnapshots.some((snapshot) =>
          snapshot.source !== 'proc'
          || snapshot.pid !== input.provenance!.serverPid
        )
      )
    ) {
      failures.push('qualification requires exact-PID Linux /proc RSS evidence');
    }
    const expectedProfileFlags: Record<string, string[]> = {
      stock: [],
      'optimize-for-size': ['--optimize-for-size'],
      'baseline-optimize-for-size': ['--max-opt=1', '--optimize-for-size'],
      'jitless-optimize-for-size': ['--jitless', '--optimize-for-size']
    };
    const expectedFlags = expectedProfileFlags[input.provenance.v8Profile];
    const managedFlags = input.provenance.nodeExecArgv.filter((flag) =>
      flag === '--jitless'
      || flag === '--optimize-for-size'
      || flag === '--max-opt=1'
    );
    const expectedEffectiveFlags = [
      ...input.provenance.nodeOptionsArgv,
      ...input.provenance.nodeExecArgv
    ];
    if (
      !expectedFlags
      || JSON.stringify(managedFlags) !== JSON.stringify(expectedFlags)
      || input.provenance.nodeOptionsArgv.some((flag) =>
        flag === '--jitless'
        || flag === '--optimize-for-size'
        || flag === '--max-opt=1'
      )
      || JSON.stringify(input.provenance.effectiveNodeRuntimeFlags)
        !== JSON.stringify(expectedEffectiveFlags)
    ) {
      failures.push('server V8 runtime-flag provenance is inconsistent');
    }
  }
  if (input.gates.requireFreshPostgresRunAttestation) {
    const attestation = input.postgresRunAttestation;
    const provenanceCommand = input.provenance?.command ?? [];
    const argumentAfter = (flag: string): string | null => {
      const index = provenanceCommand.indexOf(flag);
      return index >= 0 ? provenanceCommand[index + 1] ?? null : null;
    };
    const exactRunBinding = attestation != null
      && attestation.arm === input.arm
      && attestation.heapMiB === input.heapMiB
      && attestation.tenantCount === input.tenants.length
      && attestation.repetition === input.repetition
      && attestation.runOrderIndex === input.runOrderIndex
      && attestation.planSha256 === `sha256:${input.provenance?.planSha256}`
      && attestation.fleetSha256 === `sha256:${input.provenance?.fleetSha256}`
      && argumentAfter('--expected-manifest-sha256') === attestation.manifestSha256
      && argumentAfter('--clone-id') === attestation.cloneId;
    if (!attestation) {
      failures.push('fresh PostgreSQL run attestation unavailable');
    } else if (
      !exactRunBinding
      || attestation.freshContainerForRun !== true
      || attestation.cgroupV2Verified !== true
      || attestation.liveCustomerContractsAudited !== input.tenants.length
      || attestation.catalogCacheState !== 'warmed-by-live-contract-audit'
      || !/^sha256:[a-f0-9]{64}$/.test(attestation.containerConfigurationSha256)
      || !/^sha256:[a-f0-9]{64}$/.test(attestation.cloneAttestationSetSha256)
      || !/^sha256:[a-f0-9]{64}$/.test(attestation.cloneNonceSetSha256)
      || !/^sha256:[a-f0-9]{64}$/.test(attestation.liveContractSetSha256)
    ) {
      failures.push('fresh PostgreSQL run attestation is incomplete or mismatched');
    }
    if (
      attestation
      && (
        input.postgresSnapshots.length === 0
        || input.postgresSnapshots.some((snapshot) =>
          snapshot.containerId !== attestation.containerId
          || snapshot.cgroupIdentitySha256 !== attestation.cgroupIdentitySha256
        )
      )
    ) {
      failures.push('PostgreSQL memory samples do not match the attested immutable container');
    }
  }
  if (input.gates.requiredCacheAdmissionMode) {
    const requiredMode = input.gates.requiredCacheAdmissionMode;
    const pinnedMode = input.provenance?.memoryPolicy
      ?.graphileCacheAdmissionMode ?? null;
    if (cacheAdmissionMode !== requiredMode) {
      failures.push(
        `live Graphile cache admission mode=${cacheAdmissionMode ?? 'unknown'}, required ${requiredMode}`
      );
    }
    if (pinnedMode !== requiredMode) {
      failures.push(
        `pinned Graphile cache admission mode=${pinnedMode ?? 'unknown'}, required ${requiredMode}`
      );
    }
  }
  if (input.gates.requirePostgresMemoryTelemetry && input.postgresSnapshots.length < 2) failures.push('PostgreSQL memory telemetry unavailable');
  if (input.gates.requirePostgresMemoryTelemetry && input.postgresSampleErrors.length > 0) failures.push(`PostgreSQL memory sampler errors=${input.postgresSampleErrors.length}`);
  if (
    input.gates.requirePostgresMemoryTelemetry
    && input.evidenceMode === 'qualification'
    && !completePostgresCgroupV2CurrentTelemetry
  ) {
    failures.push('PostgreSQL cgroup-v2 telemetry was incomplete');
  }
  if (
    input.gates.requirePostgresMemoryTelemetry
    && input.evidenceMode === 'qualification'
    && !completePostgresCgroupV2PeakTelemetry
  ) {
    failures.push(
      'PostgreSQL cgroup-v2 memory.peak telemetry unavailable for conservative denominator'
    );
  }
  if (postgresOomEvents != null && postgresOomEvents > 0) {
    failures.push(`PostgreSQL cgroup recorded OOM events=${postgresOomEvents}`);
  }
  if (
    input.gates.requirePostgresMemoryTelemetry
    && postgresCgroupV2Samples === input.postgresSnapshots.length
    && postgresCgroupV2Samples > 0
    && postgresOomEvents == null
  ) {
    failures.push('PostgreSQL cgroup OOM event telemetry unavailable');
  }
  if (
    input.gates.requirePostgresMemoryTelemetry
    && (!alignedServicePeak || alignedServicePeak.samples < 2)
  ) {
    failures.push('aligned Node and PostgreSQL service-memory telemetry unavailable');
  }
  if (input.gates.requirePostgresMemoryTelemetry && input.evidenceMode === 'qualification') {
    const maxGapMs = input.gates.maxAlignedMemorySampleGapMs
      ?? DEFAULT_MAX_ALIGNED_MEMORY_SAMPLE_GAP_MS;
    const minCoverageRatio = input.gates.minAlignedMemoryCoverageRatio
      ?? DEFAULT_MIN_ALIGNED_MEMORY_COVERAGE_RATIO;
    if (!alignedServiceCoverage) {
      failures.push('aligned service-memory workload coverage unavailable');
    } else {
      if (alignedServiceCoverage.maxGapMs > maxGapMs) {
        failures.push(
          `aligned service-memory maximum sample gap ${alignedServiceCoverage.maxGapMs.toFixed(0)}ms exceeds ${maxGapMs}ms`
        );
      }
      if (alignedServiceCoverage.coverageRatio < minCoverageRatio) {
        failures.push(
          `aligned service-memory workload coverage ${(alignedServiceCoverage.coverageRatio * 100).toFixed(2)}% is below ${(minCoverageRatio * 100).toFixed(2)}%`
        );
      }
    }
  }
  if (residentInstances == null || residentInstances < expectedResidentInstances) {
    failures.push(`resident Graphile instances=${residentInstances ?? 'unknown'}, expected at least ${expectedResidentInstances}`);
  }
  const expectedBuildContracts = new Set(input.tenants.flatMap((tenant) =>
    tenant.surfaces.map((surface) => surface.buildContract)
  ));
  const identityUnavailable = input.postWarmupSnapshots.some((snapshot) =>
    input.gates.requirePhysicalDatabaseTelemetry
      ? snapshot.residentBuildContractFingerprints == null
      : snapshot.residentBuildContracts == null
  );
  const missingResidentBuilds = new Set<string>();
  for (const snapshot of input.postWarmupSnapshots) {
    const resident = new Set(
      (input.gates.requirePhysicalDatabaseTelemetry
        ? snapshot.residentBuildContractFingerprints
        : snapshot.residentBuildContracts)
      ?? []
    );
    for (const contract of expectedBuildContracts) {
      if (!resident.has(contract)) missingResidentBuilds.add(contract);
    }
  }
  if (identityUnavailable || input.postWarmupSnapshots.length === 0) {
    failures.push(input.gates.requirePhysicalDatabaseTelemetry
      ? 'resident Graphile build-contract fingerprints unavailable'
      : 'resident Graphile build-contract identities unavailable');
  } else if (missingResidentBuilds.size > 0) {
    failures.push(input.gates.requirePhysicalDatabaseTelemetry
      ? `resident Graphile build fingerprints missing: ${[...missingResidentBuilds].join(', ')}`
      : `resident Graphile build contracts missing: ${[...missingResidentBuilds].join(', ')}`);
  }
  if (input.missedArrivals > 0) {
    failures.push(`load generator missed scheduled arrivals=${input.missedArrivals}`);
  }
  if (errorRate > input.gates.maxErrorRate) failures.push(`error rate ${errorRate} exceeds ${input.gates.maxErrorRate}`);
  if (percentile(latencies, 0.99) > input.gates.maxP99Ms) failures.push(`p99 exceeds ${input.gates.maxP99Ms}ms`);
  if (input.gates.requireNoPostWarmupEvictions && evictions !== 0) failures.push(`post-warmup evictions=${evictions ?? 'unknown'}`);
  if (input.gates.requireNoPostWarmupBuildRefusals && buildRefusals !== 0) failures.push(`post-warmup build refusals=${buildRefusals ?? 'unknown'}`);
  if (input.gates.requireNoPostWarmupBuilds && postWarmupBuilds !== 0) failures.push(`post-warmup builds=${postWarmupBuilds ?? 'unknown'}`);
  if (!completePgPoolTelemetry) failures.push('PostgreSQL pool-cache telemetry unavailable');
  const expectedRealtimeApis = fleetShape.realtimeApis;
  if (input.gates.requirePhysicalDatabaseTelemetry) {
    const expectedCalibrationId = input.provenance?.memoryPolicy
      ?.graphileCacheCalibrationId ?? null;
    if (
      !expectedCalibrationId
      || cacheCalibrationId !== expectedCalibrationId
    ) {
      failures.push(
        `Graphile cache calibration identity=${cacheCalibrationId ?? 'unknown'}, expected ${expectedCalibrationId ?? 'pinned provenance identity'}`
      );
    }
    if (cacheConfiguredMax == null || cacheConfiguredMax < expectedResidentInstances) {
      failures.push(
        `Graphile configured cache max=${cacheConfiguredMax ?? 'unknown'}, expected at least ${expectedResidentInstances}`
      );
    }
    if (cacheBudgetCapacity == null || cacheBudgetCapacity < expectedResidentInstances) {
      failures.push(
        `Graphile heap budget capacity=${cacheBudgetCapacity ?? 'unknown'}, expected at least ${expectedResidentInstances}`
      );
    }
    if (postgresContainerDedicated !== true) {
      failures.push(
        `dedicated PostgreSQL container scope not proven; unexpected databases=${unexpectedPostgresDatabases ?? 'unknown'}`
      );
    }
    if (
      residentPhysicalDatabases == null
      || physicalDatabaseValues.some((value) => value !== fleetShape.physicalDatabases)
    ) {
      failures.push(
        `resident physical databases=${residentPhysicalDatabases ?? 'unknown'}, expected exactly ${fleetShape.physicalDatabases}`
      );
    }
    if (postgresBackendPeak == null) {
      failures.push('physical PostgreSQL backend telemetry unavailable');
    }
    if (
      pgPoolTotalClients == null
      || pgPoolIdleClients == null
      || pgPoolWaitingClients == null
    ) {
      failures.push('physical PostgreSQL pool-client telemetry unavailable');
    }
    if (
      !completeRuntimePoolTelemetry
      || requestedMaxUsesValues.length !== 1
      || effectiveMaxUsesValues.length !== 1
      || runtimePoolExpectedPools !== fleetShape.apis
      || runtimePoolObservedPools !== fleetShape.apis
    ) {
      failures.push(
        `exact runtime PostgreSQL pool telemetry unavailable or inconsistent; observed=${runtimePoolObservedPools ?? 'unknown'}, expected=${fleetShape.apis}`
      );
    } else if (
      runtimePoolRequestedMaxUses === 1
      && runtimePoolEffectiveMaxUses === 1
      && input.postWarmupSnapshots.some((snapshot) =>
        snapshot.runtimePoolIdleClients !== 0
      )
    ) {
      failures.push(
        'runtime PostgreSQL maxUses=1 retained idle clients after warmup'
      );
    }
    if (expectedRealtimeApis > 0 && realtimeNotificationMode === 'shared-exact') {
      const expectedBrokers = fleetShape.physicalDatabases;
      const exactSharedRealtime = input.postWarmupSnapshots.length > 0
        && input.postWarmupSnapshots.every((snapshot) =>
          snapshot.realtimeNotificationMode === 'shared-exact'
          && snapshot.notificationBrokers === expectedBrokers
          && snapshot.notificationListenerConnections === expectedBrokers
          && snapshot.notificationBrokerLeases === expectedRealtimeApis
          && snapshot.notificationBrokerTopics === expectedRealtimeApis
          && snapshot.notificationBrokerSubscribers === expectedRealtimeApis
          && snapshot.notificationBrokerQueueOverflows === 0
          && snapshot.notificationBrokerFatalFailures === 0
          && snapshot.notificationAuditIdentities === expectedBrokers
          && snapshot.notificationAuditsHealthy === expectedBrokers
          && snapshot.notificationAuditsFailed === 0
          && snapshot.notificationAuditsStale === 0
          && snapshot.notificationAuditAttempts != null
          && snapshot.notificationAuditAttempts >= expectedRealtimeApis
          && snapshot.notificationAuditFailures === 0
          && snapshot.notificationAuditActiveDatabaseTargets === expectedBrokers
          && snapshot.notificationAuditDatabaseConflicts === 0
        );
      if (!exactSharedRealtime) {
        failures.push(
          'shared realtime broker residency or listener-role attestation is not exact'
        );
      }
    } else if (expectedRealtimeApis > 0) {
      if (realtimeNotificationMode !== 'dedicated') {
        failures.push('realtime notification mode telemetry unavailable or inconsistent');
      }
      if (postgresBackendPeak != null && postgresBackendPeak < expectedRealtimeApis) {
        failures.push(
          `physical PostgreSQL backends=${postgresBackendPeak}, expected at least ${expectedRealtimeApis} dedicated realtime APIs`
        );
      }
      if (pgPoolTotalClients != null && pgPoolTotalClients < expectedRealtimeApis) {
        failures.push(
          `physical PostgreSQL pool clients=${pgPoolTotalClients}, expected at least ${expectedRealtimeApis} dedicated realtime APIs`
        );
      }
    }
  }
  if (expectedRealtimeApis > 0) {
    const expectedManagers = minimumCompleteValue('realtimeManagersExpected');
    const expectedTransports = minimumCompleteValue('realtimeTransportsExpected');
    if (
      expectedManagers == null
      || expectedManagers < expectedRealtimeApis
      || residentRealtimeManagers == null
      || residentRealtimeManagers < expectedManagers
    ) {
      failures.push(
        `resident realtime managers=${residentRealtimeManagers ?? 'unknown'}, expected ${expectedManagers ?? expectedRealtimeApis}`
      );
    }
    if (
      expectedTransports == null
      || expectedTransports < expectedRealtimeApis
      || residentRealtimeTransports == null
      || residentRealtimeTransports < expectedTransports
    ) {
      failures.push(
        `resident realtime transports=${residentRealtimeTransports ?? 'unknown'}, expected ${expectedTransports ?? expectedRealtimeApis}`
      );
    }
  }
  if (postWarmupPgPoolCapacityEvictions !== 0) {
    failures.push(
      `post-warmup PostgreSQL pool capacity evictions=${postWarmupPgPoolCapacityEvictions ?? 'unknown'}`
    );
  }
  if (postWarmupPgPoolCapacityRefusals !== 0) {
    failures.push(
      `post-warmup PostgreSQL pool capacity refusals=${postWarmupPgPoolCapacityRefusals ?? 'unknown'}`
    );
  }
  if (postWarmupPgPoolDisposalFailures !== 0) {
    failures.push(
      `post-warmup PostgreSQL pool disposal failures=${postWarmupPgPoolDisposalFailures ?? 'unknown'}`
    );
  }
  if (input.gates.requireRetainedMemoryCheckpoints) {
    if (retainedGrowth.errors.length > 0) {
      failures.push(
        `retained-memory checkpoint errors: ${retainedGrowth.errors.join('; ')}`
      );
    }
    if (retainedGrowth.heapMiBPerHour == null) {
      failures.push('retained heap growth could not be measured');
    } else if (
      retainedGrowth.heapMiBPerHour
        > input.gates.maxPostWarmupHeapGrowthMiBPerHour
    ) {
      failures.push(
        `retained heap growth ${retainedGrowth.heapMiBPerHour.toFixed(2)}MiB/hour exceeds ${input.gates.maxPostWarmupHeapGrowthMiBPerHour}`
      );
    }
    if (retainedGrowth.externalMiBPerHour == null) {
      failures.push('retained external-memory growth could not be measured');
    } else if (
      retainedGrowth.externalMiBPerHour
        > input.gates.maxPostWarmupHeapGrowthMiBPerHour
    ) {
      failures.push(
        `retained external-memory growth ${retainedGrowth.externalMiBPerHour.toFixed(2)}MiB/hour exceeds ${input.gates.maxPostWarmupHeapGrowthMiBPerHour}`
      );
    }
  } else if (rawHeapGrowth == null) {
    failures.push('post-warmup heap growth could not be measured');
  } else if (
    rawHeapGrowth > input.gates.maxPostWarmupHeapGrowthMiBPerHour
  ) {
    failures.push(
      `heap growth ${rawHeapGrowth.toFixed(2)}MiB/hour exceeds ${input.gates.maxPostWarmupHeapGrowthMiBPerHour}`
    );
  }
  if (input.gates.requireConclusiveCanaries && input.canaries.some((canary) => !canary.conclusive)) failures.push('isolation canary was inconclusive');
  if (input.gates.requireZeroBleed && input.canaries.some((canary) => canary.violation)) failures.push('cross-tenant bleed detected');
  if (input.gates.requireConclusiveOperationOracles) {
    if (operationOracleInconclusive > 0) {
      failures.push(
        `GraphQL operation response oracles inconclusive=${operationOracleInconclusive}`
      );
    }
    if (operationOracleViolations > 0) {
      failures.push(
        `GraphQL operation response oracle violations=${operationOracleViolations}`
      );
    }
    if (missingOperationOracles.length > 0) {
      failures.push(
        `missing GraphQL operation response oracles: ${shortList(missingOperationOracles)}`
      );
    }
  }
  if (missingCapabilities.length > 0) failures.push(`missing capabilities: ${missingCapabilities.join(', ')}`);
  if (missingCanaries.length > 0) failures.push(`missing canaries: ${missingCanaries.join(', ')}`);
  if (tenantResults.some((tenant) => !tenant.qualified)) failures.push('one or more complete tenants failed qualification');
  if (input.serverExit) failures.push(`server exited code=${input.serverExit.code} signal=${input.serverExit.signal}`);
  const realtimeFailures = validateRealtimeDeliveryCoverage(input);
  if (realtimeFailures.length > 0) {
    failures.push(
      `deadline-bounded recurring realtime delivery coverage is incomplete: ${realtimeFailures.join('; ')}`
    );
  } else if (
    input.realtimeDeliveryCoverage
    && (
      input.realtimeDeliveryCoverage.deliveryP99Ms > input.gates.maxP99Ms
      || input.realtimeDeliveryCoverage.primeResponseP99Ms > input.gates.maxP99Ms
    )
  ) {
    failures.push(
      `realtime prime or delivery p99 exceeds ${input.gates.maxP99Ms}ms`
    );
  }
  if (input.externalServer) {
    failures.push('external server reuse cannot qualify as a fresh-arm run');
  }
  failures.push(...input.executionErrors.map((error) => `execution failed: ${error}`));

  const heapValues = input.memorySnapshots
    .map((snapshot) => snapshot.heapUsedBytes)
    .filter((value): value is number => value != null);
  const peakHeapBytes = heapValues.length === input.memorySnapshots.length && heapValues.length > 0
    ? Math.max(...heapValues)
    : null;
  const peakRssValues = input.memorySnapshots
    .map((snapshot) => snapshot.processPeakRssBytes)
    .filter((value): value is number => value != null);
  const peakRssBytes = peakRssValues.length > 0
    ? Math.max(...peakRssValues)
    : null;
  const serviceMemoryUpperBoundPostgresBytes = completePostgresCgroupV2PeakTelemetry
    ? postgresCgroupV2PeakBytes
    : input.evidenceMode === 'diagnostic'
      ? postgresPeakBytes
      : null;
  const serviceMemoryUpperBoundPostgresSource = completePostgresCgroupV2PeakTelemetry
    ? 'cgroup-v2-memory.peak' as const
    : input.evidenceMode === 'diagnostic' && postgresPeakBytes != null
      ? 'sampled-current-diagnostic' as const
      : null;
  const serviceMemoryUpperBoundBytes = peakRssBytes != null
    && serviceMemoryUpperBoundPostgresBytes != null
    ? peakRssBytes + serviceMemoryUpperBoundPostgresBytes
    : null;
  const buildMaxValues = input.memorySnapshots
    .map((snapshot) => snapshot.buildMaxMs)
    .filter((value): value is number => value != null);
  const buildMaxMs = buildMaxValues.length === input.memorySnapshots.length && buildMaxValues.length > 0
    ? Math.max(...buildMaxValues)
    : null;
  const elapsedSec = input.workloadDurationMs / 1000;
  const heapLimits = [...new Set(input.memorySnapshots
    .map((snapshot) => snapshot.heapLimitBytes)
    .filter((value): value is number => value != null))];
  const observedHeapLimitBytes = heapLimits.length === 1 ? heapLimits[0] : null;
  if (peakHeapBytes == null) failures.push('heap-used telemetry unavailable');
  if (peakRssBytes == null) failures.push('OS process peak RSS telemetry unavailable');
  if (input.evidenceMode === 'qualification' && serviceMemoryUpperBoundBytes == null) {
    failures.push('conservative service-memory upper bound unavailable');
  }
  if (observedHeapLimitBytes == null) failures.push('effective V8 heap limit telemetry unavailable or inconsistent');
  const globallyQualified = failures.length === 0;
  const qualifiedCustomers = globallyQualified
    ? tenantResults.filter((tenant) => tenant.qualified).length
    : 0;
  const dispatchedWorkloadRequests = workloadSamples.filter((sample) =>
    sample.phase === 'workload'
    && sample.errorCode !== 'LOAD_GENERATOR_MISSED_ARRIVAL'
  ).length;
  const periodicValidationRequests = input.canaries.filter(
    (canary) => canary.phase === 'periodic'
  ).length;
  const customerWorkloadRps = elapsedSec > 0
    ? dispatchedWorkloadRequests / elapsedSec
    : 0;
  const periodicValidationRps = elapsedSec > 0
    ? periodicValidationRequests / elapsedSec
    : 0;
  const realtimeValidationRps = elapsedSec > 0
    ? (input.realtimeDeliveryCoverage?.primeRequests ?? 0) / elapsedSec
    : 0;

  return {
    schemaVersion: 6,
    runKind: input.runKind,
    evidenceMode: input.evidenceMode,
    campaignId: input.campaignId,
    scheduleSha256: input.scheduleSha256,
    previousResultPayloadSha256: input.previousResultPayloadSha256,
    qualificationCohortSha256: input.qualificationCohortSha256,
    arm: input.arm,
    commit: input.commit ?? null,
    introspectionMode: input.introspectionMode,
    heapMiB: input.heapMiB,
    configuredCustomers: input.tenants.length,
    configuredTenants: input.tenants.length,
    fleetShape,
    repetition: input.repetition,
    expectedMatrixRepetitions: input.expectedMatrixRepetitions,
    runOrderSeed: input.runOrderSeed,
    runOrderIndex: input.runOrderIndex,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSec: elapsedSec,
    warmupMaxMs: percentile(input.warmupLatencies, 1),
    resolvedWarmupTimeoutMs: input.resolvedWarmupTimeoutMs,
    offeredLoad: input.offeredLoad,
    requests: workloadSamples.length,
    coverageRequests: coverageSamples.length,
    workloadRequests: workloadSamples.length,
    errors,
    customerWorkloadRps,
    periodicValidationRps,
    realtimeValidationRps,
    combinedHttpRps:
      customerWorkloadRps + periodicValidationRps + realtimeValidationRps,
    achievedRps: customerWorkloadRps,
    missedArrivals: input.missedArrivals,
    errorRate,
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    p99Ms: percentile(latencies, 0.99),
    peakHeapBytes,
    peakRssBytes,
    observedHeapLimitBytes,
    residentInstances,
    expectedResidentInstances,
    cacheConfiguredMax,
    cacheBudgetCapacity,
    cacheInstanceHeapBytes,
    cacheCalibrationId,
    cacheAdmissionMode,
    warmObservedHeapDeltaPerInstanceBytes,
    postWarmupHeapGrowthMiBPerHour: rawHeapGrowth,
    rawPostWarmupHeapGrowthMiBPerHour: rawHeapGrowth,
    retainedHeapGrowthMiBPerHour: retainedGrowth.heapMiBPerHour,
    retainedExternalGrowthMiBPerHour: retainedGrowth.externalMiBPerHour,
    retainedMemoryDurationSec: retainedGrowth.durationSec,
    retainedHeapBaselineBytes: retainedGrowth.heapBaselineBytes,
    retainedHeapFinalBytes: retainedGrowth.heapFinalBytes,
    retainedExternalBaselineBytes: retainedGrowth.externalBaselineBytes,
    retainedExternalFinalBytes: retainedGrowth.externalFinalBytes,
    retainedMemoryCheckpointErrors: retainedGrowth.errors,
    postWarmupEvictions: evictions,
    postWarmupBuildRefusals: buildRefusals,
    postWarmupBuilds,
    pgPoolCacheSize,
    pgPoolLeasedPools,
    pgPoolActiveLeases,
    postWarmupPgPoolCapacityEvictions,
    postWarmupPgPoolCapacityRefusals,
    postWarmupPgPoolDisposalFailures,
    coldBuildMaxMs: buildMaxMs,
    memorySampleErrors: input.memorySampleErrors,
    postgresBaselineBytes,
    postgresWarmBoundaryBytes,
    postgresPeakBytes,
    postgresWorkingSetPeakBytes,
    postgresCgroupV2PeakBytes,
    postgresCgroupV2Samples,
    postgresOomEvents,
    postgresBackendPeak,
    residentPhysicalDatabases,
    postgresContainerDedicated,
    unexpectedPostgresDatabases,
    pgPoolTotalClients,
    pgPoolIdleClients,
    pgPoolWaitingClients,
    runtimePoolRequestedMaxUses,
    runtimePoolEffectiveMaxUses,
    runtimePoolExpectedPools,
    runtimePoolObservedPools,
    runtimePoolTotalClients,
    runtimePoolIdleClients,
    runtimePoolWaitingClients,
    residentRealtimeManagers,
    residentRealtimeTransports,
    realtimeNotificationMode,
    realtimeDeliveryCoverage: input.realtimeDeliveryCoverage,
    notificationBrokers,
    notificationListenerConnections,
    notificationBrokerLeases,
    notificationBrokerTopics,
    notificationBrokerSubscribers,
    notificationBrokerQueueOverflows,
    notificationBrokerFatalFailures,
    notificationAuditIdentities,
    notificationAuditsHealthy,
    notificationAuditsFailed,
    notificationAuditsStale,
    notificationAuditAttempts,
    notificationAuditFailures,
    notificationAuditActiveDatabaseTargets,
    notificationAuditDatabaseConflicts,
    postgresColdBuildSpikeBytes,
    postgresSampleErrors: input.postgresSampleErrors,
    alignedServicePeakBytes: alignedServicePeak?.bytes ?? null,
    alignedServicePeakNodeRssBytes: alignedServicePeak?.nodeRssBytes ?? null,
    alignedServicePeakPostgresBytes: alignedServicePeak?.postgresBytes ?? null,
    alignedServicePeakTimestamp: alignedServicePeak?.timestamp ?? null,
    alignedServiceMemorySamples: alignedServicePeak?.samples ?? 0,
    alignedServiceMemoryMaxSkewMs: alignedServicePeak?.maxSkewMs ?? null,
    alignedServiceMemoryCoverageRatio: alignedServiceCoverage?.coverageRatio ?? null,
    alignedServiceMemoryCoveredDurationMs: alignedServiceCoverage?.coveredDurationMs ?? null,
    alignedServiceMemoryExpectedDurationMs: alignedServiceCoverage?.expectedDurationMs ?? null,
    alignedServiceMemoryMaxGapMs: alignedServiceCoverage?.maxGapMs ?? null,
    serviceMemoryUpperBoundBytes,
    serviceMemoryUpperBoundPostgresSource,
    capabilitiesExercised,
    missingCapabilities,
    missingCanaries,
    canarySchedule: input.canarySchedule,
    canaryChecks: input.canaries.length,
    canaryInconclusive: input.canaries.filter((canary) => !canary.conclusive).length,
    bleedViolations: input.canaries.filter((canary) => canary.violation).length,
    operationOracleChecks,
    operationOracleInconclusive,
    operationOracleViolations,
    missingOperationOracles,
    tenants: tenantResults,
    qualifiedCustomers,
    qualifiedTenants: qualifiedCustomers,
    tenantsPerConfiguredOldSpaceGiB: qualifiedCustomers / (input.heapMiB / 1024),
    tenantsPerPeakRssGiB: peakRssBytes && peakRssBytes > 0
      ? qualifiedCustomers / (peakRssBytes / GIB)
      : null,
    customersPerAlignedServiceGiB: alignedServicePeak && alignedServicePeak.bytes > 0
      ? qualifiedCustomers / (alignedServicePeak.bytes / GIB)
      : null,
    customersPerServiceMemoryUpperBoundGiB:
      serviceMemoryUpperBoundBytes && serviceMemoryUpperBoundBytes > 0
        ? qualifiedCustomers / (serviceMemoryUpperBoundBytes / GIB)
        : null,
    configuredCustomersPerAlignedServiceGiB:
      alignedServicePeak && alignedServicePeak.bytes > 0
        ? input.tenants.length / (alignedServicePeak.bytes / GIB)
        : null,
    configuredCustomersPerServiceMemoryUpperBoundGiB:
      serviceMemoryUpperBoundBytes && serviceMemoryUpperBoundBytes > 0
        ? input.tenants.length / (serviceMemoryUpperBoundBytes / GIB)
        : null,
    accepted: globallyQualified,
    failures,
    serverExit: input.serverExit,
    provenance: input.provenance,
    provenanceErrors: input.provenanceErrors,
    postgresRunAttestation: input.postgresRunAttestation ?? null,
    artifactDir: input.artifactDir
  };
};

const median = (values: number[]): number => percentile(values, 0.5);

export const summarizeCapacityBoundaries = (
  runs: DensityRunResult[]
): DensityCapacityBoundary[] => {
  const groups = new Map<string, DensityRunResult[]>();
  for (const run of runs) {
    if (run.runKind === 'soak') continue;
    const key = `${run.arm}\0${run.heapMiB}`;
    const group = groups.get(key) ?? [];
    group.push(run);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const { arm, heapMiB } = group[0];
    const expectedRepetitions = Math.max(
      ...group.map((run) => run.expectedMatrixRepetitions ?? 1)
    );
    const byCount = new Map<number, DensityRunResult[]>();
    for (const run of group) {
      const local = byCount.get(run.configuredTenants) ?? [];
      local.push(run);
      byCount.set(run.configuredTenants, local);
    }
    const testedTenantCounts = [...byCount.keys()].sort((a, b) => a - b);
    const completeCounts = testedTenantCounts.filter((count) => {
      const countRuns = byCount.get(count)!;
      const repetitions = new Set(countRuns.map((run) => run.repetition));
      return countRuns.length === expectedRepetitions
        && repetitions.size === expectedRepetitions
        && countRuns.every((run) => run.evidenceMode === 'qualification')
        && new Set(countRuns.map((run) => run.qualificationCohortSha256)).size === 1
        && countRuns.every((run) => run.expectedMatrixRepetitions === expectedRepetitions)
        && Array.from(
          { length: expectedRepetitions },
          (_unused, index) => index + 1
        ).every((repetition) => repetitions.has(repetition));
    });
    const incompleteTenantCounts = testedTenantCounts.filter(
      (count) => !completeCounts.includes(count)
    );
    const passingCounts = completeCounts.filter((count) =>
      byCount.get(count)!.every((run) => run.accepted)
    );
    const highestAllRepetitionsPass = passingCounts.length > 0
      ? Math.max(...passingCounts)
      : null;
    const failingCounts = completeCounts.filter((count) =>
      byCount.get(count)!.some((run) => !run.accepted)
    );
    const greaterFailures = highestAllRepetitionsPass == null
      ? []
      : failingCounts.filter((count) => count > highestAllRepetitionsPass);
    const monotonicQualification = highestAllRepetitionsPass == null
      ? failingCounts.length === completeCounts.length
      : failingCounts.every((count) => count > highestAllRepetitionsPass);
    const lowestGreaterFail = greaterFailures.length > 0
      ? Math.min(...greaterFailures)
      : null;
    const boundaryRuns = highestAllRepetitionsPass == null
      ? []
      : byCount.get(highestAllRepetitionsPass)!;
    const peakRssDensities = boundaryRuns
      .map((run) => run.tenantsPerPeakRssGiB)
      .filter((value): value is number => value != null);
    const alignedServiceDensities = boundaryRuns
      .map((run) => run.customersPerAlignedServiceGiB)
      .filter((value): value is number => value != null);
    const serviceUpperBoundDensities = boundaryRuns
      .map((run) => run.customersPerServiceMemoryUpperBoundGiB)
      .filter((value): value is number => value != null);
    return {
      arm,
      heapMiB,
      expectedRepetitions,
      testedTenantCounts,
      incompleteTenantCounts,
      highestAllRepetitionsPass,
      lowestGreaterFail,
      monotonicQualification,
      capacityBoundaryReached:
        highestAllRepetitionsPass != null
        && lowestGreaterFail != null
        && monotonicQualification
        && incompleteTenantCounts.length === 0,
      medianTenantsPerConfiguredOldSpaceGiB: boundaryRuns.length > 0
        ? median(boundaryRuns.map((run) => run.tenantsPerConfiguredOldSpaceGiB))
        : null,
      medianTenantsPerPeakRssGiB:
        boundaryRuns.length > 0 && peakRssDensities.length === boundaryRuns.length
          ? median(peakRssDensities)
          : null,
      medianCustomersPerAlignedServiceGiB:
        boundaryRuns.length > 0 && alignedServiceDensities.length === boundaryRuns.length
          ? median(alignedServiceDensities)
          : null,
      medianCustomersPerServiceMemoryUpperBoundGiB:
        boundaryRuns.length > 0 && serviceUpperBoundDensities.length === boundaryRuns.length
          ? median(serviceUpperBoundDensities)
          : null
    };
  }).sort((a, b) => a.arm.localeCompare(b.arm) || a.heapMiB - b.heapMiB);
};

const relativeImprovement = (baseline: number, candidate: number): number =>
  baseline === 0 ? (candidate > 0 ? Infinity : 0) : (candidate - baseline) / baseline;

const bracketedPassingCountForRepetition = (
  runs: DensityRunResult[],
  arm: string,
  heapMiB: number,
  repetition: number
): number | null => {
  const coordinate = runs.filter((run) =>
    run.runKind !== 'soak'
    && run.arm === arm
    && run.heapMiB === heapMiB
    && run.repetition === repetition
  );
  const byCount = new Map<number, DensityRunResult>();
  for (const run of coordinate) {
    if (byCount.has(run.configuredTenants)) return null;
    if (run.evidenceMode !== 'qualification') return null;
    byCount.set(run.configuredTenants, run);
  }
  const counts = [...byCount.keys()].sort((left, right) => left - right);
  const passing = counts.filter((count) => byCount.get(count)!.accepted);
  if (passing.length === 0) return null;
  const highestPassing = Math.max(...passing);
  if (counts.some((count) => count < highestPassing && !byCount.get(count)!.accepted)) {
    return null;
  }
  const greaterFailures = counts.filter((count) =>
    count > highestPassing && !byCount.get(count)!.accepted
  );
  return greaterFailures.length > 0 ? highestPassing : null;
};

export const compareDensity = (
  baseline: DensityRunResult[],
  candidate: DensityRunResult[],
  gates: AcceptanceGates
): {
  materiallyBetter: boolean;
  configuredOldSpaceMedianImprovement: number;
  peakRssMedianImprovement: number;
  alignedServiceMedianImprovement: number;
  serviceMemoryUpperBoundMedianImprovement: number;
  configuredOldSpaceNonRegression: boolean;
  peakRssNonRegression: boolean;
  alignedServiceNonRegression: boolean;
  serviceMemoryUpperBoundNonRegression: boolean;
  everyHeapAddsTenants: boolean;
  capacityBoundariesComplete: boolean;
  pairedMatrixComplete: boolean;
  baselineBoundaries: DensityCapacityBoundary[];
  candidateBoundaries: DensityCapacityBoundary[];
} => {
  const baselineBoundaries = summarizeCapacityBoundaries(baseline);
  const candidateBoundaries = summarizeCapacityBoundaries(candidate);
  if (baseline.length === 0 || candidate.length === 0) {
    return {
      materiallyBetter: false,
      configuredOldSpaceMedianImprovement: 0,
      peakRssMedianImprovement: 0,
      alignedServiceMedianImprovement: 0,
      serviceMemoryUpperBoundMedianImprovement: 0,
      configuredOldSpaceNonRegression: false,
      peakRssNonRegression: false,
      alignedServiceNonRegression: false,
      serviceMemoryUpperBoundNonRegression: false,
      everyHeapAddsTenants: false,
      capacityBoundariesComplete: false,
      pairedMatrixComplete: false,
      baselineBoundaries,
      candidateBoundaries
    };
  }
  const matrixKeys = (runs: DensityRunResult[]): string[] => runs
    .filter((run) => run.runKind !== 'soak')
    .map((run) => [
      run.qualificationCohortSha256,
      run.evidenceMode,
      run.heapMiB,
      run.configuredTenants,
      run.repetition
    ].join(':'))
    .sort();
  const pairedMatrixComplete = JSON.stringify(matrixKeys(baseline)) === JSON.stringify(matrixKeys(candidate));
  const baselineByHeap = new Map(baselineBoundaries.map((boundary) => [
    boundary.heapMiB,
    boundary
  ]));
  const candidateByHeap = new Map(candidateBoundaries.map((boundary) => [
    boundary.heapMiB,
    boundary
  ]));
  const pairedHeaps = [...candidateByHeap.keys()].filter((heap) => baselineByHeap.has(heap));
  const capacityBoundariesComplete = pairedMatrixComplete
    && pairedHeaps.length === baselineByHeap.size
    && pairedHeaps.length === candidateByHeap.size
    && [...baselineBoundaries, ...candidateBoundaries].every(
      (boundary) => boundary.capacityBoundaryReached
    );
  const densityPairs = pairedHeaps.map((heap) => ({
    baseline: baselineByHeap.get(heap)!,
    candidate: candidateByHeap.get(heap)!
  }));
  const completeDensityPairs = densityPairs.filter(({ baseline: prior, candidate: next }) =>
    prior.medianTenantsPerConfiguredOldSpaceGiB != null
    && next.medianTenantsPerConfiguredOldSpaceGiB != null
    && prior.medianTenantsPerPeakRssGiB != null
    && next.medianTenantsPerPeakRssGiB != null
    && prior.medianCustomersPerAlignedServiceGiB != null
    && next.medianCustomersPerAlignedServiceGiB != null
    && prior.medianCustomersPerServiceMemoryUpperBoundGiB != null
    && next.medianCustomersPerServiceMemoryUpperBoundGiB != null
  );
  const configuredImprovements = completeDensityPairs.map(({ baseline: prior, candidate: next }) =>
    relativeImprovement(
      prior.medianTenantsPerConfiguredOldSpaceGiB!,
      next.medianTenantsPerConfiguredOldSpaceGiB!
    )
  );
  const peakRssImprovements = completeDensityPairs.map(({ baseline: prior, candidate: next }) =>
    relativeImprovement(
      prior.medianTenantsPerPeakRssGiB!,
      next.medianTenantsPerPeakRssGiB!
    )
  );
  const alignedServiceImprovements = completeDensityPairs.map(({
    baseline: prior,
    candidate: next
  }) => relativeImprovement(
    prior.medianCustomersPerAlignedServiceGiB!,
    next.medianCustomersPerAlignedServiceGiB!
  ));
  const serviceMemoryUpperBoundImprovements = completeDensityPairs.map(({
    baseline: prior,
    candidate: next
  }) => relativeImprovement(
    prior.medianCustomersPerServiceMemoryUpperBoundGiB!,
    next.medianCustomersPerServiceMemoryUpperBoundGiB!
  ));
  const metricsComplete = completeDensityPairs.length === densityPairs.length
    && densityPairs.length > 0;
  const configuredOldSpaceMedianImprovement = metricsComplete
    ? median(configuredImprovements)
    : 0;
  const peakRssMedianImprovement = metricsComplete ? median(peakRssImprovements) : 0;
  const alignedServiceMedianImprovement = metricsComplete
    ? median(alignedServiceImprovements)
    : 0;
  const serviceMemoryUpperBoundMedianImprovement = metricsComplete
    ? median(serviceMemoryUpperBoundImprovements)
    : 0;
  const configuredOldSpaceNonRegression = metricsComplete
    && configuredImprovements.every((improvement) => improvement >= 0);
  const peakRssNonRegression = metricsComplete
    && peakRssImprovements.every((improvement) => improvement >= 0);
  const alignedServiceNonRegression = metricsComplete
    && alignedServiceImprovements.every((improvement) => improvement >= 0);
  const serviceMemoryUpperBoundNonRegression = metricsComplete
    && serviceMemoryUpperBoundImprovements.every((improvement) => improvement >= 0);
  const everyHeapAddsTenants = capacityBoundariesComplete
    && densityPairs.every(({ baseline: prior, candidate: next }) => {
      if (prior.expectedRepetitions !== next.expectedRepetitions) return false;
      return Array.from(
        { length: prior.expectedRepetitions },
        (_unused, index) => index + 1
      ).every((repetition) => {
        const priorCapacity = bracketedPassingCountForRepetition(
          baseline,
          prior.arm,
          prior.heapMiB,
          repetition
        );
        const nextCapacity = bracketedPassingCountForRepetition(
          candidate,
          next.arm,
          next.heapMiB,
          repetition
        );
        return priorCapacity != null
          && nextCapacity != null
          && nextCapacity >= priorCapacity + gates.minAdditionalTenantsEveryRun;
      });
    });
  return {
    materiallyBetter: everyHeapAddsTenants
      && alignedServiceNonRegression
      && serviceMemoryUpperBoundNonRegression
      && alignedServiceMedianImprovement >= gates.minMedianDensityImprovement
      && serviceMemoryUpperBoundMedianImprovement >= gates.minMedianDensityImprovement,
    configuredOldSpaceMedianImprovement,
    peakRssMedianImprovement,
    alignedServiceMedianImprovement,
    serviceMemoryUpperBoundMedianImprovement,
    configuredOldSpaceNonRegression,
    peakRssNonRegression,
    alignedServiceNonRegression,
    serviceMemoryUpperBoundNonRegression,
    everyHeapAddsTenants,
    capacityBoundariesComplete,
    pairedMatrixComplete,
    baselineBoundaries,
    candidateBoundaries
  };
};
