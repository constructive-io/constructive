import { EventEmitter } from 'node:events';

import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';
import { acquirePgPool, getPgPool, getPgPoolIdentity } from 'pg-cache';

import { buildContext, createContextMiddleware } from '../src/context';
import type { ApiStructure } from '../src/types';

jest.mock('pg-cache', () => ({
  acquirePgPool: jest.fn(),
  getPgPool: jest.fn(),
  getPgPoolIdentity: jest.fn(() => 'pg:v1:test')
}));

const mockedAcquire = acquirePgPool as jest.MockedFunction<typeof acquirePgPool>;
const mockedGet = getPgPool as jest.MockedFunction<typeof getPgPool>;
const mockedIdentity = getPgPoolIdentity as jest.MockedFunction<typeof getPgPoolIdentity>;

const api: ApiStructure = {
  apiId: 'api-a',
  databaseId: 'database-a',
  dbname: 'tenant_a',
  anonRole: 'anonymous',
  roleName: 'authenticated',
  schema: ['tenant_a_public'],
  domains: [],
  isPublic: false
};

const makeRequest = (): Request => Object.assign(new EventEmitter(), {
  api,
  requestId: 'request-a',
  get: jest.fn((): undefined => undefined),
  aborted: false,
  destroyed: false,
  socket: { destroyed: false }
}) as unknown as Request;

const makePool = (): Pool => ({ query: jest.fn() } as unknown as Pool);

const makeResponse = (): Response => {
  const response = new EventEmitter() as EventEmitter & {
    destroyed: boolean;
    writableEnded: boolean;
  };
  response.destroyed = false;
  response.writableEnded = false;
  return response as unknown as Response;
};

const leaseFor = (pool: Pool) => ({
  pool,
  identity: `pool-${Math.random()}`,
  release: jest.fn()
});

describe('context PostgreSQL pool lifetimes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pins runtime and loader pools until the response finishes', () => {
    const leases = [leaseFor(makePool()), leaseFor(makePool()), leaseFor(makePool())];
    mockedAcquire
      .mockReturnValueOnce(leases[0])
      .mockReturnValueOnce(leases[1])
      .mockReturnValueOnce(leases[2]);
    const response = makeResponse();
    const next = jest.fn() as unknown as NextFunction;
    const middleware = createContextMiddleware({
      pg: { database: 'routing' },
      runtimePg: { user: 'runtime', password: 'secret' },
      loaders: { resolve: jest.fn() } as any
    });

    middleware(makeRequest(), response, next);

    expect(next).toHaveBeenCalledWith();
    expect(mockedAcquire).toHaveBeenCalledTimes(3);
    for (const lease of leases) expect(lease.release).not.toHaveBeenCalled();

    response.emit('finish');
    response.emit('close');
    for (const lease of leases) expect(lease.release).toHaveBeenCalledTimes(1);
  });

  it('uses the exact server-owned runtime resolution and exposes only its opaque identity', () => {
    const runtime = leaseFor(makePool());
    runtime.identity = 'pg:v1:exact-runtime';
    const otherLeases = [leaseFor(makePool()), leaseFor(makePool())];
    mockedAcquire
      .mockReturnValueOnce(runtime)
      .mockReturnValueOnce(otherLeases[0])
      .mockReturnValueOnce(otherLeases[1]);
    const request = makeRequest();
    const getRuntimePgResolution = jest.fn(() => ({
      pgConfig: {
        host: 'db.internal',
        port: 5432,
        database: 'tenant_a',
        user: 'tenant_a_runtime',
        password: 'runtime-secret'
      },
      poolIdentity: runtime.identity
    }));

    const context = buildContext(request, {
      pg: { database: 'routing' },
      getRuntimePgResolution,
      loaders: { resolve: jest.fn() } as any
    }, []);

    expect(getRuntimePgResolution).toHaveBeenCalledWith(request, api);
    expect(mockedAcquire.mock.calls[0][0]).toEqual({
      host: 'db.internal',
      port: 5432,
      database: 'tenant_a',
      user: 'tenant_a_runtime',
      password: 'runtime-secret'
    });
    expect(context?.runtimePoolIdentity).toBe('pg:v1:exact-runtime');
  });

  it('fails closed when the supplied runtime identity changes before acquisition', () => {
    const runtime = leaseFor(makePool());
    runtime.identity = 'pg:v1:different-runtime';
    mockedAcquire.mockReturnValueOnce(runtime);

    expect(() => buildContext(makeRequest(), {
      getRuntimePgResolution: () => ({
        pgConfig: {
          database: 'tenant_a',
          user: 'tenant_a_runtime',
          password: 'runtime-secret'
        },
        poolIdentity: 'pg:v1:expected-runtime'
      })
    }, [])).toThrow('pool identity changed before context acquisition');
  });

  it('does not acquire leases for a request that already ended', () => {
    const request = makeRequest();
    Object.assign(request, { aborted: true });
    const next = jest.fn() as unknown as NextFunction;
    const middleware = createContextMiddleware({
      pg: { database: 'routing' },
      loaders: { resolve: jest.fn() } as any
    });

    middleware(request, makeResponse(), next);

    expect(mockedAcquire).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('does not acquire leases after the request transport socket is destroyed', () => {
    const request = makeRequest();
    Object.assign(request.socket, { destroyed: true });
    const next = jest.fn() as unknown as NextFunction;
    const middleware = createContextMiddleware({
      pg: { database: 'routing' },
      loaders: { resolve: jest.fn() } as any
    });

    middleware(request, makeResponse(), next);

    expect(mockedAcquire).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('continues after a parser consumed and auto-destroyed the request stream', () => {
    const request = makeRequest();
    Object.assign(request, {
      destroyed: true,
      readableEnded: true,
      complete: true
    });
    const leases = [leaseFor(makePool()), leaseFor(makePool()), leaseFor(makePool())];
    mockedAcquire
      .mockReturnValueOnce(leases[0])
      .mockReturnValueOnce(leases[1])
      .mockReturnValueOnce(leases[2]);
    const response = makeResponse();
    const next = jest.fn() as unknown as NextFunction;
    const middleware = createContextMiddleware({
      pg: { database: 'routing' },
      runtimePg: { user: 'runtime', password: 'secret' },
      loaders: { resolve: jest.fn() } as any
    });

    middleware(request, response, next);

    expect(next).toHaveBeenCalledWith();
    expect(mockedAcquire).toHaveBeenCalledTimes(3);
    response.emit('finish');
    for (const lease of leases) expect(lease.release).toHaveBeenCalledTimes(1);
  });

  it('releases leases when the response ends during context construction', () => {
    const response = makeResponse();
    const leases = [leaseFor(makePool()), leaseFor(makePool()), leaseFor(makePool())];
    mockedAcquire
      .mockReturnValueOnce(leases[0])
      .mockImplementationOnce(() => {
        Object.assign(response, { destroyed: true });
        return leases[1];
      })
      .mockReturnValueOnce(leases[2]);
    const next = jest.fn() as unknown as NextFunction;
    const middleware = createContextMiddleware({
      pg: { database: 'routing' },
      runtimePg: { user: 'runtime', password: 'secret' },
      loaders: { resolve: jest.fn() } as any
    });

    middleware(makeRequest(), response, next);

    expect(mockedAcquire).toHaveBeenCalledTimes(3);
    for (const lease of leases) expect(lease.release).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('releases leases when the request aborts', () => {
    const request = makeRequest();
    const response = makeResponse();
    const leases = [leaseFor(makePool()), leaseFor(makePool()), leaseFor(makePool())];
    mockedAcquire
      .mockReturnValueOnce(leases[0])
      .mockReturnValueOnce(leases[1])
      .mockReturnValueOnce(leases[2]);
    const middleware = createContextMiddleware({
      pg: { database: 'routing' },
      runtimePg: { user: 'runtime', password: 'secret' },
      loaders: { resolve: jest.fn() } as any
    });

    middleware(request, response, jest.fn());
    request.emit('aborted');

    for (const lease of leases) expect(lease.release).toHaveBeenCalledTimes(1);
  });

  it('releases earlier leases when a later acquisition fails', () => {
    const first = leaseFor(makePool());
    const error = new Error('capacity');
    mockedAcquire.mockReturnValueOnce(first).mockImplementationOnce(() => {
      throw error;
    });
    const next = jest.fn() as unknown as NextFunction;
    const middleware = createContextMiddleware({
      pg: { database: 'routing' },
      loaders: { resolve: jest.fn() } as any
    });

    middleware(
      makeRequest(),
      new EventEmitter() as unknown as Response,
      next
    );

    expect(first.release).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('preserves unleased getPgPool behavior for direct buildContext callers', () => {
    mockedGet.mockReturnValue(makePool());

    const context = buildContext(makeRequest(), {
      pg: { database: 'routing' },
      loaders: { resolve: jest.fn() } as any
    });

    expect(context).not.toBeNull();
    expect(mockedGet).toHaveBeenCalledTimes(3);
    expect(mockedIdentity).toHaveBeenCalledTimes(3);
    expect(mockedAcquire).not.toHaveBeenCalled();
  });
});
