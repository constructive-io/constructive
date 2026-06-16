import { TextEncoder } from 'util';

import { AnthropicAdapter } from '../src';

const fetch = global.fetch as jest.Mock;

function createStreamingResponse(frames: string[]) {
  const encoded = new TextEncoder().encode(frames.join('\n\n'));
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

describe('AnthropicAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('streams text and tool use events', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(
      createStreamingResponse([
        'event: message_start\ndata: {"type":"message_start","index":0,"message":{"usage":{"input_tokens":12,"output_tokens":0}}}',
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}',
        'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"tool_1","name":"lookup","input":{}}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"city\\":\\"Pa"}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"ris\\"}"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":1}',
        'event: message_delta\ndata: {"type":"message_delta","index":0,"delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":4}}',
        'event: message_stop\ndata: {"type":"message_stop","index":0}',
      ])
    );

    const adapter = new AnthropicAdapter({ apiKey: 'test-key' });
    const model = adapter.createModel('claude-sonnet-4-5');
    const stream = adapter.stream(model, {
      systemPrompt: 'Be useful',
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
    expect(message.usage.input).toBe(12);
    expect(message.usage.output).toBe(4);
    expect(message.usage.reasoning).toBe(0);
    expect(toolCall).toMatchObject({
      type: 'toolCall',
      id: 'tool_1',
      name: 'lookup',
      arguments: { city: 'Paris' },
    });

    const request = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(request.system).toBe('Be useful');
    expect(request.tools[0].input_schema.required).toEqual(['city']);
  });
});
