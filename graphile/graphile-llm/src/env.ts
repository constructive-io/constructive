/**
 * LLM Environment Configuration
 *
 * Single source of truth for all LLM-related environment variables and defaults.
 * Every other module in graphile-llm imports from here — no direct process.env
 * reads or scattered null coalescing elsewhere.
 *
 * Environment variables:
 *   EMBEDDER_PROVIDER  - Embedding provider name ('ollama')
 *   EMBEDDER_MODEL     - Embedding model (default: 'nomic-embed-text')
 *   EMBEDDER_BASE_URL  - Embedding provider URL (default: 'http://localhost:11434')
 *   CHAT_PROVIDER      - Chat provider name ('ollama')
 *   CHAT_MODEL         - Chat model (default: 'llama3')
 *   CHAT_BASE_URL      - Chat provider URL (default: 'http://localhost:11434')
 */

// ─── Defaults ───────────────────────────────────────────────────────────────

const LLM_DEFAULTS = {
  embedding: {
    provider: 'ollama',
    model: 'nomic-embed-text',
    baseUrl: 'http://localhost:11434',
  },
  chat: {
    provider: 'ollama',
    model: 'llama3',
    baseUrl: 'http://localhost:11434',
  },
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LlmProviderConfig {
  provider: string;
  model: string;
  baseUrl: string;
}

export interface LlmEnvOptions {
  embedding: LlmProviderConfig;
  chat: LlmProviderConfig;
}

// ─── Resolution ─────────────────────────────────────────────────────────────

/**
 * Resolve LLM configuration from environment variables with sensible defaults.
 *
 * Call this once and pass the result around — never read process.env directly
 * in plugin code.
 */
export function getLlmEnvOptions(): LlmEnvOptions {
  return {
    embedding: {
      provider: process.env.EMBEDDER_PROVIDER ?? LLM_DEFAULTS.embedding.provider,
      model: process.env.EMBEDDER_MODEL ?? LLM_DEFAULTS.embedding.model,
      baseUrl: process.env.EMBEDDER_BASE_URL ?? LLM_DEFAULTS.embedding.baseUrl,
    },
    chat: {
      provider: process.env.CHAT_PROVIDER ?? LLM_DEFAULTS.chat.provider,
      model: process.env.CHAT_MODEL ?? LLM_DEFAULTS.chat.model,
      baseUrl: process.env.CHAT_BASE_URL ?? LLM_DEFAULTS.chat.baseUrl,
    },
  };
}
