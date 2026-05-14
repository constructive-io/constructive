/**
 * Integration tests for graphile-realtime-test utilities.
 *
 * These tests dogfood the package's own helpers against a real PostgreSQL
 * database to verify that:
 *   - Smart tag injection generates subscription fields
 *   - grafast.subscribe() returns an async iterator
 *   - pg_notify payloads flow through to subscription events
 *   - INVALIDATE (overflow) payloads are handled correctly
 *   - Sparse set filtering (ids argument) works
 */

import { join } from 'path';
import { seed } from 'pgsql-test';
import {
  createRealtimeTestContext,
  waitForEvent,
  buildPayload,
  buildInvalidatePayload,
} from '../src';
import type { RealtimeTestContext } from '../src';
import type { ExecutionResult } from 'graphql';
import { randomUUID } from 'crypto';

// ─── Schema Discovery Tests ──────────────────────────────────────────────────

describe('schema discovery with @realtime smart tags', () => {
  let ctx: RealtimeTestContext;

  beforeAll(async () => {
    ctx = await createRealtimeTestContext(
      {
        schemas: ['realtime_test'],
        realtimeTables: ['items'],
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, '../sql/realtime-seed.sql')])]
    );
  });

  afterAll(async () => {
    if (ctx) await ctx.teardown();
  });

  it('generates onItemChanged subscription field from @realtime tag', () => {
    const subscriptionType = ctx.schema.getSubscriptionType();
    expect(subscriptionType).toBeDefined();

    const fields = subscriptionType!.getFields();
    expect(fields.onItemChanged).toBeDefined();
  });

  it('generates ItemSubscriptionPayload type with expected fields', () => {
    const payloadType = ctx.schema.getType('ItemSubscriptionPayload');
    expect(payloadType).toBeDefined();

    // Verify the payload type has the expected fields
    const fields = (payloadType as any).getFields();
    expect(fields.event).toBeDefined();
    expect(fields.rowId).toBeDefined();
    expect(fields.overflow).toBeDefined();
    expect(fields.item).toBeDefined();
  });

  it('accepts ids argument on subscription field', () => {
    const subscriptionType = ctx.schema.getSubscriptionType()!;
    const field = subscriptionType.getFields().onItemChanged;
    const idsArg = field.args.find((a) => a.name === 'ids');
    expect(idsArg).toBeDefined();
  });
});

// ─── Notify Helper Tests ─────────────────────────────────────────────────────

describe('notify helpers', () => {
  it('buildPayload formats DML payloads correctly', () => {
    const id1 = randomUUID();
    const id2 = randomUUID();

    expect(buildPayload('INSERT', [id1])).toBe(`INSERT:${id1}`);
    expect(buildPayload('UPDATE', [id1, id2])).toBe(`UPDATE:${id1},${id2}`);
    expect(buildPayload('DELETE', [])).toBe('DELETE');
  });

  it('buildInvalidatePayload returns INVALIDATE', () => {
    expect(buildInvalidatePayload()).toBe('INVALIDATE');
  });
});

// ─── Subscription Flow Tests ─────────────────────────────────────────────────

describe('subscription event flow', () => {
  let ctx: RealtimeTestContext;

  beforeAll(async () => {
    ctx = await createRealtimeTestContext(
      {
        schemas: ['realtime_test'],
        realtimeTables: ['items'],
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, '../sql/realtime-seed.sql')])]
    );
  });

  afterAll(async () => {
    if (ctx) await ctx.teardown();
  });

  it('subscribe() returns an async iterator (not an error result)', async () => {
    const result = await ctx.subscribe(`
      subscription {
        onItemChanged {
          event
          overflow
        }
      }
    `);

    // Should be an async iterator, not an ExecutionResult with errors
    expect(Symbol.asyncIterator in (result as any)).toBe(true);

    // Clean up the subscription
    const iterator = result as AsyncIterableIterator<ExecutionResult>;
    await iterator.return?.();
  });

  it('delivers INSERT event via pg_notify', async () => {
    const iterator = (await ctx.subscribe(`
      subscription {
        onItemChanged {
          event
          rowId
          overflow
        }
      }
    `)) as AsyncIterableIterator<ExecutionResult>;

    // Small delay to let the pgSubscriber establish the LISTEN
    await new Promise((r) => setTimeout(r, 100));

    const testId = randomUUID();
    await ctx.notifyChange('items', 'INSERT', [testId]);

    const event = await waitForEvent(iterator, 5000);
    expect(event.data).toBeDefined();

    const payload = (event.data as any).onItemChanged;
    expect(payload.event).toBe('INSERT');
    expect(payload.overflow).toBe(false);

    await iterator.return?.();
  });

  it('delivers INVALIDATE (overflow) event', async () => {
    const iterator = (await ctx.subscribe(`
      subscription {
        onItemChanged {
          event
          overflow
        }
      }
    `)) as AsyncIterableIterator<ExecutionResult>;

    await new Promise((r) => setTimeout(r, 100));

    await ctx.notifyInvalidate('items');

    const event = await waitForEvent(iterator, 5000);
    expect(event.data).toBeDefined();

    const payload = (event.data as any).onItemChanged;
    expect(payload.event).toBe('INVALIDATE');
    expect(payload.overflow).toBe(true);

    await iterator.return?.();
  });

  it('sparse set: delivers only matching row IDs', async () => {
    const watchedId = randomUUID();
    const unwatchedId = randomUUID();

    const iterator = (await ctx.subscribe(
      `subscription($ids: [UUID!]) {
        onItemChanged(ids: $ids) {
          event
          rowId
          overflow
        }
      }`,
      { ids: [watchedId] }
    )) as AsyncIterableIterator<ExecutionResult>;

    await new Promise((r) => setTimeout(r, 100));

    // Fire a NOTIFY for the unwatched ID — should be filtered out
    await ctx.notifyChange('items', 'UPDATE', [unwatchedId]);

    // Fire a NOTIFY for the watched ID — should be delivered
    await ctx.notifyChange('items', 'UPDATE', [watchedId]);

    const event = await waitForEvent(iterator, 5000);
    expect(event.data).toBeDefined();

    const payload = (event.data as any).onItemChanged;
    expect(payload.event).toBe('UPDATE');
    expect(payload.rowId).toBe(watchedId);

    await iterator.return?.();
  });
});
