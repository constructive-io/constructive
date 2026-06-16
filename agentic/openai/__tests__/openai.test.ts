import { TextEncoder } from 'util';

import { OpenAIAdapter } from '../src';

const fetch = global.fetch as jest.Mock;

function createStreamingResponse(lines: string[]) {
  const payload = lines.join('\n');
  const encoded = new TextEncoder().encode(payload);
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

describe('OpenAIAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('streams text and tool calls with parsed partial JSON', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(
      createStreamingResponse([
        'data: {"choices":[{"delta":{"content":"Hello "},"finish_reason":null}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"lookup","arguments":"{\\"city\\":\\"Pa"}}]},"finish_reason":null}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"ris\\"}"}}]},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}',
        'data: [DONE]',
      ])
    );

    const adapter = new OpenAIAdapter({ apiKey: 'test-key' });
    const model = adapter.createModel('gpt-5.4-mini');
    const stream = adapter.stream(model, {
      messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }],
      tools: [
        {
          name: 'lookup',
          description: 'Lookup a city',
          parameters: {
            type: 'object',
            properties: {
              city: { type: 'string' },
            },
            required: ['city'],
          },
        },
      ],
    });

    const eventTypes: string[] = [];
    for await (const event of stream) {
      eventTypes.push(event.type);
    }

    const message = await stream.result();
    const toolCall = message.content.find((block) => block.type === 'toolCall');

    expect(eventTypes).toEqual(
      expect.arrayContaining(['text_start', 'text_delta', 'toolcall_start', 'toolcall_delta', 'toolcall_end', 'done'])
    );
    expect(message.stopReason).toBe('toolUse');
    expect(message.usage.totalTokens).toBe(15);
    expect(toolCall).toMatchObject({
      type: 'toolCall',
      name: 'lookup',
      arguments: { city: 'Paris' },
    });
  });

  it('surfaces reasoning tokens without double-counting output', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(
      createStreamingResponse([
        'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}],"usage":{"prompt_tokens":20,"completion_tokens":15,"total_tokens":35,"completion_tokens_details":{"reasoning_tokens":8}}}',
        'data: [DONE]',
      ])
    );

    const adapter = new OpenAIAdapter({ apiKey: 'test-key' });
    const model = adapter.createModel('gpt-5.4-mini');
    const stream = adapter.stream(model, {
      messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }],
    });

    for await (const _ of stream) { /* drain */ }
    const message = await stream.result();

    // output must equal completion_tokens (15), NOT completion_tokens + reasoning_tokens (23)
    expect(message.usage.output).toBe(15);
    // reasoning is exposed as its own field
    expect(message.usage.reasoning).toBe(8);
    // total from wire — no double-count
    expect(message.usage.totalTokens).toBe(35);
  });

  it('totalTokens fallback includes cacheWrite when total_tokens is absent', async () => {
    // Simulate a chunk with no total_tokens but with cached input tokens and reasoning.
    // cacheWrite stays 0 (adapter default) but the fallback formula must still be correct.
    (fetch as jest.Mock).mockResolvedValueOnce(
      createStreamingResponse([
        'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}],"usage":{"prompt_tokens":30,"completion_tokens":10,"completion_tokens_details":{"reasoning_tokens":4},"prompt_tokens_details":{"cached_tokens":6}}}',
        'data: [DONE]',
      ])
    );

    const adapter = new OpenAIAdapter({ apiKey: 'test-key' });
    const model = adapter.createModel('gpt-5.4-mini');
    const stream = adapter.stream(model, {
      messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }],
    });

    for await (const _ of stream) { /* drain */ }
    const message = await stream.result();

    // input = prompt_tokens(30) - cached(6) = 24
    expect(message.usage.input).toBe(24);
    // output = completion_tokens (no double-count)
    expect(message.usage.output).toBe(10);
    // reasoning subset
    expect(message.usage.reasoning).toBe(4);
    // cacheRead = cached_tokens
    expect(message.usage.cacheRead).toBe(6);
    // cacheWrite = 0 (stock OpenAI doesn't emit it)
    expect(message.usage.cacheWrite).toBe(0);
    // fallback: input + output + cacheRead + cacheWrite = 24 + 10 + 6 + 0 = 40
    expect(message.usage.totalTokens).toBe(40);
  });

  it('createModel preserves model-specific compat overriding adapter defaults', () => {
    const adapter = new OpenAIAdapter({ apiKey: 'k' });
    const model = adapter.createModel('gpt-5.4-nano');
    expect(model.compat?.maxTokensField).toBe('max_completion_tokens');
  });

  it('createModel lets caller overrides win over both', () => {
    const adapter = new OpenAIAdapter({ apiKey: 'k' });
    const model = adapter.createModel('gpt-5.4-nano', {
      compat: { maxTokensField: 'max_tokens' },
    });
    expect(model.compat?.maxTokensField).toBe('max_tokens');
  });

  it('falls back to built-in models when no API key is configured', async () => {
    const adapter = new OpenAIAdapter();
    const models = await adapter.listModels();

    expect(models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'gpt-5.4' }),
        expect.objectContaining({ id: 'gpt-5.4-mini' }),
        expect.objectContaining({ id: 'gpt-5.4-nano' }),
      ])
    );
  });
});
