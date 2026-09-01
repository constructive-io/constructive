import type { RequestProtection } from '@constructive-io/express-context';
import { DEFAULT_REQUEST_PROTECTION } from '@constructive-io/express-context';
import type { NextFunction, Request, Response } from 'express';

import { createRequestProtectionMiddleware } from '../request-protection';

interface Captured {
  status?: number;
  body?: any;
}

const fakeRes = (captured: Captured): Response =>
  ({
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    }
  }) as unknown as Response;

const fakeReq = (
  headers: Record<string, string>,
  useModule?: jest.Mock
): Request =>
  ({
    get: (name: string) => headers[name.toLowerCase()],
    constructive: useModule ? { useModule } : undefined
  }) as unknown as Request;

const run = async (req: Request) => {
  const captured: Captured = {};
  const next = jest.fn() as unknown as NextFunction;
  await createRequestProtectionMiddleware()(req, fakeRes(captured), next);
  return { captured, next: next as unknown as jest.Mock };
};

const protection = (overrides: Partial<RequestProtection>): RequestProtection => ({
  ...DEFAULT_REQUEST_PROTECTION,
  ...overrides
});

describe('createRequestProtectionMiddleware', () => {
  it('attaches the tenant-resolved bounds to the request', async () => {
    const resolved = protection({ statementTimeoutMs: 3_000 });
    const req = fakeReq({}, jest.fn().mockResolvedValue(resolved));

    const { next } = await run(req);

    expect(next).toHaveBeenCalled();
    expect(req.requestProtection).toBe(resolved);
  });

  it('falls back to the platform defaults when the database has no settings row', async () => {
    const req = fakeReq({}, jest.fn().mockResolvedValue(undefined));

    await run(req);

    expect(req.requestProtection).toEqual(DEFAULT_REQUEST_PROTECTION);
  });

  it('fails the request when the bounds cannot be looked up', async () => {
    // Serving on defaults would hide a broken routing plane behind numbers
    // nobody chose, so the failure is surfaced instead.
    const failure = new Error('routing pool down');
    const req = fakeReq({}, jest.fn().mockRejectedValue(failure));

    const { next } = await run(req);

    expect(next).toHaveBeenCalledWith(failure);
    expect(req.requestProtection).toBeUndefined();
  });

  it('still bounds a request that arrived without a resolved context', async () => {
    const req = fakeReq({});

    await run(req);

    expect(req.requestProtection).toEqual(DEFAULT_REQUEST_PROTECTION);
  });

  it('rejects a body larger than the tenant allows', async () => {
    const req = fakeReq(
      { 'content-length': '5000', 'content-type': 'application/json' },
      jest.fn().mockResolvedValue(protection({ maxRequestBytes: 2_000 }))
    );

    const { captured, next } = await run(req);

    expect(next).not.toHaveBeenCalled();
    expect(captured.status).toBe(200);
    expect(captured.body.errors[0].extensions).toMatchObject({
      code: 'REQUEST_TOO_LARGE',
      context: { bytes: 5000, limit: 2000 }
    });
  });

  it('accepts a body at the limit', async () => {
    const req = fakeReq(
      { 'content-length': '2000', 'content-type': 'application/json' },
      jest.fn().mockResolvedValue(protection({ maxRequestBytes: 2_000 }))
    );

    const { next } = await run(req);

    expect(next).toHaveBeenCalled();
  });

  it('exempts multipart uploads, whose bodies are files bounded by the upload limits', async () => {
    const req = fakeReq(
      {
        'content-length': '50000000',
        'content-type': 'multipart/form-data; boundary=----x'
      },
      jest.fn().mockResolvedValue(protection({ maxRequestBytes: 2_000 }))
    );

    const { next } = await run(req);

    expect(next).toHaveBeenCalled();
  });

  it('does not reject a request that declared no length', async () => {
    const req = fakeReq({}, jest.fn().mockResolvedValue(protection({ maxRequestBytes: 2_000 })));

    const { next } = await run(req);

    expect(next).toHaveBeenCalled();
  });
});
