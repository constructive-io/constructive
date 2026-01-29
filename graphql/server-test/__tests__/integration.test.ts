/**
 * Server Integration Tests
 *
 * Tests the full middleware chain integration including error handling,
 * server options normalization, and typed error propagation.
 */

import { Request, Response, NextFunction } from 'express';
import {
  DomainNotFoundError,
  ApiNotFoundError,
  NoValidSchemasError,
  HandlerCreationError,
  isApiError,
} from '../../server/src/errors/api-errors';
import {
  errorHandler,
  notFoundHandler,
} from '../../server/src/middleware/error-handler';
import {
  GraphqlServerOptions,
  normalizeServerOptions,
  isGraphqlServerOptions,
  graphqlServerDefaults,
} from '../../server/src/options';

// Mock the logger
jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Helper to create mock request
const createMockRequest = (overrides: Partial<Request> = {}): Request => {
  const req = {
    requestId: 'test-request-id',
    path: '/test/path',
    method: 'GET',
    databaseId: 'test-db-id',
    svc_key: 'test-svc-key',
    clientIp: '127.0.0.1',
    get: jest.fn((header: string) => {
      const headers: Record<string, string> = {
        host: 'localhost:3000',
        Accept: 'application/json',
        ...((overrides as any).headers || {}),
      };
      return headers[header] || headers[header.toLowerCase()];
    }),
    ...overrides,
  } as unknown as Request;
  return req;
};

// Helper to create mock response
const createMockResponse = (): Response & {
  _status: number;
  _body: any;
  _headers: Record<string, string>;
} => {
  const res = {
    _status: 200,
    _body: null,
    _headers: {} as Record<string, string>,
    headersSent: false,
    status: jest.fn(function (this: any, code: number) {
      this._status = code;
      return this;
    }),
    json: jest.fn(function (this: any, body: any) {
      this._body = body;
      return this;
    }),
    send: jest.fn(function (this: any, body: any) {
      this._body = body;
      return this;
    }),
    set: jest.fn(function (this: any, header: string, value: string) {
      this._headers[header] = value;
      return this;
    }),
  } as unknown as Response & {
    _status: number;
    _body: any;
    _headers: Record<string, string>;
  };
  return res;
};

// Helper to create mock next function
const createMockNext = (): NextFunction => jest.fn();

describe('Server Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('middleware chain', () => {
    it('error handler catches DomainNotFoundError from api middleware', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Simulate what api middleware would throw
      const error = new DomainNotFoundError('example.com', 'api');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'DOMAIN_NOT_FOUND',
            message: 'No API configured for domain: api.example.com',
          }),
        })
      );
    });

    it('error handler catches NoValidSchemasError from api middleware', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Simulate what api middleware would throw when schemas are invalid
      const error = new NoValidSchemasError('test-api-key');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NO_VALID_SCHEMAS',
          }),
        })
      );
    });

    it('error handler catches HandlerCreationError from graphile middleware', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Simulate what graphile middleware would throw
      const error = new HandlerCreationError('Failed to create GraphQL handler', {
        schemas: ['public'],
        reason: 'Schema not found',
      });

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'HANDLER_ERROR',
          }),
        })
      );
    });

    it('notFoundHandler returns 404 for unknown routes', () => {
      const req = createMockRequest({
        path: '/unknown/endpoint',
        method: 'GET',
      });
      const res = createMockResponse();
      const next = createMockNext();

      notFoundHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: expect.stringContaining('/unknown/endpoint'),
          }),
        })
      );
    });

    it('error handler processes errors in correct order', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Test that ApiErrors are handled before generic error handling
      const apiError = new ApiNotFoundError('missing-api');

      errorHandler(apiError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(isApiError(apiError)).toBe(true);
    });

    it('typed errors preserve context through middleware chain', () => {
      const req = createMockRequest({ requestId: 'chain-test-123' });
      const res = createMockResponse();
      const next = createMockNext();

      const error = new DomainNotFoundError('test.com', 'sub');

      errorHandler(error, req, res, next);

      // Verify error context is preserved
      expect(error.context).toEqual({
        domain: 'test.com',
        subdomain: 'sub',
        fullDomain: 'sub.test.com',
      });

      // Verify requestId is included in response
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'chain-test-123',
          }),
        })
      );
    });
  });

  describe('server options', () => {
    it('accepts GraphqlServerOptions', () => {
      const opts: GraphqlServerOptions = {
        pg: {
          host: 'custom-host',
          port: 5433,
        },
        server: {
          port: 4000,
        },
      };

      expect(isGraphqlServerOptions(opts)).toBe(true);

      const normalized = normalizeServerOptions(opts);

      expect(normalized.pg?.host).toBe('custom-host');
      expect(normalized.pg?.port).toBe(5433);
      expect(normalized.server?.port).toBe(4000);
    });

    it('accepts ConstructiveOptions (legacy)', () => {
      // ConstructiveOptions is a superset - it has all GraphqlServerOptions fields
      const legacyOpts = {
        pg: {
          host: 'legacy-host',
          database: 'legacy-db',
        },
        api: {
          isPublic: true,
        },
      };

      const normalized = normalizeServerOptions(legacyOpts);

      expect(normalized.pg?.host).toBe('legacy-host');
      expect(normalized.pg?.database).toBe('legacy-db');
      expect(normalized.api?.isPublic).toBe(true);
    });

    it('normalizes options correctly', () => {
      const opts: GraphqlServerOptions = {
        pg: {
          host: 'my-host',
        },
        // server not provided - should get defaults
      };

      const normalized = normalizeServerOptions(opts);

      // User-provided value should be preserved
      expect(normalized.pg?.host).toBe('my-host');

      // Default values should be filled in
      expect(normalized.pg?.port).toBe(graphqlServerDefaults.pg?.port);
      expect(normalized.server?.host).toBe(graphqlServerDefaults.server?.host);
      expect(normalized.server?.port).toBe(graphqlServerDefaults.server?.port);
    });

    it('merges nested options without losing defaults', () => {
      const opts: GraphqlServerOptions = {
        server: {
          port: 8080,
          // host not provided
        },
      };

      const normalized = normalizeServerOptions(opts);

      // Provided value preserved
      expect(normalized.server?.port).toBe(8080);
      // Default for missing field filled in
      expect(normalized.server?.host).toBe('localhost');
    });

    it('handles empty options object', () => {
      const normalized = normalizeServerOptions({});

      // Should have all defaults
      expect(normalized.pg?.host).toBe('localhost');
      expect(normalized.pg?.port).toBe(5432);
      expect(normalized.server?.port).toBe(3000);
    });

    it('preserves api configuration', () => {
      const opts: GraphqlServerOptions = {
        api: {
          isPublic: false,
          metaSchemas: ['services_public', 'services_private'],
          exposedSchemas: ['app_public'],
          anonRole: 'anon',
          roleName: 'authenticated',
        },
      };

      const normalized = normalizeServerOptions(opts);

      expect(normalized.api?.isPublic).toBe(false);
      expect(normalized.api?.metaSchemas).toEqual(['services_public', 'services_private']);
      expect(normalized.api?.exposedSchemas).toEqual(['app_public']);
    });
  });

  describe('error type guards', () => {
    it('isApiError returns true for all ApiError subclasses', () => {
      expect(isApiError(new DomainNotFoundError('test.com', null))).toBe(true);
      expect(isApiError(new ApiNotFoundError('test'))).toBe(true);
      expect(isApiError(new NoValidSchemasError('test'))).toBe(true);
      expect(isApiError(new HandlerCreationError('test'))).toBe(true);
    });

    it('isApiError returns false for regular errors', () => {
      expect(isApiError(new Error('regular error'))).toBe(false);
      expect(isApiError(new TypeError('type error'))).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
    });
  });

  describe('end-to-end error flow', () => {
    it('simulates api middleware throwing to error handler', () => {
      // This test simulates the full flow:
      // 1. api middleware throws DomainNotFoundError
      // 2. Express catches it and calls errorHandler
      // 3. errorHandler formats and sends the response

      const req = createMockRequest({
        requestId: 'e2e-test-456',
        path: '/graphql',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      // Simulate api middleware behavior
      const simulateApiMiddleware = () => {
        // In real middleware, this would be after domain lookup fails
        throw new DomainNotFoundError('unknown-domain.com', null);
      };

      // Catch the error as Express would
      let thrownError: Error | undefined;
      try {
        simulateApiMiddleware();
      } catch (e) {
        thrownError = e as Error;
      }

      // Pass to error handler as Express would
      expect(thrownError).toBeDefined();
      errorHandler(thrownError!, req, res, next);

      // Verify correct response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res._body.error.code).toBe('DOMAIN_NOT_FOUND');
      expect(res._body.error.requestId).toBe('e2e-test-456');
    });

    it('simulates NoValidSchemasError propagation', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Simulate the getApiConfig throwing NO_VALID_SCHEMAS
      // which api middleware converts to NoValidSchemasError
      const error = new NoValidSchemasError('schemata:db-123:invalid_schema');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res._body.error.code).toBe('NO_VALID_SCHEMAS');
    });
  });
});
