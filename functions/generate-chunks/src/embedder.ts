import OllamaClient from '@agentic-kit/ollama';
import { createLogger } from '@pgpmjs/logger';

const logger = createLogger('generate-chunks:embedder');

export type EmbedderFunction = (text: string) => Promise<number[]>;

interface EmbedderEnvConfig {
  provider: string;
  model: string;
  baseUrl: string;
}

function getEmbedderEnvConfig(): EmbedderEnvConfig {
  return {
    provider: process.env.EMBEDDER_PROVIDER || 'ollama',
    model: process.env.EMBEDDER_MODEL || 'nomic-embed-text',
    baseUrl: process.env.EMBEDDER_BASE_URL || 'http://localhost:11434'
  };
}

function createOllamaEmbedder(baseUrl: string, model: string): EmbedderFunction {
  const client = new OllamaClient(baseUrl);
  return async (text: string): Promise<number[]> => {
    return client.generateEmbedding(text, model);
  };
}

/**
 * Build an embedder function from environment configuration.
 *
 * Supports:
 *   - ollama (default): uses @agentic-kit/ollama
 *
 * Configuration via env vars:
 *   EMBEDDER_PROVIDER  (default: 'ollama')
 *   EMBEDDER_MODEL     (default: 'nomic-embed-text')
 *   EMBEDDER_BASE_URL  (default: 'http://localhost:11434')
 *
 * Per-job override via the embedding_chunks row:
 *   embedding_provider, embedding_model (stored at provisioning time)
 */
export function buildEmbedder(
  provider?: string,
  model?: string,
  baseUrl?: string
): EmbedderFunction | null {
  const env = getEmbedderEnvConfig();
  const resolvedProvider = provider || env.provider;
  const resolvedModel = model || env.model;
  const resolvedBaseUrl = baseUrl || env.baseUrl;

  logger.info('Building embedder', {
    provider: resolvedProvider,
    model: resolvedModel,
    baseUrl: resolvedBaseUrl
  });

  switch (resolvedProvider) {
  case 'ollama':
    return createOllamaEmbedder(resolvedBaseUrl, resolvedModel);
  default:
    logger.warn('Unknown embedder provider, embeddings will be skipped', {
      provider: resolvedProvider
    });
    return null;
  }
}
