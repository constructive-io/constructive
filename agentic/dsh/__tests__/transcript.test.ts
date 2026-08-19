import { APPROVAL_REQUEST_TYPE, TranscriptReaderRegistry } from '@agentic-kit/run-log';

import {
  assertDshSessionEvent,
  DSH_TRANSCRIPT_FORMAT,
  dshEventToEvents,
  dshTranscriptReader
} from '../src/transcript';

const event = (type: string, data: Record<string, unknown>, seq = 1) => ({
  type,
  seq,
  time: Date.UTC(2026, 0, 2, 3, 4, 5),
  data
});

const at = '2026-01-02T03:04:05.000Z';

describe('assertDshSessionEvent', () => {
  it('requires dsh’s envelope', () => {
    expect(() => assertDshSessionEvent({ type: 'turn/start', time: 1 })).toThrow(/seq/);
    expect(() => assertDshSessionEvent({ type: 'turn/start', seq: 1 })).toThrow(/time/);
    expect(() => assertDshSessionEvent({ type: 'x', seq: 1, time: 1, data: 'no' })).toThrow(/data/);
    expect(assertDshSessionEvent(event('turn/start', {})).seq).toBe(1);
  });
});

describe('dshEventToEvents', () => {
  it('projects a human prompt as a user turn', () => {
    expect(
      dshEventToEvents(
        event('user/message', {
          source: { kind: 'user' },
          content: [{ type: 'text', text: 'provision a db' }]
        })
      )
    ).toEqual([{ kind: 'text', role: 'user', text: 'provision a db', entryId: '1', at }]);
  });

  it('keeps dsh’s injected context out of the conversation', () => {
    const [projected] = dshEventToEvents(
      event('user/message', {
        source: { kind: 'plugin', plugin: 'file-watch' },
        content: [{ type: 'text', text: 'src/index.ts changed' }]
      })
    );
    expect(projected).toMatchObject({
      kind: 'custom',
      customType: 'dsh.context.plugin',
      display: false,
      details: { plugin: 'file-watch' }
    });
  });

  it('splits an assistant message into a response, its text and its reasoning', () => {
    const events = dshEventToEvents(
      event('assistant/message', {
        message: {
          source: { provider: 'deepseek', model: 'deepseek-chat' },
          content: [
            { type: 'reasoning', text: 'the user wants a table' },
            { type: 'text', text: 'Creating it now.' },
            { type: 'tool-call', callId: 'c1', name: 'create_field' }
          ]
        },
        usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 5 }
      })
    );

    expect(events).toEqual([
      {
        kind: 'model-response',
        model: 'deepseek-chat',
        provider: 'deepseek',
        usage: { input: 100, output: 20, cacheRead: 5, totalTokens: 125 },
        entryId: '1',
        at
      },
      {
        kind: 'thinking',
        text: 'the user wants a table',
        entryId: '1',
        at
      },
      {
        kind: 'text',
        role: 'assistant',
        text: 'Creating it now.',
        model: 'deepseek-chat',
        provider: 'deepseek',
        entryId: '1',
        at
      }
    ]);
  });

  it('parses a call’s argument string, and keeps a malformed one', () => {
    expect(
      dshEventToEvents(
        event('tool/call', { callId: 'c1', name: 'add_records', arguments: '{"table":"posts"}' })
      )
    ).toEqual([
      {
        kind: 'tool-call',
        toolCallId: 'c1',
        name: 'add_records',
        arguments: { table: 'posts' },
        entryId: '1',
        at
      }
    ]);

    const [broken] = dshEventToEvents(
      event('tool/call', { callId: 'c2', name: 'add_records', arguments: '{"table":' })
    );
    expect(broken).toMatchObject({ arguments: { raw: '{"table":' } });
  });

  it('projects a tool result, and marks a failed one', () => {
    expect(
      dshEventToEvents(
        event('tool/result', {
          message: {
            content: [
              {
                type: 'tool-result',
                toolCallId: 'c1',
                content: [{ type: 'text', text: 'created 3 rows' }]
              }
            ]
          },
          meta: { rows: 3 }
        })
      )
    ).toEqual([
      {
        kind: 'tool-result',
        toolCallId: 'c1',
        name: '',
        output: 'created 3 rows',
        failed: false,
        details: { rows: 3 },
        entryId: '1',
        at
      }
    ]);

    const [failed] = dshEventToEvents(
      event('tool/result', {
        message: { content: [{ type: 'tool-result', toolCallId: 'c1', isError: true }] },
        error: { name: 'Error', code: 'denied' }
      })
    );
    expect(failed).toMatchObject({ failed: true });
  });

  it('projects an approval ask into the neutral approval event a surface already renders', () => {
    const [asked] = dshEventToEvents(
      event('approval/asked', { id: 'a1', toolName: 'delete_table', callId: 'c1', reason: 'Drop posts?' })
    );
    expect(asked).toMatchObject({
      kind: 'custom',
      customType: APPROVAL_REQUEST_TYPE,
      text: 'Drop posts?',
      details: { toolCallId: 'c1' }
    });
  });

  it('keeps an approval ask with no call to attach to readable', () => {
    const [asked] = dshEventToEvents(event('approval/asked', { id: 'a1', toolName: 'bash' }));
    expect(asked).toMatchObject({ kind: 'unknown', entryType: 'approval/asked' });
  });

  it('drops the token chunks that an assistant message repeats in full', () => {
    expect(dshEventToEvents(event('assistant/chunk', { delta: 'Cre' }))).toEqual([]);
  });

  it('keeps an event type it does not know rather than losing it', () => {
    expect(dshEventToEvents(event('turn/start', { turn: 1 }))).toEqual([
      {
        kind: 'unknown',
        entryType: 'turn/start',
        entry: event('turn/start', { turn: 1 }),
        entryId: '1',
        at
      }
    ]);
  });
});

describe('dshTranscriptReader', () => {
  it('registers as the reader for the dsh format', () => {
    const registry = new TranscriptReaderRegistry([dshTranscriptReader]);
    expect(registry.require(DSH_TRANSCRIPT_FORMAT)).toBe(dshTranscriptReader);
    expect(registry.formats()).toEqual(['dsh']);
  });

  it('reads a whole session in order', () => {
    const entries = [
      event('turn/start', { turn: 1 }, 1),
      event('user/message', { source: { kind: 'user' }, content: [{ type: 'text', text: 'hi' }] }, 2),
      event('tool/call', { callId: 'c1', name: 'echo', arguments: '{}' }, 3)
    ];
    const kinds = entries
      .map((entry) => dshTranscriptReader.assertEntry(entry))
      .flatMap((entry) => dshTranscriptReader.toEvents(entry))
      .map((projected) => projected.kind);
    expect(kinds).toEqual(['unknown', 'text', 'tool-call']);
  });
});
