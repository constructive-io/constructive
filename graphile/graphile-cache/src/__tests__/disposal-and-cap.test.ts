import { graphileCache, getCacheConfig, type GraphileCacheEntry } from '../graphile-cache';

/**
 * Regression tests for the schema-builder OOM fix.
 *
 * 1. Disposal guard is entry-scoped, not key-scoped. The previous string-keyed guard
 *    skipped pgl.release() for a rebuilt entry that shared a key with an entry still
 *    mid-release (the "same-key disposal race"). These tests pin the corrected behaviour:
 *    every distinct entry is released exactly once, while the SAME entry is never
 *    double-disposed.
 * 2. getCacheConfig honours GRAPHILE_CACHE_MAX and otherwise returns a heap-aware default
 *    bounded to a sane range (a count-only default of 50 × ~0.5GB/instance was the OOM).
 */

const tick = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

const makeEntry = (releaseDelayMs = 0): GraphileCacheEntry => {
  const release = jest.fn(
    () => new Promise<void>((resolve) => setTimeout(resolve, releaseDelayMs)),
  );
  return {
    pgl: { release } as unknown as GraphileCacheEntry['pgl'],
    serv: {} as GraphileCacheEntry['serv'],
    handler: {} as GraphileCacheEntry['handler'],
    // Never .listen()ed in production; close() invokes its callback synchronously here.
    httpServer: { close: (cb: () => void) => cb() } as unknown as GraphileCacheEntry['httpServer'],
    cacheKey: 'mock',
    createdAt: Date.now(),
  };
};

describe('graphile-cache disposal guard (same-key race)', () => {
  it('disposes a rebuilt entry on the same key while a prior entry is mid-release', async () => {
    const key = 'race-key-1';
    const a = makeEntry(40); // a.release() stays pending while b is disposed
    const b = makeEntry(0);

    graphileCache.set(key, a);
    graphileCache.delete(key); // -> disposeEntry(a) begins, a.release() in flight
    graphileCache.set(key, b); // key was free; inserts b
    graphileCache.delete(key); // -> disposeEntry(b) MUST NOT be skipped by the guard

    await tick(120);

    // The bug: the old string-keyed guard left `key` parked while a.release() was pending,
    // so b.release() was never called (would be 0 here).
    expect((a.pgl as unknown as { release: jest.Mock }).release).toHaveBeenCalledTimes(1);
    expect((b.pgl as unknown as { release: jest.Mock }).release).toHaveBeenCalledTimes(1);
  });

  it('never disposes the same entry twice', async () => {
    const key = 'race-key-2';
    const a = makeEntry(0);

    graphileCache.set(key, a);
    graphileCache.delete(key); // dispose a
    graphileCache.set(key, a); // re-insert the SAME entry object
    graphileCache.delete(key); // dispose again -> guard must skip (already disposed)

    await tick();

    expect((a.pgl as unknown as { release: jest.Mock }).release).toHaveBeenCalledTimes(1);
  });
});

describe('graphile-cache heap-aware capacity', () => {
  const prev = process.env.GRAPHILE_CACHE_MAX;
  afterEach(() => {
    if (prev === undefined) delete process.env.GRAPHILE_CACHE_MAX;
    else process.env.GRAPHILE_CACHE_MAX = prev;
  });

  it('honours an explicit GRAPHILE_CACHE_MAX', () => {
    process.env.GRAPHILE_CACHE_MAX = '7';
    expect(getCacheConfig().max).toBe(7);
  });

  it('falls back to a bounded heap-aware default when unset', () => {
    delete process.env.GRAPHILE_CACHE_MAX;
    const { max } = getCacheConfig();
    // Each cached instance retains ~0.5GB, so the default must be far below the legacy 50
    // on a normal heap, but always within [3, 50].
    expect(max).toBeGreaterThanOrEqual(3);
    expect(max).toBeLessThanOrEqual(50);
  });

  it('ignores a non-numeric GRAPHILE_CACHE_MAX (falls back to heap-aware default)', () => {
    process.env.GRAPHILE_CACHE_MAX = 'not-a-number';
    const { max } = getCacheConfig();
    expect(max).toBeGreaterThanOrEqual(3);
    expect(max).toBeLessThanOrEqual(50);
  });
});
