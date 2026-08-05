jest.mock('pg-cache', () => ({
  acquirePgPool: jest.fn(),
  getPgPoolIdentity: jest.fn(),
  PG_POOL_CAPACITY_ERROR_CODE: 'PG_POOL_CAPACITY'
}));

jest.mock('@constructive-io/express-context', () => ({
  createDefaultRegistry: jest.fn(() => ({
    resolve: jest.fn(async (name: string) => name === 'databaseSettings' ? {
      enableAggregates: false,
      enablePostgis: false,
      enableSearch: false,
      enableDirectUploads: false,
      enablePresignedUploads: false,
      enableManyToMany: false,
      enableConnectionFilter: false,
      enableLtree: false,
      enableLlm: false,
      enableRealtime: false,
      enableBulk: false,
      enableI18n: false
    } : undefined)
  }))
}));

import { createDefaultRegistry } from '@constructive-io/express-context';
import { svcCache } from '@pgpmjs/server-utils';
import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';
import { acquirePgPool, getPgPoolIdentity } from 'pg-cache';

import type { ApiOptions } from '../../types';
import {
  createApiMiddleware,
  getApiConfig,
  getSvcCacheKey,
  getSvcKey
} from '../api';
import {
  authorizeInternalRequest,
  INTERNAL_REQUEST_TOKEN_HEADER
} from '../internal-request';

const INTERNAL_SECRET = 'test-internal-secret-with-at-least-32-bytes';

const withInternalAuth = (
  headers: Record<string, string>
): Record<string, string> => ({
  ...headers,
  [INTERNAL_REQUEST_TOKEN_HEADER]: INTERNAL_SECRET
});

const mockAcquirePgPool = acquirePgPool as jest.MockedFunction<typeof acquirePgPool>;
const mockGetPgPoolIdentity = getPgPoolIdentity as jest.MockedFunction<
  typeof getPgPoolIdentity
>;
const mockRegistryResolve = (
  createDefaultRegistry as jest.MockedFunction<typeof createDefaultRegistry>
).mock.results[0].value.resolve as jest.Mock;

const leasePool = (pool: Pool, release = jest.fn()) => ({
  pool,
  identity: 'pg:test',
  release
});

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
    metaSchemas: ['metaschema_public'],
    internalRequestSecret: INTERNAL_SECRET
  }
} as unknown as ApiOptions);

describe('api middleware routing priority', () => {
  beforeEach(() => {
    svcCache.clear();
    jest.clearAllMocks();
    mockGetPgPoolIdentity.mockImplementation((config) =>
      `pg:${config.host ?? 'test'}`
    );
  });

  afterEach(() => {
    svcCache.clear();
  });

  it('uses an authenticated X-Api-Name when building private service keys', () => {
    const opts = createPrivateOptions();
    const req = createRequest(withInternalAuth({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Api-Name': 'customer-api'
    }));
    authorizeInternalRequest(opts, req);

    expect(getSvcKey(opts, req)).toBe('api:db-123:customer-api');
  });

  it('resolves an authenticated X-Api-Name without caching routing authority', async () => {
    const query = jest.fn(async (_sql: string, params: unknown[]) => {
      if (Array.isArray(params[0])) {
        return {
          rows: (params[0] as string[]).map((schemaName) => ({
            schema_name: schemaName
          }))
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
            schemas: ['api_public']
          }]
        };
      }

      return { rows: [] };
    });

    const pool = { query } as unknown as Pool;
    const releases: jest.Mock[] = [];
    mockAcquirePgPool.mockImplementation(() => {
      const release = jest.fn();
      releases.push(release);
      return leasePool(pool, release);
    });

    const req = createRequest(withInternalAuth({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Api-Name': 'customer-api'
    }));

    const result = await getApiConfig(createPrivateOptions(), req);

    expect(req.svc_key).toBe('api:db-123:customer-api');
    expect(req.svc_cache_key).toBe(getSvcCacheKey(
      createPrivateOptions(),
      'api:db-123:customer-api'
    ));
    expect(result).toMatchObject({
      apiId: 'api-123',
      dbname: 'tenant_db',
      anonRole: 'api_anon',
      roleName: 'api_role',
      schema: ['api_public'],
      databaseId: 'db-123',
      isPublic: false
    });
    expect(svcCache.has(getSvcCacheKey(
      createPrivateOptions(),
      'api:db-123:customer-api'
    ))).toBe(false);
    expect(query.mock.calls).toEqual(expect.arrayContaining([
      [expect.stringContaining('FROM "routing_public".apis'), ['db-123', 'customer-api']]
    ]));
    expect(query.mock.calls.some(([sql]) =>
      String(sql).includes('aps.database_id = a.database_id')
    )).toBe(true);
    expect(mockAcquirePgPool).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ database: 'constructive' }),
      { purpose: 'routing-request-control', sanitizeOnCheckout: true }
    );
    expect(mockAcquirePgPool).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ database: 'tenant_db' }),
      { purpose: 'tenant-request-control', sanitizeOnCheckout: true }
    );
    expect(releases).toHaveLength(2);
    expect(releases.every((release) => release.mock.calls.length === 1)).toBe(true);
  });

  it('fails closed when an authenticated API selector resolves an incomplete contract', async () => {
    const query = jest.fn(async (_sql: string, params: unknown[]) => {
      if (Array.isArray(params[0])) {
        return {
          rows: (params[0] as string[]).map((schemaName) => ({ schema_name: schemaName }))
        };
      }
      return {
        rows: [{
          api_id: 'api-123',
          database_id: 'db-123',
          dbname: 'tenant_db',
          role_name: '',
          anon_role: 'api_anon',
          is_public: false,
          schemas: ['api_public']
        }]
      };
    });
    mockAcquirePgPool.mockReturnValue(leasePool({ query } as unknown as Pool));

    const result = await getApiConfig(createPrivateOptions(), createRequest(withInternalAuth({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Api-Name': 'customer-api'
    })));

    expect(result).toBeNull();
  });

  it('fails closed when an exact tenant API has no feature contract', async () => {
    const query = jest.fn(async (_sql: string, params: unknown[]) => {
      if (Array.isArray(params[0])) {
        return {
          rows: (params[0] as string[]).map((schemaName) => ({ schema_name: schemaName }))
        };
      }
      return { rows: [{
        api_id: 'api-123',
        database_id: 'db-123',
        dbname: 'tenant_db',
        role_name: 'api_user',
        anon_role: 'api_anon',
        is_public: false,
        schemas: ['api_public']
      }] };
    });
    mockAcquirePgPool.mockReturnValue(leasePool({ query } as unknown as Pool));
    mockRegistryResolve.mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const req = createRequest(withInternalAuth({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Api-Name': 'customer-api'
    }));

    await expect(getApiConfig(createPrivateOptions(), req)).rejects.toMatchObject({
      code: 'GRAPHILE_DATABASE_FEATURE_CONTRACT_MISSING'
    });
  });

  it('ignores a stale routing-cache entry and resolves the authoritative API', async () => {
    const opts = createPrivateOptions();
    const req = createRequest(withInternalAuth({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Api-Name': 'customer-api'
    }));
    svcCache.set(getSvcCacheKey(
      opts,
      'api:db-123:customer-api'
    ), { databaseId: 'db-old', dbname: 'wrong_tenant' });

    const query = jest.fn(async (_sql: string, params: unknown[]) => {
      if (Array.isArray(params[0])) {
        return {
          rows: (params[0] as string[]).map((schemaName) => ({
            schema_name: schemaName
          }))
        };
      }
      return {
        rows: [{
          api_id: 'api-123',
          database_id: 'db-123',
          dbname: 'tenant_fresh',
          role_name: 'api_role',
          anon_role: 'api_anon',
          is_public: false,
          schemas: ['api_public']
        }]
      };
    });
    mockAcquirePgPool.mockImplementation(() =>
      leasePool({ query } as unknown as Pool)
    );

    await expect(getApiConfig(opts, req)).resolves.toMatchObject({
      databaseId: 'db-123',
      dbname: 'tenant_fresh'
    });
    expect(mockAcquirePgPool).toHaveBeenCalled();
  });

  it('isolates one routing label across exact control-pool contracts', () => {
    const optsA = createPrivateOptions();
    const optsB = createPrivateOptions();
    optsA.pg = { ...optsA.pg, host: 'routing-a.internal' };
    optsB.pg = { ...optsB.pg, host: 'routing-b.internal' };
    const label = 'api:db-123:customer-api';

    expect(getSvcCacheKey(optsA, label)).not.toBe(getSvcCacheKey(optsB, label));
  });

  it('does not publish authoritative meta-schema routing results', async () => {
    const query = jest.fn(async (_sql: string, params: unknown[]) => ({
      rows: (params[0] as string[]).map((schemaName) => ({ schema_name: schemaName }))
    }));
    mockAcquirePgPool.mockReturnValue(leasePool({ query } as unknown as Pool));
    const opts = createPrivateOptions();
    opts.api!.allowMetaSchemaHeader = true;
    const req = createRequest(withInternalAuth({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Meta-Schema': 'metaschema_public'
    }));

    await expect(getApiConfig(opts, req)).resolves.toMatchObject({ databaseId: 'db-123' });
    expect(svcCache.has(req.svc_cache_key!)).toBe(false);
  });

  it('rejects raw physical schema routing even with a valid internal token', async () => {
    const opts = createPrivateOptions();
    const req = createRequest(withInternalAuth({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Schemata': 'app_public'
    }));

    await expect(getApiConfig(opts, req)).rejects.toMatchObject({
      code: 'INTERNAL_REQUEST_FORBIDDEN'
    });
    expect(mockAcquirePgPool).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated private routing headers before touching PostgreSQL', async () => {
    const req = createRequest({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Api-Name': 'customer-api'
    });

    await expect(getApiConfig(createPrivateOptions(), req)).rejects.toMatchObject({
      code: 'INTERNAL_REQUEST_FORBIDDEN'
    });
    expect(mockAcquirePgPool).not.toHaveBeenCalled();
  });

  it('returns 403 for an invalid internal token without leaking configuration', async () => {
    const req = createRequest({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Api-Name': 'customer-api',
      [INTERNAL_REQUEST_TOKEN_HEADER]: 'wrong-secret-with-at-least-32-bytes'
    });
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createApiMiddleware(createPrivateOptions())(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Forbidden');
    expect(next).not.toHaveBeenCalled();
    expect(mockAcquirePgPool).not.toHaveBeenCalled();
  });

  it('releases the routing lease when schema validation fails', async () => {
    const release = jest.fn();
    const query = jest.fn().mockRejectedValue(new Error('validation failed'));
    mockAcquirePgPool.mockReturnValue(
      leasePool({ query } as unknown as Pool, release)
    );

    const req = createRequest({ host: 'admin.localhost' });
    await expect(getApiConfig(createPrivateOptions(), req)).rejects.toThrow('validation failed');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases tenant and routing leases when module resolution fails', async () => {
    const query = jest.fn(async (_sql: string, params: unknown[]) => {
      if (Array.isArray(params[0])) {
        return {
          rows: (params[0] as string[]).map((schemaName) => ({
            schema_name: schemaName
          }))
        };
      }
      return {
        rows: [{
          api_id: 'api-123',
          database_id: 'db-123',
          dbname: 'tenant_db',
          role_name: 'api_role',
          anon_role: 'api_anon',
          is_public: false,
          schemas: ['api_public']
        }]
      };
    });
    const releaseOrder: string[] = [];
    mockAcquirePgPool
      .mockReturnValueOnce(leasePool(
        { query } as unknown as Pool,
        jest.fn(() => releaseOrder.push('routing'))
      ))
      .mockReturnValueOnce(leasePool(
        { query } as unknown as Pool,
        jest.fn(() => releaseOrder.push('tenant'))
      ));
    mockRegistryResolve.mockRejectedValueOnce(new Error('loader failed'));
    const req = createRequest(withInternalAuth({
      host: 'admin.localhost',
      'X-Database-Id': 'db-123',
      'X-Api-Name': 'customer-api'
    }));

    await expect(getApiConfig(createPrivateOptions(), req)).rejects.toThrow('loader failed');
    expect(releaseOrder).toEqual(['tenant', 'routing']);
  });

  it('forwards pool-capacity refusal to the shared HTTP error handler', async () => {
    const capacityError = Object.assign(new Error('sensitive capacity details'), {
      code: 'PG_POOL_CAPACITY'
    });
    mockAcquirePgPool.mockImplementation(() => {
      throw capacityError;
    });
    const req = createRequest({ host: 'admin.localhost' });
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await createApiMiddleware(createPrivateOptions())(req, res, next);

    expect(next).toHaveBeenCalledWith(capacityError);
    expect((res.status as jest.Mock)).not.toHaveBeenCalled();
  });
});
