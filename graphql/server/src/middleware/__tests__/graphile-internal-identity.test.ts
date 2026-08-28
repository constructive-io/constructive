import type { Request } from 'express';

import {
  buildInternalIdentityContext,
  trustsInternalIdentityHeaders
} from '../internal-identity';

const HEADERS = {
  'x-actor-id': 'actor-123',
  'x-entity-id': 'entity-456',
  'x-organization-id': 'organization-789'
};

const createRequest = (routeIsPublic: boolean): Request => ({
  api: {
    apiId: 'published-api',
    dbname: 'tenant_db',
    anonRole: 'anonymous',
    roleName: 'authenticated',
    schema: ['app_public'],
    databaseId: '11111111-1111-4111-8111-111111111111',
    isPublic: routeIsPublic
  },
  requestId: 'request-123',
  get: jest.fn((name: string) => HEADERS[name.toLowerCase() as keyof typeof HEADERS])
} as unknown as Request);

const buildPgSettings = (
  serverIsPublic: boolean,
  routeIsPublic: boolean
): Record<string, string> => {
  const req = createRequest(routeIsPublic);
  const trusted = trustsInternalIdentityHeaders({ isPublic: serverIsPublic });
  const result = buildInternalIdentityContext(
    req,
    'authenticated',
    { 'jwt.claims.api_id': 'published-api' },
    trusted
  );

  return result?.pgSettings ?? { role: 'anonymous' };
};

describe('graphile internal identity trust boundary', () => {
  it('rejects internal identity headers on a public server even when route metadata is private', () => {
    const pgSettings = buildPgSettings(true, false);

    expect(pgSettings.role).toBe('anonymous');
    expect(pgSettings).not.toHaveProperty('jwt.claims.user_id');
    expect(pgSettings).not.toHaveProperty('jwt.claims.principal_id');
    expect(pgSettings).not.toHaveProperty('jwt.claims.entity_id');
    expect(pgSettings).not.toHaveProperty('jwt.claims.organization_id');
  });

  it('trusts internal identity headers on a private server for a published API', () => {
    const pgSettings = buildPgSettings(false, true);

    expect(pgSettings).toMatchObject({
      role: 'authenticated',
      'jwt.claims.user_id': 'actor-123',
      'jwt.claims.principal_id': 'actor-123',
      'jwt.claims.entity_id': 'entity-456',
      'jwt.claims.organization_id': 'organization-789',
      'jwt.claims.api_id': 'published-api',
      'request.id': 'request-123'
    });
  });
});
