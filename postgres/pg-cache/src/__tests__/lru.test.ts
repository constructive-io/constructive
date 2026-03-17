// Guards against the pg-cache close() resource leak fixed in feat/observability.
//
// Previously, close() reset this.closed = false after shutdown, allowing
// set() to silently accept new pools that were never cleaned up. The module-
// level closePromise also reset to null, enabling double-shutdown.
//
// These tests lock the fix: close() is final, set() rejects, and repeated
// close() calls are idempotent. See pg-cache-close-leak.md for full details.

import pg from 'pg';
import { PgPoolCacheManager } from '../lru';

// Minimal mock — we only need pool.end() and pool.ended
const createMockPool = (): pg.Pool => {
  let ended = false;
  return {
    get ended() { return ended; },
    end: jest.fn(async () => { ended = true; }),
  } as unknown as pg.Pool;
};

describe('PgPoolCacheManager', () => {
  let cache: PgPoolCacheManager;

  beforeEach(() => {
    cache = new PgPoolCacheManager();
  });

  afterEach(async () => {
    // Ensure all pools are cleaned up even if a test fails mid-way
    try { await cache.close(); } catch { /* already closed */ }
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

  describe('close() lifecycle', () => {
    it('set() after close() throws', async () => {
      const pool1 = createMockPool();
      cache.set('key1', pool1);

      await cache.close();

      const pool2 = createMockPool();
      expect(() => cache.set('key2', pool2)).toThrow(
        'Cannot add to cache after it has been closed (key: key2)',
      );
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
  });
});
