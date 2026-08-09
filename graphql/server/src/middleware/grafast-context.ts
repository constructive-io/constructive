import { DEFAULT_CSRF_COOKIE_NAME } from '@constructive-io/csrf';
import type { Request } from 'express';

/**
 * Forward the exact request-owned Constructive Context into Graphile.
 * Resolvers must not reconstruct Tenant, route, session, or loader state.
 */
export const createGrafastRequestContext = (
  req: Request | undefined,
  pgSettings: Record<string, string>
): Record<string, unknown> => ({
  pgSettings,
  ...(req?.constructive ? { constructive: req.constructive } : {}),
  ...(typeof req?.cookies?.[DEFAULT_CSRF_COOKIE_NAME] === 'string'
    ? { browserBinding: req.cookies[DEFAULT_CSRF_COOKIE_NAME] }
    : {})
});
