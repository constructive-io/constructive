import type { DatabaseStanding } from '@constructive-io/express-context';
import type { NextFunction, Request, Response } from 'express';

import { createStandingMiddleware } from '../standing';

interface Captured {
  status?: number;
  body?: any;
}

const fakeRes = (captured: Captured): Response =>
  ({
    set() {
      return this;
    },
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    }
  }) as unknown as Response;

const fakeReq = (useModule?: jest.Mock): Request =>
  ({ constructive: useModule ? { useModule } : undefined }) as unknown as Request;

const run = async (req: Request) => {
  const captured: Captured = {};
  const next = jest.fn() as unknown as NextFunction;
  await createStandingMiddleware()(req, fakeRes(captured), next);
  return { captured, next: next as unknown as jest.Mock };
};

const standing = (overrides: Partial<DatabaseStanding>): DatabaseStanding => ({
  exists: true,
  suspended: false,
  suspendedAt: null,
  reason: null,
  ...overrides
});

describe('createStandingMiddleware', () => {
  it('passes a database in good standing through', async () => {
    const useModule = jest.fn().mockResolvedValue(standing({}));
    const { next, captured } = await run(fakeReq(useModule));

    expect(useModule).toHaveBeenCalledWith('standing');
    expect(next).toHaveBeenCalledWith();
    expect(captured.status).toBeUndefined();
  });

  it('refuses a suspended database with ACCESS_SUSPENDED and its reason', async () => {
    const useModule = jest
      .fn()
      .mockResolvedValue(standing({ suspended: true, suspendedAt: new Date(), reason: 'billing' }));
    const { next, captured } = await run(fakeReq(useModule));

    expect(next).not.toHaveBeenCalled();
    expect(captured.status).toBe(403);
    expect(captured.body.errors[0].extensions.code).toBe('ACCESS_SUSPENDED');
    expect(captured.body.errors[0].extensions.context).toEqual({ reason: 'billing' });
  });

  it('refuses a database the plane does not know', async () => {
    const useModule = jest.fn().mockResolvedValue(standing({ exists: false }));
    const { next, captured } = await run(fakeReq(useModule));

    expect(next).not.toHaveBeenCalled();
    expect(captured.status).toBe(403);
    expect(captured.body.errors[0].extensions.code).toBe('ACCESS_SUSPENDED');
  });

  it('passes through when the plane has no standing module', async () => {
    const { next } = await run(fakeReq(jest.fn().mockResolvedValue(undefined)));
    expect(next).toHaveBeenCalledWith();
  });

  it('passes through a request that never resolved a database', async () => {
    const { next } = await run(fakeReq());
    expect(next).toHaveBeenCalledWith();
  });

  it('fails closed: a lookup failure goes to the error handler, not next()', async () => {
    const failure = new Error('control plane unreachable');
    const { next, captured } = await run(fakeReq(jest.fn().mockRejectedValue(failure)));

    expect(next).toHaveBeenCalledWith(failure);
    expect(captured.status).toBeUndefined();
  });
});
