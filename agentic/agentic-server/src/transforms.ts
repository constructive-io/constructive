import { BadRequestError } from './errors';
import type { ResolvedProvider, UsageResult } from './types';

interface ContentPart {
  type: string;
  text?: string;
  image_url?: { url?: string };
}

interface ToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: unknown };
}

interface ChatMessage {
  role: string;
  content?: string | ContentPart[];
  images?: string[];
  tool_calls?: ToolCall[];
}

/** The name a request routes with: the registry name, else the dialect. */
export const providerName = (provider: ResolvedProvider): string => provider.name ?? provider.type;

/**
 * Strip the routing prefix a client uses to pick a provider (`anthropic/claude-…`,
 * `host-ollama/qwen3`), which the upstream itself does not know.
 */
export function upstreamModel(provider: ResolvedProvider, model: unknown): string | undefined {
  const requested = typeof model === 'string' && model ? model : provider.defaultModel;
  if (!requested) return undefined;
  const [prefix, ...rest] = requested.split('/');
  if (rest.length === 0) return requested;
  return prefix === providerName(provider) || prefix === provider.type ? rest.join('/') : requested;
}

/**
 * Flatten OpenAI content parts into the single string Ollama's chat api takes.
 *
 * Harnesses send `content` as an array of parts — pi always does — and Ollama
 * answers that with `json: cannot unmarshal array into Go struct field
 * ChatRequest.messages.content of type string`, which reaches the harness as a
 * bare `400` and reads as a broken model rather than a dialect mismatch. Image
 * parts move to Ollama's own `images` field; a part this cannot express fails
 * loudly rather than being dropped into a prompt the model never sees.
 */
function flattenContentParts(messages: unknown): unknown {
  if (!Array.isArray(messages)) return messages;

  return (messages as ChatMessage[]).map((original) => {
    const message = ollamaToolCalls(original);
    if (!Array.isArray(message.content)) return message;

    const text: string[] = [];
    const images: string[] = [];
    for (const part of message.content) {
      if (part.type === 'text' || part.type === 'input_text') {
        text.push(part.text ?? '');
        continue;
      }
      if (part.type === 'image_url') {
        const url = part.image_url?.url;
        if (!url) throw new BadRequestError('ollama: an image_url content part carries no url');
        // Ollama takes base64 bytes, never a fetchable url.
        const base64 = /^data:[^;]*;base64,(.*)$/.exec(url)?.[1];
        if (!base64) {
          throw new BadRequestError('ollama: an image content part must be a base64 data url');
        }
        images.push(base64);
        continue;
      }
      throw new BadRequestError(`ollama: unsupported content part type '${part.type}'`);
    }

    return {
      ...message,
      content: text.join('\n'),
      ...(images.length ? { images: [...(message.images ?? []), ...images] } : {})
    };
  });
}

/**
 * An earlier assistant turn replays its tool calls with `arguments` as the JSON
 * string OpenAI returns them in; Ollama's struct wants the object, and answers
 * the string with an unmarshal error.
 */
function ollamaToolCalls(message: ChatMessage): ChatMessage {
  if (!Array.isArray(message.tool_calls)) return message;
  return {
    ...message,
    tool_calls: message.tool_calls.map((call) => {
      const args = call.function?.arguments;
      if (typeof args !== 'string') return call;
      let parsed: unknown;
      try {
        parsed = JSON.parse(args);
      } catch (err) {
        throw new BadRequestError(
          `ollama: tool call '${call.function?.name ?? ''}' carries arguments that are not JSON: ${(err as Error).message}`
        );
      }
      return { ...call, function: { ...call.function, arguments: parsed } };
    })
  };
}

/**
 * Ollama's `format` from an OpenAI `response_format`: `json_object` is the
 * `'json'` mode, `json_schema` is the schema itself. A native `format` wins
 * when a caller already speaks the dialect.
 */
function ollamaFormat(body: Record<string, unknown>): unknown {
  if (body.format !== undefined) return body.format;
  const responseFormat = body.response_format as { type?: string; json_schema?: { schema?: unknown } } | undefined;
  if (!responseFormat || typeof responseFormat !== 'object') return undefined;
  if (responseFormat.type === 'json_object') return 'json';
  if (responseFormat.type === 'json_schema') {
    if (responseFormat.json_schema?.schema === undefined) {
      throw new BadRequestError('ollama: response_format json_schema carries no schema');
    }
    return responseFormat.json_schema.schema;
  }
  return undefined;
}

export function transformChatRequest(
  provider: ResolvedProvider,
  body: Record<string, unknown>
): Record<string, unknown> {
  const model = upstreamModel(provider, body.model);

  if (provider.type === 'ollama') {
    // Ollama takes sampling and runtime settings under `options`; `max_tokens`
    // is `num_predict`, and `num_ctx` (the context window the model is loaded
    // with) has no OpenAI spelling, so it rides at the top level and moves here.
    const clientOptions = (body.options && typeof body.options === 'object' ? body.options : {}) as Record<string, unknown>;
    const options = {
      ...clientOptions,
      ...(body.temperature !== undefined && { temperature: body.temperature }),
      ...(body.max_tokens !== undefined && { num_predict: body.max_tokens }),
      ...(body.num_ctx !== undefined && { num_ctx: body.num_ctx })
    };
    const format = ollamaFormat(body);
    return {
      model: model || 'llama3',
      messages: flattenContentParts(body.messages),
      stream: false,
      ...(body.tools !== undefined && { tools: body.tools }),
      ...(format !== undefined && { format }),
      ...(body.think !== undefined && { think: body.think }),
      ...(body.keep_alive !== undefined && { keep_alive: body.keep_alive }),
      ...(Object.keys(options).length > 0 && { options })
    };
  }

  if (provider.type === 'anthropic') {
    const messages = body.messages as Array<{ role: string; content: string }> | undefined;
    const systemMsg = messages?.find((m) => m.role === 'system');
    const nonSystem = messages?.filter((m) => m.role !== 'system') || [];
    return {
      model: model || 'claude-sonnet-4-20250514',
      messages: nonSystem,
      max_tokens: body.max_tokens || 4096,
      ...(systemMsg && { system: systemMsg.content }),
      ...(body.temperature !== undefined && { temperature: body.temperature })
    };
  }

  // OpenAI-compatible (default)
  return { ...body, model: model || 'gpt-4o' };
}

export function transformEmbedRequest(
  provider: ResolvedProvider,
  body: Record<string, unknown>
): Record<string, unknown> {
  const model = upstreamModel(provider, body.model);

  if (provider.type === 'ollama') {
    return {
      model: model || 'nomic-embed-text',
      input: body.input
    };
  }
  return { ...body, model: model || 'text-embedding-3-small' };
}

export function transformChatResponse(
  data: Record<string, unknown>,
  provider: ResolvedProvider
): { body: Record<string, unknown>; usage: UsageResult } {
  if (provider.type === 'ollama') {
    const msg = data.message as
      | { role?: string; content?: string; thinking?: string; tool_calls?: ToolCall[] }
      | undefined;
    const promptTokens = (data.prompt_eval_count as number) || 0;
    const completionTokens = (data.eval_count as number) || 0;
    const usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    };
    const toolCalls = openAiToolCalls(msg?.tool_calls);
    // A generation cut off by the token budget may hold half a tool call;
    // only a completed turn is reported as `tool_calls`.
    const reason = finishReason(data.done_reason);
    const message: Record<string, unknown> = {
      role: msg?.role || 'assistant',
      content: msg?.content ?? '',
      ...(msg?.thinking ? { reasoning_content: msg.thinking } : {}),
      ...(toolCalls ? { tool_calls: toolCalls } : {})
    };
    return {
      body: {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        choices: [{
          message,
          finish_reason: toolCalls && reason === 'stop' ? 'tool_calls' : reason,
          index: 0
        }],
        usage
      },
      usage
    };
  }

  if (provider.type === 'anthropic') {
    const content = data.content as Array<{ type: string; text?: string }> | undefined;
    const text = content?.find((c) => c.type === 'text')?.text || '';
    const inputUsage = (data.usage as Record<string, number>) || {};
    const usage = {
      prompt_tokens: inputUsage.input_tokens || 0,
      completion_tokens: inputUsage.output_tokens || 0,
      total_tokens: (inputUsage.input_tokens || 0) + (inputUsage.output_tokens || 0)
    };
    return {
      body: {
        id: (data.id as string) || `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        choices: [{
          message: { role: 'assistant', content: text },
          finish_reason: 'stop',
          index: 0
        }],
        usage
      },
      usage
    };
  }

  // OpenAI — pass through
  const usage = (data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }) as UsageResult;
  return { body: data, usage };
}

/**
 * Ollama's tool calls in the OpenAI shape a harness reads: `arguments` as a JSON
 * string, a `type`, and an `id` (Ollama gives none; the harness echoes the id
 * back on the tool result, so any stable per-response id works).
 */
function openAiToolCalls(calls: ToolCall[] | undefined): Record<string, unknown>[] | undefined {
  if (!Array.isArray(calls) || calls.length === 0) return undefined;
  return calls.map((call, index) => {
    const args = call.function?.arguments;
    return {
      id: call.id || `call_${index}`,
      type: 'function',
      function: {
        name: call.function?.name ?? '',
        arguments: typeof args === 'string' ? args : JSON.stringify(args ?? {})
      }
    };
  });
}

function finishReason(doneReason: unknown): string {
  if (doneReason === 'length' || doneReason === 'max_tokens') return 'length';
  return 'stop';
}

export function transformEmbedResponse(
  data: Record<string, unknown>,
  provider: ResolvedProvider
): { body: Record<string, unknown>; usage: UsageResult } {
  if (provider.type === 'ollama') {
    const raw = (data.embeddings || data.embedding || []) as number[][];
    const embeddings: number[][] = Array.isArray(raw[0]) ? raw : [raw as unknown as number[]];
    // Ollama reports the prompt tokens of an embed as `prompt_eval_count`.
    const promptTokens = (data.prompt_eval_count as number) || 0;
    const usage = { prompt_tokens: promptTokens, completion_tokens: 0, total_tokens: promptTokens };
    return {
      body: {
        object: 'list',
        data: embeddings.map((emb, i) => ({ object: 'embedding', embedding: emb, index: i })),
        usage
      },
      usage
    };
  }

  const usage = (data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }) as UsageResult;
  return { body: data, usage };
}
