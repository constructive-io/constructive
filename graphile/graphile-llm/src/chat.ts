/**
 * Chat Completion — pluggable chat/completion provider for the Graphile LLM plugin
 *
 * Provides a provider-based architecture for LLM chat completions.
 * Currently supports Ollama via @agentic-kit/ollama.
 *
 * Used by the RAG plugin to generate answers from retrieved context.
 *
 * Resolution order mirrors the embedder:
 *   1. The `llm_module` api_modules configuration (per-database)
 *   2. The preset's `defaultChatCompleter` option (fallback for dev/testing)
 *   3. Environment variables (CHAT_PROVIDER, CHAT_MODEL, CHAT_BASE_URL)
 */

import OllamaClient from '@agentic-kit/ollama';
import type { ChatConfig, ChatFunction, ChatMessage, ChatOptions, LlmModuleData } from './types';

// ─── Built-in Providers ─────────────────────────────────────────────────────

/**
 * Create an Ollama-based chat completion function.
 *
 * Uses OllamaClient.generate() with a messages array, which internally
 * routes to the /api/chat endpoint.
 */
function createOllamaChatCompleter(
  baseUrl: string = 'http://localhost:11434',
  model: string = 'llama3',
): ChatFunction {
  const client = new OllamaClient(baseUrl);
  return async (messages: ChatMessage[], options?: ChatOptions): Promise<string> => {
    // Build the input for OllamaClient.generate() in chat mode
    const input: any = {
      model,
      messages: messages.filter((m) => m.role !== 'system'),
    };

    // Extract system message if present
    const systemMsg = messages.find((m) => m.role === 'system');
    if (systemMsg) {
      input.system = systemMsg.content;
    }

    if (options?.temperature !== undefined) {
      input.temperature = options.temperature;
    }

    const startTime = Date.now();
    const response = await client.generate(input);
    const latencyMs = Date.now() - startTime;

    // Token count logging (metering deferred to billing system)
    console.log(
      `[graphile-llm] Chat completion: model=${model}, latency=${latencyMs}ms, ` +
      `messages=${messages.length}`
    );

    return response;
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
 * Build a chat completer from an `llm_module` api_modules row.
 *
 * @param data - The llm_module data from services_public.api_modules
 * @returns A ChatFunction, or null if the chat provider is not configured
 */
export function buildChatCompleterFromModule(data: LlmModuleData): ChatFunction | null {
  if (!data.chat_provider) return null;
  return buildChatCompleter({
    provider: data.chat_provider,
    model: data.chat_model,
    baseUrl: data.chat_base_url,
    apiKey: data.api_key_ref,
  });
}

/**
 * Resolve a chat completer from environment variables.
 * This is a fallback for development when no llm_module or defaultChatCompleter is configured.
 *
 * Environment variables:
 *   CHAT_PROVIDER - Provider name ('ollama')
 *   CHAT_MODEL    - Model identifier (e.g. 'llama3')
 *   CHAT_BASE_URL - Provider base URL
 */
export function buildChatCompleterFromEnv(): ChatFunction | null {
  const provider = process.env.CHAT_PROVIDER;
  if (!provider) return null;

  return buildChatCompleter({
    provider,
    model: process.env.CHAT_MODEL,
    baseUrl: process.env.CHAT_BASE_URL,
  });
}
