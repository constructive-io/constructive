import { createGraphQLConversationClient } from '../src/graphql-conversation';
import { Inbox, isApprovalEvent } from '../src/inbox';
import { requestApproval, respondToApproval, textPart, toolPart } from '../src/parts';
import { TaskWriter } from '../src/tasks';
import { loadOrCreateThread, ThreadNotFoundError } from '../src/thread';
import { toolPartOf, Transcript } from '../src/transcript';
import { FakeAgentApi } from './fake-client';

const DATABASE_ID = '00000000-0000-0000-0000-0000000000db';

// The transcript, the inbox and the task writer take a conversation client
// rather than a GraphQL client: the thread and the attribution belong to the
// client, so nothing they are handed can name another conversation.
const conversation = (api: FakeAgentApi, threadId: string) =>
  createGraphQLConversationClient({
    client: api,
    threadId,
    actorId: 'actor-1',
  });

describe('thread load/create', () => {
  it('creates a thread when the run carries none', async () => {
    const api = new FakeAgentApi();
    const thread = await loadOrCreateThread({
      client: api,
      databaseId: DATABASE_ID,
      title: 'Fix the login bug',
    });
    expect(thread.title).toBe('Fix the login bug');
    expect(api.threads.get(thread.id)).toBeDefined();
  });

  it('loads the thread it was pointed at', async () => {
    const api = new FakeAgentApi();
    const created = await loadOrCreateThread({ client: api, databaseId: DATABASE_ID });
    const loaded = await loadOrCreateThread({
      client: api,
      databaseId: DATABASE_ID,
      threadId: created.id,
    });
    expect(loaded.id).toBe(created.id);
  });

  it('throws rather than inventing a thread that does not exist', async () => {
    const api = new FakeAgentApi();
    await expect(
      loadOrCreateThread({ client: api, databaseId: DATABASE_ID, threadId: 'nope' })
    ).rejects.toThrow(ThreadNotFoundError);
  });
});

describe('transcript', () => {
  it('appends prose and rewrites a tool part in place', async () => {
    const api = new FakeAgentApi();
    const thread = await loadOrCreateThread({ client: api, databaseId: DATABASE_ID });
    const transcript = new Transcript(conversation(api, thread.id), { model: 'gpt-5' });

    const text = await transcript.appendText('working on it');
    expect(text).toMatchObject({ authorRole: 'assistant', model: 'gpt-5' });

    const part = toolPart({ toolName: 'apply_migration', toolCallId: 'c1', input: {} });
    const message = await transcript.appendToolPart(part);
    await transcript.updateToolPart(message.id, requestApproval(part, 'a1'));

    const stored = api.messages.find((m) => m.id === message.id)!;
    expect(toolPartOf(stored as never)).toMatchObject({
      state: 'approval-requested',
      approval: { id: 'a1' },
    });
  });
});

describe('inbox', () => {
  it('classifies user turns, approvals and cancels, once each', async () => {
    const api = new FakeAgentApi();
    const thread = await loadOrCreateThread({ client: api, databaseId: DATABASE_ID });
    const inbox = new Inbox({ client: conversation(api, thread.id), since: thread.createdAt! });

    api.addUserMessage(thread.id, [textPart('also rename the button')]);
    const requested = requestApproval(
      toolPart({ toolName: 'apply_migration', toolCallId: 'c1', input: {} }),
      'a1'
    );
    api.addUserMessage(thread.id, [respondToApproval(requested, { approved: false, reason: 'no' })]);
    api.addUserMessage(thread.id, [textPart('/cancel')]);

    const events = await inbox.poll();
    expect(events.map((e) => e.kind)).toEqual(['user-turn', 'approval', 'cancel']);
    expect(events[1]).toMatchObject({ toolCallId: 'c1', approved: false, reason: 'no' });
    expect(await inbox.poll()).toEqual([]);
  });

  it('ignores the agent\u2019s own messages', async () => {
    const api = new FakeAgentApi();
    const thread = await loadOrCreateThread({ client: api, databaseId: DATABASE_ID });
    const transcript = new Transcript(conversation(api, thread.id));
    const inbox = new Inbox({ client: conversation(api, thread.id), since: thread.createdAt! });

    await transcript.appendText('thinking');
    expect(await inbox.poll()).toEqual([]);
  });

  it('rejects a decision message that carries no decision', async () => {
    const api = new FakeAgentApi();
    const thread = await loadOrCreateThread({ client: api, databaseId: DATABASE_ID });
    const inbox = new Inbox({ client: conversation(api, thread.id), since: thread.createdAt! });
    api.addUserMessage(thread.id, [
      { ...toolPart({ toolName: 't', toolCallId: 'c1', input: {} }), state: 'approval-responded' },
    ]);
    await expect(inbox.poll()).rejects.toThrow(/carries no decision/);
  });

  it('waits for an approval, keeping the turns it was not waiting for', async () => {
    const api = new FakeAgentApi();
    const thread = await loadOrCreateThread({ client: api, databaseId: DATABASE_ID });
    let ticks = 0;
    const inbox = new Inbox({
      client: conversation(api, thread.id),
      since: thread.createdAt!,
      pollIntervalMs: 1,
      sleep: async () => {
        ticks += 1;
        if (ticks === 1) api.addUserMessage(thread.id, [textPart('one more thing')]);
        if (ticks === 2) {
          const requested = requestApproval(
            toolPart({ toolName: 'apply_migration', toolCallId: 'c1', input: {} }),
            'a1'
          );
          api.addUserMessage(thread.id, [respondToApproval(requested, { approved: true })]);
        }
      },
    });

    const result = await inbox.waitFor(isApprovalEvent, { timeoutMs: 10_000 });
    expect(result.event).toMatchObject({ toolCallId: 'c1', approved: true });
    expect(result.others.map((e) => e.kind)).toEqual(['user-turn']);
  });

  it('reports a cancel instead of waiting out the timeout', async () => {
    const api = new FakeAgentApi();
    const thread = await loadOrCreateThread({ client: api, databaseId: DATABASE_ID });
    const inbox = new Inbox({
      client: conversation(api, thread.id),
      since: thread.createdAt!,
      pollIntervalMs: 1,
      sleep: async () => {
        api.addUserMessage(thread.id, [textPart('/stop')]);
      },
    });

    const result = await inbox.waitFor(isApprovalEvent, { timeoutMs: 10_000 });
    expect(result.event).toBeNull();
    expect(result.cancelled).toMatchObject({ kind: 'cancel' });
  });

  it('gives up at the deadline', async () => {
    const api = new FakeAgentApi();
    const thread = await loadOrCreateThread({ client: api, databaseId: DATABASE_ID });
    let now = 0;
    const inbox = new Inbox({
      client: conversation(api, thread.id),
      since: thread.createdAt!,
      pollIntervalMs: 1,
      sleep: async () => {
        now += 500;
      },
    });

    const result = await inbox.waitFor(isApprovalEvent, { timeoutMs: 1000, now: () => now });
    expect(result).toMatchObject({ event: null, cancelled: null });
  });
});

describe('task writer', () => {
  it('inserts new todos, patches moved ones and leaves the rest alone', async () => {
    const api = new FakeAgentApi();
    const thread = await loadOrCreateThread({ client: api, databaseId: DATABASE_ID });
    const writer = new TaskWriter({ client: conversation(api, thread.id) });

    await writer.sync([
      { description: 'read the code', status: 'in_progress' },
      { description: 'write the fix', status: 'pending' },
    ]);
    api.operations.length = 0;

    await writer.sync([
      { description: 'read the code', status: 'completed' },
      { description: 'write the fix', status: 'pending' },
      { description: 'run the tests', status: 'pending' },
    ]);

    expect(api.operations).toEqual(['CodeTaskUpdateTask', 'CodeTaskCreateTask']);
    expect(api.tasks.map((t) => [t.description, t.status, t.orderIndex])).toEqual([
      ['read the code', 'completed', 0],
      ['write the fix', 'pending', 1],
      ['run the tests', 'pending', 2],
    ]);
    expect(api.tasks.every((t) => t.parentColumn === 'threadId' && t.parentId === thread.id)).toBe(
      true
    );
  });
});
