import type {
  AssistantMessage,
  AssistantMessageEvent,
  Context,
  JsonSchema,
  Message,
  ModelDescriptor,
  StreamOptions,
  ToolDefinition,
  ToolResultMessage,
  Usage,
} from 'agentic-kit';

export interface AgentToolResult<TDetails = unknown> {
  content: ToolResultMessage<TDetails>['content'];
  details?: TDetails;
}

export type AgentToolUpdateCallback<TDetails = unknown> = (
  partialResult: AgentToolResult<TDetails>
) => void;

export interface AgentTool<TDetails = unknown> extends ToolDefinition {
  label: string;
  decision?: JsonSchema;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    decision: unknown,
    signal?: AbortSignal,
    onUpdate?: AgentToolUpdateCallback<TDetails>
  ) => Promise<AgentToolResult<TDetails>>;
}

export interface AgentState {
  error?: string;
  isStreaming: boolean;
  messages: Message[];
  model: ModelDescriptor;
  stepCount: number;
  streamMessage: AssistantMessage | null;
  streamOptions?: Omit<StreamOptions, 'signal'>;
  systemPrompt: string;
  tools: AgentTool[];
  totalUsage: Usage;
}

export interface AgentEventBase {
  type: string;
}

export type AgentEvent =
  | { type: 'agent_start' }
  | {
      type: 'agent_end';
      messages: Message[];
      totalUsage: Usage;
      stopReason?: 'completed' | 'max_steps' | 'aborted';
    }
  | { type: 'turn_start' }
  | {
      type: 'turn_end';
      message: AssistantMessage;
      toolResults: ToolResultMessage[];
      totalUsage: Usage;
    }
  | { type: 'message_start'; message: Message }
  | { type: 'message_update'; message: AssistantMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: 'message_end'; message: Message }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: Record<string, unknown> }
  | {
      type: 'tool_execution_update';
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      partialResult: AgentToolResult;
    }
  | {
      type: 'tool_execution_end';
      toolCallId: string;
      toolName: string;
      result: AgentToolResult;
      isError: boolean;
    }
  | {
      type: 'tool_decision_pending';
      toolCallId: string;
      toolName: string;
      input: Record<string, unknown>;
      schema: JsonSchema;
    };

export interface AgentOptions {
  initialState: Pick<AgentState, 'model'> & Partial<Omit<AgentState, 'model'>>;
  /**
   * Maximum number of model invocations the agent will perform per run.
   * One model call counts as one step. Counter persists across `continue()`
   * — it only resets in `prompt()`. Default: unlimited.
   */
  maxSteps?: number;
  streamFn?: (
    model: ModelDescriptor,
    context: Context,
    options?: StreamOptions
  ) => AsyncIterable<AssistantMessageEvent> & { result(): Promise<AssistantMessage> };
  transformContext?: (messages: Message[], signal?: AbortSignal) => Promise<Message[]>;
  validateToolArguments?: (
    schema: JsonSchema,
    args: Record<string, unknown>
  ) => Record<string, unknown>;
}
