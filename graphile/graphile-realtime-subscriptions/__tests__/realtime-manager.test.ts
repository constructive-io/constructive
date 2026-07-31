import { EventEmitter } from 'events';

import { RealtimeManager } from '../src/realtime-manager';
import { entryToChannel,entryToNotifyPayload, extractRowId } from '../src/realtime-manager';
import type { ChangeLogEntry, Queryable } from '../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<ChangeLogEntry> = {}): ChangeLogEntry {
  return {
    id: 'cl-entry-001',
    occurred_at: '2024-01-01T00:00:00Z',
    source_schema: 'public',
    source_table: 'contact',
    operation: 'INSERT',
    payload_after: { id: 'row-uuid-1', name: 'Alice' },
    payload_before: null,
    payload_diff: null,
    subscriber_ids: ['sub-1'],
    ...overrides,
  };
}

function createMockPool(): jest.Mocked<Queryable> {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
  };
}

function createMockPgSubscriber() {
  const eventEmitter = new EventEmitter();
  return { eventEmitter, subscribe: jest.fn() };
}

// ---------------------------------------------------------------------------
// Unit tests: helper functions
// ---------------------------------------------------------------------------

describe('extractRowId', () => {
  it('extracts id from payload_after for INSERT', () => {
    const entry = makeEntry({ operation: 'INSERT', payload_after: { id: 'abc-123' } });
    expect(extractRowId(entry)).toBe('abc-123');
  });

  it('extracts id from payload_after for UPDATE', () => {
    const entry = makeEntry({ operation: 'UPDATE', payload_after: { id: 'def-456' } });
    expect(extractRowId(entry)).toBe('def-456');
  });

  it('extracts id from payload_before for DELETE', () => {
    const entry = makeEntry({
      operation: 'DELETE',
      payload_after: null,
      payload_before: { id: 'ghi-789' },
    });
    expect(extractRowId(entry)).toBe('ghi-789');
  });

  it('returns null when payload is missing', () => {
    const entry = makeEntry({ operation: 'INSERT', payload_after: null });
    expect(extractRowId(entry)).toBeNull();
  });

  it('returns null when payload has no id field', () => {
    const entry = makeEntry({ operation: 'INSERT', payload_after: { name: 'Alice' } });
    expect(extractRowId(entry)).toBeNull();
  });
});

describe('entryToNotifyPayload', () => {
  it('formats INSERT with row id', () => {
    const entry = makeEntry({ operation: 'INSERT', payload_after: { id: 'row-1' } });
    expect(entryToNotifyPayload(entry)).toBe('INSERT:row-1');
  });

  it('formats UPDATE with row id', () => {
    const entry = makeEntry({ operation: 'UPDATE', payload_after: { id: 'row-2' } });
    expect(entryToNotifyPayload(entry)).toBe('UPDATE:row-2');
  });

  it('formats DELETE with row id from payload_before', () => {
    const entry = makeEntry({
      operation: 'DELETE',
      payload_after: null,
      payload_before: { id: 'row-3' },
    });
    expect(entryToNotifyPayload(entry)).toBe('DELETE:row-3');
  });

  it('returns operation only when no row id available', () => {
    const entry = makeEntry({ operation: 'INSERT', payload_after: null });
    expect(entryToNotifyPayload(entry)).toBe('INSERT');
  });
});

describe('entryToChannel', () => {
  it('builds channel from source_schema and source_table', () => {
    const entry = makeEntry({ source_schema: 'public', source_table: 'contact' });
    expect(entryToChannel(entry)).toBe('realtime:public.contact');
  });

  it('handles custom schema names', () => {
    const entry = makeEntry({ source_schema: 'tenant_42', source_table: 'invoice' });
    expect(entryToChannel(entry)).toBe('realtime:tenant_42.invoice');
  });
});

// ---------------------------------------------------------------------------
// RealtimeManager lifecycle
// ---------------------------------------------------------------------------

describe('RealtimeManager', () => {
  let mockPool: jest.Mocked<Queryable>;
  let mockSubscriber: ReturnType<typeof createMockPgSubscriber>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockPool = createMockPool();
    mockSubscriber = createMockPgSubscriber();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createManager(overrides: Record<string, unknown> = {}) {
    return new RealtimeManager({
      pgSubscriber: mockSubscriber,
      pool: mockPool,
      nodeId: 'test-manager-node',
      pollIntervalMs: 1000,
      heartbeatIntervalMs: 5000,
      ...overrides,
    });
  }

  it('starts and stops without error', async () => {
    const manager = createManager();
    await manager.start();
    expect(manager.isRunning).toBe(true);

    await manager.stop();
    expect(manager.isRunning).toBe(false);
  });

  it('exposes nodeId', () => {
    const manager = createManager({ nodeId: 'my-node-42' });
    expect(manager.nodeId).toBe('my-node-42');
  });

  it('calls touch_listener on start', async () => {
    const manager = createManager();
    await manager.start();

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('touch_listener'),
      expect.any(Array),
    );

    await manager.stop();
  });

  it('calls cleanup_ephemeral on stop', async () => {
    const manager = createManager();
    await manager.start();
    mockPool.query.mockClear();

    await manager.stop();

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('cleanup_ephemeral'),
      expect.any(Array),
    );
  });

  it('is idempotent for start', async () => {
    const manager = createManager();
    await manager.start();
    await manager.start(); // should be no-op

    await manager.stop();
  });

  it('is idempotent for stop', async () => {
    const manager = createManager();
    await manager.start();
    await manager.stop();
    await manager.stop(); // should be no-op
  });

  describe('event dispatching', () => {
    it('emits cursor-tracked events on PgSubscriber eventEmitter', async () => {
      const emitted: { channel: string; payload: string }[] = [];
      mockSubscriber.eventEmitter.on('realtime:public.contact', (payload: string) => {
        emitted.push({ channel: 'realtime:public.contact', payload });
      });

      // Mock drain_changes to return entries
      const entries: ChangeLogEntry[] = [
        makeEntry({ operation: 'INSERT', payload_after: { id: 'row-a' } }),
        makeEntry({ operation: 'UPDATE', payload_after: { id: 'row-b' } }),
      ];

      mockPool.query.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('drain_changes')) {
          return { rows: entries.map((e) => ({ drain_changes: e })) };
        }
        return { rows: [] };
      });

      const manager = createManager();
      await manager.start();

      // The initial drain happens in start() — events should be emitted
      expect(emitted).toHaveLength(2);
      expect(emitted[0].payload).toBe('INSERT:row-a');
      expect(emitted[1].payload).toBe('UPDATE:row-b');

      await manager.stop();
    });

    it('handles DELETE events with payload_before', async () => {
      const emitted: string[] = [];
      mockSubscriber.eventEmitter.on('realtime:public.contact', (payload: string) => {
        emitted.push(payload);
      });

      const entries: ChangeLogEntry[] = [
        makeEntry({
          operation: 'DELETE',
          payload_after: null,
          payload_before: { id: 'deleted-row' },
        }),
      ];

      mockPool.query.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('drain_changes')) {
          return { rows: entries.map((e) => ({ drain_changes: e })) };
        }
        return { rows: [] };
      });

      const manager = createManager();
      await manager.start();

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toBe('DELETE:deleted-row');

      await manager.stop();
    });

    it('dispatches to correct channels for different tables', async () => {
      const contactEvents: string[] = [];
      const invoiceEvents: string[] = [];
      mockSubscriber.eventEmitter.on('realtime:public.contact', (p: string) => contactEvents.push(p));
      mockSubscriber.eventEmitter.on('realtime:billing.invoice', (p: string) => invoiceEvents.push(p));

      const entries: ChangeLogEntry[] = [
        makeEntry({
          source_schema: 'public',
          source_table: 'contact',
          operation: 'INSERT',
          payload_after: { id: 'contact-1' },
        }),
        makeEntry({
          source_schema: 'billing',
          source_table: 'invoice',
          operation: 'UPDATE',
          payload_after: { id: 'invoice-1' },
        }),
      ];

      mockPool.query.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('drain_changes')) {
          return { rows: entries.map((e) => ({ drain_changes: e })) };
        }
        return { rows: [] };
      });

      const manager = createManager();
      await manager.start();

      expect(contactEvents).toEqual(['INSERT:contact-1']);
      expect(invoiceEvents).toEqual(['UPDATE:invoice-1']);

      await manager.stop();
    });
  });

  describe('error handling', () => {
    it('calls onError when drain fails', async () => {
      const errors: Error[] = [];

      mockPool.query.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('drain_changes')) {
          throw new Error('drain failed');
        }
        return { rows: [] };
      });

      const manager = createManager({ onError: (err: Error) => errors.push(err) });
      await manager.start();

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('drain failed');

      await manager.stop();
    });

    it('handles missing eventEmitter gracefully', async () => {
      const entries: ChangeLogEntry[] = [
        makeEntry({ operation: 'INSERT', payload_after: { id: 'row-x' } }),
      ];

      mockPool.query.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('drain_changes')) {
          return { rows: entries.map((e) => ({ drain_changes: e })) };
        }
        return { rows: [] };
      });

      // pgSubscriber without eventEmitter — should not crash
      const manager = createManager({ pgSubscriber: {} });
      await manager.start();
      await manager.stop();
    });
  });
});
