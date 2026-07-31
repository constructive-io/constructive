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
    const updatePromise = ctx.ws.nextEvent<{
      onItemChanged: { event: string; overflow: boolean };
    }>(
      wsClient,
      `subscription { onItemChanged { event overflow } }`,
    );
    await delay(300);
    await ctx.notifyChange('items', 'UPDATE', [updateId]);
    const updateData = await updatePromise;
    expect(updateData.onItemChanged.event).toBe('UPDATE');
    expect(updateData.onItemChanged.overflow).toBe(false);

    // DELETE
    const deleteId = randomUUID();
    const deletePromise = ctx.ws.nextEvent<{
      onItemChanged: { event: string; overflow: boolean };
    }>(
      wsClient,
      `subscription { onItemChanged { event overflow } }`,
    );
    await delay(300);
    await ctx.notifyChange('items', 'DELETE', [deleteId]);
    const deleteData = await deletePromise;
    expect(deleteData.onItemChanged.event).toBe('DELETE');
    expect(deleteData.onItemChanged.overflow).toBe(false);
  }, 15000);

  // ─── INVALIDATE (overflow) ────────────────────────────────────────────

  it('delivers INVALIDATE (overflow) events via WebSocket', async () => {
    const eventPromise = ctx.ws.nextEvent<{
      onItemChanged: { event: string; overflow: boolean };
    }>(
      wsClient,
      `subscription { onItemChanged { event overflow } }`,
    );

    await delay(300);
    await ctx.notifyInvalidate('items');

    const data = await eventPromise;
    expect(data.onItemChanged.event).toBe('INVALIDATE');
    expect(data.onItemChanged.overflow).toBe(true);
  }, 15000);

  // ─── Sparse set filtering ────────────────────────────────────────────

  it('filters events by ids argument (sparse set) over WebSocket', async () => {
    const watchedId = randomUUID();
    const unwatchedId = randomUUID();

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
    await delay(200);

    await ctx.notifyChange('items', 'INSERT', [watchedId]);
    await delay(500);

    unsubscribe();

    const relevant = events.filter(e => e.onItemChanged.event !== 'UNKNOWN');
    expect(relevant.length).toBe(1);
    expect(relevant[0].onItemChanged.event).toBe('INSERT');
    expect(relevant[0].onItemChanged.rowId).toBe(watchedId);

    const filtered = events.filter(e => e.onItemChanged.event === 'UNKNOWN');
    expect(filtered.length).toBe(1);
    expect(filtered[0].onItemChanged.rowId).toBeNull();
  }, 15000);

  // ─── Multiple concurrent WebSocket subscribers ────────────────────────

  it('delivers events to multiple concurrent WebSocket subscribers', async () => {
    const testId = randomUUID();

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

    const [data1, data2] = await Promise.all([promise1, promise2]);

    expect(data1.onItemChanged.event).toBe('INSERT');
    expect(data2.onItemChanged.event).toBe('INSERT');

    await wsClient2.dispose();
  }, 15000);

  // ─── Raw NOTIFY payload ───────────────────────────────────────────────

  it('handles raw NOTIFY payloads via WebSocket', async () => {
    const testId = randomUUID();

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
    await ctx.notify('items', `DELETE:${testId}`);

    const data = await eventPromise;
    expect(data.onItemChanged.event).toBe('DELETE');
    expect(data.onItemChanged.overflow).toBe(false);
  }, 15000);
});
