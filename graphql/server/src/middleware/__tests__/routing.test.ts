jest.mock('pg-cache', () => ({
  acquirePgPool: jest.fn(),
  getPgPoolIdentity: jest.fn().mockReturnValue('pg:test'),
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

import { svcCache } from '@pgpmjs/server-utils';
import type { Request } from 'express';
import type { Pool } from 'pg';
import { acquirePgPool } from 'pg-cache';

import type { ApiOptions } from '../../types';
import { getApiConfig } from '../api';
import { ResolvedRoute, resolveRoute, routeToApiStructure } from '../routing';

const mockAcquirePgPool = acquirePgPool as jest.MockedFunction<typeof acquirePgPool>;

const matchedRoute = (overrides: Partial<ResolvedRoute> = {}): ResolvedRoute => ({
  route_binding_id: 'rb-1',
  hostname: 'api.example.com',
  matched_wildcard: false,
  matched_path: '/',
  method: null,
  priority: 0,
  domain_id: 'dom-1',
  target_catalog_id: 'cat-1',
  target_module: 'apis',
  target_source_id: 'api-1',
  target_owner_scope: 'database',
  target_owner_key: 'db-1',
  resolved_config: {
    api_id: 'api-1',
    database_id: 'db-1',
    dbname: 'tenant_db',
    role_name: 'api_role',
    anon_role: 'api_anon',
    is_public: true,
    schemas: ['app_public']
  },
  verification_status: 'verified',
  tls_status: 'ready',
  tls_secret_name: 'tls-api-example-com',
  ...overrides
});

const noMatchRoute = (): ResolvedRoute =>
  matchedRoute({ route_binding_id: null, target_module: null, resolved_config: null });

const createPool = (query: jest.Mock): Pool => ({ query } as unknown as Pool);
const leasePool = (pool: Pool) => ({
  pool,
  identity: 'pg:test',
  release: jest.fn()
});

describe('resolveRoute', () => {
  it('returns the row when a route matches', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [matchedRoute()] });
    const row = await resolveRoute(createPool(query), 'constructive_routing_public', 'api.example.com');
    expect(row?.route_binding_id).toBe('rb-1');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(`"constructive_routing_public".resolve_route($1, '/', NULL)`),
      ['api.example.com']
    );
  });

  it('returns null on the contract no-match row (route_binding_id IS NULL)', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [noMatchRoute()] });
    const row = await resolveRoute(createPool(query), 'constructive_routing_public', 'nope.example.com');
    expect(row).toBeNull();
  });

  it('fails closed when the resolver violates its exactly-one-row contract', async () => {
    const zeroRows = await resolveRoute(
      createPool(jest.fn().mockResolvedValue({ rows: [] })),
      'constructive_routing_public',
      'api.example.com'
    );
    const duplicateRows = await resolveRoute(
      createPool(jest.fn().mockResolvedValue({ rows: [matchedRoute(), matchedRoute()] })),
      'constructive_routing_public',
      'api.example.com'
    );

    expect(zeroRows).toBeNull();
    expect(duplicateRows).toBeNull();
  });

  it('returns null when the resolver function is not installed', async () => {
    const query = jest.fn().mockRejectedValue(Object.assign(new Error('undefined function'), { code: '42883' }));
    const row = await resolveRoute(createPool(query), 'constructive_routing_public', 'api.example.com');
    expect(row).toBeNull();
  });

  it('returns null when the routing schema does not exist', async () => {
    const query = jest.fn().mockRejectedValue(Object.assign(new Error('invalid schema'), { code: '3F000' }));
    const row = await resolveRoute(createPool(query), 'constructive_routing_public', 'api.example.com');
    expect(row).toBeNull();
  });

  it('rethrows unexpected database errors', async () => {
    const query = jest.fn().mockRejectedValue(Object.assign(new Error('boom'), { code: '57P01' }));
    await expect(
      resolveRoute(createPool(query), 'constructive_routing_public', 'api.example.com')
    ).rejects.toThrow('boom');
  });

  it('rejects unsafe schema names without querying', async () => {
    const query = jest.fn();
    const row = await resolveRoute(createPool(query), 'bad"; DROP TABLE x;--', 'api.example.com');
    expect(row).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
});

describe('routeToApiStructure', () => {
  const opts = { pg: { database: 'constructive' }, api: { isPublic: true } } as unknown as ApiOptions;

  it('maps an api-target route onto ApiStructure', () => {
    const structure = routeToApiStructure(matchedRoute(), opts);
    expect(structure).toEqual(
      expect.objectContaining({
        apiId: 'api-1',
        databaseId: 'db-1',
        dbname: 'tenant_db',
        roleName: 'api_role',
        anonRole: 'api_anon',
        schema: ['app_public'],
        isPublic: true
      })
    );
  });

  it('returns null for non-api targets', () => {
    expect(routeToApiStructure(matchedRoute({ target_module: 'sites' }), opts)).toBeNull();
  });

  it('returns null when resolved_config lacks api essentials', () => {
    expect(routeToApiStructure(matchedRoute({ resolved_config: {} }), opts)).toBeNull();
  });

  it('fails closed when route visibility does not match the server ingress', () => {
    const privateRoute = matchedRoute({
      resolved_config: {
        ...(matchedRoute().resolved_config as Record<string, unknown>),
        is_public: false
      }
    });

    expect(routeToApiStructure(privateRoute, opts)).toBeNull();
  });

  it('fails closed when exact roles or physical schemas are absent', () => {
    expect(routeToApiStructure(matchedRoute({
      resolved_config: {
        ...(matchedRoute().resolved_config as Record<string, unknown>),
        anon_role: undefined
      }
    }), opts)).toBeNull();
    expect(routeToApiStructure(matchedRoute({
      resolved_config: {
        ...(matchedRoute().resolved_config as Record<string, unknown>),
        schemas: ['app_public', 'app_public']
      }
    }), opts)).toBeNull();
  });

  it('accepts Constructive dash-prefixed physical schemas', () => {
    expect(routeToApiStructure(matchedRoute({
      resolved_config: {
        ...(matchedRoute().resolved_config as Record<string, unknown>),
        schemas: ['customer-db-a1b2c3d4-app-public']
      }
    }), opts)).toMatchObject({
      schema: ['customer-db-a1b2c3d4-app-public']
    });
  });

  it('fails closed when route and resolved-config identities disagree', () => {
    expect(routeToApiStructure(matchedRoute({
      target_source_id: 'another-api'
    }), opts)).toBeNull();
    expect(routeToApiStructure(matchedRoute({
      target_owner_key: 'another-database'
    }), opts)).toBeNull();
    expect(routeToApiStructure(matchedRoute({
      target_owner_scope: 'organization'
    }), opts)).toBeNull();
  });
});

describe('getApiConfig with scoped routing enabled', () => {
  const createRequest = (headers: Record<string, string>): Request => {
    const normalized = new Map(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
    );
    return {
      protocol: 'http',
      originalUrl: '/graphql',
      path: '/graphql',
      method: 'POST',
      get: jest.fn((name: string) => normalized.get(name.toLowerCase()))
    } as unknown as Request;
  };

  const createOptions = (): ApiOptions => ({
    pg: { database: 'constructive' },
    api: {
      isPublic: true,
      metaSchemas: ['metaschema_public']
    }
  } as unknown as ApiOptions);

  beforeEach(() => {
    svcCache.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    svcCache.clear();
  });

  const schemaValidationRows = (params: unknown[]) => ({
    rows: (params[0] as string[]).map((schemaName) => ({ schema_name: schemaName }))
  });

  it('resolves via resolve_route (host only) as the sole resolver', async () => {
    const query = jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('information_schema.schemata')) return schemaValidationRows(params);
      if (sql.includes('resolve_route')) return { rows: [matchedRoute()] };
      throw new Error(`unexpected query: ${sql}`);
    });
    mockAcquirePgPool.mockImplementation(() => leasePool(createPool(query)));

    const result = await getApiConfig(createOptions(), createRequest({ host: 'api.example.com' }));

    expect(result).toEqual(expect.objectContaining({ apiId: 'api-1', dbname: 'tenant_db' }));
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('resolve_route'),
      ['api.example.com']
    );
  });

  it('returns null (no fallback) when resolve_route has no match', async () => {
    const query = jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('information_schema.schemata')) return schemaValidationRows(params);
      if (sql.includes('resolve_route')) return { rows: [noMatchRoute()] };
      throw new Error(`unexpected query (no legacy fallback): ${sql}`);
    });
    mockAcquirePgPool.mockImplementation(() => leasePool(createPool(query)));

    const result = await getApiConfig(createOptions(), createRequest({ host: 'nomatch.example.com' }));

    expect(result).toBeFalsy();
    expect(query.mock.calls.some(([sql]) => String(sql).includes('services_public'))).toBe(false);
  });

  it('re-resolves a hot hostname so a reassignment cannot use stale tenant metadata', async () => {
    let route = matchedRoute();
    const query = jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('information_schema.schemata')) return schemaValidationRows(params);
      if (sql.includes('resolve_route')) return { rows: [route] };
      throw new Error(`unexpected query: ${sql}`);
    });
    mockAcquirePgPool.mockImplementation(() => leasePool(createPool(query)));

    const first = await getApiConfig(
      createOptions(),
      createRequest({ host: 'api.example.com' })
    );
    route = matchedRoute({
      target_source_id: 'api-2',
      target_owner_key: 'db-2',
      resolved_config: {
        api_id: 'api-2',
        database_id: 'db-2',
        dbname: 'tenant_db_2',
        role_name: 'api_role_2',
        anon_role: 'api_anon_2',
        is_public: true,
        schemas: ['app_two_public']
      }
    });
    const second = await getApiConfig(
      createOptions(),
      createRequest({ host: 'api.example.com' })
    );

    expect(first).toMatchObject({ databaseId: 'db-1' });
    expect(second).toMatchObject({ databaseId: 'db-2', dbname: 'tenant_db_2' });
    expect(query.mock.calls.filter(([sql]) => String(sql).includes('resolve_route'))).toHaveLength(2);
  });

  it('fails closed when a route resolves without a database id', async () => {
    const routeWithoutDbId = matchedRoute({
      resolved_config: {
        api_id: 'api-1',
        dbname: 'tenant_db',
        role_name: 'api_role',
        anon_role: 'api_anon',
        is_public: true,
        schemas: ['app_public']
      }
    });
    const query = jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('information_schema.schemata')) return schemaValidationRows(params);
      if (sql.includes('resolve_route')) return { rows: [routeWithoutDbId] };
      throw new Error(`unexpected query: ${sql}`);
    });
    mockAcquirePgPool.mockImplementation(() => leasePool(createPool(query)));

    await expect(
      getApiConfig(createOptions(), createRequest({ host: 'api.example.com' }))
    ).resolves.toBeNull();
  });
});
