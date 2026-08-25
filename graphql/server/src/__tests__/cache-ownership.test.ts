import type { GraphileCacheEntry, GraphileCacheManager } from 'graphile-cache';
import type { ServiceCache } from '@pgpmjs/server-utils';

import { Server } from '../server';

interface ServerInternals {
  graphileInstanceCache: GraphileCacheManager;
  serviceCache: ServiceCache;
}

const internals = (server: Server): ServerInternals =>
  server as unknown as ServerInternals;

const createEntry = (
  key: string,
  release: jest.Mock<Promise<void>, []>
): GraphileCacheEntry =>
  ({
    cacheKey: key,
    createdAt: Date.now(),
    pgl: { release },
    serv: {},
    handler: {},
    httpServer: { listening: false },
    realtimeManager: null,
  }) as unknown as GraphileCacheEntry;

describe('GraphQL Server cache ownership', () => {
  it('keeps concurrent server caches isolated during scoped close', async () => {
    const first = new Server(
      {
        pg: {
          host: 'first.internal',
          database: 'shared',
          user: 'first',
          password: 'first-secret',
        },
      },
      { env: { NODE_ENV: 'test' } }
    );
    const second = new Server(
      {
        pg: {
          host: 'second.internal',
          database: 'shared',
          user: 'second',
          password: 'second-secret',
        },
      },
      { env: { NODE_ENV: 'test' } }
    );
    const firstInternals = internals(first);
    const secondInternals = internals(second);
    const releaseFirst = jest.fn(async () => {});
    const releaseSecond = jest.fn(async () => {});
    firstInternals.graphileInstanceCache.set(
      'same-logical-key',
      createEntry('same-logical-key', releaseFirst)
    );
    secondInternals.graphileInstanceCache.set(
      'same-logical-key',
      createEntry('same-logical-key', releaseSecond)
    );
    firstInternals.serviceCache.set('same-logical-key', 'first');
    secondInternals.serviceCache.set('same-logical-key', 'second');

    await first.close();

    expect(releaseFirst).toHaveBeenCalledTimes(1);
    expect(releaseSecond).not.toHaveBeenCalled();
    expect(secondInternals.graphileInstanceCache.has('same-logical-key')).toBe(
      true
    );
    expect(secondInternals.serviceCache.get('same-logical-key')).toBe('second');

    await second.close();
  });
});
