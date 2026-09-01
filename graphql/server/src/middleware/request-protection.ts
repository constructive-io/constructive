import './types'; // for Request type

import { errors } from '@constructive-io/errors';
import type { RequestProtection } from '@constructive-io/express-context';
import { DEFAULT_REQUEST_PROTECTION } from '@constructive-io/express-context';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { respondWithGraphQLError } from '../errors/graphql-response';

/**
 * Resolve the bounds this request runs under and attach them to it.
 *
 * The values come from the tenant's own `database_settings`/`api_settings`
 * (clamped by the platform), read through the cached loader, so the cost is one
 * routing-plane query per database/API per TTL window. A database with no
 * settings row — or a request that arrived before the context middleware could
 * resolve one — still gets the platform defaults, never "unlimited".
 */
const resolveProtection = async (req: Request): Promise<RequestProtection> => {
  const resolved = await req.constructive?.useModule('requestProtection');
  return resolved ?? DEFAULT_REQUEST_PROTECTION;
};

/**
 * Multipart requests carry file bodies, which are streamed by the upload
 * plugin and bounded by the upload limits rather than by the GraphQL request
 * size: applying a JSON-sized cap to them would reject every upload.
 */
const isMultipart = (req: Request): boolean =>
  (req.get('content-type') ?? '').toLowerCase().startsWith('multipart/form-data');

/**
 * Express middleware that resolves request protection and enforces the one
 * bound that has to be checked before the body is read.
 *
 * The document bounds (depth, cost, page size, introspection) are enforced by
 * `RequestProtectionPlugin` inside grafast, which is where the parsed document
 * and coerced variables exist; this middleware exists so the resolved values
 * are on the request by the time either that plugin or the pgSettings builder
 * asks for them.
 *
 * Mount after the context middleware and before the GraphQL handler.
 */
export const createRequestProtectionMiddleware = (): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // A lookup failure is neither "unlimited" nor "the defaults": the request
    // has no known bounds, so it is handed to the error handler rather than
    // served under numbers nobody chose.
    let protection: RequestProtection;
    try {
      protection = await resolveProtection(req);
    } catch (e) {
      next(e);
      return;
    }

    req.requestProtection = protection;

    const declaredLength = Number(req.get('content-length') ?? '');
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > protection.maxRequestBytes &&
      !isMultipart(req)
    ) {
      respondWithGraphQLError(
        res,
        errors.REQUEST_TOO_LARGE({ bytes: declaredLength, limit: protection.maxRequestBytes })
      );
      return;
    }

    next();
  };
};
