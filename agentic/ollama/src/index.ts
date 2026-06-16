import {
  type AssistantMessageEventStream,
  calculateUsageCost,
  clone,
  type Context,
  createAssistantMessage,
  DefaultAssistantMessageEventStream,
  type ImageContent,
  type Message,
  type ModelDescriptor,
  type StreamOptions,
  type TextContent,
  type ThinkingContent,
} from '@agentic-kit/protocol';

const fetch: typeof globalThis.fetch = globalThis.fetch.bind(globalThis);

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateInput {
  model: string;
  prompt?: string;
  messages?: ChatMessage[];
  system?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

interface OllamaTagsResponse {
  models?: Array<{ name: string }>;
}

interface OllamaChatLine {
  done?: boolean;
  done_reason?: 'stop' | 'length';
  message?: { role?: string; content?: string; thinking?: string };
  prompt_eval_count?: number;
  eval_count?: number;
  response?: string;
}

interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  promptTokens: number;
}

export const OLLAMA_MODELS: ModelDescriptor[] = [];

export class OllamaClient {
  constructor(private readonly baseUrl = 'http://localhost:11434') {}

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`listModels failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as OllamaTagsResponse;
    return payload.models?.map((model) => model.name) ?? [];
  }

  async showModel(model: string): Promise<{ capabilities?: string[] } | null> {
    const response = await fetch(`${this.baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    if (!response.ok) return null;
    return (await response.json()) as { capabilities?: string[] };
  }

  async pullModel(model: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });
    if (!response.ok) {
      throw new Error(`pullModel failed: ${response.status} ${response.statusText}`);
    }
  }

  async deleteModel(model: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });
    if (!response.ok) {
      throw new Error(`deleteModel failed: ${response.status} ${response.statusText}`);
    }
  }

  async generateEmbedding(text: string, model = 'nomic-embed-text'): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text }),
    });
    if (!response.ok) {
      throw new Error(`generateEmbedding failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as OllamaEmbedResponse;
    return {
      embedding: payload.embeddings[0],
      promptTokens: payload.prompt_eval_count ?? 0,
    };
  }

  async generate(input: GenerateInput): Promise<string>;
  async generate(input: GenerateInput, onChunk: (chunk: string) => void): Promise<void>;
  async generate(
    input: GenerateInput,
    onChunk?: (chunk: string) => void
  ): Promise<string | void> {
    const context = legacyInputToContext(input);
    const model: ModelDescriptor = {
      id: input.model,
      name: input.model,
      api: 'ollama-native',
      provider: 'ollama',
      baseUrl: this.baseUrl,
      input: ['text', 'image'],
      reasoning: false,
      tools: false,
      maxOutputTokens: input.maxTokens,
    };

    const adapter = new OllamaAdapter(this.baseUrl);
    const response = adapter.stream(model, context, {
      maxTokens: input.maxTokens,
      signal: undefined,
      temperature: input.temperature,
    });

    if (onChunk || input.stream) {
      for await (const event of response) {
        if (event.type === 'text_delta') {
          onChunk?.(event.delta);
        }
      }
      return;
    }

    const message = await response.result();
    return message.content
      .filter((block): block is TextContent => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }
}

export class OllamaAdapter {
  public readonly api = 'ollama-native';
  public readonly provider = 'ollama';
  public readonly name = 'ollama';

  private readonly client: OllamaClient;
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? 'http://localhost:11434';
    this.client = new OllamaClient(this.baseUrl);
  }

  createModel(modelId: string, overrides?: Partial<ModelDescriptor>): ModelDescriptor {
    return {
      id: modelId,
      name: modelId,
      api: this.api,
      provider: this.provider,
      baseUrl: this.baseUrl,
      input: ['text', 'image'],
      reasoning: false,
      tools: false,
      ...overrides,
    };
  }

  async listModels(): Promise<Array<ModelDescriptor | string>> {
    return this.client.listModels();
  }

  async embed(text: string, model = 'nomic-embed-text'): Promise<EmbeddingResult> {
    return this.client.generateEmbedding(text, model);
  }

  stream(model: ModelDescriptor, context: Context, options?: StreamOptions): AssistantMessageEventStream {
    const stream = new DefaultAssistantMessageEventStream();
    const output = createAssistantMessage(model);

    void (async () => {
      const body: Record<string, unknown> = {
        model: model.id,
        stream: true,
        messages: toOllamaMessages(context),
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens,
        },
      };
      if (model.reasoning) body.think = true;

      try {
        const response = await fetch(`${model.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: options?.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`Ollama error ${response.status}: ${text}`);
        }

        stream.push({ type: 'start', partial: clone(output) });

        if (!response.body) {
          throw new Error('No response body');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        let textIndex: number | undefined;
        let thinkingIndex: number | undefined;
        let finished = false;

        const processPayload = (payload: OllamaChatLine): boolean => {
          const thinking = payload.message?.thinking ?? '';
          if (thinking) {
            if (thinkingIndex === undefined) {
              thinkingIndex = output.content.push({ type: 'thinking', thinking: '' }) - 1;
              stream.push({
                type: 'thinking_start',
                contentIndex: thinkingIndex,
                partial: clone(output),
              });
            }

            const block = output.content[thinkingIndex] as ThinkingContent;
            block.thinking += thinking;
            stream.push({
              type: 'thinking_delta',
              contentIndex: thinkingIndex,
              delta: thinking,
              partial: clone(output),
            });
          }

          const text = payload.message?.content ?? payload.response ?? '';
          if (text) {
            if (textIndex === undefined) {
              textIndex = output.content.push({ type: 'text', text: '' }) - 1;
              stream.push({ type: 'text_start', contentIndex: textIndex, partial: clone(output) });
            }

            const block = output.content[textIndex] as TextContent;
            block.text += text;
            stream.push({
              type: 'text_delta',
              contentIndex: textIndex,
              delta: text,
              partial: clone(output),
            });
          }

          if (!payload.done) {
            return false;
          }

          output.usage.input = payload.prompt_eval_count ?? output.usage.input;
          output.usage.output = payload.eval_count ?? output.usage.output;
          output.usage.totalTokens = output.usage.input + output.usage.output;
          calculateUsageCost(model, output.usage);
          output.stopReason = payload.done_reason === 'length' ? 'length' : 'stop';

          if (thinkingIndex !== undefined) {
            stream.push({
              type: 'thinking_end',
              contentIndex: thinkingIndex,
              content: (output.content[thinkingIndex] as ThinkingContent).thinking,
              partial: clone(output),
            });
          }
          if (textIndex !== undefined) {
            stream.push({
              type: 'text_end',
              contentIndex: textIndex,
              content: (output.content[textIndex] as TextContent).text,
              partial: clone(output),
            });
          }
          stream.push({
            type: 'done',
            reason: output.stopReason === 'length' ? 'length' : 'stop',
            message: clone(output),
          });
          stream.end(output);
          finished = true;
          return true;
        };

        for await (const chunk of iterateResponseBody(response.body)) {
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              continue;
            }

            const payload = JSON.parse(trimmed) as OllamaChatLine;
            if (processPayload(payload)) {
              return;
            }
          }
        }

        const trailing = buffer.trim();
        if (!finished && trailing) {
          const payload = JSON.parse(trailing) as OllamaChatLine;
          if (processPayload(payload)) {
            return;
          }
        }

        if (thinkingIndex !== undefined) {
          stream.push({
            type: 'thinking_end',
            contentIndex: thinkingIndex,
            content: (output.content[thinkingIndex] as ThinkingContent).thinking,
            partial: clone(output),
          });
        }
        if (textIndex !== undefined) {
          stream.push({
            type: 'text_end',
            contentIndex: textIndex,
            content: (output.content[textIndex] as TextContent).text,
            partial: clone(output),
          });
        }
        stream.push({
          type: 'done',
          reason: output.stopReason === 'length' ? 'length' : 'stop',
          message: clone(output),
        });
        stream.end(output);
      } catch (error) {
        output.stopReason = options?.signal?.aborted ? 'aborted' : 'error';
        output.errorMessage = error instanceof Error ? error.message : String(error);
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
}

function toOllamaMessages(context: Context): Array<{ role: string; content: string; images?: string[] }> {
  const messages = context.messages.map((message) => {
    if (message.role === 'user') {
      if (typeof message.content === 'string') {
        return { role: 'user', content: message.content };
      }

      return {
        role: 'user',
        content: message.content
          .filter((block): block is TextContent => block.type === 'text')
          .map((block) => block.text)
          .join('\n'),
        images: message.content
          .filter((block): block is ImageContent => block.type === 'image')
          .map((block) => block.data),
      };
    }

    if (message.role === 'toolResult') {
      return {
        role: 'user',
        content: message.content
          .map((block) =>
            block.type === 'text' ? block.text : `[image:${block.mimeType};bytes=${block.data.length}]`
          )
          .join('\n'),
      };
    }

    return {
      role: 'assistant',
      content: message.content
        .map((block) => {
          if (block.type === 'text') {
            return block.text;
          }
          if (block.type === 'thinking') {
            return `<thinking>${block.thinking}</thinking>`;
          }
          return `<tool-call name="${block.name}">${JSON.stringify(block.arguments)}</tool-call>`;
        })
        .join('\n'),
    };
  });

  if (context.systemPrompt) {
    messages.unshift({
      role: 'system',
      content: context.systemPrompt,
    });
  }

  return messages;
}

function legacyInputToContext(input: GenerateInput): Context {
  const messages: Message[] = input.messages
    ? input.messages
      .filter((message) => message.role !== 'system')
      .map((message) =>
        message.role === 'assistant'
          ? {
            role: 'assistant' as const,
            api: 'ollama-native',
            provider: 'ollama',
            model: input.model,
            content: [{ type: 'text', text: message.content }],
            usage: {
              input: 0,
              output: 0,
              reasoning: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 0,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: 'stop' as const,
            timestamp: Date.now(),
          }
          : {
            role: 'user' as const,
            content: message.content,
            timestamp: Date.now(),
          }
      )
    : [{ role: 'user' as const, content: input.prompt ?? '', timestamp: Date.now() }];

  return {
    systemPrompt: input.system ?? input.messages?.find((message) => message.role === 'system')?.content,
    messages,
  };
}

async function* iterateResponseBody(
  body: NonNullable<Response['body']>
): AsyncGenerator<Uint8Array, void, void> {
  if ('getReader' in body && typeof body.getReader === 'function') {
    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }

      if (value) {
        yield value;
      }
    }
  }

  for await (const chunk of body as unknown as AsyncIterable<Uint8Array | Buffer | string>) {
    if (typeof chunk === 'string') {
      yield new TextEncoder().encode(chunk);
      continue;
    }

    yield chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
  }
}

export default OllamaClient;
