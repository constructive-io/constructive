import type { ResolvedProvider, UsageResult } from './types';

interface ContentPart {
  type: string;
  text?: string;
  image_url?: { url?: string };
}

interface ChatMessage {
  role: string;
  content?: string | ContentPart[];
  images?: string[];
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

  return (messages as ChatMessage[]).map((message) => {
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
        if (!url) throw new Error('ollama: an image_url content part carries no url');
        // Ollama takes base64 bytes, never a fetchable url.
        const base64 = /^data:[^;]*;base64,(.*)$/.exec(url)?.[1];
        if (!base64) {
          throw new Error('ollama: an image content part must be a base64 data url');
        }
        images.push(base64);
        continue;
      }
      throw new Error(`ollama: unsupported content part type '${part.type}'`);
    }

    return {
      ...message,
      content: text.join('\n'),
      ...(images.length ? { images: [...(message.images ?? []), ...images] } : {})
    };
  });
}

export function transformChatRequest(
  provider: ResolvedProvider,
  body: Record<string, unknown>
): Record<string, unknown> {
  let model = body.model || provider.defaultModel;
  if (typeof model === 'string' && model.includes('/')) {
    const prefix = model.split('/')[0];
    if (prefix === provider.type) {
      model = model.split('/').slice(1).join('/');
    }
  }

  if (provider.type === 'ollama') {
    return {
      model: model || 'llama3',
      messages: flattenContentParts(body.messages),
      stream: false,
      ...(body.temperature !== undefined && {
        options: { temperature: body.temperature }
      })
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
  const model = body.model || provider.defaultModel;

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
    const msg = data.message as { role: string; content: string } | undefined;
    const promptTokens = (data.prompt_eval_count as number) || 0;
    const completionTokens = (data.eval_count as number) || 0;
    const usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    };
    return {
      body: {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        choices: [{
          message: msg || { role: 'assistant', content: '' },
          finish_reason: 'stop',
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

export function transformEmbedResponse(
  data: Record<string, unknown>,
  provider: ResolvedProvider
): { body: Record<string, unknown>; usage: UsageResult } {
  if (provider.type === 'ollama') {
    const raw = (data.embeddings || data.embedding || []) as number[][];
    const embeddings: number[][] = Array.isArray(raw[0]) ? raw : [raw as unknown as number[]];
    const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
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
