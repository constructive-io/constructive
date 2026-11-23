import { svcCache } from '@pgpmjs/server-utils';
import { EventEmitter } from 'events';
import { graphileCache } from 'graphile-cache';
import { clearStorageModuleCache, loadAllStorageModules } from 'graphile-presigned-url-plugin';
import type { Pool, PoolClient } from 'pg';

import { Server } from '../server';

class FakeClient extends EventEmitter {
  queries: string[] = [];
  queryResult: Promise<unknown> = Promise.resolve({ rows: [] });

  query(sql: string): Promise<unknown> {
    this.queries.push(sql);
    return this.queryResult;
  }
}

const asPoolClient = (client: FakeClient): PoolClient => client as unknown as PoolClient;

const createServer = () => {
  const server = new Server({ pg: { database: 'notify_listener_test' } });
  const reconnects: number[] = [];
  jest.spyOn(server, 'addEventListener').mockImplementation(() => {
    reconnects.push(Date.now());
  });
  servers.push(server);
  return { server, reconnects };
};

const servers: Server[] = [];

describe('notify listener', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    for (const server of servers.splice(0)) await server.close();
    svcCache.clear();
    graphileCache.clear();
    clearStorageModuleCache();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  it('attaches the error handler before issuing the LISTEN', () => {
    const { server } = createServer();
    const client = new FakeClient();
    const listenerCounts: number[] = [];
    jest.spyOn(client, 'query').mockImplementation((sql: string) => {
      listenerCounts.push(client.listenerCount('error'));
      client.queries.push(sql);
      return Promise.resolve({ rows: [] });
    });

    server.listenForChanges(null, asPoolClient(client), () => {});

    expect(client.queries).toEqual(['LISTEN "schema:update"']);
    expect(listenerCounts).toEqual([1]);
  });

  it('releases and reconnects when the connection drops', () => {
    const { server, reconnects } = createServer();
    const client = new FakeClient();
    let released = 0;

    server.listenForChanges(null, asPoolClient(client), () => {
      released += 1;
    });
    client.emit('error', new Error('Connection terminated unexpectedly'));

    expect(released).toBe(1);
    expect(reconnects).toHaveLength(0);
    jest.advanceTimersByTime(5000);
    expect(reconnects).toHaveLength(1);
    expect(client.listenerCount('error')).toBe(0);
  });

  it('tears down only once when the connection drops repeatedly', () => {
    const { server, reconnects } = createServer();
    const client = new FakeClient();
    let released = 0;

    server.listenForChanges(null, asPoolClient(client), () => {
      released += 1;
    });
    const onError = client.listeners('error')[0] as (e: Error) => void;
    onError(new Error('first'));
    onError(new Error('second'));

    expect(released).toBe(1);
    expect(reconnects).toHaveLength(0);
    jest.advanceTimersByTime(5000);
    expect(reconnects).toHaveLength(1);
  });

  it('observes a failing LISTEN and reconnects', async () => {
    const { server, reconnects } = createServer();
    const client = new FakeClient();
    client.queryResult = Promise.reject(new Error('LISTEN failed'));
    let released = 0;

    server.listenForChanges(null, asPoolClient(client), () => {
      released += 1;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(released).toBe(1);
    expect(reconnects).toHaveLength(0);
    jest.advanceTimersByTime(5000);
    expect(reconnects).toHaveLength(1);
  });

  it('destroys a connection that ends without an error and retries once', () => {
    const { server, reconnects } = createServer();
    const client = new FakeClient();
    const release = jest.fn();
    server.listenForChanges(null, asPoolClient(client), release);
    client.emit('end');
    client.emit('end');
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(true);
    jest.advanceTimersByTime(5000);
    expect(reconnects).toHaveLength(1);
  });

  it('invalidates warmed routing entries only after LISTEN succeeds', async () => {
    const { server } = createServer();
    const client = new FakeClient();
    let subscribed!: () => void;
    client.queryResult = new Promise<void>(resolve => { subscribed = resolve; });
    svcCache.set('old-host', { databaseId: 'db' } as any);
    graphileCache.set('old-host', { heapBytes: 1 } as any);
    const discovery = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    await loadAllStorageModules(discovery, 'db');
    server.listenForChanges(null, asPoolClient(client), jest.fn());
    expect(svcCache.has('old-host')).toBe(true);
    subscribed();
    await Promise.resolve();
    expect(svcCache.has('old-host')).toBe(false);
    expect(graphileCache.has('old-host')).toBe(false);
    await loadAllStorageModules(discovery, 'db');
    expect(discovery.query).toHaveBeenCalledTimes(2);
  });

  it('bounds a stalled LISTEN and ignores its late success', async () => {
    const { server, reconnects } = createServer();
    const client = new FakeClient();
    const release = jest.fn();
    let subscribed!: () => void;
    client.queryResult = new Promise<void>(resolve => { subscribed = resolve; });
    server.listenForChanges(null, asPoolClient(client), release);
    await jest.advanceTimersByTimeAsync(5000);
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(true);
    svcCache.set('new-host', { databaseId: 'db' } as any);
    subscribed();
    await Promise.resolve();
    expect(svcCache.has('new-host')).toBe(true);
    await jest.advanceTimersByTimeAsync(5000);
    expect(reconnects).toHaveLength(1);
  });

  it('detects a silent connection with a bounded heartbeat', async () => {
    const { server, reconnects } = createServer();
    const client = new FakeClient();
    const release = jest.fn();
    server.listenForChanges(null, asPoolClient(client), release);
    await Promise.resolve();
    client.queryResult = new Promise(() => {});
    await jest.advanceTimersByTimeAsync(30000);
    expect(client.queries).toEqual(['LISTEN "schema:update"', 'SELECT 1']);
    await jest.advanceTimersByTimeAsync(5000);
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(true);
    await jest.advanceTimersByTimeAsync(5000);
    expect(reconnects).toHaveLength(1);
  });

  it('continues probing a healthy connection without reconnecting', async () => {
    const { server, reconnects } = createServer();
    const client = new FakeClient();
    const release = jest.fn();
    server.listenForChanges(null, asPoolClient(client), release);
    await jest.advanceTimersByTimeAsync(90000);
    expect(client.queries).toEqual(['LISTEN "schema:update"', 'SELECT 1', 'SELECT 1', 'SELECT 1']);
    expect(release).not.toHaveBeenCalled();
    expect(reconnects).toHaveLength(0);
  });

  it('closes without waiting for a dead connection and cancels retries', async () => {
    const { server, reconnects } = createServer();
    const client = new FakeClient();
    const release = jest.fn();
    client.queryResult = new Promise(() => {});
    server.listenForChanges(null, asPoolClient(client), release);
    await server.close();
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(true);
    await jest.advanceTimersByTimeAsync(60000);
    expect(reconnects).toHaveLength(0);
  });

  it('handles a rejected notification flush by invalidating the caches', async () => {
    const { server } = createServer();
    const client = new FakeClient();
    server.listenForChanges(null, asPoolClient(client), jest.fn());
    await Promise.resolve();
    svcCache.set('old-host', { databaseId: 'db' } as any);
    jest.spyOn(server, 'flush').mockRejectedValue(new Error('routing lookup failed'));
    client.emit('notification', { channel: 'schema:update', payload: 'db' });
    await Promise.resolve();
    expect(svcCache.has('old-host')).toBe(false);
  });

  it('coalesces connection attempts and destroys a connection acquired after shutdown', async () => {
    const server = new Server({ pg: { database: 'notify_listener_test' } });
    servers.push(server);
    let connected!: (err: Error | null, client: PoolClient, release: (destroy?: boolean) => void) => void;
    const connect = jest.fn(callback => { connected = callback; });
    jest.spyOn(server, 'getPool').mockReturnValue({ connect } as unknown as Pool);
    server.addEventListener();
    server.addEventListener();
    expect(connect).toHaveBeenCalledTimes(1);
    await server.close();
    const client = new FakeClient();
    const release = jest.fn();
    connected(null, asPoolClient(client), release);
    expect(release).toHaveBeenCalledWith(true);
    expect(client.queries).toEqual([]);
    await jest.advanceTimersByTimeAsync(60000);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('retries a failed connection with backoff and cancels the retry on close', async () => {
    const { server, reconnects } = createServer();
    server.listenForChanges(new Error('offline'), undefined!, undefined!);
    await jest.advanceTimersByTimeAsync(4999);
    expect(reconnects).toHaveLength(0);
    await server.close();
    await jest.advanceTimersByTimeAsync(60000);
    expect(reconnects).toHaveLength(0);
  });

  it('keeps unrelated client handlers when tearing down its own subscription', async () => {
    const { server } = createServer();
    const client = new FakeClient();
    const onError = jest.fn();
    client.on('error', onError);
    server.listenForChanges(null, asPoolClient(client), jest.fn());
    await server.close();
    expect(client.listeners('error')).toEqual([onError]);
    expect(client.listenerCount('notification')).toBe(0);
    expect(client.listenerCount('end')).toBe(0);
  });
});
