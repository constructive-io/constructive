import {
  passthroughReader,
  type RunEventRecord,
  TranscriptReaderRegistry,
} from '@agentic-kit/run-log';

import {
  applyError,
  applyRecords,
  applyRun,
  emptyRunView,
  isFollowable,
  mergeRecords,
} from '../src/view';
import { fakeRun, messageEntry } from './fake-api';

const record = (seq: number, id = `e${seq}`): RunEventRecord => ({
  runId: 'run-1',
  seq,
  recordedAt: '2026-01-01T00:00:00.000Z',
  transcriptFormat: 'pi',
  transcriptVersion: 3,
  entry: messageEntry(id, `entry ${seq}`),
});

describe('mergeRecords', () => {
  it('orders by seq regardless of arrival order', () => {
    expect(mergeRecords([record(3)], [record(1), record(2)]).map((r) => r.seq)).toEqual([
      1, 2, 3,
    ]);
  });

  it('an overlapping catch-up read does not duplicate a turn', () => {
    const merged = mergeRecords([record(1), record(2)], [record(2), record(3)]);
    expect(merged.map((r) => r.seq)).toEqual([1, 2, 3]);
  });

  it('merging nothing keeps what is held', () => {
    expect(mergeRecords([record(1)], []).map((r) => r.seq)).toEqual([1]);
  });
});

describe('run view', () => {
  it('starts empty and loading', () => {
    const view = emptyRunView();
    expect(view.records).toEqual([]);
    expect(view.cursor).toEqual({ afterSeq: 0 });
    expect(view.conversation.parts).toEqual([]);
    expect(view.phase).toBe('loading');
    expect(isFollowable(view)).toBe(true);
  });

  it('projects transcript, tools and usage from the records it holds', () => {
    const view = applyRecords(emptyRunView(), [record(1), record(2)]);
    expect(view.cursor).toEqual({ afterSeq: 2 });
    expect(view.conversation.parts.map((p) => p.kind)).toEqual(['text', 'text']);
    expect(view.tools.pendingApprovals).toEqual([]);
    expect(view.usage.calls).toBe(0);
  });

  it('goes live while the run can still append', () => {
    const view = applyRun(emptyRunView(), fakeRun({ status: 'idle' }));
    expect(view.phase).toBe('live');
    expect(isFollowable(view)).toBe(true);
  });

  it('goes terminal when the run is finished', () => {
    const view = applyRun(emptyRunView(), fakeRun({ status: 'succeeded' }));
    expect(view.phase).toBe('terminal');
    expect(isFollowable(view)).toBe(false);
  });

  it('projects a foreign harness run when given its readers', () => {
    const readers = new TranscriptReaderRegistry([passthroughReader('dsh')]);
    const dshRecord: RunEventRecord = {
      runId: 'run-1',
      seq: 1,
      recordedAt: '2026-01-01T00:00:00.000Z',
      transcriptFormat: 'dsh',
      transcriptVersion: 1,
      entry: { type: 'turn/start', id: 'dsh-1' },
    };

    const view = applyRecords(emptyRunView(), [dshRecord], { readers });
    expect(view.conversation.parts).toMatchObject([
      { kind: 'unknown', entryType: 'turn/start' },
    ]);
    expect(view.cursor).toEqual({ afterSeq: 1 });
  });

  it('keeps what it had when a read fails, and says so', () => {
    const live = applyRecords(
      applyRun(emptyRunView(), fakeRun()),
      [record(1)]
    );
    const failed = applyError(live, new Error('network down'));
    expect(failed.error).toBe('network down');
    expect(failed.phase).toBe('error');
    expect(failed.records.map((r) => r.seq)).toEqual([1]);
  });
});
