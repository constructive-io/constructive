/**
 * API Error System Tests
 *
 * Tests for the typed API error system following TDD methodology.
 * These tests verify the error classes, type guards, and serialization.
 */

import {
  ApiError,
  DomainNotFoundError,
  ApiNotFoundError,
  NoValidSchemasError,
  SchemaValidationError,
  HandlerCreationError,
  DatabaseConnectionError,
  isApiError,
  hasErrorCode,
  ErrorCodes,
} from '../../server/src/errors/api-errors';

describe('ApiError System', () => {
  describe('ApiError base class', () => {
    it('has code property', () => {
      const error = new ApiError('TEST_CODE', 400, 'Test message');
      expect(error.code).toBe('TEST_CODE');
    });

    it('has statusCode property', () => {
      const error = new ApiError('TEST_CODE', 400, 'Test message');
      expect(error.statusCode).toBe(400);
    });

    it('has context property (optional object)', () => {
      const errorWithContext = new ApiError('TEST_CODE', 400, 'Test message', {
        key: 'value',
      });
      expect(errorWithContext.context).toEqual({ key: 'value' });

      const errorWithoutContext = new ApiError('TEST_CODE', 400, 'Test message');
      expect(errorWithoutContext.context).toBeUndefined();
    });

    it('toJSON() returns serializable object', () => {
      const error = new ApiError('TEST_CODE', 400, 'Test message', {
        key: 'value',
      });
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'ApiError',
        code: 'TEST_CODE',
        message: 'Test message',
        statusCode: 400,
        context: { key: 'value' },
      });

      // Verify it's actually serializable
      const serialized = JSON.stringify(json);
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual(json);
    });

    it('preserves stack trace', () => {
      const error = new ApiError('TEST_CODE', 400, 'Test message');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiError');
      expect(error.stack).toContain('api-errors.test.ts');
    });

    it('extends Error', () => {
      const error = new ApiError('TEST_CODE', 400, 'Test message');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test message');
      expect(error.name).toBe('ApiError');
    });
  });

  describe('DomainNotFoundError', () => {
    it('has code = "DOMAIN_NOT_FOUND"', () => {
      const error = new DomainNotFoundError('example.com', null);
      expect(error.code).toBe('DOMAIN_NOT_FOUND');
    });

    it('has statusCode = 404', () => {
      const error = new DomainNotFoundError('example.com', null);
      expect(error.statusCode).toBe(404);
    });

    it('includes domain in context', () => {
      const error = new DomainNotFoundError('example.com', null);
      expect(error.context).toEqual({
        domain: 'example.com',
        subdomain: null,
        fullDomain: 'example.com',
      });
    });

    it('includes subdomain in context when provided', () => {
      const error = new DomainNotFoundError('example.com', 'api');
      expect(error.context).toEqual({
        domain: 'example.com',
        subdomain: 'api',
        fullDomain: 'api.example.com',
      });
    });

    it('formats message with full domain', () => {
      const errorWithoutSubdomain = new DomainNotFoundError('example.com', null);
      expect(errorWithoutSubdomain.message).toBe(
        'No API configured for domain: example.com'
      );

      const errorWithSubdomain = new DomainNotFoundError('example.com', 'api');
      expect(errorWithSubdomain.message).toBe(
        'No API configured for domain: api.example.com'
      );
    });

    it('has name = "DomainNotFoundError"', () => {
      const error = new DomainNotFoundError('example.com', null);
      expect(error.name).toBe('DomainNotFoundError');
    });
  });

  describe('ApiNotFoundError', () => {
    it('has code = "API_NOT_FOUND"', () => {
      const error = new ApiNotFoundError('test-api');
      expect(error.code).toBe('API_NOT_FOUND');
    });

    it('has statusCode = 404', () => {
      const error = new ApiNotFoundError('test-api');
      expect(error.statusCode).toBe(404);
    });

    it('includes apiId in context', () => {
      const error = new ApiNotFoundError('test-api');
      expect(error.context).toEqual({ apiId: 'test-api' });
    });

    it('has appropriate message', () => {
      const error = new ApiNotFoundError('test-api');
      expect(error.message).toBe('API not found: test-api');
    });

    it('has name = "ApiNotFoundError"', () => {
      const error = new ApiNotFoundError('test-api');
      expect(error.name).toBe('ApiNotFoundError');
    });
  });

  describe('NoValidSchemasError', () => {
    it('has code = "NO_VALID_SCHEMAS"', () => {
      const error = new NoValidSchemasError('test-api');
      expect(error.code).toBe('NO_VALID_SCHEMAS');
    });

    it('has statusCode = 404', () => {
      const error = new NoValidSchemasError('test-api');
      expect(error.statusCode).toBe(404);
    });

    it('includes apiId in context', () => {
      const error = new NoValidSchemasError('test-api');
      expect(error.context).toEqual({ apiId: 'test-api' });
    });

    it('has appropriate message', () => {
      const error = new NoValidSchemasError('test-api');
      expect(error.message).toBe('No valid schemas found for API: test-api');
    });

    it('has name = "NoValidSchemasError"', () => {
      const error = new NoValidSchemasError('test-api');
      expect(error.name).toBe('NoValidSchemasError');
    });
  });

  describe('SchemaValidationError', () => {
    it('has code = "SCHEMA_INVALID"', () => {
      const error = new SchemaValidationError('Invalid schema definition');
      expect(error.code).toBe('SCHEMA_INVALID');
    });

    it('has statusCode = 400', () => {
      const error = new SchemaValidationError('Invalid schema definition');
      expect(error.statusCode).toBe(400);
    });

    it('accepts optional validation details in context', () => {
      const error = new SchemaValidationError('Invalid schema definition', {
        field: 'name',
        reason: 'required',
      });
      expect(error.context).toEqual({
        field: 'name',
        reason: 'required',
      });
    });

    it('has name = "SchemaValidationError"', () => {
      const error = new SchemaValidationError('Invalid schema definition');
      expect(error.name).toBe('SchemaValidationError');
    });
  });

  describe('HandlerCreationError', () => {
    it('has code = "HANDLER_ERROR"', () => {
      const error = new HandlerCreationError('Failed to create handler');
      expect(error.code).toBe('HANDLER_ERROR');
    });

    it('has statusCode = 500', () => {
      const error = new HandlerCreationError('Failed to create handler');
      expect(error.statusCode).toBe(500);
    });

    it('accepts optional cause in context', () => {
      const originalError = new Error('Original error');
      const error = new HandlerCreationError('Failed to create handler', {
        cause: originalError.message,
        stack: originalError.stack,
      });
      expect(error.context).toEqual({
        cause: 'Original error',
        stack: originalError.stack,
      });
    });

    it('has name = "HandlerCreationError"', () => {
      const error = new HandlerCreationError('Failed to create handler');
      expect(error.name).toBe('HandlerCreationError');
    });
  });

  describe('DatabaseConnectionError', () => {
    it('has code = "DATABASE_CONNECTION_ERROR"', () => {
      const error = new DatabaseConnectionError('Connection refused');
      expect(error.code).toBe('DATABASE_CONNECTION_ERROR');
    });

    it('has statusCode = 503', () => {
      const error = new DatabaseConnectionError('Connection refused');
      expect(error.statusCode).toBe(503);
    });

    it('accepts optional connection details in context', () => {
      const error = new DatabaseConnectionError('Connection refused', {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
      });
      expect(error.context).toEqual({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
      });
    });

    it('has name = "DatabaseConnectionError"', () => {
      const error = new DatabaseConnectionError('Connection refused');
      expect(error.name).toBe('DatabaseConnectionError');
    });
  });

  describe('utility functions', () => {
    describe('isApiError()', () => {
      it('returns true for ApiError subclasses', () => {
        expect(isApiError(new ApiError('TEST', 400, 'test'))).toBe(true);
        expect(isApiError(new DomainNotFoundError('example.com', null))).toBe(
          true
        );
        expect(isApiError(new ApiNotFoundError('test-api'))).toBe(true);
        expect(isApiError(new NoValidSchemasError('test-api'))).toBe(true);
        expect(isApiError(new SchemaValidationError('invalid'))).toBe(true);
        expect(isApiError(new HandlerCreationError('failed'))).toBe(true);
        expect(isApiError(new DatabaseConnectionError('refused'))).toBe(true);
      });

      it('returns false for native Error', () => {
        expect(isApiError(new Error('native error'))).toBe(false);
        expect(isApiError(new TypeError('type error'))).toBe(false);
        expect(isApiError(new RangeError('range error'))).toBe(false);
      });

      it('returns false for plain objects', () => {
        expect(isApiError({ code: 'TEST', statusCode: 400 })).toBe(false);
        expect(isApiError(null)).toBe(false);
        expect(isApiError(undefined)).toBe(false);
        expect(isApiError('string')).toBe(false);
        expect(isApiError(123)).toBe(false);
      });
    });

    describe('hasErrorCode()', () => {
      it('matches specific error codes', () => {
        const domainError = new DomainNotFoundError('example.com', null);
        expect(hasErrorCode(domainError, 'DOMAIN_NOT_FOUND')).toBe(true);
        expect(hasErrorCode(domainError, 'API_NOT_FOUND')).toBe(false);

        const apiError = new ApiNotFoundError('test-api');
        expect(hasErrorCode(apiError, 'API_NOT_FOUND')).toBe(true);
        expect(hasErrorCode(apiError, 'DOMAIN_NOT_FOUND')).toBe(false);
      });

      it('returns false for non-ApiError values', () => {
        expect(hasErrorCode(new Error('native'), 'DOMAIN_NOT_FOUND')).toBe(
          false
        );
        expect(hasErrorCode(null, 'DOMAIN_NOT_FOUND')).toBe(false);
        expect(hasErrorCode(undefined, 'DOMAIN_NOT_FOUND')).toBe(false);
        expect(
          hasErrorCode({ code: 'DOMAIN_NOT_FOUND' }, 'DOMAIN_NOT_FOUND')
        ).toBe(false);
      });
    });
  });

  describe('ErrorCodes constant', () => {
    it('exports all error codes', () => {
      expect(ErrorCodes.DOMAIN_NOT_FOUND).toBe('DOMAIN_NOT_FOUND');
      expect(ErrorCodes.API_NOT_FOUND).toBe('API_NOT_FOUND');
      expect(ErrorCodes.NO_VALID_SCHEMAS).toBe('NO_VALID_SCHEMAS');
      expect(ErrorCodes.SCHEMA_INVALID).toBe('SCHEMA_INVALID');
      expect(ErrorCodes.HANDLER_ERROR).toBe('HANDLER_ERROR');
      expect(ErrorCodes.DATABASE_CONNECTION_ERROR).toBe(
        'DATABASE_CONNECTION_ERROR'
      );
    });
  });
});
