/**
 * Typed API Error System
 *
 * Provides a strongly-typed error hierarchy for the GraphQL server.
 * All errors extend ApiError and include:
 * - A unique error code for programmatic handling
 * - An HTTP status code for REST responses
 * - Optional context for debugging
 * - JSON serialization for API responses
 */

/**
 * Error codes as a const object for type safety
 */
export const ErrorCodes = {
  DOMAIN_NOT_FOUND: 'DOMAIN_NOT_FOUND',
  API_NOT_FOUND: 'API_NOT_FOUND',
  NO_VALID_SCHEMAS: 'NO_VALID_SCHEMAS',
  SCHEMA_INVALID: 'SCHEMA_INVALID',
  HANDLER_ERROR: 'HANDLER_ERROR',
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Base class for all API errors.
 * Provides consistent structure for error handling across the application.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly context?: Record<string, unknown>;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Ensure prototype chain is properly set for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Returns a JSON-serializable representation of the error.
   * Useful for API responses and logging.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * Thrown when a domain is not configured for any API.
 */
export class DomainNotFoundError extends ApiError {
  constructor(domain: string, subdomain: string | null) {
    const fullDomain = subdomain ? `${subdomain}.${domain}` : domain;
    super(
      ErrorCodes.DOMAIN_NOT_FOUND,
      404,
      `No API configured for domain: ${fullDomain}`,
      { domain, subdomain, fullDomain }
    );
    this.name = 'DomainNotFoundError';
  }
}

/**
 * Thrown when a specific API cannot be found by its ID.
 */
export class ApiNotFoundError extends ApiError {
  constructor(apiId: string) {
    super(ErrorCodes.API_NOT_FOUND, 404, `API not found: ${apiId}`, { apiId });
    this.name = 'ApiNotFoundError';
  }
}

/**
 * Thrown when no valid schemas are found for an API.
 */
export class NoValidSchemasError extends ApiError {
  constructor(apiId: string) {
    super(
      ErrorCodes.NO_VALID_SCHEMAS,
      404,
      `No valid schemas found for API: ${apiId}`,
      { apiId }
    );
    this.name = 'NoValidSchemasError';
  }
}

/**
 * Thrown when schema validation fails.
 */
export class SchemaValidationError extends ApiError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCodes.SCHEMA_INVALID, 400, message, context);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Thrown when a request handler cannot be created.
 */
export class HandlerCreationError extends ApiError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCodes.HANDLER_ERROR, 500, message, context);
    this.name = 'HandlerCreationError';
  }
}

/**
 * Thrown when the database connection fails.
 */
export class DatabaseConnectionError extends ApiError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCodes.DATABASE_CONNECTION_ERROR, 503, message, context);
    this.name = 'DatabaseConnectionError';
  }
}

/**
 * Type guard to check if an error is an ApiError.
 * Works with all subclasses.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if an error has a specific error code.
 * Returns false for non-ApiError values.
 */
export function hasErrorCode(error: unknown, code: string): error is ApiError {
  return isApiError(error) && error.code === code;
}
