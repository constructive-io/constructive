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
  SCHEMA_ACCESS_DENIED: 'SCHEMA_ACCESS_DENIED',
  HANDLER_ERROR: 'HANDLER_ERROR',
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  AMBIGUOUS_TENANT: 'AMBIGUOUS_TENANT',
  ADMIN_AUTH_REQUIRED: 'ADMIN_AUTH_REQUIRED',
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
 * Thrown when a tenant attempts to access schemas they do not own.
 * Returns 403 Forbidden to indicate the schemas exist but access is denied.
 */
export class SchemaAccessDeniedError extends ApiError {
  constructor(schemas: string[], databaseId: string) {
    super(
      ErrorCodes.SCHEMA_ACCESS_DENIED,
      403,
      `Access denied: requested schemas are not associated with tenant`,
      { schemas, databaseId }
    );
    this.name = 'SchemaAccessDeniedError';
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
 * Thrown when domain resolution is ambiguous (multiple APIs match).
 * This is a security concern as it indicates potential misconfiguration
 * that could lead to unpredictable tenant routing.
 */
export class AmbiguousTenantError extends ApiError {
  constructor(domain: string, subdomain: string | null, matchCount: number) {
    const fullDomain = subdomain ? `${subdomain}.${domain}` : domain;
    super(
      ErrorCodes.AMBIGUOUS_TENANT,
      500,
      `Ambiguous tenant resolution: multiple APIs (${matchCount}) match domain ${fullDomain}`,
      { domain, subdomain, fullDomain, matchCount }
    );
    this.name = 'AmbiguousTenantError';
  }
}

/**
 * Thrown when admin authentication is required but not provided or invalid.
 * Used for private API endpoints that require explicit admin credentials.
 */
export class AdminAuthRequiredError extends ApiError {
  constructor(reason: string) {
    super(
      ErrorCodes.ADMIN_AUTH_REQUIRED,
      401,
      `Admin authentication required: ${reason}`,
      { reason }
    );
    this.name = 'AdminAuthRequiredError';
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
