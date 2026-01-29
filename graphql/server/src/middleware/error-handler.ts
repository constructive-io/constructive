/**
 * Express 5 Error Handler Middleware
 *
 * Provides centralized error handling for the GraphQL server with:
 * - Typed API error handling with correct status codes
 * - Content negotiation (JSON vs HTML responses)
 * - Error message sanitization for production
 * - Request context logging
 * - Headers-sent guard to prevent double responses
 */

import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { Logger } from '@pgpmjs/logger';
import { ApiError, isApiError } from '../errors/api-errors';
import errorPage404Message from '../errors/404-message';
import errorPage50x from '../errors/50x';
import './types'; // for extended Request type

const log = new Logger('error-handler');

/**
 * Check if we're in development mode
 */
const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';

/**
 * Sanitize error messages for safe exposure to clients.
 *
 * In development: show full error messages for debugging
 * In production: sanitize internal errors, preserve ApiError messages (they're user-safe)
 */
export function sanitizeMessage(error: Error): string {
  if (isDevelopment()) {
    return error.message;
  }

  // ApiError messages are designed to be user-safe
  if (isApiError(error)) {
    return error.message;
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
 * Check if the client prefers JSON responses based on Accept header.
 */
export function wantsJson(req: Request): boolean {
  const accept = req.get('Accept') || '';
  return accept.includes('application/json') || accept.includes('application/graphql-response+json');
}

/**
 * Log error with request context.
 */
function logError(error: Error, req: Request, level: 'warn' | 'error' = 'error'): void {
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
 * Express 5 error handler middleware.
 *
 * Handles all errors thrown in the application with:
 * - Correct HTTP status codes based on error type
 * - Content negotiation for JSON/HTML responses
 * - Error sanitization in production
 * - Request context logging
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Prevent double-sending if headers already sent
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

  // 1. API Errors - use their built-in status codes
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
      // For 4xx use 404 message template, for 5xx use 50x template
      if (err.statusCode >= 500) {
        res.status(err.statusCode).send(errorPage50x);
      } else {
        res.status(err.statusCode).send(errorPage404Message(sanitizeMessage(err)));
      }
    }
    return;
  }

  // 2. Database Connection Errors (ECONNREFUSED, connection terminated) - 503 Service Unavailable
  if (err.message?.includes('ECONNREFUSED') || err.message?.includes('connection terminated')) {
    logError(err, req);
    res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: sanitizeMessage(err),
        requestId: req.requestId,
      },
    });
    return;
  }

  // 3. Timeout Errors - 504 Gateway Timeout
  if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
    logError(err, req);
    res.status(504).json({
      error: {
        code: 'GATEWAY_TIMEOUT',
        message: sanitizeMessage(err),
        requestId: req.requestId,
      },
    });
    return;
  }

  // 4. GraphQL Errors - 400 Bad Request
  if (err.name === 'GraphQLError') {
    logError(err, req, 'warn');
    res.status(400).json({
      errors: [{ message: sanitizeMessage(err) }],
    });
    return;
  }

  // 5. Unknown Errors - 500 Internal Server Error
  logError(err, req);
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
 * Not Found handler for unmatched routes.
 *
 * Should be registered after all other routes to catch 404s.
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
