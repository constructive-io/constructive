jest.mock('pg-cache', () => ({
  getPgPool: jest.fn()
}));

import { ConstructiveError } from '@constructive-io/errors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import request from 'supertest';

import { ApiError } from '../../errors/api-errors';
import type { ApiOptions } from '../../types';
import { createDatabaseAccessPolicyMiddleware } from '../database-access-policy';
import { errorHandler } from '../error-handler';

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;
const DATABASE_ID = '11111111-1111-4111-8111-111111111111';

interface TestPolicyRow {
  allowed: unknown;
  code: unknown;
  message: unknown;
  http_status: unknown;
}

const options = (
  databaseAccessPolicyFunction?: string,
  isPublic = true
): ApiOptions => ({
  pg: { database: 'routing_database' },
  api: {
    databaseAccessPolicyFunction,
    isPublic
  }
} as ApiOptions);

const createRequest = (
  path = '/graphql',
  headers: Record<string, string> = {},
  databaseId: string | undefined = DATABASE_ID
): Request => ({
  path,
  headers,
  databaseId,
  api: { dbname: 'customer_database' }
} as unknown as Request);

const createResponse = (): { res: Response; status: jest.Mock; json: jest.Mock } => {
  const status = jest.fn();
  const json = jest.fn();
  const res = { status, json } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  return { res, status, json };
};

const allowRow: TestPolicyRow = {
  allowed: true,
  code: null,
  message: null,
  http_status: null
};

const denyRow: TestPolicyRow = {
  allowed: false,
  code: 'DATABASE_BILLING_SUSPENDED',
  message: 'This database is suspended until billing is restored.',
  http_status: 402
};

describe('database access policy middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing and creates no pool when the option is absent', async () => {
    const middleware = createDatabaseAccessPolicyMiddleware(options());
    const next = jest.fn();

    await middleware(createRequest(), createResponse().res, next);

    expect(mockGetPgPool).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('queries the routing pool with the resolved database id and permits an allowed request', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [allowRow] });
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);
    const opts = options('platform_private.database_access');
    const middleware = createDatabaseAccessPolicyMiddleware(opts);
    const next = jest.fn();

    await middleware(createRequest(), createResponse().res, next);

    expect(mockGetPgPool).toHaveBeenCalledWith(opts.pg);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('from "platform_private"."database_access"($1::uuid)'),
      [DATABASE_ID]
    );
    expect(next).toHaveBeenCalledWith();
  });

  it.each([
    ['X-Api-Name', { 'x-api-name': 'customer' }],
    ['X-Schemata', { 'x-schemata': 'app_public' }],
    ['X-Meta-Schema', { 'x-meta-schema': 'tenant_meta' }]
  ])('does not bypass a private %s request', async (_label, headers) => {
    const query = jest.fn().mockResolvedValue({ rows: [allowRow] });
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);
    const middleware = createDatabaseAccessPolicyMiddleware(
      options('platform_private.database_access', false)
    );
    const next = jest.fn();

    await middleware(createRequest('/graphql', headers), createResponse().res, next);

    expect(query).toHaveBeenCalledWith(expect.any(String), [DATABASE_ID]);
    expect(next).toHaveBeenCalledWith();
  });

  it('returns the exact GraphQL 402 contract when access is denied', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [denyRow] });
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);
    const middleware = createDatabaseAccessPolicyMiddleware(
      options('platform_private.database_access')
    );
    const { res, status, json } = createResponse();
    const next = jest.fn();

    await middleware(createRequest('/graphql'), res, next);

    expect(status).toHaveBeenCalledWith(402);
    expect(json).toHaveBeenCalledWith({
      errors: [{
        message: denyRow.message,
        extensions: {
          code: denyRow.code,
          class: 'public',
          http: 402
        }
      }]
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses the REST error handler status and envelope outside GraphQL', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [denyRow] });
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);
    const middleware = createDatabaseAccessPolicyMiddleware(
      options('platform_private.database_access')
    );
    const app = express();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.databaseId = DATABASE_ID;
      req.requestId = 'request-1';
      next();
    });
    app.use(middleware);
    app.use((_req, res) => res.status(204).end());
    app.use(errorHandler);

    const response = await request(app)
      .post('/fn/example')
      .set('Accept', 'application/json');

    expect(response.status).toBe(402);
    expect(response.body).toEqual({
      error: {
        code: denyRow.code,
        message: denyRow.message,
        requestId: 'request-1'
      }
    });
  });

  it('fails closed without querying when the configured function name is unsafe', async () => {
    const middleware = createDatabaseAccessPolicyMiddleware(
      options('platform_private.database_access;drop table users')
    );
    const { res, status, json } = createResponse();
    const next = jest.fn();

    await middleware(createRequest('/graphql'), res, next);

    expect(mockGetPgPool).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(503);
    const error = json.mock.calls[0][0].errors[0];
    expect(error.message).toBe('Database access policy is temporarily unavailable.');
    expect(error.extensions).toEqual({
      code: 'DATABASE_ACCESS_POLICY_UNAVAILABLE',
      class: 'internal',
      http: 503
    });
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['no rows', []],
    ['multiple rows', [allowRow, allowRow]],
    ['a non-boolean decision', [{ ...allowRow, allowed: 'true' }]],
    ['denial fields on allow', [{ ...allowRow, code: 'UNEXPECTED' }]],
    ['an unsafe denial code', [{ ...denyRow, code: 'bad-code' }]],
    ['an empty denial message', [{ ...denyRow, message: '  ' }]],
    ['an out-of-range status', [{ ...denyRow, http_status: 200 }]]
  ])('fails closed when the policy returns %s', async (_label, rows) => {
    const query = jest.fn().mockResolvedValue({ rows });
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);
    const middleware = createDatabaseAccessPolicyMiddleware(
      options('platform_private.database_access')
    );
    const { res, status, json } = createResponse();
    const next = jest.fn();

    await middleware(createRequest('/graphql'), res, next);

    expect(json.mock.calls[0][0].errors[0].extensions).toMatchObject({
      code: 'DATABASE_ACCESS_POLICY_UNAVAILABLE',
      http: 503
    });
    expect(status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('fails closed when policy evaluation throws', async () => {
    const query = jest.fn().mockRejectedValue(new Error('connection lost'));
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);
    const middleware = createDatabaseAccessPolicyMiddleware(
      options('platform_private.database_access')
    );
    const { res, status, json } = createResponse();
    const next = jest.fn();

    await middleware(createRequest('/graphql'), res, next);

    expect(json.mock.calls[0][0].errors[0].extensions.code)
      .toBe('DATABASE_ACCESS_POLICY_UNAVAILABLE');
    expect(status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('fails closed when API resolution did not supply a database id', async () => {
    const query = jest.fn();
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);
    const middleware = createDatabaseAccessPolicyMiddleware(
      options('platform_private.database_access')
    );
    const { res, status, json } = createResponse();
    const next = jest.fn();
    const req = createRequest('/graphql');
    req.databaseId = undefined;

    await middleware(req, res, next);

    expect(query).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].errors[0].extensions.code)
      .toBe('DATABASE_ACCESS_POLICY_UNAVAILABLE');
    expect(status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('evaluates the policy again for every request', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [allowRow] });
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);
    const middleware = createDatabaseAccessPolicyMiddleware(
      options('platform_private.database_access')
    );
    const next = jest.fn();

    await middleware(createRequest(), createResponse().res, next);
    await middleware(createRequest(), createResponse().res, next);

    expect(query).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('passes a REST denial to the canonical typed error path', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [denyRow] });
    mockGetPgPool.mockReturnValue({ query } as unknown as Pool);
    const middleware = createDatabaseAccessPolicyMiddleware(
      options('platform_private.database_access')
    );
    const next = jest.fn();

    await middleware(createRequest('/v1/agents'), createResponse().res, next);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: denyRow.code, statusCode: 402 });
    expect(error).not.toBeInstanceOf(ConstructiveError);
  });
});
