jest.mock('pg-cache', () => ({
  getPgPool: jest.fn()
}));

jest.mock('@constructive-io/express-context', () => ({
  createDefaultRegistry: jest.fn(() => ({
    resolve: jest.fn().mockResolvedValue(undefined)
  }))
}));

import { svcCache } from '@pgpmjs/server-utils';
import type { Request } from 'express';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import type { ApiOptions } from '../../types';
import { getApiConfig, getApiIdentity, getSvcKey } from '../api';

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;
const DATABASE_ID = '11111111-1111-4111-8111-111111111111';

const createRequest = (headers: Record<string, string>): Request => {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    protocol: 'http',
    originalUrl: '/graphql',
    get: jest.fn((name: string) => normalized.get(name.toLowerCase()))
  } as unknown as Request;
};

const createPrivateOptions = (): ApiOptions => ({
  pg: {
    database: 'constructive'
  },
  api: {
    isPublic: false,
    metaSchemas: ['metaschema_public']
  }
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
      'X-Database-Id': DATABASE_ID,
      'X-Api-Name': 'customer-api',
      'X-Schemata': 'app_public'
    });

    expect(getSvcKey(createPrivateOptions(), req)).toBe(`api:${DATABASE_ID}:customer-api`);
  });

  it('uses the same X-Api-Name priority when resolving and caching API identity', async () => {
    const query = jest.fn(async (_sql: string, params: unknown[]) => {
      if (Array.isArray(params[0])) {
        return {
          rows: (params[0] as string[]).map((schemaName) => ({
            schema_name: schemaName
          }))
        };
      }

      if (params[0] === DATABASE_ID && params[1] === 'customer-api') {
        return {
          rows: [{
            api_id: 'api-123',
            database_id: DATABASE_ID,
            dbname: 'tenant_db',
            role_name: 'api_role',
            anon_role: 'api_anon',
            is_public: false,
            schemas: ['api_public']
          }]
        };
      }

      return { rows: [] };
    });

    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);

    const req = createRequest({
      host: 'admin.localhost',
      'X-Database-Id': DATABASE_ID,
      'X-Api-Name': 'customer-api',
      'X-Schemata': 'app_public'
    });

    const result = await getApiIdentity(createPrivateOptions(), req);

    expect(req.svc_key).toBe(`api:${DATABASE_ID}:customer-api`);
    expect(result).toMatchObject({
      apiId: 'api-123',
      dbname: 'tenant_db',
      anonRole: 'api_anon',
      roleName: 'api_role',
      schema: ['api_public'],
      databaseId: DATABASE_ID,
      isPublic: false
    });
    expect(svcCache.get(`api:${DATABASE_ID}:customer-api`)).toBe(result);
    expect(query.mock.calls).toEqual(expect.arrayContaining([
      [expect.stringContaining('FROM "routing_public".apis'), [DATABASE_ID, 'customer-api']]
    ]));
  });

  it('fails closed before PostgreSQL when the direct config helper cannot apply a configured policy', async () => {
    const opts = createPrivateOptions();
    opts.api!.databaseAccessPolicyFunction = 'platform_private.database_access';
    const req = createRequest({
      host: 'admin.localhost',
      'X-Database-Id': DATABASE_ID,
      'X-Api-Name': 'customer-api'
    });

    await expect(getApiConfig(opts, req)).rejects.toMatchObject({
      code: 'DATABASE_ACCESS_POLICY_UNAVAILABLE',
      statusCode: 503
    });
    expect(mockGetPgPool).not.toHaveBeenCalled();
  });
});
