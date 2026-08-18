/**
 * The neutral transcript seam: a record names its format, a registered reader
 * turns that format's entries into neutral events, and every projector reads
 * the events. These tests use a format this package knows nothing about, so a
 * regression that re-couples the read path to pi fails here.
 */

import {
  assertRunEventRecord,
  passthroughReader,
  PI_TRANSCRIPT_FORMAT,
  piTranscriptReader,
  projectParts,
  projectSession,
  projectToolState,
  projectUsage,
  type RunEventRecord,
  type TranscriptEntry,
  type TranscriptEvent,
  type TranscriptReader,
  TranscriptReaderRegistry,
  transcriptReaders,
  wrapEntry
} from '../src';
import { assistantToolCall, header, resetIds, toolResult, usage } from './fixtures';

beforeEach(resetIds);

const HARNESS = 'harness-test';

/** A transcript shaped nothing like pi's: one flat event per entry. */
const harnessReader: TranscriptReader = {
  format: HARNESS,
  version: 2,
  assertEntry: (value) => {
    const entry = value as TranscriptEntry;
    if (typeof entry?.type !== 'string') throw new TypeError('harness-test entry needs a type');
    return entry;
  },
  toEvents: (entry): TranscriptEvent[] => {
    const base = { entryId: entry.id as string };
    switch (entry.type) {
    case 'user/message':
      return [{ kind: 'text', role: 'user', text: entry.text as string, ...base }];
    case 'assistant/message':
      return [
        {
          kind: 'model-response',
          model: 'deepseek-chat',
          provider: 'deepseek',
          usage: { input: 10, output: 5, totalTokens: 15 },
          ...base
        },
        {
          kind: 'text',
          role: 'assistant',
          text: entry.text as string,
          model: 'deepseek-chat',
          provider: 'deepseek',
          ...base
        }
      ];
    case 'tool/call':
      return [
        {
          kind: 'tool-call',
          toolCallId: entry.callId as string,
          name: entry.tool as string,
          arguments: (entry.args ?? {}) as Record<string, unknown>,
          ...base
        }
      ];
    case 'tool/result':
      return [
        {
          kind: 'tool-result',
          toolCallId: entry.callId as string,
          name: entry.tool as string,
          output: entry.text as string,
          failed: entry.error === true,
          ...base
        }
      ];
    default:
      return [{ kind: 'unknown', entryType: entry.type, entry, ...base }];
    }
  }
};

const readers = new TranscriptReaderRegistry([piTranscriptReader, harnessReader]);

let seq = 0;
const record = (entry: TranscriptEntry, format = HARNESS): RunEventRecord =>
  wrapEntry({ runId: 'run-1', seq: (seq += 1), entry, transcriptFormat: format, readers });

beforeEach(() => {
  seq = 0;
});

describe('the record wrapper', () => {
  it('carries a format the package has never seen, validated by that reader', () => {
    const entry: TranscriptEntry = { type: 'user/message', id: 'e1', text: 'hi' };
    const wrapped = record(entry);

    expect(wrapped.transcriptFormat).toBe(HARNESS);
    // The reader's own version, not pi's.
    expect(wrapped.transcriptVersion).toBe(2);
    expect(wrapped.entry).toBe(entry);
  });

  it('validates with the reader named by the format, not with pi', () => {
    // No id/parentId/timestamp: pi would reject this, harness-test does not.
    expect(() => record({ type: 'user/message', text: 'hi' })).not.toThrow();
    expect(() =>
      wrapEntry({ runId: 'run-1', seq: 1, entry: { type: 'user/message' }, readers })
    ).toThrow(/must carry a non-empty string `id`/);
  });

  it('fails loudly when nothing can read the format', () => {
    expect(() =>
      wrapEntry({ runId: 'run-1', seq: 1, entry: { type: 'x' }, transcriptFormat: 'dsh', readers })
    ).toThrow(/no transcript reader registered for format "dsh"; this registry reads harness-test, pi/);

    expect(() =>
      assertRunEventRecord(
        {
          runId: 'run-1',
          seq: 1,
          recordedAt: '2026-01-01T00:00:00.000Z',
          transcriptFormat: 'dsh',
          transcriptVersion: 1,
          entry: { type: 'x' }
        },
        readers
      )
    ).toThrow(/no transcript reader registered for format "dsh"/);
  });

  it('narrows an untrusted non-pi record', () => {
    const parsed = assertRunEventRecord(JSON.parse(JSON.stringify(record({ type: 'user/message', id: 'e1', text: 'hi' }))), readers);
    expect(parsed.transcriptFormat).toBe(HARNESS);
    expect(parsed.entry).toEqual({ type: 'user/message', id: 'e1', text: 'hi' });
  });
});

describe('projecting a non-pi transcript', () => {
  const records = (): RunEventRecord[] => [
    record({ type: 'user/message', id: 'e1', text: 'add a column' }),
    record({ type: 'assistant/message', id: 'e2', text: 'on it' }),
    record({ type: 'tool/call', id: 'e3', callId: 'c1', tool: 'create_field', args: { name: 'email' } }),
    record({ type: 'tool/result', id: 'e4', callId: 'c1', tool: 'create_field', text: 'created' })
  ];

  it('renders parts without any harness-specific renderer', () => {
    const { parts } = projectParts(records(), { readers });

    expect(parts.map((part) => part.kind)).toEqual(['text', 'text', 'tool']);
    expect(parts[0]).toMatchObject({ role: 'user', text: 'add a column' });
    expect(parts[1]).toMatchObject({ role: 'assistant', text: 'on it', model: 'deepseek-chat' });
    // The call and its result collapse into one part, exactly as for pi.
    expect(parts[2]).toMatchObject({
      kind: 'tool',
      toolCallId: 'c1',
      name: 'create_field',
      arguments: { name: 'email' },
      status: 'completed',
      output: 'created',
      settledSeq: 4
    });
  });

  it('meters it under its own provider and model', () => {
    const totals = projectUsage(records(), { readers });
    expect(totals.totalTokens).toBe(15);
    expect(totals.byModel['deepseek/deepseek-chat']).toMatchObject({
      provider: 'deepseek',
      model: 'deepseek-chat',
      input: 10,
      output: 5
    });
  });

  it('tracks its tool calls', () => {
    const { tools } = projectToolState(records(), { readers });
    expect(tools.c1).toMatchObject({ name: 'create_field', status: 'completed', output: 'created' });
  });

  it('projects one log whose records changed format mid-run', () => {
    const mixed: RunEventRecord[] = [
      wrapEntry({ runId: 'run-1', seq: 1, entry: header(), transcriptFormat: PI_TRANSCRIPT_FORMAT, readers }),
      wrapEntry({
        runId: 'run-1',
        seq: 2,
        entry: assistantToolCall({ id: 'c0', name: 'list_tables' }, 2),
        transcriptFormat: PI_TRANSCRIPT_FORMAT,
        readers
      }),
      wrapEntry({
        runId: 'run-1',
        seq: 3,
        entry: { type: 'user/message', id: 'e1', text: 'thanks' },
        transcriptFormat: HARNESS,
        readers
      })
    ];

    const { parts, sessionId } = projectParts(mixed, { readers });
    expect(sessionId).toBe('session-1');
    expect(parts.map((part) => part.kind)).toEqual(['tool', 'text']);
  });

  it('refuses to re-emit a non-pi log as a pi session file', () => {
    expect(() => projectSession(records())).toThrow(/pi/);
  });
});

describe('a format with no reader yet', () => {
  it('stores and renders as unknown parts, entry preserved', () => {
    const registry = new TranscriptReaderRegistry([passthroughReader('dsh')]);
    const entry: TranscriptEntry = { type: 'turn/start', id: 't1', turn: 4 };
    const stored = wrapEntry({
      runId: 'run-1',
      seq: 1,
      entry,
      transcriptFormat: 'dsh',
      readers: registry
    });

    const { parts } = projectParts([stored], { readers: registry });
    expect(parts).toEqual([{ kind: 'unknown', entryType: 'turn/start', entry, seq: 1, entryId: 't1' }]);
  });
});

describe('the pi reader', () => {
  it('is the only format the default registry reads', () => {
    expect(transcriptReaders.formats()).toEqual([PI_TRANSCRIPT_FORMAT]);
    expect(transcriptReaders.has('dsh')).toBe(false);
  });

  it('means several things by one assistant message', () => {
    const events = piTranscriptReader.toEvents(assistantToolCall({ id: 'c1', name: 'run_codegen' }, 2));
    expect(events.map((event) => event.kind)).toEqual(['model-response', 'tool-call']);
    expect(events[0]).toMatchObject({ kind: 'model-response', provider: 'anthropic', stopReason: 'toolUse' });
    expect(events[1]).toMatchObject({ kind: 'tool-call', toolCallId: 'c1', name: 'run_codegen' });
  });

  it('carries tool result usage into the neutral event', () => {
    const [event] = piTranscriptReader.toEvents(
      toolResult({ toolCallId: 'c1', toolName: 'run_codegen', text: 'ok', usage: usage() })
    );
    expect(event).toMatchObject({ kind: 'tool-result', toolCallId: 'c1', failed: false, output: 'ok' });
  });
});
