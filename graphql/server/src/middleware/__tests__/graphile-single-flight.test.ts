const mockCacheGet = jest.fn();
const mockCacheGraphileInstance = jest.fn();
const mockCreateGraphileInstance = jest.fn();
const mockMakeIntrospectionWiring = jest.fn();
const mockCreateGrafastCacheLimitsPreset = jest.fn();

jest.mock('graphile-cache', () => {
  const actual = jest.requireActual('graphile-cache');
  const Flights = actual.graphileBuildFlights.constructor;
  return {
    ...actual,
    configureGraphileAdmission: jest.fn(),
    configureGraphileBuilds: jest.fn(),
    graphileBuildFlights: new Flights({
      get: mockCacheGet,
      build: async (metadata: { cacheKey: string }, create: () => Promise<unknown>) => {
        const entry = await create();
        await mockCacheGraphileInstance(metadata.cacheKey, entry);
        return entry;
      }
    }),
    createGraphileInstance: mockCreateGraphileInstance
  };
});

jest.mock('graphile-settings', () => ({
  createConstructivePreset: jest.fn(() => ({})),
  createGrafastCacheLimitsPreset: mockCreateGrafastCacheLimitsPreset
}));

jest.mock('../graphile-introspection', () => ({
  makeIntrospectionWiring: mockMakeIntrospectionWiring
}));

import type { Request, Response } from 'express';

import {
  clearInFlightMap,
  getInFlightCount,
  graphile
} from '../graphile';

const pool = {};
const makeRequest = (): Request =>
  ({
    constructive: {
      requestId: 'request-id',
      serviceKey: 'service-key',
      databaseId: 'database-id',
      pool,
      pgSettings: {},
      useModule: jest.fn().mockResolvedValue(undefined),
      api: { dbname: 'test-db', anonRole: 'anonymous', roleName: 'authenticated', schema: ['app_public'], databaseId: 'database-id' }
    },
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
    mockCacheGet.mockReset().mockReturnValue(undefined);
    mockCacheGraphileInstance.mockReset().mockResolvedValue(undefined);
    mockCreateGraphileInstance.mockReset().mockResolvedValue({
      handler: jest.fn()
    });
    mockMakeIntrospectionWiring.mockReset();
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
    await new Promise(resolve => setImmediate(resolve));
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
    await new Promise(resolve => setImmediate(resolve));
    const second = middleware(makeRequest(), response, next);
    expect(getInFlightCount()).toBe(1);

    releaseBuild();
    await Promise.all([first, second]);

    expect(handler).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(2);
    for (const [error] of next.mock.calls) {
      expect(error.code).toBe('INTERNAL_FAILURE');
      expect(error.cause).toBe(budgetError);
    }
    expect(getInFlightCount()).toBe(0);
  });
});
