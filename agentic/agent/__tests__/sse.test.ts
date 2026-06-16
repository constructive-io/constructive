// Exercises `parseSSEStream` exported from `@agentic-kit/agent`. Symmetric to
// the SSE producer in `toResponse()` — these tests pin down the parser's
// edge-case behavior so the wire-format contract has a baseline.
import { type AgentEvent, parseSSEStream } from '../src';

const encoder = new TextEncoder();

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<AgentEvent[]> {
  const out: AgentEvent[] = [];
  for await (const event of parseSSEStream(stream)) {
    out.push(event);
  }
  return out;
}

describe('parseSSEStream', () => {
  it('parses a single complete event', async () => {
    const events = await collect(streamFromChunks(['data: {"type":"agent_start"}\n\n']));
    expect(events).toEqual([{ type: 'agent_start' }]);
  });

  it('reassembles a payload split across chunks', async () => {
    const events = await collect(
      streamFromChunks(['data: {"type":"agen', 't_start"}\n', '\n'])
    );
    expect(events).toEqual([{ type: 'agent_start' }]);
  });

  it('joins multiple data: lines with newlines into a single payload', async () => {
    const events = await collect(
      streamFromChunks(['data: {"type":\ndata: "agent_start"}\n\n'])
    );
    expect(events).toEqual([{ type: 'agent_start' }]);
  });

  it('ignores comment lines starting with `:`', async () => {
    const events = await collect(
      streamFromChunks([': keepalive\ndata: {"type":"turn_start"}\n\n'])
    );
    expect(events).toEqual([{ type: 'turn_start' }]);
  });

  it('ignores event:, id:, and retry: framing fields', async () => {
    const events = await collect(
      streamFromChunks([
        'event: turn_start\nid: 1\nretry: 1000\ndata: {"type":"turn_start"}\n\n',
      ])
    );
    expect(events).toEqual([{ type: 'turn_start' }]);
  });

  it('skips a [DONE] marker without yielding an event', async () => {
    const events = await collect(
      streamFromChunks([
        'data: {"type":"agent_start"}\n\ndata: [DONE]\n\n',
      ])
    );
    expect(events).toEqual([{ type: 'agent_start' }]);
  });

  it('handles trailing newlines without emitting a spurious event', async () => {
    const events = await collect(
      streamFromChunks(['data: {"type":"agent_start"}\n\n\n\n'])
    );
    expect(events).toEqual([{ type: 'agent_start' }]);
  });

  it('handles CRLF line endings', async () => {
    const events = await collect(
      streamFromChunks(['data: {"type":"agent_start"}\r\n\r\n'])
    );
    expect(events).toEqual([{ type: 'agent_start' }]);
  });

  it('drops a final incomplete event when the stream ends mid-event', async () => {
    const events = await collect(
      streamFromChunks([
        'data: {"type":"agent_start"}\n\n',
        'data: {"type":"turn_start"}',
      ])
    );
    expect(events).toEqual([{ type: 'agent_start' }]);
  });

  it('yields multiple complete events in order', async () => {
    const events = await collect(
      streamFromChunks([
        'data: {"type":"agent_start"}\n\ndata: {"type":"turn_start"}\n\n',
      ])
    );
    expect(events).toEqual([{ type: 'agent_start' }, { type: 'turn_start' }]);
  });

  it('honors an optional space after the `data:` field name', async () => {
    const events = await collect(
      streamFromChunks(['data:{"type":"agent_start"}\n\n'])
    );
    expect(events).toEqual([{ type: 'agent_start' }]);
  });
});
