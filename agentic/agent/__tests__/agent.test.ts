import {
  createScriptedProvider,
  makeFakeAssistantMessage,
  makeFakeModel,
  ZERO_USAGE,
} from './helpers';
import {
  type AssistantMessage,
  type Context,
  createAssistantMessageEventStream,
  injectDeferralResults,
  type Message,
  type ModelDescriptor,
  type ToolCallContent,
} from 'agentic-kit';

import {
  Agent,
  type AgentEvent,
  type AgentTool,
  DecisionValidationError,
} from '../src';

describe('@agentic-kit/agent', () => {
  it('runs a minimal sequential tool loop', async () => {
    const responses = [
      makeFakeAssistantMessage({
        usage: makeUsage(),
        stopReason: 'toolUse',
        content: [
          { type: 'toolCall', id: 'tool_1', name: 'echo', arguments: { text: 'hello' } },
        ],
      }),
      makeFakeAssistantMessage({
        usage: makeUsage(),
        stopReason: 'stop',
        content: [{ type: 'text', text: 'done' }],
      }),
    ];

    const provider = createScriptedProvider({ responses });
    const agent = new Agent({
      initialState: { model: makeFakeModel({ id: 'demo', name: 'Demo' }) },
      streamFn: provider.stream,
    });

    agent.setTools([
      {
        name: 'echo',
        label: 'Echo',
        description: 'Echo text',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string' },
          },
          required: ['text'],
        },
        execute: async (_toolCallId, params, _decision) => ({
          content: [{ type: 'text', text: String(params.text) }],
        }),
      },
    ]);

    await agent.prompt('hello');

    expect(agent.state.messages).toHaveLength(4);
    expect(agent.state.messages[1]).toMatchObject({
      role: 'assistant',
      stopReason: 'toolUse',
    });
    expect(agent.state.messages[2]).toMatchObject({
      role: 'toolResult',
      toolName: 'echo',
      content: [{ type: 'text', text: 'hello' }],
    });
    expect(agent.state.messages[3]).toMatchObject({
      role: 'assistant',
      content: [{ type: 'text', text: 'done' }],
    });
  });

  it('turns tool argument validation failures into error tool results and continues', async () => {
    const responses = [
      makeFakeAssistantMessage({
        stopReason: 'toolUse',
        content: [{ type: 'toolCall', id: 'tool_1', name: 'echo', arguments: {} }],
      }),
      makeFakeAssistantMessage({
        stopReason: 'stop',
        content: [{ type: 'text', text: 'recovered' }],
      }),
    ];

    const provider = createScriptedProvider({ responses });
    const agent = new Agent({
      initialState: { model: makeFakeModel({ id: 'demo', name: 'Demo' }) },
      streamFn: provider.stream,
    });

    const execute = jest.fn(async () => ({
      content: [{ type: 'text' as const, text: 'should not run' }],
    }));

    agent.setTools([
      {
        name: 'echo',
        label: 'Echo',
        description: 'Echo text',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string' },
          },
          required: ['text'],
        },
        execute,
      },
    ]);

    await agent.prompt('hello');

    expect(execute).not.toHaveBeenCalled();
    expect(agent.state.messages[2]).toMatchObject({
      role: 'toolResult',
      toolName: 'echo',
      isError: true,
    });
    expect(agent.state.messages[2].content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Tool argument validation failed'),
    });
    expect(agent.state.messages[3]).toMatchObject({
      role: 'assistant',
      content: [{ type: 'text', text: 'recovered' }],
    });
  });

  it('records aborted assistant turns when the active stream is cancelled', async () => {
    const agent = new Agent({
      initialState: { model: makeFakeModel({ id: 'demo', name: 'Demo' }) },
      streamFn: (_model: ModelDescriptor, _context: Context, options) => {
        const stream = createAssistantMessageEventStream();
        const partial = makeFakeAssistantMessage({
          stopReason: 'stop',
          content: [{ type: 'text', text: '' }],
        });

        queueMicrotask(() => {
          stream.push({ type: 'start', partial });

          options?.signal?.addEventListener(
            'abort',
            () => {
              const aborted: AssistantMessage = makeFakeAssistantMessage({
                stopReason: 'aborted',
                errorMessage: 'aborted by test',
                content: [],
              });
              stream.push({ type: 'error', reason: 'aborted', error: aborted });
              stream.end(aborted);
            },
            { once: true }
          );
        });

        return stream;
      },
    });

    const pending = agent.prompt('slow');
    setTimeout(() => agent.abort(), 0);
    await pending;

    expect(agent.state.error).toBe('aborted by test');
    expect(agent.state.messages.at(-1)).toMatchObject({
      role: 'assistant',
      stopReason: 'aborted',
      errorMessage: 'aborted by test',
    });
    expect(agent.state.isStreaming).toBe(false);
    expect(agent.state.streamMessage).toBeNull();
  });
});

function makeUsage() {
  return { ...ZERO_USAGE, cost: { ...ZERO_USAGE.cost }, input: 1, output: 1, totalTokens: 2 };
}

describe('@agentic-kit/agent — pausable tools', () => {
  function makeApprovalTool(execute: AgentTool['execute']): AgentTool {
    return {
      name: 'approve',
      label: 'Approve',
      description: 'Tool that requires explicit approval',
      parameters: {
        type: 'object',
        properties: { target: { type: 'string' } },
        required: ['target'],
      },
      decision: {
        type: 'object',
        properties: { approved: { type: 'boolean' } },
        required: ['approved'],
      },
      execute,
    };
  }

  function pauseResponse() {
    return makeFakeAssistantMessage({
      stopReason: 'toolUse',
      content: [
        { type: 'toolCall', id: 'tool_1', name: 'approve', arguments: { target: 'thing' } },
      ],
    });
  }

  function finalResponse() {
    return makeFakeAssistantMessage({
      stopReason: 'stop',
      content: [{ type: 'text', text: 'finalized' }],
    });
  }

  function attachDecision(agent: Agent, toolCallId: string, decision: unknown): void {
    const messages = agent.state.messages;
    const last = messages[messages.length - 1] as AssistantMessage;
    const updatedContent = last.content.map((block) =>
      block.type === 'toolCall' && block.id === toolCallId
        ? ({ ...block, decision } as ToolCallContent)
        : block
    );
    const updated: AssistantMessage = { ...last, content: updatedContent };
    agent.replaceMessages([...messages.slice(0, -1), updated]);
  }

  it('pauses on a decision-bearing tool and emits tool_decision_pending without runId', async () => {
    const provider = createScriptedProvider({ responses: [pauseResponse()] });
    const execute = jest.fn();
    const events: AgentEvent[] = [];

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.subscribe((event) => events.push(event));
    agent.setTools([makeApprovalTool(execute)]);

    await agent.prompt('approve thing');

    expect(execute).not.toHaveBeenCalled();
    expect(agent.state.isStreaming).toBe(false);
    expect(events.some((e) => e.type === 'agent_end')).toBe(false);

    const pendingEvent = events.find((e) => e.type === 'tool_decision_pending');
    expect(pendingEvent).toEqual({
      type: 'tool_decision_pending',
      toolCallId: 'tool_1',
      toolName: 'approve',
      input: { target: 'thing' },
      schema: expect.objectContaining({ type: 'object' }),
    });
    expect(pendingEvent).not.toHaveProperty('runId');

    const lastMessage = agent.state.messages.at(-1);
    expect(lastMessage).toMatchObject({ role: 'assistant', stopReason: 'toolUse' });
    const toolResults = agent.state.messages.filter((m) => m.role === 'toolResult');
    expect(toolResults).toHaveLength(0);
  });

  it('continue() invokes execute with the decision attached to the tool call and continues the loop', async () => {
    const provider = createScriptedProvider({ responses: [pauseResponse(), finalResponse()] });
    const execute = jest.fn(
      async (_id: string, _params: Record<string, unknown>, decision: unknown) => ({
        content: [{ type: 'text' as const, text: `decision=${JSON.stringify(decision)}` }],
      })
    );
    const events: AgentEvent[] = [];

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.subscribe((event) => events.push(event));
    agent.setTools([makeApprovalTool(execute)]);

    await agent.prompt('approve thing');

    attachDecision(agent, 'tool_1', { approved: true });

    await agent.continue();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[2]).toEqual({ approved: true });

    expect(agent.state.messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: [{ type: 'text', text: 'finalized' }],
    });
    expect(events.some((e) => e.type === 'agent_end')).toBe(true);
  });

  it('continue() throws DecisionValidationError synchronously on a malformed decision', async () => {
    const provider = createScriptedProvider({ responses: [pauseResponse(), finalResponse()] });
    const execute = jest.fn(async () => ({
      content: [{ type: 'text' as const, text: 'ok' }],
    }));

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([makeApprovalTool(execute)]);

    await agent.prompt('approve thing');

    attachDecision(agent, 'tool_1', { approved: 'yes' });

    expect(() => agent.continue()).toThrow(DecisionValidationError);
    expect(execute).not.toHaveBeenCalled();
    const toolResults = agent.state.messages.filter((m) => m.role === 'toolResult');
    expect(toolResults).toHaveLength(0);

    attachDecision(agent, 'tool_1', { approved: true });
    await agent.continue();

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('continue() rejects when the trailing assistant has tool calls but no decisions attached', async () => {
    const provider = createScriptedProvider({ responses: [pauseResponse()] });

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([makeApprovalTool(jest.fn())]);

    await agent.prompt('approve thing');

    expect(() => agent.continue()).toThrow(/no tool calls awaiting a decision/);
  });

  it('continue() rejects when non-toolResult messages have been appended after the pending assistant', async () => {
    const provider = createScriptedProvider({ responses: [pauseResponse()] });
    const execute = jest.fn();

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([makeApprovalTool(execute)]);

    await agent.prompt('approve thing');

    attachDecision(agent, 'tool_1', { approved: true });

    const trailingNote: Message = {
      role: 'user',
      content: 'side note injected by an external queue while paused',
      timestamp: Date.now(),
    };
    agent.replaceMessages([...agent.state.messages, trailingNote]);

    expect(() => agent.continue()).toThrow(/non-toolResult messages have been appended/);
    expect(execute).not.toHaveBeenCalled();
  });

  it('injectDeferralResults + prompt() places the synthetic toolResult adjacent to its assistant block', async () => {
    const provider = createScriptedProvider({
      responses: [pauseResponse(), finalResponse()],
    });
    const execute = jest.fn(async () => ({
      content: [{ type: 'text' as const, text: 'should not run' }],
    }));

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([makeApprovalTool(execute)]);

    await agent.prompt('approve thing');

    const withDeferrals = injectDeferralResults(agent.state.messages);
    agent.replaceMessages(withDeferrals);

    const typed: Message = {
      role: 'user',
      content: 'never mind',
      timestamp: Date.now(),
    };
    await agent.prompt(typed);

    const messages = agent.state.messages;
    const assistantIdx = messages.findIndex(
      (m) =>
        m.role === 'assistant' &&
        (m as AssistantMessage).content.some(
          (b) => b.type === 'toolCall' && b.id === 'tool_1'
        )
    );
    const toolResultIdx = messages.findIndex(
      (m) => m.role === 'toolResult' && m.toolCallId === 'tool_1'
    );
    const typedIdx = messages.findIndex(
      (m) => m.role === 'user' && m.content === 'never mind'
    );

    expect(assistantIdx).toBeGreaterThanOrEqual(0);
    expect(toolResultIdx).toBe(assistantIdx + 1);
    expect(typedIdx).toBe(toolResultIdx + 1);
    expect(execute).not.toHaveBeenCalled();
  });

  it('abort() while paused stops further work without throwing', async () => {
    const provider = createScriptedProvider({ responses: [pauseResponse()] });

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([makeApprovalTool(jest.fn())]);

    await agent.prompt('approve thing');

    expect(() => agent.abort()).not.toThrow();
    expect(agent.state.isStreaming).toBe(false);
  });

  it('flushes prior tool results before the args-validation error tool_result on a mixed batch', async () => {
    const provider = createScriptedProvider({
      responses: [
        makeFakeAssistantMessage({
          stopReason: 'toolUse',
          content: [
            { type: 'toolCall', id: 'tool_regular', name: 'echo', arguments: { text: 'first' } },
            { type: 'toolCall', id: 'tool_approve', name: 'approve', arguments: {} },
          ],
        }),
        makeFakeAssistantMessage({
          stopReason: 'stop',
          content: [{ type: 'text', text: 'recovered' }],
        }),
      ],
    });

    const regularExecute = jest.fn(async () => ({
      content: [{ type: 'text' as const, text: 'first-result' }],
    }));
    const approveExecute = jest.fn(async () => ({
      content: [{ type: 'text' as const, text: 'should not run' }],
    }));

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([
      {
        name: 'echo',
        label: 'Echo',
        description: 'Echo text',
        parameters: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text'],
        },
        execute: regularExecute,
      },
      makeApprovalTool(approveExecute),
    ]);

    await agent.prompt('go');

    expect(regularExecute).toHaveBeenCalledTimes(1);
    expect(approveExecute).not.toHaveBeenCalled();

    const messages = agent.state.messages;
    expect(messages[1]).toMatchObject({ role: 'assistant', stopReason: 'toolUse' });
    expect(messages[2]).toMatchObject({
      role: 'toolResult',
      toolCallId: 'tool_regular',
      toolName: 'echo',
      content: [{ type: 'text', text: 'first-result' }],
    });
    expect(messages[3]).toMatchObject({
      role: 'toolResult',
      toolCallId: 'tool_approve',
      toolName: 'approve',
      isError: true,
    });
    expect(messages[3].content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Tool argument validation failed'),
    });
    expect(messages[4]).toMatchObject({
      role: 'assistant',
      content: [{ type: 'text', text: 'recovered' }],
    });
  });

  it('abort() during tool execution stops the loop and does not invoke the model again', async () => {
    const provider = createScriptedProvider({
      responses: [
        makeFakeAssistantMessage({
          stopReason: 'toolUse',
          content: [
            { type: 'toolCall', id: 'tool_slow', name: 'slow', arguments: {} },
          ],
        }),
        makeFakeAssistantMessage({
          stopReason: 'stop',
          content: [{ type: 'text', text: 'should never reach here' }],
        }),
      ],
    });

    const streamCalls = jest.fn(provider.stream);
    let abortAgent: (() => void) | undefined;
    const slowExecute = jest.fn<
      ReturnType<AgentTool['execute']>,
      Parameters<AgentTool['execute']>
    >((_id, _params, _decision, signal) => {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener(
          'abort',
          () => reject(new Error('aborted')),
          { once: true }
        );
        queueMicrotask(() => abortAgent?.());
      });
    });

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: streamCalls,
    });
    abortAgent = () => agent.abort();
    agent.setTools([
      {
        name: 'slow',
        label: 'Slow',
        description: 'Slow tool',
        parameters: { type: 'object', properties: {} },
        execute: slowExecute,
      },
    ]);

    const events: AgentEvent[] = [];
    agent.subscribe((e) => events.push(e));

    await agent.prompt('go');

    expect(streamCalls).toHaveBeenCalledTimes(1);
    expect(slowExecute).toHaveBeenCalledTimes(1);
    const end = events.find(
      (e): e is Extract<AgentEvent, { type: 'agent_end' }> => e.type === 'agent_end'
    );
    expect(end?.stopReason).toBe('aborted');
    expect(agent.state.isStreaming).toBe(false);
  });

  it('regression: a tool without a decision schema runs without pausing', async () => {
    const provider = createScriptedProvider({
      responses: [
        makeFakeAssistantMessage({
          stopReason: 'toolUse',
          content: [
            { type: 'toolCall', id: 'tool_1', name: 'echo', arguments: { text: 'hi' } },
          ],
        }),
        makeFakeAssistantMessage({
          stopReason: 'stop',
          content: [{ type: 'text', text: 'done' }],
        }),
      ],
    });
    const execute = jest.fn(async () => ({
      content: [{ type: 'text' as const, text: 'hi' }],
    }));

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([
      {
        name: 'echo',
        label: 'Echo',
        description: 'Echo text',
        parameters: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text'],
        },
        execute,
      },
    ]);

    const events: AgentEvent[] = [];
    agent.subscribe((e) => events.push(e));

    await agent.prompt('go');

    expect(execute).toHaveBeenCalledTimes(1);
    expect(events.some((e) => e.type === 'tool_decision_pending')).toBe(false);
    expect(events.some((e) => e.type === 'agent_end')).toBe(true);
  });
});

describe('@agentic-kit/agent — maxSteps', () => {
  function makeEchoTool(): AgentTool {
    return {
      name: 'echo',
      label: 'Echo',
      description: 'Echo text',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      execute: async (_id, params) => ({
        content: [{ type: 'text', text: String(params.text) }],
      }),
    };
  }

  function toolThenText(toolText = 'one', finalText = 'done') {
    return [
      makeFakeAssistantMessage({
        stopReason: 'toolUse',
        content: [
          { type: 'toolCall', id: 'tool_1', name: 'echo', arguments: { text: toolText } },
        ],
      }),
      makeFakeAssistantMessage({
        stopReason: 'stop',
        content: [{ type: 'text', text: finalText }],
      }),
    ];
  }

  it('halts after the configured number of model calls and emits agent_end with stopReason=max_steps', async () => {
    const provider = createScriptedProvider({ responses: toolThenText() });
    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
      maxSteps: 1,
    });
    agent.setTools([makeEchoTool()]);

    const events: AgentEvent[] = [];
    agent.subscribe((e) => events.push(e));

    await agent.prompt('go');

    expect(agent.state.stepCount).toBe(1);
    // Tool ran for the first turn, but no second model call.
    const toolResults = agent.state.messages.filter((m) => m.role === 'toolResult');
    expect(toolResults).toHaveLength(1);
    const assistants = agent.state.messages.filter((m) => m.role === 'assistant');
    expect(assistants).toHaveLength(1);

    const end = events.find((e) => e.type === 'agent_end');
    expect(end).toMatchObject({ type: 'agent_end', stopReason: 'max_steps' });
  });

  it('does not enforce a cap when maxSteps is undefined (no behavior change)', async () => {
    const provider = createScriptedProvider({ responses: toolThenText() });
    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([makeEchoTool()]);

    const events: AgentEvent[] = [];
    agent.subscribe((e) => events.push(e));

    await agent.prompt('go');

    expect(agent.state.stepCount).toBe(2);
    expect(agent.state.messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: [{ type: 'text', text: 'done' }],
    });
    const end = events.find((e) => e.type === 'agent_end');
    expect(end).toMatchObject({ stopReason: 'completed' });
  });

  it('per-call maxSteps overrides the constructor default', async () => {
    const provider = createScriptedProvider({ responses: toolThenText() });
    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
      maxSteps: 1, // would cap; per-call override allows the second call
    });
    agent.setTools([makeEchoTool()]);

    await agent.prompt('go', { maxSteps: 5 });

    expect(agent.state.stepCount).toBe(2);
    expect(agent.state.messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: [{ type: 'text', text: 'done' }],
    });
  });

  it('prompt() resets stepCount; continue() preserves it across turns', async () => {
    // Two prompt rounds: first one consumes 2 steps; second prompt resets to 0.
    const responses = [
      ...toolThenText('first', 'first-done'),
      makeFakeAssistantMessage({
        stopReason: 'stop',
        content: [{ type: 'text', text: 'second-done' }],
      }),
    ];
    const provider = createScriptedProvider({ responses });
    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([makeEchoTool()]);

    await agent.prompt('first');
    expect(agent.state.stepCount).toBe(2);

    await agent.prompt('second');
    expect(agent.state.stepCount).toBe(1);
  });
});

describe('@agentic-kit/agent — totalUsage accumulation', () => {
  function makeUsageTurn(input: number, output: number) {
    const totalTokens = input + output;
    return {
      input,
      output,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens,
      cost: { input: input * 0.01, output: output * 0.02, cacheRead: 0, cacheWrite: 0, total: input * 0.01 + output * 0.02 },
    };
  }

  it('accumulates totalUsage across two turns and attaches snapshot to turn_end and agent_end events', async () => {
    const turn1Usage = makeUsageTurn(10, 20);
    const turn2Usage = makeUsageTurn(30, 40);

    const responses = [
      makeFakeAssistantMessage({
        stopReason: 'toolUse',
        usage: turn1Usage,
        content: [{ type: 'toolCall', id: 'tool_1', name: 'echo', arguments: { text: 'hi' } }],
      }),
      makeFakeAssistantMessage({
        stopReason: 'stop',
        usage: turn2Usage,
        content: [{ type: 'text', text: 'done' }],
      }),
    ];

    const provider = createScriptedProvider({ responses });
    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([
      {
        name: 'echo',
        label: 'Echo',
        description: 'Echo text',
        parameters: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text'],
        },
        execute: async (_id, params) => ({
          content: [{ type: 'text', text: String(params.text) }],
        }),
      },
    ]);

    const events: AgentEvent[] = [];
    agent.subscribe((e) => events.push(e));

    await agent.prompt('go');

    expect(agent.state.totalUsage.input).toBe(40);
    expect(agent.state.totalUsage.output).toBe(60);
    expect(agent.state.totalUsage.totalTokens).toBe(turn1Usage.totalTokens + turn2Usage.totalTokens);
    expect(agent.state.totalUsage.cost.total).toBeCloseTo(
      turn1Usage.cost.total + turn2Usage.cost.total,
      10
    );

    const agentEndEvent = events.find(
      (e): e is Extract<AgentEvent, { type: 'agent_end' }> => e.type === 'agent_end'
    );
    expect(agentEndEvent).toBeDefined();
    expect(agentEndEvent!.totalUsage.input).toBe(agent.state.totalUsage.input);
    expect(agentEndEvent!.totalUsage.output).toBe(agent.state.totalUsage.output);
    expect(agentEndEvent!.totalUsage.totalTokens).toBe(agent.state.totalUsage.totalTokens);
    expect(agentEndEvent!.totalUsage.cost.total).toBeCloseTo(agent.state.totalUsage.cost.total, 10);

    // Decision #17: events carry a snapshot, not a live reference. Mutating
    // the agent's state after emit must not leak into the captured event.
    const capturedInput = agentEndEvent!.totalUsage.input;
    const capturedCostTotal = agentEndEvent!.totalUsage.cost.total;
    agent.state.totalUsage.input = 9999;
    agent.state.totalUsage.cost.total = 9999;
    expect(agentEndEvent!.totalUsage.input).toBe(capturedInput);
    expect(agentEndEvent!.totalUsage.cost.total).toBe(capturedCostTotal);

    const turnEndEvents = events.filter(
      (e): e is Extract<AgentEvent, { type: 'turn_end' }> => e.type === 'turn_end'
    );
    const lastTurnEnd = turnEndEvents[turnEndEvents.length - 1];
    expect(lastTurnEnd).toBeDefined();
    expect(lastTurnEnd!.totalUsage.input).toBe(40);
  });

  it('prompt() resets totalUsage; a second prompt only reflects its own turns', async () => {
    const turn1Usage = makeUsageTurn(10, 20);
    const turn2Usage = makeUsageTurn(30, 40);

    const provider = createScriptedProvider({
      responses: [
        makeFakeAssistantMessage({ stopReason: 'stop', usage: turn1Usage, content: [{ type: 'text', text: 'p1' }] }),
        makeFakeAssistantMessage({ stopReason: 'stop', usage: turn2Usage, content: [{ type: 'text', text: 'p2' }] }),
      ],
    });
    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });

    await agent.prompt('first');
    expect(agent.state.totalUsage.input).toBe(turn1Usage.input);
    expect(agent.state.totalUsage.output).toBe(turn1Usage.output);

    await agent.prompt('second');
    expect(agent.state.totalUsage.input).toBe(turn2Usage.input);
    expect(agent.state.totalUsage.output).toBe(turn2Usage.output);
  });

  it('continue() does NOT reset totalUsage — it keeps growing', async () => {
    const turn1Usage = makeUsageTurn(10, 20);
    const turn2Usage = makeUsageTurn(30, 40);

    const pauseResponse = makeFakeAssistantMessage({
      stopReason: 'toolUse',
      usage: turn1Usage,
      content: [{ type: 'toolCall', id: 'tool_1', name: 'approve', arguments: { target: 'thing' } }],
    });
    const finalResponse = makeFakeAssistantMessage({
      stopReason: 'stop',
      usage: turn2Usage,
      content: [{ type: 'text', text: 'done' }],
    });

    const provider = createScriptedProvider({ responses: [pauseResponse, finalResponse] });

    const approveTool: AgentTool = {
      name: 'approve',
      label: 'Approve',
      description: 'Requires decision',
      parameters: {
        type: 'object',
        properties: { target: { type: 'string' } },
        required: ['target'],
      },
      decision: {
        type: 'object',
        properties: { approved: { type: 'boolean' } },
        required: ['approved'],
      },
      execute: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    };

    const agent = new Agent({
      initialState: { model: makeFakeModel() },
      streamFn: provider.stream,
    });
    agent.setTools([approveTool]);

    await agent.prompt('go');
    expect(agent.state.totalUsage.input).toBe(turn1Usage.input);

    const messages = agent.state.messages;
    const last = messages[messages.length - 1] as ReturnType<typeof makeFakeAssistantMessage>;
    const updatedContent = last.content.map((block) =>
      block.type === 'toolCall' && block.id === 'tool_1'
        ? ({ ...block, decision: { approved: true } } as ToolCallContent)
        : block
    );
    agent.replaceMessages([...messages.slice(0, -1), { ...last, content: updatedContent }]);

    await agent.continue();

    expect(agent.state.totalUsage.input).toBe(turn1Usage.input + turn2Usage.input);
    expect(agent.state.totalUsage.output).toBe(turn1Usage.output + turn2Usage.output);
  });
});
