export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export interface JsonSchema {
  $id?: string;
  $ref?: string;
  additionalProperties?: boolean | JsonSchema;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  const?: JsonValue;
  default?: JsonValue;
  description?: string;
  enum?: JsonValue[];
  format?: string;
  items?: JsonSchema | JsonSchema[];
  maxItems?: number;
  maxLength?: number;
  maximum?: number;
  minItems?: number;
  minLength?: number;
  minimum?: number;
  oneOf?: JsonSchema[];
  pattern?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  title?: string;
  type?: string | string[];
}

export type InputCapability = 'text' | 'image';

export interface CostSchedule {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
}

export interface OpenAICompatibleCompat {
  maxTokensField?: 'max_completion_tokens' | 'max_tokens';
  reasoningFormat?: 'none' | 'openai';
  supportsReasoningEffort?: boolean;
  supportsStrictToolSchema?: boolean;
  supportsUsageInStreaming?: boolean;
  toolCallIdFormat?: 'passthrough' | 'safe64' | 'mistral9';
  requiresToolResultName?: boolean;
}

export interface ModelDescriptor {
  id: string;
  name: string;
  api: string;
  provider: string;
  baseUrl: string;
  input: InputCapability[];
  reasoning: boolean;
  tools?: boolean;
  contextWindow?: number;
  maxOutputTokens?: number;
  cost?: CostSchedule;
  headers?: Record<string, string>;
  compat?: OpenAICompatibleCompat;
}

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface ThinkingContent {
  type: 'thinking';
  thinking: string;
  signature?: string;
}

export interface ToolCallContent {
  type: 'toolCall';
  id: string;
  name: string;
  arguments: Record<string, JsonValue | undefined>;
  rawArguments?: string;
  decision?: unknown;
}

export interface Usage {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

export type StopReason = 'stop' | 'length' | 'toolUse' | 'error' | 'aborted';

export interface UserMessage {
  role: 'user';
  content: string | Array<TextContent | ImageContent>;
  timestamp: number;
}

export interface AssistantMessage {
  role: 'assistant';
  content: Array<TextContent | ThinkingContent | ToolCallContent>;
  api: string;
  provider: string;
  model: string;
  usage: Usage;
  stopReason: StopReason;
  errorMessage?: string;
  timestamp: number;
}

export interface ToolResultMessage<TDetails = unknown> {
  role: 'toolResult';
  toolCallId: string;
  toolName: string;
  content: Array<TextContent | ImageContent>;
  isError: boolean;
  details?: TDetails;
  timestamp: number;
}

export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export interface ToolDefinition<TSchema extends JsonSchema = JsonSchema> {
  name: string;
  description: string;
  parameters: TSchema;
}

export interface Context {
  systemPrompt?: string;
  messages: Message[];
  tools?: ToolDefinition[];
}

export type CacheRetention = 'none' | 'short' | 'long';

export interface StreamOptions {
  apiKey?: string;
  cacheRetention?: CacheRetention;
  headers?: Record<string, string>;
  maxRetryDelayMs?: number;
  maxTokens?: number;
  metadata?: Record<string, JsonValue | undefined>;
  onPayload?: (payload: unknown) => void;
  reasoning?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  sessionId?: string;
  signal?: AbortSignal;
  temperature?: number;
}

export type AssistantMessageEvent =
  | { type: 'start'; partial: AssistantMessage }
  | { type: 'text_start'; contentIndex: number; partial: AssistantMessage }
  | { type: 'text_delta'; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: 'text_end'; contentIndex: number; content: string; partial: AssistantMessage }
  | { type: 'thinking_start'; contentIndex: number; partial: AssistantMessage }
  | { type: 'thinking_delta'; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: 'thinking_end'; contentIndex: number; content: string; partial: AssistantMessage }
  | { type: 'toolcall_start'; contentIndex: number; partial: AssistantMessage }
  | { type: 'toolcall_delta'; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: 'toolcall_end'; contentIndex: number; toolCall: ToolCallContent; partial: AssistantMessage }
  | { type: 'done'; reason: Extract<StopReason, 'stop' | 'length' | 'toolUse'>; message: AssistantMessage }
  | { type: 'error'; reason: Extract<StopReason, 'error' | 'aborted'>; error: AssistantMessage };

export interface ProviderAdapter<TOptions extends StreamOptions = StreamOptions> {
  api: string;
  provider: string;
  createModel?: (modelId: string, overrides?: Partial<ModelDescriptor>) => ModelDescriptor;
  listModels?: (options?: Pick<StreamOptions, 'apiKey' | 'headers'>) => Promise<Array<ModelDescriptor | string>>;
  stream: (model: ModelDescriptor, context: Context, options?: TOptions) => AssistantMessageEventStream;
}

export interface LegacyChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LegacyGenerateInput {
  model: string;
  prompt?: string;
  messages?: LegacyChatMessage[];
  system?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface LegacyStreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: string) => void;
}

export interface AssistantMessageEventStream extends AsyncIterable<AssistantMessageEvent> {
  result(): Promise<AssistantMessage>;
}
