import { pgCache } from 'pg-cache';

import {
  beginGraphileBuildShutdown,
  clearGraphileCache,
  closeAllCaches,
  closeGraphileBuilds,
  configureGraphileAdmission,
  configureGraphileBuilds,
  getCacheStats,
  getGraphileBuildStats,
  graphileBuildFlights,
  graphileCache,
  reopenGraphileBuilds,
  type GraphileCacheEntry
} from '../graphile-cache';
import { graphileBuildCoordinator } from '../build-coordinator';

interface Deferred<T> {
  promise: Promise<T>;
  settled: boolean;
  resolve(value: T): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolvePromise!: (value: T) => void;
  let settled = false;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    get settled() { return settled; },
    resolve(value) {
      if (settled) return;
      settled = true;
      resolvePromise(value);
    }
  };
};

interface BuildMetadata {
  cacheKey: string;
  serviceKey: string;
  databaseId: string;
  poolKey: string;
}

const makeMetadata = (cacheKey: string): BuildMetadata => ({
  cacheKey,
  serviceKey: `service:${cacheKey}`,
  databaseId: `database:${cacheKey}`,
  poolKey: `pool:${cacheKey}`
});

const makeEntry = (
  metadata: BuildMetadata,
  release = jest.fn(async (): Promise<void> => undefined),
  releasePresetServices = jest.fn(async (): Promise<void> => undefined)
): GraphileCacheEntry => ({
  pgl: { release },
  serv: {},
  handler: {},
  httpServer: { listening: false },
  cacheKey: metadata.cacheKey,
  createdAt: Date.now(),
  serviceKey: metadata.serviceKey,
  databaseId: metadata.databaseId,
  poolKey: metadata.poolKey,
  releasePresetServices
} as unknown as GraphileCacheEntry);

const buildResults: Array<{ metadata: BuildMetadata; gate: Deferred<GraphileCacheEntry> }> = [];
const cleanupGates: Deferred<void>[] = [];
const preparationScopes: Array<ReturnType<typeof graphileBuildFlights.capture>> = [];

const deferBuildResult = (metadata: BuildMetadata): Deferred<GraphileCacheEntry> => {
  const gate = deferred<GraphileCacheEntry>();
  buildResults.push({ metadata, gate });
  return gate;
};

const deferCleanup = (): Deferred<void> => {
  const gate = deferred<void>();
  cleanupGates.push(gate);
  return gate;
};

const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

beforeAll(() => {
  configureGraphileAdmission({ max: 4, buildReserveBytes: 0 });
  configureGraphileBuilds({ queueMax: 1, watchdogMs: 300_000, shutdownTimeoutMs: 300_000 });
});

afterEach(async () => {
  jest.useRealTimers();
  for (const { metadata, gate } of buildResults) {
    if (!gate.settled) gate.resolve(makeEntry(metadata));
  }
  for (const gate of cleanupGates) gate.resolve(undefined);
  for (const scope of preparationScopes) scope.release();
  buildResults.length = 0;
  cleanupGates.length = 0;
  preparationScopes.length = 0;

  await clearGraphileCache();
  if (getGraphileBuildStats().state === 'closed') reopenGraphileBuilds();
  jest.restoreAllMocks();
});

describe('coordinated Graphile publication', () => {
  it('serializes different keys FIFO, lets same-key callers join, and refuses queue overflow before reservation', async () => {
    const firstMetadata = makeMetadata('coordinated-first');
    const secondMetadata = makeMetadata('coordinated-second');
    const overflowMetadata = makeMetadata('coordinated-overflow');
    const firstResult = deferBuildResult(firstMetadata);
    const secondResult = deferBuildResult(secondMetadata);
    const firstStarted = deferred<void>();
    const secondStarted = deferred<void>();
    const starts: string[] = [];
    const firstCreate = jest.fn(() => {
      starts.push('first');
      firstStarted.resolve(undefined);
      return firstResult.promise;
    });
    const secondCreate = jest.fn(() => {
      starts.push('second');
      secondStarted.resolve(undefined);
      return secondResult.promise;
    });
    const overflowCreate = jest.fn(async () => makeEntry(overflowMetadata));

    const first = graphileBuildFlights.getOrCreate(firstMetadata, firstCreate);
    await firstStarted.promise;
    const firstJoin = graphileBuildFlights.getOrCreate(firstMetadata, jest.fn());
    expect(firstJoin).toBe(first);

    const second = graphileBuildFlights.getOrCreate(secondMetadata, secondCreate);
    const secondJoin = graphileBuildFlights.getOrCreate(secondMetadata, jest.fn());
    expect(secondJoin).toBe(second);
    const overflow = graphileBuildFlights.getOrCreate(overflowMetadata, overflowCreate);
    const overflowFailure = expect(overflow).rejects.toMatchObject({ code: 'SCHEMA_BUILD_QUEUE_FULL' });

    await overflowFailure;
    expect(graphileBuildCoordinator.stats).toMatchObject({ active: 1, queued: 1, state: 'open' });
    expect(getCacheStats()).toMatchObject({ reserved: 1, size: 0, disposing: 0 });
    expect(firstCreate).toHaveBeenCalledTimes(1);
    expect(secondCreate).not.toHaveBeenCalled();
    expect(overflowCreate).not.toHaveBeenCalled();
    expect(starts).toEqual(['first']);

    const firstEntry = makeEntry(firstMetadata);
    firstResult.resolve(firstEntry);
    await expect(first).resolves.toBe(firstEntry);
    await secondStarted.promise;
    expect(starts).toEqual(['first', 'second']);
    expect(graphileBuildCoordinator.stats).toMatchObject({ active: 1, queued: 0, state: 'open' });
    expect(getCacheStats().reserved).toBe(1);

    const secondEntry = makeEntry(secondMetadata);
    secondResult.resolve(secondEntry);
    await expect(second).resolves.toBe(secondEntry);
    expect(graphileBuildCoordinator.stats).toMatchObject({ active: 0, queued: 0, state: 'open' });
    expect(getCacheStats().reserved).toBe(0);
    expect([...graphileCache.keys()]).toEqual(expect.arrayContaining([firstMetadata.cacheKey, secondMetadata.cacheKey]));
  });

  it('bounds synchronous flight tracking during a burst of unique requests', async () => {
    const activeMetadata = makeMetadata('coordinated-burst-active');
    const queuedMetadata = makeMetadata('coordinated-burst-0');
    const activeResult = deferBuildResult(activeMetadata);
    const queuedResult = deferBuildResult(queuedMetadata);
    const activeStarted = deferred<void>();
    const queuedStarted = deferred<void>();
    const activeCreate = jest.fn(() => {
      activeStarted.resolve(undefined);
      return activeResult.promise;
    });
    const queuedCreate = jest.fn(() => {
      queuedStarted.resolve(undefined);
      return queuedResult.promise;
    });
    const active = graphileBuildFlights.getOrCreate(activeMetadata, activeCreate);
    await activeStarted.promise;

    const burst = Array.from({ length: 100 }, (_, index) => {
      const metadata = makeMetadata(`coordinated-burst-${index}`);
      const create = index === 0
        ? queuedCreate
        : jest.fn(async () => makeEntry(metadata));
      return { promise: graphileBuildFlights.getOrCreate(metadata, create), create };
    });
    const outcomes = burst.map(({ promise }) => promise.then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ status: 'rejected' as const, error })
    ));

    expect(graphileBuildFlights.pendingCount).toBeLessThanOrEqual(2);
    expect(graphileBuildFlights.activeScopeCount).toBeLessThanOrEqual(2);
    expect(graphileBuildCoordinator.stats).toMatchObject({ active: 1, queued: 1, state: 'open' });
    expect(getCacheStats().reserved).toBe(1);
    expect(burst[0].create).not.toHaveBeenCalled();

    const overflowOutcomes = await Promise.all(outcomes.slice(1));
    for (const outcome of overflowOutcomes) {
      expect(outcome).toMatchObject({ status: 'rejected', error: { code: 'SCHEMA_BUILD_QUEUE_FULL' } });
    }
    expect(graphileBuildFlights.pendingCount).toBe(2);
    expect(getCacheStats().reserved).toBe(1);

    activeResult.resolve(makeEntry(activeMetadata));
    await expect(active).resolves.toMatchObject({ cacheKey: activeMetadata.cacheKey });
    await queuedStarted.promise;
    expect(burst[0].create).toHaveBeenCalledTimes(1);
    queuedResult.resolve(makeEntry(queuedMetadata));
    await expect(burst[0].promise).resolves.toMatchObject({ cacheKey: queuedMetadata.cacheKey });
    expect(graphileBuildFlights.pendingCount).toBe(0);
  });

  it('rejects shutdown before the deferred build hook reaches its factory', async () => {
    const metadata = makeMetadata('coordinated-shutdown-before-factory');
    const create = jest.fn(async () => makeEntry(metadata));
    const pending = graphileBuildFlights.getOrCreate(metadata, create);
    const rejection = expect(pending).rejects.toMatchObject({ code: 'SCHEMA_BUILDS_CLOSED' });

    beginGraphileBuildShutdown();
    await rejection;
    expect(create).not.toHaveBeenCalled();
    expect(getCacheStats().reserved).toBe(0);
    await expect(closeGraphileBuilds(300_000)).resolves.toBe(true);
    expect(graphileBuildCoordinator.stats).toMatchObject({ active: 0, queued: 0, state: 'closed' });
    reopenGraphileBuilds();
    expect(graphileBuildCoordinator.stats.state).toBe('open');
  });

  it('keeps actual work fenced and the permit held through late cleanup after watchdog failure', async () => {
    configureGraphileBuilds({ watchdogMs: 10, shutdownTimeoutMs: 20 });
    jest.useFakeTimers();

    const metadata = makeMetadata('coordinated-watchdog-late-entry');
    const queuedMetadata = makeMetadata('coordinated-watchdog-queued');
    const result = deferBuildResult(metadata);
    const cleanup = deferCleanup();
    const factoryStarted = deferred<void>();
    const releaseStarted = deferred<void>();
    const release = jest.fn(async (): Promise<void> => {
      releaseStarted.resolve(undefined);
      await cleanup.promise;
    });
    const releasePresetServices = jest.fn(async (): Promise<void> => undefined);
    const lateEntry = makeEntry(metadata, release, releasePresetServices);
    const create = jest.fn(() => {
      factoryStarted.resolve(undefined);
      return result.promise;
    });
    const queuedCreate = jest.fn(async () => makeEntry(queuedMetadata));
    const pending = graphileBuildFlights.getOrCreate(metadata, create);
    const queued = graphileBuildFlights.getOrCreate(queuedMetadata, queuedCreate);
    const activeFailure = expect(pending).rejects.toMatchObject({ code: 'SCHEMA_BUILD_STUCK' });
    const queuedFailure = expect(queued).rejects.toMatchObject({ code: 'SCHEMA_BUILD_STUCK' });

    await factoryStarted.promise;
    expect(graphileBuildCoordinator.stats).toMatchObject({ active: 1, queued: 1, state: 'open' });
    expect(getCacheStats().reserved).toBe(1);
    await jest.advanceTimersByTimeAsync(10);
    await Promise.all([activeFailure, queuedFailure]);
    expect(graphileBuildCoordinator.stats).toMatchObject({ active: 1, queued: 0, state: 'stuck' });
    expect(queuedCreate).not.toHaveBeenCalled();

    result.resolve(lateEntry);
    await releaseStarted.promise;
    expect(graphileCache.peek(metadata.cacheKey)).toBeUndefined();
    expect(getCacheStats().reserved).toBe(1);
    expect(graphileBuildCoordinator.stats.active).toBe(1);
    expect(queuedCreate).not.toHaveBeenCalled();

    const closeBeforeCleanup = closeGraphileBuilds(20);
    await jest.advanceTimersByTimeAsync(20);
    await expect(closeBeforeCleanup).resolves.toBe(false);
    expect(graphileBuildCoordinator.stats).toMatchObject({ active: 1, state: 'stuck' });
    expect(() => reopenGraphileBuilds()).toThrow(expect.objectContaining({ code: 'SCHEMA_BUILD_STUCK' }));

    const pgClose = jest.spyOn(pgCache, 'close');
    const closeAllFailure = expect(closeAllCaches()).rejects.toMatchObject({
      code: 'SCHEMA_BUILD_DRAIN_TIMEOUT'
    });
    await jest.advanceTimersByTimeAsync(20);
    await closeAllFailure;
    expect(pgClose).not.toHaveBeenCalled();

    cleanup.resolve(undefined);
    const closeAfterCleanup = closeGraphileBuilds(20);
    await expect(closeAfterCleanup).resolves.toBe(true);
    expect(release).toHaveBeenCalledTimes(1);
    expect(releasePresetServices).toHaveBeenCalledTimes(1);
    expect(graphileCache.peek(metadata.cacheKey)).toBeUndefined();
    expect(graphileBuildCoordinator.stats).toMatchObject({ active: 0, queued: 0, state: 'stuck' });
    expect(getCacheStats().reserved).toBe(0);
    expect(() => reopenGraphileBuilds()).toThrow(expect.objectContaining({ code: 'SCHEMA_BUILD_STUCK' }));
    expect(pgClose).not.toHaveBeenCalled();
    pgClose.mockRestore();
  });
});
