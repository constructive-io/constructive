jest.mock('pg-cache', () => ({
  getPgPool: jest.fn(),
}));

jest.mock('@constructive-io/express-context', () => ({
  createDefaultRegistry: jest.fn(() => ({
    resolve: jest.fn().mockResolvedValue(undefined),
  })),
}));

import type { Request } from 'express';
import type { Pool } from 'pg';
import { svcCache } from '@pgpmjs/server-utils';
import { getPgPool } from 'pg-cache';

import type { ApiOptions } from '../../types';
import { getApiConfig, getSvcKey } from '../api';

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;

const createRequest = (headers: Record<string, string>): Request => {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    protocol: 'http',
    originalUrl: '/graphql',
    get: jest.fn((name: string) => normalized.get(name.toLowerCase())),
  } as unknown as Request;
};

const createPrivateOptions = (): ApiOptions => ({
  pg: {
    database: 'constructive',
  },
  api: {
    isPublic: false,
    metaSchemas: ['metaschema_public'],
  },
} as unknown as ApiOptions);

describe('api middleware routing priority', () => {
  beforeEach(() => {
    svcCache.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    svcCache.clear();
  });

  it('uses X-Api-Name before X-Schemata when building private service keys', () => {
    const req = createRequest({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Api-Name': 'customer-api',
      'X-Schemata': 'services_public',
    });

    expect(getSvcKey(createPrivateOptions(), req)).toBe('api:db-123:customer-api');
  });

  it('resolves and caches by api_id when a route selects the api (Stage B)', async () => {
    const query = jest.fn(async (sql: string, params: unknown[]) => {
      if (Array.isArray(params[0])) {
        return {
          rows: (params[0] as string[]).map((schemaName) => ({ schema_name: schemaName })),
        };
      }
      if (sql.includes('WHERE a.id = $1') && params[0] === 'route-api-9') {
        return {
          rows: [{
            api_id: 'route-api-9',
            database_id: 'db-777',
            dbname: 'routed_db',
            role_name: 'authenticated',
            anon_role: 'anonymous',
            is_public: true,
            schemas: ['routed_public'],
          }],
        };
      }
      return { rows: [] };
    });

    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);

    const req = createRequest({ host: 'app.localhost' });
    req.routeApiId = 'route-api-9';

    const result = await getApiConfig(createPrivateOptions(), req);

    expect(req.svc_key).toBe('route-api:route-api-9');
    expect(result).toMatchObject({
      apiId: 'route-api-9',
      dbname: 'routed_db',
      databaseId: 'db-777',
      schema: ['routed_public'],
    });
    expect(svcCache.get('route-api:route-api-9')).toBe(result);
    expect(query.mock.calls).toEqual(expect.arrayContaining([
      [expect.stringContaining('WHERE a.id = $1'), ['route-api-9']],
    ]));
  });

  it('uses the same X-Api-Name priority when resolving and caching API config', async () => {
    const query = jest.fn(async (_sql: string, params: unknown[]) => {
      if (Array.isArray(params[0])) {
        return {
          rows: (params[0] as string[]).map((schemaName) => ({
            schema_name: schemaName,
          })),
        };
      }

      if (params[0] === 'db-123' && params[1] === 'customer-api') {
        return {
          rows: [{
            api_id: 'api-123',
            database_id: 'db-123',
            dbname: 'tenant_db',
            role_name: 'api_role',
            anon_role: 'api_anon',
            is_public: false,
            schemas: ['api_public'],
          }],
        };
      }

      return { rows: [] };
    });

    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);

    const req = createRequest({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Api-Name': 'customer-api',
      'X-Schemata': 'services_public',
    });

    const result = await getApiConfig(createPrivateOptions(), req);

    expect(req.svc_key).toBe('api:db-123:customer-api');
    expect(result).toMatchObject({
      apiId: 'api-123',
      dbname: 'tenant_db',
      anonRole: 'api_anon',
      roleName: 'api_role',
      schema: ['api_public'],
      databaseId: 'db-123',
      isPublic: false,
    });
    expect(svcCache.get('api:db-123:customer-api')).toBe(result);
    expect(query.mock.calls).toEqual(expect.arrayContaining([
      [expect.stringContaining('FROM services_public.apis'), ['db-123', 'customer-api', false]],
    ]));
  });
});
