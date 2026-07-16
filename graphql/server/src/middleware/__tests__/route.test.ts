jest.mock('pg-cache', () => ({
  getPgPool: jest.fn()
}));

import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import type { ApiOptions } from '../../types';
import {
  createRouteMiddleware,
  getHttpRouteMode,
  resolveHttpRoute
} from '../route';

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;

const OLD_ENV = process.env.HTTP_ROUTE_RESOLVER_MODE;

afterAll(() => {
  process.env.HTTP_ROUTE_RESOLVER_MODE = OLD_ENV;
});

const routeRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  route_id: 'route-1',
  database_id: 'db-1',
  domain_id: 'domain-1',
  matched_path: '/graphql',
  method: null,
  target_kind: 'api',
  target_id: 'api-1',
  ...overrides
});

const poolReturning = (rows: unknown[]): Pool => ({
  query: jest.fn(async () => ({ rows }))
} as unknown as Pool);

const poolThrowing = (code: string): Pool => ({
  query: jest.fn(async () => {
    const err = new Error('boom') as Error & { code?: string };
    err.code = code;
    throw err;
  })
} as unknown as Pool);

const createRequest = (host: string, path: string, method: string): Request =>
  ({
    method,
    path,
    get: (name: string) => (name.toLowerCase() === 'host' ? host : undefined)
  } as unknown as Request);

const createResponse = () => {
  const res: Partial<Response> & {
    statusCode?: number;
    body?: unknown;
    headers: Record<string, string>;
  } = {
    headers: {}
  };
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as unknown as Response['status'];
  res.json = jest.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as unknown as Response['json'];
  res.send = jest.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as unknown as Response['send'];
  res.set = jest.fn((k: string, v: string) => {
    res.headers[k] = v;
    return res as Response;
  }) as unknown as Response['set'];
  return res;
};

const opts = { pg: { database: 'constructive' }, api: {} } as unknown as ApiOptions;

describe('getHttpRouteMode', () => {
  it('defaults to shadow when unset or invalid', () => {
    delete process.env.HTTP_ROUTE_RESOLVER_MODE;
    expect(getHttpRouteMode()).toBe('shadow');
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'nonsense';
    expect(getHttpRouteMode()).toBe('shadow');
  });

  it('reads off/shadow/on case-insensitively', () => {
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'ON';
    expect(getHttpRouteMode()).toBe('on');
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'off';
    expect(getHttpRouteMode()).toBe('off');
  });
});

describe('resolveHttpRoute', () => {
  it('maps a row into a typed match', async () => {
    const match = await resolveHttpRoute(poolReturning([routeRow()]), 'acme.test', '/graphql', 'POST');
    expect(match).toMatchObject({ targetKind: 'api', targetId: 'api-1', databaseId: 'db-1' });
  });

  it('returns null when nothing matches', async () => {
    expect(await resolveHttpRoute(poolReturning([]), 'acme.test', '/', 'GET')).toBeNull();
  });

  it('returns null (never throws) when the resolver is absent', async () => {
    expect(await resolveHttpRoute(poolThrowing('42883'), 'acme.test', '/', 'GET')).toBeNull();
  });

  it('returns null when host is empty', async () => {
    const pool = poolReturning([routeRow()]);
    expect(await resolveHttpRoute(pool, '', '/', 'GET')).toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('createRouteMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('off mode: never queries and always falls through', async () => {
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'off';
    const pool = poolReturning([routeRow()]);
    mockGetPgPool.mockReturnValue(pool);
    const req = createRequest('acme.test', '/graphql', 'POST');
    const next = jest.fn() as NextFunction;
    await createRouteMiddleware(opts)(req, createResponse() as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.routeApiId).toBeUndefined();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('shadow mode: attaches match but never changes behavior', async () => {
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'shadow';
    mockGetPgPool.mockReturnValue(poolReturning([routeRow()]));
    const req = createRequest('acme.test', '/graphql', 'POST');
    const res = createResponse();
    const next = jest.fn() as NextFunction;
    await createRouteMiddleware(opts)(req, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.httpRoute).toMatchObject({ targetKind: 'api', targetId: 'api-1' });
    expect(req.routeApiId).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('on mode / api target: sets routeApiId and falls through', async () => {
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'on';
    mockGetPgPool.mockReturnValue(poolReturning([routeRow()]));
    const req = createRequest('acme.test', '/graphql', 'POST');
    const next = jest.fn() as NextFunction;
    await createRouteMiddleware(opts)(req, createResponse() as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.routeApiId).toBe('api-1');
  });

  it('on mode / site target: serves a typed placeholder', async () => {
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'on';
    mockGetPgPool.mockReturnValue(
      poolReturning([routeRow({ target_kind: 'site', target_id: 'site-9' })])
    );
    const req = createRequest('acme.test', '/', 'GET');
    const res = createResponse();
    const next = jest.fn() as NextFunction;
    await createRouteMiddleware(opts)(req, res as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.headers['X-Constructive-Route']).toBe('site:site-9');
  });

  it('on mode / function target: typed 501', async () => {
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'on';
    mockGetPgPool.mockReturnValue(
      poolReturning([
        routeRow({
          target_kind: 'function',
          target_id: 'fn-1'
        })
      ])
    );
    const req = createRequest('acme.test', '/hooks/x', 'POST');
    const res = createResponse();
    const next = jest.fn() as NextFunction;
    await createRouteMiddleware(opts)(req, res as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(501);
    expect(res.body).toMatchObject({ targetKind: 'function', targetId: 'fn-1' });
  });

  it('on mode / no match: falls through to legacy resolution', async () => {
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'on';
    mockGetPgPool.mockReturnValue(poolReturning([]));
    const req = createRequest('acme.test', '/graphql', 'POST');
    const next = jest.fn() as NextFunction;
    await createRouteMiddleware(opts)(req, createResponse() as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.routeApiId).toBeUndefined();
  });
});
