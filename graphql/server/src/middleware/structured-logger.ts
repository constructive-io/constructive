/**
 * Structured JSON Logging Middleware
 *
 * Provides comprehensive request logging for the GraphQL server with:
 * - ISO timestamp formatting
 * - Unique request ID tracking
 * - GraphQL operation details (type, name, path)
 * - Request duration measurement
 * - Tenant/service context
 * - Client information (IP, User-Agent)
 * - Error capture with stack traces
 *
 * Compatible with log aggregators (ELK, Datadog, CloudWatch, etc.)
 */

import { RequestHandler, Request, Response, NextFunction } from 'express';
import { Logger } from '@pgpmjs/logger';
import { randomUUID } from 'crypto';
import { parse, OperationDefinitionNode, DocumentNode } from 'graphql';
import './types'; // for extended Request type

const log = new Logger('request');

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface GraphQLOperationInfo {
  operationType: 'query' | 'mutation' | 'subscription' | null;
  operationName: string | null;
  path: string | null;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  tenantId: string | null;
  svcKey: string | null;
  operationType: string | null;
  operationName: string | null;
  durationMs: number | null;
  statusCode: number | null;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  path: string;
  userAgent: string | null;
  ip: string | null;
  method: string;
  host: string;
}

/**
 * Parse GraphQL operation info from request body.
 * Safely handles parsing errors and returns null for non-GraphQL requests.
 */
export function parseGraphQLOperation(body: unknown): GraphQLOperationInfo {
  const result: GraphQLOperationInfo = {
    operationType: null,
    operationName: null,
    path: null,
  };

  if (!body || typeof body !== 'object') {
    return result;
  }

  const gqlBody = body as { query?: string; operationName?: string };

  // Extract operation name from body if provided
  if (gqlBody.operationName) {
    result.operationName = gqlBody.operationName;
  }

  // Parse the query to extract operation type
  if (gqlBody.query && typeof gqlBody.query === 'string') {
    try {
      const document: DocumentNode = parse(gqlBody.query);
      const operation = document.definitions.find(
        (def): def is OperationDefinitionNode => def.kind === 'OperationDefinition'
      );

      if (operation) {
        result.operationType = operation.operation;
        // Use operation name from AST if not provided in body
        if (!result.operationName && operation.name?.value) {
          result.operationName = operation.name.value;
        }
        // Extract first field name as path
        if (operation.selectionSet?.selections?.length > 0) {
          const firstSelection = operation.selectionSet.selections[0];
          if (firstSelection.kind === 'Field') {
            result.path = firstSelection.name.value;
          }
        }
      }
    } catch {
      // Invalid GraphQL query - leave fields as null
    }
  }

  return result;
}

/**
 * Build a structured log entry with all required fields.
 */
export function buildLogEntry(
  level: LogLevel,
  req: Request,
  res: Response | null,
  durationMs: number | null,
  operationInfo: GraphQLOperationInfo,
  error?: Error
): StructuredLogEntry {
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    requestId: req.requestId || 'unknown',
    tenantId: req.databaseId || null,
    svcKey: req.svc_key || null,
    operationType: operationInfo.operationType,
    operationName: operationInfo.operationName,
    durationMs,
    statusCode: res?.statusCode || null,
    path: operationInfo.path || req.path,
    userAgent: req.get('User-Agent') || null,
    ip: req.clientIp || req.ip || null,
    method: req.method,
    host: req.hostname || req.get('host') || 'unknown',
  };

  if (error) {
    entry.error = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: (error as any).code,
    };
  }

  return entry;
}

/**
 * Log a structured entry using the appropriate log level.
 */
export function logStructured(entry: StructuredLogEntry): void {
  // Pass the entry as an object - Logger handles JSON serialization
  const { level, ...data } = entry;
  log[level](data);
}

/**
 * Determine log level based on status code.
 */
function getLogLevelFromStatus(statusCode: number): LogLevel {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/**
 * Express middleware for structured JSON logging.
 *
 * Features:
 * - Assigns unique request ID (uses X-Request-ID header if provided)
 * - Logs request start at debug level
 * - Logs request completion with duration
 * - Captures GraphQL operation details
 * - Handles errors with proper error objects
 *
 * Usage:
 * ```ts
 * app.use(structuredLogger());
 * ```
 */
export function structuredLogger(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Assign request ID from header or generate new one
    const headerRequestId = req.header('x-request-id');
    const requestId = headerRequestId || randomUUID();
    req.requestId = requestId;

    // Track request start time
    const startTime = process.hrtime.bigint();

    // Parse GraphQL operation info (body may not be parsed yet, so we'll do it on finish)
    let operationInfo: GraphQLOperationInfo = {
      operationType: null,
      operationName: null,
      path: null,
    };

    // Log request start at debug level
    log.debug({
      timestamp: new Date().toISOString(),
      level: 'debug',
      requestId,
      event: 'request_start',
      method: req.method,
      path: req.path,
      host: req.hostname || req.get('host') || 'unknown',
      ip: req.clientIp || req.ip || null,
      userAgent: req.get('User-Agent') || null,
    });

    // Track any error that occurs during request processing
    let requestError: Error | undefined;

    // Capture the original res.json to intercept GraphQL responses
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Try to extract GraphQL errors from response
      if (body?.errors?.length > 0) {
        const firstError = body.errors[0];
        requestError = new Error(firstError.message);
        if (firstError.extensions?.code) {
          (requestError as any).code = firstError.extensions.code;
        }
      }
      return originalJson(body);
    };

    // Log on response finish
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;

      // Parse GraphQL operation info from request body (now available)
      if (req.body) {
        operationInfo = parseGraphQLOperation(req.body);
      }

      const level = requestError ? 'error' : getLogLevelFromStatus(res.statusCode);

      const entry = buildLogEntry(
        level,
        req,
        res,
        parseFloat(durationMs.toFixed(2)),
        operationInfo,
        requestError
      );

      logStructured(entry);
    });

    // Handle errors that occur before response
    res.on('error', (err: Error) => {
      requestError = err;
    });

    next();
  };
}

/**
 * Log a custom structured event (not tied to request lifecycle).
 * Useful for logging specific events within resolvers or middleware.
 */
export function logEvent(
  level: LogLevel,
  event: string,
  data: Record<string, unknown>,
  req?: Request
): void {
  log[level]({
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: req?.requestId || null,
    tenantId: req?.databaseId || null,
    svcKey: req?.svc_key || null,
    ...data,
  });
}

export default structuredLogger;
