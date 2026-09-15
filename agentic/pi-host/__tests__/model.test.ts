import type { Context, ModelDescriptor } from '@agentic-kit/chat';

import { createMeteredModel, gatewayApiRoot, meteringHeaders } from '../src/model';

/**
 * The gateway is the only provider a Job has, so what matters is the request it
 * receives — which model, which identity, which tools — and that a plain
 * request/response completion becomes the event sequence the agent loop reads.
 */

const IDENTITY = {
  databaseId: '00000000-0000-0000-0000-0000000000db',
  entityId: '00000000-0000-0000-0000-0000000000e1',
  actorId: '00000000-0000-0000-0000-0000000000ac'
};

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

const stubGateway = (completion: unknown): { calls: Captured[]; fetchImpl: typeof fetch } => {
  const calls: Captured[] = [];
  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body)) as Record<string, unknown>
    });
    return new Response(JSON.stringify(completion), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
};

const context = (): Context => ({
  systemPrompt: 'be terse',
  messages: [{ role: 'user', content: 'rename the module', timestamp: 1 }],
  tools: [{ name: 'read_file', description: 'read', parameters: { type: 'object' } }]
});

const drain = async (
  stream: AsyncIterable<{ type: string }>
): Promise<string[]> => {
  const types: string[] = [];
  for await (const event of stream) types.push(event.type);
  return types;
};

describe('meteringHeaders', () => {
  it('always names the database, and bills the entity when there is one', () => {
    expect(meteringHeaders(IDENTITY)).toEqual({
      'X-Database-Id': IDENTITY.databaseId,
      'X-Entity-Id': IDENTITY.entityId,
      'X-Actor-Id': IDENTITY.actorId
    });
  });

  it('falls back to the org, then the actor — a run without an entity still meters', () => {
    expect(
      meteringHeaders({ databaseId: 'db', organizationId: 'org', actorId: 'actor' })
    ).toEqual({ 'X-Database-Id': 'db', 'X-Entity-Id': 'org', 'X-Actor-Id': 'actor' });

    expect(meteringHeaders({ databaseId: 'db' })).toEqual({ 'X-Database-Id': 'db' });
  });
});

describe('gatewayApiRoot', () => {
  // `resolveMeteredGateway` accepts every one of these forms, so a host that
  // appended `/v1` unconditionally posted to `/v1/v1/chat/completions` — a 404
  // the run reported as "no assistant message", naming no url.
  it('resolves one api root from every form the projection takes', () => {
    for (const url of [
      'http://agentic-server.svc:3000',
      'http://agentic-server.svc:3000/',
      'http://agentic-server.svc:3000/v1',
      'http://agentic-server.svc:3000/v1/'
    ]) {
      expect(gatewayApiRoot(url)).toBe('http://agentic-server.svc:3000/v1');
    }
  });

  it('leaves a path that merely ends in v1 as a path', () => {
    expect(gatewayApiRoot('http://gw.svc/api/v1')).toBe('http://gw.svc/api/v1');
  });
});

describe('createMeteredModel', () => {
  it('refuses to build a model with no gateway to meter against', () => {
    expect(() =>
      createMeteredModel({ ...IDENTITY, agenticServerUrl: '', model: 'gpt-4o' })
    ).toThrow(/AGENTIC_SERVER_URL/);
  });

  it('posts to the gateway api root when the url was projected with /v1', async () => {
    const { calls, fetchImpl } = stubGateway({
      choices: [{ message: { content: 'done' }, finish_reason: 'stop' }]
    });
    const metered = createMeteredModel({
      ...IDENTITY,
      agenticServerUrl: 'http://agentic-server.svc/v1',
      model: 'gpt-4o',
      fetchImpl
    });

    await drain(metered.streamFn(metered.model, context()));

    expect(calls[0].url).toBe('http://agentic-server.svc/v1/chat/completions');
  });

  it('posts one non-streaming completion to the gateway, with the identity headers', async () => {
    const { calls, fetchImpl } = stubGateway({
      choices: [{ message: { content: 'done' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 11, completion_tokens: 3, total_tokens: 14 }
    });
    const metered = createMeteredModel({
      ...IDENTITY,
      agenticServerUrl: 'http://agentic-server.svc/',
      model: 'gpt-4o',
      fetchImpl
    });

    const stream = metered.streamFn(metered.model, context(), { temperature: 0.2 });
    const types = await drain(stream);
    const message = await stream.result();

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('http://agentic-server.svc/v1/chat/completions');
    expect(calls[0].headers['X-Database-Id']).toBe(IDENTITY.databaseId);
    expect(calls[0].body.stream).toBeUndefined();
    expect(calls[0].body.model).toBe('gpt-4o');
    expect(calls[0].body.temperature).toBe(0.2);
    expect(calls[0].body.messages).toEqual([
      { role: 'system', content: 'be terse' },
      { role: 'user', content: 'rename the module' }
    ]);
    expect(calls[0].body.tools).toEqual([
      {
        type: 'function',
        function: { name: 'read_file', description: 'read', parameters: { type: 'object' } }
      }
    ]);

    expect(types).toEqual(['start', 'text_start', 'text_delta', 'text_end', 'done']);
    expect(message.content).toEqual([{ type: 'text', text: 'done' }]);
    expect(message.stopReason).toBe('stop');
    expect(message.usage.input).toBe(11);
    expect(message.usage.totalTokens).toBe(14);
  });

  it('renders tool calls as toolcall events and stops for tool use', async () => {
    const { fetchImpl } = stubGateway({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                function: { name: 'read_file', arguments: '{"path":"README.md"}' }
              }
            ]
          },
          finish_reason: 'tool_calls'
        }
      ]
    });
    const metered = createMeteredModel({
      ...IDENTITY,
      agenticServerUrl: 'http://agentic-server.svc',
      model: 'gpt-4o',
      fetchImpl
    });

    const stream = metered.streamFn(metered.model, context());
    const types = await drain(stream);
    const message = await stream.result();

    expect(types).toEqual(['start', 'toolcall_start', 'toolcall_delta', 'toolcall_end', 'done']);
    expect(message.stopReason).toBe('toolUse');
    expect(message.content).toEqual([
      expect.objectContaining({
        type: 'toolCall',
        id: 'call_1',
        name: 'read_file',
        arguments: { path: 'README.md' }
      })
    ]);
  });

  it('surfaces a gateway failure as an error event rather than a silent empty answer', async () => {
    const fetchImpl = (async () =>
      new Response('quota exceeded', { status: 429 })) as unknown as typeof fetch;
    const metered = createMeteredModel({
      ...IDENTITY,
      agenticServerUrl: 'http://agentic-server.svc',
      model: 'gpt-4o',
      fetchImpl
    });

    const stream = metered.streamFn(metered.model, context());
    const types = await drain(stream);
    const message = await stream.result();

    expect(types).toEqual(['start', 'error']);
    expect(message.stopReason).toBe('error');
    expect(message.errorMessage).toMatch(/429.*quota exceeded/);
  });

  it('names the gateway as the provider on the descriptor it builds', () => {
    const metered = createMeteredModel({
      ...IDENTITY,
      agenticServerUrl: 'http://agentic-server.svc',
      model: 'claude-sonnet-4'
    });
    const descriptor: ModelDescriptor = metered.model;
    expect(descriptor.id).toBe('claude-sonnet-4');
    expect(descriptor.provider).toBe('agentic-server');
    expect(descriptor.baseUrl).toBe('http://agentic-server.svc/v1');
  });
});
