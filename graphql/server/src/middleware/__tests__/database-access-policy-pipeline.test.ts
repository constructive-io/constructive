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
import express from 'express';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import request from 'supertest';

import type { ApiOptions } from '../../types';
import { createApiMiddleware, createApiSettingsMiddleware } from '../api';
import { createDatabaseAccessPolicyMiddleware } from '../database-access-policy';
import { errorHandler } from '../error-handler';

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;
const mockCreateDefaultRegistry = createDefaultRegistry as jest.MockedFunction<typeof createDefaultRegistry>;
const mockRegistryResolve = (
  mockCreateDefaultRegistry.mock.results[0]?.value as { resolve: jest.Mock }
).resolve;

const DATABASE_ID = '11111111-1111-4111-8111-111111111111';
const TENANT_DATABASE = 'customer_database';

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

const matchedRoute = () => ({
  route_binding_id: 'route-1',
  target_module: 'api',
  target_source_id: 'api-1',
  resolved_config: {
    api_id: 'api-1',
    database_id: DATABASE_ID,
    dbname: TENANT_DATABASE,
    role_name: 'authenticated',
    anon_role: 'anonymous',
    is_public: false,
    schemas: ['app_public']
  }
});

function setupPools(policyRows: PolicyRow[]) {
  const events: string[] = [];
  const tenantQuery = jest.fn(async () => {
    events.push('tenant');
    return { rows: [] as unknown[] };
  });
  const policyQueue = [...policyRows];
  const routingQuery = jest.fn(async (sql: string, params: unknown[]) => {
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
      return { rows: [matchedRoute()] };
    }
    if (sql.includes('platform_private"."database_access')) {
      events.push('policy');
      return { rows: [policyQueue.shift() ?? policyRows[policyRows.length - 1]] };
    }
    throw new Error(`Unexpected routing query: ${sql}`);
  });

  const routingPool = { query: routingQuery } as unknown as Pool;
  const tenantPool = { query: tenantQuery } as unknown as Pool;
  mockGetPgPool.mockImplementation((pgOptions) => (
    pgOptions?.database === TENANT_DATABASE ? tenantPool : routingPool
  ));

  return { events, routingQuery, tenantQuery };
}

function pipelineApp(apiOptions = options()) {
  const app = express();
  app.use(createApiMiddleware(apiOptions));
  app.use(createDatabaseAccessPolicyMiddleware(apiOptions));
  app.use(createApiSettingsMiddleware(apiOptions));
  app.use((_req, res) => res.status(204).end());
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
  });

  it('hydrates tenant settings only after an allowed policy decision', async () => {
    const { events, tenantQuery } = setupPools([allowRow]);

    const response = await request(pipelineApp())
      .post('/graphql')
      .set('Host', 'api.example.com')
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(204);
    expect(tenantQuery).toHaveBeenCalled();
    expect(events.indexOf('policy')).toBeGreaterThan(events.indexOf('route-resolution'));
    expect(events.indexOf('tenant')).toBeGreaterThan(events.indexOf('policy'));
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
      'information_schema.schemata'
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
    expect(routingQuery.mock.calls.filter(([sql]) => String(sql).includes(identitySql))).toHaveLength(1);
    expect(routingQuery.mock.calls.filter(([sql]) => String(sql).includes('database_access'))).toHaveLength(2);
    expect(tenantQuery).toHaveBeenCalledTimes(tenantQueriesAfterAllow);
    expect(mockRegistryResolve).toHaveBeenCalledTimes(settingsAfterAllow);
  });

  it('fails closed with the policy-unavailable contract when private routing omits database identity', async () => {
    const { routingQuery, tenantQuery } = setupPools([allowRow]);

    const response = await request(pipelineApp())
      .post('/graphql')
      .set('Host', 'admin.example.com')
      .set('X-Schemata', 'app_public')
      .send({ query: '{ __typename }' });

    expect(response.status).toBe(503);
    expect(response.body.errors[0].extensions).toMatchObject({
      code: 'DATABASE_ACCESS_POLICY_UNAVAILABLE',
      http: 503
    });
    expect(routingQuery.mock.calls.some(([sql]) => String(sql).includes('database_access'))).toBe(false);
    expect(tenantQuery).not.toHaveBeenCalled();
    expect(mockRegistryResolve).not.toHaveBeenCalled();
  });
});
