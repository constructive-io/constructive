import type { NextFunction, Request, Response } from 'express';

const mockPool = { query: jest.fn() };
const mockPgQueryContext = jest.fn();

jest.mock('pg-cache', () => ({
  getPgPool: () => mockPool
}));
jest.mock('pg-query-context', () => ({
  __esModule: true,
  default: (...args: any[]) => mockPgQueryContext(...args)
}));

import { createAuthenticateMiddleware } from '../auth';

const createRequest = (headers: Record<string, string> = {}): Request => {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    api: { dbname: 'testdb' },
    headers: lower,
    clientIp: '127.0.0.1',
    get: (name: string) => lower[name.toLowerCase()]
  } as unknown as Request;
};

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res as Response;
};

describe('auth middleware without rlsModule', () => {
  const middleware = createAuthenticateMiddleware({} as any);

  beforeEach(() => {
    mockPool.query.mockReset();
    mockPgQueryContext.mockReset();
  });

  it('populates req.token (including principal_id) from a bearer token', async () => {
    mockPool.query.mockResolvedValue({ rowCount: 1, rows: [{ '?column?': 1 }] });
    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 'tok-1', user_id: 'user-1', principal_id: 'principal-1' }]
    });

    const req = createRequest({ authorization: 'Bearer abc123' });
    const next = jest.fn() as NextFunction;

    await middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.token).toEqual({
      id: 'tok-1',
      user_id: 'user-1',
      principal_id: 'principal-1'
    });
    expect(mockPgQueryContext).toHaveBeenCalledWith(
      expect.objectContaining({ variables: ['abc123'] })
    );
  });

  it('authenticates via the session cookie when no bearer token is present', async () => {
    mockPool.query.mockResolvedValue({ rowCount: 1, rows: [{ '?column?': 1 }] });
    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [{ user_id: 'user-2' }]
    });

    const req = createRequest({ cookie: 'constructive_session=cookie-token' });
    const next = jest.fn() as NextFunction;

    await middleware(req, createResponse(), next);

    expect(mockPgQueryContext).toHaveBeenCalledWith(
      expect.objectContaining({ variables: ['cookie-token'] })
    );
    expect(req.token).toEqual({ user_id: 'user-2' });
  });

  it('proceeds anonymously when no credential is present', async () => {
    const req = createRequest();
    const next = jest.fn() as NextFunction;

    await middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.token).toBeUndefined();
    expect(mockPgQueryContext).not.toHaveBeenCalled();
  });

  it('proceeds anonymously when the platform auth function does not exist', async () => {
    mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });

    const req = createRequest({ authorization: 'Bearer abc123' });
    const next = jest.fn() as NextFunction;

    await middleware(req, createResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.token).toBeUndefined();
    expect(mockPgQueryContext).not.toHaveBeenCalled();
  });

  it('never fails the request when platform auth throws', async () => {
    mockPool.query.mockRejectedValue(new Error('boom'));

    const req = createRequest({ authorization: 'Bearer abc123' });
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.token).toBeUndefined();
  });

  it('reads the device token cookie', async () => {
    const req = createRequest({
      cookie: 'constructive_device_token=device-1'
    });
    const next = jest.fn() as NextFunction;

    await middleware(req, createResponse(), next);

    expect(req.deviceToken).toBe('device-1');
  });
});
