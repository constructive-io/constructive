import type { AgentEvent } from '@agentic-kit/agent';
import { createScriptedSSEResponse, makeFakeAssistantMessage, ZERO_USAGE } from './helpers';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { AssistantMessage, Message, UserMessage } from 'agentic-kit';

import { useChat } from '../src';

function streamFromEvents(events: AgentEvent[]): Response {
  return createScriptedSSEResponse(events);
}

function makeUser(content: string, timestamp = 1): UserMessage {
  return { role: 'user', content, timestamp };
}

function makeFinalAssistant(text: string): AssistantMessage {
  return makeFakeAssistantMessage({
    stopReason: 'stop',
    content: [{ type: 'text', text }],
  });
}

function makePartialAssistant(text: string): AssistantMessage {
  return makeFakeAssistantMessage({
    content: [{ type: 'text', text }],
  });
}

function makeAssistantWithToolCall(
  id = 'call_1',
  name = 'echo'
): AssistantMessage {
  return makeFakeAssistantMessage({
    stopReason: 'toolUse',
    content: [
      {
        type: 'toolCall',
        id,
        name,
        arguments: { text: 'hi' },
        rawArguments: '{"text":"hi"}',
      },
    ],
  });
}

describe('useChat', () => {
  it('hydrates messages from initialMessages', () => {
    const initial: Message[] = [makeUser('hi')];
    const { result } = renderHook(() => useChat({ api: '/chat', initialMessages: initial }));
    expect(result.current.messages).toEqual(initial);
    expect(result.current.streamingMessage).toBeNull();
    expect(result.current.pendingDecisions.size).toBe(0);
    expect(result.current.executingToolCallIds.size).toBe(0);
  });

  it('hydrates pendingDecisions from initialMessages when a paused tool call is present', () => {
    const initial: Message[] = [
      makeUser('hi'),
      makeAssistantWithToolCall('call_pending'),
    ];

    const { result } = renderHook(() =>
      useChat({ api: '/chat', initialMessages: initial })
    );

    expect(result.current.pendingDecisions.has('call_pending')).toBe(true);
    expect(result.current.pendingDecisions.get('call_pending')).toMatchObject({
      toolCallId: 'call_pending',
      toolName: 'echo',
    });
  });

  it('send(): two rapid synchronous sends both reach the outgoing request body', async () => {
    const final = makeFinalAssistant('ok');
    const fetchFn = jest.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        streamFromEvents([
          { type: 'agent_start' },
          { type: 'agent_end', messages: [makeUser('first'), makeUser('second'), final], totalUsage: ZERO_USAGE },
        ])
    );

    const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

    await act(async () => {
      const p1 = result.current.send('first');
      const p2 = result.current.send('second');
      await Promise.allSettled([p1, p2]);
    });

    const lastInit = fetchFn.mock.calls.at(-1)![1] as RequestInit;
    const sent = JSON.parse(lastInit.body as string);
    const contents = sent.messages.map((m: Message) =>
      typeof m.content === 'string' ? m.content : null
    );
    expect(contents).toEqual(['first', 'second']);
  });

  it('sends, streams, and folds messages into the log', async () => {
    const final = makeFinalAssistant('world');
    const userEcho = makeUser('hello');
    const fetchFn = jest.fn(
      async (): Promise<Response> =>
        streamFromEvents([
          { type: 'agent_start' },
          { type: 'message_start', message: userEcho },
          { type: 'message_end', message: userEcho },
          { type: 'message_start', message: makePartialAssistant('') },
          {
            type: 'message_update',
            message: makePartialAssistant('wo'),
            assistantMessageEvent: {
              type: 'text_delta',
              contentIndex: 0,
              delta: 'wo',
              partial: makePartialAssistant('wo'),
            },
          },
          { type: 'message_end', message: final },
          { type: 'agent_end', messages: [userEcho, final], totalUsage: ZERO_USAGE },
        ])
    );
    const onMessage = jest.fn();
    const onFinish = jest.fn();

    const { result } = renderHook(() =>
      useChat({ api: '/chat', fetch: fetchFn, onMessage, onFinish })
    );

    await act(async () => {
      await result.current.send('hello');
    });

    expect(result.current.messages).toMatchObject([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: [{ type: 'text', text: 'world' }] },
    ]);
    expect(result.current.streamingMessage).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant', content: [{ type: 'text', text: 'world' }] })
    );
  });

  it('exposes streamingMessage during stream and clears it on agent_end', async () => {
    let pushFn!: (event: AgentEvent) => void;
    let closeFn!: () => void;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        pushFn = (event) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        closeFn = () => controller.close();
      },
    });
    const fetchFn = jest.fn(
      async (): Promise<Response> =>
        new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
    );
    const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.send('hi');
    });
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    pushFn({ type: 'agent_start' });
    pushFn({ type: 'message_start', message: makePartialAssistant('') });
    pushFn({
      type: 'message_update',
      message: makePartialAssistant('partial'),
      assistantMessageEvent: {
        type: 'text_delta',
        contentIndex: 0,
        delta: 'partial',
        partial: makePartialAssistant('partial'),
      },
    });

    await waitFor(() =>
      expect(result.current.streamingMessage?.content).toEqual([
        { type: 'text', text: 'partial' },
      ])
    );
    expect(result.current.messages).toMatchObject([{ role: 'user', content: 'hi' }]);

    const final = makeFinalAssistant('done');
    pushFn({ type: 'message_end', message: final });
    pushFn({
      type: 'agent_end',
      messages: [makeUser('hi'), final],
      totalUsage: ZERO_USAGE,
    });
    closeFn();
    await act(async () => {
      await sendPromise;
    });

    expect(result.current.streamingMessage).toBeNull();
    expect(result.current.messages).toMatchObject([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: [{ type: 'text', text: 'done' }] },
    ]);
  });

  it('forwards body() fields and current messages in the POST body', async () => {
    const final = makeFinalAssistant('ok');
    const fetchFn = jest.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        streamFromEvents([
          { type: 'agent_start' },
          { type: 'agent_end', messages: [makeUser('hi'), final], totalUsage: ZERO_USAGE },
        ])
    );
    const body = jest.fn(() => ({ model: 'demo', sessionId: 'abc' }));

    const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn, body }));

    await act(async () => {
      await result.current.send('hi');
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(body).toHaveBeenCalledTimes(1);
    const init = fetchFn.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({
      model: 'demo',
      sessionId: 'abc',
      messages: [{ role: 'user', content: 'hi' }],
    });
  });

  it('drops a malformed SSE event and continues processing valid ones', async () => {
    const final = makeFinalAssistant('survived');
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"agent_start"}\n\n'));
        controller.enqueue(encoder.encode('data: {garbage not json\n\n'));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'agent_end', messages: [makeUser('hi'), final], totalUsage: ZERO_USAGE })}\n\n`
          )
        );
        controller.close();
      },
    });
    const response = new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
    const fetchFn = jest.fn(async (): Promise<Response> => response);

    const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

    await act(async () => {
      await result.current.send('hi');
    });

    expect(result.current.error).toBeUndefined();
    expect(result.current.messages).toMatchObject([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: [{ type: 'text', text: 'survived' }] },
    ]);
  });

  describe('sendMessages', () => {
    it('sends the supplied array verbatim without auto-appending', async () => {
      const final = makeFinalAssistant('ok');
      const fetchFn = jest.fn(
        async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            { type: 'agent_end', messages: [makeUser('a'), makeUser('b'), final], totalUsage: ZERO_USAGE },
          ])
      );
      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

      const explicit: Message[] = [makeUser('a'), makeUser('b')];
      await act(async () => {
        await result.current.sendMessages(explicit);
      });

      const init = fetchFn.mock.calls[0][1] as RequestInit;
      const sent = JSON.parse(init.body as string);
      expect(sent.messages).toEqual(explicit);
    });

    it('makes input messages visible immediately (before the response arrives)', async () => {
      let releaseFetch: (() => void) | null = null;
      const fetchFn = jest.fn(
        async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
          await new Promise<void>((resolve) => {
            releaseFetch = resolve;
          });
          return streamFromEvents([
            { type: 'agent_start' },
            { type: 'agent_end', messages: [makeUser('hi'), makeFinalAssistant('hello')], totalUsage: ZERO_USAGE },
          ]);
        }
      );
      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

      const input: Message[] = [makeUser('hi')];
      act(() => {
        void result.current.sendMessages(input);
      });

      expect(result.current.messages).toEqual(input);
      expect(result.current.isStreaming).toBe(true);

      await act(async () => {
        releaseFetch?.();
      });
    });
  });

  describe('setMessages', () => {
    it('replaces messages and recomputes pendingDecisions', async () => {
      const { result } = renderHook(() => useChat({ api: '/chat' }));
      const withPending: Message[] = [
        makeUser('hi'),
        makeAssistantWithToolCall('call_1'),
      ];
      act(() => {
        result.current.setMessages(withPending);
      });
      expect(result.current.messages).toEqual(withPending);
      expect(result.current.pendingDecisions.has('call_1')).toBe(true);
      expect(result.current.pendingDecisions.get('call_1')).toMatchObject({
        toolCallId: 'call_1',
        toolName: 'echo',
      });
    });

    it('clears executingToolCallIds and error', async () => {
      const fetchFn = jest.fn(async (): Promise<Response> => {
        throw new Error('boom');
      });
      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));
      await act(async () => {
        await result.current.send('hi');
      });
      expect(result.current.error).toBeDefined();

      act(() => {
        result.current.setMessages([]);
      });
      expect(result.current.error).toBeUndefined();
      expect(result.current.executingToolCallIds.size).toBe(0);
    });

    it('removes pending entries for decisioned toolCalls', () => {
      const { result } = renderHook(() => useChat({ api: '/chat' }));
      const pending: Message[] = [
        makeUser('hi'),
        makeAssistantWithToolCall('call_1'),
      ];
      act(() => {
        result.current.setMessages(pending);
      });
      expect(result.current.pendingDecisions.has('call_1')).toBe(true);

      const decisioned: Message[] = [
        makeUser('hi'),
        makeFakeAssistantMessage({
          stopReason: 'toolUse',
          content: [
            {
              type: 'toolCall',
              id: 'call_1',
              name: 'echo',
              arguments: { text: 'hi' },
              rawArguments: '{"text":"hi"}',
              decision: { action: 'approve' },
            },
          ],
        }),
      ];
      act(() => {
        result.current.setMessages(decisioned);
      });
      expect(result.current.pendingDecisions.has('call_1')).toBe(false);
    });

    it('accepts a setter function', () => {
      const initial: Message[] = [makeUser('hi')];
      const { result } = renderHook(() =>
        useChat({ api: '/chat', initialMessages: initial })
      );
      act(() => {
        result.current.setMessages((prev) => [...prev, makeUser('there')]);
      });
      expect(result.current.messages).toHaveLength(2);
    });
  });

  describe('executingToolCallIds', () => {
    it('adds on tool_execution_start, removes on tool_execution_end', async () => {
      const userEcho = makeUser('hi');
      const final = makeFinalAssistant('done');
      const onStart = jest.fn();
      const onEnd = jest.fn();
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            { type: 'message_start', message: userEcho },
            { type: 'message_end', message: userEcho },
            {
              type: 'tool_execution_start',
              toolCallId: 'call_1',
              toolName: 'echo',
              args: { text: 'hi' },
            },
            {
              type: 'tool_execution_end',
              toolCallId: 'call_1',
              toolName: 'echo',
              result: { content: [{ type: 'text', text: 'ok' }] },
              isError: false,
            },
            { type: 'message_end', message: final },
            { type: 'agent_end', messages: [userEcho, final], totalUsage: ZERO_USAGE },
          ])
      );

      const { result } = renderHook(() =>
        useChat({
          api: '/chat',
          fetch: fetchFn,
          onToolExecutionStart: onStart,
          onToolExecutionEnd: onEnd,
        })
      );

      await act(async () => {
        await result.current.send('hi');
      });

      expect(onStart).toHaveBeenCalledWith({
        toolCallId: 'call_1',
        toolName: 'echo',
        args: { text: 'hi' },
      });
      expect(onEnd).toHaveBeenCalledWith({
        toolCallId: 'call_1',
        toolName: 'echo',
        result: { content: [{ type: 'text', text: 'ok' }] },
        isError: false,
      });
      expect(result.current.executingToolCallIds.size).toBe(0);
    });

    it('clears on abort', async () => {
      let pushFn!: (event: AgentEvent) => void;
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          pushFn = (event) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        },
      });
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          })
      );
      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

      act(() => {
        void result.current.send('hi');
      });
      await waitFor(() => expect(fetchFn).toHaveBeenCalled());

      pushFn({
        type: 'tool_execution_start',
        toolCallId: 'call_1',
        toolName: 'echo',
        args: {},
      });
      await waitFor(() => expect(result.current.executingToolCallIds.has('call_1')).toBe(true));

      act(() => {
        result.current.abort();
      });
      expect(result.current.executingToolCallIds.size).toBe(0);
    });
  });

  describe('abort', () => {
    it('cancels the in-flight request and clears isStreaming', async () => {
      let signalCaptured: AbortSignal | undefined;
      const fetchFn = jest.fn(
        (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          signalCaptured = init?.signal ?? undefined;
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          });
        }
      );

      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

      act(() => {
        void result.current.send('hi');
      });

      await waitFor(() => expect(fetchFn).toHaveBeenCalled());
      expect(result.current.isStreaming).toBe(true);

      act(() => {
        result.current.abort();
      });

      await waitFor(() => expect(result.current.isStreaming).toBe(false));
      expect(signalCaptured?.aborted).toBe(true);
      expect(result.current.error).toBeUndefined();
    });

    it('preserves visible partial text as a committed assistant message', async () => {
      let pushFn!: (event: AgentEvent) => void;
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          pushFn = (event) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        },
      });
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          })
      );
      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

      act(() => {
        void result.current.send('hi');
      });
      await waitFor(() => expect(fetchFn).toHaveBeenCalled());

      pushFn({ type: 'agent_start' });
      pushFn({ type: 'message_start', message: makePartialAssistant('') });
      pushFn({
        type: 'message_update',
        message: makePartialAssistant('partial answer'),
        assistantMessageEvent: {
          type: 'text_delta',
          contentIndex: 0,
          delta: 'partial answer',
          partial: makePartialAssistant('partial answer'),
        },
      });
      await waitFor(() =>
        expect(result.current.streamingMessage?.content).toEqual([
          { type: 'text', text: 'partial answer' },
        ])
      );

      act(() => {
        result.current.abort();
      });

      expect(result.current.streamingMessage).toBeNull();
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.messages).toMatchObject([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: [{ type: 'text', text: 'partial answer' }] },
      ]);
    });

    it('drops in-flight tool calls so they do not re-pause as pending decisions', async () => {
      let pushFn!: (event: AgentEvent) => void;
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          pushFn = (event) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        },
      });
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          })
      );
      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

      act(() => {
        void result.current.send('hi');
      });
      await waitFor(() => expect(fetchFn).toHaveBeenCalled());

      const partialWithTool = makeFakeAssistantMessage({
        content: [
          { type: 'text', text: 'preamble' },
          {
            type: 'toolCall',
            id: 'call_inflight',
            name: 'echo',
            arguments: { text: 'hi' },
            rawArguments: '{"text":"hi"}',
          },
        ],
      });
      pushFn({ type: 'agent_start' });
      pushFn({ type: 'message_start', message: makePartialAssistant('') });
      pushFn({
        type: 'message_update',
        message: partialWithTool,
        assistantMessageEvent: {
          type: 'text_delta',
          contentIndex: 0,
          delta: 'preamble',
          partial: partialWithTool,
        },
      });

      await waitFor(() =>
        expect(result.current.streamingMessage?.content).toHaveLength(2)
      );

      act(() => {
        result.current.abort();
      });

      expect(result.current.streamingMessage).toBeNull();
      expect(result.current.messages).toHaveLength(2);
      const committed = result.current.messages[1];
      expect(committed.role).toBe('assistant');
      expect((committed as AssistantMessage).content).toEqual([
        { type: 'text', text: 'preamble' },
      ]);
      expect(result.current.pendingDecisions.size).toBe(0);
    });

    it('commits nothing when streamingMessage is empty or has no visible text', async () => {
      let pushFn!: (event: AgentEvent) => void;
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          pushFn = (event) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        },
      });
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          })
      );
      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

      act(() => {
        void result.current.send('hi');
      });
      await waitFor(() => expect(fetchFn).toHaveBeenCalled());

      pushFn({ type: 'agent_start' });
      pushFn({ type: 'message_start', message: makePartialAssistant('') });
      await waitFor(() => expect(result.current.streamingMessage).not.toBeNull());

      act(() => {
        result.current.abort();
      });

      expect(result.current.messages).toMatchObject([{ role: 'user', content: 'hi' }]);
      expect(result.current.messages).toHaveLength(1);
    });

    it('commits nothing when no streamingMessage exists', async () => {
      const { result } = renderHook(() => useChat({ api: '/chat' }));

      act(() => {
        result.current.abort();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.streamingMessage).toBeNull();
      expect(result.current.isStreaming).toBe(false);
    });

    it('unmount aborts the in-flight fetch', async () => {
      let capturedSignal: AbortSignal | undefined;
      const fetchFn = jest.fn(
        (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          capturedSignal = init?.signal ?? undefined;
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          });
        }
      );

      const { result, unmount } = renderHook(() =>
        useChat({ api: '/chat', fetch: fetchFn })
      );

      act(() => {
        void result.current.send('hi');
      });
      await waitFor(() => expect(fetchFn).toHaveBeenCalled());
      expect(capturedSignal?.aborted).toBe(false);

      unmount();

      expect(capturedSignal?.aborted).toBe(true);
    });

    it('drops events that arrive after abort', async () => {
      let pushFn!: (event: AgentEvent) => void;
      let closeFn!: () => void;
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          pushFn = (event) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          closeFn = () => controller.close();
        },
      });
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          })
      );

      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

      let sendPromise!: Promise<void>;
      act(() => {
        sendPromise = result.current.send('hi');
      });
      await waitFor(() => expect(fetchFn).toHaveBeenCalled());

      act(() => {
        result.current.abort();
      });
      expect(result.current.isStreaming).toBe(false);

      const lateAssistant = makeFinalAssistant('late');
      pushFn({ type: 'agent_end', messages: [makeUser('hi'), lateAssistant], totalUsage: ZERO_USAGE });
      closeFn();
      await act(async () => {
        await sendPromise;
      });

      expect(result.current.messages).toMatchObject([{ role: 'user', content: 'hi' }]);
      expect(result.current.messages).toHaveLength(1);
    });
  });

  describe('respondWithDecision', () => {
    it('attaches the decision and re-POSTs with the augmented log', async () => {
      const assistantWithToolCall = makeAssistantWithToolCall();
      const final = makeFinalAssistant('done');
      const userEcho = makeUser('hi');

      const fetchFn = jest.fn(
        async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            { type: 'message_start', message: userEcho },
            { type: 'message_end', message: userEcho },
            { type: 'message_start', message: assistantWithToolCall },
            { type: 'message_end', message: assistantWithToolCall },
            {
              type: 'tool_decision_pending',
              toolCallId: 'call_1',
              toolName: 'echo',
              input: { text: 'hi' },
              schema: { type: 'object' },
            },
          ])
      );

      const onDecisionPending = jest.fn();
      const { result } = renderHook(() =>
        useChat({ api: '/chat', fetch: fetchFn, onDecisionPending })
      );

      await act(async () => {
        await result.current.send('hi');
      });

      expect(onDecisionPending).toHaveBeenCalledWith(
        expect.objectContaining({ toolCallId: 'call_1', toolName: 'echo' })
      );
      expect(result.current.pendingDecisions.get('call_1')).toMatchObject({
        toolCallId: 'call_1',
      });
      expect(result.current.isStreaming).toBe(false);

      const resumedAssistant: AssistantMessage = {
        ...assistantWithToolCall,
        content: [
          {
            type: 'toolCall',
            id: 'call_1',
            name: 'echo',
            arguments: { text: 'hi' },
            rawArguments: '{"text":"hi"}',
            decision: 'allow',
          },
        ],
      };
      const toolResult: Message = {
        role: 'toolResult',
        toolCallId: 'call_1',
        toolName: 'echo',
        content: [{ type: 'text', text: 'hi' }],
        isError: false,
        timestamp: 2,
      };

      fetchFn.mockImplementationOnce(
        async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            {
              type: 'agent_end',
              messages: [userEcho, resumedAssistant, toolResult, final],
              totalUsage: ZERO_USAGE,
            },
          ])
      );

      await act(async () => {
        await result.current.respondWithDecision('call_1', 'allow');
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
      const secondInit = fetchFn.mock.calls[1][1] as RequestInit;
      const sent = JSON.parse(secondInit.body as string);
      expect(sent.messages).toHaveLength(2);
      expect(sent.messages[1].content[0]).toMatchObject({
        type: 'toolCall',
        id: 'call_1',
        decision: 'allow',
      });

      expect(result.current.messages).toHaveLength(4);
      expect(result.current.pendingDecisions.has('call_1')).toBe(false);
      expect(result.current.isStreaming).toBe(false);
    });

    it('removes only the resolved id from pendingDecisions when multiple are pending', async () => {
      const a1 = makeAssistantWithToolCall('call_1', 'first');
      const a2 = makeAssistantWithToolCall('call_2', 'second');
      const initial: Message[] = [makeUser('hi'), a1, a2];

      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            { type: 'agent_end', messages: initial, totalUsage: ZERO_USAGE },
          ])
      );

      const { result } = renderHook(() =>
        useChat({ api: '/chat', fetch: fetchFn })
      );

      act(() => {
        result.current.setMessages(initial);
      });
      expect(result.current.pendingDecisions.size).toBe(2);

      await act(async () => {
        await result.current.respondWithDecision('call_1', 'allow');
      });

      expect(result.current.pendingDecisions.has('call_1')).toBe(false);
    });

    it('finds the pending assistant by toolCallId when a later message was appended', async () => {
      const assistantWithToolCall = makeAssistantWithToolCall();
      const trailingNote = makeUser('queued note arrived after pause', 99);
      const initial: Message[] = [
        makeUser('hi'),
        assistantWithToolCall,
        trailingNote,
      ];
      const fetchFn = jest.fn(
        async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            { type: 'agent_end', messages: initial, totalUsage: ZERO_USAGE },
          ])
      );

      const { result } = renderHook(() =>
        useChat({ api: '/chat', fetch: fetchFn, initialMessages: initial })
      );

      await act(async () => {
        await result.current.respondWithDecision('call_1', 'allow');
      });

      const sent = JSON.parse(fetchFn.mock.calls[0][1]!.body as string);
      expect(sent.messages).toHaveLength(3);
      expect(sent.messages[1].content[0]).toMatchObject({
        type: 'toolCall',
        id: 'call_1',
        decision: 'allow',
      });
      expect(sent.messages[2]).toMatchObject({ role: 'user', content: 'queued note arrived after pause' });
    });

    it('throws when no assistant has a pending decision for the toolCallId', async () => {
      const { result } = renderHook(() => useChat({ api: '/chat' }));

      await expect(
        act(async () => {
          await result.current.respondWithDecision('call_unknown', 'allow');
        })
      ).rejects.toThrow(/No pending decision for toolCallId 'call_unknown'/);
    });

    it('skips assistants whose matching toolCall already has a decision', async () => {
      const earlierWithResolvedDecision = makeFakeAssistantMessage({
        stopReason: 'toolUse',
        content: [
          {
            type: 'toolCall',
            id: 'call_resolved',
            name: 'echo',
            arguments: { text: 'first' },
            rawArguments: '{"text":"first"}',
            decision: 'allow',
          },
        ],
      });
      const laterPending = makeAssistantWithToolCall();
      const initial: Message[] = [
        makeUser('first'),
        earlierWithResolvedDecision,
        makeUser('second'),
        laterPending,
      ];
      const fetchFn = jest.fn(
        async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            { type: 'agent_end', messages: initial, totalUsage: ZERO_USAGE },
          ])
      );

      const { result } = renderHook(() =>
        useChat({ api: '/chat', fetch: fetchFn, initialMessages: initial })
      );

      await act(async () => {
        await result.current.respondWithDecision('call_1', 'allow');
      });

      const sent = JSON.parse(fetchFn.mock.calls[0][1]!.body as string);
      expect(sent.messages[1].content[0]).toMatchObject({
        type: 'toolCall',
        id: 'call_resolved',
        decision: 'allow',
      });
      expect(sent.messages[3].content[0]).toMatchObject({
        type: 'toolCall',
        id: 'call_1',
        decision: 'allow',
      });
    });
  });

  describe('error handling', () => {
    it('sets error on a non-200 response and fires onError', async () => {
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          new Response('boom', { status: 500, statusText: 'Internal Server Error' })
      );
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useChat({ api: '/chat', fetch: fetchFn, onError })
      );

      await act(async () => {
        await result.current.send('hi');
      });

      expect(result.current.error).toEqual(new Error('HTTP 500: Internal Server Error'));
      expect(onError).toHaveBeenCalledWith(new Error('HTTP 500: Internal Server Error'));
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.messages).toMatchObject([{ role: 'user', content: 'hi' }]);
    });

    it('sets error on a network failure and fires onError', async () => {
      const fetchFn = jest.fn(async (): Promise<Response> => {
        throw new Error('network down');
      });
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useChat({ api: '/chat', fetch: fetchFn, onError })
      );

      await act(async () => {
        await result.current.send('hi');
      });

      expect(result.current.error).toEqual(new Error('network down'));
      expect(onError).toHaveBeenCalledWith(new Error('network down'));
      expect(result.current.isStreaming).toBe(false);
    });

    it('sets error when response has no body', async () => {
      const fetchFn = jest.fn(async (): Promise<Response> => {
        const r = new Response(null, { status: 200 });
        Object.defineProperty(r, 'body', { value: null, configurable: true });
        return r;
      });
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useChat({ api: '/chat', fetch: fetchFn, onError })
      );

      await act(async () => {
        await result.current.send('hi');
      });

      expect(result.current.error).toEqual(new Error('Response has no body'));
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('usage', () => {
    const sampleUsage = {
      input: 10,
      output: 20,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 30,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };

    it('starts as null', () => {
      const { result } = renderHook(() => useChat({ api: '/chat' }));
      expect(result.current.usage).toBeNull();
    });

    it('is populated from agent_end totalUsage', async () => {
      const final = makeFinalAssistant('ok');
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            { type: 'agent_end', messages: [makeUser('hi'), final], totalUsage: sampleUsage },
          ])
      );
      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

      await act(async () => {
        await result.current.send('hi');
      });

      expect(result.current.usage).not.toBeNull();
      expect(result.current.usage?.input).toBe(10);
      expect(result.current.usage?.output).toBe(20);
    });

    it('is populated from turn_end totalUsage', async () => {
      const final = makeFinalAssistant('ok');
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            {
              type: 'turn_end',
              message: final,
              toolResults: [],
              totalUsage: sampleUsage,
            },
            { type: 'agent_end', messages: [makeUser('hi'), final], totalUsage: sampleUsage },
          ])
      );
      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));

      await act(async () => {
        await result.current.send('hi');
      });

      expect(result.current.usage?.input).toBe(10);
      expect(result.current.usage?.output).toBe(20);
    });

    it('resets to null when a new prompt() is called', async () => {
      const final = makeFinalAssistant('ok');
      let releaseFetch: (() => void) | null = null;
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            { type: 'agent_end', messages: [makeUser('hi'), final], totalUsage: sampleUsage },
          ])
      );

      // First, complete a request so usage is populated.
      const { result } = renderHook(() => useChat({ api: '/chat', fetch: fetchFn }));
      await act(async () => {
        await result.current.send('first');
      });
      expect(result.current.usage?.input).toBe(10);

      // Now set up a blocking fetch for the second request.
      fetchFn.mockImplementationOnce(
        async (): Promise<Response> => {
          await new Promise<void>((resolve) => {
            releaseFetch = resolve;
          });
          return streamFromEvents([
            { type: 'agent_start' },
            { type: 'agent_end', messages: [makeUser('second'), final], totalUsage: sampleUsage },
          ]);
        }
      );

      // Start the second send (do not await yet).
      act(() => {
        void result.current.send('second');
      });

      // usage should be reset to null immediately after send() is called.
      await waitFor(() => expect(result.current.usage).toBeNull());

      // Release and finish.
      await act(async () => {
        releaseFetch?.();
      });
    });
  });

  describe('lifecycle hooks', () => {
    it('reads handlers from a ref so consumers do not need to memoize', async () => {
      const final = makeFinalAssistant('ok');
      const fetchFn = jest.fn(
        async (): Promise<Response> =>
          streamFromEvents([
            { type: 'agent_start' },
            { type: 'message_start', message: makeUser('hi') },
            { type: 'message_end', message: makeUser('hi') },
            { type: 'message_start', message: final },
            { type: 'message_end', message: final },
            { type: 'agent_end', messages: [makeUser('hi'), final], totalUsage: ZERO_USAGE },
          ])
      );

      const onMessage = jest.fn();
      const { result, rerender } = renderHook(
        ({ onMessage: handler }) => useChat({ api: '/chat', fetch: fetchFn, onMessage: handler }),
        { initialProps: { onMessage } }
      );

      const newOnMessage = jest.fn();
      rerender({ onMessage: newOnMessage });

      await act(async () => {
        await result.current.send('hi');
      });

      expect(onMessage).not.toHaveBeenCalled();
      expect(newOnMessage).toHaveBeenCalled();
    });
  });
});
