import {
  clearGraphileCache,
  clearGraphileEntriesForDatabase,
  clearGraphileEntriesForPool,
  clearGraphileEntriesForService,
  configureGraphileAdmission,
  graphileBuildFlights,
  graphileCache,
  waitForEntryDisposal,
  type GraphileCacheEntry
} from '../graphile-cache';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

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

beforeAll(() => configureGraphileAdmission({ max: 4, buildReserveBytes: 0 }));

afterEach(async () => {
  await clearGraphileCache();
});

describe('Graphile build flight publication', () => {
  it('returns one shared promise and invokes one factory for an exact key', async () => {
    const metadata = makeMetadata('flight-shared-promise');
    const result = deferred<GraphileCacheEntry>();
    const create = jest.fn(() => result.promise);
    const first = graphileBuildFlights.getOrCreate(metadata, create);
    const second = graphileBuildFlights.getOrCreate(metadata, jest.fn());

    expect(second).toBe(first);
    expect(graphileBuildFlights.pendingKeys).toContain(metadata.cacheKey);
    await flushPromises();
    expect(create).toHaveBeenCalledTimes(1);

    const entry = makeEntry(metadata);
    result.resolve(entry);
    await expect(first).resolves.toBe(entry);
    expect(graphileCache.get(metadata.cacheKey)).toBe(entry);
  });

  const invalidators: Array<{
    name: string;
    invalidate(metadata: BuildMetadata): void;
  }> = [
    {
      name: 'service',
      invalidate: (metadata) => { clearGraphileEntriesForService(metadata.serviceKey); }
    },
    {
      name: 'database',
      invalidate: (metadata) => { clearGraphileEntriesForDatabase(metadata.databaseId); }
    },
    {
      name: 'pool',
      invalidate: (metadata) => { clearGraphileEntriesForPool(metadata.poolKey); }
    },
    {
      name: 'cache delete',
      invalidate: (metadata) => { graphileCache.delete(metadata.cacheKey); }
    },
    {
      name: 'cache clear',
      invalidate: () => { graphileCache.clear(); }
    }
  ];

  it.each(invalidators)(
    '$name invalidation fences a pending flight and disposes its late entry',
    async ({ name, invalidate }) => {
      const metadata = makeMetadata(`flight-invalidate-${name.replaceAll(' ', '-')}`);
      const result = deferred<GraphileCacheEntry>();
      const create = jest.fn(() => result.promise);
      const releaseStarted = deferred<void>();
      const release = jest.fn(async (): Promise<void> => {
        releaseStarted.resolve(undefined);
      });
      const releasePresetServices = jest.fn(async (): Promise<void> => undefined);
      const entry = makeEntry(metadata, release, releasePresetServices);
      const pending = graphileBuildFlights.getOrCreate(metadata, create);
      const rejection = expect(pending).rejects.toMatchObject({ code: 'SCHEMA_BUILD_INVALIDATED' });

      await flushPromises();
      expect(create).toHaveBeenCalledTimes(1);
      expect(graphileBuildFlights.pendingKeys).toContain(metadata.cacheKey);

      invalidate(metadata);
      expect(graphileBuildFlights.pendingKeys).not.toContain(metadata.cacheKey);
      await rejection;

      result.resolve(entry);
      await releaseStarted.promise;
      await waitForEntryDisposal(entry);
      await flushPromises();
      expect(graphileCache.peek(metadata.cacheKey)).toBeUndefined();
      expect(release).toHaveBeenCalledTimes(1);
      expect(releasePresetServices).toHaveBeenCalledTimes(1);
      expect(graphileBuildFlights.pendingKeys).not.toContain(metadata.cacheKey);
    }
  );

  it('does not let an old same-key build publish or remove its replacement', async () => {
    const metadata = makeMetadata('flight-replacement-generation');
    const oldResult = deferred<GraphileCacheEntry>();
    const replacementResult = deferred<GraphileCacheEntry>();
    const oldCreate = jest.fn(() => oldResult.promise);
    const replacementFactoryStarted = deferred<void>();
    const replacementCreate = jest.fn(() => {
      replacementFactoryStarted.resolve(undefined);
      return replacementResult.promise;
    });
    const oldReleaseStarted = deferred<void>();
    const oldRelease = jest.fn(async (): Promise<void> => {
      oldReleaseStarted.resolve(undefined);
    });
    const oldReleasePresetServices = jest.fn(async (): Promise<void> => undefined);
    const oldEntry = makeEntry(metadata, oldRelease, oldReleasePresetServices);
    const replacementEntry = makeEntry(metadata);

    const oldFlight = graphileBuildFlights.getOrCreate(metadata, oldCreate);
    const oldRejection = expect(oldFlight).rejects.toMatchObject({ code: 'SCHEMA_BUILD_INVALIDATED' });
    await flushPromises();
    expect(oldCreate).toHaveBeenCalledTimes(1);

    clearGraphileEntriesForService(metadata.serviceKey);
    await oldRejection;

    const replacement = graphileBuildFlights.getOrCreate(metadata, replacementCreate);
    await flushPromises();
    expect(graphileBuildFlights.pendingKeys).toEqual([metadata.cacheKey]);

    oldResult.resolve(oldEntry);
    await oldReleaseStarted.promise;
    await waitForEntryDisposal(oldEntry);
    await flushPromises();
    expect(graphileCache.peek(metadata.cacheKey)).toBeUndefined();
    expect(graphileBuildFlights.pendingKeys).toEqual([metadata.cacheKey]);
    expect(oldRelease).toHaveBeenCalledTimes(1);
    expect(oldReleasePresetServices).toHaveBeenCalledTimes(1);

    await replacementFactoryStarted.promise;
    expect(replacementCreate).toHaveBeenCalledTimes(1);
    replacementResult.resolve(replacementEntry);
    await expect(replacement).resolves.toBe(replacementEntry);
    expect(graphileCache.get(metadata.cacheKey)).toBe(replacementEntry);
    expect(graphileBuildFlights.pendingKeys).toEqual([]);
  });

  it('invalidates asynchronous preparation before a resident cache hit or factory call', async () => {
    const metadata = makeMetadata('flight-invalidated-preparation');
    const resident = makeEntry({
      ...metadata,
      serviceKey: 'resident-service',
      databaseId: 'resident-database',
      poolKey: 'resident-pool'
    });
    graphileCache.set(metadata.cacheKey, resident);
    const scope = graphileBuildFlights.capture({
      serviceKey: metadata.serviceKey,
      databaseId: metadata.databaseId,
      poolKey: metadata.poolKey
    });
    const compute = deferred<void>();
    const create = jest.fn(async () => makeEntry(metadata));
    const preparation = (async () => {
      await compute.promise;
      return graphileBuildFlights.getOrCreate(metadata, create, scope);
    })();

    graphileBuildFlights.invalidate((current) => current.serviceKey === metadata.serviceKey);
    compute.resolve(undefined);
    await expect(preparation).rejects.toMatchObject({ code: 'SCHEMA_BUILD_INVALIDATED' });
    expect(create).not.toHaveBeenCalled();
    expect(graphileCache.peek(metadata.cacheKey)).toBe(resident);
    expect(graphileBuildFlights.pendingKeys).not.toContain(metadata.cacheKey);
    scope.release();
  });

  it('waits for invalidated build cleanup before clearGraphileCache resolves', async () => {
    const metadata = makeMetadata('flight-clear-drain');
    const result = deferred<GraphileCacheEntry>();
    const releaseGate = deferred<void>();
    const releaseStarted = deferred<void>();
    const release = jest.fn(async (): Promise<void> => {
      releaseStarted.resolve(undefined);
      await releaseGate.promise;
    });
    const releasePresetServices = jest.fn(async (): Promise<void> => undefined);
    const entry = makeEntry(metadata, release, releasePresetServices);
    const create = jest.fn(() => result.promise);
    const pending = graphileBuildFlights.getOrCreate(metadata, create);
    const rejection = expect(pending).rejects.toMatchObject({ code: 'SCHEMA_BUILD_INVALIDATED' });
    await flushPromises();
    expect(create).toHaveBeenCalledTimes(1);

    let cleared = false;
    const clearing = clearGraphileCache().then(() => {
      cleared = true;
    });
    expect(graphileBuildFlights.pendingKeys).not.toContain(metadata.cacheKey);
    await rejection;
    result.resolve(entry);
    await releaseStarted.promise;
    await flushPromises();
    expect(cleared).toBe(false);
    expect(graphileCache.peek(metadata.cacheKey)).toBeUndefined();

    releaseGate.resolve(undefined);
    await clearing;
    expect(cleared).toBe(true);
    expect(release).toHaveBeenCalledTimes(1);
    expect(releasePresetServices).toHaveBeenCalledTimes(1);
  });
});
