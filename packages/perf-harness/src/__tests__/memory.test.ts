import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  normalizeMemorySnapshot,
  normalizeRetainedMemoryCheckpoint,
  readLinuxProcessMemory,
  startMemorySampler
} from '../memory';

describe('memory snapshot normalization', () => {
  it('normalizes complete retained-memory checkpoints and rejects truncated samples', () => {
    const guard = {
      pid: 55,
      graphileInFlight: 0,
      residentBuildContracts: ['contract'],
      stateSha256: `sha256:${'a'.repeat(64)}`,
      state: { pid: 55, graphileInFlight: 0 }
    };
    const raw = {
      version: 1,
      fixture: 'physical-database-density-v1',
      pid: 55,
      gcRounds: 8,
      stableSampleCount: 3,
      stable: true,
      samples: Array.from({ length: 8 }, (_, index) => ({
        timestamp: `2026-08-01T00:00:0${index}.000Z`,
        monotonicNs: String(index + 1),
        heapUsedBytes: 100,
        externalBytes: 20,
        arrayBuffersBytes: 10,
        rssBytes: 200
      })),
      guardBefore: guard,
      guardAfter: guard,
      errors: [] as string[]
    };
    expect(normalizeRetainedMemoryCheckpoint(raw)?.samples).toHaveLength(8);
    expect(normalizeRetainedMemoryCheckpoint({ ...raw, samples: raw.samples.slice(1) }))
      .toBeNull();
  });

  it('sums stable cache/governor counters', () => {
    const snapshot = normalizeMemorySnapshot({
      timestamp: '2026-07-31T00:00:00.000Z',
      pid: 123,
      nodeEnv: 'production',
      memory: { heapUsedBytes: 10, rssBytes: 20 },
      resourceUsage: { maxRSS: 40 },
      v8: { heapStatistics: { heap_size_limit: 1024 } },
      graphileCache: {
        size: 3,
        max: 9,
        admissionMode: 'preserve-resident',
        budgetCapacity: 8,
        instanceHeapBytes: 16 * 1024 ** 2,
        calibration: { id: 'measured-cache-v1' },
        keys: ['build-a', 'build-b']
      },
      graphileCacheCounters: {
        evictions: { lru: 1, ttl: 2 },
        buildRefusals: { critical_pressure: 4, resident_busy: 5 }
      },
      graphileGovernor: { buildsStarted: 7 },
      graphileBuilds: { succeeded: 6, maxMs: 42 },
      pgCache: {
        size: 12,
        leasedPools: 4,
        activeLeases: 6,
        capacityEvictions: 1,
        capacityRefusals: 2,
        disposalFailures: 3
      },
      physicalDatabaseFixture: {
        physicalDatabases: 3,
        containerScope: { dedicated: true, unexpectedDatabases: 0 },
        pools: {
          scope: 'runtime-only-exact-identities',
          available: true,
          requestedMaxUses: 1,
          effectiveMaxUses: 1,
          effectiveMaxUsesKnown: true,
          maxUsesExact: true,
          expectedPools: 9,
          observedPools: 9,
          totalClients: 8,
          idleClients: 2,
          waitingClients: 1
        },
        backends: { total: 9, active: 2, idle: 6, idleInTransaction: 1 },
        realtime: {
          managersExpected: 6,
          managersActive: 6,
          transportsExpected: 6,
          transportsActive: 6,
          notificationMode: 'shared-exact',
          notificationBrokers: {
            brokers: 3,
            listenerConnections: 3,
            leases: 6,
            topics: 6,
            subscribers: 6,
            queueOverflows: 0,
            fatalFailures: 0
          },
          notificationRoleAudits: {
            identities: 3,
            healthy: 3,
            failed: 0,
            stale: 0,
            catalogAuditAttempts: 6,
            catalogAuditFailures: 0,
            activeDatabaseTargets: 3,
            databaseConfigurationConflicts: 0
          }
        }
      }
    });
    expect(snapshot).toMatchObject({
      heapUsedBytes: 10,
      rssBytes: 20,
      pid: 123,
      nodeEnv: 'production',
      heapLimitBytes: 1024,
      processPeakRssBytes: 40 * 1024,
      cacheSize: 3,
      cacheConfiguredMax: 9,
      cacheBudgetCapacity: 8,
      cacheInstanceHeapBytes: 16 * 1024 ** 2,
      cacheCalibrationId: 'measured-cache-v1',
      cacheAdmissionMode: 'preserve-resident',
      residentBuildContracts: ['build-a', 'build-b'],
      evictions: 3,
      buildRefusals: 9,
      buildsStarted: 7,
      buildsSucceeded: 6,
      buildMaxMs: 42,
      pgPoolCacheSize: 12,
      pgPoolLeasedPools: 4,
      pgPoolActiveLeases: 6,
      pgPoolCapacityEvictions: 1,
      pgPoolCapacityRefusals: 2,
      pgPoolDisposalFailures: 3,
      pgPoolTotalClients: 8,
      pgPoolIdleClients: 2,
      pgPoolWaitingClients: 1,
      runtimePoolTelemetryScope: 'runtime-only-exact-identities',
      runtimePoolTelemetryAvailable: true,
      runtimePoolRequestedMaxUses: 1,
      runtimePoolEffectiveMaxUses: 1,
      runtimePoolEffectiveMaxUsesKnown: true,
      runtimePoolMaxUsesExact: true,
      runtimePoolExpectedPools: 9,
      runtimePoolObservedPools: 9,
      runtimePoolTotalClients: 8,
      runtimePoolIdleClients: 2,
      runtimePoolWaitingClients: 1,
      postgresBackendTotal: 9,
      postgresBackendActive: 2,
      postgresBackendIdle: 6,
      postgresBackendIdleInTransaction: 1,
      physicalDatabases: 3,
      postgresContainerDedicated: true,
      unexpectedPostgresDatabases: 0,
      realtimeManagersExpected: 6,
      realtimeManagersActive: 6,
      realtimeTransportsExpected: 6,
      realtimeTransportsActive: 6,
      realtimeNotificationMode: 'shared-exact',
      notificationBrokers: 3,
      notificationListenerConnections: 3,
      notificationBrokerLeases: 6,
      notificationBrokerTopics: 6,
      notificationBrokerSubscribers: 6,
      notificationBrokerQueueOverflows: 0,
      notificationBrokerFatalFailures: 0,
      notificationAuditIdentities: 3,
      notificationAuditsHealthy: 3,
      notificationAuditsFailed: 0,
      notificationAuditsStale: 0,
      notificationAuditAttempts: 6,
      notificationAuditFailures: 0,
      notificationAuditActiveDatabaseTargets: 3,
      notificationAuditDatabaseConflicts: 0,
      cacheCountersAvailable: true,
      buildCountersAvailable: true
    });
  });

  it('keeps missing measurements and counters null for an older endpoint', () => {
    const snapshot = normalizeMemorySnapshot({
      graphileCache: {}
    });
    expect(snapshot).toMatchObject({
      pid: null,
      nodeEnv: null,
      heapLimitBytes: null,
      heapUsedBytes: null,
      rssBytes: null,
      processPeakRssBytes: null,
      cacheSize: null,
      cacheConfiguredMax: null,
      cacheBudgetCapacity: null,
      cacheInstanceHeapBytes: null,
      cacheCalibrationId: null,
      residentBuildContracts: null,
      evictions: null,
      buildRefusals: null,
      buildsStarted: null,
      buildsSucceeded: null,
      buildMaxMs: null,
      pgPoolCacheSize: null,
      pgPoolLeasedPools: null,
      pgPoolActiveLeases: null,
      pgPoolCapacityEvictions: null,
      pgPoolCapacityRefusals: null,
      pgPoolDisposalFailures: null,
      cacheCountersAvailable: false,
      buildCountersAvailable: false
    });
  });

  it('reads Linux current and high-water RSS from the exact pid status file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-proc-'));
    const pid = 4321;
    const pidDir = path.join(root, String(pid));
    fs.mkdirSync(pidDir);
    fs.writeFileSync(
      path.join(pidDir, 'status'),
      'Name:\tnode\nVmHWM:\t2048 kB\nVmRSS:\t1024 kB\n',
      'utf8'
    );
    expect(readLinuxProcessMemory(pid, root)).toEqual({
      rssBytes: 1024 * 1024,
      peakRssBytes: 2048 * 1024
    });
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('reports proc read and malformed-status failures instead of silently dropping samples', () => {
    const errors: string[] = [];
    expect(readLinuxProcessMemory(9876, '/definitely-not-proc', (error) => {
      errors.push(error);
    })).toBeNull();
    expect(errors[0]).toContain('OS RSS proc read failed for pid 9876');

    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-proc-invalid-'));
    const pid = 9877;
    const pidDir = path.join(root, String(pid));
    fs.mkdirSync(pidDir);
    fs.writeFileSync(path.join(pidDir, 'status'), 'Name:\tnode\n', 'utf8');
    expect(readLinuxProcessMemory(pid, root, (error) => errors.push(error))).toBeNull();
    expect(errors.slice(-2)).toEqual([
      'OS RSS proc status for pid 9877 omitted VmRSS',
      'OS RSS proc status for pid 9877 omitted VmHWM'
    ]);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('binds endpoint identity and heap limit while retaining resourceUsage peak RSS', async () => {
    const originalFetch = global.fetch;
    const authorization = `Bearer ${'test-observability-token-'.repeat(2)}`;
    const fetchMock = jest.fn(async (
      _input: string | URL | Request,
      _init?: RequestInit
    ) => ({
      ok: true,
      json: async () => ({
        timestamp: '2026-08-01T00:00:00.000Z',
        pid: 55,
        nodeEnv: 'production',
        memory: { heapUsedBytes: 100, rssBytes: 200 },
        resourceUsage: { maxRSS: 300 },
        v8: { heapStatistics: { heap_size_limit: 400 } },
        graphileCache: { size: 1, keys: ['contract'] },
        graphileCacheCounters: { evictions: {}, buildRefusals: {} },
        graphileGovernor: { buildsStarted: 0 },
        graphileBuilds: { succeeded: 0, maxMs: 0 },
        pgCache: {
          size: 2,
          leasedPools: 1,
          activeLeases: 1,
          capacityEvictions: 0,
          capacityRefusals: 0,
          disposalFailures: 0
        }
      })
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      const sampler = startMemorySampler('http://127.0.0.1/debug/memory', {
        intervalMs: 60_000,
        osSampleIntervalMs: 60_000,
        expectedPid: 55,
        expectedHeapLimitBytes: 400,
        procRoot: '/definitely-not-proc',
        headers: { Authorization: authorization }
      });
      await sampler.ready;
      await sampler.markWarmupComplete();
      expect(sampler.warmupIndex).toBe(1);
      expect(sampler.snapshots).toHaveLength(2);
      await sampler.stop();
      expect(sampler.errors).toEqual([
        expect.stringContaining('OS RSS proc read failed for pid 55')
      ]);
      expect(sampler.snapshots[0]).toMatchObject({
        pid: 55,
        heapLimitBytes: 400,
        processPeakRssBytes: 300 * 1024
      });
      expect(fetchMock.mock.calls.every(([, init]) =>
        ((init as RequestInit).headers as Record<string, string>)?.Authorization === authorization
      )).toBe(true);
      expect(JSON.stringify(sampler).includes(authorization)).toBe(false);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('samples exact-pid current RSS through the authenticated endpoint', async () => {
    const originalFetch = global.fetch;
    const authorization = `Bearer ${'darwin-observability-token-'.repeat(2)}`;
    const fetchMock = jest.fn(async (
      _input: string | URL | Request,
      _init?: RequestInit
    ) => ({
      ok: true,
      json: async () => ({
        timestamp: '2000-01-01T00:00:00.000Z',
        pid: 55,
        nodeEnv: 'production',
        memory: { heapUsedBytes: 100, rssBytes: 200 },
        resourceUsage: { maxRSS: 300 },
        v8: { heapStatistics: { heap_size_limit: 400 } },
        graphileCache: { size: 1, keys: ['contract'] },
        graphileCacheCounters: { evictions: {}, buildRefusals: {} },
        graphileGovernor: { buildsStarted: 0 },
        graphileBuilds: { succeeded: 0, maxMs: 0 },
        pgCache: {
          size: 2,
          leasedPools: 1,
          activeLeases: 1,
          capacityEvictions: 0,
          capacityRefusals: 0,
          disposalFailures: 0
        }
      })
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const startedAtMs = Date.now();
    try {
      const sampler = startMemorySampler('http://127.0.0.1/debug/memory', {
        intervalMs: 60_000,
        osSampleIntervalMs: 60_000,
        expectedPid: 55,
        expectedHeapLimitBytes: 400,
        currentRssSource: 'authenticated-endpoint',
        headers: { Authorization: authorization }
      });
      await sampler.ready;
      await sampler.markWarmupComplete();
      await sampler.stop();

      expect(sampler.errors).toEqual([]);
      expect(sampler.osSnapshots.length).toBeGreaterThanOrEqual(3);
      expect(sampler.osSnapshots.every(({ rssBytes, timestamp }) =>
        rssBytes === 200
        && Date.parse(timestamp) >= startedAtMs
        && timestamp !== '2000-01-01T00:00:00.000Z'
      )).toBe(true);
      expect(sampler.osPeakRssBytes).toBe(300 * 1024);
      expect(fetchMock.mock.calls.every(([, init]) =>
        ((init as RequestInit).headers as Record<string, string>)?.Authorization
          === authorization
      )).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('fails closed when endpoint RSS sampling lacks bearer authorization', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        pid: 55,
        nodeEnv: 'production',
        memory: { heapUsedBytes: 100, rssBytes: 200 },
        resourceUsage: { maxRSS: 300 },
        v8: { heapStatistics: { heap_size_limit: 400 } },
        pgCache: {
          size: 2,
          leasedPools: 1,
          activeLeases: 1,
          capacityEvictions: 0,
          capacityRefusals: 0,
          disposalFailures: 0
        }
      })
    })) as unknown as typeof fetch;
    try {
      const sampler = startMemorySampler('http://127.0.0.1/debug/memory', {
        intervalMs: 60_000,
        osSampleIntervalMs: 60_000,
        expectedPid: 55,
        expectedHeapLimitBytes: 400,
        currentRssSource: 'authenticated-endpoint'
      });
      await sampler.ready;
      await sampler.stop();
      expect(sampler.osSnapshots).toHaveLength(0);
      expect(sampler.errors).toContain(
        'authenticated memory-endpoint RSS sampling requires bearer authorization'
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('records identity and heap mismatches instead of accepting the sample silently', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        pid: 56,
        nodeEnv: 'development',
        memory: { heapUsedBytes: 100, rssBytes: 200 },
        resourceUsage: { maxRSS: 300 },
        v8: { heapStatistics: { heap_size_limit: 401 } }
      })
    })) as unknown as typeof fetch;
    try {
      const sampler = startMemorySampler('http://127.0.0.1/debug/memory', {
        intervalMs: 60_000,
        osSampleIntervalMs: 60_000,
        expectedPid: 55,
        expectedHeapLimitBytes: 400,
        procRoot: '/definitely-not-proc'
      });
      await sampler.ready;
      await sampler.stop();
      expect(sampler.errors).toEqual(expect.arrayContaining([
        'memory endpoint pid mismatch: expected 55, observed 56',
        'memory endpoint NODE_ENV must be production, observed development',
        'V8 heap limit mismatch: expected 400, observed 401'
      ]));
    } finally {
      global.fetch = originalFetch;
    }
  });
});
