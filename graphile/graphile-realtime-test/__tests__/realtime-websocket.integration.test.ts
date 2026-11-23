/**
 * E2E integration tests for realtime subscriptions over a real WebSocket.
 *
 * Uses the deep getConnections() API from graphile-realtime-test which wraps
 * pgsql-test (database) + graphile-build (schema) + graphql-ws (transport)
 * into a single setup call.
 *
 * Flow:
 *   1. getConnections() seeds a PostgreSQL test database
 *   2. Builds a GraphQL schema with RealtimeSubscriptionsPlugin
 *   3. Starts an HTTP + WebSocket server
 *   4. Returns ws handle for creating clients, firing events, and teardown
 */

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { subscribe as grafastSubscribe } from 'grafast';
import { parse } from 'graphql';
import { seed } from 'pgsql-test';

import type { GetConnectionsResult } from '../src/get-connections';
import { getConnections } from '../src/get-connections';
import { delay } from '../src/ws-helpers';

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('realtime WebSocket E2E (real graphql-ws over ws)', () => {
  let ctx: GetConnectionsResult;
  let wsClient: ReturnType<GetConnectionsResult['ws']['createClient']>;

  async function createRows(ids: string[]) {
    await ctx.db.query('INSERT INTO realtime_test.items (id, name) SELECT id, id::text FROM unnest($1::uuid[]) AS rows(id)', [ids]);
    await ctx.db.publish();
  }

  async function received(events: unknown[], count: number) {
    for (let i = 0; i < 200 && events.length < count; i++) await delay(25);
    expect(events).toHaveLength(count);
  }

  beforeAll(async () => {
    ctx = await getConnections(
      {
        schemas: ['realtime_test'],
        realtimeTables: ['items'],
      },
      [seed.sqlfile([join(__dirname, '../sql/realtime-seed.sql')])],
    );

    wsClient = ctx.ws.createClient();
    await delay(300);
  }, 30000);

  afterAll(async () => {
    if (ctx) {
      await ctx.teardown();
    }
  }, 15000);

  beforeEach(async () => { await ctx.pg.beforeEach(); await ctx.db.beforeEach(); });
  afterEach(async () => { await ctx.db.afterEach(); await ctx.pg.afterEach(); });

  // ─── Direct grafast.subscribe sanity check ─────────────────────────────

  it('(sanity) direct grafastSubscribe works with this setup', async () => {
    const document = parse(`subscription { onItemChanged { event overflow } }`);
    const pgSubscriberKey =
      (ctx.pgService as any).pgSubscriberKey ?? 'pgSubscriber';
    const contextValue = { [pgSubscriberKey]: ctx.pgSubscriber };
    const result = await grafastSubscribe({
      schema: ctx.schema,
      document,
      contextValue,
      resolvedPreset: ctx.resolvedPreset,
    });
    expect(result).toBeDefined();
    expect(Symbol.asyncIterator in (result as any)).toBe(true);

    if (result != null && Symbol.asyncIterator in (result as any)) {
      await (result as AsyncIterableIterator<any>).return?.();
    }
  }, 15000);

  // ─── Basic connectivity ───────────────────────────────────────────────

  it('establishes a WebSocket connection and receives INSERT events', async () => {
    const testId = randomUUID();
    await createRows([testId]);

    const eventPromise = ctx.ws.nextEvent<{
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
    await ctx.notifyChange('items', 'INSERT', [testId]);
    await ctx.pg.publish();

    const data = await eventPromise;
    expect(data).toBeDefined();
    expect(data.onItemChanged).toBeDefined();
    expect(data.onItemChanged.event).toBe('INSERT');
    expect(data.onItemChanged.overflow).toBe(false);
  }, 15000);

  // ─── Multiple DML operations ──────────────────────────────────────────

  it('delivers UPDATE and DELETE events over WebSocket', async () => {
    const id = randomUUID();
    await createRows([id]);
    const { events, unsubscribe } = ctx.ws.collectEvents<{ onItemChanged: { event: string; rowId: string; overflow: boolean } }>(
      wsClient, 'subscription { onItemChanged { event rowId overflow item { name } } }'
    );
    try {
      await delay(300);
      await ctx.notifyChange('items', 'UPDATE', [id]);
      await ctx.pg.publish();
      await received(events, 1);
      await ctx.db.query('DELETE FROM realtime_test.items WHERE id = $1', [id]);
      await ctx.db.publish();
      await ctx.notifyChange('items', 'DELETE', [id]);
      await ctx.pg.publish();
      await received(events, 2);
      expect(events).toEqual([
        { onItemChanged: { event: 'UPDATE', rowId: id, overflow: false, item: { name: id } } },
        { onItemChanged: { event: 'DELETE', rowId: id, overflow: false, item: null } }
      ]);
    } finally {
      unsubscribe();
    }
  }, 15000);

  // ─── Authorized overflow ─────────────────────────────────────────────

  it('delivers 50 visible events and one id-less overflow for a 61-row batch', async () => {
    const ids = Array.from({ length: 61 }, () => randomUUID());
    await createRows(ids);
    const { events, unsubscribe } = ctx.ws.collectEvents<{ onItemChanged: { event: string; rowId: string | null; overflow: boolean } }>(
      wsClient, 'subscription { onItemChanged { event rowId overflow item { name } } }'
    );
    try {
      await delay(300);
      await ctx.notifyChange('items', 'INSERT', ids);
      await ctx.pg.publish();
      await received(events, 51);
      expect(events.slice(0, 50)).toEqual(ids.slice(0, 50).map(id => ({
        onItemChanged: { event: 'INSERT', rowId: id, overflow: false, item: { name: id } }
      })));
      expect(events[50]).toEqual({ onItemChanged: { event: 'INSERT', rowId: null, overflow: true, item: null } });
    } finally {
      unsubscribe();
    }
  }, 15000);

  // ─── Sparse set filtering ────────────────────────────────────────────

  it('filters events by ids argument (sparse set) over WebSocket', async () => {
    const watchedId = randomUUID();
    const unwatchedId = randomUUID();
    await createRows([watchedId, unwatchedId]);

    const { events, unsubscribe } = ctx.ws.collectEvents<{
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

    await ctx.notifyChange('items', 'UPDATE', [unwatchedId]);
    await ctx.pg.publish();
    await delay(200);

    await ctx.notifyChange('items', 'INSERT', [watchedId]);
    await ctx.pg.publish();
    await delay(500);

    unsubscribe();

    // The change to the unwatched row must produce no event at all. This
    // previously asserted the opposite — one event with `event: 'UNKNOWN'`
    // and a null rowId — which told a subscriber that *something* it isn't
    // watching changed, and when.
    expect(events).toHaveLength(1);
    expect(events[0].onItemChanged.event).toBe('INSERT');
    expect(events[0].onItemChanged.rowId).toBe(watchedId);
  }, 15000);

  // ─── Multiple concurrent WebSocket subscribers ────────────────────────

  it('delivers events to multiple concurrent WebSocket subscribers', async () => {
    const testId = randomUUID();
    await createRows([testId]);

    const promise1 = ctx.ws.nextEvent<{
      onItemChanged: { event: string };
    }>(
      wsClient,
      `subscription { onItemChanged { event } }`,
    );

    const wsClient2 = ctx.ws.createClient();
    const promise2 = ctx.ws.nextEvent<{
      onItemChanged: { event: string };
    }>(
      wsClient2,
      `subscription { onItemChanged { event } }`,
    );

    await delay(300);
    await ctx.notifyChange('items', 'INSERT', [testId]);
    await ctx.pg.publish();

    const [data1, data2] = await Promise.all([promise1, promise2]);

    expect(data1.onItemChanged.event).toBe('INSERT');
    expect(data2.onItemChanged.event).toBe('INSERT');

    await wsClient2.dispose();
  }, 15000);

  // ─── Raw NOTIFY payload ───────────────────────────────────────────────

  it('handles raw NOTIFY payloads via WebSocket', async () => {
    const testId = randomUUID();
    await createRows([testId]);

    const eventPromise = ctx.ws.nextEvent<{
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
    await ctx.notify('items', `UPDATE:${testId}`);
    await ctx.pg.publish();

    const data = await eventPromise;
    expect(data.onItemChanged.event).toBe('UPDATE');
    expect(data.onItemChanged.rowId).toBe(testId);
    expect(data.onItemChanged.overflow).toBe(false);
  }, 15000);
});
