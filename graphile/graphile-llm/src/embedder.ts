/**
 * Embedder — pluggable text-to-vector embedding for the Graphile LLM plugin
 *
 * Provides a provider-based architecture for converting text into vector
 * embeddings. Currently supports Ollama via @agentic-kit/ollama.
 *
 * Per-request model/baseUrl overrides are read from AsyncLocalStorage
 * (`llmConfigStore`). The text-search-plugin sets these overrides from
 * the database's `llm_module` config via `ctx.useLlm()`. This means
 * the same embedder function — and its metering wrapper — handle every
 * request, regardless of which tenant's model config applies.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import OllamaClient from '@agentic-kit/ollama';

import { getLlmEnvOptions } from './env';
import type { EmbedderConfig, EmbedderFunction, EmbeddingResult, LlmModuleData } from './types';

// ─── Per-request config overrides ───────────────────────────────────────────

/**
 * Per-request LLM config overrides from the database's llm_module.
 * Only string parameters — the embedder client itself stays the same.
 */
export interface LlmConfigOverrides {
  embeddingModel?: string;
  embeddingBaseUrl?: string;
  chatModel?: string;
  chatBaseUrl?: string;
}

/**
 * AsyncLocalStorage for per-request LLM config overrides.
 *
 * Set by the text-search-plugin resolver wrapper (from ctx.useLlm()),
 * read by the embedder at call time. The metering wrapper sits between
 * them and is completely unaware — it just wraps the same function.
 */
export const llmConfigStore = new AsyncLocalStorage<LlmConfigOverrides | null>();

// ─── Client cache ───────────────────────────────────────────────────────────

/** Cache OllamaClient instances by baseUrl to avoid re-creation per request */
const ollamaClientCache = new Map<string, OllamaClient>();

function getOllamaClient(baseUrl: string): OllamaClient {
  let client = ollamaClientCache.get(baseUrl);
  if (!client) {
    client = new OllamaClient(baseUrl);
    ollamaClientCache.set(baseUrl, client);
  }
  return client;
}

// ─── Built-in Providers ─────────────────────────────────────────────────────

/**
 * Create an Ollama-based embedder function.
 *
 * At call time, checks `llmConfigStore` for per-request model/baseUrl
 * overrides. Falls back to the defaults passed at creation time.
 * Client instances are cached by baseUrl — no new objects per request.
 */
function createOllamaEmbedder(
  defaultBaseUrl: string = 'http://localhost:11434',
  defaultModel: string = 'nomic-embed-text'
): EmbedderFunction {
  // Pre-cache the default client
  const defaultClient = getOllamaClient(defaultBaseUrl);

  return async (text: string): Promise<EmbeddingResult> => {
    const overrides = llmConfigStore.getStore();
    const model = overrides?.embeddingModel ?? defaultModel;
    const baseUrl = overrides?.embeddingBaseUrl ?? defaultBaseUrl;
    const client = baseUrl === defaultBaseUrl ? defaultClient : getOllamaClient(baseUrl);

    return client.generateEmbedding(text, model);
  };
}

// ─── Embedder Construction ──────────────────────────────────────────────────

/**
 * Build an embedder function from a config object.
 *
 * @returns An EmbedderFunction, or null if the provider is not recognized
 */
export function buildEmbedder(config: EmbedderConfig): EmbedderFunction | null {
  switch (config.provider) {
  case 'ollama':
    return createOllamaEmbedder(config.baseUrl, config.model);
    // Future: 'openai', 'anthropic', 'custom'
  default:
    return null;
  }
}

// ─── Resolution from LLM Module ─────────────────────────────────────────────

/**
 * Build an embedder from an `llm_module` api_modules row.
 *
 * @param data - The llm_module data from services_public.api_modules
 * @returns An EmbedderFunction, or null if the provider is not supported
 */
export function buildEmbedderFromModule(data: LlmModuleData): EmbedderFunction | null {
  return buildEmbedder({
    provider: data.embedding_provider,
    model: data.embedding_model,
    baseUrl: data.embedding_base_url
  });
}

/**
 * Resolve an embedder from environment variables.
 * This is a fallback for development when no llm_module or defaultEmbedder is configured.
 *
 * Environment variables (with defaults from env.ts):
 *   EMBEDDER_PROVIDER  - Provider name (default: 'ollama')
 *   EMBEDDER_MODEL     - Model identifier (default: 'nomic-embed-text')
 *   EMBEDDER_BASE_URL  - Provider base URL (default: 'http://localhost:11434')
 */
export function buildEmbedderFromEnv(): EmbedderFunction | null {
  const { embedding } = getLlmEnvOptions();
  return buildEmbedder(embedding);
}
