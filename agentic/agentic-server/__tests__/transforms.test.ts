/**
 * The Ollama dialect of a chat request and response.
 *
 * A tool-calling harness (pi) sends `tools`, a `response_format`, and reads
 * `tool_calls` back in the OpenAI shape; a model served by Ollama needs `think`,
 * `keep_alive` and `num_ctx` to be reachable at all. Each must cross the
 * gateway, or `ollama/…` can serve chat but no agent.
 */

import { transformChatRequest, transformChatResponse } from '../src/transforms';
import type { ResolvedProvider } from '../src/types';

const ollama: ResolvedProvider = { type: 'ollama', baseUrl: 'http://ollama.test:11434' };

const weatherTool = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Weather for a city',
    parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }
  }
};

describe('transformChatRequest for ollama', () => {
  it('forwards tools and tool_choice', () => {
    const body = transformChatRequest(ollama, {
      model: 'qwen3:8b',
      messages: [{ role: 'user', content: 'weather in Paris?' }],
      tools: [weatherTool],
      tool_choice: 'auto'
    });
    expect(body.tools).toEqual([weatherTool]);
  });

  it('turns response_format json_object into format json', () => {
    const body = transformChatRequest(ollama, {
      model: 'qwen3:8b',
      messages: [],
      response_format: { type: 'json_object' }
    });
    expect(body.format).toBe('json');
  });

  it('turns response_format json_schema into the schema as format', () => {
    const schema = { type: 'object', properties: { intent: { type: 'string' } } };
    const body = transformChatRequest(ollama, {
      model: 'qwen3:8b',
      messages: [],
      response_format: { type: 'json_schema', json_schema: { name: 'route', schema } }
    });
    expect(body.format).toEqual(schema);
  });

  it('passes an ollama-native format through', () => {
    const body = transformChatRequest(ollama, { model: 'qwen3:8b', messages: [], format: 'json' });
    expect(body.format).toBe('json');
  });

  it('forwards think and keep_alive, and num_ctx under options', () => {
    const body = transformChatRequest(ollama, {
      model: 'qwen3:8b',
      messages: [],
      think: true,
      keep_alive: '30m',
      num_ctx: 32768,
      temperature: 0.1,
      max_tokens: 512
    });
    expect(body.think).toBe(true);
    expect(body.keep_alive).toBe('30m');
    expect(body.options).toEqual({ temperature: 0.1, num_predict: 512, num_ctx: 32768 });
  });

  it('omits what the caller did not send', () => {
    const body = transformChatRequest(ollama, { model: 'qwen3:8b', messages: [] });
    expect(body).toEqual({ model: 'qwen3:8b', messages: [], stream: false });
  });

  it('parses the arguments string of an earlier assistant tool call into the object ollama takes', () => {
    const body = transformChatRequest(ollama, {
      model: 'qwen3:8b',
      messages: [
        { role: 'user', content: 'weather in Paris?' },
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            { id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{"city":"Paris"}' } }
          ]
        },
        { role: 'tool', tool_call_id: 'call_1', content: '{"temp_c":18}' }
      ]
    });
    const messages = body.messages as Array<Record<string, any>>;
    expect(messages[1].tool_calls[0].function.arguments).toEqual({ city: 'Paris' });
    expect(messages[2]).toMatchObject({ role: 'tool', content: '{"temp_c":18}' });
  });

  it('strips a `name/` prefix that names the provider, not only a `type/` one', () => {
    const named: ResolvedProvider = { name: 'host-ollama', type: 'ollama', baseUrl: 'http://host:11434' };
    expect(transformChatRequest(named, { model: 'host-ollama/qwen3:8b', messages: [] }).model).toBe('qwen3:8b');
    expect(transformChatRequest(named, { model: 'ollama/qwen3:8b', messages: [] }).model).toBe('qwen3:8b');
  });
});

describe('transformChatResponse for ollama', () => {
  it('returns tool calls in the OpenAI shape with finish_reason tool_calls', () => {
    const { body } = transformChatResponse(
      {
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{ function: { name: 'get_weather', arguments: { city: 'Paris' } } }]
        },
        done: true,
        done_reason: 'stop',
        prompt_eval_count: 20,
        eval_count: 10
      },
      ollama
    );
    const choice = (body.choices as any[])[0];
    expect(choice.finish_reason).toBe('tool_calls');
    expect(choice.message.tool_calls).toHaveLength(1);
    expect(choice.message.tool_calls[0]).toMatchObject({
      type: 'function',
      function: { name: 'get_weather', arguments: '{"city":"Paris"}' }
    });
    expect(typeof choice.message.tool_calls[0].id).toBe('string');
    expect(choice.message.tool_calls[0].id).not.toBe('');
  });

  it('reports a tool call cut off by the token budget as length, not as a completed tool_calls turn', () => {
    const { body } = transformChatResponse(
      {
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{ function: { name: 'get_weather', arguments: { city: 'Par' } } }]
        },
        done: true,
        done_reason: 'length'
      },
      ollama
    );
    const choice = (body.choices as any[])[0];
    expect(choice.finish_reason).toBe('length');
    expect(choice.message.tool_calls).toHaveLength(1);
  });

  it('reports a truncated answer as finish_reason length', () => {
    const { body } = transformChatResponse(
      { message: { role: 'assistant', content: 'partial' }, done: true, done_reason: 'length' },
      ollama
    );
    expect((body.choices as any[])[0].finish_reason).toBe('length');
  });

  it('surfaces thinking as reasoning_content beside the answer', () => {
    const { body } = transformChatResponse(
      { message: { role: 'assistant', content: 'yes', thinking: 'the user asked…' }, done: true, done_reason: 'stop' },
      ollama
    );
    expect((body.choices as any[])[0].message).toEqual({
      role: 'assistant',
      content: 'yes',
      reasoning_content: 'the user asked…'
    });
  });
});
