import { EventEmitter } from 'node:events';

import type { NextFunction, Request, Response } from 'express';
import type { PgPoolLease } from 'pg-cache';

import {
  computeBackingCacheMax,
  computeCapacityFromBudget,
  disposeUncachedEntry,
  evaluateBuildAdmission,
  getCacheConfig,
  getCacheCounters,
  getCacheStats,
  getInstanceHeapEstimate,
  getMemoryPressure,
  graphileCache,
  type GraphileCacheEntry,
  invokeEntryHandler,
  prepareCacheForBuild,
  raceWithClearedTimeout,
  recordInstanceHeapSample,
  resetInstanceHeapSamples,
  waitForEntryDisposal
} from '../graphile-cache';
import { GRAPHILE_REALTIME_UNAVAILABLE_CODE } from '../realtime-readiness';

const MB = 1024 * 1024;

const makeEntry = (releaseDelayMs = 0): GraphileCacheEntry => ({
  pgl: {
    release: jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, releaseDelayMs)))
  } as unknown as GraphileCacheEntry['pgl'],
  serv: {} as GraphileCacheEntry['serv'],
  handler: jest.fn() as unknown as GraphileCacheEntry['handler'],
  httpServer: null,
  cacheKey: 'test',
  createdAt: Date.now()
});

const makePoolLease = (onRelease?: () => void): PgPoolLease => ({
  pool: {} as PgPoolLease['pool'],
  identity: 'pg:v1:test-runtime',
  release: jest.fn(() => onRelease?.())
});

describe('heap budget capacity', () => {
  const calibrationEnv = [
    'GRAPHILE_CACHE_MAX',
    'GRAPHILE_CACHE_ADMISSION_MODE',
    'GRAPHILE_CACHE_INSTANCE_HEAP_BYTES',
    'GRAPHILE_CACHE_SERVER_RESERVE_BYTES',
    'GRAPHILE_CACHE_BUILD_RESERVE_BYTES',
    'GRAPHILE_CACHE_RSS_LIMIT_BYTES',
    'GRAPHILE_CACHE_RSS_BUILD_RESERVE_BYTES',
    'GRAPHILE_CACHE_CALIBRATION_ID'
  ] as const;
  let previousEnv: Record<string, string | undefined>;

  beforeEach(() => {
    previousEnv = Object.fromEntries(
      calibrationEnv.map((name) => [name, process.env[name]])
    );
    for (const name of calibrationEnv) delete process.env[name];
    resetInstanceHeapSamples();
  });

  afterEach(() => {
    resetInstanceHeapSamples();
    for (const name of calibrationEnv) {
      const value = previousEnv[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('fits residency and one serialized build transient', () => {
    expect(computeCapacityFromBudget(3584 * MB, 1450 * MB, 256 * MB, 768 * MB)).toBe(2);
    expect(computeCapacityFromBudget(2048 * MB, 1450 * MB, 256 * MB, 768 * MB)).toBe(1);
  });

  it('returns zero when even the server and build reserves cannot fit', () => {
    expect(computeCapacityFromBudget(512 * MB, 64 * MB, 256 * MB, 768 * MB)).toBe(0);
  });

  it('does not hide validated density behind a fixed backing-cache ceiling', () => {
    expect(computeCapacityFromBudget(238 * MB, MB, MB, MB)).toBe(237);
    expect(computeBackingCacheMax(1024 * MB)).toBe(4096);
    expect(computeBackingCacheMax(4096 * MB)).toBe(16_384);
    expect(graphileCache.max).toBeGreaterThanOrEqual(4096);
  });

  it('derives the backing ceiling from the modeled heap rather than this process', () => {
    expect(computeCapacityFromBudget(1024 * MB, 1, 1, 1)).toBe(4096);
  });

  it('treats runtime samples as a safety floor rather than an unsafe downsize', () => {
    recordInstanceHeapSample(30 * MB);
    recordInstanceHeapSample(32 * MB);
    recordInstanceHeapSample(34 * MB);
    expect(getInstanceHeapEstimate()).toBe(512 * MB);
    expect(getCacheConfig().calibration).toMatchObject({
      instanceHeapSource: 'default',
      instanceHeapSampleCount: 3
    });
  });

  it('lets runtime samples raise an explicit calibrated floor', () => {
    process.env.GRAPHILE_CACHE_INSTANCE_HEAP_BYTES = String(32 * MB);
    recordInstanceHeapSample(40 * MB);
    recordInstanceHeapSample(50 * MB);
    recordInstanceHeapSample(60 * MB);
    expect(getInstanceHeapEstimate()).toBe(60 * MB);
    expect(getCacheConfig().calibration.instanceHeapSource).toBe(
      'runtime-safety-floor'
    );
  });

  it('reports explicit calibration provenance and respects the operator ceiling', () => {
    process.env.GRAPHILE_CACHE_INSTANCE_HEAP_BYTES = String(MB);
    process.env.GRAPHILE_CACHE_SERVER_RESERVE_BYTES = String(MB);
    process.env.GRAPHILE_CACHE_BUILD_RESERVE_BYTES = String(MB);
    process.env.GRAPHILE_CACHE_MAX = '128';
    process.env.GRAPHILE_CACHE_CALIBRATION_ID = 'cperf:fixture:sha256';
    const config = getCacheConfig();
    expect(config.max).toBe(128);
    expect(config.calibration).toEqual({
      id: 'cperf:fixture:sha256',
      instanceHeapSource: 'environment',
      instanceHeapSampleCount: 0,
      serverReserveSource: 'environment',
      buildReserveSource: 'environment'
    });
  });

  it('defaults to idle eviction and strictly validates preserve-resident admission', () => {
    expect(getCacheConfig().admissionMode).toBe('evict-idle');
    process.env.GRAPHILE_CACHE_ADMISSION_MODE = 'preserve-resident';
    expect(getCacheConfig().admissionMode).toBe('preserve-resident');
    process.env.GRAPHILE_CACHE_ADMISSION_MODE = 'preserve';
    expect(() => getCacheConfig()).toThrow(
      'GRAPHILE_CACHE_ADMISSION_MODE must be evict-idle or preserve-resident'
    );
  });

  it('reports an explicit RSS ceiling and transient reservation', () => {
    process.env.GRAPHILE_CACHE_RSS_LIMIT_BYTES = String(3 * 1024 * MB);
    process.env.GRAPHILE_CACHE_RSS_BUILD_RESERVE_BYTES = String(96 * MB);

    const config = getCacheConfig();
    const pressure = getMemoryPressure();
    const stats = getCacheStats();

    expect(config).toMatchObject({
      rssLimitBytes: 3 * 1024 * MB,
      rssBuildReserveBytes: 96 * MB
    });
    expect(pressure).toMatchObject({
      rssLimitBytes: 3 * 1024 * MB,
      rssBytes: expect.any(Number),
      rssRatio: expect.any(Number)
    });
    expect(stats).toMatchObject({
      rssLimitBytes: 3 * 1024 * MB,
      rssBuildReserveBytes: 96 * MB
    });
  });

  it('keeps RSS observable but unbounded unless an operator sets a ceiling', () => {
    expect(getMemoryPressure()).toMatchObject({
      rssLimitBytes: null,
      rssRatio: null,
      rssLevel: 'unbounded',
      rssBytes: expect.any(Number)
    });
  });

  it('refuses a build whose live RSS plus transient reserve crosses the ceiling', () => {
    const rssBytes = process.memoryUsage().rss;
    process.env.GRAPHILE_CACHE_RSS_LIMIT_BYTES = String(rssBytes * 4);
    process.env.GRAPHILE_CACHE_RSS_BUILD_RESERVE_BYTES = String(rssBytes * 5);

    expect(evaluateBuildAdmission(0)).toMatchObject({
      admit: false,
      reason: 'rss_budget_exceeded',
      rssLimitBytes: rssBytes * 4
    });
  });

  it.each([
    ['GRAPHILE_CACHE_INSTANCE_HEAP_BYTES', '0'],
    ['GRAPHILE_CACHE_SERVER_RESERVE_BYTES', '-1'],
    ['GRAPHILE_CACHE_BUILD_RESERVE_BYTES', '1.5'],
    ['GRAPHILE_CACHE_RSS_LIMIT_BYTES', '0'],
    ['GRAPHILE_CACHE_RSS_BUILD_RESERVE_BYTES', '-10'],
    ['GRAPHILE_CACHE_MAX', '12entries'],
    ['GRAPHILE_CACHE_MAX', String(Number.MAX_SAFE_INTEGER + 1)]
  ])('rejects invalid explicit calibration %s=%s', (name, value) => {
    process.env[name] = value;
    expect(() => getCacheConfig()).toThrow('must be a positive safe integer');
  });

  it('rejects an operator ceiling above the heap-scaled backing cache', () => {
    process.env.GRAPHILE_CACHE_MAX = String(graphileCache.max + 1);
    expect(() => getCacheConfig()).toThrow('exceeds heap-scaled backing ceiling');
  });
});

describe('entry-scoped awaited disposal', () => {
  afterEach(async () => {
    graphileCache.clear();
    await new Promise((resolve) => setTimeout(resolve, 5));
  });

  it('disposes distinct rebuilt entries with the same key exactly once each', async () => {
    const first = makeEntry();
    const second = makeEntry();
    await Promise.all([
      disposeUncachedEntry(first, 'same-key'),
      disposeUncachedEntry(second, 'same-key')
    ]);
    expect(first.pgl.release).toHaveBeenCalledTimes(1);
    expect(second.pgl.release).toHaveBeenCalledTimes(1);
  });

  it('waits for a resident request before releasing the instance', async () => {
    const entry = makeEntry();
    const response = new EventEmitter() as unknown as Response;
    invokeEntryHandler(
      entry,
      {} as Request,
      response,
      (() => undefined) as NextFunction
    );
    graphileCache.set('drain', entry);
    graphileCache.delete('drain');

    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(entry.pgl.release).not.toHaveBeenCalled();
    (response as unknown as EventEmitter).emit('finish');
    await expect(waitForEntryDisposal(entry, 100)).resolves.toBe(true);
    expect(entry.pgl.release).toHaveBeenCalledTimes(1);
  });

  it('does not enter an instance after the request has already closed', () => {
    const entry = makeEntry();
    const request = Object.assign(new EventEmitter(), {
      aborted: true,
      destroyed: true,
      socket: { destroyed: true }
    }) as unknown as Request;
    const response = Object.assign(new EventEmitter(), {
      destroyed: true,
      writableEnded: true
    }) as unknown as Response;

    expect(invokeEntryHandler(
      entry,
      request,
      response,
      (() => undefined) as NextFunction
    )).toBe(false);
    expect(entry.handler).not.toHaveBeenCalled();
    expect(entry.inflight ?? 0).toBe(0);
  });

  it('does enter after a JSON body parser consumed the request stream', () => {
    const entry = makeEntry();
    const countersBefore = getCacheCounters();
    const request = Object.assign(new EventEmitter(), {
      aborted: false,
      // Express/raw-body may destroy the readable request stream after fully
      // consuming it while the underlying keep-alive socket remains healthy.
      destroyed: true,
      socket: { destroyed: false }
    }) as unknown as Request;
    const response = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false
    }) as unknown as Response;

    expect(invokeEntryHandler(
      entry,
      request,
      response,
      (() => undefined) as NextFunction
    )).toBe(true);
    expect(entry.handler).toHaveBeenCalledTimes(1);
    expect(entry.inflight).toBe(1);
    expect(getCacheCounters().httpRequestsStarted).toBe(
      countersBefore.httpRequestsStarted + 1
    );
    expect(getCacheCounters().httpRequestsCompleted).toBe(
      countersBefore.httpRequestsCompleted
    );
    (response as unknown as EventEmitter).emit('finish');
    // Express can emit close after finish; the completion counter remains
    // monotonic and records this request exactly once.
    (response as unknown as EventEmitter).emit('close');
    expect(entry.inflight).toBe(0);
    expect(getCacheCounters().httpRequestsCompleted).toBe(
      countersBefore.httpRequestsCompleted + 1
    );
  });

  it('returns a stable 503 and retires the exact realtime-unhealthy generation', async () => {
    const entry = makeEntry();
    entry.cacheKey = 'realtime-unhealthy';
    entry.realtimeHealth = {
      status: 'failed',
      failureCode: 'REALTIME_SOURCE_SCHEMA_VIOLATION',
      failedAt: 1_000
    };
    graphileCache.set('realtime-unhealthy', entry);
    expect(getCacheStats().realtimeUnhealthy).toBe(1);
    const response = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
      headersSent: false,
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn()
    });
    response.status.mockReturnValue(response);

    expect(invokeEntryHandler(
      entry,
      {} as Request,
      response as unknown as Response,
      (() => undefined) as NextFunction
    )).toBe(true);

    expect(entry.handler).not.toHaveBeenCalled();
    expect(entry.inflight ?? 0).toBe(0);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '15');
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: GRAPHILE_REALTIME_UNAVAILABLE_CODE,
        message: 'Realtime delivery is unavailable for this GraphQL instance'
      }
    });
    expect(graphileCache.has('realtime-unhealthy')).toBe(false);
    await expect(waitForEntryDisposal(entry, 100)).resolves.toBe(true);
    expect(entry.pgl.release).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a listener-role attestation expires before invocation', () => {
    const entry = makeEntry();
    entry.realtimeRoleAttestation = {
      snapshot: jest.fn(() => ({
        version: 1,
        mode: 'shared-exact',
        listenerIdentity: 'opaque-listener-identity',
        auditVersion: 'pg-notification-role:v1',
        role: 'listener',
        database: 'tenant_a',
        lastAttestedAt: 1,
        validUntil: 2,
        checks: 1,
        status: 'healthy',
        failureCode: null as string | null,
        failedAt: null as number | null
      })),
      revalidateIfDue: jest.fn(async () => true),
      release: jest.fn()
    };
    const response = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
      headersSent: false,
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn()
    });
    response.status.mockReturnValue(response);

    expect(invokeEntryHandler(
      entry,
      {} as Request,
      response as unknown as Response,
      (() => undefined) as NextFunction
    )).toBe(true);

    expect(entry.handler).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: GRAPHILE_REALTIME_UNAVAILABLE_CODE,
        message: 'Realtime delivery is unavailable for this GraphQL instance'
      }
    });
  });

  it('never lets a stale realtime generation evict a healthy replacement', () => {
    const stale = makeEntry();
    stale.cacheKey = 'shared-contract';
    stale.realtimeHealth = {
      status: 'failed',
      failureCode: 'REALTIME_SOURCE_SCHEMA_VIOLATION',
      failedAt: 1_000
    };
    const replacement = makeEntry();
    replacement.cacheKey = 'shared-contract';
    graphileCache.set('shared-contract', replacement);
    const response = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
      headersSent: false,
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn()
    });
    response.status.mockReturnValue(response);

    expect(invokeEntryHandler(
      stale,
      {} as Request,
      response as unknown as Response,
      (() => undefined) as NextFunction
    )).toBe(true);

    expect(graphileCache.peek('shared-contract')).toBe(replacement);
    expect(replacement.disposing).not.toBe(true);
    expect(stale.disposing).not.toBe(true);
    expect(stale.handler).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(503);
  });

  it('releases if the response closes while terminal listeners are attached', () => {
    const entry = makeEntry();
    const request = new EventEmitter() as unknown as Request;
    const response = new EventEmitter() as unknown as Response;
    let terminalChecks = 0;
    Object.defineProperty(response, 'writableEnded', {
      get: () => ++terminalChecks >= 2
    });

    expect(invokeEntryHandler(
      entry,
      request,
      response,
      (() => undefined) as NextFunction
    )).toBe(false);
    expect(entry.handler).not.toHaveBeenCalled();
    expect(entry.inflight).toBe(0);
    expect((response as unknown as EventEmitter).listenerCount('finish')).toBe(0);
    expect((response as unknown as EventEmitter).listenerCount('close')).toBe(0);
  });

  it('releases the pool lease after the complete teardown sequence', async () => {
    const events: string[] = [];
    const entry = makeEntry();
    entry.httpServer = {
      close: (callback: () => void) => {
        events.push('http-close');
        callback();
      }
    } as unknown as GraphileCacheEntry['httpServer'];
    entry.realtimeManager = {
      stop: jest.fn(async () => {
        events.push('realtime-stop');
      })
    };
    entry.pgl = {
      release: jest.fn(async () => {
        events.push('postgraphile-release');
      })
    } as unknown as GraphileCacheEntry['pgl'];
    entry.releasePresetServices = jest.fn(async () => {
      events.push('preset-services-release');
    });
    entry.poolLease = makePoolLease(() => events.push('pool-lease-release'));

    const response = new EventEmitter() as unknown as Response;
    invokeEntryHandler(entry, {} as Request, response, (() => undefined) as NextFunction);
    const disposal = disposeUncachedEntry(entry, 'ordered');

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(events).toEqual([]);

    (response as unknown as EventEmitter).emit('finish');
    await disposal;
    expect(events).toEqual([
      'http-close',
      'postgraphile-release',
      'preset-services-release',
      'realtime-stop',
      'pool-lease-release'
    ]);
  });

  it('releases the pool lease exactly once under duplicate disposal', async () => {
    const entry = makeEntry();
    entry.poolLease = makePoolLease();

    await Promise.all([
      disposeUncachedEntry(entry, 'duplicate'),
      disposeUncachedEntry(entry, 'duplicate'),
      disposeUncachedEntry(entry, 'duplicate')
    ]);

    expect(entry.pgl.release).toHaveBeenCalledTimes(1);
    expect(entry.poolLease.release).toHaveBeenCalledTimes(1);
  });

  it('awaits released memory before admitting the next build', async () => {
    const previousMax = process.env.GRAPHILE_CACHE_MAX;
    const previousMode = process.env.GRAPHILE_CACHE_ADMISSION_MODE;
    process.env.GRAPHILE_CACHE_MAX = '1';
    process.env.GRAPHILE_CACHE_ADMISSION_MODE = 'evict-idle';
    const entry = makeEntry(20);
    graphileCache.set('resident', entry);
    const startedAt = Date.now();
    try {
      const result = await prepareCacheForBuild(200);
      expect(result.evicted).toBe(1);
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(15);
      expect(entry.pgl.release).toHaveBeenCalledTimes(1);
    } finally {
      if (previousMax === undefined) delete process.env.GRAPHILE_CACHE_MAX;
      else process.env.GRAPHILE_CACHE_MAX = previousMax;
      if (previousMode === undefined) delete process.env.GRAPHILE_CACHE_ADMISSION_MODE;
      else process.env.GRAPHILE_CACHE_ADMISSION_MODE = previousMode;
    }
  });

  it('refuses at preserve-resident capacity before evicting an idle resident', async () => {
    const previousMax = process.env.GRAPHILE_CACHE_MAX;
    const previousMode = process.env.GRAPHILE_CACHE_ADMISSION_MODE;
    process.env.GRAPHILE_CACHE_MAX = '1';
    process.env.GRAPHILE_CACHE_ADMISSION_MODE = 'preserve-resident';
    const entry = makeEntry();
    graphileCache.set('preserved', entry);
    try {
      expect(evaluateBuildAdmission()).toMatchObject({
        admit: false,
        reason: 'resident_capacity'
      });
      await expect(prepareCacheForBuild(100)).rejects.toMatchObject({
        reason: 'resident_capacity'
      });
      expect(graphileCache.peek('preserved')).toBe(entry);
      expect(entry.pgl.release).not.toHaveBeenCalled();
    } finally {
      graphileCache.delete('preserved');
      await waitForEntryDisposal(entry, 100);
      if (previousMax === undefined) delete process.env.GRAPHILE_CACHE_MAX;
      else process.env.GRAPHILE_CACHE_MAX = previousMax;
      if (previousMode === undefined) delete process.env.GRAPHILE_CACHE_ADMISSION_MODE;
      else process.env.GRAPHILE_CACHE_ADMISSION_MODE = previousMode;
    }
  });

  it('refuses admission without evicting the only busy resident', async () => {
    const previousMax = process.env.GRAPHILE_CACHE_MAX;
    const previousMode = process.env.GRAPHILE_CACHE_ADMISSION_MODE;
    process.env.GRAPHILE_CACHE_MAX = '1';
    process.env.GRAPHILE_CACHE_ADMISSION_MODE = 'evict-idle';
    const entry = makeEntry();
    const response = new EventEmitter() as unknown as Response;
    invokeEntryHandler(entry, {} as Request, response, (() => undefined) as NextFunction);
    graphileCache.set('busy', entry);
    try {
      await expect(prepareCacheForBuild(10)).rejects.toMatchObject({
        reason: 'resident_busy'
      });
      expect(graphileCache.has('busy')).toBe(true);
    } finally {
      (response as unknown as EventEmitter).emit('finish');
      await waitForEntryDisposal(entry, 100);
      if (previousMax === undefined) delete process.env.GRAPHILE_CACHE_MAX;
      else process.env.GRAPHILE_CACHE_MAX = previousMax;
      if (previousMode === undefined) delete process.env.GRAPHILE_CACHE_ADMISSION_MODE;
      else process.env.GRAPHILE_CACHE_ADMISSION_MODE = previousMode;
    }
  });

  it('releases the pool lease when PostGraphile release fails', async () => {
    const releaseFailure = new Error('PostGraphile release failed');
    const events: string[] = [];
    const entry = makeEntry();
    entry.pgl = {
      release: jest.fn(async () => {
        events.push('postgraphile-release');
        throw releaseFailure;
      })
    } as unknown as GraphileCacheEntry['pgl'];
    entry.poolLease = makePoolLease(() => events.push('pool-lease-release'));

    await expect(disposeUncachedEntry(entry, 'release-failure')).rejects.toBe(
      releaseFailure
    );
    expect(events).toEqual(['postgraphile-release', 'pool-lease-release']);
    expect(entry.poolLease.release).toHaveBeenCalledTimes(1);
  });

  it('continues realtime and pool cleanup after a PostGraphile release failure', async () => {
    const releaseFailure = new Error('PostGraphile release failed');
    const realtimeFailure = new Error('Realtime stop failed');
    const entry = makeEntry();
    entry.pgl = {
      release: jest.fn(async () => {
        throw releaseFailure;
      })
    } as unknown as GraphileCacheEntry['pgl'];
    entry.realtimeManager = {
      stop: jest.fn(async () => {
        throw realtimeFailure;
      })
    };
    entry.poolLease = makePoolLease();

    await expect(Promise.all([
      disposeUncachedEntry(entry, 'aggregate-release-failure'),
      disposeUncachedEntry(entry, 'aggregate-release-failure')
    ])).rejects.toBe(releaseFailure);
    expect(entry.pgl.release).toHaveBeenCalledTimes(1);
    expect(entry.realtimeManager.stop).toHaveBeenCalledTimes(1);
    expect(entry.poolLease.release).toHaveBeenCalledTimes(1);
  });
});

describe('timer cleanup', () => {
  it('clears the timeout when work settles first', async () => {
    jest.useFakeTimers();
    try {
      const result = await raceWithClearedTimeout(Promise.resolve('done'), 60_000);
      expect(result).toEqual({ timedOut: false, value: 'done' });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
