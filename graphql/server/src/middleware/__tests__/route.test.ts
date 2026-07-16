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
  isLocalHost,
  isSecureRequest,
  normalizeHost,
  resolveHttpRoute,
  resolveRouteMode,
  resolveRoutingEnv
} from '../route';

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;

const OLD_MODE = process.env.HTTP_ROUTE_RESOLVER_MODE;
const OLD_ROUTING_ENV = process.env.ROUTING_ENV;
const OLD_NODE_ENV = process.env.NODE_ENV;

afterAll(() => {
  process.env.HTTP_ROUTE_RESOLVER_MODE = OLD_MODE;
  process.env.ROUTING_ENV = OLD_ROUTING_ENV;
  process.env.NODE_ENV = OLD_NODE_ENV;
});

const routeRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  route_id: 'route-1',
  domain_id: 'domain-1',
  matched_path: '/graphql',
  method: null,
  target_kind: 'api',
  channel: null,
  api_id: 'api-1',
  site_id: null,
  service_id: null,
  function_definition_id: null,
  bucket_id: null,
  route_scope: 'database',
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

const createRequest = (
  host: string,
  path: string,
  method: string,
  extraHeaders: Record<string, string> = {},
  protocol = 'http'
): Request =>
  ({
    method,
    path,
    protocol,
    secure: protocol === 'https',
    get: (name: string) => {
      const key = name.toLowerCase();
      if (key === 'host') return host;
      return extraHeaders[key];
    }
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

describe('normalizeHost', () => {
  it('lowercases and strips the port', () => {
    expect(normalizeHost('App.Localhost:5678')).toBe('app.localhost');
    expect(normalizeHost('acme.test.constructive.io:443')).toBe('acme.test.constructive.io');
  });
  it('leaves a bare host unchanged', () => {
    expect(normalizeHost('acme.test')).toBe('acme.test');
  });
  it('keeps an IPv6 literal (drops only the port)', () => {
    expect(normalizeHost('[::1]:3000')).toBe('[::1]');
  });
  it('returns empty string for empty input', () => {
    expect(normalizeHost('')).toBe('');
  });
});

describe('isLocalHost', () => {
  const suffixes = ['localhost', '127.0.0.1', '::1', '.local', '.test'];
  it('matches localhost and its subdomains', () => {
    expect(isLocalHost('localhost', suffixes)).toBe(true);
    expect(isLocalHost('app.localhost', suffixes)).toBe(true);
  });
  it('matches dotted dev suffixes', () => {
    expect(isLocalHost('acme.test', suffixes)).toBe(true);
    expect(isLocalHost('foo.local', suffixes)).toBe(true);
  });
  it('matches loopback literals', () => {
    expect(isLocalHost('127.0.0.1', suffixes)).toBe(true);
    expect(isLocalHost('[::1]', suffixes)).toBe(true);
  });
  it('does not match a public host', () => {
    expect(isLocalHost('acme.constructive.io', suffixes)).toBe(false);
  });
});

describe('resolveRouteMode / resolveRoutingEnv precedence', () => {
  it('env var HTTP_ROUTE_RESOLVER_MODE wins over typed config', () => {
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'on';
    expect(resolveRouteMode({ routing: { mode: 'off' } } as unknown as ApiOptions)).toBe('on');
  });
  it('falls back to typed config when env var unset', () => {
    delete process.env.HTTP_ROUTE_RESOLVER_MODE;
    expect(resolveRouteMode({ routing: { mode: 'on' } } as unknown as ApiOptions)).toBe('on');
  });
  it('ROUTING_ENV wins, then config, then NODE_ENV', () => {
    process.env.ROUTING_ENV = 'production';
    expect(resolveRoutingEnv({ routing: { env: 'local' } } as unknown as ApiOptions)).toBe('production');
    delete process.env.ROUTING_ENV;
    expect(resolveRoutingEnv({ routing: { env: 'local' } } as unknown as ApiOptions)).toBe('local');
    delete (process.env as Record<string, string | undefined>).ROUTING_ENV;
    process.env.NODE_ENV = 'production';
    expect(resolveRoutingEnv({} as unknown as ApiOptions)).toBe('production');
    process.env.NODE_ENV = 'test';
    expect(resolveRoutingEnv({} as unknown as ApiOptions)).toBe('local');
  });
});

describe('isSecureRequest (local vs production)', () => {
  const suffixes = ['localhost', '127.0.0.1', '::1', '.local', '.test'];
  it('local env: a public host over plain http is treated as secure (TLS simulated)', () => {
    const req = createRequest('acme.constructive.io', '/', 'GET', {}, 'http');
    expect(isSecureRequest(req, 'local', 'acme.constructive.io', suffixes)).toBe(true);
  });
  it('production env: same public host over plain http is NOT secure', () => {
    const req = createRequest('acme.constructive.io', '/', 'GET', {}, 'http');
    expect(isSecureRequest(req, 'production', 'acme.constructive.io', suffixes)).toBe(false);
  });
  it('production env: X-Forwarded-Proto=https is secure', () => {
    const req = createRequest('acme.constructive.io', '/', 'GET', { 'x-forwarded-proto': 'https' }, 'http');
    expect(isSecureRequest(req, 'production', 'acme.constructive.io', suffixes)).toBe(true);
  });
  it('production env: a local dev host is always secure', () => {
    const req = createRequest('app.localhost', '/', 'GET', {}, 'http');
    expect(isSecureRequest(req, 'production', 'app.localhost', suffixes)).toBe(true);
  });
});

describe('resolveHttpRoute', () => {
  it('maps a row into a typed match', async () => {
    const match = await resolveHttpRoute(poolReturning([routeRow()]), 'acme.test', '/graphql', 'POST');
    expect(match).toMatchObject({ targetKind: 'api', apiId: 'api-1', routeScope: 'database' });
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
    expect(req.httpRoute).toMatchObject({ targetKind: 'api', apiId: 'api-1' });
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
      poolReturning([routeRow({ target_kind: 'site', api_id: null, site_id: 'site-9' })])
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
          api_id: null,
          function_definition_id: 'fn-1',
          channel: 'sync'
        })
      ])
    );
    const req = createRequest('acme.test', '/hooks/x', 'POST');
    const res = createResponse();
    const next = jest.fn() as NextFunction;
    await createRouteMiddleware(opts)(req, res as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(501);
    expect(res.body).toMatchObject({ targetKind: 'function', channel: 'sync', functionDefinitionId: 'fn-1' });
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

  it('normalizes the host (drops the port) before resolving', async () => {
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'on';
    const pool = poolReturning([routeRow()]);
    mockGetPgPool.mockReturnValue(pool);
    const req = createRequest('acme.test:5678', '/graphql', 'POST');
    await createRouteMiddleware(opts)(req, createResponse() as Response, jest.fn() as NextFunction);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['acme.test', '/graphql', 'POST']);
  });

  it('annotates env + secure headers; local treats http public host as secure', async () => {
    delete process.env.ROUTING_ENV;
    process.env.NODE_ENV = 'test';
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'shadow';
    mockGetPgPool.mockReturnValue(poolReturning([]));
    const req = createRequest('acme.constructive.io', '/graphql', 'POST', {}, 'http');
    const res = createResponse();
    await createRouteMiddleware(opts)(req, res as Response, jest.fn() as NextFunction);
    expect(req.routeEnv).toBe('local');
    expect(req.routeSecure).toBe(true);
    expect(res.headers['X-Constructive-Route-Env']).toBe('local');
    expect(res.headers['X-Constructive-Route-Secure']).toBe('true');
  });

  it('production: same http public host is flagged insecure', async () => {
    process.env.HTTP_ROUTE_RESOLVER_MODE = 'shadow';
    mockGetPgPool.mockReturnValue(poolReturning([]));
    const prodOpts = { ...opts, routing: { env: 'production' } } as unknown as ApiOptions;
    const req = createRequest('acme.constructive.io', '/graphql', 'POST', {}, 'http');
    const res = createResponse();
    await createRouteMiddleware(prodOpts)(req, res as Response, jest.fn() as NextFunction);
    expect(req.routeEnv).toBe('production');
    expect(req.routeSecure).toBe(false);
    expect(res.headers['X-Constructive-Route-Secure']).toBe('false');
  });
});
