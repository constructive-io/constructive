jest.mock('pg-cache', () => ({
  getPgPool: jest.fn()
}));

jest.mock('@constructive-io/express-context', () => ({
  createDefaultRegistry: jest.fn(() => ({
    resolve: jest.fn(async (
      _name: string,
      ctx: { tenantPool: { query: (sql: string) => Promise<unknown> } }
    ): Promise<undefined> => {
      await ctx.tenantPool.query('select tenant_setting');
      return undefined;
    })
  }))
}));

import { createDefaultRegistry } from '@constructive-io/express-context';
import { svcCache } from '@pgpmjs/server-utils';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import request from 'supertest';

import type { ApiOptions } from '../../types';
import { createApiMiddleware, createApiSettingsMiddleware } from '../api';
import { createDatabaseAccessPolicyMiddleware as createDatabaseAccessPolicyMiddlewareImpl } from '../database-access-policy';
import { errorHandler } from '../error-handler';

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;
let activePolicyPool: Pool;
const mockCreatePolicyPool = jest.fn(() => activePolicyPool);
const createDatabaseAccessPolicyMiddleware = (opts: ApiOptions) =>
  createDatabaseAccessPolicyMiddlewareImpl(opts, { createPool: mockCreatePolicyPool });
const mockCreateDefaultRegistry = createDefaultRegistry as jest.MockedFunction<typeof createDefaultRegistry>;
const mockRegistryResolve = (
  mockCreateDefaultRegistry.mock.results[0]?.value as { resolve: jest.Mock }
).resolve;
const jsonParser = jest.fn(express.json());
const multipartParser = jest.fn((_req: Request, _res: Response, next: NextFunction) => next());

const DATABASE_ID = '11111111-1111-4111-8111-111111111111';
const REBOUND_DATABASE_ID = '33333333-3333-4333-8333-333333333333';
const PLATFORM_DATABASE_ID = '22222222-2222-4222-8222-222222222222';
const TENANT_DATABASE = 'customer_database';
const REBOUND_TENANT_DATABASE = 'rebound_customer_database';

interface PolicyRow {
  allowed: boolean;
  code: string | null;
  message: string | null;
  http_status: number | null;
}

const allowRow: PolicyRow = {
  allowed: true,
  code: null,
  message: null,
  http_status: null
};

const denyRow: PolicyRow = {
  allowed: false,
  code: 'DATABASE_BILLING_SUSPENDED',
  message: 'This database is suspended until billing is restored.',
  http_status: 402
};

const options = (): ApiOptions => ({
  pg: { database: 'routing_database' },
  api: {
    isPublic: false,
    metaSchemas: ['metaschema_public'],
    databaseAccessPolicyFunction: 'platform_private.database_access'
  }
} as ApiOptions);

const matchedRoute = (
  databaseId = DATABASE_ID,
  apiId = 'api-1',
  dbname = TENANT_DATABASE
) => ({
  route_binding_id: `route-${apiId}`,
  target_module: 'api',
  target_source_id: apiId,
  resolved_config: {
    api_id: apiId,
    database_id: databaseId,
    dbname,
    role_name: 'authenticated',
    anon_role: 'anonymous',
    is_public: false,
    schemas: ['app_public']
  }
});

function setupPools(
  policyRows: PolicyRow[],
  schemaBindings: Record<string, string> = {
    app_public: DATABASE_ID
  },
  routeResults = [matchedRoute()]
) {
  const events: string[] = [];
  const tenantQuery = jest.fn(async () => {
    events.push('tenant');
    return { rows: [] as unknown[] };
  });
  const policyQueue = [...policyRows];
  const routeQueue = [...routeResults];
  const routingQuery = jest.fn(async (sql: string, params: unknown[]) => {
    if (sql.includes('FROM metaschema_public.schema scoped_schema')) {
      events.push('schema-binding');
      const requested = params[0] as string[];
      const databaseId = params[1] as string;
      return {
        rows: requested
          .filter((schema_name) => schemaBindings[schema_name] === databaseId)
          .map((schema_name) => ({ schema_name }))
      };
    }
    if (sql.includes('information_schema.schemata')) {
      events.push('schema-resolution');
      return {
        rows: (params[0] as string[]).map((schema_name) => ({ schema_name }))
      };
    }
    if (sql.includes('FROM "routing_public".apis')) {
      events.push('api-resolution');
      return {
        rows: [{
          api_id: 'api-1',
          database_id: DATABASE_ID,
          dbname: TENANT_DATABASE,
          role_name: 'authenticated',
          anon_role: 'anonymous',
          is_public: false,
          schemas: ['app_public']
        }]
      };
    }
    if (sql.includes('resolve_route')) {
      events.push('route-resolution');
      return {
        rows: [routeQueue.shift() ?? routeResults[routeResults.length - 1]]
      };
    }
    if (sql.includes('platform_private"."database_access')) {
      events.push('policy');
      return { rows: [policyQueue.shift() ?? policyRows[policyRows.length - 1]] };
    }
    throw new Error(`Unexpected routing query: ${sql}`);
  });

  const routingPool = { query: routingQuery } as unknown as Pool;
  const tenantPool = { query: tenantQuery } as unknown as Pool;
  activePolicyPool = routingPool;
  mockGetPgPool.mockImplementation((pgOptions) => (
    pgOptions?.database === TENANT_DATABASE ||
    pgOptions?.database === REBOUND_TENANT_DATABASE
      ? tenantPool
      : routingPool
  ));

  return { events, routingQuery, tenantQuery };
}

function pipelineApp(apiOptions = options()) {
  const app = express();
  app.use(createApiMiddleware(apiOptions));
  app.use(createDatabaseAccessPolicyMiddleware(apiOptions));
  app.use(jsonParser);
  app.use('/graphql', multipartParser);
  app.use(createApiSettingsMiddleware(apiOptions));
  app.use((_req, res) => res.status(204).end());
  app.use(errorHandler);
  return app;
}

function graphileIdentityPipelineApp(
  handlers: Map<string, jest.Mock>,
  apiOptions = options()
) {
  const app = express();
  app.use(createApiMiddleware(apiOptions));
  app.use(createDatabaseAccessPolicyMiddleware(apiOptions));
  app.use(createApiSettingsMiddleware(apiOptions));
  // Graphile selects its cached handler from this exact request key.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const handler = req.svc_key ? handlers.get(req.svc_key) : undefined;
    if (!handler) return next(new Error('Missing Graphile identity'));
    handler(req, res);
  });
  app.use(errorHandler);
  return app;
}

describe('database access policy pipeline ordering', () => {
  beforeEach(() => {
    svcCache.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    svcCache.clear();
  });

  it.each([
    ['scoped route', {}],
    ['X-Api-Name', { 'X-Database-Id': DATABASE_ID, 'X-Api-Name': 'customer' }],
    ['X-Schemata', { 'X-Database-Id': DATABASE_ID, 'X-Schemata': 'app_public' }],
    ['X-Meta-Schema', { 'X-Database-Id': DATABASE_ID, 'X-Meta-Schema': 'true' }]
  ])('denies %s before any tenant setting query', async (_label, headers) => {
    const { tenantQuery } = setupPools([denyRow]);

    const response = await request(pipelineApp())
      .post('/graphql')
      .set('Host', 'api.example.com')
      .set(headers)
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(402);
    expect(response.body.errors[0].extensions).toMatchObject({
      code: 'DATABASE_BILLING_SUSPENDED',
      http: 402
    });
    expect(tenantQuery).not.toHaveBeenCalled();
    expect(mockRegistryResolve).not.toHaveBeenCalled();
    expect(jsonParser).not.toHaveBeenCalled();
    expect(multipartParser).not.toHaveBeenCalled();
  });

  it('hydrates tenant settings only after an allowed policy decision', async () => {
    const { events, tenantQuery } = setupPools([allowRow]);

    const response = await request(pipelineApp())
      .post('/graphql')
      .set('Host', 'api.example.com')
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(204);
    expect(jsonParser).toHaveBeenCalledTimes(1);
    expect(multipartParser).toHaveBeenCalledTimes(1);
    expect(tenantQuery).toHaveBeenCalled();
    expect(events.indexOf('policy')).toBeGreaterThan(events.indexOf('route-resolution'));
    expect(events.indexOf('tenant')).toBeGreaterThan(events.indexOf('policy'));
  });

  it('reselects the Graphile identity after a warm scoped route is rebound to another database', async () => {
    const reboundApiId = 'api-2';
    const { routingQuery } = setupPools(
      [allowRow, allowRow],
      { app_public: DATABASE_ID },
      [
        matchedRoute(),
        matchedRoute(REBOUND_DATABASE_ID, reboundApiId, REBOUND_TENANT_DATABASE)
      ]
    );
    const hostKey = 'api.example.com';
    const firstKey = `${hostKey}:database:${DATABASE_ID}:api:api-1`;
    const reboundKey = `${hostKey}:database:${REBOUND_DATABASE_ID}:api:${reboundApiId}`;
    const firstGraphile = jest.fn((req: Request, res: Response) => {
      res.status(200).json({
        servedDatabaseId: DATABASE_ID,
        requestDatabaseId: req.api?.databaseId
      });
    });
    const reboundGraphile = jest.fn((req: Request, res: Response) => {
      res.status(200).json({
        servedDatabaseId: REBOUND_DATABASE_ID,
        requestDatabaseId: req.api?.databaseId
      });
    });
    const app = graphileIdentityPipelineApp(new Map([
      [firstKey, firstGraphile],
      [reboundKey, reboundGraphile]
    ]));

    const first = await request(app)
      .get('/graphql')
      .set('Host', hostKey);
    const second = await request(app)
      .get('/graphql')
      .set('Host', hostKey);

    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      servedDatabaseId: DATABASE_ID,
      requestDatabaseId: DATABASE_ID
    });
    expect(second.status).toBe(200);
    expect(second.body).toEqual({
      servedDatabaseId: REBOUND_DATABASE_ID,
      requestDatabaseId: REBOUND_DATABASE_ID
    });
    expect(firstGraphile).toHaveBeenCalledTimes(1);
    expect(reboundGraphile).toHaveBeenCalledTimes(1);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('resolve_route')
    )).toHaveLength(2);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('database_access')
    ).map(([, params]) => params[0])).toEqual([
      DATABASE_ID,
      REBOUND_DATABASE_ID
    ]);
  });

  it('rejects malformed private database identity before PostgreSQL or multipart parsing', async () => {
    const { routingQuery, tenantQuery } = setupPools([allowRow]);

    const response = await request(pipelineApp())
      .post('/graphql')
      .set('Host', 'admin.example.com')
      .set('X-Database-Id', 'not-a-uuid')
      .set('X-Api-Name', 'customer')
      .set('Content-Type', 'multipart/form-data; boundary=test-boundary')
      .send('--test-boundary--');

    expect(response.status).toBe(400);
    expect(response.body.errors[0]).toMatchObject({
      extensions: {
        code: 'INVALID_DATABASE_IDENTITY',
        http: 400
      }
    });
    expect(routingQuery).not.toHaveBeenCalled();
    expect(tenantQuery).not.toHaveBeenCalled();
    expect(mockRegistryResolve).not.toHaveBeenCalled();
    expect(jsonParser).not.toHaveBeenCalled();
    expect(multipartParser).not.toHaveBeenCalled();
  });

  it('uses the stable REST JSON envelope for malformed identity without an Accept header', async () => {
    const { routingQuery } = setupPools([allowRow]);

    const response = await request(pipelineApp())
      .get('/fn/invocations/invocation-1')
      .set('Host', 'admin.example.com')
      .set('X-Database-Id', 'not-a-uuid')
      .set('X-Api-Name', 'customer');

    expect(response.status).toBe(400);
    expect(response.type).toBe('application/json');
    expect(response.body.error).toMatchObject({
      code: 'INVALID_DATABASE_IDENTITY',
      message: 'X-Database-Id must be a valid UUID when private routing headers are used.'
    });
    expect(routingQuery).not.toHaveBeenCalled();
  });

  it('ignores spoofed private routing headers on the public API surface', async () => {
    const publicOptions = options();
    publicOptions.api!.isPublic = true;
    const { routingQuery } = setupPools([allowRow]);

    const response = await request(pipelineApp(publicOptions))
      .post('/graphql')
      .set('Host', 'api.example.com')
      .set('X-Database-Id', PLATFORM_DATABASE_ID)
      .set('X-Api-Name', 'customer')
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(204);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('resolve_route')
    )).toHaveLength(1);
    expect(routingQuery.mock.calls.filter(([sql, params]) =>
      String(sql).includes('database_access') && params?.[0] === DATABASE_ID
    )).toHaveLength(1);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('FROM "routing_public".apis')
    )).toHaveLength(0);
  });

  it('rejects a cold X-Schemata request whose schema belongs to a suspended database but whose id names the platform database', async () => {
    const { routingQuery, tenantQuery } = setupPools([allowRow]);

    const response = await request(pipelineApp())
      .post('/graphql')
      .set('Host', 'admin.example.com')
      .set('X-Database-Id', PLATFORM_DATABASE_ID)
      .set('X-Schemata', 'app_public')
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(404);
    expect(response.text).toContain('No valid schemas found for the supplied X-Schemata header');
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('platform_private"."database_access')
    )).toHaveLength(0);
    expect(tenantQuery).not.toHaveBeenCalled();
    expect(mockRegistryResolve).not.toHaveBeenCalled();
    expect(svcCache.has(`schemata:${PLATFORM_DATABASE_ID}:app_public`)).toBe(false);
  });

  it('rejects the whole X-Schemata surface when any requested schema belongs to another database', async () => {
    const { routingQuery } = setupPools([allowRow], {
      app_public: DATABASE_ID,
      platform_public: PLATFORM_DATABASE_ID
    });

    const response = await request(pipelineApp())
      .post('/graphql')
      .set('Host', 'admin.example.com')
      .set('X-Database-Id', DATABASE_ID)
      .set('X-Schemata', 'app_public,platform_public')
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(404);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('platform_private"."database_access')
    )).toHaveLength(0);
  });

  it('revalidates a warm X-Schemata identity and evicts a cross-database binding before policy', async () => {
    const cacheKey = `schemata:${PLATFORM_DATABASE_ID}:app_public`;
    svcCache.set(cacheKey, {
      dbname: 'routing_database',
      anonRole: 'administrator',
      roleName: 'administrator',
      schema: ['app_public'],
      domains: [],
      databaseId: PLATFORM_DATABASE_ID,
      isPublic: false
    });
    const { routingQuery, tenantQuery } = setupPools([allowRow]);

    const response = await request(pipelineApp())
      .post('/graphql')
      .set('Host', 'admin.example.com')
      .set('X-Database-Id', PLATFORM_DATABASE_ID)
      .set('X-Schemata', 'app_public')
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(404);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('FROM metaschema_public.schema scoped_schema')
    )).toHaveLength(1);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('platform_private"."database_access')
    )).toHaveLength(0);
    expect(tenantQuery).not.toHaveBeenCalled();
    expect(mockRegistryResolve).not.toHaveBeenCalled();
    expect(svcCache.has(cacheKey)).toBe(false);
  });

  it('keeps X-Meta-Schema as a platform-management surface without applying tenant-schema binding', async () => {
    const { routingQuery } = setupPools([allowRow]);

    const response = await request(pipelineApp())
      .post('/graphql')
      .set('Host', 'admin.example.com')
      .set('X-Database-Id', PLATFORM_DATABASE_ID)
      .set('X-Meta-Schema', 'true')
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(204);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('FROM metaschema_public.schema scoped_schema')
    )).toHaveLength(0);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('platform_private"."database_access')
    )).toHaveLength(1);
  });

  it('preserves physical-schema-only X-Schemata routing when the optional access policy is unset', async () => {
    const tenantOptions = options();
    delete tenantOptions.api?.databaseAccessPolicyFunction;
    const { routingQuery } = setupPools([allowRow], {});

    const response = await request(pipelineApp(tenantOptions))
      .post('/graphql')
      .set('Host', 'admin.example.com')
      .set('X-Database-Id', PLATFORM_DATABASE_ID)
      .set('X-Schemata', 'app_public')
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(204);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('FROM metaschema_public.schema scoped_schema')
    )).toHaveLength(0);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('platform_private"."database_access')
    )).toHaveLength(0);
  });

  it.each([
    ['scoped route', {}, 'resolve_route'],
    [
      'X-Api-Name',
      { 'X-Database-Id': DATABASE_ID, 'X-Api-Name': 'customer' },
      'FROM "routing_public".apis'
    ],
    [
      'X-Schemata',
      { 'X-Database-Id': DATABASE_ID, 'X-Schemata': 'app_public' },
      'FROM metaschema_public.schema scoped_schema'
    ],
    [
      'X-Meta-Schema',
      { 'X-Database-Id': DATABASE_ID, 'X-Meta-Schema': 'true' },
      'information_schema.schemata'
    ]
  ])('re-evaluates a warm cached %s identity and never hydrates after denial', async (
    _label,
    headers,
    identitySql
  ) => {
    const { routingQuery, tenantQuery } = setupPools([allowRow, denyRow]);
    const app = pipelineApp();

    const first = await request(app)
      .post('/graphql')
      .set('Host', 'api.example.com')
      .set(headers)
      .send({ query: '{ __typename }' });
    const tenantQueriesAfterAllow = tenantQuery.mock.calls.length;
    const settingsAfterAllow = mockRegistryResolve.mock.calls.length;

    const second = await request(app)
      .post('/graphql')
      .set('Host', 'api.example.com')
      .set(headers)
      .send({ query: '{ __typename }' });

    expect(first.status).toBe(204);
    expect(second.status).toBe(402);
    expect(second.body.errors[0].extensions).toMatchObject({
      code: 'DATABASE_BILLING_SUSPENDED',
      http: 402
    });
    expect(routingQuery.mock.calls.filter(([sql]) => String(sql).includes(identitySql)))
      .toHaveLength(_label === 'X-Schemata' || _label === 'scoped route' ? 2 : 1);
    expect(routingQuery.mock.calls.filter(([sql]) => String(sql).includes('database_access'))).toHaveLength(2);
    expect(tenantQuery).toHaveBeenCalledTimes(tenantQueriesAfterAllow);
    expect(mockRegistryResolve).toHaveBeenCalledTimes(settingsAfterAllow);
  });

  it('keeps the warm scoped-route cache behavior when the optional access policy is unset', async () => {
    const tenantOptions = options();
    delete tenantOptions.api?.databaseAccessPolicyFunction;
    const { routingQuery } = setupPools([allowRow]);
    const app = pipelineApp(tenantOptions);

    const first = await request(app)
      .get('/graphql')
      .set('Host', 'api.example.com');
    const second = await request(app)
      .get('/graphql')
      .set('Host', 'api.example.com');

    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('resolve_route')
    )).toHaveLength(1);
    expect(routingQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('database_access')
    )).toHaveLength(0);
  });

  it('rejects private routing without database identity before PostgreSQL or multipart parsing', async () => {
    const { routingQuery, tenantQuery } = setupPools([allowRow]);

    const response = await request(pipelineApp())
      .post('/graphql')
      .set('Host', 'admin.example.com')
      .set('X-Schemata', 'app_public')
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].extensions).toMatchObject({
      code: 'INVALID_DATABASE_IDENTITY',
      http: 400
    });
    expect(routingQuery).not.toHaveBeenCalled();
    expect(tenantQuery).not.toHaveBeenCalled();
    expect(mockRegistryResolve).not.toHaveBeenCalled();
    expect(jsonParser).not.toHaveBeenCalled();
    expect(multipartParser).not.toHaveBeenCalled();
  });
});
