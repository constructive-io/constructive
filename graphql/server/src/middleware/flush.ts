import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { graphileCache } from 'graphile-cache';
import { getPgPool } from 'pg-cache';
import './types'; // for Request type

const log = new Logger('flush');

/**
 * Get the flush secret from environment variable.
 * Returns undefined if not configured (flush endpoint will be disabled).
 */
const getFlushSecret = (): string | undefined => {
  return process.env.FLUSH_SECRET;
};

/**
 * Simple in-memory rate limiter for flush endpoint.
 * Limits to 10 requests per minute per IP.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

const isRateLimited = (clientIp: string): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  return false;
};

/**
 * Validate bearer token for flush endpoint authentication.
 * Returns true if token is valid, false otherwise.
 */
const validateFlushToken = (authHeader: string | undefined): boolean => {
  const flushSecret = getFlushSecret();

  // If no secret is configured, deny all requests (fail-secure)
  if (!flushSecret) {
    log.warn('FLUSH_SECRET not configured - flush endpoint is disabled');
    return false;
  }

  if (!authHeader) {
    return false;
  }

  const [authType, token] = authHeader.split(' ');

  if (authType?.toLowerCase() !== 'bearer' || !token) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (token.length !== flushSecret.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ flushSecret.charCodeAt(i);
  }

  return mismatch === 0;
};

export const flush = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.url === '/flush') {
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const svcKey = (req as any).svc_key;

    // Rate limiting check
    if (isRateLimited(clientIp)) {
      log.warn(`Flush rate limit exceeded for IP: ${clientIp}`);
      res.status(429).send('Too Many Requests');
      return;
    }

    // Authentication check
    const authHeader = req.headers.authorization;
    if (!validateFlushToken(authHeader)) {
      log.warn(`Unauthorized flush attempt from IP: ${clientIp}, svc_key: ${svcKey || 'none'}`);
      res.status(401).send('Unauthorized');
      return;
    }

    // Perform the flush operation
    graphileCache.delete(svcKey);
    svcCache.delete(svcKey);

    log.info(`Cache flushed successfully - IP: ${clientIp}, svc_key: ${svcKey || 'none'}`);
    res.status(200).send('OK');
    return;
  }
  return next();
};

export const flushService = async (
  opts: ConstructiveOptions,
  databaseId: string
): Promise<void> => {
  const pgPool = getPgPool(opts.pg);
  log.info('flushing db ' + databaseId);

  const api = new RegExp(`^api:${databaseId}:.*`);
  const schemata = new RegExp(`^schemata:${databaseId}:.*`);
  const meta = new RegExp(`^metaschema:api:${databaseId}`);

  if (!opts.api.isPublic) {
    graphileCache.forEach((_, k: string) => {
      if (api.test(k) || schemata.test(k) || meta.test(k)) {
        graphileCache.delete(k);
        svcCache.delete(k);
      }
    });
  }

  const svc = await pgPool.query(
    `SELECT *
     FROM services_public.domains
     WHERE database_id = $1`,
    [databaseId]
  );

  if (svc.rowCount === 0) return;

  for (const row of svc.rows) {
    let key: string | undefined;
    if (row.domain && !row.subdomain) {
      key = row.domain;
    } else if (row.domain && row.subdomain) {
      key = `${row.subdomain}.${row.domain}`;
    }
    if (key) {
      graphileCache.delete(key);
      svcCache.delete(key);
    }
  }
};
