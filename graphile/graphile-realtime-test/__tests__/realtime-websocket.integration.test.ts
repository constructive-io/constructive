/**
 * E2E integration tests for realtime subscriptions over a real WebSocket.
 *
 * Unlike the grafast.subscribe()-based tests in realtime.integration.test.ts,
 * these tests spin up a real WebSocket server (using graphql-ws/use/ws) backed
 * by the same PostGraphile schema + grafast subscription engine, then connect
 * a graphql-ws client over an actual WebSocket transport.
 *
 * Flow:
 *   1. Seed a PostgreSQL test database with a simple @realtime-tagged table
 *   2. Build a GraphQL schema with RealtimeSubscriptionsPlugin (via makeSchema)
 *   3. Start an HTTP + WebSocket server using `ws` + `graphql-ws` useServer
 *   4. Connect via graphql-ws client over a real WebSocket
 *   5. Subscribe to onItemChanged
 *   6. Fire pg_notify and verify events arrive over the WebSocket
 */

import { createServer, type Server as HttpServer } from 'node:http';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';

import { subscribe as grafastSubscribe } from 'grafast';
import { makeSchema } from 'graphile-build';
import { defaultPreset as graphileBuildDefaultPreset } from 'graphile-build';
import { defaultPreset as graphileBuildPgDefaultPreset } from 'graphile-build-pg';
import { makePgService } from 'postgraphile/adaptors/pg';
import { parse } from 'graphql';
import type { GraphQLSchema, ExecutionResult } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import { seed, getConnections } from 'pgsql-test';
import type { GetConnectionResult } from 'pgsql-test';
import { createClient, type Client as GqlWsClient } from 'graphql-ws';
import { WebSocketServer, WebSocket } from 'ws';
import { useServer } from 'graphql-ws/use/ws';

import { makeRealtimeSmartTagsPlugin } from '../src/smart-tags';
import { createRealtimeSubscriptionsPlugin } from 'graphile-realtime-subscriptions';
import { notify, notifyChange, notifyInvalidate } from '../src/notify';

// ─── Helpers ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Collect the next event from a graphql-ws subscription.
 * Returns a promise that resolves with the first `next` payload,
 * or rejects on error / timeout.
 */
function nextEvent<T = Record<string, unknown>>(
  client: GqlWsClient,
  query: string,
  variables?: Record<string, unknown>,
  timeoutMs = 10000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`nextEvent timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const unsubscribe = client.subscribe(
      { query, variables },
      {
        next(value) {
          clearTimeout(timer);
          unsubscribe();
          resolve(value.data as T);
        },
        error(err) {
          clearTimeout(timer);
          unsubscribe();
          reject(Array.isArray(err) ? err[0] : err);
        },
        complete() {
          clearTimeout(timer);
          reject(new Error('Subscription completed without yielding a value'));
        },
      },
    );
  });
}

/**
 * Subscribe and collect events into an array until unsubscribe is called.
 */
function collectWsEvents<T = Record<string, unknown>>(
  client: GqlWsClient,
  query: string,
  variables?: Record<string, unknown>,
): { events: T[]; unsubscribe: () => void } {
  const events: T[] = [];
  const unsubscribe = client.subscribe(
    { query, variables },
    {
      next(value) {
        events.push(value.data as T);
      },
      error() { /* swallow */ },
      complete() { /* done */ },
    },
  );
  return { events, unsubscribe };
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('realtime WebSocket E2E (real graphql-ws over ws)', () => {
  let conn: GetConnectionResult;
  let schema: GraphQLSchema;
  let resolvedPreset: GraphileConfig.ResolvedPreset;
  let pgSubscriber: any;
  let pgSubscriberKey: string;
  let pgServiceRef: any;

  let httpServer: HttpServer;
  let wss: WebSocketServer;
  let serverCleanup: { dispose: () => Promise<void> };
  let wsClient: GqlWsClient;

  beforeAll(async () => {
    // 1. Seed the test database
    conn = await getConnections(
      {
        schemas: ['realtime_test'],
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, '../sql/realtime-seed.sql')])],
    );

    const pgPool = conn.manager.getPool(conn.pg.config);

    // 2. Build the GraphQL schema with realtime plugins
    const smartTagsPlugin = makeRealtimeSmartTagsPlugin({
      items: { realtime: true },
    });
    const realtimePlugin = createRealtimeSubscriptionsPlugin();

    const pgService = makePgService({
      pool: pgPool,
      schemas: ['realtime_test'],
    });
    pgServiceRef = pgService;

    const completePreset: GraphileConfig.Preset = {
      extends: [graphileBuildDefaultPreset, graphileBuildPgDefaultPreset],
      disablePlugins: ['NodePlugin'],
      plugins: [smartTagsPlugin, realtimePlugin],
      pgServices: [pgService],
    };

    const result = await makeSchema(completePreset);
    schema = result.schema;
    resolvedPreset = result.resolvedPreset;

    // Extract pgSubscriber for the grafast context
    pgSubscriber = (pgService as any).pgSubscriber;
    pgSubscriberKey = (pgService as any).pgSubscriberKey ?? 'pgSubscriber';

    // 3. Start HTTP server + WebSocket server
    httpServer = createServer();
    wss = new WebSocketServer({ server: httpServer, path: '/graphql' });

    // Wire graphql-ws server to the ws WebSocketServer
    serverCleanup = useServer(
      {
        schema,
        subscribe: async (args) => {
          // Thread the pgSubscriber into the grafast context
          const contextValue = {
            [pgSubscriberKey]: pgSubscriber,
            ...(typeof args.contextValue === 'object' && args.contextValue !== null
              ? args.contextValue as Record<string, unknown>
              : {}),
          };

          try {
            const result = await grafastSubscribe({
              schema: args.schema,
              document: args.document,
              variableValues: args.variableValues as Record<string, unknown> | undefined,
              contextValue,
              resolvedPreset,
            });
            return result as AsyncIterableIterator<ExecutionResult> | ExecutionResult;
          } catch (err: unknown) {
            console.error('[WS subscribe] grafastSubscribe threw:', err);
            throw err;
          }
        },
      },
      wss,
    );

    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = httpServer.address() as AddressInfo;
    const serverUrl = `ws://127.0.0.1:${addr.port}/graphql`;

    // 4. Create graphql-ws client over a real WebSocket
    wsClient = createClient({
      url: serverUrl,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });

    // Give the pgSubscriber time to establish LISTEN
    await delay(300);
  }, 30000);

  afterAll(async () => {
    if (wsClient) {
      await wsClient.dispose();
    }
    if (serverCleanup) {
      await serverCleanup.dispose();
    }
    if (wss) {
      wss.close();
    }
    if (httpServer?.listening) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    if (pgSubscriber && typeof pgSubscriber.release === 'function') {
      await pgSubscriber.release();
    }
    if (pgServiceRef && typeof pgServiceRef.release === 'function') {
      await pgServiceRef.release();
    }
    if (conn) {
      await conn.teardown();
    }
  }, 15000);

  // ─── Direct grafast.subscribe sanity check ─────────────────────────────

  it('(sanity) direct grafastSubscribe works with this setup', async () => {
    const document = parse(`subscription { onItemChanged { event overflow } }`);
    const contextValue = { [pgSubscriberKey]: pgSubscriber };
    const result = await grafastSubscribe({
      schema,
      document,
      contextValue,
      resolvedPreset,
    });
    // If this is an async iterable, the plan works
    expect(result).toBeDefined();
    expect(Symbol.asyncIterator in (result as any)).toBe(true);

    // Clean up
    if (result != null && Symbol.asyncIterator in (result as any)) {
      await (result as AsyncIterableIterator<any>).return?.();
    }
  }, 15000);

  // ─── Basic connectivity ───────────────────────────────────────────────

  it('establishes a WebSocket connection and receives INSERT events', async () => {
    const testId = randomUUID();

    const eventPromise = nextEvent<{
      onItemChanged: { event: string; rowId: string; overflow: boolean };
    }>(
      wsClient,
      `subscription {
        onItemChanged {
          event
          rowId
          overflow
        }
      }`,
    );

    await delay(300);

    await notifyChange(conn.pg.client, 'realtime_test', 'items', 'INSERT', [testId]);

    const data = await eventPromise;
    expect(data).toBeDefined();
    expect(data.onItemChanged).toBeDefined();
    expect(data.onItemChanged.event).toBe('INSERT');
    expect(data.onItemChanged.overflow).toBe(false);
  }, 15000);

  // ─── Multiple DML operations ──────────────────────────────────────────

  it('delivers UPDATE and DELETE events over WebSocket', async () => {
    // UPDATE
    const updateId = randomUUID();
    const updatePromise = nextEvent<{
      onItemChanged: { event: string; overflow: boolean };
    }>(
      wsClient,
      `subscription { onItemChanged { event overflow } }`,
    );
    await delay(300);
    await notifyChange(conn.pg.client, 'realtime_test', 'items', 'UPDATE', [updateId]);
    const updateData = await updatePromise;
    expect(updateData.onItemChanged.event).toBe('UPDATE');
    expect(updateData.onItemChanged.overflow).toBe(false);

    // DELETE
    const deleteId = randomUUID();
    const deletePromise = nextEvent<{
      onItemChanged: { event: string; overflow: boolean };
    }>(
      wsClient,
      `subscription { onItemChanged { event overflow } }`,
    );
    await delay(300);
    await notifyChange(conn.pg.client, 'realtime_test', 'items', 'DELETE', [deleteId]);
    const deleteData = await deletePromise;
    expect(deleteData.onItemChanged.event).toBe('DELETE');
    expect(deleteData.onItemChanged.overflow).toBe(false);
  }, 15000);

  // ─── INVALIDATE (overflow) ────────────────────────────────────────────

  it('delivers INVALIDATE (overflow) events via WebSocket', async () => {
    const eventPromise = nextEvent<{
      onItemChanged: { event: string; overflow: boolean };
    }>(
      wsClient,
      `subscription { onItemChanged { event overflow } }`,
    );

    await delay(300);
    await notifyInvalidate(conn.pg.client, 'realtime_test', 'items');

    const data = await eventPromise;
    expect(data.onItemChanged.event).toBe('INVALIDATE');
    expect(data.onItemChanged.overflow).toBe(true);
  }, 15000);

  // ─── Sparse set filtering ────────────────────────────────────────────

  it('filters events by ids argument (sparse set) over WebSocket', async () => {
    const watchedId = randomUUID();
    const unwatchedId = randomUUID();

    const { events, unsubscribe } = collectWsEvents<{
      onItemChanged: { event: string; rowId: string | null; overflow: boolean };
    }>(
      wsClient,
      `subscription($ids: [UUID!]) {
        onItemChanged(ids: $ids) {
          event
          rowId
          overflow
        }
      }`,
      { ids: [watchedId] },
    );

    await delay(300);

    // Fire for unwatched ID — the event still arrives but with parsed=null
    // (grafast subscriptions don't support event-level inhibition, so the
    // plugin returns null parsed data which surfaces as event='UNKNOWN')
    await notifyChange(conn.pg.client, 'realtime_test', 'items', 'UPDATE', [unwatchedId]);
    await delay(200);

    // Fire for watched ID — should arrive with full data
    await notifyChange(conn.pg.client, 'realtime_test', 'items', 'INSERT', [watchedId]);
    await delay(500);

    unsubscribe();

    // Both NOTIFY events arrive, but the plugin marks non-matching ones
    // with event='UNKNOWN' and rowId=null so clients can filter them out
    const relevant = events.filter(e => e.onItemChanged.event !== 'UNKNOWN');
    expect(relevant.length).toBe(1);
    expect(relevant[0].onItemChanged.event).toBe('INSERT');
    expect(relevant[0].onItemChanged.rowId).toBe(watchedId);

    // The unwatched event should have been marked as UNKNOWN
    const filtered = events.filter(e => e.onItemChanged.event === 'UNKNOWN');
    expect(filtered.length).toBe(1);
    expect(filtered[0].onItemChanged.rowId).toBeNull();
  }, 15000);

  // ─── Multiple concurrent WebSocket subscribers ────────────────────────

  it('delivers events to multiple concurrent WebSocket subscribers', async () => {
    const testId = randomUUID();

    // Subscriber 1 on the existing client
    const promise1 = nextEvent<{
      onItemChanged: { event: string };
    }>(
      wsClient,
      `subscription { onItemChanged { event } }`,
    );

    // Subscriber 2 on a separate WebSocket client
    const addr = httpServer.address() as AddressInfo;
    const wsClient2 = createClient({
      url: `ws://127.0.0.1:${addr.port}/graphql`,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });

    const promise2 = nextEvent<{
      onItemChanged: { event: string };
    }>(
      wsClient2,
      `subscription { onItemChanged { event } }`,
    );

    await delay(300);
    await notifyChange(conn.pg.client, 'realtime_test', 'items', 'INSERT', [testId]);

    const [data1, data2] = await Promise.all([promise1, promise2]);

    expect(data1.onItemChanged.event).toBe('INSERT');
    expect(data2.onItemChanged.event).toBe('INSERT');

    await wsClient2.dispose();
  }, 15000);

  // ─── Raw NOTIFY payload ───────────────────────────────────────────────

  it('handles raw NOTIFY payloads via WebSocket', async () => {
    const testId = randomUUID();

    const eventPromise = nextEvent<{
      onItemChanged: { event: string; rowId: string; overflow: boolean };
    }>(
      wsClient,
      `subscription {
        onItemChanged {
          event
          rowId
          overflow
        }
      }`,
    );

    await delay(300);

    // Fire a raw notify with the exact payload format
    await notify(conn.pg.client, 'realtime_test', 'items', `DELETE:${testId}`);

    const data = await eventPromise;
    expect(data.onItemChanged.event).toBe('DELETE');
    expect(data.onItemChanged.overflow).toBe(false);
  }, 15000);
});
