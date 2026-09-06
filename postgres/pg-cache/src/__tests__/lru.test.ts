import pg from 'pg';

import {
  DEFAULT_PG_CACHE_MAX,
  PG_CACHE_GRAPHILE_CONTRACT_CAPACITY,
  PG_CACHE_OPERATIONAL_RESERVE,
  PgPoolCacheManager,
  PgPoolCapacityError
} from '../lru';

describe('process lifecycle ownership', () => {
  it('does not install process signal handlers from a library import', () => {
    const beforeSigterm = process.listenerCount('SIGTERM');
    const beforeSigint = process.listenerCount('SIGINT');

    jest.isolateModules(() => {
      jest.requireActual('../lru');
    });

    expect(process.listenerCount('SIGTERM')).toBe(beforeSigterm);
    expect(process.listenerCount('SIGINT')).toBe(beforeSigint);
  });
});

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

  describe('configuration', () => {
    it('reserves two identities per supported Graphile contract plus operations', () => {
      expect(DEFAULT_PG_CACHE_MAX).toBe(
        PG_CACHE_GRAPHILE_CONTRACT_CAPACITY * 2 + PG_CACHE_OPERATIONAL_RESERVE
      );
      expect(cache.config.max).toBe(2064);
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

  describe('leases and fail-closed admission', () => {
    it('counts an existing exact identity as zero new slots', async () => {
      const small = new PgPoolCacheManager({ max: 1 });
      const pool = createMockPool();
      const factory = jest.fn(() => pool);

      const first = small.acquire('runtime-a', factory);
      const second = small.acquire('runtime-a', factory);

      expect(first.pool).toBe(pool);
      expect(second.pool).toBe(pool);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(small.getStats()).toMatchObject({
        size: 1,
        leasedPools: 1,
        activeLeases: 2,
        leasesAcquired: 2
      });

      first.release();
      first.release();
      expect(small.getStats().activeLeases).toBe(1);
      second.release();
      await small.close();
    });

    it('refuses before constructing or ending when every slot is leased', async () => {
      const small = new PgPoolCacheManager({ max: 1 });
      const firstPool = createMockPool();
      const first = small.acquire('runtime-a', () => firstPool);
      const rejectedFactory = jest.fn(() => createMockPool());

      let capacityError: PgPoolCapacityError | undefined;
      try {
        small.acquire('runtime-b', rejectedFactory);
      } catch (error) {
        capacityError = error as PgPoolCapacityError;
      }

      expect(capacityError).toBeInstanceOf(PgPoolCapacityError);
      expect(capacityError).toMatchObject({
        code: 'PG_POOL_CAPACITY',
        retryAfterSeconds: 15,
        max: 1,
        size: 1,
        leased: 1
      });
      expect(rejectedFactory).not.toHaveBeenCalled();
      expect(firstPool.end).not.toHaveBeenCalled();
      expect(small.getStats().capacityRefusals).toBe(1);

      first.release();
      await small.close();
    });

    it('evicts only the least-recent zero-lease identity', async () => {
      const small = new PgPoolCacheManager({ max: 2 });
      const leasedPool = createMockPool();
      const idlePool = createMockPool();
      const replacementPool = createMockPool();
      const lease = small.acquire('leased', () => leasedPool);
      small.set('idle', idlePool);

      small.set('replacement', replacementPool);
      await small.waitForDisposals();

      expect(small.has('leased')).toBe(true);
      expect(leasedPool.end).not.toHaveBeenCalled();
      expect(small.has('idle')).toBe(false);
      expect(idlePool.end).toHaveBeenCalledTimes(1);
      expect(small.has('replacement')).toBe(true);

      lease.release();
      await small.close();
    });

    it('keeps an expired leased identity until release', async () => {
      jest.useFakeTimers();
      const small = new PgPoolCacheManager({ max: 1, ttl: 50 });
      const pool = createMockPool();
      const lease = small.acquire('runtime', () => pool);
      try {
        jest.advanceTimersByTime(51);
        expect(small.has('runtime')).toBe(true);
        expect(pool.end).not.toHaveBeenCalled();

        lease.release();
        await small.waitForDisposals();

        expect(small.has('runtime')).toBe(false);
        expect(pool.end).toHaveBeenCalledTimes(1);
        expect(small.getStats().ttlExpirations).toBe(1);
      } finally {
        jest.useRealTimers();
        await small.close();
      }
    });

    it('deterministically gives the final slot to the first synchronous acquisition', async () => {
      const small = new PgPoolCacheManager({ max: 1 });
      const firstFactory = jest.fn(() => createMockPool());
      const secondFactory = jest.fn(() => createMockPool());

      const outcomes = await Promise.allSettled([
        Promise.resolve().then(() => small.acquire('first', firstFactory)),
        Promise.resolve().then(() => small.acquire('second', secondFactory))
      ]);

      expect(outcomes[0].status).toBe('fulfilled');
      expect(outcomes[1].status).toBe('rejected');
      expect((outcomes[1] as PromiseRejectedResult).reason).toBeInstanceOf(
        PgPoolCapacityError
      );
      expect(firstFactory).toHaveBeenCalledTimes(1);
      expect(secondFactory).not.toHaveBeenCalled();

      if (outcomes[0].status === 'fulfilled') outcomes[0].value.release();
      await small.close();
    });

    it('rolls back its reservation if pool construction fails', async () => {
      const small = new PgPoolCacheManager({ max: 1 });
      const retained = createMockPool();
      small.set('retained', retained);

      expect(() => small.acquire('broken', () => {
        throw new Error('factory failed');
      })).toThrow('factory failed');

      expect(small.has('retained')).toBe(true);
      expect(retained.end).not.toHaveBeenCalled();
      expect(small.getStats()).toMatchObject({ size: 1, reservations: 0 });
      await small.close();
    });

    it('does not end a physical pool retained under another exact identity', async () => {
      const small = new PgPoolCacheManager({ max: 1 });
      const sharedPool = createMockPool();

      small.set('identity-a', sharedPool);
      small.set('identity-b', sharedPool);
      await small.waitForDisposals();
      expect(sharedPool.end).not.toHaveBeenCalled();

      small.delete('identity-b');
      await small.waitForDisposals();
      expect(sharedPool.end).toHaveBeenCalledTimes(1);
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
  });
});
