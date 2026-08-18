import {
  assertCompletePgSettings,
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
  return canonical;
}
