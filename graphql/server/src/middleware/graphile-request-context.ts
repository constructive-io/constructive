import {
  assertCompletePgSettings,
  type PgSettings,
  withPgSettingsRole,
  withTrustedPgClaims,
} from '@constructive-io/express-context';
import type { Request } from 'express';

/**
 * Read the canonical request context assembled by express-context.
 *
 * The sole derivative lane is the existing trusted private surface, where
 * server-stamped identity headers replace the anonymous identity and select
 * the authenticated execution role. Public requests never trust these
 * headers, and ordinary authenticated/anonymous requests reuse the exact
 * canonical object.
 */
export function getGraphileRequestPgSettings(
  req: Request | undefined,
  roleName: string
): PgSettings {
  const canonical = req?.constructive?.pgSettings;
  assertCompletePgSettings(canonical, 'req.constructive.pgSettings');

  const headerActorId = req?.get('X-Actor-Id');
  if (req?.api?.isPublic === false && !req.token?.user_id && headerActorId) {
    const trustedClaims: Record<string, string> = {
      'jwt.claims.user_id': headerActorId,
      'jwt.claims.principal_id': headerActorId,
    };
    const headerEntityId = req.get('X-Entity-Id');
    if (headerEntityId) {
      trustedClaims['jwt.claims.entity_id'] = headerEntityId;
    }
    const headerOrganizationId = req.get('X-Organization-Id');
    if (headerOrganizationId) {
      trustedClaims['jwt.claims.organization_id'] = headerOrganizationId;
    }

    return withPgSettingsRole(
      withTrustedPgClaims(canonical, trustedClaims),
      roleName
    );
  }

  return canonical;
}
