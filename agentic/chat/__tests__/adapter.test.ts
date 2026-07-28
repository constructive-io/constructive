import {
  createScriptedProvider,
  makeFakeAssistantMessage,
  makeFakeModel,
} from './helpers';

import {
  AgentKit,
  type AssistantMessage,
  getMessageText,
  type ModelDescriptor,
  transformMessages,
} from '../src';

function createFakeModel(): ModelDescriptor {
  return makeFakeModel({ name: 'Demo' });
}

function createAssistantMessage(
  overrides: Partial<AssistantMessage> = {}
): AssistantMessage {
  return makeFakeAssistantMessage({
    content: [{ type: 'text', text: 'hello world' }],
    ...overrides,
  });
}

describe('agentic-kit core', () => {
  it('transforms cross-provider thinking and inserts orphaned tool results', () => {
    const sourceModel = createFakeModel();
    const targetModel: ModelDescriptor = {
      ...sourceModel,
      provider: 'other',
      api: 'other-api',
      id: 'other-model',
    };

    const messages = transformMessages(
      [
        {
          role: 'assistant',
          api: sourceModel.api,
          provider: sourceModel.provider,
          model: sourceModel.id,
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
            { type: 'thinking', thinking: 'private chain' },
            { type: 'toolCall', id: 'call|1', name: 'lookup', arguments: { city: 'Paris' } },
          ],
        },
        { role: 'user', content: 'continue', timestamp: Date.now() },
      ],
      targetModel
    );

    expect(messages[0]).toMatchObject({
      role: 'assistant',
      content: [
        { type: 'text', text: '<thinking>private chain</thinking>' },
        { type: 'toolCall', id: 'call|1', name: 'lookup' },
      ],
    });
    expect(messages[1]).toMatchObject({
      role: 'toolResult',
      toolCallId: 'call|1',
      isError: true,
    });
  });

  it('drops aborted assistant turns and rewrites tool result ids for stricter providers', () => {
    const sourceModel = createFakeModel();
    const targetModel: ModelDescriptor = {
      ...sourceModel,
      provider: 'anthropic',
      api: 'anthropic-messages',
      id: 'claude-demo',
    };

    const transformed = transformMessages(
      [
        {
          role: 'assistant',
          api: sourceModel.api,
          provider: sourceModel.provider,
          model: sourceModel.id,
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
            { type: 'toolCall', id: 'call|needs-normalizing', name: 'lookup', arguments: { city: 'Paris' } },
          ],
        },
        {
          role: 'toolResult',
          toolCallId: 'call|needs-normalizing',
          toolName: 'lookup',
          content: [{ type: 'text', text: 'ok' }],
          isError: false,
          timestamp: Date.now(),
        },
        {
          role: 'assistant',
          api: sourceModel.api,
          provider: sourceModel.provider,
          model: sourceModel.id,
          usage: {
            input: 0,
            output: 0,
            reasoning: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          },
          stopReason: 'aborted',
          errorMessage: 'cancelled',
          timestamp: Date.now(),
          content: [{ type: 'text', text: 'partial' }],
        },
      ],
      targetModel
    );

    expect(transformed).toHaveLength(2);
    expect(transformed[0]).toMatchObject({
      role: 'assistant',
      content: [
        {
          type: 'toolCall',
          id: 'call_needs-normalizing',
          name: 'lookup',
        },
      ],
    });
    expect(transformed[1]).toMatchObject({
      role: 'toolResult',
      toolCallId: 'call_needs-normalizing',
      toolName: 'lookup',
      isError: false,
    });
  });

  it('normalizes short mistral tool-call ids without hanging and keeps tool results aligned', () => {
    const sourceModel = createFakeModel();
    const targetModel: ModelDescriptor = {
      ...sourceModel,
      provider: 'mistral',
      api: 'openai-compatible',
      id: 'mistral-demo',
      compat: {
        toolCallIdFormat: 'mistral9',
      },
    };

    const transformed = transformMessages(
      [
        {
          ...createAssistantMessage({
            api: sourceModel.api,
            provider: sourceModel.provider,
            model: sourceModel.id,
            stopReason: 'toolUse',
            content: [{ type: 'toolCall', id: '%', name: 'lookup', arguments: { city: 'Paris' } }],
          }),
        },
        {
          role: 'toolResult',
          toolCallId: '%',
          toolName: 'lookup',
          content: [{ type: 'text', text: 'ok' }],
          isError: false,
          timestamp: Date.now(),
        },
      ],
      targetModel
    );

    expect(transformed).toHaveLength(2);
    expect(transformed[0]?.role).toBe('assistant');
    expect(transformed[1]).toMatchObject({
      role: 'toolResult',
      toolName: 'lookup',
      isError: false,
    });

    const assistant = transformed[0];
    if (!assistant || assistant.role !== 'assistant') {
      throw new Error('Expected assistant message');
    }

    const toolCall = assistant.content[0];
    if (!toolCall || toolCall.type !== 'toolCall') {
      throw new Error('Expected tool call content');
    }

    expect(toolCall.id).toMatch(/^[A-Za-z0-9]{9}$/);
    expect(toolCall.id).not.toContain('_');
    expect(transformed[1]).toMatchObject({
      role: 'toolResult',
      toolCallId: toolCall.id,
    });
  });

  it('keeps the legacy AgentKit generate API working through structured streams', async () => {
    const kit = new AgentKit().addProvider(
      createScriptedProvider({
        responses: [createAssistantMessage(), createAssistantMessage()],
      })
    );
    const chunks: string[] = [];
    await kit.generate(
      { model: 'demo', prompt: 'hi', stream: true },
      { onChunk: (chunk) => chunks.push(chunk) }
    );

    expect(chunks).toEqual(['hello world']);
    await expect(kit.generate({ model: 'demo', prompt: 'hi' })).resolves.toBe('hello world');
  });

  it('rejects legacy generate when a provider returns a terminal error in non-stream mode', async () => {
    const kit = new AgentKit().addProvider(
      createScriptedProvider({
        responses: [
          createAssistantMessage({
            stopReason: 'error',
            errorMessage: 'provider failed',
            content: [{ type: 'text', text: '' }],
          }),
        ],
      })
    );
    const onComplete = jest.fn();
    const onError = jest.fn();
    const onStateChange = jest.fn();

    await expect(
      kit.generate(
        { model: 'demo', prompt: 'hi' },
        { onComplete, onError, onStateChange }
      )
    ).rejects.toThrow('provider failed');

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onStateChange).not.toHaveBeenCalledWith('complete');
  });

  it('rejects legacy generate when a provider returns a terminal error in stream mode', async () => {
    const kit = new AgentKit().addProvider(
      createScriptedProvider({
        responses: [
          createAssistantMessage({
            stopReason: 'error',
            errorMessage: 'provider failed',
            content: [{ type: 'text', text: 'partial' }],
          }),
        ],
      })
    );
    const chunks: string[] = [];
    const onComplete = jest.fn();
    const onError = jest.fn();
    const onStateChange = jest.fn();

    await expect(
      kit.generate(
        { model: 'demo', prompt: 'hi', stream: true },
        {
          onChunk: (chunk) => chunks.push(chunk),
          onComplete,
          onError,
          onStateChange,
        }
      )
    ).rejects.toThrow('provider failed');

    expect(chunks).toEqual(['partial']);
    expect(onStateChange).toHaveBeenCalledWith('streaming');
    expect(onComplete).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('extracts assistant text from mixed content blocks', () => {
    const text = getMessageText({
      role: 'assistant',
      api: 'fake-api',
      provider: 'fake',
      model: 'demo',
      usage: {
        input: 0,
        output: 0,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: 'stop',
      timestamp: Date.now(),
      content: [
        { type: 'thinking', thinking: 'ignore me' },
        { type: 'text', text: 'hello ' },
        { type: 'toolCall', id: 'tool_1', name: 'lookup', arguments: { city: 'Paris' } },
        { type: 'text', text: 'world' },
      ],
    });

    expect(text).toBe('hello world');
  });
});
