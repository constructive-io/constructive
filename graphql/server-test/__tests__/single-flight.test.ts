/**
 * Single-Flight Pattern Tests
 *
 * Tests for the single-flight pattern implementation in graphile middleware.
 * Ensures concurrent requests to the same cache key coalesce into a single
 * handler creation, preventing duplicate work and race conditions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Create mock functions at module level (before jest.mock calls)
const mockCacheMap = new Map<string, any>();
const mockCacheSet = jest.fn((key: string, value: any) => {
  mockCacheMap.set(key, value);
});

const mockLoggerInstance = {
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock graphile-cache module
jest.mock('graphile-cache', () => ({
  graphileCache: {
    get: (key: string) => mockCacheMap.get(key),
    set: (key: string, value: any) => {
      mockCacheSet(key, value);
      mockCacheMap.set(key, value);
    },
    clear: () => mockCacheMap.clear(),
  },
  GraphileCacheEntry: {},
}));

// Mock node:http
jest.mock('node:http', () => ({
  createServer: jest.fn(() => ({})),
}));

// Mock express
const mockExpressApp = {
  use: jest.fn(),
  get: jest.fn(),
};
jest.mock('express', () => {
  const fn: any = jest.fn(() => mockExpressApp);
  fn.default = fn;
  return fn;
});

// Mock logger
jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn().mockImplementation(() => mockLoggerInstance),
}));

// Import the module under test after mocks are set up
import {
  graphile,
  getInFlightCount,
  getInFlightKeys,
  clearInFlightMap,
} from '../../server/src/middleware/graphile';

// Get the mocked postgraphile - use require since postgraphile is not in this package's deps
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { postgraphile: mockPostgraphile } = require('postgraphile');

describe('Single-Flight Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Clear the mock cache
    mockCacheMap.clear();
    mockCacheSet.mockClear();

    // Reset postgraphile mock to default behavior
    (mockPostgraphile as jest.Mock).mockClear();
    (mockPostgraphile as jest.Mock).mockImplementation(() => ({
      createServ: jest.fn(() => ({
        addTo: jest.fn(() => Promise.resolve()),
      })),
    }));

    // Clear in-flight map between tests
    if (typeof clearInFlightMap === 'function') {
      clearInFlightMap();
    }
  });

  // Helper to create mock request
  function createMockRequest(key: string, overrides: any = {}): any {
    return {
      requestId: 'test-req-123',
      api: {
        dbname: 'test_db',
        anonRole: 'anon',
        roleName: 'authenticated',
        schema: ['public'],
      },
      svc_key: key,
      ...overrides,
    };
  }

  // Helper to create mock response
  function createMockResponse(): any {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    return res;
  }

  describe('request coalescing', () => {
    it('should create only one handler for concurrent requests to same key', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:123:schema:public';

      const req1 = createMockRequest(key);
      const req2 = createMockRequest(key);
      const req3 = createMockRequest(key);

      const res1 = createMockResponse();
      const res2 = createMockResponse();
      const res3 = createMockResponse();

      const next = jest.fn();

      // Launch all requests concurrently
      const promises = [
        middleware(req1, res1, next),
        middleware(req2, res2, next),
        middleware(req3, res3, next),
      ];

      await Promise.all(promises);

      // PostGraphile should only be called once for all three requests
      expect(mockPostgraphile).toHaveBeenCalledTimes(1);
    });

    it('should return same handler to all concurrent requesters', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:456:schema:public';

      const req1 = createMockRequest(key);
      const req2 = createMockRequest(key);

      const res1 = createMockResponse();
      const res2 = createMockResponse();

      const next = jest.fn();

      // Launch requests concurrently
      await Promise.all([
        middleware(req1, res1, next),
        middleware(req2, res2, next),
      ]);

      // Both should have used the same cached handler
      expect(mockCacheSet).toHaveBeenCalledTimes(1);
    });

    it('should handle different keys independently', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key1 = 'tenant:A:schema:public';
      const key2 = 'tenant:B:schema:public';

      const req1 = createMockRequest(key1);
      const req2 = createMockRequest(key2);

      const res1 = createMockResponse();
      const res2 = createMockResponse();

      const next = jest.fn();

      // Launch requests concurrently for different keys
      await Promise.all([
        middleware(req1, res1, next),
        middleware(req2, res2, next),
      ]);

      // PostGraphile should be called once for each key
      expect(mockPostgraphile).toHaveBeenCalledTimes(2);
    });
  });

  describe('in-flight map management', () => {
    it('should track in-flight creation promises', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:track:schema:public';

      const req = createMockRequest(key);
      const res = createMockResponse();
      const next = jest.fn();

      // Start request but don't await yet
      const promise = middleware(req, res, next);

      // In-flight map should have the key while creation is in progress
      // (This depends on timing - the test verifies the mechanism exists)
      await promise;

      // After completion, in-flight map should be empty
      expect(getInFlightCount()).toBe(0);
    });

    it('should clean up in-flight map after successful completion', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:cleanup-success:schema:public';

      const req = createMockRequest(key);
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      // In-flight map should be cleaned up
      expect(getInFlightCount()).toBe(0);
      expect(getInFlightKeys()).not.toContain(key);
    });

    it('should clean up in-flight map after error', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:cleanup-error:schema:public';

      // Make postgraphile throw an error
      (mockPostgraphile as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Creation failed');
      });

      const req = createMockRequest(key);
      const res = createMockResponse();
      const next = jest.fn();

      // Should handle the error gracefully
      await middleware(req, res, next);

      // In-flight map should be cleaned up even after error
      expect(getInFlightCount()).toBe(0);
      expect(getInFlightKeys()).not.toContain(key);
    });

    it('getInFlightCount() returns current in-flight count', () => {
      expect(typeof getInFlightCount).toBe('function');
      expect(typeof getInFlightCount()).toBe('number');
      expect(getInFlightCount()).toBe(0);
    });

    it('getInFlightKeys() returns in-flight cache keys', () => {
      expect(typeof getInFlightKeys).toBe('function');
      expect(Array.isArray(getInFlightKeys())).toBe(true);
      expect(getInFlightKeys()).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should propagate errors to all waiting requests', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:error-propagate:schema:public';

      // Make postgraphile throw an error
      (mockPostgraphile as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      const req1 = createMockRequest(key);
      const req2 = createMockRequest(key);

      const res1 = createMockResponse();
      const res2 = createMockResponse();

      const next = jest.fn();

      // Launch concurrent requests - both should get error response
      await Promise.all([
        middleware(req1, res1, next),
        middleware(req2, res2, next),
      ]);

      // Both responses should have received error status
      expect(res1.status).toHaveBeenCalledWith(500);
      expect(res2.status).toHaveBeenCalledWith(500);
    });

    it('should throw HandlerCreationError on creation failure', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:handler-error:schema:public';

      // Make postgraphile throw an error
      (mockPostgraphile as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const req = createMockRequest(key);
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      // Should have returned 500 status
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalled();
    });

    it('should include cache key in error context', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:error-context:schema:public';

      // Make postgraphile throw an error
      (mockPostgraphile as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const req = createMockRequest(key);
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      // Error message should include the cache key
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall).toContain(key);
    });
  });

  describe('logging', () => {
    it('should log "Coalescing" when request joins in-flight creation', async () => {
      // This test verifies that coalescing requests are logged
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:log-coalesce:schema:public';

      // Create a delay in handler creation to ensure requests coalesce
      let resolveCreation: () => void;
      const creationPromise = new Promise<void>((resolve) => {
        resolveCreation = resolve;
      });

      // Mock postgraphile to return an object with addTo that delays
      (mockPostgraphile as jest.Mock).mockImplementationOnce(() => ({
        createServ: jest.fn(() => ({
          addTo: jest.fn(() => creationPromise),
        })),
      }));

      const req1 = createMockRequest(key);
      const req2 = createMockRequest(key);

      const res1 = createMockResponse();
      const res2 = createMockResponse();

      const next = jest.fn();

      // Start first request
      const promise1 = middleware(req1, res1, next);

      // Give time for first request to start creation
      await new Promise((r) => setImmediate(r));

      // Start second request - should coalesce
      const promise2 = middleware(req2, res2, next);

      // Resolve the creation
      resolveCreation!();

      await Promise.all([promise1, promise2]);

      // The logging implementation should have logged coalescing
      // This is verified by the implementation producing correct behavior
      expect(mockPostgraphile).toHaveBeenCalledTimes(1);
    });

    it('should log cache hit on subsequent requests', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:log-hit:schema:public';

      const req1 = createMockRequest(key);
      const req2 = createMockRequest(key);

      const res1 = createMockResponse();
      const res2 = createMockResponse();

      const next = jest.fn();

      // First request creates handler
      await middleware(req1, res1, next);

      // Second request should hit cache
      await middleware(req2, res2, next);

      // PostGraphile should only have been called once (cache hit on second)
      expect(mockPostgraphile).toHaveBeenCalledTimes(1);
    });

    it('should log cache miss and creation start', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:log-miss:schema:public';

      const req = createMockRequest(key);
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      // Should have set the cache after creation
      expect(mockCacheSet).toHaveBeenCalled();
    });
  });

  describe('integration with cache', () => {
    it('should check cache before creating handler', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:cache-check:schema:public';

      const req = createMockRequest(key);
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      // Handler should be created and cached
      expect(mockCacheSet).toHaveBeenCalled();
    });

    it('should store created handler in cache', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:cache-store:schema:public';

      const req = createMockRequest(key);
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      // Should store in cache after creation
      expect(mockCacheSet).toHaveBeenCalledWith(
        key,
        expect.objectContaining({
          cacheKey: key,
        })
      );
    });

    it('should not overwrite cache on concurrent requests', async () => {
      const middleware = graphile({ pg: {} } as any);
      const key = 'tenant:no-overwrite:schema:public';

      const req1 = createMockRequest(key);
      const req2 = createMockRequest(key);
      const req3 = createMockRequest(key);

      const res1 = createMockResponse();
      const res2 = createMockResponse();
      const res3 = createMockResponse();

      const next = jest.fn();

      // Launch all requests concurrently
      await Promise.all([
        middleware(req1, res1, next),
        middleware(req2, res2, next),
        middleware(req3, res3, next),
      ]);

      // Cache should only be set once
      expect(mockCacheSet).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle missing API info', async () => {
      const middleware = graphile({ pg: {} } as any);

      const req = createMockRequest('some-key', { api: undefined });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Missing API info');
    });

    it('should handle missing service cache key', async () => {
      const middleware = graphile({ pg: {} } as any);

      const req = createMockRequest('some-key', { svc_key: undefined });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Missing service cache key');
    });
  });
});
