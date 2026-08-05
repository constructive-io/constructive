import fs from 'node:fs';
import path from 'node:path';

import type {
  MemorySnapshot,
  NodeRssSnapshot,
  RetainedMemoryCheckpoint,
  RetainedMemoryGuard,
  RetainedMemorySample
} from './types';

const finiteNumber = (value: unknown): number | null => typeof value === 'number'
  && Number.isFinite(value)
  ? value
  : null;

const positiveNumber = (value: unknown): number | null => {
  const parsed = finiteNumber(value);
  return parsed != null && parsed > 0 ? parsed : null;
};

const sumNumbers = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const numbers = Object.values(value).map(sumNumbers);
  return numbers.every((item): item is number => item != null)
    ? numbers.reduce((sum, item) => sum + item, 0)
    : null;
};

const stringArray = (value: unknown): string[] | null => Array.isArray(value)
  && value.every((item) => typeof item === 'string')
  ? [...value]
  : null;

const booleanValue = (value: unknown): boolean | null => typeof value === 'boolean'
  ? value
  : null;

const cacheAdmissionMode = (
  value: unknown
): MemorySnapshot['cacheAdmissionMode'] => value === 'evict-idle'
  || value === 'preserve-resident'
  ? value
  : null;

const realtimeNotificationMode = (
  value: unknown
): MemorySnapshot['realtimeNotificationMode'] => value === 'dedicated'
  || value === 'shared-exact'
  ? value
  : null;

const runtimePoolTelemetryScope = (
  value: unknown
): MemorySnapshot['runtimePoolTelemetryScope'] =>
  value === 'runtime-only-exact-identities' ? value : null;

const maxUsesValue = (value: unknown): number | null =>
  Number.isSafeInteger(value) && (value as number) > 0 ? value as number : null;

/** Convert Node's process.resourceUsage().maxRSS KiB value to bytes. */
const resourcePeakRssBytes = (raw: any): number | null => {
  const maxRssKiB = positiveNumber(raw?.resourceUsage?.maxRSS);
  return maxRssKiB == null ? null : maxRssKiB * 1024;
};

export const normalizeMemorySnapshot = (raw: any): MemorySnapshot => ({
  timestamp: typeof raw?.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
  pid: Number.isSafeInteger(raw?.pid) && raw.pid > 0 ? raw.pid : null,
  nodeEnv: typeof raw?.nodeEnv === 'string' ? raw.nodeEnv : null,
  heapLimitBytes: positiveNumber(raw?.v8?.heapStatistics?.heap_size_limit),
  heapUsedBytes: finiteNumber(raw?.memory?.heapUsedBytes),
  rssBytes: positiveNumber(raw?.memory?.rssBytes),
  processPeakRssBytes: resourcePeakRssBytes(raw),
  cacheSize: finiteNumber(raw?.graphileCache?.size),
  cacheConfiguredMax: finiteNumber(raw?.graphileCache?.max),
  cacheBudgetCapacity: finiteNumber(raw?.graphileCache?.budgetCapacity),
  cacheInstanceHeapBytes: finiteNumber(raw?.graphileCache?.instanceHeapBytes),
  cacheCalibrationId: typeof raw?.graphileCache?.calibration?.id === 'string'
    ? raw.graphileCache.calibration.id
    : null,
  cacheAdmissionMode: cacheAdmissionMode(raw?.graphileCache?.admissionMode),
  residentBuildContractFingerprints: stringArray(
    raw?.physicalDatabaseFixture?.contractEvidence
      ?.residentGraphileBuildFingerprints
  ),
  residentBuildContracts: stringArray(raw?.graphileCache?.keys),
  evictions: sumNumbers(raw?.graphileCacheCounters?.evictions),
  buildRefusals: sumNumbers(raw?.graphileCacheCounters?.buildRefusals),
  buildsStarted: finiteNumber(raw?.graphileGovernor?.buildsStarted
    ?? raw?.graphileBuilds?.started),
  buildsSucceeded: finiteNumber(raw?.graphileBuilds?.succeeded),
  buildMaxMs: finiteNumber(raw?.graphileBuilds?.maxMs),
  pgPoolCacheSize: finiteNumber(raw?.pgCache?.size),
  pgPoolLeasedPools: finiteNumber(raw?.pgCache?.leasedPools),
  pgPoolActiveLeases: finiteNumber(raw?.pgCache?.activeLeases),
  pgPoolCapacityEvictions: finiteNumber(raw?.pgCache?.capacityEvictions),
  pgPoolCapacityRefusals: finiteNumber(raw?.pgCache?.capacityRefusals),
  pgPoolDisposalFailures: finiteNumber(raw?.pgCache?.disposalFailures),
  pgPoolTotalClients: finiteNumber(
    raw?.pgCache?.totalClients
      ?? raw?.physicalDatabaseFixture?.pools?.totalClients
  ),
  pgPoolIdleClients: finiteNumber(
    raw?.pgCache?.idleClients
      ?? raw?.physicalDatabaseFixture?.pools?.idleClients
  ),
  pgPoolWaitingClients: finiteNumber(
    raw?.pgCache?.waitingClients
      ?? raw?.physicalDatabaseFixture?.pools?.waitingClients
  ),
  runtimePoolTelemetryScope: runtimePoolTelemetryScope(
    raw?.physicalDatabaseFixture?.pools?.scope
  ),
  runtimePoolTelemetryAvailable: booleanValue(
    raw?.physicalDatabaseFixture?.pools?.available
  ),
  runtimePoolRequestedMaxUses: maxUsesValue(
    raw?.physicalDatabaseFixture?.pools?.requestedMaxUses
  ),
  runtimePoolEffectiveMaxUses: maxUsesValue(
    raw?.physicalDatabaseFixture?.pools?.effectiveMaxUses
  ),
  runtimePoolEffectiveMaxUsesKnown: booleanValue(
    raw?.physicalDatabaseFixture?.pools?.effectiveMaxUsesKnown
  ),
  runtimePoolMaxUsesExact: booleanValue(
    raw?.physicalDatabaseFixture?.pools?.maxUsesExact
  ),
  runtimePoolExpectedPools: finiteNumber(
    raw?.physicalDatabaseFixture?.pools?.expectedPools
  ),
  runtimePoolObservedPools: finiteNumber(
    raw?.physicalDatabaseFixture?.pools?.observedPools
  ),
  runtimePoolTotalClients: finiteNumber(
    raw?.physicalDatabaseFixture?.pools?.totalClients
  ),
  runtimePoolIdleClients: finiteNumber(
    raw?.physicalDatabaseFixture?.pools?.idleClients
  ),
  runtimePoolWaitingClients: finiteNumber(
    raw?.physicalDatabaseFixture?.pools?.waitingClients
  ),
  postgresBackendTotal: finiteNumber(raw?.physicalDatabaseFixture?.backends?.total),
  postgresBackendActive: finiteNumber(raw?.physicalDatabaseFixture?.backends?.active),
  postgresBackendIdle: finiteNumber(raw?.physicalDatabaseFixture?.backends?.idle),
  postgresBackendIdleInTransaction: finiteNumber(
    raw?.physicalDatabaseFixture?.backends?.idleInTransaction
  ),
  physicalDatabases: finiteNumber(raw?.physicalDatabaseFixture?.physicalDatabases),
  postgresContainerDedicated: booleanValue(
    raw?.physicalDatabaseFixture?.containerScope?.dedicated
  ),
  unexpectedPostgresDatabases: finiteNumber(
    raw?.physicalDatabaseFixture?.containerScope?.unexpectedDatabases
  ),
  realtimeManagersExpected: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.managersExpected
  ),
  realtimeManagersActive: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.managersActive
  ),
  realtimeTransportsExpected: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.transportsExpected
  ),
  realtimeTransportsActive: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.transportsActive
  ),
  realtimeNotificationMode: realtimeNotificationMode(
    raw?.physicalDatabaseFixture?.realtime?.notificationMode
  ),
  notificationBrokers: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationBrokers?.brokers
  ),
  notificationListenerConnections: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationBrokers?.listenerConnections
  ),
  notificationBrokerLeases: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationBrokers?.leases
  ),
  notificationBrokerTopics: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationBrokers?.topics
  ),
  notificationBrokerSubscribers: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationBrokers?.subscribers
  ),
  notificationBrokerQueueOverflows: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationBrokers?.queueOverflows
  ),
  notificationBrokerFatalFailures: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationBrokers?.fatalFailures
  ),
  notificationAuditIdentities: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationRoleAudits?.identities
  ),
  notificationAuditsHealthy: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationRoleAudits?.healthy
  ),
  notificationAuditsFailed: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationRoleAudits?.failed
  ),
  notificationAuditsStale: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationRoleAudits?.stale
  ),
  notificationAuditAttempts: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationRoleAudits?.catalogAuditAttempts
  ),
  notificationAuditFailures: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationRoleAudits?.catalogAuditFailures
  ),
  notificationAuditActiveDatabaseTargets: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime?.notificationRoleAudits?.activeDatabaseTargets
  ),
  notificationAuditDatabaseConflicts: finiteNumber(
    raw?.physicalDatabaseFixture?.realtime
      ?.notificationRoleAudits?.databaseConfigurationConflicts
  ),
  cacheCountersAvailable: sumNumbers(raw?.graphileCacheCounters?.evictions) != null
    && sumNumbers(raw?.graphileCacheCounters?.buildRefusals) != null,
  buildCountersAvailable: finiteNumber(
    raw?.graphileGovernor?.buildsStarted ?? raw?.graphileBuilds?.started
  ) != null,
  raw
});

const normalizeRetainedMemorySample = (raw: any): RetainedMemorySample | null => {
  const heapUsedBytes = finiteNumber(raw?.heapUsedBytes);
  const externalBytes = finiteNumber(raw?.externalBytes);
  const arrayBuffersBytes = finiteNumber(raw?.arrayBuffersBytes);
  const rssBytes = positiveNumber(raw?.rssBytes);
  if (
    typeof raw?.timestamp !== 'string'
    || typeof raw?.monotonicNs !== 'string'
    || !/^\d+$/.test(raw.monotonicNs)
    || heapUsedBytes == null
    || heapUsedBytes < 0
    || externalBytes == null
    || externalBytes < 0
    || arrayBuffersBytes == null
    || arrayBuffersBytes < 0
    || rssBytes == null
  ) return null;
  return {
    timestamp: raw.timestamp,
    monotonicNs: raw.monotonicNs,
    heapUsedBytes,
    externalBytes,
    arrayBuffersBytes,
    rssBytes
  };
};

const normalizeRetainedMemoryGuard = (raw: any): RetainedMemoryGuard | null => {
  if (
    !Number.isSafeInteger(raw?.pid)
    || raw.pid <= 0
    || !Number.isSafeInteger(raw?.graphileInFlight)
    || raw.graphileInFlight < 0
    || !Array.isArray(raw?.residentBuildContracts)
    || raw.residentBuildContracts.some((value: unknown) => typeof value !== 'string')
    || typeof raw?.stateSha256 !== 'string'
    || !/^sha256:[a-f0-9]{64}$/.test(raw.stateSha256)
    || !raw?.state
    || typeof raw.state !== 'object'
    || Array.isArray(raw.state)
  ) return null;
  return {
    pid: raw.pid,
    graphileInFlight: raw.graphileInFlight,
    residentBuildContracts: [...raw.residentBuildContracts],
    stateSha256: raw.stateSha256,
    state: raw.state
  };
};

export const normalizeRetainedMemoryCheckpoint = (
  raw: any
): RetainedMemoryCheckpoint | null => {
  const samples: Array<RetainedMemorySample | null> = Array.isArray(raw?.samples)
    ? raw.samples.map(normalizeRetainedMemorySample)
    : [];
  const guardBefore = normalizeRetainedMemoryGuard(raw?.guardBefore);
  const guardAfter = normalizeRetainedMemoryGuard(raw?.guardAfter);
  if (
    raw?.version !== 1
    || typeof raw?.fixture !== 'string'
    || !Number.isSafeInteger(raw?.pid)
    || raw.pid <= 0
    || !Number.isSafeInteger(raw?.gcRounds)
    || raw.gcRounds < 5
    || raw.gcRounds > 8
    || !Number.isSafeInteger(raw?.stableSampleCount)
    || raw.stableSampleCount !== 3
    || typeof raw?.stable !== 'boolean'
    || samples.length !== raw.gcRounds
    || samples.some((sample) => sample == null)
    || !guardBefore
    || !guardAfter
    || !Array.isArray(raw?.errors)
    || raw.errors.some((error: unknown) => typeof error !== 'string')
  ) return null;
  return {
    version: 1,
    fixture: raw.fixture,
    pid: raw.pid,
    gcRounds: raw.gcRounds,
    stableSampleCount: 3,
    stable: raw.stable,
    samples: samples as RetainedMemorySample[],
    guardBefore,
    guardAfter,
    errors: [...raw.errors]
  };
};

export interface LinuxProcessMemory {
  rssBytes: number | null;
  peakRssBytes: number | null;
}

const statusKiB = (status: string, field: 'VmRSS' | 'VmHWM'): number | null => {
  const match = new RegExp(`^${field}:\\s+(\\d+)\\s+kB$`, 'm').exec(status);
  return match ? Number(match[1]) * 1024 : null;
};

/** Read current and cumulative peak RSS for one exact Linux process. */
export const readLinuxProcessMemory = (
  pid: number,
  procRoot = '/proc',
  onError?: (message: string) => void
): LinuxProcessMemory | null => {
  try {
    const status = fs.readFileSync(path.join(procRoot, String(pid), 'status'), 'utf8');
    const rssBytes = statusKiB(status, 'VmRSS');
    const peakRssBytes = statusKiB(status, 'VmHWM');
    if (rssBytes == null) onError?.(`OS RSS proc status for pid ${pid} omitted VmRSS`);
    if (peakRssBytes == null) onError?.(`OS RSS proc status for pid ${pid} omitted VmHWM`);
    if (rssBytes == null && peakRssBytes == null) return null;
    return { rssBytes, peakRssBytes };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    onError?.(`OS RSS proc read failed for pid ${pid}: ${detail}`);
    return null;
  }
};

export interface MemorySamplerOptions {
  intervalMs?: number;
  osSampleIntervalMs?: number;
  expectedPid?: number | null;
  expectedHeapLimitBytes?: number | null;
  procRoot?: string;
  /** Auto uses /proc on Linux and the authenticated memory endpoint elsewhere. */
  currentRssSource?: 'auto' | 'proc' | 'authenticated-endpoint';
  /** Ephemeral request headers; callers must never persist bearer credentials. */
  headers?: Readonly<Record<string, string>>;
}

export interface MemorySampler {
  snapshots: MemorySnapshot[];
  /** High-frequency, harness-timestamped current RSS samples. */
  osSnapshots: NodeRssSnapshot[];
  errors: string[];
  ready: Promise<void>;
  markWarmupComplete(): Promise<void>;
  stop(): Promise<void>;
  warmupIndex: number;
  osWarmupIndex: number;
  osPeakRssBytes: number | null;
}

const samplerOptions = (options: number | MemorySamplerOptions): Required<Pick<
MemorySamplerOptions,
'intervalMs' | 'osSampleIntervalMs' | 'procRoot'
>> & Pick<MemorySamplerOptions, 'expectedPid' | 'expectedHeapLimitBytes'> & {
  currentRssSource: 'proc' | 'authenticated-endpoint';
  headers: Readonly<Record<string, string>>;
} => {
  if (typeof options === 'number') {
    const currentRssSource = process.platform === 'linux'
      ? 'proc'
      : 'authenticated-endpoint';
    return {
      intervalMs: options,
      osSampleIntervalMs: Math.min(
        currentRssSource === 'proc' ? 100 : 250,
        options
      ),
      expectedPid: null,
      expectedHeapLimitBytes: null,
      procRoot: '/proc',
      currentRssSource,
      headers: Object.freeze({})
    };
  }
  const requestedSource = options.currentRssSource ?? 'auto';
  if (!['auto', 'proc', 'authenticated-endpoint'].includes(requestedSource)) {
    throw new Error(`unknown current RSS source '${String(requestedSource)}'`);
  }
  const currentRssSource = requestedSource === 'auto'
    ? (options.procRoot != null || process.platform === 'linux'
      ? 'proc'
      : 'authenticated-endpoint')
    : requestedSource;
  return {
    intervalMs: options.intervalMs ?? 1000,
    osSampleIntervalMs: options.osSampleIntervalMs
      ?? (currentRssSource === 'proc' ? 100 : 250),
    expectedPid: options.expectedPid ?? null,
    expectedHeapLimitBytes: options.expectedHeapLimitBytes ?? null,
    procRoot: options.procRoot ?? '/proc',
    currentRssSource,
    headers: Object.freeze({ ...(options.headers ?? {}) })
  };
};

const hasBearerAuthorization = (
  headers: Readonly<Record<string, string>>
): boolean => Object.entries(headers).some(([name, value]) =>
  name.toLowerCase() === 'authorization' && /^Bearer\s+\S+$/.test(value)
);

export const startMemorySampler = (
  url: string,
  options: number | MemorySamplerOptions = {}
): MemorySampler => {
  const resolved = samplerOptions(options);
  if (!Number.isFinite(resolved.intervalMs) || resolved.intervalMs <= 0) {
    throw new Error(`memory sample interval must be positive, received ${resolved.intervalMs}`);
  }
  if (!Number.isFinite(resolved.osSampleIntervalMs) || resolved.osSampleIntervalMs <= 0) {
    throw new Error(`OS memory sample interval must be positive, received ${resolved.osSampleIntervalMs}`);
  }

  const snapshots: MemorySnapshot[] = [];
  const osSnapshots: NodeRssSnapshot[] = [];
  const errors: string[] = [];
  const observedErrors = new Set<string>();
  let stopped = false;
  let inFlight: Promise<void> | null = null;
  let osInFlight: Promise<void> | null = null;
  let warmupIndex = -1;
  let osWarmupIndex = -1;
  let osPeakRssBytes: number | null = null;

  const recordError = (message: string): void => {
    if (observedErrors.has(message)) return;
    observedErrors.add(message);
    errors.push(message);
  };

  const validateIdentity = (snapshot: MemorySnapshot): void => {
    if (resolved.expectedPid == null) recordError('expected server pid is unavailable');
    else if (snapshot.pid == null) recordError('memory endpoint pid is unavailable');
    else if (snapshot.pid !== resolved.expectedPid) {
      recordError(`memory endpoint pid mismatch: expected ${resolved.expectedPid}, observed ${snapshot.pid}`);
    }
    if (snapshot.nodeEnv !== 'production') {
      recordError(`memory endpoint NODE_ENV must be production, observed ${snapshot.nodeEnv ?? 'unknown'}`);
    }
    if (resolved.expectedHeapLimitBytes == null) recordError('expected V8 heap limit is unavailable');
    else if (snapshot.heapLimitBytes == null) recordError('memory endpoint V8 heap limit is unavailable');
    else if (snapshot.heapLimitBytes !== resolved.expectedHeapLimitBytes) {
      recordError(
        `V8 heap limit mismatch: expected ${resolved.expectedHeapLimitBytes}, observed ${snapshot.heapLimitBytes}`
      );
    }
  };

  const validate = (snapshot: MemorySnapshot): void => {
    validateIdentity(snapshot);
    if (snapshot.heapUsedBytes == null) recordError('memory endpoint heap usage is unavailable');
    if (snapshot.rssBytes == null) recordError('memory endpoint RSS is unavailable');
    if (snapshot.processPeakRssBytes == null && osPeakRssBytes == null) {
      recordError('process peak RSS is unavailable');
    }
    if (
      snapshot.pgPoolCacheSize == null
      || snapshot.pgPoolLeasedPools == null
      || snapshot.pgPoolActiveLeases == null
      || snapshot.pgPoolCapacityEvictions == null
      || snapshot.pgPoolCapacityRefusals == null
      || snapshot.pgPoolDisposalFailures == null
    ) {
      recordError('PostgreSQL pool-cache telemetry is unavailable');
    }
  };

  const sampleOs = async (): Promise<void> => {
    if (resolved.expectedPid == null) return;
    if (resolved.currentRssSource === 'authenticated-endpoint') {
      if (!hasBearerAuthorization(resolved.headers)) {
        recordError('authenticated memory-endpoint RSS sampling requires bearer authorization');
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const startedAtMs = Date.now();
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: resolved.headers
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const snapshot = normalizeMemorySnapshot(await response.json());
        const endedAtMs = Date.now();
        validateIdentity(snapshot);
        if (snapshot.pid !== resolved.expectedPid || snapshot.rssBytes == null) {
          recordError('authenticated memory-endpoint current RSS sample is unavailable');
          return;
        }
        osSnapshots.push({
          timestamp: new Date(
            startedAtMs + ((endedAtMs - startedAtMs) / 2)
          ).toISOString(),
          pid: resolved.expectedPid,
          source: 'authenticated-endpoint',
          rssBytes: snapshot.rssBytes
        });
        if (snapshot.processPeakRssBytes != null) {
          osPeakRssBytes = Math.max(
            osPeakRssBytes ?? 0,
            snapshot.processPeakRssBytes
          );
        }
      } catch (error) {
        recordError(
          `authenticated memory-endpoint RSS sample failed: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        clearTimeout(timeout);
      }
      return;
    }
    const startedAtMs = Date.now();
    const processMemory = readLinuxProcessMemory(
      resolved.expectedPid,
      resolved.procRoot,
      recordError
    );
    const endedAtMs = Date.now();
    if (processMemory?.rssBytes != null) {
      osSnapshots.push({
        timestamp: new Date(startedAtMs + ((endedAtMs - startedAtMs) / 2)).toISOString(),
        pid: resolved.expectedPid,
        source: 'proc',
        rssBytes: processMemory.rssBytes
      });
    }
    if (processMemory?.peakRssBytes != null) {
      osPeakRssBytes = Math.max(osPeakRssBytes ?? 0, processMemory.peakRssBytes);
    } else if (processMemory?.rssBytes != null) {
      osPeakRssBytes = Math.max(osPeakRssBytes ?? 0, processMemory.rssBytes);
    }
    const lastSnapshot = snapshots[snapshots.length - 1];
    if (lastSnapshot && osPeakRssBytes != null) {
      lastSnapshot.processPeakRssBytes = Math.max(
        lastSnapshot.processPeakRssBytes ?? 0,
        osPeakRssBytes
      );
    }
  };

  const runOsSample = (): Promise<void> => {
    if (osInFlight) return osInFlight;
    let pending: Promise<void>;
    pending = sampleOs().finally(() => {
      if (osInFlight === pending) osInFlight = null;
    });
    osInFlight = pending;
    return pending;
  };

  const sample = async (): Promise<void> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      await runOsSample();
      const response = await fetch(url, {
        signal: controller.signal,
        headers: resolved.headers
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const snapshot = normalizeMemorySnapshot(await response.json());
      if (osPeakRssBytes != null) {
        snapshot.processPeakRssBytes = Math.max(snapshot.processPeakRssBytes ?? 0, osPeakRssBytes);
      }
      validate(snapshot);
      snapshots.push(snapshot);
    } catch (error) {
      recordError(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timeout);
    }
  };

  const runSample = (): Promise<void> => {
    if (inFlight) return inFlight;
    let pending: Promise<void>;
    pending = sample().finally(() => {
      if (inFlight === pending) inFlight = null;
    });
    inFlight = pending;
    return pending;
  };

  const timer = setInterval(() => {
    void runSample();
  }, resolved.intervalMs);
  const osTimer = setInterval(() => {
    void runOsSample();
  }, resolved.osSampleIntervalMs);
  const ready = runSample();

  return {
    snapshots,
    osSnapshots,
    errors,
    ready,
    get warmupIndex() {
      return warmupIndex;
    },
    get osWarmupIndex() {
      return osWarmupIndex;
    },
    get osPeakRssBytes() {
      return osPeakRssBytes;
    },
    async markWarmupComplete(): Promise<void> {
      if (inFlight) await inFlight;
      if (osInFlight) await osInFlight;
      warmupIndex = snapshots.length;
      osWarmupIndex = osSnapshots.length;
      await runOsSample();
      await runSample();
    },
    async stop(): Promise<void> {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      clearInterval(osTimer);
      if (inFlight) await inFlight;
      if (osInFlight) await osInFlight;
      await runOsSample();
      await runSample();
    }
  };
};
