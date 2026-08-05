jest.mock('pg-cache', () => ({
  acquirePgPool: jest.fn(),
  getPgPoolIdentity: jest.fn((config: { host?: string }) =>
    `pg:${config.host ?? 'control'}`
  )
}));

jest.mock('graphile-cache', () => ({
  deleteGraphileCacheEntry: jest.fn().mockResolvedValue(true),
  graphileCache: new Map()
}));

jest.mock('../graphile', () => ({
  invalidateInFlightBuilds: jest.fn()
}));

import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { svcCache } from '@pgpmjs/server-utils';
import { deleteGraphileCacheEntry, graphileCache } from 'graphile-cache';
import { acquirePgPool } from 'pg-cache';

import { getSvcCacheKey } from '../api';
import { flushService } from '../flush';

const mockAcquirePgPool = acquirePgPool as jest.MockedFunction<typeof acquirePgPool>;
const mockDeleteGraphileCacheEntry = deleteGraphileCacheEntry as jest.MockedFunction<
  typeof deleteGraphileCacheEntry
>;

describe('flushService PostgreSQL pool ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    graphileCache.clear();
    svcCache.clear();
    mockDeleteGraphileCacheEntry.mockImplementation(async (key) => graphileCache.delete(key));
  });

  it.each([true, false])(
    'evicts database entries before a routing failure for isPublic=%s',
    async (isPublic) => {
      const queryFailure = new Error('routing query failed');
      const release = jest.fn();
      const order: string[] = [];
      graphileCache.set('database-a-public', {
        databaseId: 'database-a',
        serviceKey: 'api:database-a:public'
      } as never);
      graphileCache.set('database-a-private', {
        databaseId: 'database-a',
        serviceKey: 'api:database-a:private'
      } as never);
      graphileCache.set('database-b', {
        databaseId: 'database-b',
        serviceKey: 'api:database-b:public'
      } as never);
      mockDeleteGraphileCacheEntry.mockImplementation(async (key) => {
        order.push(`delete:${key}`);
        return graphileCache.delete(key);
      });
      mockAcquirePgPool.mockReturnValue({
        identity: 'pg:control',
        pool: {
          query: jest.fn().mockImplementation(async () => {
            order.push('query');
            throw queryFailure;
          })
        } as never,
        release
      });
      const options = {
        pg: { database: 'routing' },
        api: { isPublic }
      } as ConstructiveOptions;

      await expect(flushService(options, 'database-a')).rejects.toBe(queryFailure);

      expect(mockAcquirePgPool).toHaveBeenCalledWith(
        { database: 'routing' },
        { purpose: 'routing-request-control', sanitizeOnCheckout: true }
      );
      expect(mockDeleteGraphileCacheEntry).toHaveBeenCalledTimes(2);
      expect(mockDeleteGraphileCacheEntry).toHaveBeenCalledWith('database-a-public');
      expect(mockDeleteGraphileCacheEntry).toHaveBeenCalledWith('database-a-private');
      expect(graphileCache.has('database-b')).toBe(true);
      expect(order.indexOf('delete:database-a-public')).toBeLessThan(order.indexOf('query'));
      expect(order.indexOf('delete:database-a-private')).toBeLessThan(order.indexOf('query'));
      expect(release).toHaveBeenCalledTimes(1);
    }
  );

  it.each([true, false])(
    'evicts database entries when routing has no domains for isPublic=%s',
    async (isPublic) => {
      const release = jest.fn();
      const order: string[] = [];
      graphileCache.set('database-a', {
        databaseId: 'database-a',
        serviceKey: 'api:database-a:public'
      } as never);
      graphileCache.set('database-b', {
        databaseId: 'database-b',
        serviceKey: 'api:database-b:public'
      } as never);
      mockDeleteGraphileCacheEntry.mockImplementation(async (key) => {
        order.push(`delete:${key}`);
        return graphileCache.delete(key);
      });
      mockAcquirePgPool.mockReturnValue({
        identity: 'pg:control',
        pool: {
          query: jest.fn().mockImplementation(async () => {
            order.push('query');
            return { rows: [], rowCount: 0 };
          })
        } as never,
        release
      });
      const options = {
        pg: { database: 'routing' },
        api: { isPublic }
      } as ConstructiveOptions;

      await flushService(options, 'database-a');

      expect(mockDeleteGraphileCacheEntry).toHaveBeenCalledTimes(1);
      expect(mockDeleteGraphileCacheEntry).toHaveBeenCalledWith('database-a');
      expect(graphileCache.has('database-b')).toBe(true);
      expect(order).toEqual(['delete:database-a', 'query']);
      expect(release).toHaveBeenCalledTimes(1);
    }
  );

  it('invalidates routing metadata only inside the exact control-pool contract', async () => {
    const optsA = {
      pg: { database: 'routing', host: 'routing-a.internal' },
      api: { isPublic: true }
    } as ConstructiveOptions;
    const optsB = {
      pg: { database: 'routing', host: 'routing-b.internal' },
      api: { isPublic: true }
    } as ConstructiveOptions;
    const serviceKey = 'api.example.com';
    const keyA = getSvcCacheKey(optsA, serviceKey);
    const keyB = getSvcCacheKey(optsB, serviceKey);
    svcCache.set(keyA, { databaseId: 'database-a' });
    svcCache.set(keyB, { databaseId: 'database-a' });
    mockAcquirePgPool.mockReturnValue({
      identity: 'pg:routing-a.internal',
      pool: {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
      } as never,
      release: jest.fn()
    });

    await flushService(optsA, 'database-a');

    expect(svcCache.has(keyA)).toBe(false);
    expect(svcCache.peek(keyB)).toEqual({ databaseId: 'database-a' });
  });
});
