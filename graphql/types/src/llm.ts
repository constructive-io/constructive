/**
 * LLM provider configuration options.
 *
 * Used by graphile-llm to resolve embedding and chat completion providers
 * from the unified environment configuration system (getEnvOptions).
 */

/**
 * Configuration for an LLM embedding provider.
 */
export interface LlmEmbedderOptions {
  /** Provider name (e.g. 'ollama') */
  provider?: string;
  /** Model identifier (e.g. 'nomic-embed-text') */
  model?: string;
  /** Provider base URL (e.g. 'http://localhost:11434') */
  baseUrl?: string;
}

/**
 * Configuration for an LLM chat completion provider.
 */
export interface LlmChatOptions {
  /** Provider name (e.g. 'ollama') */
  provider?: string;
  /** Model identifier (e.g. 'llama3') */
  model?: string;
  /** Provider base URL (e.g. 'http://localhost:11434') */
  baseUrl?: string;
}

/**
 * Top-level LLM configuration options.
 *
 * Environment variables:
 *   EMBEDDER_PROVIDER  - Embedding provider name
 *   EMBEDDER_MODEL     - Embedding model identifier
 *   EMBEDDER_BASE_URL  - Embedding provider base URL
 *   CHAT_PROVIDER      - Chat completion provider name
 *   CHAT_MODEL         - Chat completion model identifier
 *   CHAT_BASE_URL      - Chat completion provider base URL
 */
export interface LlmOptions {
  /** Embedding provider configuration */
  embedder?: LlmEmbedderOptions;
  /** Chat completion provider configuration */
  chat?: LlmChatOptions;
}
