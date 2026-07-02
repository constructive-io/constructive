import { EventEmitter } from 'events';
import {
  ensureCacheHeadroom,
  getCacheConfig,
  graphileCache,
  type GraphileCacheEntry,
  invokeEntryHandler,
} from '../graphile-cache';

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

// A minimal express-like response: an EventEmitter so invokeEntryHandler can hook
// 'finish'/'close', cast to the express type it expects.
const makeRes = () => new EventEmitter() as unknown as Parameters<typeof invokeEntryHandler>[2];
const fakeReq = {} as Parameters<typeof invokeEntryHandler>[1];
const fakeNext = (() => undefined) as Parameters<typeof invokeEntryHandler>[3];

describe('invokeEntryHandler in-flight refcounting', () => {
  it('increments while serving and releases exactly once across finish+close', () => {
    const entry = makeEntry();
    const handler = jest.fn();
    entry.handler = handler as unknown as GraphileCacheEntry['handler'];

    const res = makeRes();
    expect(invokeEntryHandler(entry, fakeReq, res, fakeNext)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(entry.inflight).toBe(1);

    (res as unknown as EventEmitter).emit('finish');
    expect(entry.inflight).toBe(0);
    // 'close' always follows 'finish' in Node; the release must be idempotent.
    (res as unknown as EventEmitter).emit('close');
    expect(entry.inflight).toBe(0);
  });

  it('refuses a disposing entry without invoking the handler', () => {
    const entry = makeEntry();
    const handler = jest.fn();
    entry.handler = handler as unknown as GraphileCacheEntry['handler'];
    entry.disposing = true;

    expect(invokeEntryHandler(entry, fakeReq, makeRes(), fakeNext)).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('disposeEntry drains in-flight requests before release', () => {
  it('waits for inflight to reach 0, then releases exactly once', async () => {
    const key = 'drain-key-1';
    const entry = makeEntry(0);
    entry.inflight = 1; // simulate a request mid-flight

    graphileCache.set(key, entry);
    graphileCache.delete(key); // disposal starts; must poll instead of releasing

    await tick(120); // one poll cycle elapsed, request still in flight
    expect((entry.pgl as unknown as { release: jest.Mock }).release).not.toHaveBeenCalled();

    entry.inflight = 0; // request completes
    await tick(250); // allow the next poll cycle to observe it

    expect((entry.pgl as unknown as { release: jest.Mock }).release).toHaveBeenCalledTimes(1);
  });
});

describe('ensureCacheHeadroom', () => {
  const prevMax = process.env.GRAPHILE_CACHE_MAX;
  afterEach(() => {
    if (prevMax === undefined) delete process.env.GRAPHILE_CACHE_MAX;
    else process.env.GRAPHILE_CACHE_MAX = prevMax;
    graphileCache.clear();
  });

  it('evicts least-recently-used entries until a build slot is free', async () => {
    process.env.GRAPHILE_CACHE_MAX = '2';
    const a = makeEntry(0);
    const b = makeEntry(0);
    graphileCache.set('headroom-a', a);
    graphileCache.set('headroom-b', b);
    graphileCache.get('headroom-a'); // touch a → b becomes LRU-oldest

    const evicted = ensureCacheHeadroom(1);

    expect(evicted).toBe(1);
    expect(graphileCache.has('headroom-a')).toBe(true);
    expect(graphileCache.has('headroom-b')).toBe(false);
    await tick(); // let the fire-and-forget disposal settle before clear()
  });

  it('no-ops when under capacity', () => {
    process.env.GRAPHILE_CACHE_MAX = '5';
    graphileCache.set('headroom-c', makeEntry(0));
    expect(ensureCacheHeadroom(1)).toBe(0);
    expect(graphileCache.has('headroom-c')).toBe(true);
  });
});
