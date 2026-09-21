const mockCreateGraphileInstance = jest.fn();
const mockGetPgPool = jest.fn();
const mockMakeIntrospectionWiring = jest.fn();
const mockCreateGrafastCacheLimitsPreset = jest.fn();
const mockRegisterPoolCleanup = jest.fn(() => jest.fn());

jest.mock('graphile-cache', () => {
  const actual = jest.requireActual('graphile-cache');
  return {
    ...actual,
    createGraphileInstance: mockCreateGraphileInstance
  };
});

jest.mock('graphile-settings', () => ({
  createConstructivePreset: jest.fn(() => ({})),
  createGrafastCacheLimitsPreset: mockCreateGrafastCacheLimitsPreset
}));

jest.mock('pg-cache', () => ({
  getPgPool: mockGetPgPool,
  pgCache: {
    registerCleanupCallback: mockRegisterPoolCleanup,
    close: jest.fn()
  }
}));

jest.mock('../graphile-introspection', () => ({
  makeIntrospectionWiring: mockMakeIntrospectionWiring
}));

import type { Request, Response } from 'express';
import {
  clearGraphileCache,
  configureGraphileAdmission,
  graphileCache,
  type GraphileCacheEntry
} from 'graphile-cache';

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
      dbname: 'database',
      anonRole: 'anonymous',
      roleName: 'authenticated',
      schema: ['app_public'],
      databaseId: 'database-id'
    },
    get: jest.fn((): undefined => undefined)
  }) as unknown as Request;

describe('graphile single-flight handler creation', () => {
  beforeEach(async () => {
    await clearGraphileCache();
    configureGraphileAdmission({ buildReserveBytes: 0 });
    clearInFlightMap();
    mockGetPgPool.mockReset().mockReturnValue({});
    mockCreateGraphileInstance.mockReset().mockImplementation(async ({ cacheKey }: any) => ({
      pgl: { release: jest.fn().mockResolvedValue(undefined) },
      serv: {},
      handler: jest.fn(),
      httpServer: { listening: false },
      cacheKey,
      createdAt: Date.now(),
      releasePresetServices: jest.fn().mockResolvedValue(undefined)
    }));
    mockMakeIntrospectionWiring.mockReset();
    mockCreateGrafastCacheLimitsPreset.mockReset().mockReturnValue({
      plugins: [{ name: 'GrafastCacheLimitsPlugin', version: '1.0.0' }]
    });
  });

  it('coalesces requests while asynchronous preset wiring is pending', async () => {
    let releaseWiring!: () => void;
    const wiringReady = new Promise<void>((resolve) => {
      releaseWiring = resolve;
    });
    mockMakeIntrospectionWiring.mockImplementation(async () => {
      await wiringReady;
      return { presets: [], pgService: {} };
    });

    const middleware = graphile({
      graphile: {
        cache: { buildReserveBytes: 0 },
        grafastCache: { queryCacheMaxLength: 16 },
        extends: [
          {
            gather: {
              pgScopedIntrospection: { main: true }
            }
          }
        ],
        preset: {
          gather: {
            pgScopedIntrospection: { main: false }
          }
        }
      }
    } as any);
    const response = { headersSent: false } as unknown as Response;
    const next = jest.fn();
    const first = middleware(makeRequest(), response, next);

    // Admission awaits before starting the preset build, so let the first
    // request register its creation promise before the second request checks.
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(getInFlightCount()).toBe(1);

    const second = middleware(makeRequest(), response, next);
    expect(getInFlightCount()).toBe(1);
    expect(mockMakeIntrospectionWiring).toHaveBeenCalledTimes(1);

    releaseWiring();
    await Promise.all([first, second]);

    expect(mockCreateGraphileInstance).toHaveBeenCalledTimes(1);
    expect(mockCreateGrafastCacheLimitsPreset).toHaveBeenCalledWith({
      queryCacheMaxLength: 16
    });
    expect(mockCreateGraphileInstance.mock.calls[0][0].preset.extends).toContainEqual({
      plugins: [{ name: 'GrafastCacheLimitsPlugin', version: '1.0.0' }]
    });
    expect(graphileCache.size).toBe(1);
    const entry = graphileCache.values().next().value as GraphileCacheEntry;
    expect(entry).toEqual(expect.objectContaining({
      serviceKey: 'service-key',
      databaseId: 'database-id',
      poolKey: expect.any(String)
    }));
    expect(getInFlightCount()).toBe(0);
    expect(mockCreateGraphileInstance.mock.calls[0][0].preset.gather).toEqual({
      pgScopedIntrospection: { main: false }
    });

    await clearGraphileCache();
    expect(graphileCache.size).toBe(0);
    expect(entry.pgl.release).toHaveBeenCalledTimes(1);
    expect(entry.releasePresetServices).toHaveBeenCalledTimes(1);
  });
});
