import { buildPgSettings } from '@constructive-io/express-context';
import type { Request } from 'express';

import { getGraphileRequestPgSettings } from '../graphile-request-context';

const baseApi = {
  apiId: 'api-1',
  databaseId: 'database-1',
  dbname: 'tenant_db',
  anonRole: 'anonymous_runtime',
  roleName: 'authenticated_runtime',
  schema: ['tenant_api'],
  isPublic: true,
};

function makeRequest(
  overrides: Record<string, unknown> = {},
  headers: Record<string, string> = {}
): Request {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  return {
    get: (name: string) => normalizedHeaders[name.toLowerCase()],
    ...overrides,
  } as unknown as Request;
}

describe('Graphile canonical request context', () => {
  it.each([
    ['anonymous', null],
    ['authenticated', { id: 'token-1', user_id: 'user-1' }],
  ])('reuses the exact canonical object for %s requests', (_label, token) => {
    const pgSettings = buildPgSettings({
      api: baseApi,
      token,
      requestId: 'request-1',
    });
    const req = makeRequest({
      api: baseApi,
      token,
      constructive: { pgSettings },
    });

    expect(getGraphileRequestPgSettings(req)).toBe(pgSettings);
  });

  it('does not derive identity from unauthenticated private headers', () => {
    const privateApi = { ...baseApi, isPublic: false };
    const pgSettings = buildPgSettings({
      api: privateApi,
      token: null,
      requestId: 'request-private',
      clientIp: '192.0.2.8',
    });
    const req = makeRequest(
      {
        api: privateApi,
        token: null,
        constructive: { pgSettings },
      },
      {
        'X-Actor-Id': 'actor-1',
        'X-Entity-Id': 'entity-1',
        'X-Organization-Id': 'organization-1',
      }
    );

    expect(getGraphileRequestPgSettings(req)).toBe(pgSettings);
    expect(pgSettings.role).toBe('anonymous_runtime');
    expect(pgSettings['jwt.claims.user_id']).toBe('');
    expect(pgSettings['jwt.claims.entity_id']).toBe('');
    expect(pgSettings['jwt.claims.organization_id']).toBe('');
  });

  it('does not trust private identity headers on a public surface', () => {
    const pgSettings = buildPgSettings({
      api: baseApi,
      token: null,
      requestId: 'request-public',
    });
    const req = makeRequest(
      { api: baseApi, token: null, constructive: { pgSettings } },
      { 'X-Actor-Id': 'attacker-controlled' }
    );

    expect(getGraphileRequestPgSettings(req)).toBe(pgSettings);
    expect(pgSettings['jwt.claims.user_id']).toBe('');
  });

  it('does not replace authenticated identity on a private surface', () => {
    const privateApi = { ...baseApi, isPublic: false };
    const token = { id: 'token-1', user_id: 'token-user' };
    const pgSettings = buildPgSettings({
      api: privateApi,
      token,
      requestId: 'request-authenticated-private',
    });
    const req = makeRequest(
      { api: privateApi, token, constructive: { pgSettings } },
      { 'X-Actor-Id': 'header-user' }
    );

    expect(getGraphileRequestPgSettings(req)).toBe(pgSettings);
    expect(pgSettings['jwt.claims.user_id']).toBe('token-user');
  });

  it.each([
    ['missing request', undefined],
    ['missing constructive context', makeRequest()],
    [
      'incomplete settings',
      makeRequest({
        constructive: { pgSettings: { role: 'anonymous_runtime' } },
      }),
    ],
  ])('fails closed for %s', (_label, req) => {
    expect(() => getGraphileRequestPgSettings(req)).toThrow(
      /req\.constructive\.pgSettings/
    );
  });
});
