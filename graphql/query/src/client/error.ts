/**
 * Error handling for GraphQL operations.
 *
 * This is a thin client-side adapter over the canonical `@constructive-io/errors`
 * package. The package owns the single source of truth for error codes, their
 * public/internal class, message copy (i18n), and cross-source parsing (pg
 * `DatabaseError`, GraphQL `extensions`, structured `DETAIL`, message tokens,
 * and native SQLSTATE). There is no separate client-side error catalog or
 * message string-matching anymore.
 */

import {
  ConstructiveError,
  errors,
  isPublicCode,
  parse,
  type ParsedError,
  toError,
} from '@constructive-io/errors';

export {
  ConstructiveError,
  classify,
  format,
  isPublicCode,
  parse,
  type ErrorClass,
  type ErrorContext,
  type ParsedError,
  toError,
} from '@constructive-io/errors';

/** Shape of a single GraphQL error entry in a response `errors[]` array. */
export interface GraphQLError {
  message: string;
  extensions?: { code?: string; class?: string } & Record<string, unknown>;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
}

/**
 * Parse any error (pg error, GraphQL error/response, `ConstructiveError`, plain
 * `Error`, or string) into a throwable {@link ConstructiveError}.
 */
export function parseGraphQLError(error: unknown, locale?: string): ConstructiveError {
  return toError(error, locale);
}

/** True when the value is a {@link ConstructiveError}. */
export function isConstructiveError(error: unknown): error is ConstructiveError {
  return error instanceof ConstructiveError;
}

/** Codes worth automatically retrying (transient transport/rate failures). */
const RETRYABLE_CODES = new Set([
  'NETWORK_ERROR',
  'TIMEOUT_ERROR',
  'RATE_LIMITED',
  'TOO_MANY_REQUESTS',
]);

/** Whether an error is safe to retry (network/timeout/rate-limit). */
export function isRetryable(error: unknown): boolean {
  const { code } = parse(error) as ParsedError;
  return Boolean(code && RETRYABLE_CODES.has(code));
}

/**
 * Factory for the transport/HTTP-level errors the client synthesizes itself
 * (before any server/DB response is parsed). All produce a
 * {@link ConstructiveError} from the canonical registry.
 */
export const createError = {
  network: (originalError?: Error) =>
    errors.NETWORK_ERROR({}, originalError?.message),

  timeout: () => errors.TIMEOUT_ERROR(),

  unauthorized: (message = 'Authentication required') =>
    errors.UNAUTHENTICATED({}, message),

  forbidden: (message = 'Access forbidden') => errors.FORBIDDEN({}, message),

  notFound: (message = 'Resource not found') => errors.NOT_FOUND({}, message),

  badRequest: (message: string) => errors.BAD_USER_INPUT({}, message),

  graphql: (error: unknown) => toError(error),

  unknown: (originalError: Error) => toError(originalError),
};

/** Whether an error is safe to surface to end users (public class). */
export function isPublicError(error: unknown): boolean {
  return isPublicCode(parse(error).code);
}
