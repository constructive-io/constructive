/**
 * Express 5 Error Handler Middleware
 *
 * Centralized error handling with:
 * - Format negotiation (JSON/HTML based on Accept header)
 * - Message sanitization for production
 * - Request context logging
 * - Error categorization with appropriate status codes
 *
 * @module middleware/error-handler
 */

import { getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';

import { ApiError, isApiError } from '../errors/api-errors';
import errorPage404Message from '../errors/404-message';
import errorPage50x from '../errors/50x';
import './types';

const log = new Logger('error-handler');

/**
 * Check if the current environment is development mode.
 */
function isDevelopment(): boolean {
  return getNodeEnv() === 'development';
}

/**
 * Determines response format based on the Accept header.
 *
 * @param req - Express request object
 * @returns true if client prefers JSON, false for HTML
 */
export function wantsJson(req: Request): boolean {
  const accept = req.get('Accept') || '';
  return (
    accept.includes('application/json') ||
    accept.includes('application/graphql-response+json')
  );
}

/**
 * Sanitizes error messages for production responses.
 *
 * In development mode, returns full error messages for debugging.
 * In production, maps known error patterns to safe messages and
 * preserves ApiError messages (designed to be user-safe).
 *
 * @param error - The error to sanitize
 * @returns A sanitized, user-safe message
 */
export function sanitizeMessage(error: Error): string {
  if (isDevelopment()) {
    return error.message;
  }

  if (isApiError(error)) {
    return error.message; // ApiError messages are user-safe by design
  }

  // Map known error patterns to safe messages
  if (error.message?.includes('ECONNREFUSED')) {
    return 'Service temporarily unavailable';
  }
  if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
    return 'Request timed out';
  }
  if (error.message?.includes('does not exist')) {
    return 'The requested resource does not exist';
  }

  return 'An unexpected error occurred';
}

/**
 * Logs an error with full request context for observability.
 *
 * @param error - The error to log
 * @param req - Express request object for context
 * @param level - Log level ('warn' for 4xx, 'error' for 5xx)
 */
function logError(
  error: Error,
  req: Request,
  level: 'warn' | 'error' = 'error'
): void {
  const context = {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    host: req.get('host'),
    databaseId: req.databaseId,
    svcKey: req.svc_key,
    clientIp: req.clientIp,
  };

  if (isApiError(error)) {
    log[level]({
      event: 'api_error',
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      ...context,
    });
  } else {
    log[level]({
      event: 'unexpected_error',
      name: error.name,
      message: error.message,
      stack: isDevelopment() ? error.stack : undefined,
      ...context,
    });
  }
}

/**
 * Primary error handler middleware for Express 5.
 *
 * Catches all errors thrown in the application and returns appropriate
 * responses based on error category and client format preference.
 *
 * Error categories:
 * - ApiError: Uses error's statusCode and code
 * - Database errors (ECONNREFUSED, connection terminated): 503
 * - Timeout errors (timeout, ETIMEDOUT): 504
 * - GraphQL errors: 400
 * - Unknown errors: 500
 *
 * @example
 * ```typescript
 * // Register as last middleware
 * app.use(errorHandler);
 * ```
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Prevent double-send if headers already sent
  if (res.headersSent) {
    log.warn({
      event: 'headers_already_sent',
      requestId: req.requestId,
      path: req.path,
      errorMessage: err.message,
    });
    return;
  }

  const useJson = wantsJson(req);

  // 1. ApiError handling
  if (isApiError(err)) {
    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
    logError(err, req, logLevel);

    if (useJson) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: sanitizeMessage(err),
          requestId: req.requestId,
        },
      });
    } else {
      if (err.statusCode >= 500) {
        res.status(err.statusCode).send(errorPage50x);
      } else {
        res.status(err.statusCode).send(errorPage404Message(sanitizeMessage(err)));
      }
    }
    return;
  }

  // 2. Database error handling (503)
  if (
    err.message?.includes('ECONNREFUSED') ||
    err.message?.includes('connection terminated')
  ) {
    logError(err, req, 'error');

    if (useJson) {
      res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: sanitizeMessage(err),
          requestId: req.requestId,
        },
      });
    } else {
      res.status(503).send(errorPage50x);
    }
    return;
  }

  // 3. Timeout error handling (504)
  if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
    logError(err, req, 'error');

    if (useJson) {
      res.status(504).json({
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: sanitizeMessage(err),
          requestId: req.requestId,
        },
      });
    } else {
      res.status(504).send(errorPage50x);
    }
    return;
  }

  // 4. GraphQL error handling (400)
  if (err.name === 'GraphQLError') {
    logError(err, req, 'warn');

    if (useJson) {
      res.status(400).json({
        errors: [{ message: sanitizeMessage(err) }],
      });
    } else {
      res.status(400).send(errorPage404Message(sanitizeMessage(err)));
    }
    return;
  }

  // 5. Unknown error handling (500)
  logError(err, req, 'error');

  if (useJson) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: sanitizeMessage(err),
        requestId: req.requestId,
      },
    });
  } else {
    res.status(500).send(errorPage50x);
  }
};

/**
 * Not found handler for unmatched routes.
 *
 * Must be registered before errorHandler but after all route handlers.
 * Returns 404 with route information.
 *
 * @example
 * ```typescript
 * // Register after all routes
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 * ```
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const useJson = wantsJson(req);
  const message = `Route not found: ${req.method} ${req.path}`;

  log.warn({
    event: 'route_not_found',
    path: req.path,
    method: req.method,
    requestId: req.requestId,
  });

  if (useJson) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message,
        requestId: req.requestId,
      },
    });
  } else {
    res.status(404).send(errorPage404Message(message));
  }
};
