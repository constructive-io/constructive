import './types'; // for Request type

import { parseUrl } from '@constructive-io/url-domains';
import corsPlugin from 'cors';
import type { Request, RequestHandler } from 'express';

import type { ApiStructure } from '../types';

export interface CorsOriginInput {
  origin?: string;
  fallbackOrigin?: string;
  api?: ApiStructure;
  requestHost?: string;
}

/** Shared HTTP/WebSocket origin policy. Missing origins are handled by the caller. */
export const isCorsOriginAllowed = ({
  origin,
  fallbackOrigin,
  api,
  requestHost
}: CorsOriginInput): boolean => {
  if (!origin) return false;
  const fallback = fallbackOrigin?.trim();
  if (fallback === '*') return true;
  if (fallback && origin.trim() === fallback) return true;

  if ([...(api?.corsOrigins ?? []), ...(api?.domains ?? [])].includes(origin)) {
    return true;
  }

  try {
    const parsedOrigin = new URL(origin);
    if (requestHost && parsedOrigin.host.toLowerCase() === requestHost.toLowerCase()) {
      return true;
    }
    const parsed = parseUrl(parsedOrigin);
    return parsed.domain === 'localhost';
  } catch {
    return false;
  }
};

/**
 * Unified CORS middleware for Constructive API
 *
 * Feature parity + compatibility:
 *  - Respects a global fallback origin (e.g. from env/CLI) for quick overrides.
 *  - Reads per-API CORS origins from typed cors_settings table (via req.api.corsOrigins).
 *  - Always allows localhost to ease development.
 *
 * Usage:
 *  app.use(cors(fallbackOrigin));
 */
export const cors = (fallbackOrigin?: string): RequestHandler => {
  // Use the cors library's dynamic origin function to decide per request
  const dynamicOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void, req: Request) => {
    const api = (req as any).api as ApiStructure | undefined;
    return callback(null, isCorsOriginAllowed({
      origin,
      fallbackOrigin,
      api,
      requestHost: req.get('host')
    }));
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
