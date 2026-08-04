jest.mock('../graphile', () => ({
  invalidateInFlightBuilds: jest.fn()
}));

import type { LoaderRegistry } from '@constructive-io/express-context';
import type { NextFunction, Request, Response } from 'express';

import { createFlushMiddleware, flush } from '../flush';

const response = (): Response => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn()
} as unknown as Response);

describe('HTTP cache flush authorization', () => {
  it('rejects an unauthenticated cache flush', async () => {
    const req = { url: '/flush', internalTrusted: false } as Request;
    const res = response();
    const next = jest.fn() as NextFunction;

    await flush(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Forbidden');
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a request already authenticated at the internal ingress boundary', async () => {
    const req = {
      url: '/flush',
      internalTrusted: true,
      svc_key: 'api.example.test'
    } as Request;
    const res = response();
    const next = jest.fn() as NextFunction;

    await flush(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
    expect(next).not.toHaveBeenCalled();
  });

  it('invalidates module metadata before acknowledging an authenticated flush', async () => {
    const invalidate = jest.fn();
    const registry = { invalidate } as unknown as LoaderRegistry;
    const req = {
      url: '/flush',
      internalTrusted: true,
      svc_key: 'api.example.test',
      databaseId: 'database-123'
    } as Request;
    const res = response();
    const next = jest.fn() as NextFunction;

    await createFlushMiddleware(registry)(req, res, next);

    expect(invalidate).toHaveBeenCalledWith('database-123');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
