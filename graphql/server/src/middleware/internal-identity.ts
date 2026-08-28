import type { Request } from 'express';

interface ServerApiTrustOptions {
  isPublic?: boolean;
}

/**
 * Internal identity headers are trusted only on an explicitly private server.
 * Route and API publication metadata must never be passed to this decision.
 */
export const trustsInternalIdentityHeaders = (
  serverApiOptions?: ServerApiTrustOptions
): boolean => serverApiOptions?.isPublic === false;

export const buildInternalIdentityContext = (
  req: Request,
  roleName: string,
  context: Record<string, string>,
  trusted: boolean
): { pgSettings: Record<string, string> } | null => {
  const actorId = req.get('X-Actor-Id');
  if (!trusted || !actorId) {
    return null;
  }

  const pgSettings: Record<string, string> = {
    role: roleName,
    'jwt.claims.user_id': actorId,
    'jwt.claims.principal_id': actorId,
    ...context
  };
  const entityId = req.get('X-Entity-Id');
  if (entityId) {
    pgSettings['jwt.claims.entity_id'] = entityId;
  }
  const organizationId = req.get('X-Organization-Id');
  if (organizationId) {
    pgSettings['jwt.claims.organization_id'] = organizationId;
  }
  if (req.requestId) {
    pgSettings['request.id'] = req.requestId;
  }

  return { pgSettings };
};
