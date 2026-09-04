import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { svcCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { graphileCache } from 'graphile-cache';

import { createFlushMiddleware } from '../flush';

const TOKEN = 'flush-secret-token';

const makeReq = (url: string, authorization?: string): Request => {
  const req: any = {
    url,
    svc_key: 'tenant.example.com',
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
    graphileCache.delete('tenant.example.com');
    svcCache.delete('tenant.example.com');
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
    expect(graphileCache.get('tenant.example.com')).toBeUndefined();
    expect(svcCache.get('tenant.example.com')).toBeUndefined();
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
    expect(graphileCache.get('tenant.example.com')).toBeDefined();
    expect(svcCache.get('tenant.example.com')).toBeDefined();
  });

  it('keeps the route closed when no token is configured', async () => {
    const res = makeRes();
    await createFlushMiddleware(opts())(
      makeReq('/flush', `Bearer ${TOKEN}`),
      res,
      next
    );
    expect(res.statusCode).toBe(404);
    expect(graphileCache.get('tenant.example.com')).toBeDefined();
    expect(svcCache.get('tenant.example.com')).toBeDefined();
  });
});
