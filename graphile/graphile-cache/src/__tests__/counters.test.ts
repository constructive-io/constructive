import {
  cacheCounters,
  clearMatchingEntries,
  getCacheConfig,
  getCacheCounters,
  graphileCache,
  type GraphileCacheEntry
} from '../graphile-cache';

/**
 * Counter instrumentation regression tests. The counters are process-global and
 * mutable, so every assertion is a DELTA against a snapshot captured immediately
 * before the action — robust to test ordering and to fire-and-forget disposals from
 * other suites. The eviction and disposal increments happen synchronously inside
 * graphileCache.delete() (the dispose callback and the pre-await head of disposeEntry),
 * so no tick is needed except for the async drain-timeout path.
 */

const tick = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

const makeEntry = (releaseDelayMs = 0): GraphileCacheEntry => {
  const release = jest.fn(
    () => new Promise<void>((resolve) => setTimeout(resolve, releaseDelayMs))
  );
  return {
    pgl: { release } as unknown as GraphileCacheEntry['pgl'],
    serv: {} as GraphileCacheEntry['serv'],
    handler: {} as GraphileCacheEntry['handler'],
    // Never .listen()ed in production; close() invokes its callback synchronously here.
    httpServer: { close: (cb: () => void) => cb() } as unknown as GraphileCacheEntry['httpServer'],
    cacheKey: 'mock',
    createdAt: Date.now()
  };
};

describe('cacheCounters increment on eviction/disposal', () => {
  afterEach(async () => {
    graphileCache.clear();
    await tick();
  });

  it('counts an LRU eviction (fresh entry, plain delete) and a disposal', () => {
    const before = getCacheCounters();
    const key = 'counter-lru-1';
    graphileCache.set(key, makeEntry(0));
    graphileCache.delete(key); // fresh + not manual → reason 'lru'; disposeEntry runs

    const after = getCacheCounters();
    expect(after.evictions.lru).toBe(before.evictions.lru + 1);
    expect(after.disposals).toBe(before.disposals + 1);
  });

  it('counts a TTL eviction when the entry is older than the configured ttl', () => {
    const before = getCacheCounters();
    const key = 'counter-ttl-1';
    const entry = makeEntry(0);
    // Backdate our own createdAt beyond the idle-ttl so getEvictionReason returns 'ttl'.
    entry.createdAt = Date.now() - getCacheConfig().ttl - 1_000;
    graphileCache.set(key, entry);
    graphileCache.delete(key);

    const after = getCacheCounters();
    expect(after.evictions.ttl).toBe(before.evictions.ttl + 1);
  });

  it('counts a manual eviction via clearMatchingEntries', () => {
    const before = getCacheCounters();
    graphileCache.set('counter-manual-1', makeEntry(0));
    const cleared = clearMatchingEntries(/^counter-manual-/);

    expect(cleared).toBe(1);
    const after = getCacheCounters();
    expect(after.evictions.manual).toBe(before.evictions.manual + 1);
  });
});

describe('cacheCounters.drainTimeouts', () => {
  const prev = process.env.GRAPHILE_CACHE_DRAIN_TIMEOUT_MS;
  afterEach(async () => {
    if (prev === undefined) delete process.env.GRAPHILE_CACHE_DRAIN_TIMEOUT_MS;
    else process.env.GRAPHILE_CACHE_DRAIN_TIMEOUT_MS = prev;
    graphileCache.clear();
    await tick();
  });

  it('increments when disposal drains past the timeout with a request still in flight', async () => {
    process.env.GRAPHILE_CACHE_DRAIN_TIMEOUT_MS = '1'; // one 100ms poll cycle, then give up
    const before = getCacheCounters();
    const key = 'counter-drain-1';
    const entry = makeEntry(0);
    entry.inflight = 1; // never drops → drain loop hits the timeout branch

    graphileCache.set(key, entry);
    graphileCache.delete(key); // fire-and-forget disposeEntry begins draining

    await tick(250); // allow the poll cycle + timeout to elapse

    const after = getCacheCounters();
    expect(after.drainTimeouts).toBe(before.drainTimeouts + 1);
    // Disposal still proceeds after the drain timeout.
    expect((entry.pgl as unknown as { release: jest.Mock }).release).toHaveBeenCalledTimes(1);
  });
});

describe('getCacheCounters snapshot isolation', () => {
  it('returns a deep copy that cannot mutate the live counters', () => {
    const before = getCacheCounters();
    const snapshot = getCacheCounters();
    snapshot.disposals += 1_000;
    snapshot.evictions.lru += 1_000;
    snapshot.drainTimeouts += 1_000;

    const after = getCacheCounters();
    expect(after.disposals).toBe(before.disposals);
    expect(after.evictions.lru).toBe(before.evictions.lru);
    expect(after.drainTimeouts).toBe(before.drainTimeouts);
    // Sanity: the live object is the same instance across reads.
    expect(cacheCounters.disposals).toBe(after.disposals);
  });
});
