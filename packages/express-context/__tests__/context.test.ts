import type { Request } from 'express';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import { withPgClient as withPgClientFn } from 'pg-query-context';

import { buildContext } from '../src/context';
import type { ApiStructure } from '../src/types';

jest.mock('pg-cache', () => ({
  getPgPool: jest.fn()
}));

jest.mock('pg-query-context', () => ({
  withPgClient: jest.fn()
}));

const api: ApiStructure = {
  apiId: '00000000-0000-4000-8000-000000000002',
  databaseId: '00000000-0000-4000-8000-000000000001',
  dbname: 'tenant_db',
  anonRole: 'anonymous',
  roleName: 'authenticated',
  schema: ['app_public']
};

describe('buildContext withPgClient overrides', () => {
  it('merges trusted per-call settings over request settings', async () => {
    const tenantPool = { name: 'tenant' } as unknown as Pool;
    const routingPool = { name: 'routing' } as unknown as Pool;
    const getPoolMock = getPgPool as jest.MockedFunction<typeof getPgPool>;
    getPoolMock
      .mockReturnValueOnce(tenantPool)
      .mockReturnValueOnce(routingPool);

    const client = { query: jest.fn() };
    const withClientMock = withPgClientFn as jest.MockedFunction<
      typeof withPgClientFn
    >;
    withClientMock.mockImplementation(async (_pool, _settings, callback) =>
      callback(client as never)
    );

    const req = {
      api,
      requestId: 'request-id',
      clientIp: '127.0.0.1'
    } as unknown as Request;
    const registry = {
      resolve: jest.fn()
    };
    const ctx = buildContext(req, {
      loaders: registry as never,
      routingSchema: 'routing_public'
    });

    expect(ctx).not.toBeNull();
    const baseSettings = { ...ctx!.pgSettings };
    await ctx!.withPgClient(
      async (pgClient) => {
        expect(pgClient).toBe(client);
        return 'ok';
      },
      {
        role: 'oauth_runtime',
        'jwt.claims.origin': 'https://api.example.test'
      }
    );

    expect(withClientMock).toHaveBeenCalledWith(
      tenantPool,
      {
        ...baseSettings,
        role: 'oauth_runtime',
        'jwt.claims.origin': 'https://api.example.test'
      },
      expect.any(Function)
    );
    expect(ctx!.pgSettings).toEqual(baseSettings);
  });

  it('propagates callback errors without mutating request settings', async () => {
    const tenantPool = { name: 'tenant' } as unknown as Pool;
    const routingPool = { name: 'routing' } as unknown as Pool;
    const getPoolMock = getPgPool as jest.MockedFunction<typeof getPgPool>;
    getPoolMock
      .mockReturnValueOnce(tenantPool)
      .mockReturnValueOnce(routingPool);

    const expectedError = new Error('transaction failed');
    const withClientMock = withPgClientFn as jest.MockedFunction<
      typeof withPgClientFn
    >;
    withClientMock.mockRejectedValueOnce(expectedError);

    const req = {
      api,
      requestId: 'request-id',
      clientIp: '127.0.0.1'
    } as unknown as Request;
    const ctx = buildContext(req, {
      loaders: { resolve: jest.fn() } as never,
      routingSchema: 'routing_public'
    });

    expect(ctx).not.toBeNull();
    const baseSettings = { ...ctx!.pgSettings };
    await expect(
      ctx!.withPgClient(async () => 'unreachable', {
        'jwt.claims.origin': 'https://api.example.test'
      })
    ).rejects.toBe(expectedError);
    expect(ctx!.pgSettings).toEqual(baseSettings);
  });
});
