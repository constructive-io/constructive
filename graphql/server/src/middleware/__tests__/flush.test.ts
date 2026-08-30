jest.mock('@pgpmjs/server-utils', () => ({
  svcCache: new Map<string, unknown>()
}));

jest.mock('graphile-cache', () => ({
  graphileCache: new Map<string, unknown>()
}));

jest.mock('pg-cache', () => ({
  getPgPool: jest.fn()
}));

import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { svcCache } from '@pgpmjs/server-utils';
import { graphileCache } from 'graphile-cache';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import { flushService } from '../flush';

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;
const DATABASE_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_DATABASE_ID = '22222222-2222-4222-8222-222222222222';
const HOST = 'api.example.com';
const WILDCARD_HOST = '*.example.com';
const WILDCARD_CHILD_HOST = 'customer.example.com';

const options = {
  pg: { database: 'routing_database' },
  api: { isPublic: true }
} as ConstructiveOptions;

describe('flushService', () => {
  beforeEach(() => {
    graphileCache.clear();
    svcCache.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    graphileCache.clear();
    svcCache.clear();
  });

  it('evicts plain and database/API identity keys from both caches', async () => {
    const databaseKey = `${HOST}:database:${DATABASE_ID}`;
    const identityKey = `${databaseKey}:api:api-1`;
    const otherIdentityKey = `${HOST}:database:${OTHER_DATABASE_ID}:api:api-2`;
    for (const cache of [graphileCache, svcCache]) {
      cache.set(HOST, {} as never);
      cache.set(databaseKey, {} as never);
      cache.set(identityKey, {} as never);
      cache.set(otherIdentityKey, {} as never);
    }
    const query = jest.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{ hostname: HOST }]
    });
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);

    await flushService(options, DATABASE_ID);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM "routing_public".domains'),
      [DATABASE_ID]
    );
    for (const cache of [graphileCache, svcCache]) {
      expect(cache.has(HOST)).toBe(false);
      expect(cache.has(databaseKey)).toBe(false);
      expect(cache.has(identityKey)).toBe(false);
      expect(cache.has(otherIdentityKey)).toBe(true);
    }
  });

  it('evicts wildcard child identities by exact database segment only', async () => {
    const childIdentityKey =
      `${WILDCARD_CHILD_HOST}:database:${DATABASE_ID}:api:api-1`;
    const siblingIdentityKey =
      `other.example.com:database:${DATABASE_ID}`;
    const otherDatabaseKey =
      `${WILDCARD_CHILD_HOST}:database:${OTHER_DATABASE_ID}:api:api-2`;
    const databasePrefixCollision =
      `${WILDCARD_CHILD_HOST}:database:${DATABASE_ID}0:api:api-3`;
    const apiIdCollision =
      `${WILDCARD_CHILD_HOST}:database:${OTHER_DATABASE_ID}:api:api-4:database:${DATABASE_ID}`;
    const privateKeyCollision =
      `api:${OTHER_DATABASE_ID}:customer:database:${DATABASE_ID}`;
    for (const cache of [graphileCache, svcCache]) {
      cache.set(WILDCARD_HOST, {} as never);
      cache.set(WILDCARD_CHILD_HOST, {} as never);
      cache.set(childIdentityKey, {} as never);
      cache.set(siblingIdentityKey, {} as never);
      cache.set(otherDatabaseKey, {} as never);
      cache.set(databasePrefixCollision, {} as never);
      cache.set(apiIdCollision, {} as never);
      cache.set(privateKeyCollision, {} as never);
    }
    const query = jest.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{ hostname: WILDCARD_HOST }]
    });
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);

    await flushService(options, DATABASE_ID);

    for (const cache of [graphileCache, svcCache]) {
      expect(cache.has(WILDCARD_HOST)).toBe(false);
      expect(cache.has(WILDCARD_CHILD_HOST)).toBe(true);
      expect(cache.has(childIdentityKey)).toBe(false);
      expect(cache.has(siblingIdentityKey)).toBe(false);
      expect(cache.has(otherDatabaseKey)).toBe(true);
      expect(cache.has(databasePrefixCollision)).toBe(true);
      expect(cache.has(apiIdCollision)).toBe(true);
      expect(cache.has(privateKeyCollision)).toBe(true);
    }
  });
});
