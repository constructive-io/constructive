/**
 * Chat Completion — chat/completion for the Graphile LLM plugin
 *
 * Used by the RAG plugin to generate answers from retrieved context.
 *
 * Every completion is a `POST /v1/chat/completions` on the metered gateway
 * (`AGENTIC_SERVER_URL`) under the request's identity (see embedder.ts), so
 * each call is recorded. Resolution mirrors the embedder: the preset's
 * `defaultChatCompleter`, else `CHAT_PROVIDER` / `CHAT_MODEL`; the
 * per-database `llm_module` model override applies at call time.
 */

import { normalizeGatewayUrl } from '@agentic-kit/metering';

import { gatewayHeaders, llmConfigStore, requireGatewayUrl } from './embedder';
import { getEnvVars, getLlmEnvOptions } from './env';
import type { ChatConfig, ChatFunction, ChatMessage, ChatOptions, ChatResult } from './types';

// ─── Gateway client ─────────────────────────────────────────────────────────

interface GatewayChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * Create a chat completer that calls the metered gateway's `/v1/chat/completions`.
 */
export function createGatewayChatCompleter(
  gatewayUrl: string,
  defaultModel: string,
  provider: string
): ChatFunction {
  const root = normalizeGatewayUrl(gatewayUrl);

  return async (messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> => {
    const model = llmConfigStore.getStore()?.chatModel ?? defaultModel;
    const response = await fetch(`${root}/v1/chat/completions`, {
      method: 'POST',
      headers: gatewayHeaders(provider),
      body: JSON.stringify({
        model,
        messages,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens })
      })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`gateway chat completion failed: ${response.status}${detail ? ` ${detail}` : ''}`);
    }
    const payload = (await response.json()) as GatewayChatResponse;
    const input = payload.usage?.prompt_tokens ?? 0;
    const output = payload.usage?.completion_tokens ?? 0;
    return {
      content: payload.choices?.[0]?.message?.content ?? '',
      usage: {
        input,
        output,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: payload.usage?.total_tokens ?? input + output
      }
    };
  };
}

// ─── Chat Completer Construction ────────────────────────────────────────────

/**
 * Build a chat completer from a config object: the gateway client for the
 * named provider and model. Throws when no gateway is configured.
 */
export function buildChatCompleter(config: ChatConfig): ChatFunction {
  const gatewayUrl = requireGatewayUrl(`a chat completer (${config.provider})`);
  return createGatewayChatCompleter(gatewayUrl, config.model ?? getLlmEnvOptions().chat.model, config.provider);
}

/**
 * Resolve a chat completer from environment variables.
 *
 *   AGENTIC_SERVER_URL - The gateway root; with it set, a completer is always
 *                        available (the gateway resolves the upstream).
 *   CHAT_PROVIDER      - Upstream dialect the gateway should use (default: 'ollama')
 *   CHAT_MODEL         - Model identifier (default: 'llama3')
 *
 * Naming a provider or model without a gateway throws; naming nothing at all
 * leaves RAG disabled.
 */
export function buildChatCompleterFromEnv(): ChatFunction | null {
  const { chat, gateway } = getLlmEnvOptions();
  if (gateway.url) {
    return createGatewayChatCompleter(gateway.url, chat.model, chat.provider);
  }
  if (getEnvVars().chat) {
    requireGatewayUrl('CHAT_PROVIDER / CHAT_MODEL');
  }
  return null;
}
