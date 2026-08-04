import type { NextFunction, Request, Response } from 'express';

import { localObservabilityOnly } from '../guard';

function makeReq(input: {
  remoteAddress?: string | null;
  host?: string;
  authorization?: string;
} = {}): Request {
  return {
    socket: {
      remoteAddress: input.remoteAddress ?? '::1',
    },
    headers: {
      ...(input.host ? { host: input.host } : {}),
      ...(input.authorization ? { authorization: input.authorization } : {})
    },
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
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    delete process.env.GRAPHQL_OBSERVABILITY_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

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

  it('requires the configured bearer token for production loopback requests', () => {
    process.env.NODE_ENV = 'production';
    process.env.GRAPHQL_OBSERVABILITY_TOKEN = 'c'.repeat(64);
    const missing = makeReq({ remoteAddress: '127.0.0.1' });
    const wrong = makeReq({
      remoteAddress: '127.0.0.1',
      authorization: `Bearer ${'d'.repeat(64)}`
    });
    const valid = makeReq({
      remoteAddress: '127.0.0.1',
      authorization: `Bearer ${'c'.repeat(64)}`
    });
    const missingRes = makeRes();
    const wrongRes = makeRes();
    const validRes = makeRes();
    const missingNext = makeNext();
    const wrongNext = makeNext();
    const validNext = makeNext();

    localObservabilityOnly(missing, missingRes, missingNext);
    localObservabilityOnly(wrong, wrongRes, wrongNext);
    localObservabilityOnly(valid, validRes, validNext);

    expect(missingNext).not.toHaveBeenCalled();
    expect(wrongNext).not.toHaveBeenCalled();
    expect(missingRes.status).toHaveBeenCalledWith(404);
    expect(wrongRes.status).toHaveBeenCalledWith(404);
    expect(validNext).toHaveBeenCalledTimes(1);
    expect(validRes.status).not.toHaveBeenCalled();
  });
});
