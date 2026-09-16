import type { AgentEvent } from '@agentic-kit/agent';
import { createGraphQLConversationClient, TaskWriter, Transcript } from '@agentic-kit/agent-conversation';

import { FakeAgentApi } from '../../agent-conversation/__tests__/fake-client';
import { parseTodos, TranscriptWriter } from '../src/events';

const THREAD_ID = '00000000-0000-0000-0000-0000000000ad';

function setup(withTasks = true) {
  const api = new FakeAgentApi();
  const conversation = createGraphQLConversationClient({
    client: api,
    threadId: THREAD_ID
  });
  const transcript = new Transcript(conversation);
  const tasks = withTasks ? new TaskWriter({ client: conversation }) : undefined;
  return { api, writer: new TranscriptWriter({ transcript, tasks }) };
}

const assistantMessage = (text: string): AgentEvent =>
  ({
    type: 'message_end',
    message: {
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'hmm' },
        { type: 'text', text }
      ]
    }
  }) as unknown as AgentEvent;

const toolStart = (toolName: string, args: Record<string, unknown>, id = 'c1'): AgentEvent => ({
  type: 'tool_execution_start',
  toolCallId: id,
  toolName,
  args
});

const toolEnd = (text: string, isError = false, id = 'c1'): AgentEvent =>
  ({
    type: 'tool_execution_end',
    toolCallId: id,
    toolName: 'read_file',
    isError,
    result: { content: [{ type: 'text', text }] }
  }) as unknown as AgentEvent;

describe('transcript writer', () => {
  it('writes prose, and only the prose', async () => {
    const { api, writer } = setup();
    writer.handler(assistantMessage('  I will start by reading the tests.  '));
    await writer.drain();

    expect(api.messages).toHaveLength(1);
    expect(api.messages[0].parts).toEqual([
      { type: 'text', text: 'I will start by reading the tests.' }
    ]);
  });

  it('rewrites the tool call in place as it runs', async () => {
    const { api, writer } = setup();
    writer.handler(toolStart('read_file', { path: 'README.md' }));
    writer.handler(toolEnd('# readme'));
    await writer.drain();

    expect(api.messages).toHaveLength(1);
    expect(api.messages[0].parts![0]).toMatchObject({
      type: 'tool-read_file',
      toolCallId: 'c1',
      input: { path: 'README.md' },
      state: 'output-available',
      output: '# readme'
    });
  });

  it('records a failed tool as output-error', async () => {
    const { api, writer } = setup();
    writer.handler(toolStart('read_file', {}));
    writer.handler(toolEnd('ENOENT', true));
    await writer.drain();
    expect(api.messages[0].parts![0]).toMatchObject({ state: 'output-error', output: 'ENOENT' });
  });

  it('keeps the run\u2019s order even though events arrive synchronously', async () => {
    const { api, writer } = setup();
    writer.handler(assistantMessage('first'));
    writer.handler(toolStart('read_file', {}));
    writer.handler(toolEnd('body'));
    writer.handler(assistantMessage('last'));
    await writer.drain();

    expect(api.messages.map((m) => m.parts![0].type)).toEqual([
      'text',
      'tool-read_file',
      'text'
    ]);
  });

  it('mirrors the todo list into agent_task', async () => {
    const { api, writer } = setup();
    writer.handler(
      toolStart('todo_write', {
        todos: [
          { description: 'read the tests', status: 'in_progress' },
          { content: 'write the fix' }
        ]
      })
    );
    await writer.drain();

    expect(api.tasks.map((t) => [t.description, t.status, t.orderIndex])).toEqual([
      ['read the tests', 'in_progress', 0],
      ['write the fix', 'pending', 1]
    ]);
  });

  it('surfaces a write failure from drain rather than losing it', async () => {
    const { writer } = setup();
    writer.handler(toolEnd('never started'));
    await expect(writer.drain()).rejects.toThrow(/ended without having started/);
  });

  it('refuses an in-band tool decision, which this runner cannot answer', async () => {
    const { writer } = setup();
    writer.handler({
      type: 'tool_decision_pending',
      toolCallId: 'c1',
      toolName: 'apply_migration',
      input: {},
      schema: { type: 'object' }
    } as unknown as AgentEvent);
    await expect(writer.drain()).rejects.toThrow(/in-band decision/);
  });
});

describe('parseTodos', () => {
  it('is absent when the call carries no list', () => {
    expect(parseTodos({ note: 'hello' })).toBeNull();
  });

  it('rejects a status agent_task cannot model', () => {
    expect(() => parseTodos({ todos: [{ description: 'x', status: 'wondering' }] })).toThrow(
      /agent_task does not model/
    );
  });

  it('rejects a todo with no description', () => {
    expect(() => parseTodos({ todos: [{ status: 'pending' }] })).toThrow(/no description/);
  });
});
