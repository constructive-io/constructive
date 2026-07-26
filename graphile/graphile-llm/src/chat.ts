/**
 * Chat Completion — pluggable chat/completion provider for the Graphile LLM plugin
 *
 * Provides a provider-based architecture for LLM chat completions.
 * Currently supports Ollama via @agentic-kit/ollama.
 *
 * Used by the RAG plugin to generate answers from retrieved context.
 *
 * Resolution order mirrors the embedder:
 *   1. The `llm_module` configuration (per-database)
 *   2. The preset's `defaultChatCompleter` option (fallback for dev/testing)
 *   3. Environment variables (CHAT_PROVIDER, CHAT_MODEL, CHAT_BASE_URL)
 */

import { OllamaAdapter } from '@agentic-kit/ollama';

import { getLlmEnvOptions } from './env';
import type { ChatConfig, ChatFunction, ChatMessage, ChatOptions, ChatResult, LlmModuleData } from './types';

// ─── Built-in Providers ─────────────────────────────────────────────────────

/**
 * Create an Ollama-based chat completion function.
 *
 * Uses OllamaAdapter.stream() to get both response content and real token
 * usage counts from the provider (prompt_eval_count, eval_count).
 */
function createOllamaChatCompleter(
  baseUrl: string = 'http://localhost:11434',
  model: string = 'llama3'
): ChatFunction {
  const adapter = new OllamaAdapter(baseUrl);

  return async (messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> => {
    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystem = messages.filter((m) => m.role !== 'system');

    const modelDesc = adapter.createModel(model, {
      maxOutputTokens: options?.maxTokens
    });

    const context = {
      systemPrompt: systemMsg?.content,
      messages: nonSystem.map((m) => ({
        role: m.role as 'user',
        content: m.content,
        timestamp: Date.now()
      }))
    };

    const stream = adapter.stream(modelDesc, context, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    });

    const result = await stream.result();

    const content = result.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content,
      usage: {
        input: result.usage.input,
        output: result.usage.output,
        reasoning: result.usage.reasoning,
        cacheRead: result.usage.cacheRead,
        cacheWrite: result.usage.cacheWrite,
        totalTokens: result.usage.totalTokens
      }
    };
  };
}

// ─── Chat Completer Construction ────────────────────────────────────────────

/**
 * Build a chat completion function from a config object.
 *
 * @returns A ChatFunction, or null if the provider is not recognized
 */
export function buildChatCompleter(config: ChatConfig): ChatFunction | null {
  switch (config.provider) {
  case 'ollama':
    return createOllamaChatCompleter(config.baseUrl, config.model);
    // Future: 'openai', 'anthropic', 'custom'
  default:
    return null;
  }
}

// ─── Resolution from LLM Module ─────────────────────────────────────────────

/**
 * Build a chat completer from an `llm_module` row.
 *
 * @param data - The llm_module data from metaschema_modules_public.llm_module
 * @returns A ChatFunction, or null if the chat provider is not configured
 */
export function buildChatCompleterFromModule(data: LlmModuleData): ChatFunction | null {
  if (!data.chat_provider) return null;
  return buildChatCompleter({
    provider: data.chat_provider,
    model: data.chat_model,
    baseUrl: data.chat_base_url
  });
}

/**
 * Resolve a chat completer from environment variables.
 * This is a fallback for development when no llm_module or defaultChatCompleter is configured.
 *
 * Environment variables (with defaults from env.ts):
 *   CHAT_PROVIDER  - Provider name (default: 'ollama')
 *   CHAT_MODEL     - Model identifier (default: 'llama3')
 *   CHAT_BASE_URL  - Provider base URL (default: 'http://localhost:11434')
 */
export function buildChatCompleterFromEnv(): ChatFunction | null {
  const { chat } = getLlmEnvOptions();
  return buildChatCompleter(chat);
}
