/**
 * Error handling for GraphQL operations
 * Provides consistent error types and parsing for PostGraphile responses
 */

// ============================================================================
// Error Types
// ============================================================================

export const DataErrorType = {
  // Network/Connection errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_MUTATION_DATA: 'INVALID_MUTATION_DATA',

  // Query errors
  QUERY_GENERATION_FAILED: 'QUERY_GENERATION_FAILED',
  QUERY_EXECUTION_FAILED: 'QUERY_EXECUTION_FAILED',

  // Permission errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Schema errors
  TABLE_NOT_FOUND: 'TABLE_NOT_FOUND',

  // Request errors
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',

  // GraphQL-specific errors
  GRAPHQL_ERROR: 'GRAPHQL_ERROR',

  // PostgreSQL constraint errors (surfaced via PostGraphile)
  UNIQUE_VIOLATION: 'UNIQUE_VIOLATION',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
  NOT_NULL_VIOLATION: 'NOT_NULL_VIOLATION',
  CHECK_VIOLATION: 'CHECK_VIOLATION',
  EXCLUSION_VIOLATION: 'EXCLUSION_VIOLATION',

  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type DataErrorType = (typeof DataErrorType)[keyof typeof DataErrorType];

// ============================================================================
// DataError Class
// ============================================================================

export interface DataErrorOptions {
  tableName?: string;
  fieldName?: string;
  constraint?: string;
  originalError?: Error;
  code?: string;
  context?: Record<string, unknown>;
}

/**
 * Standard error class for data layer operations
 */
export class DataError extends Error {
  public readonly type: DataErrorType;
  public readonly code?: string;
  public readonly originalError?: Error;
  public readonly context?: Record<string, unknown>;
  public readonly tableName?: string;
  public readonly fieldName?: string;
  public readonly constraint?: string;

  constructor(
    type: DataErrorType,
    message: string,
    options: DataErrorOptions = {},
  ) {
    super(message);
    this.name = 'DataError';
    this.type = type;
    this.code = options.code;
    this.originalError = options.originalError;
    this.context = options.context;
    this.tableName = options.tableName;
    this.fieldName = options.fieldName;
    this.constraint = options.constraint;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DataError);
    }
  }

  getUserMessage(): string {
    switch (this.type) {
      case DataErrorType.NETWORK_ERROR:
        return 'Network error. Please check your connection and try again.';
      case DataErrorType.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.';
      case DataErrorType.UNAUTHORIZED:
        return 'You are not authorized. Please log in and try again.';
      case DataErrorType.FORBIDDEN:
        return 'You do not have permission to access this resource.';
      case DataErrorType.VALIDATION_FAILED:
        return 'Validation failed. Please check your input and try again.';
      case DataErrorType.REQUIRED_FIELD_MISSING:
        return this.fieldName
          ? `The field "${this.fieldName}" is required.`
          : 'A required field is missing.';
      case DataErrorType.UNIQUE_VIOLATION:
        return this.fieldName
          ? `A record with this ${this.fieldName} already exists.`
          : 'A record with this value already exists.';
      case DataErrorType.FOREIGN_KEY_VIOLATION:
        return 'This record references a record that does not exist.';
      case DataErrorType.NOT_NULL_VIOLATION:
        return this.fieldName
          ? `The field "${this.fieldName}" cannot be empty.`
          : 'A required field cannot be empty.';
      case DataErrorType.CHECK_VIOLATION:
        return this.fieldName
          ? `The value for "${this.fieldName}" is not valid.`
          : 'The value does not meet the required constraints.';
      default:
        return this.message || 'An unexpected error occurred.';
    }
  }

  isRetryable(): boolean {
    return (
      this.type === DataErrorType.NETWORK_ERROR ||
      this.type === DataErrorType.TIMEOUT_ERROR
    );
  }
}

// ============================================================================
// PostgreSQL Error Codes
// ============================================================================

export const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  EXCLUSION_VIOLATION: '23P01',
  NUMERIC_VALUE_OUT_OF_RANGE: '22003',
  STRING_DATA_RIGHT_TRUNCATION: '22001',
  INVALID_TEXT_REPRESENTATION: '22P02',
  DATETIME_FIELD_OVERFLOW: '22008',
  UNDEFINED_TABLE: '42P01',
  UNDEFINED_COLUMN: '42703',
  INSUFFICIENT_PRIVILEGE: '42501',
} as const;

// ============================================================================
// Error Factory
// ============================================================================

export const createError = {
  network: (originalError?: Error) =>
    new DataError(DataErrorType.NETWORK_ERROR, 'Network error occurred', {
      originalError,
    }),

  timeout: (originalError?: Error) =>
    new DataError(DataErrorType.TIMEOUT_ERROR, 'Request timed out', {
      originalError,
    }),

  unauthorized: (message = 'Authentication required') =>
    new DataError(DataErrorType.UNAUTHORIZED, message),

  forbidden: (message = 'Access forbidden') =>
    new DataError(DataErrorType.FORBIDDEN, message),

  badRequest: (message: string, code?: string) =>
    new DataError(DataErrorType.BAD_REQUEST, message, { code }),

  notFound: (message = 'Resource not found') =>
    new DataError(DataErrorType.NOT_FOUND, message),

  graphql: (message: string, code?: string) =>
    new DataError(DataErrorType.GRAPHQL_ERROR, message, { code }),

  uniqueViolation: (message: string, fieldName?: string, constraint?: string) =>
    new DataError(DataErrorType.UNIQUE_VIOLATION, message, {
      fieldName,
      constraint,
      code: '23505',
    }),

  foreignKeyViolation: (
    message: string,
    fieldName?: string,
    constraint?: string,
  ) =>
    new DataError(DataErrorType.FOREIGN_KEY_VIOLATION, message, {
      fieldName,
      constraint,
      code: '23503',
    }),

  notNullViolation: (
    message: string,
    fieldName?: string,
    constraint?: string,
  ) =>
    new DataError(DataErrorType.NOT_NULL_VIOLATION, message, {
      fieldName,
      constraint,
      code: '23502',
    }),

  unknown: (originalError: Error) =>
    new DataError(DataErrorType.UNKNOWN_ERROR, originalError.message, {
      originalError,
    }),
};

// ============================================================================
// Error Parsing
// ============================================================================

export interface GraphQLError {
  message: string;
  extensions?: { code?: string } & Record<string, unknown>;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
}

function parseGraphQLErrorCode(code: string | undefined): DataErrorType {
  if (!code) return DataErrorType.UNKNOWN_ERROR;
  const normalized = code.toUpperCase();

  // GraphQL standard codes
  if (normalized === 'UNAUTHENTICATED') return DataErrorType.UNAUTHORIZED;
  if (normalized === 'FORBIDDEN') return DataErrorType.FORBIDDEN;
  if (normalized === 'GRAPHQL_VALIDATION_FAILED')
    return DataErrorType.QUERY_GENERATION_FAILED;

  // PostgreSQL SQLSTATE codes
  if (code === PG_ERROR_CODES.UNIQUE_VIOLATION)
    return DataErrorType.UNIQUE_VIOLATION;
  if (code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION)
    return DataErrorType.FOREIGN_KEY_VIOLATION;
  if (code === PG_ERROR_CODES.NOT_NULL_VIOLATION)
    return DataErrorType.NOT_NULL_VIOLATION;
  if (code === PG_ERROR_CODES.CHECK_VIOLATION)
    return DataErrorType.CHECK_VIOLATION;
  if (code === PG_ERROR_CODES.EXCLUSION_VIOLATION)
    return DataErrorType.EXCLUSION_VIOLATION;

  return DataErrorType.UNKNOWN_ERROR;
}

function classifyByMessage(message: string): DataErrorType {
  const lower = message.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return DataErrorType.TIMEOUT_ERROR;
  }
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('failed to fetch')
  ) {
    return DataErrorType.NETWORK_ERROR;
  }
  if (
    lower.includes('unauthorized') ||
    lower.includes('authentication required')
  ) {
    return DataErrorType.UNAUTHORIZED;
  }
  if (lower.includes('forbidden') || lower.includes('permission')) {
    return DataErrorType.FORBIDDEN;
  }
  if (lower.includes('duplicate key') || lower.includes('already exists')) {
    return DataErrorType.UNIQUE_VIOLATION;
  }
  if (lower.includes('foreign key constraint')) {
    return DataErrorType.FOREIGN_KEY_VIOLATION;
  }
  if (
    lower.includes('not-null constraint') ||
    lower.includes('null value in column')
  ) {
    return DataErrorType.NOT_NULL_VIOLATION;
  }

  return DataErrorType.UNKNOWN_ERROR;
}

function extractFieldFromError(
  message: string,
  constraint?: string,
  column?: string,
): string | undefined {
  if (column) return column;

  const columnMatch = message.match(/column\s+"?([a-z_][a-z0-9_]*)"?/i);
  if (columnMatch) return columnMatch[1];

  if (constraint) {
    const constraintMatch = constraint.match(
      /_([a-z_][a-z0-9_]*)_(?:key|fkey|check|pkey)$/i,
    );
    if (constraintMatch) return constraintMatch[1];
  }

  const keyMatch = message.match(/Key\s+\(([a-z_][a-z0-9_]*)\)/i);
  if (keyMatch) return keyMatch[1];

  return undefined;
}

/**
 * Parse any error into a DataError
 */
export function parseGraphQLError(error: unknown): DataError {
  if (error instanceof DataError) {
    return error;
  }

  // GraphQL error object
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const gqlError = error as GraphQLError;
    const extCode = gqlError.extensions?.code;
    const mappedType = parseGraphQLErrorCode(extCode);

    const column = gqlError.extensions?.column as string | undefined;
    const constraint = gqlError.extensions?.constraint as string | undefined;
    const fieldName = extractFieldFromError(
      gqlError.message,
      constraint,
      column,
    );

    if (mappedType !== DataErrorType.UNKNOWN_ERROR) {
      return new DataError(mappedType, gqlError.message, {
        code: extCode,
        fieldName,
        constraint,
        context: gqlError.extensions,
      });
    }

    // Fallback: classify by message
    const fallbackType = classifyByMessage(gqlError.message);
    return new DataError(fallbackType, gqlError.message, {
      code: extCode,
      fieldName,
      constraint,
      context: gqlError.extensions,
    });
  }

  // Standard Error
  if (error instanceof Error) {
    const type = classifyByMessage(error.message);
    return new DataError(type, error.message, { originalError: error });
  }

  // Unknown
  const message = typeof error === 'string' ? error : 'Unknown error occurred';
  return new DataError(DataErrorType.UNKNOWN_ERROR, message);
}

/**
 * Check if value is a DataError
 */
export function isDataError(error: unknown): error is DataError {
  return error instanceof DataError;
}
