import type { NextFunction, Request, Response } from 'express';

import { errorHandler } from '../error-handler';

describe('shared error handler pool-capacity response', () => {
  it('returns a stable retryable 503 without exposing capacity details', () => {
    const req = {
      requestId: 'request-1',
      path: '/graphql',
      method: 'POST',
      get: jest.fn((name: string) => {
        if (name === 'Accept') return 'text/html';
        if (name === 'host') return 'api.example.com';
        return undefined;
      })
    } as unknown as Request;
    const res = {
      headersSent: false,
      set: jest.fn(),
      status: jest.fn(),
      json: jest.fn(),
      send: jest.fn()
    };
    res.status.mockReturnValue(res);
    const error = Object.assign(
      new Error('PostgreSQL pool capacity exhausted: 2050/2064 and 2050 leased'),
      { code: 'PG_POOL_CAPACITY' }
    );

    errorHandler(error, req, res as unknown as Response, jest.fn() as NextFunction);

    expect(res.set).toHaveBeenCalledWith('Retry-After', '15');
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'PG_POOL_CAPACITY',
        message: 'Service temporarily unavailable',
        requestId: 'request-1'
      }
    });
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('2050');
  });
});
