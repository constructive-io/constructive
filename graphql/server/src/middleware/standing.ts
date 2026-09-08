import './types'; // for Request type

import { errors } from '@constructive-io/errors';
import type { DatabaseStanding } from '@constructive-io/express-context';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { respondWithGraphQLError } from '../errors/graphql-response';

/**
 * Express middleware that refuses requests pinned to a database that is not in
 * good standing.
 *
 * The decision is the `standing` loader's (system-controlled
 * `suspended_at`/`suspended_reason` on `metaschema_public.database`, cached for
 * a few seconds), so an established client keeps being served for at most that
 * window after a suspension. A database the plane does not know is refused the
 * same way: a request pinned to it has nothing to run against. A lookup failure
 * is handed to the error handler — "could not verify" is not "allowed".
 *
 * A request without a resolved database (no context, or a plane without
 * `metaschema_public`) has nothing to be suspended and passes through.
 *
 * Mount after the context middleware and before the GraphQL handler.
 */
export const createStandingMiddleware = (): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let standing: DatabaseStanding | undefined;
    try {
      standing = await req.constructive?.useModule('standing');
    } catch (e) {
      next(e);
      return;
    }

    if (standing && (!standing.exists || standing.suspended)) {
      respondWithGraphQLError(
        res,
        errors.ACCESS_SUSPENDED(standing.reason ? { reason: standing.reason } : {}),
        { status: 403 }
      );
      return;
    }

    next();
  };
};
