/**
 * graphile-llm Types
 *
 * Shared type definitions for the LLM plugin.
 */

// ─── Embedder Types ─────────────────────────────────────────────────────────

/**
 * A function that converts text into a vector embedding.
 */
export type EmbedderFunction = (text: string) => Promise<number[]>;

/**
 * Configuration for an embedding provider.
 */
export interface EmbedderConfig {
  /** Provider name: 'ollama', 'openai', or 'custom' */
  provider: string;
  /** Model identifier (e.g. 'nomic-embed-text', 'text-embedding-3-small') */
  model?: string;
  /** Base URL for the provider (e.g. 'http://localhost:11434' for Ollama) */
  baseUrl?: string;
  /** API key for providers that require authentication (e.g. OpenAI) */
  apiKey?: string;
}

// ─── LLM Module Types ───────────────────────────────────────────────────────

/**
 * The shape of the `llm_module` data stored in `services_public.api_modules`.
 *
 * This is the per-database configuration that controls which LLM provider
 * and models are available for that API.
 */
export interface LlmModuleData {
  /** Embedding provider: 'ollama', 'openai', or 'custom' */
  embedding_provider: string;
  /** Embedding model identifier */
  embedding_model?: string;
  /** Base URL for the embedding provider */
  embedding_base_url?: string;
  /** Number of dimensions the embedding model produces */
  embedding_dimensions?: number;
  /** Chat/completion provider (for future RAG/conversation features) */
  chat_provider?: string;
  /** Chat model identifier */
  chat_model?: string;
  /** Base URL for the chat provider */
  chat_base_url?: string;
  /** API key reference (e.g. 'vault://openai-key' or env var name) */
  api_key_ref?: string;
  /** Rate limit: requests per minute */
  rate_limit_rpm?: number;
  /** Maximum tokens per request */
  max_tokens_per_request?: number;
}

// ─── Plugin Options ─────────────────────────────────────────────────────────

/**
 * Options for the GraphileLlmPreset.
 */
export interface GraphileLlmOptions {
  /**
   * Default embedding provider when no llm_module is configured.
   * Useful for development/testing without requiring api_modules setup.
   * @default undefined (requires llm_module to be configured)
   */
  defaultEmbedder?: EmbedderConfig;

  /**
   * Whether to add `text` field to VectorNearbyInput for text-based vector search.
   * @default true
   */
  enableTextSearch?: boolean;

  /**
   * Whether to add `*Text` companion fields on mutation inputs for vector columns.
   * @default true
   */
  enableTextMutations?: boolean;
}
