import { getNodeEnv } from '@constructive-io/graphql-env';
import { parseUrl } from '@constructive-io/url-domains';
import { Logger } from '@pgpmjs/logger';
import corsPlugin from 'cors';
import type { Request, RequestHandler } from 'express';
import { CorsModuleData } from '../types';
import './types'; // for Request type

const log = new Logger('cors');

/**
 * Check if we're in development mode
 */
const isDev = (): boolean => getNodeEnv() === 'development';

/**
 * Unified CORS middleware for Constructive API
 *
 * Feature parity + compatibility:
 *  - Respects a global fallback origin (e.g. from env/CLI) for quick overrides.
 *  - Preserves multi-tenant, per-API CORS via meta schema ('cors' module + domains).
 *  - Always allows localhost to ease development.
 *
 * Usage:
 *  app.use(cors(fallbackOrigin));
 */
export const cors = (fallbackOrigin?: string): RequestHandler => {
  // Use the cors library's dynamic origin function to decide per request
  const dynamicOrigin = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean | string) => void,
    req: Request
  ) => {
    const requestId = (req as any).requestId || 'unknown';
    const logPrefix = `[${requestId}]`;
    const devMode = isDev();

    if (devMode) {
      log.debug(
        `${logPrefix} CORS check: origin=${origin || 'none'}, fallbackOrigin=${fallbackOrigin || 'none'}`
      );
    }

    // 1) Global fallback (fast path)
    if (fallbackOrigin && fallbackOrigin.trim().length) {
      if (fallbackOrigin.trim() === '*') {
        // Reflect whatever Origin the caller sent
        if (devMode)
          log.debug(`${logPrefix} CORS ALLOWED: wildcard fallback origin`);
        return callback(null, true);
      }
      if (origin && origin.trim() === fallbackOrigin.trim()) {
        if (devMode)
          log.debug(`${logPrefix} CORS ALLOWED: matches fallback origin`);
        return callback(null, true);
      }
      // If a strict fallback origin is provided and does not match,
      // continue to per-API checks below (do not immediately deny).
    }

    // 2) Per-API allowlist sourced from req.api (if available)
    //    createApiMiddleware runs before this in server.ts, so req.api should be set
    const api = (req as any).api as
      | { apiModules?: any[]; domains?: string[] }
      | undefined;
    if (api) {
      const corsModules = (api.apiModules || []).filter(
        (m: any) => m.name === 'cors'
      ) as { name: 'cors'; data: CorsModuleData }[];
      const siteUrls = api.domains || [];
      const listOfDomains = corsModules.reduce<string[]>(
        (m, mod) => [...mod.data.urls, ...m],
        siteUrls
      );

      if (devMode)
        log.debug(`${logPrefix} CORS allowlist: [${listOfDomains.join(', ')}]`);

      if (origin && listOfDomains.includes(origin)) {
        if (devMode)
          log.debug(`${logPrefix} CORS ALLOWED: origin in API allowlist`);
        return callback(null, true);
      }
    }

    // 3) Localhost is always allowed
    if (origin) {
      try {
        const parsed = parseUrl(new URL(origin));
        if (parsed.domain === 'localhost') {
          if (devMode) log.debug(`${logPrefix} CORS ALLOWED: localhost`);
          return callback(null, true);
        }
      } catch {
        // ignore invalid origin
        if (devMode) log.debug(`${logPrefix} CORS: failed to parse origin URL`);
      }
    }

    // Default: not allowed
    if (devMode) log.debug(`${logPrefix} CORS DENIED: origin not in allowlist`);
    return callback(null, false);
  };

  // Wrap in the cors plugin with our dynamic origin resolver
  const handler: RequestHandler = (req, res, next) =>
    corsPlugin({
      origin: (reqOrigin, cb) => dynamicOrigin(reqOrigin, cb as any, req),
      credentials: true,
      optionsSuccessStatus: 200,
    })(req, res, next);

  return handler;
};
