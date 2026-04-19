/**
 * Embedder — pluggable text-to-vector embedding for the Graphile LLM plugin
 *
 * Provides a provider-based architecture for converting text into vector
 * embeddings. Currently supports Ollama via @agentic-kit/ollama.
 *
 * The embedder is resolved at request time from:
 *   1. The `llm_module` api_modules configuration (per-database)
 *   2. The preset's `defaultEmbedder` option (fallback for dev/testing)
 *   3. Environment variables (EMBEDDER_PROVIDER, EMBEDDER_MODEL, EMBEDDER_BASE_URL)
 */

import OllamaClient from '@agentic-kit/ollama';
import { getEnvOptions } from '@constructive-io/graphql-env';
import type { EmbedderConfig, EmbedderFunction, LlmModuleData } from './types';

// ─── Built-in Providers ─────────────────────────────────────────────────────

/**
 * Create an Ollama-based embedder function.
 */
function createOllamaEmbedder(
  baseUrl: string = 'http://localhost:11434',
  model: string = 'nomic-embed-text',
): EmbedderFunction {
  const client = new OllamaClient(baseUrl);
  return async (text: string): Promise<number[]> => {
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
    baseUrl: data.embedding_base_url,
    apiKey: data.api_key_ref,
  });
}

/**
 * Resolve an embedder from environment variables via getEnvOptions().
 * This is a fallback for development when no llm_module or defaultEmbedder is configured.
 *
 * Environment variables (parsed by @constructive-io/graphql-env):
 *   EMBEDDER_PROVIDER - Provider name ('ollama')
 *   EMBEDDER_MODEL    - Model identifier
 *   EMBEDDER_BASE_URL - Provider base URL
 */
export function buildEmbedderFromEnv(): EmbedderFunction | null {
  const { llm } = getEnvOptions();
  const provider = llm?.embedder?.provider;
  if (!provider) return null;

  return buildEmbedder({
    provider,
    model: llm?.embedder?.model,
    baseUrl: llm?.embedder?.baseUrl,
  });
}
