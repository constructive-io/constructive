import {
  assertCompletePgSettings,
  DEFAULT_REQUEST_PROTECTION,
  protectionPgSettings,
  type PgSettings,
} from '@constructive-io/express-context';
import type { Request } from 'express';

/**
 * Read the canonical request context assembled by express-context.
 *
 * Identity-bearing private headers remain inert until an authenticated
 * internal-ingress boundary owns their translation into trusted claims.
 */
export function getGraphileRequestPgSettings(
  req: Request | undefined
): PgSettings {
  const canonical = req?.constructive?.pgSettings;
  assertCompletePgSettings(canonical, 'req.constructive.pgSettings');
  // Protection is resolved after express-context, so apply its current bounds
  // at execution time while retaining the single canonical request object.
  Object.assign(canonical, protectionPgSettings(req?.requestProtection ?? DEFAULT_REQUEST_PROTECTION));
  return canonical;
}
