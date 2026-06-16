import {
  type AssistantMessageEventStream,
  calculateUsageCost,
  clone,
  type Context,
  createAssistantMessage,
  DefaultAssistantMessageEventStream,
  type JsonValue,
  type Message,
  type ModelDescriptor,
  normalizeBaseUrl,
  parsePartialJson,
  type StreamOptions,
  type TextContent,
  type ThinkingContent,
  type ToolCallContent,
} from '@agentic-kit/protocol';

const fetch: typeof globalThis.fetch = globalThis.fetch.bind(globalThis);

export interface AnthropicOptions {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  headers?: Record<string, string>;
  maxTokens?: number;
  provider?: string;
}

export const ANTHROPIC_MODELS: ModelDescriptor[] = [
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    api: 'anthropic-messages',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    input: ['text', 'image'],
    reasoning: true,
    tools: true,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    api: 'anthropic-messages',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    input: ['text', 'image'],
    reasoning: false,
    tools: true,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    cost: { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  },
];

export class AnthropicAdapter {
  public readonly api = 'anthropic-messages';
  public readonly provider: string;
  public readonly name: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultHeaders?: Record<string, string>;
  private readonly defaultModel: string;
  private readonly defaultMaxTokens: number;

  constructor(options: AnthropicOptions | string) {
    const normalized: AnthropicOptions =
      typeof options === 'string' ? { apiKey: options } : options;

    this.apiKey = normalized.apiKey;
    this.baseUrl = normalizeBaseUrl(normalized.baseUrl ?? 'https://api.anthropic.com/v1');
    this.provider = normalized.provider ?? 'anthropic';
    this.name = this.provider;
    this.defaultHeaders = normalized.headers;
    this.defaultModel = normalized.defaultModel ?? 'claude-sonnet-4-5';
    this.defaultMaxTokens = normalized.maxTokens ?? 4096;
  }

  createModel(modelId: string, overrides?: Partial<ModelDescriptor>): ModelDescriptor {
    const builtIn = ANTHROPIC_MODELS.find(
      (model) => model.provider === this.provider && model.id === modelId
    );

    if (builtIn) {
      return {
        ...builtIn,
        baseUrl: this.baseUrl,
        headers: { ...(builtIn.headers ?? {}), ...(this.defaultHeaders ?? {}), ...(overrides?.headers ?? {}) },
        ...overrides,
      };
    }

    return {
      id: modelId,
      name: modelId,
      api: this.api,
      provider: this.provider,
      baseUrl: this.baseUrl,
      input: ['text', 'image'],
      reasoning: false,
      tools: true,
      maxOutputTokens: overrides?.maxOutputTokens ?? this.defaultMaxTokens,
      headers: { ...(this.defaultHeaders ?? {}), ...(overrides?.headers ?? {}) },
      ...overrides,
    };
  }

  async listModels(): Promise<Array<ModelDescriptor | string>> {
    return ANTHROPIC_MODELS.filter((model) => model.provider === this.provider);
  }

  stream(
    model: ModelDescriptor,
    context: Context,
    options?: StreamOptions
  ): AssistantMessageEventStream {
    const stream = new DefaultAssistantMessageEventStream();
    const output = createAssistantMessage(model);

    void (async () => {
      const anthropicIndexMap = new Map<number, number>();
      const blockKinds = new Map<number, 'text' | 'thinking' | 'toolCall'>();
      let doneReason: 'stop' | 'length' | 'toolUse' = 'stop';

      try {
        const body = buildRequestBody(model, context, {
          ...options,
          maxTokens: options?.maxTokens ?? model.maxOutputTokens ?? this.defaultMaxTokens,
        });
        options?.onPayload?.(body);

        const response = await fetch(`${model.baseUrl}/messages`, {
          method: 'POST',
          headers: this.buildHeaders(model, options),
          body: JSON.stringify(body),
          signal: options?.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`Anthropic error ${response.status}: ${text}`);
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
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const parsed = parseSseFrame(frame);
            if (!parsed?.data) {
              continue;
            }

            if (parsed.data === '[DONE]') {
              calculateUsageCost(model, output.usage);
              stream.push({ type: 'done', reason: doneReason, message: clone(output) });
              stream.end(output);
              return;
            }

            const event = JSON.parse(parsed.data) as AnthropicStreamEvent;

            if (event.type === 'message_start') {
              output.usage.input = event.message?.usage?.input_tokens ?? 0;
              output.usage.output = event.message?.usage?.output_tokens ?? 0;
              output.usage.cacheRead = event.message?.usage?.cache_read_input_tokens ?? 0;
              output.usage.cacheWrite = event.message?.usage?.cache_creation_input_tokens ?? 0;
              output.usage.totalTokens =
                output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
              calculateUsageCost(model, output.usage);
              continue;
            }

            if (event.type === 'content_block_start') {
              const contentIndex = output.content.length;
              anthropicIndexMap.set(event.index, contentIndex);

              if (event.content_block?.type === 'text') {
                output.content.push({ type: 'text', text: event.content_block.text ?? '' });
                blockKinds.set(event.index, 'text');
                stream.push({ type: 'text_start', contentIndex, partial: clone(output) });
                if (event.content_block.text) {
                  stream.push({
                    type: 'text_delta',
                    contentIndex,
                    delta: event.content_block.text,
                    partial: clone(output),
                  });
                }
              } else if (event.content_block?.type === 'thinking') {
                output.content.push({ type: 'thinking', thinking: event.content_block.thinking ?? '' });
                blockKinds.set(event.index, 'thinking');
                stream.push({ type: 'thinking_start', contentIndex, partial: clone(output) });
                if (event.content_block.thinking) {
                  stream.push({
                    type: 'thinking_delta',
                    contentIndex,
                    delta: event.content_block.thinking,
                    partial: clone(output),
                  });
                }
              } else if (event.content_block?.type === 'tool_use') {
                const initialInput = event.content_block.input ?? {};
                const toolCall: ToolCallContent = {
                  type: 'toolCall',
                  id: event.content_block.id ?? `tool_${event.index}`,
                  name: event.content_block.name ?? '',
                  arguments: initialInput,
                  rawArguments:
                    Object.keys(initialInput).length > 0 ? JSON.stringify(initialInput) : '',
                };
                output.content.push(toolCall);
                blockKinds.set(event.index, 'toolCall');
                stream.push({ type: 'toolcall_start', contentIndex, partial: clone(output) });
              }
              continue;
            }

            if (event.type === 'content_block_delta') {
              const contentIndex = anthropicIndexMap.get(event.index);
              if (contentIndex === undefined) {
                continue;
              }

              const kind = blockKinds.get(event.index);
              if (kind === 'text' && event.delta?.type === 'text_delta' && event.delta.text) {
                const block = output.content[contentIndex] as TextContent;
                block.text += event.delta.text;
                stream.push({
                  type: 'text_delta',
                  contentIndex,
                  delta: event.delta.text,
                  partial: clone(output),
                });
              } else if (
                kind === 'thinking' &&
                event.delta?.type === 'thinking_delta' &&
                event.delta.thinking
              ) {
                const block = output.content[contentIndex] as ThinkingContent;
                block.thinking += event.delta.thinking;
                stream.push({
                  type: 'thinking_delta',
                  contentIndex,
                  delta: event.delta.thinking,
                  partial: clone(output),
                });
              } else if (
                kind === 'toolCall' &&
                event.delta?.type === 'input_json_delta' &&
                event.delta.partial_json !== undefined
              ) {
                const block = output.content[contentIndex] as ToolCallContent;
                block.rawArguments = `${block.rawArguments ?? ''}${event.delta.partial_json}`;
                block.arguments = parsePartialJson(block.rawArguments);
                stream.push({
                  type: 'toolcall_delta',
                  contentIndex,
                  delta: event.delta.partial_json,
                  partial: clone(output),
                });
              }
              continue;
            }

            if (event.type === 'content_block_stop') {
              const contentIndex = anthropicIndexMap.get(event.index);
              if (contentIndex === undefined) {
                continue;
              }

              const kind = blockKinds.get(event.index);
              if (kind === 'text') {
                stream.push({
                  type: 'text_end',
                  contentIndex,
                  content: (output.content[contentIndex] as TextContent).text,
                  partial: clone(output),
                });
              } else if (kind === 'thinking') {
                stream.push({
                  type: 'thinking_end',
                  contentIndex,
                  content: (output.content[contentIndex] as ThinkingContent).thinking,
                  partial: clone(output),
                });
              } else if (kind === 'toolCall') {
                const toolCall = output.content[contentIndex] as ToolCallContent;
                toolCall.arguments = parsePartialJson(toolCall.rawArguments ?? '');
                stream.push({
                  type: 'toolcall_end',
                  contentIndex,
                  toolCall: clone(toolCall),
                  partial: clone(output),
                });
              }
              continue;
            }

            if (event.type === 'message_delta') {
              if (event.delta?.stop_reason === 'max_tokens') {
                doneReason = 'length';
                output.stopReason = 'length';
              } else if (event.delta?.stop_reason === 'tool_use') {
                doneReason = 'toolUse';
                output.stopReason = 'toolUse';
              }

              if (event.usage) {
                output.usage.input =
                  event.usage.input_tokens ?? output.usage.input;
                output.usage.output =
                  event.usage.output_tokens ?? output.usage.output;
                output.usage.cacheRead =
                  event.usage.cache_read_input_tokens ?? output.usage.cacheRead;
                output.usage.cacheWrite =
                  event.usage.cache_creation_input_tokens ?? output.usage.cacheWrite;
                output.usage.totalTokens =
                  output.usage.input +
                  output.usage.output +
                  output.usage.cacheRead +
                  output.usage.cacheWrite;
                calculateUsageCost(model, output.usage);
              }
              continue;
            }

            if (event.type === 'message_stop') {
              calculateUsageCost(model, output.usage);
              stream.push({ type: 'done', reason: doneReason, message: clone(output) });
              stream.end(output);
              return;
            }
          }
        }

        calculateUsageCost(model, output.usage);
        stream.push({ type: 'done', reason: doneReason, message: clone(output) });
        stream.end(output);
      } catch (error) {
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
    return {
      'Content-Type': 'application/json',
      'x-api-key': options?.apiKey ?? this.apiKey,
      'anthropic-version': '2023-06-01',
      ...(this.defaultHeaders ?? {}),
      ...(model?.headers ?? {}),
      ...(options?.headers ?? {}),
    };
  }
}

interface AnthropicStreamEvent {
  type: string;
  index: number;
  message?: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
  content_block?: {
    type?: string;
    id?: string;
    name?: string;
    text?: string;
    thinking?: string;
    input?: Record<string, JsonValue | undefined>;
  };
  delta?: {
    type?: string;
    text?: string;
    thinking?: string;
    partial_json?: string;
    stop_reason?: string | null;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

function buildRequestBody(
  model: ModelDescriptor,
  context: Context,
  options?: StreamOptions
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: model.id,
    messages: context.messages.map(toAnthropicMessage),
    max_tokens: options?.maxTokens ?? model.maxOutputTokens ?? 4096,
    stream: true,
  };

  if (context.systemPrompt) {
    body.system = context.systemPrompt;
  }
  if (options?.temperature !== undefined) {
    body.temperature = options.temperature;
  }
  if (model.reasoning && options?.reasoning) {
    body.thinking = {
      type: 'enabled',
      budget_tokens: clampThinkingBudget(options.reasoning),
    };
  }
  if (context.tools && context.tools.length > 0) {
    body.tools = context.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  return body;
}

function toAnthropicMessage(message: Message): Record<string, unknown> {
  if (message.role === 'user') {
    return {
      role: 'user',
      content:
        typeof message.content === 'string'
          ? [{ type: 'text', text: message.content }]
          : message.content.map((block) =>
            block.type === 'text'
              ? { type: 'text', text: block.text }
              : {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: block.mimeType,
                  data: block.data,
                },
              }
          ),
    };
  }

  if (message.role === 'toolResult') {
    return {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: message.toolCallId,
          is_error: message.isError,
          content: message.content
            .map((block) =>
              block.type === 'text' ? block.text : `[image:${block.mimeType};bytes=${block.data.length}]`
            )
            .join('\n'),
        },
      ],
    };
  }

  return {
    role: 'assistant',
    content: message.content.map((block) => {
      if (block.type === 'text') {
        return { type: 'text', text: block.text };
      }
      if (block.type === 'thinking') {
        return { type: 'text', text: `<thinking>${block.thinking}</thinking>` };
      }
      return {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: block.arguments,
      };
    }),
  };
}

function clampThinkingBudget(reasoning: NonNullable<StreamOptions['reasoning']>): number {
  switch (reasoning) {
  case 'minimal':
    return 256;
  case 'low':
    return 1024;
  case 'medium':
    return 4096;
  case 'high':
    return 8192;
  case 'xhigh':
    return 16384;
  }
}

function parseSseFrame(frame: string): { event?: string; data?: string } | undefined {
  const lines = frame.split('\n');
  const data: string[] = [];
  let event: string | undefined;

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data.push(line.slice(5).trim());
    }
  }

  if (!event && data.length === 0) {
    return undefined;
  }

  return {
    event,
    data: data.join('\n'),
  };
}

export default AnthropicAdapter;
