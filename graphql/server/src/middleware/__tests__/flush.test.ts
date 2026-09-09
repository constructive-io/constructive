import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { svcCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { graphileCache } from 'graphile-cache';

import { createFlushMiddleware } from '../flush';

const TOKEN = 'flush-secret-token';
const SERVICE_KEY = 'tenant.example.com';
const ROTATED_CACHE_KEYS = [
  `${SERVICE_KEY}:runtime:old`,
  `${SERVICE_KEY}:runtime:new`,
];

const makeReq = (url: string, authorization?: string): Request => {
  const req: any = {
    url,
    svc_key: SERVICE_KEY,
    get: (name: string) =>
      name.toLowerCase() === 'authorization' ? authorization : undefined
  };
  return req as Request;
};

const makeRes = (): Response & { statusCode?: number; body?: string } => {
  const res: any = {
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    send(body: string) {
      res.body = body;
      return res;
    }
  };
  return res;
};

const opts = (flushToken?: string): ConstructiveOptions =>
  ({ api: { ...(flushToken && { flushToken }) } } as ConstructiveOptions);

describe('createFlushMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    graphileCache.set('tenant.example.com', { cached: true } as any);
    svcCache.set('tenant.example.com', { cached: true } as any);
    next = jest.fn();
  });

  afterEach(() => {
    graphileCache.delete(SERVICE_KEY);
    for (const key of ROTATED_CACHE_KEYS) graphileCache.delete(key);
    svcCache.delete(SERVICE_KEY);
  });

  it('passes non-flush requests through', async () => {
    const res = makeRes();
    await createFlushMiddleware(opts(TOKEN))(makeReq('/graphql'), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeUndefined();
  });

  it('flushes the caches for a request carrying the token', async () => {
    const res = makeRes();
    await createFlushMiddleware(opts(TOKEN))(
      makeReq('/flush', `Bearer ${TOKEN}`),
      res,
      next
    );
    expect(res.statusCode).toBe(200);
    expect(graphileCache.get(SERVICE_KEY)).toBeUndefined();
    expect(svcCache.get(SERVICE_KEY)).toBeUndefined();
  });

  it('flushes every physical generation for one logical service key', async () => {
    graphileCache.set(ROTATED_CACHE_KEYS[0], {
      cached: 'old-credentials',
      logicalServiceKey: SERVICE_KEY,
    } as any);
    graphileCache.set(ROTATED_CACHE_KEYS[1], {
      cached: 'new-credentials',
      logicalServiceKey: SERVICE_KEY,
    } as any);

    const res = makeRes();
    await createFlushMiddleware(opts(TOKEN))(
      makeReq('/flush', `Bearer ${TOKEN}`),
      res,
      next
    );

    expect(res.statusCode).toBe(200);
    expect(graphileCache.get(ROTATED_CACHE_KEYS[0])).toBeUndefined();
    expect(graphileCache.get(ROTATED_CACHE_KEYS[1])).toBeUndefined();
    expect(svcCache.get(SERVICE_KEY)).toBeUndefined();
  });

  it.each([
    ['no authorization header', undefined],
    ['a wrong token', 'Bearer nope'],
    ['a token of the same length', `Bearer ${'x'.repeat(TOKEN.length)}`],
    ['the token without the bearer scheme', TOKEN],
    ['a basic credential', `Basic ${TOKEN}`]
  ])('rejects a flush request with %s', async (_label, authorization) => {
    const res = makeRes();
    await createFlushMiddleware(opts(TOKEN))(
      makeReq('/flush', authorization),
      res,
      next
    );
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(graphileCache.get(SERVICE_KEY)).toBeDefined();
    expect(svcCache.get(SERVICE_KEY)).toBeDefined();
  });

  it('keeps the route closed when no token is configured', async () => {
    const res = makeRes();
    await createFlushMiddleware(opts())(
      makeReq('/flush', `Bearer ${TOKEN}`),
      res,
      next
    );
    expect(res.statusCode).toBe(404);
    expect(graphileCache.get(SERVICE_KEY)).toBeDefined();
    expect(svcCache.get(SERVICE_KEY)).toBeDefined();
  });
});
