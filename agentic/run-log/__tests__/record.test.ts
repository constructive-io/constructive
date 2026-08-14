import {
  assertOrdered,
  assertPiSessionEntry,
  assertRunEventRecord,
  idempotencyKey,
  RUN_LOG_WRAPPER_VERSION,
  SUPPORTED_PI_SESSION_VERSION,
  wrapEntry
} from '../src';
import { assistantText, header, resetIds, userMessage } from './fixtures';

beforeEach(resetIds);

describe('wrapEntry', () => {
  it('wraps a pi entry in the four platform fields, leaving the entry untouched', () => {
    const entry = userMessage('hello');
    const record = wrapEntry({ runId: 'run-1', seq: 1, entry, recordedAt: '2026-01-01T00:00:00.000Z' });

    expect(record).toEqual({
      runId: 'run-1',
      seq: 1,
      recordedAt: '2026-01-01T00:00:00.000Z',
      piSessionVersion: SUPPORTED_PI_SESSION_VERSION,
      entry
    });
    // Same object, not a copy: the entry is stored verbatim.
    expect(record.entry).toBe(entry);
  });

  it('defaults recordedAt and records the pi session version', () => {
    const record = wrapEntry({ runId: 'run-1', seq: 1, entry: userMessage('hi') });
    expect(Date.parse(record.recordedAt)).not.toBeNaN();
    expect(record.piSessionVersion).toBe(3);
    expect(RUN_LOG_WRAPPER_VERSION).toBe(1);
  });

  it('rejects a seq that would break ordering', () => {
    expect(() => wrapEntry({ runId: 'run-1', seq: 0, entry: userMessage('hi') })).toThrow(/positive integer/);
    expect(() => wrapEntry({ runId: '', seq: 1, entry: userMessage('hi') })).toThrow(/runId/);
  });
});

describe('assertPiSessionEntry', () => {
  it('accepts a session header without tree fields', () => {
    expect(assertPiSessionEntry(header()).type).toBe('session');
  });

  it('accepts an entry type it has never seen', () => {
    const entry = {
      type: 'quantum_thought',
      id: 'abc',
      parentId: null as string | null,
      timestamp: '2026-01-01T00:00:00.000Z'
    };
    expect(assertPiSessionEntry(entry)).toBe(entry);
  });

  it('throws rather than yielding an unreadable entry', () => {
    expect(() => assertPiSessionEntry(null)).toThrow(/must be an object/);
    expect(() => assertPiSessionEntry({})).toThrow(/`type`/);
    expect(() => assertPiSessionEntry({ type: 'message' })).toThrow(/`id`/);
    expect(() => assertPiSessionEntry({ type: 'message', id: 'a' })).toThrow(/timestamp/);
    expect(() => assertPiSessionEntry({ type: 'message', id: 'a', timestamp: 'x' })).toThrow(/parentId/);
  });
});

describe('assertRunEventRecord', () => {
  const valid = wrapEntry({ runId: 'run-1', seq: 1, entry: assistantText('hi') });

  it('round-trips through JSON', () => {
    expect(assertRunEventRecord(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });

  it.each([
    [{ ...valid, runId: '' }, /non-empty runId/],
    [{ ...valid, seq: 0 }, /invalid seq/],
    [{ ...valid, recordedAt: 5 }, /recordedAt/],
    [{ ...valid, piSessionVersion: '3' }, /piSessionVersion/],
    [{ ...valid, entry: 'nope' }, /must be an object/]
  ])('throws on a corrupt record (%#)', (record, message) => {
    expect(() => assertRunEventRecord(record)).toThrow(message);
  });
});

describe('idempotencyKey', () => {
  it('is stable per entry so a retried append is recognised', () => {
    const entry = userMessage('hello');
    expect(idempotencyKey('run-1', entry)).toBe(idempotencyKey('run-1', { ...entry }));
    expect(idempotencyKey('run-1', entry)).not.toBe(idempotencyKey('run-2', entry));
  });
});

describe('assertOrdered', () => {
  it('rejects mixed runs and out-of-order sequences', () => {
    const a = wrapEntry({ runId: 'run-1', seq: 2, entry: userMessage('a') });
    const b = wrapEntry({ runId: 'run-1', seq: 1, entry: userMessage('b') });
    const c = wrapEntry({ runId: 'run-2', seq: 3, entry: userMessage('c') });
    expect(() => assertOrdered([a, b])).toThrow(/out of order/);
    expect(() => assertOrdered([a, c])).toThrow(/mix runs/);
    expect(() => assertOrdered([b, a])).not.toThrow();
  });
});
