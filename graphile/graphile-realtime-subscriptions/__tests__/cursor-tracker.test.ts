/**
 * Tests for the CursorTracker class.
 *
 * Covers:
 * - Lifecycle: start, stop, heartbeat, cleanup
 * - drain_changes() polling and result delivery
 * - Error handling for database failures
 * - Guard against concurrent drains
 * - Configuration defaults and overrides
 * - Proper SQL generation with schema quoting
 */

jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import {
  CursorTracker,
  DEFAULT_BATCH_LIMIT,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_SCHEMA,
} from '../src/cursor-tracker';
import type { ChangeLogEntry,Queryable } from '../src/types';

// --- Test helpers ---

function createMockPool(queryResult: { rows: any[] } = { rows: [] }): jest.Mocked<Queryable> {
  return {
    query: jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('runtime_sources')) return { rows: [{ runtime_sources: {
        source_schema: 'app_public', source_table: 'projects',
        fanout_function: 'fanout_projects', cleanup_function: 'cleanup_projects',
      } }] };
      if (sql.includes('fanout_projects')) return { rows: queryResult.rows.map(row => ({ entry: row.drain_changes })) };
      return sql.includes('drain_changes') ? queryResult : { rows: [] };
    }),
  };
}

function createChangeLogEntry(overrides: Partial<ChangeLogEntry> = {}): ChangeLogEntry {
  return {
    id: 'change-1',
    occurred_at: '2025-01-01T00:00:00Z',
    source_schema: 'app_public',
    source_table: 'projects',
    operation: 'INSERT',
    payload_after: { id: 'row-1', name: 'Test' },
    payload_before: null,
    payload_diff: null,
    subscriber_ids: ['sub-1'],
    ...overrides,
  };
}

// --- Tests ---

describe('CursorTracker defaults', () => {
  it('exports expected default constants', () => {
    expect(DEFAULT_POLL_INTERVAL_MS).toBe(5000);
    expect(DEFAULT_HEARTBEAT_INTERVAL_MS).toBe(30000);
    expect(DEFAULT_BATCH_LIMIT).toBe(500);
    expect(DEFAULT_SCHEMA).toBe('realtime_private');
  });

  it('generates a nodeId when not provided', () => {
    const tracker = new CursorTracker({
      pool: createMockPool(),
    });

    expect(tracker.nodeId).toBeDefined();
    expect(typeof tracker.nodeId).toBe('string');
    expect(tracker.nodeId.length).toBeGreaterThan(0);
  });

  it('uses provided nodeId', () => {
    const tracker = new CursorTracker({
      nodeId: 'my-node-42',
      pool: createMockPool(),
    });

    expect(tracker.nodeId).toBe('my-node-42');
  });
});

describe('CursorTracker.start()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls touch_listener on start', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'test-node',
      pool: mockPool,
    });

    await tracker.start();

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('touch_listener'),
      ['test-node'],
    );

    await tracker.stop();
  });

  it('calls drain_changes immediately after start', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'test-node',
      pool: mockPool,
    });

    await tracker.start();

    const calls = (mockPool.query as jest.Mock).mock.calls;
    const drainCalls = calls.filter((c: any[]) => c[0].includes('drain_changes'));
    expect(drainCalls.length).toBeGreaterThanOrEqual(1);

    await tracker.stop();
  });

  it('sets isRunning to true', async () => {
    const tracker = new CursorTracker({
      pool: createMockPool(),
    });

    expect(tracker.isRunning).toBe(false);
    await tracker.start();
    expect(tracker.isRunning).toBe(true);

    await tracker.stop();
  });

  it('is idempotent (calling start twice does not double-register)', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'test-node',
      pool: mockPool,
    });

    await tracker.start();
    const callCountAfterFirst = (mockPool.query as jest.Mock).mock.calls.length;

    await tracker.start();
    const callCountAfterSecond = (mockPool.query as jest.Mock).mock.calls.length;

    expect(callCountAfterSecond).toBe(callCountAfterFirst);

    await tracker.stop();
  });
});

describe('CursorTracker.stop()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls cleanup_ephemeral on stop', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'test-node',
      pool: mockPool,
    });

    await tracker.start();
    (mockPool.query as jest.Mock).mockClear();

    await tracker.stop();

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('cleanup_ephemeral'),
      ['test-node'],
    );
  });

  it('sets isRunning to false', async () => {
    const tracker = new CursorTracker({
      pool: createMockPool(),
    });

    await tracker.start();
    await tracker.stop();
    expect(tracker.isRunning).toBe(false);
  });

  it('is idempotent (calling stop twice does not double-cleanup)', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'test-node',
      pool: mockPool,
    });

    await tracker.start();
    (mockPool.query as jest.Mock).mockClear();

    await tracker.stop();
    const callCountAfterFirst = (mockPool.query as jest.Mock).mock.calls.length;

    await tracker.stop();
    const callCountAfterSecond = (mockPool.query as jest.Mock).mock.calls.length;

    expect(callCountAfterSecond).toBe(callCountAfterFirst);
  });

  it('clears poll and heartbeat timers', async () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');

    const tracker = new CursorTracker({
      pool: createMockPool(),
    });

    await tracker.start();
    await tracker.stop();

    expect(clearSpy).toHaveBeenCalledTimes(2);
    clearSpy.mockRestore();
  });
});

describe('CursorTracker.drain()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls drain_changes with nodeId and batchLimit', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'drain-node',
      batchLimit: 100,
      pool: mockPool,
    });

    await tracker.drain();

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('drain_changes'),
      ['drain-node', 100],
    );
  });

  it('returns parsed change_log entries', async () => {
    const entry = createChangeLogEntry();
    const mockPool = createMockPool({
      rows: [{ drain_changes: entry }],
    });

    const tracker = new CursorTracker({
      pool: mockPool,
    });

    const result = await tracker.drain();
    expect(result).toEqual([entry]);
  });

  it('calls onChanges callback with entries', async () => {
    const entry = createChangeLogEntry();
    const mockPool = createMockPool({
      rows: [{ drain_changes: entry }],
    });
    const onChanges = jest.fn();

    const tracker = new CursorTracker({
      pool: mockPool,
      onChanges,
    });

    await tracker.drain();
    expect(onChanges).toHaveBeenCalledWith([entry]);
  });

  it('does not call onChanges when no entries', async () => {
    const onChanges = jest.fn();

    const tracker = new CursorTracker({
      pool: createMockPool(),
      onChanges,
    });

    await tracker.drain();
    expect(onChanges).not.toHaveBeenCalled();
  });

  it('propagates drain failures to the caller', async () => {
    const failingPool: Queryable = {
      query: jest.fn().mockRejectedValue(new Error('connection lost')),
    };
    const onError = jest.fn();

    const tracker = new CursorTracker({
      pool: failingPool,
      onError,
    });

    await expect(tracker.drain()).rejects.toThrow('connection lost');
    expect(onError).not.toHaveBeenCalled();
  });

  it('prevents concurrent drains', async () => {
    let resolveQuery: (() => void) | null = null;
    const slowPool: Queryable = {
      query: jest.fn().mockImplementation(() => {
        return new Promise<{ rows: any[] }>((resolve) => {
          resolveQuery = () => resolve({ rows: [] });
        });
      }),
    };

    const tracker = new CursorTracker({
      pool: slowPool,
    });

    const drain1 = tracker.drain();
    const drain2Promise = tracker.drain();

    const result2 = await drain2Promise;
    expect(result2).toEqual([]);

    resolveQuery!();
    await drain1;
  });

  it('advances the cursor only after successful source fanout, preserving timestamp precision', async () => {
    const entry = createChangeLogEntry({ occurred_at: '2026-11-20T12:00:00.123456+00:00' });
    const pool = createMockPool({ rows: [{ drain_changes: entry }] });
    const tracker = new CursorTracker({ pool, nodeId: 'node' });
    await tracker.drain();
    expect(pool.query).toHaveBeenLastCalledWith(expect.stringContaining('advance_cursor'), ['node', entry.occurred_at]);
    const calls = pool.query.mock.calls.map(([sql]) => sql);
    expect(calls.findIndex(sql => sql.includes('fanout_projects'))).toBeLessThan(calls.findIndex(sql => sql.includes('advance_cursor')));
  });

  it('does not advance or dispatch when a source fanout fails', async () => {
    const entry = createChangeLogEntry();
    const pool = createMockPool({ rows: [{ drain_changes: entry }] });
    const query = pool.query.getMockImplementation()!;
    pool.query.mockImplementation((sql, values) => sql.includes('fanout_projects') ? Promise.reject(new Error('fanout failed')) : query(sql, values));
    const onChanges = jest.fn();
    const tracker = new CursorTracker({ pool, onChanges });
    await expect(tracker.drain()).rejects.toThrow('fanout failed');
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('advance_cursor'))).toBe(false);
    expect(onChanges).not.toHaveBeenCalled();
  });

  it('advances past unmatched pending changes without dispatching them', async () => {
    const pool = createMockPool({ rows: [{ drain_changes: createChangeLogEntry({ source_table: 'unregistered' }) }] });
    const onChanges = jest.fn();
    await expect(new CursorTracker({ pool, onChanges }).drain()).resolves.toEqual([]);
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('advance_cursor'))).toBe(true);
    expect(onChanges).not.toHaveBeenCalled();
  });

  it('preserves the listener when per-source cleanup fails', async () => {
    const pool = createMockPool();
    const query = pool.query.getMockImplementation()!;
    pool.query.mockImplementation((sql, values) => sql.includes('cleanup_projects') ? Promise.reject(new Error('source cleanup failed')) : query(sql, values));
    await expect(new CursorTracker({ pool }).cleanupEphemeral()).rejects.toThrow('source cleanup failed');
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('cleanup_ephemeral'))).toBe(false);
  });
});

describe('CursorTracker periodic polling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('polls drain_changes at configured interval', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'poll-node',
      pollIntervalMs: 2000,
      pool: mockPool,
    });

    await tracker.start();
    (mockPool.query as jest.Mock).mockClear();

    jest.advanceTimersByTime(2000);
    // Allow async callbacks
    await Promise.resolve();

    const drainCalls = (mockPool.query as jest.Mock).mock.calls
      .filter((c: any[]) => c[0].includes('drain_changes'));
    expect(drainCalls.length).toBeGreaterThanOrEqual(1);

    await tracker.stop();
  });

  it('heartbeats at configured interval', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'hb-node',
      heartbeatIntervalMs: 5000,
      pool: mockPool,
    });

    await tracker.start();
    (mockPool.query as jest.Mock).mockClear();

    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    const touchCalls = (mockPool.query as jest.Mock).mock.calls
      .filter((c: any[]) => c[0].includes('touch_listener'));
    expect(touchCalls.length).toBeGreaterThanOrEqual(1);

    await tracker.stop();
  });
});

describe('CursorTracker schema quoting', () => {
  it('includes schema name in SQL queries', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'schema-node',
      schema: 'my_realtime_public',
      pool: mockPool,
    });

    await tracker.drain();

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('my_realtime_public'),
      expect.any(Array),
    );
  });

  it('uses default schema when not specified', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'default-schema-node',
      pool: mockPool,
    });

    await tracker.drain();

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('realtime_private'),
      expect.any(Array),
    );
  });

  it('quotes schema names that need quoting', async () => {
    const mockPool = createMockPool();
    const tracker = new CursorTracker({
      nodeId: 'special-schema-node',
      schema: 'my schema',
      pool: mockPool,
    });

    await tracker.drain();

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('"my schema"'),
      expect.any(Array),
    );
  });
});

describe('CursorTracker error handling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('propagates touch_listener failures', async () => {
    const failingPool: Queryable = {
      query: jest.fn().mockRejectedValue(new Error('touch failed')),
    };
    const onError = jest.fn();

    const tracker = new CursorTracker({
      pool: failingPool,
      onError,
    });

    await expect(tracker.touchListener()).rejects.toThrow('touch failed');
    expect(onError).not.toHaveBeenCalled();
  });

  it('propagates cleanup_ephemeral failures', async () => {
    const failingPool: Queryable = {
      query: jest.fn().mockRejectedValue(new Error('cleanup failed')),
    };
    const onError = jest.fn();

    const tracker = new CursorTracker({
      pool: failingPool,
      onError,
    });

    await expect(tracker.cleanupEphemeral()).rejects.toThrow('cleanup failed');
    expect(onError).not.toHaveBeenCalled();
  });

  it('wraps non-Error objects in Error', async () => {
    const failingPool: Queryable = {
      query: jest.fn().mockRejectedValue('string error'),
    };
    const onError = jest.fn();

    const tracker = new CursorTracker({
      pool: failingPool,
      onError,
    });

    await expect(tracker.drain()).rejects.toThrow('string error');
    expect(onError).not.toHaveBeenCalled();
  });

  it('rejects failed initial drain, cleans registration, and leaves no timers', async () => {
    const pool = createMockPool();
    pool.query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(new Error('initial drain failed'));
    const tracker = new CursorTracker({ pool, schema: 'physical_rt' });
    await expect(tracker.start()).rejects.toThrow('initial drain failed');
    expect(pool.query).toHaveBeenLastCalledWith('SELECT physical_rt.cleanup_ephemeral($1)', [tracker.nodeId]);
    expect(tracker.isRunning).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects failed registration without installing timers', async () => {
    const pool = createMockPool();
    pool.query.mockRejectedValueOnce(new Error('registration failed'));
    const tracker = new CursorTracker({ pool });
    await expect(tracker.start()).rejects.toThrow('registration failed');
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(tracker.isRunning).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('preserves a startup failure when registration cleanup also fails', async () => {
    const pool = createMockPool();
    const error = new Error('drain failed');
    const cleanup = new Error('cleanup failed');
    pool.query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(error).mockRejectedValueOnce(cleanup);
    const tracker = new CursorTracker({ pool });
    await expect(tracker.start()).rejects.toMatchObject({ errors: [error, cleanup] });
    expect(tracker.isRunning).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });
});
