import type { ResolvedProvider, UsageResult } from './types';

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
      messages: body.messages,
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
