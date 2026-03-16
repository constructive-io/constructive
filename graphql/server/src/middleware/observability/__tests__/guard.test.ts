import type { NextFunction, Request, Response } from 'express';
import { localObservabilityOnly } from '../guard';

function makeReq(input: { remoteAddress?: string | null; host?: string } = {}): Request {
  return {
    socket: {
      remoteAddress: input.remoteAddress ?? '::1',
    },
    headers: input.host ? { host: input.host } : {},
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function makeNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}

describe('localObservabilityOnly', () => {
  it('allows loopback requests', () => {
    const req = makeReq({ remoteAddress: '::ffff:127.0.0.1', host: 'localhost:3000' });
    const res = makeRes();
    const next = makeNext();

    localObservabilityOnly(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 404 for non-local requests', () => {
    const req = makeReq({ remoteAddress: '10.0.0.5', host: 'localhost:3000' });
    const res = makeRes();
    const next = makeNext();

    localObservabilityOnly(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('Not found');
  });
});
