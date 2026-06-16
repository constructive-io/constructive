import {
  type AssistantMessage,
  type AssistantMessageEventStream,
  calculateUsageCost,
  clone,
  type Context,
  createAssistantMessage,
  DefaultAssistantMessageEventStream,
  type Message,
  type ModelDescriptor,
  normalizeBaseUrl,
  type OpenAICompatibleCompat,
  parsePartialJson,
  type StreamOptions,
  type TextContent,
  type ThinkingContent,
  type ToolCallContent,
  type Usage,
} from '@agentic-kit/protocol';

// Use the runtime's native fetch. Node 18.17+ (engine requirement),
// browsers, Bun, and Deno all provide it with a Web ReadableStream body —
// which is what SSE parsing here requires.
const fetch: typeof globalThis.fetch = globalThis.fetch.bind(globalThis);

interface OpenAIModelDefinition extends ModelDescriptor {}

export interface OpenAIOptions {
  apiKey?: string;
  baseUrl?: string;
  compat?: OpenAICompatibleCompat;
  contextWindow?: number;
  defaultInput?: Array<'text' | 'image'>;
  defaultModel?: string;
  headers?: Record<string, string>;
  maxTokens?: number;
  provider?: string;
  reasoning?: boolean;
  tools?: boolean;
}

export const OPENAI_COMPATIBLE_MODELS: OpenAIModelDefinition[] = [
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    api: 'openai-compatible',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    input: ['text', 'image'],
    reasoning: true,
    tools: true,
    contextWindow: 1050000,
    maxOutputTokens: 128000,
    cost: { input: 2.4, output: 19.2, cacheRead: 0, cacheWrite: 0 },
    compat: {
      maxTokensField: 'max_completion_tokens',
      reasoningFormat: 'openai',
      supportsReasoningEffort: true,
      supportsStrictToolSchema: true,
      supportsUsageInStreaming: true,
      toolCallIdFormat: 'passthrough',
    },
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    api: 'openai-compatible',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    input: ['text', 'image'],
    reasoning: true,
    tools: true,
    contextWindow: 1050000,
    maxOutputTokens: 128000,
    cost: { input: 0.4, output: 1.6, cacheRead: 0, cacheWrite: 0 },
    compat: {
      maxTokensField: 'max_completion_tokens',
      reasoningFormat: 'openai',
      supportsReasoningEffort: true,
      supportsStrictToolSchema: true,
      supportsUsageInStreaming: true,
      toolCallIdFormat: 'passthrough',
    },
  },
  {
    id: 'gpt-5.4-nano',
    name: 'GPT-5.4 Nano',
    api: 'openai-compatible',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    input: ['text', 'image'],
    reasoning: true,
    tools: true,
    contextWindow: 1050000,
    maxOutputTokens: 128000,
    cost: { input: 0.2, output: 1.25, cacheRead: 0, cacheWrite: 0 },
    compat: {
      maxTokensField: 'max_completion_tokens',
      reasoningFormat: 'openai',
      supportsReasoningEffort: true,
      supportsStrictToolSchema: true,
      supportsUsageInStreaming: true,
      toolCallIdFormat: 'passthrough',
    },
  },
];

export class OpenAIAdapter {
  public readonly api = 'openai-compatible';
  public readonly provider: string;
  public readonly name: string;

  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly compat: OpenAICompatibleCompat;
  private readonly defaultHeaders?: Record<string, string>;
  private readonly defaultInput: Array<'text' | 'image'>;
  private readonly defaultMaxTokens: number;
  private readonly defaultModel: string;
  private readonly defaultReasoning: boolean;
  private readonly defaultTools: boolean;
  private readonly defaultContextWindow?: number;

  constructor(options?: OpenAIOptions | string) {
    const normalized: OpenAIOptions =
      typeof options === 'string' ? { apiKey: options } : options ?? {};

    this.apiKey = normalized.apiKey;
    this.baseUrl = normalizeBaseUrl(normalized.baseUrl ?? 'https://api.openai.com/v1');
    this.provider = normalized.provider ?? 'openai';
    this.name = this.provider;
    this.defaultHeaders = normalized.headers;
    this.defaultInput = normalized.defaultInput ?? ['text', 'image'];
    this.defaultMaxTokens = normalized.maxTokens ?? 4096;
    this.defaultModel = normalized.defaultModel ?? 'gpt-5.4-mini';
    this.defaultReasoning = normalized.reasoning ?? false;
    this.defaultTools = normalized.tools ?? true;
    this.defaultContextWindow = normalized.contextWindow;
    this.compat = {
      maxTokensField: 'max_tokens',
      reasoningFormat: 'openai',
      supportsReasoningEffort: true,
      supportsStrictToolSchema: true,
      supportsUsageInStreaming: true,
      toolCallIdFormat: 'passthrough',
      ...(normalized.compat ?? {}),
    };
  }

  createModel(modelId: string, overrides?: Partial<ModelDescriptor>): ModelDescriptor {
    const builtIn = OPENAI_COMPATIBLE_MODELS.find(
      (model) => model.provider === this.provider && model.id === modelId
    );

    if (builtIn) {
      return {
        ...builtIn,
        baseUrl: this.baseUrl,
        headers: { ...(this.defaultHeaders ?? {}), ...(builtIn.headers ?? {}), ...(overrides?.headers ?? {}) },
        compat: { ...(this.compat ?? {}), ...(builtIn.compat ?? {}), ...(overrides?.compat ?? {}) },
        ...overrides,
      };
    }

    return {
      id: modelId,
      name: modelId,
      api: this.api,
      provider: this.provider,
      baseUrl: this.baseUrl,
      input: this.defaultInput,
      reasoning: this.defaultReasoning,
      tools: this.defaultTools,
      contextWindow: this.defaultContextWindow,
      maxOutputTokens: overrides?.maxOutputTokens ?? this.defaultMaxTokens,
      headers: { ...(this.defaultHeaders ?? {}), ...(overrides?.headers ?? {}) },
      compat: { ...this.compat, ...(overrides?.compat ?? {}) },
      ...overrides,
    };
  }

  async listModels(): Promise<Array<ModelDescriptor | string>> {
    if (!this.apiKey) {
      return OPENAI_COMPATIBLE_MODELS.filter((model) => model.provider === this.provider);
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.buildHeaders(),
      });
      if (!response.ok) {
        throw new Error(`OpenAI listModels failed: ${response.status}`);
      }

      const payload = (await response.json()) as { data?: Array<{ id: string }> };
      return payload.data?.map((model) => model.id) ?? [];
    } catch {
      return OPENAI_COMPATIBLE_MODELS.filter((model) => model.provider === this.provider);
    }
  }

  stream(
    model: ModelDescriptor,
    context: Context,
    options?: StreamOptions
  ): AssistantMessageEventStream {
    const stream = new DefaultAssistantMessageEventStream();
    const output = createAssistantMessage(model);

    void (async () => {
      let textIndex: number | undefined;
      let thinkingIndex: number | undefined;
      const toolIndexMap = new Map<number, number>();
      let doneReason: 'stop' | 'length' | 'toolUse' = 'stop';

      try {
        const body = buildRequestBody(model, context, {
          ...options,
          maxTokens: options?.maxTokens ?? model.maxOutputTokens ?? this.defaultMaxTokens,
        });
        options?.onPayload?.(body);

        const response = await fetch(`${model.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: this.buildHeaders(model, options),
          body: JSON.stringify(body),
          signal: options?.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`OpenAI error ${response.status}: ${text}`);
        }

        stream.push({ type: 'start', partial: clone(output) });

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) {
              continue;
            }

            const payload = trimmed.slice(5).trim();
            if (!payload) {
              continue;
            }

            if (payload === '[DONE]') {
              emitFinalBlockEvents(stream, output, toolIndexMap, textIndex, thinkingIndex);
              calculateUsageCost(model, output.usage);
              stream.push({ type: 'done', reason: doneReason, message: clone(output) });
              stream.end(output);
              return;
            }

            const chunk = JSON.parse(payload) as ChatCompletionChunk;
            if (chunk.usage) {
              applyUsage(output.usage, model, chunk.usage);
            }

            const choice = chunk.choices?.[0];
            if (!choice) {
              continue;
            }

            if (choice.finish_reason === 'length') {
              doneReason = 'length';
              output.stopReason = 'length';
            } else if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'function_call') {
              doneReason = 'toolUse';
              output.stopReason = 'toolUse';
            }

            const delta = choice.delta ?? {};
            const reasoningDelta =
              firstNonEmpty(
                delta.reasoning_content,
                delta.reasoning,
                delta.reasoning_text
              ) ?? '';

            if (reasoningDelta) {
              if (thinkingIndex === undefined) {
                thinkingIndex = output.content.push({ type: 'thinking', thinking: '' }) - 1;
                stream.push({
                  type: 'thinking_start',
                  contentIndex: thinkingIndex,
                  partial: clone(output),
                });
              }

              const block = output.content[thinkingIndex] as ThinkingContent;
              block.thinking += reasoningDelta;
              stream.push({
                type: 'thinking_delta',
                contentIndex: thinkingIndex,
                delta: reasoningDelta,
                partial: clone(output),
              });
            }

            if (typeof delta.content === 'string' && delta.content.length > 0) {
              if (textIndex === undefined) {
                textIndex = output.content.push({ type: 'text', text: '' }) - 1;
                stream.push({
                  type: 'text_start',
                  contentIndex: textIndex,
                  partial: clone(output),
                });
              }

              const block = output.content[textIndex] as TextContent;
              block.text += delta.content;
              stream.push({
                type: 'text_delta',
                contentIndex: textIndex,
                delta: delta.content,
                partial: clone(output),
              });
            }

            for (const toolDelta of delta.tool_calls ?? []) {
              const toolIndex = toolDelta.index ?? 0;
              let contentIndex = toolIndexMap.get(toolIndex);

              if (contentIndex === undefined) {
                contentIndex =
                  output.content.push({
                    type: 'toolCall',
                    id: toolDelta.id ?? `tool_${toolIndex}`,
                    name: toolDelta.function?.name ?? '',
                    arguments: {},
                    rawArguments: '',
                  }) - 1;
                toolIndexMap.set(toolIndex, contentIndex);
                stream.push({
                  type: 'toolcall_start',
                  contentIndex,
                  partial: clone(output),
                });
              }

              const block = output.content[contentIndex] as ToolCallContent;
              if (toolDelta.id) {
                block.id = toolDelta.id;
              }
              if (toolDelta.function?.name) {
                block.name = toolDelta.function.name;
              }
              if (toolDelta.function?.arguments) {
                block.rawArguments = `${block.rawArguments ?? ''}${toolDelta.function.arguments}`;
                block.arguments = parsePartialJson(block.rawArguments);
                stream.push({
                  type: 'toolcall_delta',
                  contentIndex,
                  delta: toolDelta.function.arguments,
                  partial: clone(output),
                });
              }
            }
          }
        }

        emitFinalBlockEvents(stream, output, toolIndexMap, textIndex, thinkingIndex);
        calculateUsageCost(model, output.usage);
        stream.push({ type: 'done', reason: doneReason, message: clone(output) });
        stream.end(output);
      } catch (error) {
        emitFinalBlockEvents(stream, output, toolIndexMap, textIndex, thinkingIndex);
        output.stopReason = options?.signal?.aborted ? 'aborted' : 'error';
        output.errorMessage = error instanceof Error ? error.message : String(error);
        calculateUsageCost(model, output.usage);
        stream.push({
          type: 'error',
          reason: output.stopReason === 'aborted' ? 'aborted' : 'error',
          error: clone(output),
        });
        stream.end(output);
      }
    })();

    return stream;
  }

  private buildHeaders(
    model?: ModelDescriptor,
    options?: Pick<StreamOptions, 'apiKey' | 'headers'>
  ): Record<string, string> {
    const apiKey = options?.apiKey ?? this.apiKey;
    return {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...(this.defaultHeaders ?? {}),
      ...(model?.headers ?? {}),
      ...(options?.headers ?? {}),
    };
  }
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning?: string;
      reasoning_content?: string;
      reasoning_text?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
}

function buildRequestBody(
  model: ModelDescriptor,
  context: Context,
  options?: StreamOptions
): Record<string, unknown> {
  const compat = model.compat ?? {};
  const messages = [
    ...(context.systemPrompt
      ? [
        {
          role: 'system',
          content: context.systemPrompt,
        },
      ]
      : []),
    ...context.messages.map((message) => toOpenAIMessage(message, compat)),
  ];

  const body: Record<string, unknown> = {
    model: model.id,
    messages,
    stream: true,
  };

  const maxTokensField = compat.maxTokensField ?? 'max_tokens';
  if (options?.maxTokens !== undefined) {
    body[maxTokensField] = options.maxTokens;
  }
  if (options?.temperature !== undefined) {
    body.temperature = options.temperature;
  }
  if ((compat.supportsUsageInStreaming ?? true) === true) {
    body.stream_options = { include_usage: true };
  }
  if (model.reasoning && compat.reasoningFormat === 'openai' && compat.supportsReasoningEffort !== false && options?.reasoning) {
    body.reasoning_effort = options.reasoning;
  }
  if (context.tools && context.tools.length > 0) {
    body.tools = context.tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        ...(compat.supportsStrictToolSchema ? { strict: true } : {}),
      },
    }));
  }

  return body;
}

function toOpenAIMessage(
  message: Message,
  compat: OpenAICompatibleCompat
): Record<string, unknown> {
  if (message.role === 'user') {
    return {
      role: 'user',
      content:
        typeof message.content === 'string'
          ? message.content
          : message.content.map((block) =>
            block.type === 'text'
              ? { type: 'text', text: block.text }
              : {
                type: 'image_url',
                image_url: {
                  url: `data:${block.mimeType};base64,${block.data}`,
                },
              }
          ),
    };
  }

  if (message.role === 'toolResult') {
    const content = message.content
      .map((block) =>
        block.type === 'text' ? block.text : `[image:${block.mimeType};bytes=${block.data.length}]`
      )
      .join('\n');

    return {
      role: 'tool',
      tool_call_id: message.toolCallId,
      content,
      ...(compat.requiresToolResultName ? { name: message.toolName } : {}),
    };
  }

  const content = message.content
    .filter((block) => block.type === 'text' || block.type === 'thinking')
    .map((block) => (block.type === 'text' ? block.text : `<thinking>${block.thinking}</thinking>`))
    .join('\n');

  const toolCalls = message.content
    .filter((block): block is ToolCallContent => block.type === 'toolCall')
    .map((block) => ({
      id: block.id,
      type: 'function',
      function: {
        name: block.name,
        arguments: block.rawArguments ?? JSON.stringify(block.arguments),
      },
    }));

  return {
    role: 'assistant',
    content: content.length > 0 ? content : null,
    ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
  };
}

function applyUsage(
  usage: Usage,
  model: ModelDescriptor,
  payload: NonNullable<ChatCompletionChunk['usage']>
): void {
  const cachedTokens = payload.prompt_tokens_details?.cached_tokens ?? 0;
  const reasoningTokens = payload.completion_tokens_details?.reasoning_tokens ?? 0;

  usage.input = (payload.prompt_tokens ?? 0) - cachedTokens;
  usage.output = payload.completion_tokens ?? 0;
  usage.reasoning = reasoningTokens;
  usage.cacheRead = cachedTokens;
  usage.cacheWrite = 0;
  usage.totalTokens = payload.total_tokens ?? usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
  calculateUsageCost(model, usage);
}

function emitFinalBlockEvents(
  stream: DefaultAssistantMessageEventStream,
  message: AssistantMessage,
  toolIndexMap: Map<number, number>,
  textIndex?: number,
  thinkingIndex?: number
): void {
  const textBlock = textIndex !== undefined ? (message.content[textIndex] as TextContent | undefined) : undefined;
  if (textIndex !== undefined && textBlock) {
    stream.push({
      type: 'text_end',
      contentIndex: textIndex,
      content: textBlock.text,
      partial: clone(message),
    });
  }

  const thinkingBlock = thinkingIndex !== undefined ? (message.content[thinkingIndex] as ThinkingContent | undefined) : undefined;
  if (thinkingIndex !== undefined && thinkingBlock) {
    stream.push({
      type: 'thinking_end',
      contentIndex: thinkingIndex,
      content: thinkingBlock.thinking,
      partial: clone(message),
    });
  }

  for (const contentIndex of toolIndexMap.values()) {
    const toolCall = message.content[contentIndex] as ToolCallContent | undefined;
    if (!toolCall) {
      continue;
    }
    toolCall.arguments = parsePartialJson(toolCall.rawArguments ?? '');
    stream.push({
      type: 'toolcall_end',
      contentIndex,
      toolCall: clone(toolCall),
      partial: clone(message),
    });
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

export default OpenAIAdapter;
