jest.mock('@pgpmjs/env', () => ({
  getNodeEnv: jest.fn(() => 'test')
}));

jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn()
  }))
}));

jest.mock('pg-cache', () => ({
  getPgPool: jest.fn()
}));

jest.mock('pg-query-context', () => ({
  __esModule: true,
  default: jest.fn()
}));

import type { NextFunction, Request, Response } from 'express';
import { getPgPool } from 'pg-cache';
import pgQueryContext from 'pg-query-context';

import { createAuthenticateMiddleware } from '../auth';
import { SESSION_COOKIE_NAME } from '../cookie';

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;
const mockPgQueryContext = pgQueryContext as jest.MockedFunction<
  typeof pgQueryContext
>;

const sessionToken = 'shared-session-token';
const authenticatedClaims = {
  role: 'authenticated',
  user_id: 'user-1',
  session_id: 'session-1'
};

function createRequest(origin: string): Request {
  const request = Object.create(null) as Request;
  Object.assign(request, {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`
    },
    clientIp: '127.0.0.1',
    api: {
      apiId: origin.includes('api1') ? 'api-1' : 'api-2',
      databaseId: 'database-a',
      dbname: 'tenant_a',
      anonRole: 'anonymous',
      roleName: 'authenticated',
      schema: [origin.includes('api1') ? 'api1_public' : 'api2_public'],
      domains: [],
      rlsModule: {
        authenticate: 'authenticate',
        authenticateStrict: 'authenticate_strict',
        privateSchema: {
          schemaName: 'auth_private'
        }
      }
    },
    get: jest.fn((name: string) => {
      if (name.toLowerCase() === 'origin') return origin;
      if (name.toLowerCase() === 'user-agent') return 'shared-session-test';
      return undefined;
    })
  });
  return request;
}

function createResponse(): Response {
  const response = Object.create(null) as Response;
  Object.assign(response, {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  });
  return response;
}

describe('tenant shared-session authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPgPool.mockReturnValue({} as never);
    mockPgQueryContext.mockResolvedValue({
      rowCount: 1,
      rows: [authenticatedClaims]
    } as never);
  });

  it('uses the same ordinary session credential for two APIs when strictAuth=false', async () => {
    const middleware = createAuthenticateMiddleware({
      pg: { database: 'tenant_a' },
      server: { strictAuth: false }
    });
    const api1Request = createRequest('https://api1.tenanta.test');
    const api2Request = createRequest('https://api2.tenanta.test');
    const next = jest.fn() as NextFunction;

    await middleware(api1Request, createResponse(), next);
    await middleware(api2Request, createResponse(), next);

    expect(mockPgQueryContext).toHaveBeenCalledTimes(2);
    for (const call of mockPgQueryContext.mock.calls) {
      expect(call[0].query).toContain('"auth_private"."authenticate"');
      expect(call[0].query).not.toContain('authenticate_strict');
      expect(call[0].variables).toEqual([sessionToken]);
    }
    expect(api1Request.token).toEqual(authenticatedClaims);
    expect(api2Request.token).toEqual(authenticatedClaims);
    expect(api1Request.api?.schema).toEqual(['api1_public']);
    expect(api2Request.api?.schema).toEqual(['api2_public']);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('does not downgrade strictAuth=true to ordinary authenticate', async () => {
    const middleware = createAuthenticateMiddleware({
      pg: { database: 'tenant_a' },
      server: { strictAuth: true }
    });

    await middleware(
      createRequest('https://api2.tenanta.test'),
      createResponse(),
      jest.fn()
    );

    expect(mockPgQueryContext).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'SELECT * FROM "auth_private"."authenticate_strict"($1)',
        variables: [sessionToken]
      })
    );
  });
});
