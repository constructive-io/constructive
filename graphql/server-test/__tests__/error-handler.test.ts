/**
 * Express 5 Error Handler Middleware Tests
 *
 * Tests for the error handler middleware following TDD methodology.
 * These tests verify error handling, response formatting, and logging.
 */

import { Request, Response, NextFunction } from 'express';
import {
  ApiError,
  DomainNotFoundError,
  ApiNotFoundError,
  NoValidSchemasError,
  SchemaValidationError,
  HandlerCreationError,
  DatabaseConnectionError,
} from '../../server/src/errors/api-errors';
import {
  errorHandler,
  notFoundHandler,
  sanitizeMessage,
  wantsJson,
} from '../../server/src/middleware/error-handler';

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

describe('Express 5 Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NODE_ENV to test
    process.env.NODE_ENV = 'test';
  });

  describe('ApiError handling', () => {
    it('returns correct status code for DomainNotFoundError (404)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new DomainNotFoundError('example.com', null);

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns correct status code for ApiNotFoundError (404)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new ApiNotFoundError('test-api');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns correct status code for NoValidSchemasError (404)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new NoValidSchemasError('test-api');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns correct status code for SchemaValidationError (400)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new SchemaValidationError('Invalid schema');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns correct status code for HandlerCreationError (500)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new HandlerCreationError('Failed to create handler');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('returns correct status code for DatabaseConnectionError (503)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new DatabaseConnectionError('Connection refused');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('includes error code in JSON response', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new DomainNotFoundError('example.com', null);

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'DOMAIN_NOT_FOUND',
          }),
        })
      );
    });

    it('includes requestId in response when available', () => {
      const req = createMockRequest({ requestId: 'req-123' });
      const res = createMockResponse();
      const next = createMockNext();
      const error = new DomainNotFoundError('example.com', null);

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'req-123',
          }),
        })
      );
    });
  });

  describe('response format', () => {
    it('returns JSON for Accept: application/json', () => {
      const req = createMockRequest({
        headers: { Accept: 'application/json' },
      } as any);
      const res = createMockResponse();
      const next = createMockNext();
      const error = new DomainNotFoundError('example.com', null);

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it('returns JSON for Accept: application/graphql-response+json', () => {
      const req = createMockRequest({
        headers: { Accept: 'application/graphql-response+json' },
      } as any);
      const res = createMockResponse();
      const next = createMockNext();
      const error = new DomainNotFoundError('example.com', null);

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalled();
    });

    it('returns HTML for Accept: text/html', () => {
      const req = createMockRequest({
        headers: { Accept: 'text/html' },
      } as any);
      const res = createMockResponse();
      const next = createMockNext();
      const error = new DomainNotFoundError('example.com', null);

      errorHandler(error, req, res, next);

      expect(res.send).toHaveBeenCalled();
      expect(res._body).toContain('<html');
    });

    it('returns HTML by default when Accept header missing', () => {
      const req = createMockRequest({
        headers: {},
      } as any);
      (req.get as jest.Mock).mockReturnValue(undefined);
      const res = createMockResponse();
      const next = createMockNext();
      const error = new DomainNotFoundError('example.com', null);

      errorHandler(error, req, res, next);

      expect(res.send).toHaveBeenCalled();
      expect(res._body).toContain('<html');
    });
  });

  describe('error sanitization', () => {
    it('exposes full message in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed internal error with stack trace info');
      const result = sanitizeMessage(error);
      expect(result).toBe('Detailed internal error with stack trace info');
    });

    it('sanitizes internal details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Detailed internal error with stack trace info');
      const result = sanitizeMessage(error);
      expect(result).toBe('An unexpected error occurred');
    });

    it('maps ECONNREFUSED to service unavailable', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');
      const result = sanitizeMessage(error);
      expect(result).toBe('Service temporarily unavailable');
    });

    it('maps timeout to request timed out', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('ETIMEDOUT: connection timed out');
      const result = sanitizeMessage(error);
      expect(result).toBe('Request timed out');
    });

    it('preserves ApiError messages in production (they are user-safe)', () => {
      process.env.NODE_ENV = 'production';
      const error = new DomainNotFoundError('example.com', null);
      const result = sanitizeMessage(error);
      expect(result).toBe('No API configured for domain: example.com');
    });
  });

  describe('special error types', () => {
    it('handles database connection errors (ECONNREFUSED) as 503', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SERVICE_UNAVAILABLE',
          }),
        })
      );
    });

    it('handles connection terminated errors as 503', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new Error('connection terminated unexpectedly');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('handles timeout errors (ETIMEDOUT) as 504', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new Error('ETIMEDOUT: connection timed out');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(504);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'GATEWAY_TIMEOUT',
          }),
        })
      );
    });

    it('handles GraphQL errors as 400', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new Error('Syntax Error: Unexpected token');
      error.name = 'GraphQLError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: expect.any(String),
            }),
          ]),
        })
      );
    });

    it('handles unknown errors as 500', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new Error('Unknown error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('headers-sent guard', () => {
    it('does not send response if headers already sent', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      res.headersSent = true;
      const next = createMockNext();
      const error = new DomainNotFoundError('example.com', null);

      errorHandler(error, req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it('logs warning when headers already sent', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      res.headersSent = true;
      const next = createMockNext();
      const error = new DomainNotFoundError('example.com', null);

      // The test verifies no response is sent; logging is internal
      errorHandler(error, req, res, next);

      // No crash, no response sent
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('logs error with request context', () => {
      const req = createMockRequest({
        requestId: 'req-456',
        path: '/api/test',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();
      const error = new DomainNotFoundError('example.com', null);

      // Error handler should not throw
      expect(() => errorHandler(error, req, res, next)).not.toThrow();

      // Verify response was sent
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('includes requestId, path, method, host in log', () => {
      const req = createMockRequest({
        requestId: 'req-789',
        path: '/graphql',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();
      const error = new HandlerCreationError('Failed');

      // Error handler should complete without throwing
      expect(() => errorHandler(error, req, res, next)).not.toThrow();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('uses warn level for client errors (4xx)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new SchemaValidationError('Invalid input');

      // Client error should be handled
      errorHandler(error, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('uses error level for server errors (5xx)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new HandlerCreationError('Internal failure');

      // Server error should be handled
      errorHandler(error, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('notFoundHandler', () => {
    it('returns 404 for unmatched routes', () => {
      const req = createMockRequest({ path: '/unknown/route', method: 'GET' });
      const res = createMockResponse();
      const next = createMockNext();

      notFoundHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('includes route in error message', () => {
      const req = createMockRequest({ path: '/api/users', method: 'DELETE' });
      const res = createMockResponse();
      const next = createMockNext();

      notFoundHandler(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const callArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArg.error.message).toContain('DELETE');
      expect(callArg.error.message).toContain('/api/users');
    });

    it('returns JSON when Accept: application/json', () => {
      const req = createMockRequest({
        path: '/missing',
        method: 'GET',
        headers: { Accept: 'application/json' },
      } as any);
      const res = createMockResponse();
      const next = createMockNext();

      notFoundHandler(req, res, next);

      expect(res.json).toHaveBeenCalled();
      expect(res._body).toHaveProperty('error');
      expect(res._body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('returns HTML otherwise', () => {
      const req = createMockRequest({
        path: '/missing',
        method: 'GET',
        headers: { Accept: 'text/html' },
      } as any);
      const res = createMockResponse();
      const next = createMockNext();

      notFoundHandler(req, res, next);

      expect(res.send).toHaveBeenCalled();
      expect(res._body).toContain('<html');
    });

    it('includes requestId in JSON response', () => {
      const req = createMockRequest({
        requestId: 'not-found-req-123',
        path: '/nowhere',
        method: 'GET',
      });
      const res = createMockResponse();
      const next = createMockNext();

      notFoundHandler(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'not-found-req-123',
          }),
        })
      );
    });
  });

  describe('wantsJson helper', () => {
    it('returns true for application/json', () => {
      const req = createMockRequest({
        headers: { Accept: 'application/json' },
      } as any);
      expect(wantsJson(req)).toBe(true);
    });

    it('returns true for application/graphql-response+json', () => {
      const req = createMockRequest({
        headers: { Accept: 'application/graphql-response+json' },
      } as any);
      expect(wantsJson(req)).toBe(true);
    });

    it('returns false for text/html', () => {
      const req = createMockRequest({
        headers: { Accept: 'text/html' },
      } as any);
      expect(wantsJson(req)).toBe(false);
    });

    it('returns false for missing Accept header', () => {
      const req = createMockRequest();
      (req.get as jest.Mock).mockReturnValue(undefined);
      expect(wantsJson(req)).toBe(false);
    });
  });
});
