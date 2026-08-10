import { errors, toError } from '@constructive-io/errors';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { respondWithGraphQLError } from '../../errors/graphql-response';
import { callFunction, requiredBoolean } from './db-contract';

export const VALIDATE_SITE_SESSION_FUNCTION = 'validate_site_session';

/**
 * Validate Site-local sessions against their bound unified session.
 *
 * The authoritative `(site_id, api_id, principal_id)` tuple comes from
 * routing and authenticated credential pgSettings. API/service principals are
 * intentionally not Site sessions and remain available for handoff redemption.
 */
export const createSiteSessionValidationMiddleware = (): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const context = req.constructive;
    const token = context?.token;
    if (
      !context ||
      !context.siteId ||
      !token?.user_id ||
      token.kind === 'api_key'
    ) {
      next();
      return;
    }

    try {
      const surface = await context.useModule('ssoSurface');
      if (!surface) {
        next();
        return;
      }

      const row = await callFunction(
        context,
        surface,
        VALIDATE_SITE_SESSION_FUNCTION,
        [],
        []
      );
      if (!requiredBoolean(row, 'valid', VALIDATE_SITE_SESSION_FUNCTION)) {
        throw errors.INVALID_TOKEN();
      }
      next();
    } catch (cause) {
      const error = toError(cause);
      if (req.path === '/graphql' || req.originalUrl.startsWith('/graphql')) {
        respondWithGraphQLError(res, error);
        return;
      }
      next(error);
    }
  };
