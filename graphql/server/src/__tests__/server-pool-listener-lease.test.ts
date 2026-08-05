import { EventEmitter } from 'node:events';

jest.mock('pg-cache', () => {
  class MockPgPoolCapacityError extends Error {
    readonly code = 'PG_POOL_CAPACITY';
    readonly retryAfterSeconds = 15;
  }
  return {
    acquirePgPool: jest.fn(),
    getPgPool: jest.fn(),
    pgCache: {
      registerCleanupCallback: jest.fn(() => jest.fn())
    },
    PgPoolCapacityError: MockPgPoolCapacityError
  };
});

import type { PoolClient } from 'pg';
import { acquirePgPool, PgPoolCapacityError } from 'pg-cache';

import { Server } from '../server';

const mockAcquirePgPool = acquirePgPool as jest.MockedFunction<typeof acquirePgPool>;

class FakeClient extends EventEmitter {
  query = jest.fn().mockResolvedValue({});
}

const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const serverWithoutConstructor = (): Server => {
  const server = Object.create(Server.prototype) as Server & Record<string, unknown>;
  Object.assign(server, {
    opts: { pg: { database: 'routing' } },
    listenAttempt: null,
    listenRetryTimer: null,
    listenCleanupTasks: new Set<Promise<void>>(),
    shuttingDown: false,
    closed: false,
    moduleRegistry: { invalidate: jest.fn() }
  });
  server.error = jest.fn();
  server.log = jest.fn();
  server.flush = jest.fn().mockResolvedValue(undefined);
  return server;
};

const poolLease = (connect: jest.Mock) => {
  const release = jest.fn();
  return {
    value: {
      pool: { connect } as never,
      identity: 'pg:control',
      release
    },
    release
  };
};

describe('server LISTEN PostgreSQL pool-lease lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses a dedicated identity so a one-client routing pool is not starved', async () => {
    const retained = poolLease(jest.fn());
    mockAcquirePgPool.mockReturnValue(retained.value);
    const server = serverWithoutConstructor();

    server.addEventListener();

    expect(mockAcquirePgPool).toHaveBeenCalledWith(
      { database: 'routing' },
      { purpose: 'notifications' }
    );
    (server as unknown as { shuttingDown: boolean }).shuttingDown = true;
    await server.removeEventListener();
  });

  it('releases the pool lease and schedules one retry when checkout fails', async () => {
    const retained = poolLease(jest.fn((callback) => {
      callback(new Error('connect failed'));
    }));
    mockAcquirePgPool.mockReturnValue(retained.value);
    const server = serverWithoutConstructor();

    server.addEventListener();
    await settle();

    expect(retained.release).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);
    await server.removeEventListener();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('releases both ownership layers and cancels retry when LISTEN rejects', async () => {
    const client = new FakeClient();
    const listenFailure = new Error('LISTEN failed');
    client.query.mockRejectedValueOnce(listenFailure);
    const releaseClient = jest.fn();
    const retained = poolLease(jest.fn((callback) => {
      callback(null, client as unknown as PoolClient, releaseClient);
    }));
    mockAcquirePgPool.mockReturnValue(retained.value);
    const server = serverWithoutConstructor();

    server.addEventListener();
    await settle();

    expect(releaseClient).toHaveBeenCalledTimes(1);
    expect(releaseClient).toHaveBeenCalledWith(listenFailure);
    expect(retained.release).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);
    await server.removeEventListener();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('coalesces repeated connection errors into one cleanup and one reconnect', async () => {
    const firstClient = new FakeClient();
    const firstClientRelease = jest.fn();
    const first = poolLease(jest.fn((callback) => {
      callback(null, firstClient as unknown as PoolClient, firstClientRelease);
    }));
    const secondConnect = jest.fn();
    const second = poolLease(secondConnect);
    mockAcquirePgPool
      .mockReturnValueOnce(first.value)
      .mockReturnValueOnce(second.value);
    const server = serverWithoutConstructor();

    server.addEventListener();
    await settle();
    const registry = (server as unknown as {
      moduleRegistry: { invalidate: jest.Mock };
    }).moduleRegistry;
    expect(registry.invalidate).toHaveBeenCalledTimes(1);
    const errorHandler = firstClient.listeners('error')[0] as (error: Error) => void;
    const socketFailure = new Error('socket failed');
    errorHandler(socketFailure);
    errorHandler(new Error('duplicate socket failure'));
    await settle();

    expect(firstClientRelease).toHaveBeenCalledTimes(1);
    expect(firstClientRelease).toHaveBeenCalledWith(socketFailure);
    expect(first.release).toHaveBeenCalledTimes(1);
    expect(registry.invalidate).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(1);

    await jest.advanceTimersByTimeAsync(5000);
    expect(mockAcquirePgPool).toHaveBeenCalledTimes(2);
    expect(secondConnect).toHaveBeenCalledTimes(1);

    (server as unknown as { shuttingDown: boolean }).shuttingDown = true;
    await server.removeEventListener();
    expect(second.release).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('releases a late successful checkout after shutdown without double-releasing its pool', async () => {
    let connectCallback!: (
      error: Error | null,
      client?: PoolClient,
      release?: () => void
    ) => void;
    const retained = poolLease(jest.fn((callback) => {
      connectCallback = callback;
    }));
    mockAcquirePgPool.mockReturnValue(retained.value);
    const server = serverWithoutConstructor();
    const client = new FakeClient();
    const releaseClient = jest.fn();

    server.addEventListener();
    (server as unknown as { shuttingDown: boolean }).shuttingDown = true;
    await server.removeEventListener();
    connectCallback(null, client as unknown as PoolClient, releaseClient);
    await settle();

    expect(client.query).not.toHaveBeenCalled();
    expect(releaseClient).toHaveBeenCalledTimes(1);
    expect(retained.release).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('UNLISTENs and releases exactly once during active shutdown', async () => {
    const client = new FakeClient();
    const releaseClient = jest.fn();
    const retained = poolLease(jest.fn((callback) => {
      callback(null, client as unknown as PoolClient, releaseClient);
    }));
    mockAcquirePgPool.mockReturnValue(retained.value);
    const server = serverWithoutConstructor();

    server.addEventListener();
    await settle();
    (server as unknown as { shuttingDown: boolean }).shuttingDown = true;
    await server.removeEventListener();

    expect(client.query).toHaveBeenNthCalledWith(1, 'LISTEN "schema:update"');
    expect(client.query).toHaveBeenNthCalledWith(2, 'UNLISTEN "schema:update"');
    expect(releaseClient).toHaveBeenCalledTimes(1);
    expect(retained.release).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels a capacity retry timer during shutdown', async () => {
    mockAcquirePgPool.mockImplementation(() => {
      throw new PgPoolCapacityError(1, 1, 1);
    });
    const server = serverWithoutConstructor();

    server.addEventListener();
    expect(jest.getTimerCount()).toBe(1);
    (server as unknown as { shuttingDown: boolean }).shuttingDown = true;
    await server.removeEventListener();

    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(15_000);
    expect(mockAcquirePgPool).toHaveBeenCalledTimes(1);
  });
});
