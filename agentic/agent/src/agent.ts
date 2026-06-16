import {
  addUsage,
  type AssistantMessage,
  type Context,
  createEmptyUsage,
  createToolResultMessage,
  createUserMessage,
  type Message,
  snapshotUsage,
  stream,
  type StreamOptions,
  type ToolCallContent,
} from 'agentic-kit';

import {
  type AgentRunHandle,
  DefaultAgentRunHandle,
  type RunChannelPush,
} from './run-handle.js';
import type {
  AgentEvent,
  AgentOptions,
  AgentState,
  AgentTool,
  AgentToolResult,
} from './types.js';
import {
  DecisionValidationError,
  validateSchema,
  validateToolArguments as defaultValidateToolArguments,
} from './validation.js';

export class Agent {
  private readonly listeners = new Set<(event: AgentEvent) => void>();
  private readonly transformContext?: AgentOptions['transformContext'];
  private readonly streamFn: NonNullable<AgentOptions['streamFn']>;
  private readonly validateToolArguments: NonNullable<AgentOptions['validateToolArguments']>;
  private readonly defaultMaxSteps?: number;
  private abortController?: AbortController;
  private running?: Promise<void>;
  private runChannel?: { push: RunChannelPush };
  private outstandingHandle?: AgentRunHandle;

  private _state: AgentState;

  constructor(options: AgentOptions) {
    this._state = {
      systemPrompt: '',
      tools: [],
      messages: [],
      isStreaming: false,
      stepCount: 0,
      totalUsage: createEmptyUsage(),
      streamMessage: null,
      streamOptions: undefined,
      ...options.initialState,
    };
    this.streamFn = options.streamFn ?? stream;
    this.transformContext = options.transformContext;
    this.validateToolArguments = options.validateToolArguments ?? defaultValidateToolArguments;
    this.defaultMaxSteps = options.maxSteps;
  }

  get state(): AgentState {
    return this._state;
  }

  subscribe(listener: (event: AgentEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setModel(model: AgentState['model']): void {
    this._state.model = model;
  }

  setTools(tools: AgentTool[]): void {
    this._state.tools = tools;
  }

  setSystemPrompt(systemPrompt: string): void {
    this._state.systemPrompt = systemPrompt;
  }

  setStreamOptions(streamOptions: Omit<StreamOptions, 'signal'> | undefined): void {
    this._state.streamOptions = streamOptions;
  }

  replaceMessages(messages: Message[]): void {
    this._state.messages = [...messages];
  }

  appendMessage(message: Message): void {
    this._state.messages = [...this._state.messages, message];
  }

  clearMessages(): void {
    this._state.messages = [];
  }

  reset(): void {
    this.abort();
    this._state.messages = [];
    this._state.streamMessage = null;
    this._state.isStreaming = false;
    this._state.error = undefined;
  }

  abort(): void {
    this.abortController?.abort();
    this.outstandingHandle = undefined;
  }

  waitForIdle(): Promise<void> {
    return this.running ?? Promise.resolve();
  }

  prompt(input: string | Message, opts?: { maxSteps?: number }): AgentRunHandle {
    this.assertIdle('prompt');

    const message = typeof input === 'string' ? createUserMessage(input) : input;
    this._state.stepCount = 0;
    this._state.totalUsage = createEmptyUsage();

    const handle: AgentRunHandle = new DefaultAgentRunHandle(async (push, signal) => {
      if (this.outstandingHandle === handle) {
        this.outstandingHandle = undefined;
      }
      return this.runLoop({
        initialMessages: [message],
        externalPush: push ?? undefined,
        externalAbortSignal: signal,
        maxSteps: opts?.maxSteps ?? this.defaultMaxSteps,
      });
    });
    this.outstandingHandle = handle;
    return handle;
  }

  continue(opts?: { maxSteps?: number }): AgentRunHandle {
    this.assertIdle('continue');

    if (this._state.messages.length === 0) {
      throw new Error('No messages to continue from');
    }

    const pendingMessage = this.findMostRecentPendingAssistant();
    if (pendingMessage) {
      const pendingIndex = this._state.messages.indexOf(pendingMessage);
      const trailing = this._state.messages.slice(pendingIndex + 1);
      const hasNonToolResultTrailing = trailing.some((m) => m.role !== 'toolResult');
      if (hasNonToolResultTrailing) {
        throw new Error(
          'Cannot continue() with a pending decision when non-toolResult messages have been appended after the pending assistant. Use injectDeferralResults() + prompt() instead — see the agentic-kit deferral docs.'
        );
      }
      const pendingDecisions = this.findPendingDecisions(pendingMessage);
      for (const { tool, decision } of pendingDecisions) {
        const errors = validateSchema(tool.decision!, decision, 'root');
        if (errors.length > 0) {
          throw new DecisionValidationError(tool.name, errors);
        }
      }
    } else {
      const lastMessage = this._state.messages[this._state.messages.length - 1];
      if (lastMessage.role === 'assistant') {
        throw new Error(
          'Cannot continue from trailing assistant message: no tool calls awaiting a decision'
        );
      }
    }

    const handle: AgentRunHandle = new DefaultAgentRunHandle(async (push, signal) => {
      if (this.outstandingHandle === handle) {
        this.outstandingHandle = undefined;
      }
      return this.runLoop({
        externalPush: push ?? undefined,
        externalAbortSignal: signal,
        maxSteps: opts?.maxSteps ?? this.defaultMaxSteps,
      });
    });
    this.outstandingHandle = handle;
    return handle;
  }

  private assertIdle(method: 'prompt' | 'continue'): void {
    if (this._state.isStreaming) {
      throw new Error(`Agent is already processing; cannot call ${method}() while a run is active`);
    }
    if (this.outstandingHandle) {
      throw new Error(
        `Agent has an unconsumed run handle from a previous ${method}()/prompt()/continue() call; consume it (events / toReadableStream / toResponse / wait) or abort the agent before issuing another`
      );
    }
  }

  private findMostRecentPendingAssistant(): AssistantMessage | undefined {
    for (let i = this._state.messages.length - 1; i >= 0; i--) {
      const msg = this._state.messages[i];
      if (msg.role !== 'assistant') continue;
      const pending = this.findPendingDecisions(msg);
      if (pending.length > 0) return msg;
    }
    return undefined;
  }

  private findPendingDecisions(
    message: AssistantMessage
  ): Array<{ toolCall: ToolCallContent; tool: AgentTool; decision: unknown }> {
    const completedToolCallIds = new Set(
      this._state.messages
        .filter((m): m is Extract<Message, { role: 'toolResult' }> => m.role === 'toolResult')
        .map((m) => m.toolCallId)
    );

    const pending: Array<{ toolCall: ToolCallContent; tool: AgentTool; decision: unknown }> = [];
    for (const block of message.content) {
      if (block.type !== 'toolCall') {
        continue;
      }
      if (completedToolCallIds.has(block.id)) {
        continue;
      }
      if (!('decision' in block) || block.decision === undefined) {
        continue;
      }
      const tool = this._state.tools.find((t) => t.name === block.name);
      if (!tool || !tool.decision) {
        continue;
      }
      pending.push({ toolCall: block, tool, decision: block.decision });
    }
    return pending;
  }

  private async runLoop(opts: {
    initialMessages?: Message[];
    externalPush?: RunChannelPush;
    externalAbortSignal?: AbortSignal;
    maxSteps?: number;
  }): Promise<void> {
    this.running = (async () => {
      this.abortController = new AbortController();
      const localAbortController = this.abortController;
      this._state.isStreaming = true;
      this._state.streamMessage = null;
      this._state.error = undefined;
      if (opts.externalPush) {
        this.runChannel = { push: opts.externalPush };
      }

      const onExternalAbort = () => localAbortController.abort();
      if (opts.externalAbortSignal) {
        if (opts.externalAbortSignal.aborted) {
          localAbortController.abort();
        } else {
          opts.externalAbortSignal.addEventListener('abort', onExternalAbort, { once: true });
        }
      }

      let stopReason: 'completed' | 'max_steps' | 'aborted' = 'completed';

      try {
        await this.emit({ type: 'agent_start' });

        if (opts.initialMessages && opts.initialMessages.length > 0) {
          for (const message of opts.initialMessages) {
            await this.emit({ type: 'message_start', message });
            this.appendMessage(message);
            await this.emit({ type: 'message_end', message });
          }
        }

        let resumeAssistant: AssistantMessage | undefined =
          this.findMostRecentPendingAssistant();

        while (true) {
          let assistantMessage: AssistantMessage;

          if (resumeAssistant) {
            assistantMessage = resumeAssistant;
            resumeAssistant = undefined;
          } else {
            if (
              opts.maxSteps !== undefined &&
              this._state.stepCount >= opts.maxSteps
            ) {
              stopReason = 'max_steps';
              break;
            }
            this._state.stepCount += 1;

            await this.emit({ type: 'turn_start' });
            assistantMessage = await this.generateAssistantMessage(localAbortController.signal);
            this.appendMessage(assistantMessage);
            await this.emit({ type: 'message_end', message: assistantMessage });

            if (assistantMessage.stopReason === 'error' || assistantMessage.stopReason === 'aborted') {
              this._state.error = assistantMessage.errorMessage;
              await this.emit({ type: 'turn_end', message: assistantMessage, toolResults: [], totalUsage: snapshotUsage(this._state.totalUsage) });
              break;
            }
          }

          const toolCalls = assistantMessage.content.filter(
            (block): block is ToolCallContent => block.type === 'toolCall'
          );
          if (toolCalls.length === 0) {
            await this.emit({ type: 'turn_end', message: assistantMessage, toolResults: [], totalUsage: snapshotUsage(this._state.totalUsage) });
            break;
          }

          const outcome = await this.executeToolCalls(toolCalls, localAbortController.signal);

          if (outcome.status === 'paused') {
            return;
          }

          await this.emit({ type: 'turn_end', message: assistantMessage, toolResults: outcome.results, totalUsage: snapshotUsage(this._state.totalUsage) });

          if (localAbortController.signal.aborted) {
            stopReason = 'aborted';
            break;
          }
        }

        await this.emit({ type: 'agent_end', messages: [...this._state.messages], stopReason, totalUsage: snapshotUsage(this._state.totalUsage) });
      } finally {
        if (opts.externalAbortSignal) {
          opts.externalAbortSignal.removeEventListener('abort', onExternalAbort);
        }
        this._state.isStreaming = false;
        this._state.streamMessage = null;
        this.abortController = undefined;
        this.running = undefined;
        this.runChannel = undefined;
      }
    })();

    await this.running;
  }

  private async generateAssistantMessage(signal: AbortSignal): Promise<AssistantMessage> {
    const messages = this.transformContext
      ? await this.transformContext(this._state.messages, signal)
      : this._state.messages;

    const context: Context = {
      systemPrompt: this._state.systemPrompt,
      tools: this._state.tools,
      messages,
    };

    const streamResult = this.streamFn(this._state.model, context, {
      ...(this._state.streamOptions ?? {}),
      signal,
    });

    for await (const event of streamResult) {
      switch (event.type) {
      case 'start':
        this._state.streamMessage = event.partial;
        await this.emit({ type: 'message_start', message: event.partial });
        break;
      case 'text_start':
      case 'text_delta':
      case 'text_end':
      case 'thinking_start':
      case 'thinking_delta':
      case 'thinking_end':
      case 'toolcall_start':
      case 'toolcall_delta':
      case 'toolcall_end':
        this._state.streamMessage = event.partial;
        await this.emit({
          type: 'message_update',
          message: event.partial,
          assistantMessageEvent: event,
        });
        break;
      case 'done':
      case 'error':
        this._state.streamMessage = null;
        break;
      }
    }

    const message = await streamResult.result();
    addUsage(this._state.totalUsage, message.usage);
    return message;
  }

  private async executeToolCalls(
    toolCalls: ToolCallContent[],
    signal: AbortSignal
  ): Promise<
    | { status: 'completed'; results: ReturnType<typeof createToolResultMessage>[] }
    | { status: 'paused' }
  > {
    const completedToolCallIds = new Set(
      this._state.messages
        .filter((m): m is Extract<Message, { role: 'toolResult' }> => m.role === 'toolResult')
        .map((m) => m.toolCallId)
    );

    const results: ReturnType<typeof createToolResultMessage>[] = [];

    for (const toolCall of toolCalls) {
      if (completedToolCallIds.has(toolCall.id)) {
        continue;
      }

      if (signal.aborted) {
        break;
      }

      const tool = this._state.tools.find((candidate) => candidate.name === toolCall.name);
      const args = toolCall.arguments as Record<string, unknown>;
      const decisionAttached = 'decision' in toolCall && toolCall.decision !== undefined;

      if (tool?.decision && !decisionAttached) {
        let validatedArgs: Record<string, unknown>;
        try {
          validatedArgs = this.validateToolArguments(tool.parameters, args);
        } catch (error) {
          for (const prior of results) {
            await this.appendMessageWithEvents(prior);
          }
          results.length = 0;

          const result: AgentToolResult = {
            content: [
              {
                type: 'text',
                text: error instanceof Error ? error.message : String(error),
              },
            ],
          };
          await this.emit({
            type: 'tool_execution_start',
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            args,
          });
          await this.emit({
            type: 'tool_execution_end',
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            result,
            isError: true,
          });
          const toolResult = createToolResultMessage(toolCall.id, toolCall.name, result.content, true);
          await this.appendMessageWithEvents(toolResult);
          continue;
        }

        for (const toolResult of results) {
          await this.appendMessageWithEvents(toolResult);
        }

        await this.emit({
          type: 'tool_decision_pending',
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          input: validatedArgs,
          schema: tool.decision,
        });
        return { status: 'paused' };
      }

      const decisionForExecute = decisionAttached ? toolCall.decision : undefined;
      const toolResult = await this.executeOneTool(
        tool,
        toolCall,
        args,
        decisionForExecute,
        signal
      );
      results.push(toolResult);
    }

    for (const toolResult of results) {
      await this.appendMessageWithEvents(toolResult);
    }

    return { status: 'completed', results };
  }

  private async executeOneTool(
    tool: AgentTool | undefined,
    toolCall: ToolCallContent,
    args: Record<string, unknown>,
    decision: unknown,
    signal: AbortSignal
  ): Promise<ReturnType<typeof createToolResultMessage>> {
    await this.emit({
      type: 'tool_execution_start',
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      args,
    });

    let result: AgentToolResult;
    let isError = false;

    try {
      if (!tool) {
        throw new Error(`Tool '${toolCall.name}' not found`);
      }

      const validatedArgs = this.validateToolArguments(tool.parameters, args);

      result = await tool.execute(
        toolCall.id,
        validatedArgs,
        decision,
        signal,
        (partialResult) => {
          void this.emit({
            type: 'tool_execution_update',
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            args: validatedArgs,
            partialResult,
          });
        }
      );
    } catch (error) {
      result = {
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : String(error),
          },
        ],
      };
      isError = true;
    }

    await this.emit({
      type: 'tool_execution_end',
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      result,
      isError,
    });

    return createToolResultMessage(toolCall.id, toolCall.name, result.content, isError);
  }

  private async appendMessageWithEvents(message: Message): Promise<void> {
    await this.emit({ type: 'message_start', message });
    this.appendMessage(message);
    await this.emit({ type: 'message_end', message });
  }

  private async emit(event: AgentEvent): Promise<void> {
    for (const listener of this.listeners) {
      listener(event);
    }
    if (this.runChannel) {
      await this.runChannel.push(event);
    }
  }
}
