const mockCacheGet = jest.fn();
const mockCacheGraphileInstance = jest.fn();
const mockCreateGraphileInstance = jest.fn();
const mockMakeIntrospectionWiring = jest.fn();
const mockCreateGrafastCacheLimitsPreset = jest.fn();

jest.mock('graphile-cache', () => ({
  cacheGraphileInstance: mockCacheGraphileInstance,
  createGraphileInstance: mockCreateGraphileInstance,
  graphileCache: {
    get: mockCacheGet,
    delete: jest.fn()
  }
}));

jest.mock('@pgpmjs/server-utils', () => ({
  svcCache: { delete: jest.fn() }
}));

jest.mock('graphile-settings', () => ({
  createConstructivePreset: jest.fn(() => ({})),
  createGrafastCacheLimitsPreset: mockCreateGrafastCacheLimitsPreset
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

import type { Request, Response } from 'express';

import { clearGenerations, evictServiceKey } from '../cache-generation';
import {
  clearInFlightMap,
  getInFlightCount,
  graphile
} from '../graphile';

const makeRequest = (): Request =>
  ({
    requestId: 'request-id',
    svc_key: 'service-key',
    api: {
      tenantPool: {},
      anonRole: 'anonymous',
      roleName: 'authenticated',
      schema: ['app_public'],
      databaseId: 'database-id'
    },
    get: jest.fn((): undefined => undefined)
  }) as unknown as Request;

describe('graphile single-flight handler creation', () => {
  beforeEach(() => {
    clearInFlightMap();
    clearGenerations();
    mockCacheGet.mockReset().mockReturnValue(undefined);
    mockCacheGraphileInstance.mockReset().mockResolvedValue(undefined);
    mockCreateGraphileInstance.mockReset().mockResolvedValue({
      handler: jest.fn()
    });
    mockMakeIntrospectionWiring.mockReset();
    mockGetApiConfig.mockReset();
    mockCreateGrafastCacheLimitsPreset.mockReset().mockReturnValue({
      plugins: [{ name: 'GrafastCacheLimitsPlugin', version: '1.0.0' }]
    });
  });

  it('coalesces requests while the handler build is pending', async () => {
    let releaseBuild!: () => void;
    const buildReady = new Promise<void>((resolve) => {
      releaseBuild = resolve;
    });
    mockCreateGraphileInstance.mockImplementation(async () => {
      await buildReady;
      return { handler: jest.fn() };
    });
    const pgScopedIntrospection = {
      main: { catalogTypes: 'dependency-closure' }
    };
    mockMakeIntrospectionWiring.mockReturnValue({
      presets: [],
      pgService: {},
      pgScopedIntrospection
    });

    const middleware = graphile({
      graphile: {
        grafastCache: { queryCacheMaxLength: 16 },
        preset: {
          gather: {
            pgIdentifiers: 'unqualified',
            pgScopedIntrospection: { main: true }
          }
        }
      }
    } as any);
    const response = { headersSent: false } as unknown as Response;
    const next = jest.fn();
    const first = middleware(makeRequest(), response, next);

    // Let the first request enter the registered creation promise before the
    // second request checks the in-flight map.
    await Promise.resolve();
    expect(getInFlightCount()).toBe(1);

    const second = middleware(makeRequest(), response, next);
    expect(getInFlightCount()).toBe(1);

    releaseBuild();
    await Promise.all([first, second]);

    expect(mockMakeIntrospectionWiring).toHaveBeenCalledTimes(1);
    expect(mockCreateGraphileInstance).toHaveBeenCalledTimes(1);
    expect(mockCreateGrafastCacheLimitsPreset).toHaveBeenCalledWith({
      queryCacheMaxLength: 16
    });
    expect(mockCreateGraphileInstance.mock.calls[0][0].preset.extends).toContainEqual({
      plugins: [{ name: 'GrafastCacheLimitsPlugin', version: '1.0.0' }]
    });
    expect(mockCacheGraphileInstance).toHaveBeenCalledTimes(1);
    expect(getInFlightCount()).toBe(0);
    expect(mockCreateGraphileInstance.mock.calls[0][0].preset.gather).toEqual({
      pgIdentifiers: 'unqualified',
      pgScopedIntrospection
    });
  });

  it('never hands coalesced waiters a handler the cache rejected', async () => {
    let releaseBuild!: () => void;
    const buildReady = new Promise<void>((resolve) => {
      releaseBuild = resolve;
    });
    const handler = jest.fn();
    mockCreateGraphileInstance.mockImplementation(async () => {
      await buildReady;
      return { handler };
    });
    const budgetError = new Error('over the graphile cache budget');
    mockCacheGraphileInstance.mockRejectedValue(budgetError);
    mockMakeIntrospectionWiring.mockReturnValue({
      presets: [],
      pgService: {},
      pgScopedIntrospection: { main: true }
    });

    const middleware = graphile({ graphile: {} } as any);
    const response = { headersSent: true } as unknown as Response;
    const next = jest.fn();
    const first = middleware(makeRequest(), response, next);
    await Promise.resolve();
    const second = middleware(makeRequest(), response, next);
    expect(getInFlightCount()).toBe(1);

    releaseBuild();
    await Promise.all([first, second]);

    expect(handler).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(2);
    for (const [error] of next.mock.calls) {
      expect(error.message).toContain(budgetError.message);
    }
    expect(getInFlightCount()).toBe(0);
  });

  it('does not admit a handler whose service was evicted while it was being built, and serves the request from a rebuild', async () => {
    let releaseFirstBuild!: () => void;
    const firstBuildReady = new Promise<void>((resolve) => {
      releaseFirstBuild = resolve;
    });
    const staleHandler = jest.fn();
    const freshHandler = jest.fn();
    const release = jest.fn().mockResolvedValue(undefined);
    mockCreateGraphileInstance
      .mockImplementationOnce(async () => {
        await firstBuildReady;
        return { handler: staleHandler, pgl: { release } };
      })
      .mockImplementationOnce(async () => ({ handler: freshHandler, pgl: { release } }));
    mockMakeIntrospectionWiring.mockReturnValue({
      presets: [],
      pgService: {},
      pgScopedIntrospection: { main: true }
    });
    const resolved = { ...makeRequest().api, schema: ['app_public', 'app_new'] };
    mockGetApiConfig.mockResolvedValue(resolved);

    const middleware = graphile({ graphile: {} } as any);
    const response = { headersSent: false } as unknown as Response;
    const next = jest.fn();
    const req = makeRequest();
    const pending = middleware(req, response, next);
    await Promise.resolve();
    expect(getInFlightCount()).toBe(1);

    evictServiceKey('service-key');
    releaseFirstBuild();
    await pending;

    // The stale build is released, never admitted or served.
    expect(release).toHaveBeenCalledTimes(1);
    expect(staleHandler).not.toHaveBeenCalled();
    // The request resolved its service again and was served by the new build.
    expect(mockGetApiConfig).toHaveBeenCalledTimes(1);
    expect(req.api).toBe(resolved);
    expect(mockCreateGraphileInstance).toHaveBeenCalledTimes(2);
    expect(mockCacheGraphileInstance).toHaveBeenCalledTimes(1);
    expect(freshHandler).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(getInFlightCount()).toBe(0);
  });

  it('fails the request with the reason when the service keeps changing during every build', async () => {
    const handler = jest.fn();
    const release = jest.fn().mockResolvedValue(undefined);
    mockCreateGraphileInstance.mockImplementation(async () => {
      // Every build sees an eviction land before it is admitted.
      evictServiceKey('service-key');
      return { handler, pgl: { release } };
    });
    mockMakeIntrospectionWiring.mockReturnValue({
      presets: [],
      pgService: {},
      pgScopedIntrospection: { main: true }
    });
    mockGetApiConfig.mockImplementation(async () => makeRequest().api);

    const middleware = graphile({ graphile: {} } as any);
    const response = { headersSent: true } as unknown as Response;
    const next = jest.fn();
    await middleware(makeRequest(), response, next);

    expect(mockCreateGraphileInstance).toHaveBeenCalledTimes(3);
    expect(mockGetApiConfig).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(3);
    expect(handler).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].message).toContain('invalidated while its handler was being built');
    // The service cache key stays in the log, never in what the client is sent.
    expect(next.mock.calls[0][0].message).not.toContain('service-key');
    expect(getInFlightCount()).toBe(0);
  });

  it('releases a discarded build whose realtime teardown fails, and still rebuilds for the request', async () => {
    let releaseFirstBuild!: () => void;
    const firstBuildReady = new Promise<void>((resolve) => {
      releaseFirstBuild = resolve;
    });
    const release = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockRejectedValue(new Error('realtime already closed'));
    const freshHandler = jest.fn();
    mockCreateGraphileInstance
      .mockImplementationOnce(async () => {
        await firstBuildReady;
        return { handler: jest.fn(), pgl: { release }, realtimeManager: { stop } };
      })
      .mockImplementationOnce(async () => ({ handler: freshHandler, pgl: { release } }));
    mockMakeIntrospectionWiring.mockReturnValue({ presets: [], pgService: {}, pgScopedIntrospection: { main: true } });
    mockGetApiConfig.mockResolvedValue(makeRequest().api);

    const middleware = graphile({ graphile: {} } as any);
    const next = jest.fn();
    const pending = middleware(makeRequest(), { headersSent: false } as unknown as Response, next);
    await Promise.resolve();
    evictServiceKey('service-key');
    releaseFirstBuild();
    await pending;

    expect(stop).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
    expect(freshHandler).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 404 when the service no longer resolves after its build was invalidated', async () => {
    const handler = jest.fn();
    mockCreateGraphileInstance.mockImplementation(async () => {
      evictServiceKey('service-key');
      return { handler, pgl: { release: jest.fn().mockResolvedValue(undefined) } };
    });
    mockMakeIntrospectionWiring.mockReturnValue({ presets: [], pgService: {}, pgScopedIntrospection: { main: true } });
    mockGetApiConfig.mockResolvedValue(null);

    const send = jest.fn();
    const status = jest.fn(() => ({ send }));
    const middleware = graphile({ graphile: {} } as any);
    const next = jest.fn();
    await middleware(makeRequest(), { headersSent: false, status } as unknown as Response, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(send.mock.calls[0][0]).toContain('API not found');
    expect(handler).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('keeps a failed re-resolution out of what the client is sent', async () => {
    mockCreateGraphileInstance.mockImplementation(async () => {
      evictServiceKey('service-key');
      return { handler: jest.fn(), pgl: { release: jest.fn().mockResolvedValue(undefined) } };
    });
    mockMakeIntrospectionWiring.mockReturnValue({ presets: [], pgService: {}, pgScopedIntrospection: { main: true } });
    mockGetApiConfig.mockRejectedValue(new Error('no schemas in [tenant_private] for database 0f2c…'));

    const middleware = graphile({ graphile: {} } as any);
    const next = jest.fn();
    await middleware(makeRequest(), { headersSent: true } as unknown as Response, next);

    const message: string = next.mock.calls[0][0].message;
    expect(message).toBe('Failed to create handler for this API: the service could not be resolved again');
    expect(message).not.toContain('service-key');
    expect(message).not.toContain('tenant_private');
  });
});
