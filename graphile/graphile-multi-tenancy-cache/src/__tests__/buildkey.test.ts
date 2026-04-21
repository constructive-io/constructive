/**
 * Unit tests for buildKey-based handler caching.
 *
 * Tests cover:
 *  - buildKey computation determinism and sensitivity
 *  - identical build inputs with different svc_keys share the same handler
 *  - different schemas / roles produce different buildKeys
 *  - svc_key-based flush evicts the correct handler
 *  - databaseId-level flush works correctly
 *  - shutdown clears all state
 */

// We test computeBuildKey directly and use mocks for the orchestrator functions
// that depend on PostGraphile.

// --- computeBuildKey tests (pure function, no mocking needed) ---

import { computeBuildKey } from '../multi-tenancy-cache';

/**
 * Create a mock Pool that matches the REAL pg-cache shape:
 * `new pg.Pool({ connectionString })`.
 *
 * pg-cache's getPgPool() creates pools with connectionString only —
 * individual fields (host, port, database, user) are NOT on pool.options.
 * This mock must match that shape to test the real code path.
 */
function makeMockPool(overrides: {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
} = {}): import('pg').Pool {
  const host = overrides.host ?? 'localhost';
  const port = overrides.port ?? 5432;
  const database = overrides.database ?? 'testdb';
  const user = overrides.user ?? 'postgres';
  const password = overrides.password ?? 'pass';
  const connectionString = `postgres://${user}:${password}@${host}:${port}/${database}`;
  return { options: { connectionString } } as unknown as import('pg').Pool;
}

describe('computeBuildKey', () => {
  it('should be deterministic for identical inputs', () => {
    const pool = makeMockPool();
    const k1 = computeBuildKey(pool, ['public'], 'anon', 'authenticated');
    const k2 = computeBuildKey(pool, ['public'], 'anon', 'authenticated');
    expect(k1).toBe(k2);
  });

  it('should produce a canonical JSON string', () => {
    const pool = makeMockPool();
    const key = computeBuildKey(pool, ['public'], 'anon', 'authenticated');
    expect(key).toBe(
      JSON.stringify({
        conn: 'localhost:5432/testdb@postgres',
        schemas: ['public'],
        anonRole: 'anon',
        roleName: 'authenticated',
      }),
    );
  });

  it('should differ when schemas differ', () => {
    const pool = makeMockPool();
    const k1 = computeBuildKey(pool, ['public'], 'anon', 'authenticated');
    const k2 = computeBuildKey(pool, ['private'], 'anon', 'authenticated');
    expect(k1).not.toBe(k2);
  });

  it('should differ when schema order differs', () => {
    const pool = makeMockPool();
    const k1 = computeBuildKey(pool, ['public', 'private'], 'anon', 'authenticated');
    const k2 = computeBuildKey(pool, ['private', 'public'], 'anon', 'authenticated');
    expect(k1).not.toBe(k2);
  });

  it('should differ when anonRole differs', () => {
    const pool = makeMockPool();
    const k1 = computeBuildKey(pool, ['public'], 'anon', 'authenticated');
    const k2 = computeBuildKey(pool, ['public'], 'guest', 'authenticated');
    expect(k1).not.toBe(k2);
  });

  it('should differ when roleName differs', () => {
    const pool = makeMockPool();
    const k1 = computeBuildKey(pool, ['public'], 'anon', 'authenticated');
    const k2 = computeBuildKey(pool, ['public'], 'anon', 'admin');
    expect(k1).not.toBe(k2);
  });

  it('should differ when database differs', () => {
    const p1 = makeMockPool({ database: 'db_a' });
    const p2 = makeMockPool({ database: 'db_b' });
    const k1 = computeBuildKey(p1, ['public'], 'anon', 'authenticated');
    const k2 = computeBuildKey(p2, ['public'], 'anon', 'authenticated');
    expect(k1).not.toBe(k2);
  });

  it('should differ when host differs', () => {
    const p1 = makeMockPool({ host: 'host-a' });
    const p2 = makeMockPool({ host: 'host-b' });
    const k1 = computeBuildKey(p1, ['public'], 'anon', 'authenticated');
    const k2 = computeBuildKey(p2, ['public'], 'anon', 'authenticated');
    expect(k1).not.toBe(k2);
  });

  it('should differ when port differs', () => {
    const p1 = makeMockPool({ port: 5432 });
    const p2 = makeMockPool({ port: 5433 });
    const k1 = computeBuildKey(p1, ['public'], 'anon', 'authenticated');
    const k2 = computeBuildKey(p2, ['public'], 'anon', 'authenticated');
    expect(k1).not.toBe(k2);
  });

  it('should differ when user differs', () => {
    const p1 = makeMockPool({ user: 'alice' });
    const p2 = makeMockPool({ user: 'bob' });
    const k1 = computeBuildKey(p1, ['public'], 'anon', 'authenticated');
    const k2 = computeBuildKey(p2, ['public'], 'anon', 'authenticated');
    expect(k1).not.toBe(k2);
  });

  it('should NOT differ when only svc_key would differ (svc_key is not an input)', () => {
    // Same pool, schemas, roles → same buildKey, regardless of svc_key
    const pool = makeMockPool();
    const k1 = computeBuildKey(pool, ['services_public'], 'administrator', 'administrator');
    const k2 = computeBuildKey(pool, ['services_public'], 'administrator', 'administrator');
    expect(k1).toBe(k2);
  });
});

// --- Orchestrator tests (require mocking PostGraphile) ---

// Mock the heavy dependencies before importing the orchestrator
jest.mock('postgraphile', () => ({
  postgraphile: jest.fn(() => ({
    createServ: jest.fn(() => ({
      addTo: jest.fn(async () => {}),
      ready: jest.fn(async () => {}),
    })),
    release: jest.fn(async () => {}),
  })),
}));

jest.mock('grafserv/express/v4', () => ({
  grafserv: 'mock-grafserv',
}));

jest.mock('express', () => {
  const mockExpress = jest.fn(() => {
    const app = jest.fn();
    return app;
  });
  return mockExpress;
});

jest.mock('node:http', () => ({
  createServer: jest.fn(() => ({
    listening: false,
    close: jest.fn((cb: () => void) => cb()),
  })),
}));

jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import {
  configureMultiTenancyCache,
  getOrCreateTenantInstance,
  getTenantInstance,
  flushTenantInstance,
  flushByDatabaseId,
  getMultiTenancyCacheStats,
  shutdownMultiTenancyCache,
  getBuildKeyForSvcKey,
} from '../multi-tenancy-cache';

const mockPresetBuilder = jest.fn((_pool: import('pg').Pool, _schemas: string[], _anon: string, _role: string): import('graphile-config').GraphileConfig.Preset => ({
  extends: [] as import('graphile-config').GraphileConfig.Preset[],
  pgServices: [] as never[],
}));

beforeEach(async () => {
  await shutdownMultiTenancyCache();
  configureMultiTenancyCache({ basePresetBuilder: mockPresetBuilder });
  mockPresetBuilder.mockClear();
});

afterAll(async () => {
  await shutdownMultiTenancyCache();
});

describe('getOrCreateTenantInstance — buildKey deduplication', () => {
  it('should return same handler for different svc_keys with identical build inputs', async () => {
    const pool = makeMockPool();

    const t1 = await getOrCreateTenantInstance({
      svcKey: 'schemata:db-0001-tenant-a:services_public',
      pool,
      schemas: ['services_public'],
      anonRole: 'administrator',
      roleName: 'administrator',
    });

    const t2 = await getOrCreateTenantInstance({
      svcKey: 'schemata:db-0002-tenant-b:services_public',
      pool,
      schemas: ['services_public'],
      anonRole: 'administrator',
      roleName: 'administrator',
    });

    // Same handler object (same buildKey)
    expect(t1).toBe(t2);
    expect(t1.buildKey).toBe(t2.buildKey);

    // Preset builder called only once (deduplication)
    expect(mockPresetBuilder).toHaveBeenCalledTimes(1);

    // Both svc_keys resolve to the same buildKey
    expect(getBuildKeyForSvcKey('schemata:db-0001-tenant-a:services_public')).toBe(t1.buildKey);
    expect(getBuildKeyForSvcKey('schemata:db-0002-tenant-b:services_public')).toBe(t1.buildKey);
  });

  it('should return different handlers when schemas differ', async () => {
    const pool = makeMockPool();

    const t1 = await getOrCreateTenantInstance({
      svcKey: 'tenant-a',
      pool,
      schemas: ['schema_a'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    const t2 = await getOrCreateTenantInstance({
      svcKey: 'tenant-b',
      pool,
      schemas: ['schema_b'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    expect(t1).not.toBe(t2);
    expect(t1.buildKey).not.toBe(t2.buildKey);
    expect(mockPresetBuilder).toHaveBeenCalledTimes(2);
  });

  it('should return different handlers when roles differ', async () => {
    const pool = makeMockPool();

    const t1 = await getOrCreateTenantInstance({
      svcKey: 'tenant-a',
      pool,
      schemas: ['public'],
      anonRole: 'anon',
      roleName: 'user',
    });

    const t2 = await getOrCreateTenantInstance({
      svcKey: 'tenant-b',
      pool,
      schemas: ['public'],
      anonRole: 'anon',
      roleName: 'admin',
    });

    expect(t1).not.toBe(t2);
    expect(t1.buildKey).not.toBe(t2.buildKey);
  });
});

describe('getTenantInstance — fast path', () => {
  it('should return handler after registration via getOrCreateTenantInstance', async () => {
    const pool = makeMockPool();
    await getOrCreateTenantInstance({
      svcKey: 'key-1',
      pool,
      schemas: ['public'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    const result = getTenantInstance('key-1');
    expect(result).toBeDefined();
    expect(result!.buildKey).toBeTruthy();
  });

  it('should return undefined for unregistered svc_key', () => {
    expect(getTenantInstance('nonexistent')).toBeUndefined();
  });
});

describe('flushTenantInstance — svc_key-based flush', () => {
  it('should evict the handler and clear all svc_key mappings for the buildKey', async () => {
    const pool = makeMockPool();

    // Two svc_keys share the same handler
    await getOrCreateTenantInstance({
      svcKey: 'key-a',
      pool,
      schemas: ['public'],
      anonRole: 'anon',
      roleName: 'auth',
    });
    await getOrCreateTenantInstance({
      svcKey: 'key-b',
      pool,
      schemas: ['public'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    expect(getTenantInstance('key-a')).toBeDefined();
    expect(getTenantInstance('key-b')).toBeDefined();

    // Flush via key-a
    flushTenantInstance('key-a');

    // Both svc_keys should lose their handler (same buildKey was evicted)
    expect(getTenantInstance('key-a')).toBeUndefined();
    expect(getTenantInstance('key-b')).toBeUndefined();

    const stats = getMultiTenancyCacheStats();
    expect(stats.handlerCacheSize).toBe(0);
    expect(stats.svcKeyMappings).toBe(0);
  });

  it('should not affect handlers with different buildKeys', async () => {
    const pool = makeMockPool();

    await getOrCreateTenantInstance({
      svcKey: 'key-a',
      pool,
      schemas: ['schema_a'],
      anonRole: 'anon',
      roleName: 'auth',
    });
    await getOrCreateTenantInstance({
      svcKey: 'key-b',
      pool,
      schemas: ['schema_b'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    flushTenantInstance('key-a');

    expect(getTenantInstance('key-a')).toBeUndefined();
    expect(getTenantInstance('key-b')).toBeDefined();

    const stats = getMultiTenancyCacheStats();
    expect(stats.handlerCacheSize).toBe(1);
  });

  it('should be a no-op for unknown svc_key', () => {
    expect(() => flushTenantInstance('nonexistent')).not.toThrow();
  });
});

describe('flushByDatabaseId — database-level flush', () => {
  it('should evict all handlers associated with a databaseId', async () => {
    const pool = makeMockPool();

    await getOrCreateTenantInstance({
      svcKey: 'key-a',
      pool,
      schemas: ['schema_a'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-001',
    });
    await getOrCreateTenantInstance({
      svcKey: 'key-b',
      pool,
      schemas: ['schema_b'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-001',
    });

    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(2);

    flushByDatabaseId('db-001');

    expect(getTenantInstance('key-a')).toBeUndefined();
    expect(getTenantInstance('key-b')).toBeUndefined();
    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(0);
    expect(getMultiTenancyCacheStats().databaseIdMappings).toBe(0);
  });

  it('should not affect handlers from other databaseIds', async () => {
    const pool = makeMockPool();

    await getOrCreateTenantInstance({
      svcKey: 'key-a',
      pool,
      schemas: ['schema_a'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-001',
    });
    await getOrCreateTenantInstance({
      svcKey: 'key-b',
      pool,
      schemas: ['schema_b'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-002',
    });

    flushByDatabaseId('db-001');

    expect(getTenantInstance('key-a')).toBeUndefined();
    expect(getTenantInstance('key-b')).toBeDefined();
    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(1);
  });

  it('should be a no-op for unknown databaseId', () => {
    expect(() => flushByDatabaseId('nonexistent')).not.toThrow();
  });
});

describe('shutdownMultiTenancyCache', () => {
  it('should clear all state', async () => {
    const pool = makeMockPool();

    await getOrCreateTenantInstance({
      svcKey: 'key-a',
      pool,
      schemas: ['public'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-001',
    });
    await getOrCreateTenantInstance({
      svcKey: 'key-b',
      pool,
      schemas: ['private'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-002',
    });

    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(2);
    expect(getMultiTenancyCacheStats().svcKeyMappings).toBe(2);

    await shutdownMultiTenancyCache();

    const stats = getMultiTenancyCacheStats();
    expect(stats.handlerCacheSize).toBe(0);
    expect(stats.svcKeyMappings).toBe(0);
    expect(stats.databaseIdMappings).toBe(0);
    expect(stats.inflightCreations).toBe(0);
  });
});

describe('getMultiTenancyCacheStats', () => {
  it('should report correct counts', async () => {
    const pool = makeMockPool();

    // Create 3 svc_keys, 2 of which share the same buildKey
    await getOrCreateTenantInstance({
      svcKey: 'key-a',
      pool,
      schemas: ['public'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-001',
    });
    await getOrCreateTenantInstance({
      svcKey: 'key-b',
      pool,
      schemas: ['public'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-001',
    });
    await getOrCreateTenantInstance({
      svcKey: 'key-c',
      pool,
      schemas: ['private'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-002',
    });

    const stats = getMultiTenancyCacheStats();
    expect(stats.handlerCacheSize).toBe(2);     // 2 unique buildKeys
    expect(stats.svcKeyMappings).toBe(3);        // 3 svc_keys
    expect(stats.databaseIdMappings).toBe(2);    // 2 databaseIds
    expect(stats.inflightCreations).toBe(0);
  });
});

describe('re-creation after flush', () => {
  it('should create a new handler after flushing and re-requesting', async () => {
    const pool = makeMockPool();

    const t1 = await getOrCreateTenantInstance({
      svcKey: 'key-a',
      pool,
      schemas: ['public'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    flushTenantInstance('key-a');
    expect(getTenantInstance('key-a')).toBeUndefined();

    const t2 = await getOrCreateTenantInstance({
      svcKey: 'key-a',
      pool,
      schemas: ['public'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    // New handler instance (though same buildKey)
    expect(t2).not.toBe(t1);
    expect(t2.buildKey).toBe(t1.buildKey);
    expect(getTenantInstance('key-a')).toBeDefined();
  });
});

describe('handler creation failure — orphaned index cleanup', () => {
  it('should clean up svc_key index when handler creation fails', async () => {
    // Make the preset builder throw to simulate handler creation failure
    const failingBuilder = jest.fn(() => {
      throw new Error('simulated build failure');
    });
    configureMultiTenancyCache({ basePresetBuilder: failingBuilder as any });

    const pool = makeMockPool();

    await expect(
      getOrCreateTenantInstance({
        svcKey: 'failing-key',
        pool,
        schemas: ['public'],
        anonRole: 'anon',
        roleName: 'auth',
        databaseId: 'db-fail',
      }),
    ).rejects.toThrow('simulated build failure');

    // svc_key index should NOT have orphaned entries
    expect(getBuildKeyForSvcKey('failing-key')).toBeUndefined();

    // Stats should show clean state
    const stats = getMultiTenancyCacheStats();
    expect(stats.handlerCacheSize).toBe(0);
    expect(stats.svcKeyMappings).toBe(0);
    expect(stats.databaseIdMappings).toBe(0);
  });

  it('should not affect other svc_keys when one fails', async () => {
    const pool = makeMockPool();

    // First, create a successful handler
    const t1 = await getOrCreateTenantInstance({
      svcKey: 'good-key',
      pool,
      schemas: ['schema_a'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-001',
    });

    expect(getTenantInstance('good-key')).toBeDefined();

    // Now make the next creation fail (different buildKey — different schemas)
    const failingBuilder = jest.fn(() => {
      throw new Error('simulated build failure');
    });
    configureMultiTenancyCache({ basePresetBuilder: failingBuilder as any });

    await expect(
      getOrCreateTenantInstance({
        svcKey: 'bad-key',
        pool,
        schemas: ['schema_b'],
        anonRole: 'anon',
        roleName: 'auth',
        databaseId: 'db-001',
      }),
    ).rejects.toThrow('simulated build failure');

    // good-key should still work
    expect(getTenantInstance('good-key')).toBeDefined();
    expect(getTenantInstance('good-key')!.buildKey).toBe(t1.buildKey);

    // bad-key should be cleaned up
    expect(getBuildKeyForSvcKey('bad-key')).toBeUndefined();

    const stats = getMultiTenancyCacheStats();
    expect(stats.handlerCacheSize).toBe(1);
    expect(stats.svcKeyMappings).toBe(1);
  });
});

describe('connectionString-based pool identity', () => {
  it('should produce different buildKeys for pools with different connectionStrings', () => {
    // This is the REAL production scenario — pools created via pg-cache's getPgPool
    // have { options: { connectionString } }, not { options: { host, database, user } }
    const poolA = { options: { connectionString: 'postgres://user:pass@host-a:5432/db_a' } } as unknown as import('pg').Pool;
    const poolB = { options: { connectionString: 'postgres://user:pass@host-b:5432/db_b' } } as unknown as import('pg').Pool;

    const keyA = computeBuildKey(poolA, ['public'], 'anon', 'auth');
    const keyB = computeBuildKey(poolB, ['public'], 'anon', 'auth');

    expect(keyA).not.toBe(keyB);
  });

  it('should produce the same buildKey for identical connectionStrings', () => {
    const pool1 = { options: { connectionString: 'postgres://user:pass@host:5432/mydb' } } as unknown as import('pg').Pool;
    const pool2 = { options: { connectionString: 'postgres://user:pass@host:5432/mydb' } } as unknown as import('pg').Pool;

    const key1 = computeBuildKey(pool1, ['public'], 'anon', 'auth');
    const key2 = computeBuildKey(pool2, ['public'], 'anon', 'auth');

    expect(key1).toBe(key2);
  });

  it('should differ when only database name differs in connectionString', () => {
    const pool1 = { options: { connectionString: 'postgres://user:pass@host:5432/db_alpha' } } as unknown as import('pg').Pool;
    const pool2 = { options: { connectionString: 'postgres://user:pass@host:5432/db_beta' } } as unknown as import('pg').Pool;

    const key1 = computeBuildKey(pool1, ['public'], 'anon', 'auth');
    const key2 = computeBuildKey(pool2, ['public'], 'anon', 'auth');

    expect(key1).not.toBe(key2);
  });

  it('should not include password in identity (password changes should not change buildKey)', () => {
    // Both pools connect to the same host/db/user, only password differs
    const pool1 = { options: { connectionString: 'postgres://user:pass1@host:5432/mydb' } } as unknown as import('pg').Pool;
    const pool2 = { options: { connectionString: 'postgres://user:pass2@host:5432/mydb' } } as unknown as import('pg').Pool;

    const key1 = computeBuildKey(pool1, ['public'], 'anon', 'auth');
    const key2 = computeBuildKey(pool2, ['public'], 'anon', 'auth');

    // buildKeys should be identical — password doesn't affect handler construction
    expect(key1).toBe(key2);
  });

  it('should handle pools with individual fields (fallback path)', () => {
    // Some consumers might create pools with explicit fields instead of connectionString
    const pool = { options: { host: 'myhost', port: 5432, database: 'mydb', user: 'myuser' } } as unknown as import('pg').Pool;
    const key = computeBuildKey(pool, ['public'], 'anon', 'auth');
    expect(key).toBe(
      JSON.stringify({
        conn: 'myhost:5432/mydb@myuser',
        schemas: ['public'],
        anonRole: 'anon',
        roleName: 'auth',
      }),
    );
  });
});

// --- Finding 1: Coalesced creation failure leaves no orphaned mappings ---

describe('coalesced creation failure — no orphaned mappings (Finding 1)', () => {
  it('should clean up both svc_keys when 2 coalesced requests fail', async () => {
    const failingBuilder = jest.fn(() => { throw new Error('coalesced fail'); });
    configureMultiTenancyCache({ basePresetBuilder: failingBuilder as any });

    const pool = makeMockPool();
    const base = { pool, schemas: ['public'] as string[], anonRole: 'anon', roleName: 'auth', databaseId: 'db-001' };

    // Start two concurrent requests (same buildKey) — both will fail
    const p1 = getOrCreateTenantInstance({ ...base, svcKey: 'coal-a' });
    const p2 = getOrCreateTenantInstance({ ...base, svcKey: 'coal-b' });

    const results = await Promise.allSettled([p1, p2]);
    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');

    // No orphaned mappings for either svc_key
    expect(getBuildKeyForSvcKey('coal-a')).toBeUndefined();
    expect(getBuildKeyForSvcKey('coal-b')).toBeUndefined();

    const stats = getMultiTenancyCacheStats();
    expect(stats.handlerCacheSize).toBe(0);
    expect(stats.svcKeyMappings).toBe(0);
    expect(stats.databaseIdMappings).toBe(0);
    expect(stats.inflightCreations).toBe(0);
  });

  it('should clean up all svc_keys when 3+ coalesced requests fail', async () => {
    const failingBuilder = jest.fn(() => { throw new Error('coalesced fail 3+'); });
    configureMultiTenancyCache({ basePresetBuilder: failingBuilder as any });

    const pool = makeMockPool();
    const base = { pool, schemas: ['public'] as string[], anonRole: 'anon', roleName: 'auth', databaseId: 'db-002' };

    // Start 4 concurrent requests with the same buildKey
    const promises = [
      getOrCreateTenantInstance({ ...base, svcKey: 'coal-1' }),
      getOrCreateTenantInstance({ ...base, svcKey: 'coal-2' }),
      getOrCreateTenantInstance({ ...base, svcKey: 'coal-3' }),
      getOrCreateTenantInstance({ ...base, svcKey: 'coal-4' }),
    ];

    const results = await Promise.allSettled(promises);
    expect(results.every(r => r.status === 'rejected')).toBe(true);

    // No orphaned mappings for any svc_key
    for (const key of ['coal-1', 'coal-2', 'coal-3', 'coal-4']) {
      expect(getBuildKeyForSvcKey(key)).toBeUndefined();
    }

    const stats = getMultiTenancyCacheStats();
    expect(stats.handlerCacheSize).toBe(0);
    expect(stats.svcKeyMappings).toBe(0);
    expect(stats.databaseIdMappings).toBe(0);
    expect(stats.inflightCreations).toBe(0);
  });

  it('should preserve all svc_key mappings when coalesced creation succeeds', async () => {
    // Uses the default (working) preset builder from beforeEach
    const pool = makeMockPool();
    const base = { pool, schemas: ['public'] as string[], anonRole: 'anon', roleName: 'auth', databaseId: 'db-003' };

    // Start 3 concurrent requests (same buildKey)
    const p1 = getOrCreateTenantInstance({ ...base, svcKey: 'ok-1' });
    const p2 = getOrCreateTenantInstance({ ...base, svcKey: 'ok-2' });
    const p3 = getOrCreateTenantInstance({ ...base, svcKey: 'ok-3' });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    // All got the same handler instance
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
    expect(r1.buildKey).toBe(r2.buildKey);

    // All 3 svc_key mappings exist
    expect(getBuildKeyForSvcKey('ok-1')).toBe(r1.buildKey);
    expect(getBuildKeyForSvcKey('ok-2')).toBe(r1.buildKey);
    expect(getBuildKeyForSvcKey('ok-3')).toBe(r1.buildKey);

    const stats = getMultiTenancyCacheStats();
    expect(stats.handlerCacheSize).toBe(1);
    expect(stats.svcKeyMappings).toBe(3);
    expect(stats.inflightCreations).toBe(0);
  });
});

// --- Finding 2: svc_key rebinding cleans up old handler ---

describe('svc_key rebinding — old handler cleanup (Finding 2)', () => {
  it('should evict old buildKey when rebound svc_key was its only reference', async () => {
    const pool = makeMockPool();

    // Create handler with schema_a
    const tA = await getOrCreateTenantInstance({
      svcKey: 'rebind-key',
      pool,
      schemas: ['schema_a'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-r1',
    });
    const buildKeyA = tA.buildKey;

    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(1);

    // Rebind the same svc_key to a different buildKey (different schemas)
    const tB = await getOrCreateTenantInstance({
      svcKey: 'rebind-key',
      pool,
      schemas: ['schema_b'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-r1',
    });
    const buildKeyB = tB.buildKey;
    expect(buildKeyA).not.toBe(buildKeyB);

    // Old buildKey A should be evicted (no remaining svc_key references)
    expect(getBuildKeyForSvcKey('rebind-key')).toBe(buildKeyB);
    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(1); // only B remains
    expect(getTenantInstance('rebind-key')).toBe(tB);
  });

  it('should NOT evict old buildKey if another svc_key still references it', async () => {
    const pool = makeMockPool();

    // Two svc_keys share the same buildKey (identical build inputs)
    await getOrCreateTenantInstance({
      svcKey: 'shared-1',
      pool,
      schemas: ['schema_a'],
      anonRole: 'anon',
      roleName: 'auth',
    });
    const tShared = await getOrCreateTenantInstance({
      svcKey: 'shared-2',
      pool,
      schemas: ['schema_a'],
      anonRole: 'anon',
      roleName: 'auth',
    });
    const sharedBuildKey = tShared.buildKey;

    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(1);
    expect(getMultiTenancyCacheStats().svcKeyMappings).toBe(2);

    // Rebind shared-1 to a different buildKey (different schemas)
    const tNew = await getOrCreateTenantInstance({
      svcKey: 'shared-1',
      pool,
      schemas: ['schema_b'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    // Old buildKey should still exist — shared-2 still references it
    expect(getBuildKeyForSvcKey('shared-1')).toBe(tNew.buildKey);
    expect(getBuildKeyForSvcKey('shared-2')).toBe(sharedBuildKey);
    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(2); // old + new
    expect(getTenantInstance('shared-2')).toBe(tShared);
  });

  it('should keep databaseIdToBuildKeys consistent after rebinding', async () => {
    const pool = makeMockPool();

    // Create with databaseId
    await getOrCreateTenantInstance({
      svcKey: 'db-key',
      pool,
      schemas: ['schema_a'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-x',
    });

    expect(getMultiTenancyCacheStats().databaseIdMappings).toBe(1);

    // Rebind to different schemas (different buildKey), same databaseId
    await getOrCreateTenantInstance({
      svcKey: 'db-key',
      pool,
      schemas: ['schema_b'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-x',
    });

    // Old buildKey evicted (no remaining refs), new buildKey under same databaseId
    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(1);
    expect(getMultiTenancyCacheStats().databaseIdMappings).toBe(1);

    // Flushing by databaseId should still work
    flushByDatabaseId('db-x');
    expect(getTenantInstance('db-key')).toBeUndefined();
    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(0);
    expect(getMultiTenancyCacheStats().databaseIdMappings).toBe(0);
  });

  it('should allow flush to work correctly after rebinding', async () => {
    const pool = makeMockPool();

    // Create handler A
    await getOrCreateTenantInstance({
      svcKey: 'flush-key',
      pool,
      schemas: ['schema_a'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    // Rebind to handler B
    await getOrCreateTenantInstance({
      svcKey: 'flush-key',
      pool,
      schemas: ['schema_b'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    // Flush via the rebound svc_key — should flush the NEW handler
    flushTenantInstance('flush-key');
    expect(getTenantInstance('flush-key')).toBeUndefined();
    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(0);
    expect(getMultiTenancyCacheStats().svcKeyMappings).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// svc_key race condition tests
// ---------------------------------------------------------------------------

describe('getOrCreateTenantInstance — svc_key race condition (epoch guard)', () => {
  /**
   * Access the module-level postgraphile mock so we can override it
   * per-test with gate-controlled behaviour.
   */
  const pgMock = () =>
    (jest.requireMock('postgraphile') as { postgraphile: jest.Mock }).postgraphile;

  /**
   * Install a gated postgraphile mock.  Each call to `postgraphile()`
   * creates a new gate; `serv.ready()` blocks until the gate is resolved.
   * Returns the ordered array of gates so the test can resolve them in
   * any desired order.
   */
  function installGatedMock(): Array<{ resolve: () => void }> {
    const gates: Array<{ resolve: () => void }> = [];
    pgMock().mockImplementation(() => {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => {
        resolve = r;
      });
      gates.push({ resolve });
      return {
        createServ: jest.fn(() => ({
          addTo: jest.fn(async () => {}),
          ready: jest.fn(async () => {
            await promise;
          }),
        })),
        release: jest.fn(async () => {}),
      };
    });
    return gates;
  }

  afterEach(() => {
    // Restore the default (instant-resolving) mock so other tests are unaffected
    pgMock().mockImplementation(() => ({
      createServ: jest.fn(() => ({
        addTo: jest.fn(async () => {}),
        ready: jest.fn(async () => {}),
      })),
      release: jest.fn(async () => {}),
    }));
  });

  it('newer request finishes first — final mapping stays on newer buildKey', async () => {
    const gates = installGatedMock();
    const pool = makeMockPool();

    // Start OLDER request (buildKey A — schemas=['schema_old'])
    const pOld = getOrCreateTenantInstance({
      svcKey: 'race-svc',
      pool,
      schemas: ['schema_old'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    // Start NEWER request (buildKey B — schemas=['schema_new'])
    const pNew = getOrCreateTenantInstance({
      svcKey: 'race-svc',
      pool,
      schemas: ['schema_new'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    // Two separate handler creations (different buildKeys → no coalescing)
    expect(gates.length).toBe(2);

    // Resolve NEWER first
    gates[1].resolve();
    const resultNew = await pNew;
    expect(getBuildKeyForSvcKey('race-svc')).toBe(resultNew.buildKey);

    // Resolve OLDER (stale completion)
    gates[0].resolve();
    await pOld;

    // Flush microtask queue for deferred orphan cleanup
    await new Promise<void>((r) => queueMicrotask(r));

    // Final mapping MUST remain on the newer buildKey
    expect(getBuildKeyForSvcKey('race-svc')).toBe(resultNew.buildKey);
  });

  it('older request finishes first — final mapping ends on newer buildKey', async () => {
    const gates = installGatedMock();
    const pool = makeMockPool();

    const pOld = getOrCreateTenantInstance({
      svcKey: 'race-svc-2',
      pool,
      schemas: ['schema_old'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    const pNew = getOrCreateTenantInstance({
      svcKey: 'race-svc-2',
      pool,
      schemas: ['schema_new'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    expect(gates.length).toBe(2);

    // Resolve OLDER first — this is stale since newer epoch already exists
    gates[0].resolve();
    await pOld;

    // Flush microtask queue
    await new Promise<void>((r) => queueMicrotask(r));

    // Resolve NEWER
    gates[1].resolve();
    const resultNew = await pNew;

    await new Promise<void>((r) => queueMicrotask(r));

    // Final mapping MUST be on the newer buildKey
    expect(getBuildKeyForSvcKey('race-svc-2')).toBe(resultNew.buildKey);
  });

  it('no orphaned handler/index state remains after race', async () => {
    const gates = installGatedMock();
    const pool = makeMockPool();

    const pOld = getOrCreateTenantInstance({
      svcKey: 'race-svc-3',
      pool,
      schemas: ['schema_old'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-race',
    });

    const pNew = getOrCreateTenantInstance({
      svcKey: 'race-svc-3',
      pool,
      schemas: ['schema_new'],
      anonRole: 'anon',
      roleName: 'auth',
      databaseId: 'db-race',
    });

    expect(gates.length).toBe(2);

    // Resolve newer first, then older (worst-case for orphans)
    gates[1].resolve();
    await pNew;
    gates[0].resolve();
    await pOld;

    // Flush microtask queue for deferred orphan cleanup
    await new Promise<void>((r) => queueMicrotask(r));

    const stats = getMultiTenancyCacheStats();

    // Only 1 handler should remain (the newer one)
    expect(stats.handlerCacheSize).toBe(1);
    // Only 1 svc_key mapping
    expect(stats.svcKeyMappings).toBe(1);
    // No in-flight creations
    expect(stats.inflightCreations).toBe(0);
    // The surviving handler is reachable via the svc_key
    expect(getTenantInstance('race-svc-3')).toBeDefined();
    expect(getBuildKeyForSvcKey('race-svc-3')).toBeDefined();
  });

  it('same-buildKey coalescing still works with epoch tracking', async () => {
    // Epoch mechanism must NOT break single-flight behavior when two
    // different svc_keys compute the same buildKey.
    const pool = makeMockPool();

    const p1 = getOrCreateTenantInstance({
      svcKey: 'coalesce-A',
      pool,
      schemas: ['shared_schema'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    const p2 = getOrCreateTenantInstance({
      svcKey: 'coalesce-B',
      pool,
      schemas: ['shared_schema'],
      anonRole: 'anon',
      roleName: 'auth',
    });

    const [r1, r2] = await Promise.all([p1, p2]);

    // Same handler (coalesced on identical buildKey)
    expect(r1.buildKey).toBe(r2.buildKey);
    expect(r1).toBe(r2);

    // Both svc_keys mapped
    expect(getBuildKeyForSvcKey('coalesce-A')).toBe(r1.buildKey);
    expect(getBuildKeyForSvcKey('coalesce-B')).toBe(r2.buildKey);

    // Single handler in cache
    expect(getMultiTenancyCacheStats().handlerCacheSize).toBe(1);
    expect(getMultiTenancyCacheStats().svcKeyMappings).toBe(2);
  });
});
