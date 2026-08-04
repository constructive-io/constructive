jest.mock('pg-cache', () => ({
  acquirePgPool: jest.fn(),
  PG_POOL_CAPACITY_ERROR_CODE: 'PG_POOL_CAPACITY'
}));

jest.mock('pg-query-context', () => ({
  __esModule: true,
  default: jest.fn()
}));

import type { PgpmOptions } from '@pgpmjs/types';
import type { NextFunction, Request, Response } from 'express';
import { acquirePgPool } from 'pg-cache';
import pgQueryContext from 'pg-query-context';

import type { ApiStructure, RlsModule } from '../../types';
import { createAuthenticateMiddleware } from '../auth';

const mockAcquirePgPool = acquirePgPool as jest.MockedFunction<typeof acquirePgPool>;
const mockPgQueryContext = pgQueryContext as jest.MockedFunction<typeof pgQueryContext>;

const rlsModule: RlsModule = {
  authenticate: 'authenticate',
  authenticateStrict: 'authenticate_strict',
  privateSchema: { schemaName: 'auth_private' },
  publicSchema: { schemaName: 'auth_public' },
  currentRole: 'current_role',
  currentRoleId: 'current_role_id',
  currentIpAddress: 'current_ip_address',
  currentUserAgent: 'current_user_agent'
};

const api = (overrides: Partial<ApiStructure> = {}): ApiStructure => ({
  dbname: 'tenant_db',
  anonRole: 'anonymous',
  roleName: 'authenticated',
  schema: ['app_public'],
  databaseId: 'db-1',
  rlsModule,
  ...overrides
});

const request = (
  apiConfig: ApiStructure,
  headers: Record<string, string> = {}
): Request => {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  return {
    api: apiConfig,
    clientIp: '127.0.0.1',
    headers: normalized,
    get: jest.fn((name: string) => normalized[name.toLowerCase()])
  } as unknown as Request;
};

const response = (): Response => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
};

const opts = {
  pg: {
    database: 'routing_db',
    user: 'control_user'
  },
  server: {
    strictAuth: false
  }
} as unknown as PgpmOptions;

describe('authenticate middleware PostgreSQL pool leases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['an API without RLS', api({ rlsModule: undefined }), {}],
    ['an anonymous request', api(), {}]
  ])('does not allocate a tenant control pool for %s', async (_label, apiConfig, headers) => {
    const req = request(apiConfig as ApiStructure, headers as Record<string, string>);
    const res = response();
    const next = jest.fn() as NextFunction;

    await createAuthenticateMiddleware(opts)(req, res, next);

    expect(mockAcquirePgPool).not.toHaveBeenCalled();
    expect(mockPgQueryContext).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the selected authentication function is absent', async () => {
    const req = request(api({
      rlsModule: { ...rlsModule, authenticate: '' }
    }), { authorization: 'Bearer credential' });
    const res = response();
    const next = jest.fn() as NextFunction;

    await createAuthenticateMiddleware(opts)(req, res, next);

    expect(mockAcquirePgPool).not.toHaveBeenCalled();
    expect(mockPgQueryContext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('fails closed when strict authentication cannot resolve an RLS module', async () => {
    const strictOpts = {
      ...opts,
      server: { ...opts.server, strictAuth: true }
    } as unknown as PgpmOptions;
    const res = response();
    const next = jest.fn() as NextFunction;

    await createAuthenticateMiddleware(strictOpts)(
      request(api({ rlsModule: undefined })),
      res,
      next
    );

    expect(mockAcquirePgPool).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('quotes metadata-derived authentication identifiers', async () => {
    const release = jest.fn();
    mockAcquirePgPool.mockReturnValue({
      pool: {} as never,
      identity: 'pg:tenant-control',
      release
    });
    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [{ role: 'authenticated', user_id: 'user-1' }]
    } as never);
    const req = request(api({
      rlsModule: {
        ...rlsModule,
        privateSchema: { schemaName: 'auth";select pg_sleep(9);--' },
        authenticate: 'authenticate";drop schema public;--'
      }
    }), { authorization: 'Bearer credential' });

    await createAuthenticateMiddleware(opts)(
      req,
      response(),
      jest.fn() as NextFunction
    );

    expect(mockPgQueryContext).toHaveBeenCalledWith(expect.objectContaining({
      query: 'SELECT * FROM "auth"";select pg_sleep(9);--"."authenticate"";drop schema public;--"($1)',
      variables: ['credential']
    }));
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('leases the exact tenant control pool only for the credential query', async () => {
    const release = jest.fn();
    const pool = { query: jest.fn() };
    mockAcquirePgPool.mockReturnValue({
      pool: pool as never,
      identity: 'pg:tenant-control',
      release
    });
    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [{ role: 'authenticated', user_id: 'user-1' }]
    } as never);
    const req = request(api(), { authorization: 'Bearer credential' });
    const res = response();
    const next = jest.fn() as NextFunction;

    await createAuthenticateMiddleware(opts)(req, res, next);

    expect(mockAcquirePgPool).toHaveBeenCalledTimes(1);
    expect(mockAcquirePgPool).toHaveBeenCalledWith(
      expect.objectContaining({
        database: 'tenant_db',
        user: 'control_user'
      }),
      { purpose: 'tenant-request-control', sanitizeOnCheckout: true }
    );
    expect(mockPgQueryContext).toHaveBeenCalledWith(expect.objectContaining({
      client: pool,
      query: 'SELECT * FROM "auth_private"."authenticate"($1)',
      variables: ['credential']
    }));
    expect(release).toHaveBeenCalledTimes(1);
    expect(req.token).toEqual(expect.objectContaining({ user_id: 'user-1' }));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('omits an unavailable client IP from the credential-query context', async () => {
    const release = jest.fn();
    mockAcquirePgPool.mockReturnValue({
      pool: {} as never,
      identity: 'pg:tenant-control',
      release
    });
    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [{ role: 'authenticated', user_id: 'user-1' }]
    } as never);
    const req = request(api(), { authorization: 'Bearer credential' });
    req.clientIp = undefined;

    await createAuthenticateMiddleware(
      opts
    )(req, response(), jest.fn() as NextFunction);

    expect(mockPgQueryContext).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        'jwt.claims.ip_address': '',
        'jwt.claims.origin': '',
        'jwt.claims.user_agent': '',
        'jwt.claims.database_id': 'db-1',
        'row_security': 'on',
        'search_path': 'pg_catalog',
        'transaction_read_only': 'on'
      })
    }));
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases the tenant control pool when the credential query fails', async () => {
    const release = jest.fn();
    mockAcquirePgPool.mockReturnValue({
      pool: {} as never,
      identity: 'pg:tenant-control',
      release
    });
    mockPgQueryContext.mockRejectedValue(new Error('query failed'));
    const req = request(api(), { authorization: 'Bearer credential' });
    const res = response();
    const next = jest.fn() as NextFunction;

    await createAuthenticateMiddleware(opts)(req, res, next);

    expect(release).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards pool-capacity refusal to the shared HTTP error handler', async () => {
    const capacityError = Object.assign(new Error('sensitive capacity details'), {
      code: 'PG_POOL_CAPACITY'
    });
    mockAcquirePgPool.mockImplementation(() => {
      throw capacityError;
    });
    const req = request(api(), { authorization: 'Bearer credential' });
    const res = response();
    const next = jest.fn() as NextFunction;

    await createAuthenticateMiddleware(opts)(req, res, next);

    expect(next).toHaveBeenCalledWith(capacityError);
    expect(mockPgQueryContext).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
