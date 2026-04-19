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

// ─── Chat Completion Types ──────────────────────────────────────────────────

/**
 * A single message in a chat conversation.
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Options for a chat completion request.
 */
export interface ChatOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for sampling (0 = deterministic, 1 = creative) */
  temperature?: number;
}

/**
 * A function that sends messages to a chat completion provider and returns the response.
 */
export type ChatFunction = (messages: ChatMessage[], options?: ChatOptions) => Promise<string>;

/**
 * Configuration for a chat completion provider.
 */
export interface ChatConfig {
  /** Provider name: 'ollama', 'openai', or 'custom' */
  provider: string;
  /** Model identifier (e.g. 'llama3', 'gpt-4o') */
  model?: string;
  /** Base URL for the provider */
  baseUrl?: string;
  /** API key for providers that require authentication */
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
  /** Chat/completion provider (for RAG/conversation features) */
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
  /** Default number of context items for RAG queries */
  rag_context_limit?: number;
}

// ─── RAG Types ──────────────────────────────────────────────────────────────

/**
 * Default configuration for RAG (Retrieval-Augmented Generation) queries.
 */
export interface RagDefaults {
  /**
   * Default number of context items to feed into the RAG prompt.
   * Per-query `contextLimit` overrides this.
   * @default 5
   */
  contextLimit?: number;

  /**
   * Default maximum tokens for the chat completion response.
   * @default 4000
   */
  maxTokens?: number;

  /**
   * Default minimum similarity threshold (0..1).
   * Only chunks with similarity >= this threshold are included.
   * Converted to max distance internally (1 - minSimilarity for cosine).
   * @default 0 (no threshold)
   */
  minSimilarity?: number;

  /**
   * Default system prompt prepended to RAG context.
   * Can be overridden per-query.
   */
  systemPrompt?: string;
}

/**
 * Info about a chunk-aware table discovered during schema build.
 * Parsed from the @hasChunks smart tag on the parent table's codec.
 */
export interface ChunkTableInfo {
  /** Parent table codec name */
  parentCodecName: string;
  /** Schema of the chunks table (or null for public/default) */
  chunksSchema: string | null;
  /** Name of the chunks table */
  chunksTableName: string;
  /** FK column on chunks table pointing to parent */
  parentFkField: string;
  /** PK column on parent table */
  parentPkField: string;
  /** Embedding vector column on chunks table */
  embeddingField: string;
  /** Text content column on chunks table (the actual chunk text) */
  contentField: string;
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
   * Default chat completion provider when no llm_module is configured.
   * Required for RAG queries.
   * @default undefined
   */
  defaultChatCompleter?: ChatConfig;

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

  /**
   * Whether to enable RAG (Retrieval-Augmented Generation) query support.
   * When enabled, detects tables with @hasChunks smart tag and adds:
   * - `ragQuery` root query field for context-aware LLM answers
   * - `embedText` root query field for text-to-vector conversion
   * @default false
   */
  enableRag?: boolean;

  /**
   * Default configuration for RAG queries.
   * Individual queries can override these values.
   */
  ragDefaults?: RagDefaults;
}
