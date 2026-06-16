/**
 * @constructive-io/llm-env — LLM Environment Configuration
 *
 * Single source of truth for all LLM-related environment variables and defaults.
 * Both graphile-llm and agentic-server import from here — no direct process.env
 * reads elsewhere.
 *
 * Follows the same conventions as @pgpmjs/env:
 *   - getEnvVars(env)    → raw env parser, no defaults, conditional spread
 *   - llmDefaults        → defaults constant
 *   - getEnvOptions(overrides, env) → merged: defaults → env → overrides
 *
 * Environment variables:
 *   EMBEDDER_PROVIDER  - Embedding provider name (default: 'ollama')
 *   EMBEDDER_MODEL     - Embedding model (default: 'nomic-embed-text')
 *   EMBEDDER_BASE_URL  - Embedding provider URL (default: 'http://localhost:11434')
 *   CHAT_PROVIDER      - Chat provider name (default: 'ollama')
 *   CHAT_MODEL         - Chat model (default: 'llama3')
 *   CHAT_BASE_URL      - Chat provider URL (default: 'http://localhost:11434')
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LlmProviderConfig {
  provider?: string;
  model?: string;
  baseUrl?: string;
}

export interface LlmEnvOptions {
  embedding?: LlmProviderConfig;
  chat?: LlmProviderConfig;
}

/** Fully resolved LLM config — every field guaranteed present after merge. */
export interface ResolvedLlmEnvOptions {
  embedding: Required<LlmProviderConfig>;
  chat: Required<LlmProviderConfig>;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export const llmDefaults: ResolvedLlmEnvOptions = {
  embedding: {
    provider: 'ollama',
    model: 'nomic-embed-text',
    baseUrl: 'http://localhost:11434'
  },
  chat: {
    provider: 'ollama',
    model: 'llama3',
    baseUrl: 'http://localhost:11434'
  }
};

// ─── Env Parsing ────────────────────────────────────────────────────────────

/**
 * Parse LLM-related environment variables.
 *
 * Returns only keys that are actually set — no defaults mixed in.
 * Follows the @pgpmjs/env `getEnvVars(env)` pattern.
 *
 * @param env - Environment object to read from (defaults to process.env)
 */
export const getEnvVars = (env: NodeJS.ProcessEnv = process.env): LlmEnvOptions => {
  const {
    EMBEDDER_PROVIDER,
    EMBEDDER_MODEL,
    EMBEDDER_BASE_URL,
    CHAT_PROVIDER,
    CHAT_MODEL,
    CHAT_BASE_URL,
  } = env;

  return {
    ...((EMBEDDER_PROVIDER || EMBEDDER_MODEL || EMBEDDER_BASE_URL) && {
      embedding: {
        ...(EMBEDDER_PROVIDER && { provider: EMBEDDER_PROVIDER }),
        ...(EMBEDDER_MODEL && { model: EMBEDDER_MODEL }),
        ...(EMBEDDER_BASE_URL && { baseUrl: EMBEDDER_BASE_URL }),
      },
    }),
    ...((CHAT_PROVIDER || CHAT_MODEL || CHAT_BASE_URL) && {
      chat: {
        ...(CHAT_PROVIDER && { provider: CHAT_PROVIDER }),
        ...(CHAT_MODEL && { model: CHAT_MODEL }),
        ...(CHAT_BASE_URL && { baseUrl: CHAT_BASE_URL }),
      },
    }),
  };
};

// ─── Merged Resolution ──────────────────────────────────────────────────────

/**
 * Get fully resolved LLM configuration by merging:
 *   1. llmDefaults
 *   2. Environment variables
 *   3. Runtime overrides
 *
 * @param overrides - Runtime overrides to apply last
 * @param env - Environment object to read from (defaults to process.env)
 */
export const getEnvOptions = (
  overrides: LlmEnvOptions = {},
  env: NodeJS.ProcessEnv = process.env
): ResolvedLlmEnvOptions => {
  const envOptions = getEnvVars(env);

  return {
    embedding: {
      ...llmDefaults.embedding,
      ...envOptions.embedding,
      ...overrides.embedding,
    },
    chat: {
      ...llmDefaults.chat,
      ...envOptions.chat,
      ...overrides.chat,
    },
  };
};

/**
 * @deprecated Use `getEnvOptions()` instead. Kept for backward compatibility.
 */
export const getLlmEnvOptions = (
  env: NodeJS.ProcessEnv = process.env
): ResolvedLlmEnvOptions => getEnvOptions({}, env);
