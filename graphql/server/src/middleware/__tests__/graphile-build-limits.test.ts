const mockCacheGet = jest.fn();
const mockCacheGraphileInstance = jest.fn();
const mockCreateGraphileInstance = jest.fn();
const mockMakeIntrospectionWiring = jest.fn();

jest.mock('graphile-cache', () => ({
  cacheGraphileInstance: mockCacheGraphileInstance,
  createGraphileInstance: mockCreateGraphileInstance,
  disposeUncachedEntry: jest.requireActual('graphile-cache').disposeUncachedEntry,
  graphileCache: {
    get: mockCacheGet,
    delete: jest.fn(),
    clear: jest.fn()
  }
}));

jest.mock('@pgpmjs/server-utils', () => ({
  svcCache: { delete: jest.fn(), clear: jest.fn() }
}));

jest.mock('graphile-settings', () => ({
  createConstructivePreset: jest.fn(() => ({})),
  createGrafastCacheLimitsPreset: jest.fn(() => ({}))
}));

jest.mock('../graphile-introspection', () => ({
  makeIntrospectionWiring: mockMakeIntrospectionWiring
}));

const mockGetApiConfig = jest.fn();
jest.mock('../api', () => ({
  getApiConfig: mockGetApiConfig,
  isApiError: (result: { errorHtml?: unknown } | null | undefined) =>
    !!result && typeof result.errorHtml === 'string'
}));

import type { GraphileBuildLimits } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import type { Request, Response } from 'express';

import { clearGenerations, evictServiceKey } from '../cache-generation';
import { clearInFlightMap, getBuildSlotStats, getInFlightCount, graphile } from '../graphile';

const api = () => ({
  tenantPool: {},
  anonRole: 'anonymous',
  roleName: 'authenticated',
  schema: ['app_public'],
  databaseId: 'database-id'
});

const makeRequest = (key: string): Request =>
  ({
    requestId: `request-${key}`,
    svc_key: key,
    api: api(),
    get: jest.fn((): undefined => undefined)
  }) as unknown as Request;

interface Captured {
  status?: number;
  headers: Record<string, string>;
  body?: { errors: Array<{ message: string; extensions: Record<string, unknown> }> };
}

/** A response that records what was sent. */
class FakeResponse {
  headersSent = false;
  captured: Captured = { headers: {} };

  status(code: number): this {
    this.captured.status = code;
    return this;
  }

  set(headers: Record<string, string>): this {
    Object.assign(this.captured.headers, headers);
    return this;
  }

  json(body: Captured['body']): this {
    this.captured.body = body;
    return this;
  }
}

const makeResponse = (): { res: Response; captured: Captured } => {
  const fake = new FakeResponse();
  return { res: fake as unknown as Response, captured: fake.captured };
};

/** A handler build that finishes only when the test says so. */
interface GatedBuild {
  key: string;
  handler: jest.Mock;
  finish: () => void;
  fail: (error: unknown) => void;
}

/** Every handler build waits on its own gate, recorded in start order. */
const gateBuilds = (): GatedBuild[] => {
  const started: GatedBuild[] = [];
  mockCreateGraphileInstance.mockImplementation(({ cacheKey }: { cacheKey: string }) => {
    const handler = jest.fn();
    return new Promise((resolve, reject) => {
      started.push({
        key: cacheKey,
        handler,
        finish: () => resolve({ handler }),
        fail: reject
      });
    });
  });
  return started;
};

/** Let every promise continuation that is ready run. */
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

const middlewareWith = (buildLimits?: GraphileBuildLimits) =>
  graphile({ graphile: buildLimits ? { buildLimits } : {} } as any);

const expectRefused = (captured: Captured, retryAfter: string) => {
  expect(captured.status).toBe(503);
  expect(captured.headers['Retry-After']).toBe(retryAfter);
  expect(captured.body?.errors).toHaveLength(1);
  expect(captured.body?.errors[0].message).toBe(
    "This API's schema cannot be prepared right now. Please retry in a moment."
  );
  expect(captured.body?.errors[0].extensions).toEqual(
    expect.objectContaining({ code: 'SCHEMA_BUILD_UNAVAILABLE' })
  );
};

describe('graphile handler build limits', () => {
  let logSpies: jest.SpyInstance[];

  beforeEach(() => {
    clearInFlightMap();
    clearGenerations();
    mockCacheGet.mockReset().mockReturnValue(undefined);
    mockCacheGraphileInstance.mockReset().mockResolvedValue(undefined);
    mockCreateGraphileInstance.mockReset();
    mockMakeIntrospectionWiring.mockReset().mockReturnValue({ presets: [], pgService: {} });
    mockGetApiConfig.mockReset();
    logSpies = (['info', 'warn', 'error'] as const).map((level) =>
      jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined)
    );
  });

  afterEach(() => {
    for (const spy of logSpies) spy.mockRestore();
    // A test that leaves a build holding a slot would starve the next one.
    expect(getBuildSlotStats()).toEqual({ active: 0, queued: 0 });
  });

  it('runs two builds at once by default and starts queued builds in arrival order', async () => {
    const builds = gateBuilds();
    const middleware = middlewareWith();
    const next = jest.fn();
    const requests = ['a', 'b', 'c', 'd'].map((key) =>
      middleware(makeRequest(key), makeResponse().res, next)
    );
    await settle();

    expect(builds.map((build) => build.key)).toEqual(['a', 'b']);
    expect(getBuildSlotStats()).toEqual({ active: 2, queued: 2 });
    expect(getInFlightCount()).toBe(4);

    builds[1].finish();
    await settle();
    expect(builds.map((build) => build.key)).toEqual(['a', 'b', 'c']);
    expect(getBuildSlotStats()).toEqual({ active: 2, queued: 1 });

    builds[0].finish();
    await settle();
    expect(builds.map((build) => build.key)).toEqual(['a', 'b', 'c', 'd']);
    expect(getBuildSlotStats()).toEqual({ active: 2, queued: 0 });

    builds[2].finish();
    builds[3].finish();
    await Promise.all(requests);

    for (const build of builds) expect(build.handler).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(getInFlightCount()).toBe(0);
  });

  it('fills each unset bound from the defaults', async () => {
    const builds = gateBuilds();
    const middleware = middlewareWith({ concurrency: undefined, queueMax: 0 });
    const next = jest.fn();
    const running = ['a', 'b'].map((key) => middleware(makeRequest(key), makeResponse().res, next));
    const refused = makeResponse();
    await middleware(makeRequest('c'), refused.res, next);
    await settle();

    expect(builds.map((build) => build.key)).toEqual(['a', 'b']);
    expectRefused(refused.captured, '30');

    for (const build of builds) build.finish();
    await Promise.all(running);
    expect(next).not.toHaveBeenCalled();
  });

  it('shares one slot among requests coalesced on the same build', async () => {
    const builds = gateBuilds();
    const middleware = middlewareWith({ concurrency: 1, queueMax: 0 });
    const next = jest.fn();
    const first = middleware(makeRequest('a'), makeResponse().res, next);
    const second = middleware(makeRequest('a'), makeResponse().res, next);
    await settle();

    expect(builds).toHaveLength(1);
    expect(getBuildSlotStats()).toEqual({ active: 1, queued: 0 });

    builds[0].finish();
    await Promise.all([first, second]);
    expect(builds[0].handler).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalled();
  });

  it('refuses a build with 503 and Retry-After when the queue is full', async () => {
    const builds = gateBuilds();
    const middleware = middlewareWith({ concurrency: 1, queueMax: 1, queueWaitMs: 4_500 });
    const next = jest.fn();
    const running = middleware(makeRequest('a'), makeResponse().res, next);
    const queued = middleware(makeRequest('b'), makeResponse().res, next);
    const refused = makeResponse();
    await middleware(makeRequest('c'), refused.res, next);
    await settle();

    expectRefused(refused.captured, '5');
    expect(builds.map((build) => build.key)).toEqual(['a']);
    expect(getBuildSlotStats()).toEqual({ active: 1, queued: 1 });
    // The refused build left no in-flight entry behind, so a retry builds again.
    expect(getInFlightCount()).toBe(2);

    builds[0].finish();
    await settle();
    builds[1].finish();
    await Promise.all([running, queued]);
    expect(next).not.toHaveBeenCalled();
  });

  it('refuses a build that waits longer than queueWaitMs', async () => {
    const builds = gateBuilds();
    const middleware = middlewareWith({ concurrency: 1, queueMax: 4, queueWaitMs: 20 });
    const next = jest.fn();
    const running = middleware(makeRequest('a'), makeResponse().res, next);
    const timedOut = makeResponse();
    await middleware(makeRequest('b'), timedOut.res, next);
    await settle();

    expectRefused(timedOut.captured, '1');
    expect(builds.map((build) => build.key)).toEqual(['a']);

    builds[0].finish();
    await running;
    expect(next).not.toHaveBeenCalled();
  });

  it('answers every coalesced request with 503 when the build cannot reach the database', async () => {
    const builds = gateBuilds();
    const middleware = middlewareWith();
    const next = jest.fn();
    const responses = [makeResponse(), makeResponse()];
    const requests = responses.map(({ res }) => middleware(makeRequest('a'), res, next));
    await settle();

    const refused = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
      code: 'ECONNREFUSED'
    });
    builds[0].fail(refused);
    await Promise.all(requests);

    for (const { captured } of responses) expectRefused(captured, '30');
    // The waiter did not start a second build against the same database.
    expect(builds).toHaveLength(1);
    expect(next).not.toHaveBeenCalled();
    expect(getInFlightCount()).toBe(0);
  });

  it('keeps masking other build failures and frees their slot', async () => {
    const builds = gateBuilds();
    const middleware = middlewareWith({ concurrency: 1, queueMax: 0 });
    const next = jest.fn();
    const failed = makeResponse();
    const request = middleware(makeRequest('a'), failed.res, next);
    await settle();
    builds[0].fail(new Error('permission denied for schema tenant_private'));
    await request;

    expect(failed.captured.status).toBe(200);
    expect(failed.captured.headers).toEqual({});
    expect(failed.captured.body?.errors[0].extensions).toEqual(
      expect.objectContaining({ code: 'INTERNAL_FAILURE' })
    );

    const later = middleware(makeRequest('b'), makeResponse().res, next);
    await settle();
    expect(builds.map((build) => build.key)).toEqual(['a', 'b']);
    builds[1].finish();
    await later;
    expect(builds[1].handler).toHaveBeenCalledTimes(1);
  });

  it('skips a queued build whose service changed while it waited', async () => {
    const builds = gateBuilds();
    mockGetApiConfig.mockImplementation(async () => api());
    const middleware = middlewareWith({ concurrency: 1, queueMax: 4 });
    const next = jest.fn();
    const running = middleware(makeRequest('a'), makeResponse().res, next);
    const waiting = middleware(makeRequest('b'), makeResponse().res, next);
    await settle();
    expect(getBuildSlotStats()).toEqual({ active: 1, queued: 1 });

    evictServiceKey('b');
    builds[0].finish();
    await settle();

    // The request resolved its service again and the next build is for that
    // resolution: nothing was built for the service as it was before.
    expect(mockGetApiConfig).toHaveBeenCalledTimes(1);
    expect(builds.map((build) => build.key)).toEqual(['a', 'b']);
    builds[1].finish();
    await Promise.all([running, waiting]);
    expect(builds[1].handler).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });
});
