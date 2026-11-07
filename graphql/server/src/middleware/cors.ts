import './types'; // for Request type

import corsPlugin from 'cors';
import type { Request, RequestHandler } from 'express';

/**
 * CORS for the routed API. Mount after the `api` middleware: the decision is
 * made against `req.api`, the API the request's host resolved to.
 *
 * An origin is allowed, with credentials, when it is exactly:
 *  - one of the routed API's typed `cors_settings` origins (`req.api.corsOrigins`,
 *    the API row first and the database default otherwise), or
 *  - the global fallback origin (`server.origin`), the platform's own origin.
 *    A fallback of `*` reflects any origin.
 *
 * Every other origin, localhost included, gets no CORS headers.
 */
export const cors = (fallbackOrigin?: string): RequestHandler => {
  const fallback = fallbackOrigin?.trim();

  const isAllowed = (origin: string | undefined, req: Request): boolean => {
    if (fallback === '*') return true;
    if (!origin) return false;
    if (origin === fallback) return true;
    return req.api?.corsOrigins?.includes(origin) ?? false;
  };

  return (req, res, next) =>
    corsPlugin({
      origin: (origin, callback) => callback(null, isAllowed(origin, req)),
      credentials: true,
      optionsSuccessStatus: 200
    })(req, res, next);
};
