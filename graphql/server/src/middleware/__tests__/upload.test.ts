import type { NextFunction, Request, Response } from 'express';
import { getPgPool } from 'pg-cache';
import pgQueryContext from 'pg-query-context';
import type { ApiStructure } from '../../types';
import { createUploadAuthenticateMiddleware } from '../upload';

jest.mock('pg-cache', () => ({
  getPgPool: jest.fn(),
}));

jest.mock('pg-query-context', () => jest.fn());

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;
const mockPgQueryContext = pgQueryContext as jest.MockedFunction<typeof pgQueryContext>;

interface MockPool {
  query: jest.Mock;
}

const baseApi: ApiStructure = {
  dbname: 'tenant_db',
  anonRole: 'anonymous',
  roleName: 'authenticated',
  schema: ['public'],
  apiModules: [],
  databaseId: 'db-123',
  isPublic: true,
};

function makeReq(input: {
  api?: ApiStructure;
  headers?: Record<string, string>;
  clientIp?: string;
  token?: Record<string, unknown>;
} = {}): Request {
  const headers = input.headers ?? {};
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    api: input.api,
    headers,
    clientIp: input.clientIp ?? '127.0.0.1',
    token: input.token,
    get(name: string) {
      return normalizedHeaders[name.toLowerCase()];
    },
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function makeNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}

describe('createUploadAuthenticateMiddleware', () => {
  let rootPool: MockPool;
  let tenantPool: MockPool;

  beforeEach(() => {
    jest.clearAllMocks();

    rootPool = {
      query: jest.fn(),
    };

    tenantPool = {
      query: jest.fn(),
    };

    mockGetPgPool.mockImplementation((config: any) => {
      if (config?.database === 'tenant_db') return tenantPool as any;
      return rootPool as any;
    });
  });

  it('returns 500 when API info is missing', async () => {
    const middleware = createUploadAuthenticateMiddleware({
      pg: { database: 'services' },
    } as any);
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(500);
    expect((res.send as jest.Mock)).toHaveBeenCalledWith('Missing API info');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when bearer token is missing', async () => {
    const middleware = createUploadAuthenticateMiddleware({
      pg: { database: 'services' },
      server: { strictAuth: false },
    } as any);
    const req = makeReq({ api: baseApi });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect((res.json as jest.Mock)).toHaveBeenCalledWith({
      error: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('authenticates using API-scoped RLS module', async () => {
    const middleware = createUploadAuthenticateMiddleware({
      pg: { database: 'services' },
      server: { strictAuth: false },
    } as any);
    const req = makeReq({
      api: {
        ...baseApi,
        rlsModule: {
          authenticate: 'authenticate',
          privateSchema: { schemaName: 'private' },
        },
      },
      headers: {
        authorization: 'Bearer good-token',
        origin: 'https://app.localhost',
        'user-agent': 'JestAgent/1.0',
      },
      clientIp: '10.0.0.1',
    });
    const res = makeRes();
    const next = makeNext();

    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 'token-id', user_id: 'user-id' }],
    } as any);

    await middleware(req, res, next);

    expect(mockPgQueryContext).toHaveBeenCalledWith(
      expect.objectContaining({
        client: tenantPool,
        query: 'SELECT * FROM "private"."authenticate"($1)',
        variables: ['good-token'],
        context: expect.objectContaining({
          'jwt.claims.ip_address': '10.0.0.1',
          'jwt.claims.origin': 'https://app.localhost',
          'jwt.claims.user_agent': 'JestAgent/1.0',
        }),
      }),
    );
    expect(req.token).toEqual({ id: 'token-id', user_id: 'user-id' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('falls back to database-scoped RLS module lookup when api.rlsModule is missing', async () => {
    const middleware = createUploadAuthenticateMiddleware({
      pg: { database: 'services' },
      server: { strictAuth: false },
    } as any);
    const req = makeReq({
      api: {
        ...baseApi,
        rlsModule: undefined,
      },
      headers: { authorization: 'Bearer fallback-token' },
    });
    const res = makeRes();
    const next = makeNext();

    rootPool.query.mockResolvedValueOnce({
      rows: [
        {
          authenticate: 'authenticate',
          authenticate_strict: 'authenticate_strict',
          private_schema_name: 'private',
        },
      ],
    });

    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 'token-id', user_id: 'user-id' }],
    } as any);

    await middleware(req, res, next);

    expect(rootPool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE a.database_id = $1'),
      ['db-123'],
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('falls back to dbname lookup when databaseId is missing', async () => {
    const middleware = createUploadAuthenticateMiddleware({
      pg: { database: 'services' },
      server: { strictAuth: false },
    } as any);
    const req = makeReq({
      api: {
        ...baseApi,
        databaseId: undefined,
        rlsModule: undefined,
      },
      headers: { authorization: 'Bearer fallback-token' },
    });
    const res = makeRes();
    const next = makeNext();

    rootPool.query.mockResolvedValueOnce({
      rows: [
        {
          authenticate: 'authenticate',
          authenticate_strict: 'authenticate_strict',
          private_schema_name: 'private',
        },
      ],
    });
    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 'token-id', user_id: 'user-id' }],
    } as any);

    await middleware(req, res, next);

    expect(rootPool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE a.dbname = $1'),
      ['tenant_db'],
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when no RLS module can be resolved', async () => {
    const middleware = createUploadAuthenticateMiddleware({
      pg: { database: 'services' },
      server: { strictAuth: false },
    } as any);
    const req = makeReq({
      api: {
        ...baseApi,
        rlsModule: undefined,
      },
      headers: { authorization: 'Bearer missing-module-token' },
    });
    const res = makeRes();
    const next = makeNext();

    rootPool.query.mockResolvedValueOnce({ rows: [] });
    rootPool.query.mockResolvedValueOnce({ rows: [] });

    await middleware(req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect((res.json as jest.Mock)).toHaveBeenCalledWith({
      error: 'Authentication required',
    });
    expect(mockPgQueryContext).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token validation returns no rows', async () => {
    const middleware = createUploadAuthenticateMiddleware({
      pg: { database: 'services' },
      server: { strictAuth: false },
    } as any);
    const req = makeReq({
      api: {
        ...baseApi,
        rlsModule: {
          authenticate: 'authenticate',
          privateSchema: { schemaName: 'private' },
        },
      },
      headers: { authorization: 'Bearer invalid-token' },
    });
    const res = makeRes();
    const next = makeNext();

    mockPgQueryContext.mockResolvedValue({
      rowCount: 0,
      rows: [],
    } as any);

    await middleware(req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect((res.json as jest.Mock)).toHaveBeenCalledWith({
      error: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token validation throws', async () => {
    const middleware = createUploadAuthenticateMiddleware({
      pg: { database: 'services' },
      server: { strictAuth: false },
    } as any);
    const req = makeReq({
      api: {
        ...baseApi,
        rlsModule: {
          authenticate: 'authenticate',
          privateSchema: { schemaName: 'private' },
        },
      },
      headers: { authorization: 'Bearer bad-token' },
    });
    const res = makeRes();
    const next = makeNext();

    mockPgQueryContext.mockRejectedValue(new Error('boom'));

    await middleware(req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect((res.json as jest.Mock)).toHaveBeenCalledWith({
      error: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses authenticateStrict when strictAuth is enabled', async () => {
    const middleware = createUploadAuthenticateMiddleware({
      pg: { database: 'services' },
      server: { strictAuth: true },
    } as any);
    const req = makeReq({
      api: {
        ...baseApi,
        rlsModule: {
          authenticate: 'authenticate',
          authenticateStrict: 'authenticate_strict',
          privateSchema: { schemaName: 'private' },
        },
      },
      headers: { authorization: 'Bearer strict-token' },
    });
    const res = makeRes();
    const next = makeNext();

    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 'strict-token-id', user_id: 'strict-user-id' }],
    } as any);

    await middleware(req, res, next);

    expect(mockPgQueryContext).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'SELECT * FROM "private"."authenticate_strict"($1)',
      }),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when strictAuth is enabled but authenticateStrict is missing', async () => {
    const middleware = createUploadAuthenticateMiddleware({
      pg: { database: 'services' },
      server: { strictAuth: true },
    } as any);
    const req = makeReq({
      api: {
        ...baseApi,
        rlsModule: {
          authenticate: 'authenticate',
          privateSchema: { schemaName: 'private' },
        },
      },
      headers: { authorization: 'Bearer strict-token' },
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect((res.json as jest.Mock)).toHaveBeenCalledWith({
      error: 'Authentication required',
    });
    expect(mockPgQueryContext).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
