import { getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { randomUUID } from 'crypto';
import './types'; // for Request type

const log = new Logger('request');

/**
 * Check if we're in development mode
 */
const isDev = (): boolean => getNodeEnv() === 'development';

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      requestStartTime?: number;
    }
  }
}

/**
 * Extracts GraphQL operation details from the request body
 */
const extractGraphQLInfo = (
  req: Request
): {
  operationName?: string;
  query?: string;
  variables?: Record<string, any>;
} => {
  try {
    if (req.body && typeof req.body === 'object') {
      return {
        operationName: req.body.operationName,
        query: req.body.query,
        variables: req.body.variables,
      };
    }
  } catch {
    // ignore parse errors
  }
  return {};
};

/**
 * Truncates a string for logging (to avoid massive query logs)
 */
const truncate = (str: string | undefined, maxLen = 200): string => {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
};

/**
 * Sanitizes variables for logging (redacts potentially sensitive fields)
 */
const sanitizeVariables = (
  variables: Record<string, any> | undefined
): Record<string, any> | undefined => {
  if (!variables) return undefined;

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'credential',
  ];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(variables)) {
    const isValueSensitive = sensitiveKeys.some((sk) =>
      key.toLowerCase().includes(sk.toLowerCase())
    );
    sanitized[key] = isValueSensitive ? '[REDACTED]' : value;
  }

  return sanitized;
};

/**
 * Creates the request ID and timing middleware
 * This middleware should be added early in the middleware chain
 */
export const createRequestLoggerMiddleware = (): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Generate or use existing request ID (from header if provided)
    const requestId = req.get('X-Request-ID') || randomUUID().split('-')[0];
    req.requestId = requestId;
    req.requestStartTime = Date.now();

    // Set request ID in response header for correlation
    res.setHeader('X-Request-ID', requestId);

    const method = req.method;
    const url = req.originalUrl || req.url;
    const clientIp = req.clientIp || req.ip;

    // Only log debug info in development
    if (isDev()) {
      log.debug(`[${requestId}] --> ${method} ${url} from ${clientIp}`);
      log.debug(
        `[${requestId}] Headers: host=${req.get('host')}, origin=${req.get('origin')}, user-agent=${truncate(req.get('user-agent'), 100)}`
      );
    }

    // Capture response finish to log completion
    res.on('finish', () => {
      const duration = Date.now() - (req.requestStartTime || Date.now());
      const statusCode = res.statusCode;
      const statusEmoji =
        statusCode >= 500 ? '❌' : statusCode >= 400 ? '⚠️' : '✓';

      // Only log debug info in development
      if (isDev()) {
        log.debug(
          `[${requestId}] <-- ${statusEmoji} ${statusCode} ${method} ${url} (${duration}ms)`
        );
      }
    });

    next();
  };
};

/**
 * Middleware to log GraphQL-specific request details
 * Should be placed after body parsing middleware
 */
export const createGraphQLLoggerMiddleware = (): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.requestId || 'unknown';

    // Only log for GraphQL endpoints in development
    if (isDev() && req.path === '/graphql' && req.method === 'POST') {
      const { operationName, query, variables } = extractGraphQLInfo(req);

      if (operationName || query) {
        log.debug(
          `[${requestId}] GraphQL operation: ${operationName || 'anonymous'}`
        );

        if (query) {
          // Extract operation type (query/mutation/subscription)
          const opTypeMatch = query.match(/^\s*(query|mutation|subscription)/i);
          const opType = opTypeMatch ? opTypeMatch[1] : 'query';
          log.debug(`[${requestId}] GraphQL type: ${opType}`);
          log.debug(`[${requestId}] GraphQL query: ${truncate(query, 500)}`);
        }

        if (variables && Object.keys(variables).length > 0) {
          const sanitized = sanitizeVariables(variables);
          log.debug(
            `[${requestId}] GraphQL variables: ${JSON.stringify(sanitized)}`
          );
        }
      }
    }

    next();
  };
};

/**
 * Helper to get the request ID for logging in other middleware
 */
export const getRequestId = (req: Request): string => {
  return req.requestId || 'unknown';
};

/**
 * Creates a scoped logger that includes request ID
 * Debug logs only appear in development environment
 */
export const createRequestScopedLogger = (scope: string) => {
  const scopedLog = new Logger(scope);

  return {
    // Debug only logs in development
    debug: (req: Request, message: string, ...args: any[]) => {
      if (isDev()) {
        scopedLog.debug(`[${getRequestId(req)}] ${message}`, ...args);
      }
    },
    info: (req: Request, message: string, ...args: any[]) =>
      scopedLog.info(`[${getRequestId(req)}] ${message}`, ...args),
    warn: (req: Request, message: string, ...args: any[]) =>
      scopedLog.warn(`[${getRequestId(req)}] ${message}`, ...args),
    error: (req: Request, message: string, ...args: any[]) =>
      scopedLog.error(`[${getRequestId(req)}] ${message}`, ...args),
    success: (req: Request, message: string, ...args: any[]) =>
      scopedLog.success(`[${getRequestId(req)}] ${message}`, ...args),
  };
};
