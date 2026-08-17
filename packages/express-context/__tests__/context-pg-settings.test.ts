import type { Request } from 'express';

import { buildContext } from '../src/context';

jest.mock('pg-cache', () => ({
  getPgPool: jest.fn(() => ({ query: jest.fn(), connect: jest.fn() })),
  getPgPoolIdentity: jest.fn(() => 'pg:v1:test'),
}));

describe('buildContext pgSettings forwarding', () => {
  it('forwards server-owned HTTP metadata into the canonical builder', () => {
    const headers: Record<string, string> = {
      origin: 'https://app.example.test',
      'user-agent': 'context-test/1.0',
    };
    const req = {
      api: {
        apiId: 'api-1',
        databaseId: 'database-1',
        dbname: 'tenant_db',
        anonRole: 'anonymous_runtime',
        roleName: 'authenticated_runtime',
        schema: ['tenant_api'],
      },
      token: { user_id: 'user-1' },
      requestId: 'request-1',
      clientIp: '192.0.2.4',
      deviceToken: 'device-1',
      get: (name: string) => headers[name.toLowerCase()],
    } as unknown as Request;

    const context = buildContext(req, { dependencySchemas: ['shared_api'] });

    expect(context?.pgSettings).toMatchObject({
      role: 'authenticated_runtime',
      'request.id': 'request-1',
      'jwt.claims.user_id': 'user-1',
      'jwt.claims.api_id': 'api-1',
      'jwt.claims.database_id': 'database-1',
      'jwt.claims.ip_address': '192.0.2.4',
      'jwt.claims.origin': 'https://app.example.test',
      'jwt.claims.user_agent': 'context-test/1.0',
      'jwt.claims.device_token': 'device-1',
      search_path: 'pg_catalog, "shared_api", "tenant_api"',
    });
  });
});
