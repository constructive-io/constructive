import { createGraphQLConversationClient, Inbox, requestApproval, respondToApproval, textPart, toolPart, Transcript } from '@agentic-kit/agent-conversation';

import { FakeAgentApi } from '../../agent-conversation/__tests__/fake-client';
import { createThreadGateHost } from '../src/gate';

const THREAD_ID = '00000000-0000-0000-0000-0000000000ad';

interface Harness {
  api: FakeAgentApi;
  transcript: Transcript;
  inbox: Inbox;
  /** Runs on each poll tick, so a suite scripts the human. */
  onTick: (tick: number) => void;
}

function harness(): Harness {
  const api = new FakeAgentApi();
  api.threads.set(THREAD_ID, {
    id: THREAD_ID,
    title: null,
    status: null,
    mode: null,
    model: null,
    systemPrompt: null,
    agentId: null,
    createdAt: new Date(0).toISOString()
  });

  const conversation = createGraphQLConversationClient({
    client: api,
    threadId: THREAD_ID
  });

  let tick = 0;
  const h: Harness = {
    api,
    transcript: new Transcript(conversation),
    inbox: new Inbox({
      client: conversation,
      since: new Date(0).toISOString(),
      pollIntervalMs: 1,
      sleep: async () => {
        tick += 1;
        h.onTick(tick);
      }
    }),
    onTick: () => undefined
  };
  return h;
}

/** The human answering the pending confirm the run just wrote. */
function answer(api: FakeAgentApi, decision: { approved: boolean; reason?: string }): void {
  const pending = api.messages
    .flatMap((message) => message.parts ?? [])
    .find((part) => 'state' in part && part.state === 'approval-requested');
  if (!pending || !('toolCallId' in pending)) throw new Error('nothing pending to answer');
  api.addUserMessage(THREAD_ID, [respondToApproval(pending, decision)]);
}

describe('thread gate host', () => {
  it('is a UI: a decision can be obtained, asynchronously', () => {
    const h = harness();
    expect(createThreadGateHost({ transcript: h.transcript, inbox: h.inbox }).hasUI).toBe(true);
  });

  it('writes the pending call, waits, and returns the approval', async () => {
    const h = harness();
    const host = createThreadGateHost({
      transcript: h.transcript,
      inbox: h.inbox,
      newApprovalId: () => 'a1'
    });
    h.onTick = () => answer(h.api, { approved: true, reason: 'go ahead' });

    await expect(host.confirmTool('call-1', 'Apply migration?', 'It adds a table.')).resolves.toBe(
      true
    );

    const written = h.api.messages.find((m) => m.authorRole === 'assistant')!;
    expect(written.parts![0]).toMatchObject({
      type: 'tool-confirm',
      toolCallId: 'call-1',
      state: 'approval-responded',
      approval: { id: 'a1', approved: true, reason: 'go ahead' }
    });
    expect((written.parts![0] as { input: { title: string } }).input.title).toBe(
      'Apply migration?'
    );
  });

  it('records a decline as output-denied', async () => {
    const h = harness();
    const host = createThreadGateHost({ transcript: h.transcript, inbox: h.inbox });
    h.onTick = () => answer(h.api, { approved: false, reason: 'not that table' });

    await expect(host.confirmTool('call-1', 'Delete table?', 'It drops rows.')).resolves.toBe(
      false
    );
    const written = h.api.messages.find((m) => m.authorRole === 'assistant')!;
    expect(written.parts![0]).toMatchObject({
      state: 'output-denied',
      output: 'not that table'
    });
  });

  it('treats a cancel as a decline and tells the runner', async () => {
    const h = harness();
    const cancels: (string | undefined)[] = [];
    const host = createThreadGateHost({
      transcript: h.transcript,
      inbox: h.inbox,
      onCancel: (reason) => cancels.push(reason)
    });
    h.onTick = () => h.api.addUserMessage(THREAD_ID, [textPart('/cancel')]);

    await expect(host.confirmTool('call-1', 'Apply?', 'x')).resolves.toBe(false);
    expect(cancels).toEqual(['/cancel']);
    const written = h.api.messages.find((m) => m.authorRole === 'assistant')!;
    expect(written.parts![0]).toMatchObject({ state: 'output-denied', output: '/cancel' });
  });

  it('declines when nobody answers before the deadline', async () => {
    const h = harness();
    let now = 0;
    const inbox = new Inbox({
      client: createGraphQLConversationClient({
        client: h.api,
        threadId: THREAD_ID
      }),
      since: new Date(0).toISOString(),
      pollIntervalMs: 1,
      sleep: async () => {
        now += 60_000;
      }
    });
    // `Inbox.waitFor` reads its clock from the option it is given; the gate
    // passes none, so drive the deadline by advancing the shared fake clock.
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    try {
      const host = createThreadGateHost({
        transcript: h.transcript,
        inbox,
        approvalTimeoutMs: 120_000
      });
      await expect(host.confirmTool('call-1', 'Apply?', 'x')).resolves.toBe(false);
    } finally {
      jest.restoreAllMocks();
    }

    const written = h.api.messages.find((m) => m.authorRole === 'assistant')!;
    expect(written.parts![0]).toMatchObject({ state: 'output-error' });
    expect((written.parts![0] as { output: string }).output).toContain('120s');
  });

  it('refuses a decision for a call it is not waiting on', async () => {
    const h = harness();
    const host = createThreadGateHost({ transcript: h.transcript, inbox: h.inbox });
    h.onTick = () => {
      const other = requestApproval(
        toolPart({ toolName: 'confirm', toolCallId: 'other', input: {} }),
        'a9'
      );
      h.api.addUserMessage(THREAD_ID, [respondToApproval(other, { approved: true })]);
    };

    await expect(host.confirmTool('call-1', 'Apply?', 'x')).rejects.toThrow(
      /approval for tool call other arrived while call-1 was pending/
    );
  });

  it('writes a skipped-tool notice, and drains clean when it lands', async () => {
    const h = harness();
    const host = createThreadGateHost({ transcript: h.transcript, inbox: h.inbox });

    host.notifyToolSkipped('call-7');
    await host.drain();

    const written = h.api.messages.find((m) => m.authorRole === 'assistant')!;
    expect((written.parts![0] as { text: string }).text).toContain('call-7');
  });

  it('fails the run when a skipped-tool notice cannot be written', async () => {
    const h = harness();
    const boom = new Error('thread is gone');
    jest.spyOn(h.transcript, 'appendText').mockRejectedValue(boom);
    const host = createThreadGateHost({ transcript: h.transcript, inbox: h.inbox });

    host.notifyToolSkipped('call-7');

    await expect(host.drain()).rejects.toThrow(/thread is gone/);
    jest.restoreAllMocks();
  });
});
