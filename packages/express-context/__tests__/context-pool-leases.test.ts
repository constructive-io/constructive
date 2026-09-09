import { EventEmitter } from 'node:events';

import type { Request, Response } from 'express';
import type { Pool } from 'pg';
import {
  acquirePgPool,
  getPgDatabaseTargetIdentity,
  getPgPool,
  getPgPoolIdentity,
} from 'pg-cache';

import { buildContext, createContextMiddleware } from '../src/context';
import type { ApiStructure } from '../src/types';

jest.mock('pg-cache', () => ({
  acquirePgPool: jest.fn(),
  getPgDatabaseTargetIdentity: jest.fn(() => 'pg-target:test'),
  getPgPool: jest.fn(),
  getPgPoolIdentity: jest.fn(() => 'pg:v1:test'),
}));

const mockedAcquire = acquirePgPool as jest.MockedFunction<
  typeof acquirePgPool
>;
const mockedGet = getPgPool as jest.MockedFunction<typeof getPgPool>;
const mockedTarget = getPgDatabaseTargetIdentity as jest.MockedFunction<
  typeof getPgDatabaseTargetIdentity
>;
const mockedIdentity = getPgPoolIdentity as jest.MockedFunction<
  typeof getPgPoolIdentity
>;

const api: ApiStructure = {
  apiId: 'api-a',
  databaseId: 'database-a',
  dbname: 'tenant_a',
  anonRole: 'anonymous',
  roleName: 'authenticated',
  schema: ['tenant_a_public'],
  domains: [],
  isPublic: false,
};

const runtimeRoute = {
  databaseId: 'database-a',
  databaseName: 'tenant_a',
  apiId: 'api-a',
  schemas: ['tenant_a_public'],
  roles: ['anonymous', 'authenticated'] as [string, string],
};

const makeRequest = (): Request =>
  Object.assign(new EventEmitter(), {
    api,
    requestId: 'request-a',
    get: jest.fn((): undefined => undefined),
    aborted: false,
    socket: { destroyed: false },
  }) as unknown as Request;

const makePool = (): Pool => ({ query: jest.fn() }) as unknown as Pool;

const makeResponse = (): Response => {
  const response = new EventEmitter() as EventEmitter & {
    destroyed: boolean;
    writableEnded: boolean;
  };
  response.destroyed = false;
  response.writableEnded = false;
  return response as unknown as Response;
};

let leaseSequence = 0;
const leaseFor = (pool: Pool, identity = 'pg:v1:test') => ({
  pool,
  identity: identity || `pg:v1:lease-${++leaseSequence}`,
  release: jest.fn(),
});

describe('context PostgreSQL identities and lifetimes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTarget.mockReturnValue('pg-target:test');
    mockedIdentity.mockReturnValue('pg:v1:test');
  });

  it('preserves the unconfigured single-login path for direct callers', () => {
    const pool = makePool();
    mockedGet.mockReturnValue(pool);

    const context = buildContext(makeRequest(), { pg: { user: 'control' } });

    expect(context?.pool).toBe(pool);
    expect(mockedGet).toHaveBeenCalledWith(
      { user: 'control', database: 'tenant_a' },
      { purpose: 'runtime' }
    );
    expect(mockedAcquire).not.toHaveBeenCalled();
  });

  it('pins runtime and control pools until response completion', () => {
    const leases = [
      leaseFor(makePool()),
      leaseFor(makePool()),
      leaseFor(makePool()),
    ];
    mockedAcquire
      .mockReturnValueOnce(leases[0])
      .mockReturnValueOnce(leases[1])
      .mockReturnValueOnce(leases[2]);
    const response = makeResponse();
    const next = jest.fn();

    createContextMiddleware({
      pg: { database: 'routing' },
      loaders: { resolve: jest.fn() } as any,
    })(makeRequest(), response, next);

    expect(next).toHaveBeenCalledWith();
    expect(mockedAcquire).toHaveBeenCalledTimes(3);
    response.emit('finish');
    response.emit('close');
    for (const lease of leases) expect(lease.release).toHaveBeenCalledTimes(1);
  });

  it('binds a static runtime login to one exact route', () => {
    const runtime = leaseFor(makePool());
    runtime.identity = 'pg:v1:test';
    mockedAcquire.mockReturnValue(runtime);
    const next = jest.fn();

    createContextMiddleware({
      pg: { host: 'control.internal' },
      runtimePg: {
        database: 'tenant_a',
        user: 'runtime',
        password: 'runtime-secret',
      },
      runtimePgStaticIdentity: runtimeRoute,
    })(makeRequest(), makeResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(mockedAcquire).toHaveBeenCalledWith(
      {
        host: 'control.internal',
        database: 'tenant_a',
        user: 'runtime',
        password: 'runtime-secret',
      },
      { purpose: 'runtime' }
    );
  });

  it('rejects a static login when the route identity differs', () => {
    const next = jest.fn();

    createContextMiddleware({
      runtimePg: {
        database: 'tenant_a',
        user: 'runtime',
        password: 'secret',
      },
      runtimePgStaticIdentity: { ...runtimeRoute, apiId: 'api-b' },
    })(makeRequest(), makeResponse(), next);

    expect(next.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('identity does not match'),
      })
    );
    expect(mockedAcquire).not.toHaveBeenCalled();
  });

  it('rejects a runtime config whose physical target differs from control', () => {
    mockedTarget
      .mockReturnValueOnce('pg-target:control')
      .mockReturnValueOnce('pg-target:runtime');
    const next = jest.fn();

    createContextMiddleware({
      pg: { host: 'control.internal' },
      runtimePg: {
        host: 'runtime.internal',
        database: 'tenant_a',
        user: 'runtime',
        password: 'runtime-secret',
      },
      runtimePgStaticIdentity: runtimeRoute,
    })(makeRequest(), makeResponse(), next);

    expect(next.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('target does not match'),
      })
    );
    expect(next.mock.calls[0][0].message).not.toContain('runtime-secret');
    expect(mockedAcquire).not.toHaveBeenCalled();
  });

  it('retains runtime only while identity and request lifetime remain valid', () => {
    const initial = leaseFor(makePool());
    const retained = leaseFor(makePool());
    mockedAcquire
      .mockReturnValueOnce(initial)
      .mockReturnValueOnce(retained);
    const request = makeRequest();
    const response = makeResponse();
    const next = jest.fn();

    createContextMiddleware({
      runtimePg: {
        database: 'tenant_a',
        user: 'runtime',
        password: 'runtime-secret',
      },
      runtimePgStaticIdentity: runtimeRoute,
    })(request, response, next);

    expect(request.constructive?.retainRuntimePool?.()).toBe(retained);
    expect(mockedAcquire).toHaveBeenCalledWith(
      {
        database: 'tenant_a',
        user: 'runtime',
        password: 'runtime-secret',
      },
      { purpose: 'runtime' }
    );
    retained.release();
    response.emit('finish');
  });

  it('releases a retained lease when its identity changes after acquisition', () => {
    const initial = leaseFor(makePool());
    const mismatch = leaseFor(makePool(), 'pg:v1:changed');
    mockedAcquire
      .mockReturnValueOnce(initial)
      .mockReturnValueOnce(mismatch);
    const request = makeRequest();
    const response = makeResponse();
    const next = jest.fn();

    createContextMiddleware({
      runtimePg: {
        database: 'tenant_a',
        user: 'runtime',
        password: 'runtime-secret',
      },
      runtimePgStaticIdentity: runtimeRoute,
    })(request, response, next);

    expect(() => request.constructive?.retainRuntimePool?.()).toThrow(
      'changed after retention'
    );
    expect(mismatch.release).toHaveBeenCalledTimes(1);
    response.emit('finish');
  });

  it('rejects runtime retention after the request has ended', () => {
    const initial = leaseFor(makePool());
    mockedAcquire.mockReturnValue(initial);
    const request = makeRequest();
    const response = makeResponse();
    const next = jest.fn();

    createContextMiddleware({
      runtimePg: {
        database: 'tenant_a',
        user: 'runtime',
        password: 'runtime-secret',
      },
      runtimePgStaticIdentity: runtimeRoute,
    })(request, response, next);
    (response as any).writableEnded = true;

    expect(() => request.constructive?.retainRuntimePool?.()).toThrow(
      'after request ended'
    );
    response.emit('finish');
  });

  it('passes frozen credential-free facts to the runtime resolver', () => {
    const lease = leaseFor(makePool());
    lease.identity = 'pg:v1:test';
    mockedAcquire.mockReturnValue(lease);
    const resolver = jest.fn((input) => {
      expect(Object.isFrozen(input)).toBe(true);
      expect(Object.isFrozen(input.schemas)).toBe(true);
      expect(Object.isFrozen(input.roles)).toBe(true);
      expect(input).not.toHaveProperty('password');
      return {
        host: 'runtime.internal',
        database: input.databaseName,
        user: 'runtime',
        password: 'resolver-secret',
      };
    });
    const request = makeRequest();
    const next = jest.fn();

    createContextMiddleware({ runtimePgResolver: resolver })(
      request,
      makeResponse(),
      next
    );

    expect(resolver).toHaveBeenCalledWith(runtimeRoute);
    expect(next).toHaveBeenCalledWith();
    expect(request.constructive?.runtimePoolIdentity).toBe('pg:v1:test');
  });

  it('does not fall back when the runtime resolver rejects', async () => {
    const failure = new Error('resolver unavailable');
    const next = jest.fn();

    createContextMiddleware({
      runtimePgResolver: async () => {
        throw failure;
      },
    })(makeRequest(), makeResponse(), next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(failure);
    expect(mockedAcquire).not.toHaveBeenCalled();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it.each([
    [
      { database: 'tenant_b', user: 'runtime', password: 'secret' },
      'does not match',
    ],
    [{ database: 'tenant_a', user: 'runtime' }, 'explicit password'],
  ])('fails closed for an invalid resolved login', (resolved, message) => {
    const next = jest.fn();

    createContextMiddleware({ runtimePgResolver: () => resolved })(
      makeRequest(),
      makeResponse(),
      next
    );

    expect(next.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining(message),
      })
    );
    expect(mockedAcquire).not.toHaveBeenCalled();
  });

  it('releases earlier leases when a later control acquisition fails', () => {
    const first = leaseFor(makePool());
    const failure = new Error('capacity');
    mockedAcquire.mockReturnValueOnce(first).mockImplementationOnce(() => {
      throw failure;
    });
    const next = jest.fn();

    createContextMiddleware({
      pg: { database: 'routing' },
      loaders: { resolve: jest.fn() } as any,
    })(makeRequest(), makeResponse(), next);

    expect(first.release).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(failure);
  });
});
