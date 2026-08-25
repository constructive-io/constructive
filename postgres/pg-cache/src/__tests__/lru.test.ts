// Locks cache ownership and shutdown behavior: disposal is awaited, concurrent
// close callers share one cleanup, and a manager may be reused after a complete
// close for explicit restart/provisioning flows.

import pg from 'pg';

import { PgPoolCacheManager } from '../lru';

// Minimal mock — we only need pool.end() and pool.ended
const createMockPool = (): pg.Pool => {
  let ended = false;
  return {
    get ended() {
      return ended;
    },
    end: jest.fn(async () => {
      ended = true;
    }),
  } as unknown as pg.Pool;
};

describe('PgPoolCacheManager', () => {
  let cache: PgPoolCacheManager;

  beforeEach(() => {
    cache = new PgPoolCacheManager();
  });

  afterEach(async () => {
    // Ensure all pools are cleaned up even if a test fails mid-way
    try {
      await cache.close();
    } catch {
      /* already closed */
    }
  });

  it('stores and retrieves a pool', () => {
    const pool = createMockPool();
    cache.set('key1', pool);
    expect(cache.get('key1')).toBe(pool);
    expect(cache.has('key1')).toBe(true);
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);
  });

  describe('configuration', () => {
    it('uses env-var defaults (max=50) when no overrides given', () => {
      expect(cache.config.max).toBe(50);
    });

    it('accepts constructor overrides', () => {
      const custom = new PgPoolCacheManager({ max: 5 });
      expect(custom.config.max).toBe(5);
      // cleanup
      custom.close();
    });

    it('reads PG_CACHE_MAX from environment', () => {
      const orig = process.env.PG_CACHE_MAX;
      try {
        process.env.PG_CACHE_MAX = '100';
        const envCache = new PgPoolCacheManager();
        expect(envCache.config.max).toBe(100);
        envCache.close();
      } finally {
        if (orig !== undefined) process.env.PG_CACHE_MAX = orig;
        else delete process.env.PG_CACHE_MAX;
      }
    });

    it('evicts when max is exceeded', async () => {
      const small = new PgPoolCacheManager({ max: 2 });
      const pool1 = createMockPool();
      const pool2 = createMockPool();
      const pool3 = createMockPool();

      small.set('a', pool1);
      small.set('b', pool2);
      small.set('c', pool3); // should evict 'a'

      await small.waitForDisposals();

      expect(small.has('a')).toBe(false);
      expect(pool1.end).toHaveBeenCalledTimes(1);
      expect(small.has('b')).toBe(true);
      expect(small.has('c')).toBe(true);

      await small.close();
    });
  });

  describe('close() lifecycle', () => {
    it('set() after close() succeeds (cache re-opens for restart)', async () => {
      const pool1 = createMockPool();
      cache.set('key1', pool1);

      await cache.close();

      // close() re-opens the cache so provisioning/restart can continue
      const pool2 = createMockPool();
      expect(() => cache.set('key2', pool2)).not.toThrow();
      expect(cache.get('key2')).toBe(pool2);
    });

    it('get() after close() returns undefined with warning', async () => {
      const pool = createMockPool();
      cache.set('key1', pool);

      await cache.close();

      expect(cache.get('key1')).toBeUndefined();
    });

    it('double close() is idempotent', async () => {
      const pool = createMockPool();
      cache.set('key1', pool);

      await cache.close();
      await cache.close(); // should not throw

      expect(pool.end).toHaveBeenCalledTimes(1);
    });

    it('concurrent close callers await the same cleanup', async () => {
      const pool = createMockPool();
      let releaseCleanup!: () => void;
      const cleanupGate = new Promise<void>((resolve) => {
        releaseCleanup = resolve;
      });
      cache.set('key1', pool);
      cache.registerCleanupCallback(() => cleanupGate);

      let secondResolved = false;
      const first = cache.close();
      const second = cache.close().then(() => {
        secondResolved = true;
      });
      await Promise.resolve();

      expect(secondResolved).toBe(false);
      releaseCleanup();
      await Promise.all([first, second]);
      expect(pool.end).toHaveBeenCalledTimes(1);
    });

    it('close() disposes all pools', async () => {
      const pool1 = createMockPool();
      const pool2 = createMockPool();
      cache.set('key1', pool1);
      cache.set('key2', pool2);

      await cache.close();

      expect(pool1.end).toHaveBeenCalledTimes(1);
      expect(pool2.end).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup callbacks', () => {
    it('fires callback on close()', async () => {
      const pool = createMockPool();
      cache.set('key1', pool);

      const callback = jest.fn();
      cache.registerCleanupCallback(callback);

      await cache.close();

      expect(callback).toHaveBeenCalledWith('key1');
    });

    it('unregister prevents callback from firing', async () => {
      const pool = createMockPool();
      cache.set('key1', pool);

      const callback = jest.fn();
      const unregister = cache.registerCleanupCallback(callback);
      unregister();

      await cache.close();

      expect(callback).not.toHaveBeenCalled();
    });

    it('fires callback on LRU eviction', async () => {
      const small = new PgPoolCacheManager({ max: 1 });
      const callback = jest.fn();
      small.registerCleanupCallback(callback);

      small.set('a', createMockPool());
      small.set('b', createMockPool()); // evicts 'a'

      await small.waitForDisposals();

      expect(callback).toHaveBeenCalledWith('a');

      await small.close();
    });

    it('awaits async cleanup before ending the backing pool', async () => {
      const pool = createMockPool();
      let releaseCleanup!: () => void;
      const cleanupGate = new Promise<void>((resolve) => {
        releaseCleanup = resolve;
      });
      cache.set('key1', pool);
      cache.registerCleanupCallback(() => cleanupGate);

      const closePromise = cache.close();
      await Promise.resolve();

      expect(pool.end).not.toHaveBeenCalled();
      releaseCleanup();
      await closePromise;
      expect(pool.end).toHaveBeenCalledTimes(1);
    });
  });

  describe('ownership isolation', () => {
    it('closing one manager does not dispose another manager pools', async () => {
      const first = new PgPoolCacheManager(undefined, {});
      const second = new PgPoolCacheManager(undefined, {});
      const firstPool = createMockPool();
      const secondPool = createMockPool();
      first.set('same-logical-key', firstPool);
      second.set('same-logical-key', secondPool);

      await first.close();

      expect(firstPool.end).toHaveBeenCalledTimes(1);
      expect(secondPool.end).not.toHaveBeenCalled();
      expect(second.get('same-logical-key')).toBe(secondPool);

      await second.close();
    });
  });
});
