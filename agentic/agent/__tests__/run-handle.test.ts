import {
  createScriptedProvider,
  makeFakeAssistantMessage,
  makeFakeModel,
} from './helpers';
import {
  type AssistantMessageEvent,
  type Context,
  createAssistantMessageEventStream,
  type ModelDescriptor,
  type StreamOptions,
} from 'agentic-kit';

import { Agent, type AgentEvent, type AgentTool, parseSSEStream } from '../src';

describe('AgentRunHandle', () => {
  describe('events()', () => {
    it('yields scripted events in emission order with correct shapes', async () => {
      const provider = createScriptedProvider({
        responses: [
          makeFakeAssistantMessage({
            stopReason: 'stop',
            content: [{ type: 'text', text: 'hello' }],
          }),
        ],
      });
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: provider.stream,
      });

      const handle = agent.prompt('hi');
      const collected: AgentEvent[] = [];
      for await (const event of handle.events()) {
        collected.push(event);
      }

      expect(collected[0]).toEqual({ type: 'agent_start' });
      const types = collected.map((e) => e.type);
      expect(types).toContain('message_start');
      expect(types).toContain('turn_start');
      expect(types).toContain('turn_end');
      expect(types[types.length - 1]).toBe('agent_end');

      const subscribeEvents: AgentEvent[] = [];
      const agent2 = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: createScriptedProvider({
          responses: [
            makeFakeAssistantMessage({
              stopReason: 'stop',
              content: [{ type: 'text', text: 'hello' }],
            }),
          ],
        }).stream,
      });
      agent2.subscribe((e) => subscribeEvents.push(e));
      await agent2.prompt('hi');
      expect(collected.map((e) => e.type)).toEqual(subscribeEvents.map((e) => e.type));
    });
  });

  describe('toReadableStream()', () => {
    it('produces a ReadableStream whose events match the subscribe channel exactly', async () => {
      const subscribeEvents: AgentEvent[] = [];
      const subscribeAgent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: createScriptedProvider({
          responses: [
            makeFakeAssistantMessage({
              stopReason: 'stop',
              content: [{ type: 'text', text: 'world' }],
            }),
          ],
        }).stream,
      });
      subscribeAgent.subscribe((e) => subscribeEvents.push(e));
      await subscribeAgent.prompt('hi');

      const streamAgent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: createScriptedProvider({
          responses: [
            makeFakeAssistantMessage({
              stopReason: 'stop',
              content: [{ type: 'text', text: 'world' }],
            }),
          ],
        }).stream,
      });

      const stream = streamAgent.prompt('hi').toReadableStream();
      const reader = stream.getReader();
      const events: AgentEvent[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        events.push(value);
      }

      expect(events.map((e) => e.type)).toEqual(subscribeEvents.map((e) => e.type));
    });
  });

  describe('toResponse()', () => {
    it('sets SSE headers and emits a body parseable by parseSSEStream', async () => {
      const provider = createScriptedProvider({
        responses: [
          makeFakeAssistantMessage({
            stopReason: 'stop',
            content: [{ type: 'text', text: 'sse' }],
          }),
        ],
      });
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: provider.stream,
      });

      const response = agent.prompt('hi').toResponse();
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      const cacheControl = response.headers.get('Cache-Control') ?? '';
      expect(cacheControl).toMatch(/no-cache/);
      expect(response.headers.get('Connection')).toBe('keep-alive');

      expect(response.body).toBeInstanceOf(ReadableStream);
      const events: AgentEvent[] = [];
      for await (const event of parseSSEStream(response.body!)) {
        events.push(event);
      }

      expect(events[0]).toEqual({ type: 'agent_start' });
      expect(events.at(-1)?.type).toBe('agent_end');
    });

    it('respects user-supplied headers without clobbering them', () => {
      const provider = createScriptedProvider({
        responses: [
          makeFakeAssistantMessage({
            stopReason: 'stop',
            content: [{ type: 'text', text: 'sse' }],
          }),
        ],
      });
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: provider.stream,
      });

      const response = agent.prompt('hi').toResponse({
        status: 202,
        headers: { 'X-Custom': 'yes', 'Cache-Control': 'private' },
      });
      expect(response.status).toBe(202);
      expect(response.headers.get('X-Custom')).toBe('yes');
      expect(response.headers.get('Cache-Control')).toBe('private');
      // Drain to avoid leaking
      void response.body?.cancel();
    });
  });

  describe('backpressure', () => {
    it('throttles the producer when the consumer stops reading', async () => {
      const target = makeFakeAssistantMessage({
        stopReason: 'stop',
        content: [{ type: 'text', text: 'x'.repeat(200) }],
      });
      const TOTAL_DELTAS = 200;

      const burstStreamFn = (
        _model: ModelDescriptor,
        _context: Context,
        _options?: StreamOptions
      ) => {
        const stream = createAssistantMessageEventStream();
        queueMicrotask(() => {
          stream.push({ type: 'start', partial: target });
          stream.push({ type: 'text_start', contentIndex: 0, partial: target });
          for (let i = 0; i < TOTAL_DELTAS; i++) {
            const delta: AssistantMessageEvent = {
              type: 'text_delta',
              contentIndex: 0,
              delta: 'x',
              partial: target,
            };
            stream.push(delta);
          }
          stream.push({
            type: 'text_end',
            contentIndex: 0,
            content: target.content[0].type === 'text' ? target.content[0].text : '',
            partial: target,
          });
          stream.push({ type: 'done', reason: 'stop', message: target });
          stream.end(target);
        });
        return stream;
      };

      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: burstStreamFn,
      });

      let emitCount = 0;
      agent.subscribe(() => {
        emitCount++;
      });

      const stream = agent.prompt('go').toReadableStream();
      const reader = stream.getReader();

      // Read just enough to start, then stop. The producer should stall well
      // before reaching TOTAL_DELTAS.
      await reader.read();

      // Yield repeatedly so the agent loop has every chance to push more.
      for (let i = 0; i < 50; i++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }

      // hwm=8 by default; one read frees one slot. Allow plenty of headroom
      // for events the agent emits before each text_delta begins streaming
      // and for any in-flight push.
      expect(emitCount).toBeLessThan(50);
      expect(emitCount).toBeLessThan(TOTAL_DELTAS);

      // Drain the stream so the run can finish cleanly.
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      expect(emitCount).toBeGreaterThan(TOTAL_DELTAS);
    });
  });

  describe('cancel propagation', () => {
    function makeAbortableStreamFn(): {
      streamFn: (model: ModelDescriptor, context: Context, options?: StreamOptions) => ReturnType<typeof createAssistantMessageEventStream>;
      getSignal: () => AbortSignal | undefined;
      } {
      let capturedSignal: AbortSignal | undefined;
      const streamFn = (
        _model: ModelDescriptor,
        _context: Context,
        options?: StreamOptions
      ) => {
        capturedSignal = options?.signal;
        const stream = createAssistantMessageEventStream();
        const finishAborted = () => {
          const aborted = makeFakeAssistantMessage({
            stopReason: 'aborted',
            errorMessage: 'cancelled by consumer',
            content: [],
          });
          stream.push({ type: 'error', reason: 'aborted', error: aborted });
          stream.end(aborted);
        };
        if (options?.signal?.aborted) {
          queueMicrotask(finishAborted);
        } else {
          options?.signal?.addEventListener('abort', finishAborted, { once: true });
        }
        return stream;
      };
      return { streamFn, getSignal: () => capturedSignal };
    }

    it('aborts streamFn and clears isStreaming when reader.cancel() is called', async () => {
      const { streamFn, getSignal } = makeAbortableStreamFn();
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn,
      });

      const handle = agent.prompt('go');
      const stream = handle.toReadableStream();
      const reader = stream.getReader();

      await reader.read();
      await reader.cancel();
      await handle;

      expect(getSignal()?.aborted).toBe(true);
      expect(agent.state.isStreaming).toBe(false);
    });

    it('aborts streamFn and clears isStreaming when response.body.cancel() is called', async () => {
      const { streamFn, getSignal } = makeAbortableStreamFn();
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn,
      });

      const handle = agent.prompt('go');
      const response = handle.toResponse();
      const reader = response.body!.getReader();

      await reader.read();
      await reader.cancel();
      await handle;

      expect(getSignal()?.aborted).toBe(true);
      expect(agent.state.isStreaming).toBe(false);
    });

    it('aborts streamFn when events() iteration breaks early', async () => {
      const { streamFn, getSignal } = makeAbortableStreamFn();
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn,
      });

      const handle = agent.prompt('go');
      for await (const _event of handle.events()) {
        break;
      }
      await agent.waitForIdle();

      expect(getSignal()?.aborted).toBe(true);
      expect(agent.state.isStreaming).toBe(false);
    });
  });

  describe('single-use enforcement', () => {
    it('throws when a second consumer is attached', async () => {
      const provider = createScriptedProvider({
        responses: [
          makeFakeAssistantMessage({
            stopReason: 'stop',
            content: [{ type: 'text', text: 'x' }],
          }),
        ],
      });
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: provider.stream,
      });

      const handle = agent.prompt('hi');
      handle.events();
      expect(() => handle.toReadableStream()).toThrow(/already consumed/);
      expect(() => handle.toResponse()).toThrow(/already consumed/);
      expect(() => handle.events()).toThrow(/already consumed/);
    });

    it('throws on a second prompt() while a handle from the first is still unconsumed', () => {
      const provider = createScriptedProvider({
        responses: [
          makeFakeAssistantMessage({
            stopReason: 'stop',
            content: [{ type: 'text', text: 'x' }],
          }),
        ],
      });
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: provider.stream,
      });

      const first = agent.prompt('hi');
      expect(() => agent.prompt('hi again')).toThrow(/unconsumed run handle/);

      // abort frees the agent state; first remains a dangling handle reference
      agent.abort();
      expect(() => agent.prompt('after abort')).not.toThrow();
      void first;
    });

    it('throws when toResponse() is called twice', () => {
      const provider = createScriptedProvider({
        responses: [
          makeFakeAssistantMessage({
            stopReason: 'stop',
            content: [{ type: 'text', text: 'x' }],
          }),
        ],
      });
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: provider.stream,
      });

      const handle = agent.prompt('hi');
      const first = handle.toResponse();
      expect(() => handle.toResponse()).toThrow(/already consumed/);
      void first.body?.cancel();
    });
  });

  describe('wait()', () => {
    it('drives the run to completion without an explicit event consumer', async () => {
      const provider = createScriptedProvider({
        responses: [
          makeFakeAssistantMessage({
            stopReason: 'stop',
            content: [{ type: 'text', text: 'done' }],
          }),
        ],
      });
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: provider.stream,
      });

      await agent.prompt('hi');

      expect(agent.state.messages.at(-1)).toMatchObject({
        role: 'assistant',
        content: [{ type: 'text', text: 'done' }],
      });
      expect(agent.state.isStreaming).toBe(false);
    });

    it('rejects when the binder rejects (e.g. streamFn throws)', async () => {
      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: () => {
          throw new Error('binder failure');
        },
      });

      await expect(agent.prompt('hi').wait()).rejects.toThrow(/binder failure/);
      expect(agent.state.isStreaming).toBe(false);
    });

    it('resolves when the run pauses on a decision-bearing tool', async () => {
      const provider = createScriptedProvider({
        responses: [
          makeFakeAssistantMessage({
            stopReason: 'toolUse',
            content: [
              {
                type: 'toolCall',
                id: 'tool_1',
                name: 'approve',
                arguments: { target: 'thing' },
              },
            ],
          }),
        ],
      });
      const execute = jest.fn();
      const tool: AgentTool = {
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

      const agent = new Agent({
        initialState: { model: makeFakeModel() },
        streamFn: provider.stream,
      });
      agent.setTools([tool]);

      const events: AgentEvent[] = [];
      agent.subscribe((e) => events.push(e));

      await agent.prompt('approve thing');

      expect(execute).not.toHaveBeenCalled();
      expect(agent.state.isStreaming).toBe(false);
      const pending = events.find((e) => e.type === 'tool_decision_pending');
      expect(pending).toMatchObject({
        type: 'tool_decision_pending',
        toolCallId: 'tool_1',
        toolName: 'approve',
      });
    });
  });
});
