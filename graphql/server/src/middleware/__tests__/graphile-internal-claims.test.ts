import type { Request } from 'express';

import { getTrustedInternalClaims } from '../internal-request';

const request = ({
  isPublic,
  internalTrusted,
  userId,
  headers = {}
}: {
  isPublic: boolean;
  internalTrusted: boolean;
  userId?: string;
  headers?: Record<string, string>;
}): Request => {
  const normalized = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  return {
    api: {
      dbname: 'tenant',
      schema: ['app_public'],
      anonRole: 'api_anon',
      roleName: 'api_role',
      isPublic
    },
    internalTrusted,
    token: userId ? { user_id: userId } : undefined,
    get: jest.fn((name: string) => normalized.get(name.toLowerCase()))
  } as unknown as Request;
};

describe('private ingress actor claims', () => {
  const actorHeaders = {
    'X-Actor-Id': 'actor-a',
    'X-Entity-Id': 'entity-a',
    'X-Organization-Id': 'organization-a'
  };

  it('does not trust actor headers from the public ingress', () => {
    expect(getTrustedInternalClaims(request({
      isPublic: true,
      internalTrusted: true,
      headers: actorHeaders
    }))).toEqual({});
  });

  it('does not trust actor headers without internal request authentication', () => {
    expect(getTrustedInternalClaims(request({
      isPublic: false,
      internalTrusted: false,
      headers: actorHeaders
    }))).toEqual({});
  });

  it('lets an authenticated user token outrank internal actor headers', () => {
    expect(getTrustedInternalClaims(request({
      isPublic: false,
      internalTrusted: true,
      userId: 'token-user',
      headers: actorHeaders
    }))).toEqual({});
  });

  it('maps authenticated private actor headers onto the exact claim allowlist', () => {
    expect(getTrustedInternalClaims(request({
      isPublic: false,
      internalTrusted: true,
      headers: actorHeaders
    }))).toEqual({
      'jwt.claims.user_id': 'actor-a',
      'jwt.claims.principal_id': 'actor-a',
      'jwt.claims.entity_id': 'entity-a',
      'jwt.claims.organization_id': 'organization-a'
    });
  });
});
