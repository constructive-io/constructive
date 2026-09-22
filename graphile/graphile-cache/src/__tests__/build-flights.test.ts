import type { GraphileCacheEntry } from '../graphile-cache';
import {
  GraphileBuildFlights,
  type GraphileBuildFlightMetadata,
  type GraphileBuildFlightsOptions
} from '../build-flights';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const makeMetadata = (
  cacheKey: string,
  overrides: Partial<GraphileBuildFlightMetadata> = {}
): GraphileBuildFlightMetadata => ({
  cacheKey,
  serviceKey: 'service-a',
  poolKey: 'pool-a',
  databaseId: 'db-a',
  ...overrides
});

const makeEntry = (cacheKey: string): GraphileCacheEntry => ({
  cacheKey,
  createdAt: Date.now()
} as GraphileCacheEntry);

const makeFlights = (
  overrides: Partial<GraphileBuildFlightsOptions> = {}
): {
  flights: GraphileBuildFlights;
  cache: Map<string, GraphileCacheEntry>;
  options: GraphileBuildFlightsOptions;
} => {
  const cache = new Map<string, GraphileCacheEntry>();
  const options: GraphileBuildFlightsOptions = {
    get: (key) => cache.get(key),
    build: async (metadata, create, assertCurrent) => {
      assertCurrent();
      const entry = await create();
      assertCurrent();
      cache.set(metadata.cacheKey, entry);
      return entry;
    },
    ...overrides
  };
  return { flights: new GraphileBuildFlights(options), cache, options };
};

describe('GraphileBuildFlights', () => {
  it('shares the exact promise and starts one factory for the same key', async () => {
    const buildResult = deferred<GraphileCacheEntry>();
    const create = jest.fn(() => buildResult.promise);
    const { flights } = makeFlights();
    const metadata = makeMetadata('key-a');

    const first = flights.getOrCreate(metadata, create);
    const second = flights.getOrCreate(metadata, create);
    expect(second).toBe(first);
    expect(flights.pendingKeys).toEqual(['key-a']);
    expect(flights.pendingCount).toBe(1);

    await flushPromises();
    expect(create).toHaveBeenCalledTimes(1);

    const entry = makeEntry('key-a');
    buildResult.resolve(entry);
    await expect(first).resolves.toBe(entry);
    await flushPromises();
    expect(flights.pendingCount).toBe(0);
    expect(flights.activeTaskCount).toBe(0);
    expect(flights.activeScopeCount).toBe(0);
  });

  it('starts different exact keys independently', async () => {
    const results = new Map<string, Deferred<GraphileCacheEntry>>();
    const createFor = (key: string) => {
      const result = deferred<GraphileCacheEntry>();
      results.set(key, result);
      return jest.fn(() => result.promise);
    };
    const { flights } = makeFlights();
    const createA = createFor('key-a');
    const createB = createFor('key-b');
    const first = flights.getOrCreate(makeMetadata('key-a'), createA);
    const second = flights.getOrCreate(makeMetadata('key-b'), createB);

    expect(first).not.toBe(second);
    await flushPromises();
    expect(createA).toHaveBeenCalledTimes(1);
    expect(createB).toHaveBeenCalledTimes(1);

    const entryA = makeEntry('key-a');
    const entryB = makeEntry('key-b');
    results.get('key-a')?.resolve(entryA);
    results.get('key-b')?.resolve(entryB);
    await expect(first).resolves.toBe(entryA);
    await expect(second).resolves.toBe(entryB);
  });

  it('fences asynchronous preparation before cache lookup or factory allocation', async () => {
    const get = jest.fn((_key: string): GraphileCacheEntry | undefined => undefined);
    const build = jest.fn(async (
      _metadata: GraphileBuildFlightMetadata,
      create: () => Promise<GraphileCacheEntry>
    ) => create());
    const flights = new GraphileBuildFlights({ get, build });
    const scope = flights.capture({
      serviceKey: 'service-a',
      poolKey: 'pool-a',
      databaseId: 'db-a'
    });
    const create = jest.fn().mockResolvedValue(makeEntry('key-a'));
    const compute = deferred<void>();
    const preparation = (async () => {
      await compute.promise;
      return flights.getOrCreate(makeMetadata('key-a'), create, scope);
    })();

    expect(flights.invalidate((metadata) => metadata.poolKey === 'pool-a')).toBe(1);
    compute.resolve(undefined);
    await expect(preparation).rejects.toMatchObject({ code: 'SCHEMA_BUILD_INVALIDATED' });
    expect(get).not.toHaveBeenCalled();
    expect(build).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    scope.release();
  });

  it('keeps a newer same-key flight when an invalidated generation finishes late', async () => {
    const firstBuild = deferred<GraphileCacheEntry>();
    const secondBuild = deferred<GraphileCacheEntry>();
    const builds = [firstBuild, secondBuild];
    const createOld = jest.fn(() => firstBuild.promise);
    const createNew = jest.fn(() => secondBuild.promise);
    const { flights, cache } = makeFlights();
    const metadata = makeMetadata('key-a');

    const oldPromise = flights.getOrCreate(metadata, createOld);
    await flushPromises();
    expect(createOld).toHaveBeenCalledTimes(1);

    expect(flights.invalidate((scope) => scope.serviceKey === 'service-a')).toBe(1);
    await expect(oldPromise).rejects.toMatchObject({ code: 'SCHEMA_BUILD_INVALIDATED' });

    const newPromise = flights.getOrCreate(metadata, createNew);
    await flushPromises();
    expect(createNew).toHaveBeenCalledTimes(1);
    expect(flights.pendingKeys).toEqual(['key-a']);

    const lateEntry = makeEntry('key-a');
    builds[0].resolve(lateEntry);
    await flushPromises();
    expect(cache.has('key-a')).toBe(false);
    expect(flights.pendingKeys).toEqual(['key-a']);

    const currentEntry = makeEntry('key-a');
    builds[1].resolve(currentEntry);
    await expect(newPromise).resolves.toBe(currentEntry);
    expect(cache.get('key-a')).toBe(currentEntry);
    expect(flights.pendingCount).toBe(0);
  });

  it('keeps the flight scope active after its preparation scope is released', async () => {
    const buildResult = deferred<GraphileCacheEntry>();
    const create = jest.fn(() => buildResult.promise);
    const { flights, cache } = makeFlights();
    const scope = flights.capture({ serviceKey: 'service-a', poolKey: 'pool-a' });
    const promise = flights.getOrCreate(makeMetadata('key-a'), create, scope);
    scope.release();
    await flushPromises();
    expect(create).toHaveBeenCalledTimes(1);
    expect(flights.activeScopeCount).toBe(1);

    expect(flights.invalidate((metadata) => metadata.serviceKey === 'service-a')).toBe(1);
    await expect(promise).rejects.toMatchObject({ code: 'SCHEMA_BUILD_INVALIDATED' });
    buildResult.resolve(makeEntry('key-a'));
    await flushPromises();

    expect(cache.has('key-a')).toBe(false);
    expect(flights.activeScopeCount).toBe(0);
    expect(flights.activeTaskCount).toBe(0);
  });

  it('shares build failures without retrying and allows a later request to retry', async () => {
    const failure = new Error('schema build failed');
    const firstBuild = deferred<GraphileCacheEntry>();
    const retryBuild = deferred<GraphileCacheEntry>();
    const createFirst = jest.fn(() => firstBuild.promise);
    const createRetry = jest.fn(() => retryBuild.promise);
    const { flights } = makeFlights();
    const metadata = makeMetadata('key-a');

    const first = flights.getOrCreate(metadata, createFirst);
    const coalesced = flights.getOrCreate(metadata, createRetry);
    expect(coalesced).toBe(first);
    await flushPromises();
    firstBuild.reject(failure);
    await expect(first).rejects.toBe(failure);
    await expect(coalesced).rejects.toBe(failure);
    expect(createFirst).toHaveBeenCalledTimes(1);
    expect(createRetry).not.toHaveBeenCalled();

    const later = flights.getOrCreate(metadata, createRetry);
    await flushPromises();
    expect(createRetry).toHaveBeenCalledTimes(1);
    const entry = makeEntry('key-a');
    retryBuild.resolve(entry);
    await expect(later).resolves.toBe(entry);
  });

  it('rejects callers on close while drain waits for build cleanup', async () => {
    const buildResult = deferred<GraphileCacheEntry>();
    const cleanup = deferred<void>();
    const { flights } = makeFlights({
      build: async (_metadata, create, assertCurrent) => {
        assertCurrent();
        const entry = await create();
        await cleanup.promise;
        assertCurrent();
        return entry;
      }
    });
    const scope = flights.capture({ serviceKey: 'service-a', poolKey: 'pool-a' });
    const promise = flights.getOrCreate(
      makeMetadata('key-a'),
      () => buildResult.promise,
      scope
    );
    await flushPromises();

    flights.close();
    await expect(promise).rejects.toMatchObject({ code: 'SCHEMA_BUILDS_CLOSED' });
    expect(flights.isClosed).toBe(true);
    expect(flights.pendingCount).toBe(0);

    let drained = false;
    const drain = flights.drain().then(() => {
      drained = true;
    });
    buildResult.resolve(makeEntry('key-a'));
    await flushPromises();
    expect(drained).toBe(false);
    cleanup.resolve(undefined);
    await drain;

    expect(flights.activeTaskCount).toBe(0);
    expect(flights.reopen()).toBe(false);
    scope.release();
    expect(flights.reopen()).toBe(true);
    const closed = flights.getOrCreate(makeMetadata('key-b'), () =>
      Promise.resolve(makeEntry('key-b'))
    );
    await expect(closed).resolves.toMatchObject({ cacheKey: 'key-b' });
  });

  it('releases preparation and completed flight scopes without retaining history', async () => {
    const { flights } = makeFlights();
    const scope = flights.capture({ serviceKey: 'service-a', poolKey: 'pool-a' });
    expect(flights.activeScopeCount).toBe(1);
    scope.release();
    scope.release();
    expect(flights.activeScopeCount).toBe(0);

    const entry = makeEntry('key-a');
    await expect(
      flights.getOrCreate(makeMetadata('key-a'), async () => entry)
    ).resolves.toBe(entry);
    await flushPromises();
    expect(flights.pendingCount).toBe(0);
    expect(flights.pendingKeys).toEqual([]);
    expect(flights.activeTaskCount).toBe(0);
    expect(flights.activeScopeCount).toBe(0);
  });

  it('returns a resident cache hit without allocating a build', async () => {
    const entry = makeEntry('key-a');
    const get = jest.fn(() => entry);
    const build = jest.fn(async (
      _metadata: GraphileBuildFlightMetadata,
      create: () => Promise<GraphileCacheEntry>
    ) => create());
    const flights = new GraphileBuildFlights({ get, build });
    const create = jest.fn().mockResolvedValue(entry);

    await expect(flights.getOrCreate(makeMetadata('key-a'), create)).resolves.toBe(entry);
    expect(get).toHaveBeenCalledWith('key-a');
    expect(build).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(flights.pendingCount).toBe(0);
    expect(flights.activeScopeCount).toBe(0);
  });
});
