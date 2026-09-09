jest.mock('graphile-cache', () => {
  const actual = jest.requireActual('graphile-cache');
  return {
    ...actual,
    createGraphileInstance: jest.fn(),
  };
});

import type { ApiStructure } from '@constructive-io/express-context';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import type { NextFunction, Request, Response } from 'express';
import {
  clearGraphileCache,
  closeAllCaches,
  createGraphileInstance,
  graphileCache,
  type GraphileCacheEntry,
} from 'graphile-cache';

import { clearInFlightMap, graphile } from '../graphile';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

interface TestLease {
  pool: object;
  identity: string;
  release: jest.Mock;
}

interface TestContext {
  pool: object;
  runtimePoolIdentity: string;
  retainRuntimePool: jest.Mock;
  useModule: jest.Mock;
}

const mockedCreate = createGraphileInstance as jest.MockedFunction<
  typeof createGraphileInstance
>;

const apiFor = (databaseId: string, apiId: string): ApiStructure =>
  ({
    apiId,
    databaseId,
    dbname: `database-${databaseId}`,
    anonRole: 'anonymous',
    roleName: 'authenticated',
    schema: ['tenant_public'],
    domains: [],
    isPublic: true,
  }) as ApiStructure;

const makeLease = (identity: string, pool: object): TestLease => ({
  pool,
  identity,
  release: jest.fn(),
});

const makeContext = (
  identity: string,
  pool: object,
  lease: TestLease,
  useModule: jest.Mock = jest.fn().mockResolvedValue(undefined)
): TestContext => ({
  pool,
  runtimePoolIdentity: identity,
  retainRuntimePool: jest.fn(() => lease),
  useModule,
});

const makeRequest = (
  serviceKey: string,
  api: ApiStructure,
  context?: TestContext
): Request =>
  ({
    api,
    svc_key: serviceKey,
    constructive: context,
    requestId: `${serviceKey}-request`,
  }) as unknown as Request;

const makeResponse = (): Response & {
  body?: unknown;
  statusCode?: number;
} => {
  const response: any = {
    headersSent: false,
    set: jest.fn(() => response),
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: unknown) {
      response.body = body;
      response.headersSent = true;
      return response;
    },
  };
  return response;
};

let entryOverrides: Partial<GraphileCacheEntry> = {};
let createdEntries: GraphileCacheEntry[] = [];

beforeEach(async () => {
  await clearGraphileCache();
  clearInFlightMap();
  entryOverrides = {};
  createdEntries = [];
  mockedCreate.mockReset();
  mockedCreate.mockImplementation(async (options) => {
    const entry = {
      pgl: { release: jest.fn().mockResolvedValue(undefined) },
      serv: {},
      handler: jest.fn(
        (_request: Request, _response: Response, _next: NextFunction): void => undefined
      ),
      httpServer: { listening: false },
      cacheKey: options.cacheKey,
      createdAt: Date.now(),
      releasePresetServices: jest.fn().mockResolvedValue(undefined),
      runtimePoolIdentity: options.runtimePoolIdentity,
      logicalServiceKey: options.logicalServiceKey,
      releaseRuntimePool: options.releaseRuntimePool,
      ...entryOverrides,
    } as unknown as GraphileCacheEntry;
    createdEntries.push(entry);
    return entry;
  });
});

afterEach(async () => {
  await clearGraphileCache();
  clearInFlightMap();
});

const middleware = (): ReturnType<typeof graphile> =>
  graphile({ server: { host: 'example.test' } } as ConstructiveOptions);

describe('Graphile runtime pool ownership', () => {
  it('uses one cache lease for a same-identity cache hit', async () => {
    const pool = {};
    const lease = makeLease('pool:a', pool);
    const context = makeContext('pool:a', pool, lease);
    const requestHandler = middleware();

    await requestHandler(
      makeRequest('tenant.example.com', apiFor('db-a', 'api-a'), context),
      makeResponse(),
      jest.fn() as unknown as NextFunction
    );
    await requestHandler(
      makeRequest('tenant.example.com', apiFor('db-a', 'api-a'), context),
      makeResponse(),
      jest.fn() as unknown as NextFunction
    );

    expect(context.retainRuntimePool).toHaveBeenCalledTimes(1);
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(graphileCache.size).toBe(1);
    expect(createdEntries[0]).toMatchObject({
      runtimePoolIdentity: 'pool:a',
      logicalServiceKey: 'tenant.example.com',
    });
  });

  it('keeps credential rotations as separate physical entries under one logical key', async () => {
    const poolA = {};
    const poolB = {};
    const leaseA = makeLease('pool:a', poolA);
    const leaseB = makeLease('pool:b', poolB);
    const contextA = makeContext('pool:a', poolA, leaseA);
    const contextB = makeContext('pool:b', poolB, leaseB);
    const requestHandler = middleware();
    const serviceKey = 'tenant.example.com';

    await requestHandler(
      makeRequest(serviceKey, apiFor('db-a', 'api-a'), contextA),
      makeResponse(),
      jest.fn() as unknown as NextFunction
    );
    await requestHandler(
      makeRequest(serviceKey, apiFor('db-a', 'api-a'), contextB),
      makeResponse(),
      jest.fn() as unknown as NextFunction
    );

    expect(mockedCreate).toHaveBeenCalledTimes(2);
    expect(graphileCache.has(JSON.stringify([serviceKey, 'pool:a']))).toBe(true);
    expect(graphileCache.has(JSON.stringify([serviceKey, 'pool:b']))).toBe(true);
    expect(createdEntries.map((entry) => entry.runtimePoolIdentity)).toEqual([
      'pool:a',
      'pool:b',
    ]);
    expect(createdEntries.every((entry) => entry.logicalServiceKey === serviceKey)).toBe(true);

    await clearGraphileCache();
    expect(leaseA.release).toHaveBeenCalledTimes(1);
    expect(leaseB.release).toHaveBeenCalledTimes(1);
  });

  it('coalesces requests while compute discovery is pending', async () => {
    const pool = {};
    const lease = makeLease('pool:a', pool);
    const compute = deferred<undefined>();
    const useModule = jest.fn(() => compute.promise);
    const context = makeContext('pool:a', pool, lease, useModule);
    const requestHandler = middleware();
    const firstResponse = makeResponse();
    const secondResponse = makeResponse();

    const first = requestHandler(
      makeRequest('tenant.example.com', apiFor('db-a', 'api-a'), context),
      firstResponse,
      jest.fn() as unknown as NextFunction
    );
    const second = requestHandler(
      makeRequest('tenant.example.com', apiFor('db-a', 'api-a'), context),
      secondResponse,
      jest.fn() as unknown as NextFunction
    );

    expect(useModule).toHaveBeenCalledTimes(1);
    expect(mockedCreate).not.toHaveBeenCalled();

    compute.resolve(undefined);
    await Promise.all([first, second]);

    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(createdEntries[0].handler).toHaveBeenCalledTimes(2);
    expect(context.retainRuntimePool).toHaveBeenCalledTimes(1);
  });

  it('releases a retained lease when discovery fails and retries on the next request', async () => {
    const pool = {};
    const firstLease = makeLease('pool:a', pool);
    const secondLease = makeLease('pool:a', pool);
    const failure = new Error('compute lookup failed');
    const useModule = jest
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValue(undefined);
    const context = makeContext('pool:a', pool, firstLease, useModule);
    context.retainRuntimePool
      .mockReturnValueOnce(firstLease)
      .mockReturnValueOnce(secondLease);
    const requestHandler = middleware();
    const failedResponse = makeResponse();

    await requestHandler(
      makeRequest('tenant.example.com', apiFor('db-a', 'api-a'), context),
      failedResponse,
      jest.fn() as unknown as NextFunction
    );

    expect(firstLease.release).toHaveBeenCalledTimes(1);
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(failedResponse.statusCode).toBe(200);

    await requestHandler(
      makeRequest('tenant.example.com', apiFor('db-a', 'api-a'), context),
      makeResponse(),
      jest.fn() as unknown as NextFunction
    );

    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(graphileCache.size).toBe(1);
    await clearGraphileCache();
    expect(secondLease.release).toHaveBeenCalledTimes(1);
  });

  it('does not publish a build that finishes while closeAllCaches is draining it', async () => {
    const pool = {};
    const lease = makeLease('pool:a', pool);
    const compute = deferred<undefined>();
    const context = makeContext('pool:a', pool, lease, jest.fn(() => compute.promise));
    const request = middleware()(
      makeRequest('tenant.example.com', apiFor('db-a', 'api-a'), context),
      makeResponse(),
      jest.fn() as unknown as NextFunction
    );
    const closing = closeAllCaches();

    expect(graphileCache.size).toBe(0);
    compute.resolve(undefined);
    await Promise.all([request, closing]);

    expect(graphileCache.size).toBe(0);
    expect(lease.release).toHaveBeenCalledTimes(1);
    expect(createdEntries[0].pgl.release).toHaveBeenCalledTimes(1);
  });

  it('fails closed when runtime pool lease capability is missing or changes identity', async () => {
    const missingCapabilityResponse = makeResponse();
    await middleware()(
      makeRequest('tenant.example.com', apiFor('db-a', 'api-a')),
      missingCapabilityResponse,
      jest.fn() as unknown as NextFunction
    );

    const pool = {};
    const lease = makeLease('pool:b', pool);
    const changedContext = makeContext('pool:a', pool, lease);
    const changedResponse = makeResponse();
    await middleware()(
      makeRequest('tenant.example.com', apiFor('db-a', 'api-a'), changedContext),
      changedResponse,
      jest.fn() as unknown as NextFunction
    );

    expect(missingCapabilityResponse.statusCode).toBe(200);
    expect(changedResponse.statusCode).toBe(200);
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(lease.release).toHaveBeenCalledTimes(1);
  });

  it('rejects and disposes an unpublished entry with mismatched runtime ownership metadata', async () => {
    const pool = {};
    const lease = makeLease('pool:a', pool);
    const context = makeContext('pool:a', pool, lease);
    entryOverrides = { runtimePoolIdentity: 'pool:stale' };
    const response = makeResponse();

    await middleware()(
      makeRequest('tenant.example.com', apiFor('db-a', 'api-a'), context),
      response,
      jest.fn() as unknown as NextFunction
    );

    expect(response.statusCode).toBe(200);
    expect(createdEntries[0].handler).not.toHaveBeenCalled();
    expect(graphileCache.size).toBe(0);
    expect(lease.release).toHaveBeenCalledTimes(1);
    await clearGraphileCache();
    expect(lease.release).toHaveBeenCalledTimes(1);
  });
});
