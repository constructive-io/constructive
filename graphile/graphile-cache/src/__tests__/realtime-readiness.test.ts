import {
  createGraphileRealtimeHealth,
  createGraphileRealtimeNodeId,
  DEFAULT_GRAPHILE_REALTIME_SCHEMA,
  GraphileRealtimeStartupError,
  startConfiguredRealtime,
  withGraphileRealtimeFailure
} from '../realtime-readiness';

const makeManager = () => {
  const start = jest.fn().mockResolvedValue(undefined);
  const stop = jest.fn().mockResolvedValue(undefined);
  const constructor = jest.fn().mockImplementation(() => ({ start, stop }));
  return { constructor, start, stop };
};

describe('configured realtime instance readiness', () => {
  it('fails closed and releases PostGraphile when the subscriber is missing', async () => {
    const manager = makeManager();
    const releasePostGraphile = jest.fn().mockResolvedValue(undefined);

    await expect(startConfiguredRealtime({
      cacheKey: 'missing-subscriber',
      resolvedPreset: {
        pgServices: [{ adaptorSettings: { pool: {} } }]
      },
      allowedSourceSchemas: ['tenant_a'],
      releasePostGraphile,
      loadManager: async () => manager.constructor
    })).rejects.toBeInstanceOf(GraphileRealtimeStartupError);

    expect(manager.constructor).not.toHaveBeenCalled();
    expect(releasePostGraphile).toHaveBeenCalledTimes(1);
  });

  it('stops a partially started manager and releases PostGraphile', async () => {
    const manager = makeManager();
    const startupFailure = new Error('realtime startup failed');
    manager.start.mockRejectedValue(startupFailure);
    const releasePostGraphile = jest.fn().mockResolvedValue(undefined);

    await expect(startConfiguredRealtime({
      cacheKey: 'start-failure',
      resolvedPreset: {
        pgServices: [{
          pgSubscriber: {},
          adaptorSettings: { pool: {} }
        }]
      },
      allowedSourceSchemas: ['tenant_a'],
      releasePostGraphile,
      loadManager: async () => manager.constructor
    })).rejects.toMatchObject({
      code: 'GRAPHILE_REALTIME_STARTUP_FAILED',
      cause: startupFailure
    });

    expect(manager.stop).toHaveBeenCalledTimes(1);
    expect(releasePostGraphile).toHaveBeenCalledTimes(1);
  });

  it('returns a started manager without releasing a healthy generation', async () => {
    const manager = makeManager();
    const releasePostGraphile = jest.fn().mockResolvedValue(undefined);

    const result = await startConfiguredRealtime({
      cacheKey: 'ready',
      resolvedPreset: {
        pgServices: [{
          pgSubscriber: { eventEmitter: { emit: jest.fn() } },
          adaptorSettings: { pool: {} }
        }]
      },
      allowedSourceSchemas: ['tenant_a'],
      releasePostGraphile,
      loadManager: async () => manager.constructor,
      replicaIdentity: 'replica-a'
    });

    expect(result).toEqual({ start: manager.start, stop: manager.stop });
    expect(manager.constructor).toHaveBeenCalledWith(expect.objectContaining({
      schema: DEFAULT_GRAPHILE_REALTIME_SCHEMA,
      allowedSourceSchemas: ['tenant_a'],
      nodeId: 'graphile-cache:replica-a:ready'
    }));
    expect(manager.start).toHaveBeenCalledTimes(1);
    expect(releasePostGraphile).not.toHaveBeenCalled();
  });

  it('passes an exact custom cursor schema to the manager', async () => {
    const manager = makeManager();
    const releasePostGraphile = jest.fn().mockResolvedValue(undefined);
    const onFatalError = jest.fn();

    await startConfiguredRealtime({
      cacheKey: 'tenant-a',
      resolvedPreset: {
        pgServices: [{
          pgSubscriber: { eventEmitter: { emit: jest.fn() } },
          adaptorSettings: { pool: {} }
        }]
      },
      realtimeSchema: 'ctf_a_realtime',
      allowedSourceSchemas: ['ctf_a'],
      onFatalError,
      releasePostGraphile,
      loadManager: async () => manager.constructor,
      replicaIdentity: 'replica-a'
    });

    expect(manager.constructor).toHaveBeenCalledWith({
      pgSubscriber: { eventEmitter: { emit: expect.any(Function) } },
      pool: {},
      nodeId: 'graphile-cache:replica-a:tenant-a',
      schema: 'ctf_a_realtime',
      allowedSourceSchemas: ['ctf_a'],
      onFatalError
    });
    expect(releasePostGraphile).not.toHaveBeenCalled();
  });

  it('uses an explicit generation publisher and configured cursor intervals', async () => {
    const manager = makeManager();
    const releasePostGraphile = jest.fn().mockResolvedValue(undefined);
    const publisher = {
      assertTopics: jest.fn(),
      publish: jest.fn()
    };

    await startConfiguredRealtime({
      cacheKey: 'shared-exact',
      resolvedPreset: {
        pgServices: [{ adaptorSettings: { pool: {} } }]
      },
      publisher,
      pollIntervalMs: 30_000,
      heartbeatIntervalMs: 90_000,
      allowedSourceSchemas: ['tenant_a'],
      releasePostGraphile,
      loadManager: async () => manager.constructor
    });

    expect(manager.constructor).toHaveBeenCalledWith(expect.objectContaining({
      publisher,
      pollIntervalMs: 30_000,
      heartbeatIntervalMs: 90_000
    }));
    expect(manager.constructor.mock.calls[0][0]).not.toHaveProperty('pgSubscriber');
  });

  it('fails closed before loading a manager when no source schema is allowed', async () => {
    const manager = makeManager();
    const releasePostGraphile = jest.fn().mockResolvedValue(undefined);

    await expect(startConfiguredRealtime({
      cacheKey: 'no-sources',
      resolvedPreset: {
        pgServices: [{
          pgSubscriber: { eventEmitter: { emit: jest.fn() } },
          adaptorSettings: { pool: {} }
        }]
      },
      allowedSourceSchemas: [],
      releasePostGraphile,
      loadManager: async () => manager.constructor
    })).rejects.toMatchObject({
      code: 'GRAPHILE_REALTIME_STARTUP_FAILED'
    });

    expect(manager.constructor).not.toHaveBeenCalled();
    expect(releasePostGraphile).toHaveBeenCalledTimes(1);
  });

  it('separates replica cursor identities while retaining the exact contract key', () => {
    const cacheKey = 'graphile:v1:contract-a';
    const first = createGraphileRealtimeNodeId(cacheKey, 'replica-a');
    const second = createGraphileRealtimeNodeId(cacheKey, 'replica-b');

    expect(first).not.toBe(second);
    expect(first).toBe(`graphile-cache:replica-a:${cacheKey}`);
    expect(second).toBe(`graphile-cache:replica-b:${cacheKey}`);
  });

  it('latches the first fatal delivery failure for one exact generation', () => {
    const health = createGraphileRealtimeHealth();
    const first = Object.assign(new Error('foreign source'), {
      code: 'REALTIME_SOURCE_SCHEMA_VIOLATION'
    });
    const second = Object.assign(new Error('emitter missing'), {
      code: 'REALTIME_SUBSCRIBER_UNAVAILABLE'
    });

    const failed = withGraphileRealtimeFailure(health, first, 1_000);
    const stillFailed = withGraphileRealtimeFailure(failed, second, 2_000);

    expect(health).toEqual({ status: 'healthy' });
    expect(failed).toEqual({
      status: 'failed',
      failureCode: 'REALTIME_SOURCE_SCHEMA_VIOLATION',
      failedAt: 1_000
    });
    expect(stillFailed).toBe(failed);
  });
});
