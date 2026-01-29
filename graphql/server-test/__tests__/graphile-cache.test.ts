/**
 * Graphile Cache Configuration Tests
 *
 * Tests for LRU+TTL cache configuration per spec Section 6.
 * These tests verify the cache's public API and configuration.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Helper to create a mock cache entry
function createMockEntry(cacheKey: string): any {
  return {
    pgl: { release: () => {} },
    serv: null,
    handler: {} as any,
    httpServer: {} as any,
    cacheKey,
    createdAt: Date.now(),
  };
}

// IMPORTANT: These tests run FIRST before any jest.isolateModules calls
// to ensure the module is cleanly cached
describe('getCacheStats() and cache operations', () => {
  // Load the module once for all cache operation tests
  const mod = require('graphile-cache');
  const graphileCache = mod.graphileCache;
  const getCacheStats = mod.getCacheStats;
  const clearMatchingEntries = mod.clearMatchingEntries;

  afterEach(() => {
    // Clean up cache between tests
    graphileCache.clear();
  });

  it('returns { size, max, ttl, keys }', () => {
    const stats = getCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('max');
    expect(stats).toHaveProperty('ttl');
    expect(stats).toHaveProperty('keys');
  });

  it('graphileCache has get and set methods', () => {
    expect(graphileCache).toBeDefined();
    expect(typeof graphileCache.get).toBe('function');
    expect(typeof graphileCache.set).toBe('function');
  });

  it('size reflects current entry count', () => {
    expect(getCacheStats().size).toBe(0);
    graphileCache.set('test-key', createMockEntry('test-key'));
    expect(getCacheStats().size).toBe(1);
  });

  it('max reflects configured maximum', () => {
    expect(getCacheStats().max).toBe(50);
  });

  it('ttl reflects configured TTL in ms', () => {
    // TTL should be 1 hour (3600000ms) in non-development
    expect(getCacheStats().ttl).toBe(ONE_HOUR_MS);
  });

  it('keys returns array of cache keys', () => {
    graphileCache.set('key1', createMockEntry('key1'));
    graphileCache.set('key2', createMockEntry('key2'));

    const stats = getCacheStats();
    expect(stats.keys).toContain('key1');
    expect(stats.keys).toContain('key2');
  });

  it('clearMatchingEntries clears entries matching regex pattern', () => {
    graphileCache.set('user:1', createMockEntry('user:1'));
    graphileCache.set('user:2', createMockEntry('user:2'));
    graphileCache.set('post:1', createMockEntry('post:1'));

    clearMatchingEntries(/^user:/);

    const stats = getCacheStats();
    expect(stats.keys).not.toContain('user:1');
    expect(stats.keys).not.toContain('user:2');
    expect(stats.keys).toContain('post:1');
  });

  it('clearMatchingEntries returns count of cleared entries', () => {
    graphileCache.set('user:1', createMockEntry('user:1'));
    graphileCache.set('user:2', createMockEntry('user:2'));
    graphileCache.set('post:1', createMockEntry('post:1'));

    const count = clearMatchingEntries(/^user:/);
    expect(count).toBe(2);
  });

  it('clearMatchingEntries does not affect non-matching entries', () => {
    graphileCache.set('user:1', createMockEntry('user:1'));
    graphileCache.set('post:1', createMockEntry('post:1'));
    graphileCache.set('post:2', createMockEntry('post:2'));

    clearMatchingEntries(/^user:/);

    const stats = getCacheStats();
    expect(stats.keys).toContain('post:1');
    expect(stats.keys).toContain('post:2');
    expect(stats.size).toBe(2);
  });
});

// These tests use jest.isolateModules for environment variable testing
// They run AFTER the cache operation tests
describe('Graphile Cache Configuration - Isolated Tests', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('default configuration', () => {
    it('has max entries = 50 by default', () => {
      jest.isolateModules(() => {
        const { getCacheStats } = require('graphile-cache');
        expect(getCacheStats().max).toBe(50);
      });
    });

    it('has TTL = 1 hour (3600000ms) by default (non-development)', () => {
      jest.isolateModules(() => {
        const { getCacheStats } = require('graphile-cache');
        expect(getCacheStats().ttl).toBe(ONE_HOUR_MS);
      });
    });
  });

  describe('environment variable overrides', () => {
    it('GRAPHILE_CACHE_MAX=100 overrides max entries', () => {
      process.env.GRAPHILE_CACHE_MAX = '100';

      jest.isolateModules(() => {
        const { getCacheStats } = require('graphile-cache');
        expect(getCacheStats().max).toBe(100);
      });
    });

    it('GRAPHILE_CACHE_TTL_MS=600000 overrides TTL', () => {
      process.env.GRAPHILE_CACHE_TTL_MS = '600000';

      jest.isolateModules(() => {
        const { getCacheStats } = require('graphile-cache');
        expect(getCacheStats().ttl).toBe(600000);
      });
    });

    it('invalid GRAPHILE_CACHE_MAX falls back to 50', () => {
      process.env.GRAPHILE_CACHE_MAX = 'invalid';

      jest.isolateModules(() => {
        const { getCacheStats } = require('graphile-cache');
        expect(getCacheStats().max).toBe(50);
      });
    });

    it('NODE_ENV=development sets TTL to 5 minutes', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.GRAPHILE_CACHE_TTL_MS;

      jest.isolateModules(() => {
        const { getCacheStats } = require('graphile-cache');
        expect(getCacheStats().ttl).toBe(FIVE_MINUTES_MS);
      });
    });

    it('NODE_ENV=production sets TTL to 1 hour', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.GRAPHILE_CACHE_TTL_MS;

      jest.isolateModules(() => {
        const { getCacheStats } = require('graphile-cache');
        expect(getCacheStats().ttl).toBe(ONE_HOUR_MS);
      });
    });
  });

  describe('dispose callback', () => {
    it('graphile cache is properly configured', () => {
      jest.isolateModules(() => {
        const { graphileCache } = require('graphile-cache');
        expect(graphileCache).toBeDefined();
      });
    });
  });
});
