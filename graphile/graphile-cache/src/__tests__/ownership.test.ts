import type { Express } from 'express';
import type { GrafservBase } from 'grafserv';
import type { Server as HttpServer } from 'node:http';
import type { Pool } from 'pg';
import type { PostGraphileInstance } from 'postgraphile';
import { PgPoolCacheManager } from 'pg-cache';

import {
  type GraphileCacheEntry,
  GraphileCacheManager,
} from '../graphile-cache';

const createEntry = (
  cacheKey: string,
  release: () => Promise<void> = async () => {},
  pgPoolKey?: string
): GraphileCacheEntry =>
  ({
    cacheKey,
    pgPoolKey,
    createdAt: Date.now(),
    pgl: { release } as unknown as PostGraphileInstance,
    serv: {} as GrafservBase,
    handler: {} as Express,
    httpServer: { listening: false } as HttpServer,
    realtimeManager: null,
  }) as GraphileCacheEntry;

const createPool = (): Pool => {
  let ended = false;
  return {
    get ended() {
      return ended;
    },
    end: jest.fn(async () => {
      ended = true;
    }),
  } as unknown as Pool;
};

describe('GraphileCacheManager ownership', () => {
  it('closing one cache does not release entries owned by another cache', async () => {
    const firstPg = new PgPoolCacheManager(undefined, {});
    const secondPg = new PgPoolCacheManager(undefined, {});
    const first = new GraphileCacheManager({ pgCache: firstPg });
    const second = new GraphileCacheManager({ pgCache: secondPg });
    const releaseFirst = jest.fn(async () => {});
    const releaseSecond = jest.fn(async () => {});

    first.set('shared-key', createEntry('shared-key', releaseFirst));
    second.set('shared-key', createEntry('shared-key', releaseSecond));

    await first.close();

    expect(releaseFirst).toHaveBeenCalledTimes(1);
    expect(releaseSecond).not.toHaveBeenCalled();
    expect(second.has('shared-key')).toBe(true);

    await second.close();
    await Promise.all([firstPg.close(), secondPg.close()]);
  });

  it('releases a Graphile instance before its backing pool ends', async () => {
    const pgCache = new PgPoolCacheManager(undefined, {});
    const cache = new GraphileCacheManager({ pgCache });
    const pool = createPool();
    let finishRelease!: () => void;
    const releaseGate = new Promise<void>((resolve) => {
      finishRelease = resolve;
    });
    const release = jest.fn(() => releaseGate);

    pgCache.set('pool-a', pool);
    cache.set('api-a', createEntry('api-a', release, 'pool-a'));

    const closePromise = pgCache.close();
    await Promise.resolve();
    await Promise.resolve();

    expect(release).toHaveBeenCalledTimes(1);
    expect(pool.end).not.toHaveBeenCalled();

    finishRelease();
    await closePromise;

    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(cache.has('api-a')).toBe(false);
  });

  it('tracks asynchronous LRU disposal until release completes', async () => {
    const pgCache = new PgPoolCacheManager(undefined, {});
    const cache = new GraphileCacheManager({
      pgCache,
      config: { max: 1, ttl: 60_000 },
    });
    let finishRelease!: () => void;
    const releaseGate = new Promise<void>((resolve) => {
      finishRelease = resolve;
    });
    const release = jest.fn(() => releaseGate);

    cache.set('first', createEntry('first', release));
    cache.set('second', createEntry('second'));

    const disposalPromise = cache.waitForDisposals();
    await Promise.resolve();
    expect(release).toHaveBeenCalledTimes(1);

    finishRelease();
    await disposalPromise;
    await cache.close();
    await pgCache.close();
  });
});
