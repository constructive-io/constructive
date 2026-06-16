import { PassThrough } from 'stream';
import { TextEncoder } from 'util';

import OllamaClient, { OllamaAdapter } from '../src';

const fetch = global.fetch as jest.Mock;

function createLineResponse(lines: string[]) {
  const encoded = new TextEncoder().encode(lines.join('\n'));
  const reader = {
    read: jest
      .fn()
      .mockResolvedValueOnce({ done: false, value: encoded })
      .mockResolvedValueOnce({ done: true, value: undefined }),
  };

  return {
    ok: true,
    body: { getReader: () => reader },
  };
}

function createNodeLineResponse(lines: string[]) {
  const body = new PassThrough();
  body.end(lines.join('\n'));

  return {
    ok: true,
    body,
  };
}

describe('OllamaAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('streams assistant text through the structured event API', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(
      createLineResponse([
        JSON.stringify({ message: { content: 'Hello' }, done: false }),
        JSON.stringify({ done: true }),
      ]),
    );

    const adapter = new OllamaAdapter('http://localhost:11434');
    const model = adapter.createModel('llama3');
    const stream = adapter.stream(model, {
      messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }],
    });

    const eventTypes: string[] = [];
    for await (const event of stream) {
      eventTypes.push(event.type);
    }

    const message = await stream.result();
    expect(eventTypes).toEqual(
      expect.arrayContaining(['text_start', 'text_delta', 'text_end', 'done']),
    );
    expect(message.content).toEqual([{ type: 'text', text: 'Hello' }]);
  });

  it('supports Node stream response bodies without getReader', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(
      createNodeLineResponse([
        JSON.stringify({ message: { thinking: 'reasoning', content: '' }, done: false }),
        JSON.stringify({ message: { content: 'Hello from node stream' }, done: false }),
        JSON.stringify({ done: true, done_reason: 'stop', prompt_eval_count: 12, eval_count: 4 }),
      ]),
    );

    const adapter = new OllamaAdapter('http://localhost:11434');
    const model = adapter.createModel('llama3');
    const stream = adapter.stream(model, {
      messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }],
    });

    for await (const _event of stream) {
      // Drain stream.
    }

    const message = await stream.result();
    expect(message.content).toEqual([
      { type: 'thinking', thinking: 'reasoning' },
      { type: 'text', text: 'Hello from node stream' },
    ]);
    expect(message.usage.input).toBe(12);
    expect(message.usage.output).toBe(4);
    expect(message.usage.totalTokens).toBe(16);
  });

  it('maps Ollama length termination into the structured stop reason', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(
      createLineResponse([
        JSON.stringify({ message: { content: 'partial' }, done: false }),
        JSON.stringify({ done: true, done_reason: 'length', prompt_eval_count: 9, eval_count: 2 }),
      ]),
    );

    const adapter = new OllamaAdapter('http://localhost:11434');
    const model = adapter.createModel('llama3');
    const stream = adapter.stream(model, {
      messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }],
    });

    const eventTypes: string[] = [];
    for await (const event of stream) {
      eventTypes.push(event.type);
      if (event.type === 'done') {
        expect(event.reason).toBe('length');
      }
    }

    const message = await stream.result();
    expect(eventTypes).toEqual(
      expect.arrayContaining(['text_start', 'text_delta', 'text_end', 'done']),
    );
    expect(message.stopReason).toBe('length');
    expect(message.usage.totalTokens).toBe(11);
  });

  it('serializes system prompts, assistant state, and tool results into Ollama chat messages', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(
      createLineResponse([JSON.stringify({ done: true })]),
    );

    const adapter = new OllamaAdapter('http://127.0.0.1:11434');
    const model = adapter.createModel('llama3');
    const stream = adapter.stream(model, {
      systemPrompt: 'You are helpful.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'look at this image' },
            { type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' },
          ],
          timestamp: Date.now(),
        },
        {
          role: 'assistant',
          api: 'ollama-native',
          provider: 'ollama',
          model: 'llama3',
          usage: {
            input: 0,
            output: 0,
            reasoning: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          },
          stopReason: 'toolUse',
          timestamp: Date.now(),
          content: [
            { type: 'thinking', thinking: 'reason quietly' },
            { type: 'toolCall', id: 'tool_1', name: 'lookup', arguments: { city: 'Paris' } },
          ],
        },
        {
          role: 'toolResult',
          toolCallId: 'tool_1',
          toolName: 'lookup',
          content: [{ type: 'text', text: 'Paris data' }],
          isError: false,
          timestamp: Date.now(),
        },
      ],
    });

    for await (const _event of stream) {
      // Drain the stream so the request body is captured.
    }

    const request = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(request.messages).toEqual([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'look at this image', images: ['aGVsbG8='] },
      {
        role: 'assistant',
        content:
          '<thinking>reason quietly</thinking>\n<tool-call name="lookup">{"city":"Paris"}</tool-call>',
      },
      { role: 'user', content: 'Paris data' },
    ]);
  });

  it('maps aborted fetch failures to aborted assistant messages', async () => {
    const controller = new AbortController();
    controller.abort();
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('The operation was aborted'));

    const adapter = new OllamaAdapter('http://127.0.0.1:11434');
    const model = adapter.createModel('llama3');
    const stream = adapter.stream(
      model,
      {
        messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }],
      },
      { signal: controller.signal },
    );

    const eventTypes: string[] = [];
    for await (const event of stream) {
      eventTypes.push(event.type);
    }

    const message = await stream.result();
    expect(eventTypes).toEqual(['error']);
    expect(message.stopReason).toBe('aborted');
    expect(message.errorMessage).toContain('aborted');
  });

  it('populates usage.cost when the model descriptor has a cost schedule', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(
      createLineResponse([
        JSON.stringify({ message: { content: 'Hi' }, done: false }),
        JSON.stringify({ done: true, done_reason: 'stop', prompt_eval_count: 100, eval_count: 50 }),
      ]),
    );

    const adapter = new OllamaAdapter('http://localhost:11434');
    const model = adapter.createModel('llama3', {
      cost: { input: 2, output: 4 },
    });
    const stream = adapter.stream(model, {
      messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }],
    });

    for await (const _event of stream) {
      // Drain stream.
    }

    const message = await stream.result();
    expect(message.usage.input).toBe(100);
    expect(message.usage.output).toBe(50);
    expect(message.usage.cost.total).toBeGreaterThan(0);
    expect(message.usage.cost.input + message.usage.cost.output).toBeCloseTo(
      message.usage.cost.total,
      10,
    );
    // 100 * (2 / 1_000_000) = 0.0002, 50 * (4 / 1_000_000) = 0.0002, total = 0.0004
    expect(message.usage.cost.input).toBeCloseTo(0.0002, 10);
    expect(message.usage.cost.output).toBeCloseTo(0.0002, 10);
    expect(message.usage.cost.total).toBeCloseTo(0.0004, 10);
  });

  it('lists models through the client API', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3' }, { name: 'mistral' }] }),
    });

    const client = new OllamaClient('http://localhost:11434');
    await expect(client.listModels()).resolves.toEqual(['llama3', 'mistral']);
  });
});
