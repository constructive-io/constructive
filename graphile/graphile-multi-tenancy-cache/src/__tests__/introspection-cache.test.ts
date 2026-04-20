import {
  getConnectionKey,
  invalidateIntrospection,
  clearIntrospectionCache,
  getIntrospectionCacheStats,
} from '../introspection-cache';

afterEach(() => {
  clearIntrospectionCache();
});

describe('introspection-cache', () => {
  describe('getConnectionKey', () => {
    it('returns a hex string from pool options', () => {
      const mockPool = {
        options: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          user: 'testuser',
          ssl: false,
        },
      } as any;

      const key = getConnectionKey(mockPool);
      expect(key).toMatch(/^[a-f0-9]{16}$/);
    });

    it('returns same key for same pool options', () => {
      const pool1 = { options: { host: 'localhost', port: 5432, database: 'db1', user: 'u', ssl: false } } as any;
      const pool2 = { options: { host: 'localhost', port: 5432, database: 'db1', user: 'u', ssl: false } } as any;

      expect(getConnectionKey(pool1)).toBe(getConnectionKey(pool2));
    });

    it('returns different keys for different databases', () => {
      const pool1 = { options: { host: 'localhost', port: 5432, database: 'db1', user: 'u', ssl: false } } as any;
      const pool2 = { options: { host: 'localhost', port: 5432, database: 'db2', user: 'u', ssl: false } } as any;

      expect(getConnectionKey(pool1)).not.toBe(getConnectionKey(pool2));
    });

    it('returns different keys for different hosts', () => {
      const pool1 = { options: { host: 'host1', port: 5432, database: 'db', user: 'u', ssl: false } } as any;
      const pool2 = { options: { host: 'host2', port: 5432, database: 'db', user: 'u', ssl: false } } as any;

      expect(getConnectionKey(pool1)).not.toBe(getConnectionKey(pool2));
    });

    it('distinguishes ssl vs nossl', () => {
      const pool1 = { options: { host: 'h', port: 5432, database: 'db', user: 'u', ssl: false } } as any;
      const pool2 = { options: { host: 'h', port: 5432, database: 'db', user: 'u', ssl: true } } as any;

      expect(getConnectionKey(pool1)).not.toBe(getConnectionKey(pool2));
    });
  });

  describe('invalidateIntrospection', () => {
    it('does not throw when invalidating non-existent key', () => {
      expect(() => invalidateIntrospection('nonexistent')).not.toThrow();
    });

    it('does not throw when invalidating with schemas', () => {
      expect(() => invalidateIntrospection('nonexistent', ['public'])).not.toThrow();
    });
  });

  describe('clearIntrospectionCache', () => {
    it('resets stats to zero', () => {
      clearIntrospectionCache();
      const stats = getIntrospectionCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.inflightCount).toBe(0);
    });
  });

  describe('getIntrospectionCacheStats', () => {
    it('returns stats object with expected shape', () => {
      const stats = getIntrospectionCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('inflightCount');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });
  });
});
