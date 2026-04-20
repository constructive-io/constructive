/**
 * CLI Embedder — pluggable text-to-vector embedding for CLI commands
 *
 * This is RUNTIME code that gets copied to generated output.
 * Provides a pluggable system for registering embedding functions so that
 * CLI commands can convert text queries into vector arrays for pgvector
 * similarity search (list/search) and create/update vector fields inline.
 *
 * Configuration via appstash config or environment variables:
 *   embedder.provider  = 'ollama' | 'custom'
 *   embedder.model     = 'nomic-embed-text' (default)
 *   embedder.baseUrl   = 'http://localhost:11434' (Ollama endpoint)
 *
 * Uses @agentic-kit/ollama for the built-in Ollama provider.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated CLI embedder modules.
 */

import OllamaClient from '@agentic-kit/ollama';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EmbedderFunction = (text: string) => Promise<number[]>;

export interface EmbedderConfig {
  /** Provider name: 'ollama' or 'custom' */
  provider: string;
  /** Model identifier (e.g. 'nomic-embed-text') */
  model?: string;
  /** Base URL for the provider (e.g. 'http://localhost:11434' for Ollama) */
  baseUrl?: string;
}

// ─── Built-in Ollama Provider ────────────────────────────────────────────────

function createOllamaEmbedder(
  baseUrl: string = 'http://localhost:11434',
  model: string = 'nomic-embed-text',
): EmbedderFunction {
  const client = new OllamaClient(baseUrl);
  return async (text: string): Promise<number[]> => {
    return client.generateEmbedding(text, model);
  };
}

// ─── Embedder Resolution ─────────────────────────────────────────────────────

/**
 * Resolve an embedder function from environment variables or appstash config.
 *
 * Resolution order:
 *   1. EMBEDDER_PROVIDER env var (+ EMBEDDER_MODEL, EMBEDDER_BASE_URL)
 *   2. appstash config keys: embedder.provider, embedder.model, embedder.baseUrl
 *   3. null (no embedder configured)
 *
 * @param store - Optional appstash config store for reading persisted config
 * @returns An EmbedderFunction or null if no embedder is configured
 */
export function resolveEmbedder(
  store?: { getVar: (key: string) => string | undefined },
): EmbedderFunction | null {
  // 1. Check environment variables first
  const envProvider = process.env.EMBEDDER_PROVIDER;
  if (envProvider) {
    return buildEmbedder({
      provider: envProvider,
      model: process.env.EMBEDDER_MODEL,
      baseUrl: process.env.EMBEDDER_BASE_URL,
    });
  }

  // 2. Check appstash config
  if (store) {
    const configProvider = store.getVar('embedder.provider');
    if (configProvider) {
      return buildEmbedder({
        provider: configProvider,
        model: store.getVar('embedder.model'),
        baseUrl: store.getVar('embedder.baseUrl'),
      });
    }
  }

  // 3. No embedder configured
  return null;
}

/**
 * Build an embedder function from a config object.
 */
function buildEmbedder(config: EmbedderConfig): EmbedderFunction | null {
  switch (config.provider) {
    case 'ollama':
      return createOllamaEmbedder(config.baseUrl, config.model);
    default:
      console.error(
        `Unknown embedder provider: '${config.provider}'. Supported: ollama`,
      );
      return null;
  }
}

/**
 * Auto-embed text values in vector where-clause fields.
 *
 * When --auto-embed is passed, any vector field in the where clause that
 * contains a text string (instead of a float array) will be converted to
 * an embedding vector using the configured embedder.
 *
 * @param where - The where clause object (mutated in place)
 * @param vectorFieldNames - Names of vector embedding fields (e.g. ['vectorEmbedding'])
 * @param embedder - The resolved embedder function
 * @returns The modified where clause
 */
export async function autoEmbedWhere<T extends object>(
  where: T,
  vectorFieldNames: string[],
  embedder: EmbedderFunction,
): Promise<T> {
  const rec = where as unknown as Record<string, unknown>;
  for (const fieldName of vectorFieldNames) {
    const fieldValue = rec[fieldName];
    if (fieldValue && typeof fieldValue === 'object') {
      const input = fieldValue as Record<string, unknown>;
      // If 'vector' is a string, embed it
      if (typeof input.vector === 'string') {
        const text = input.vector;
        const embedding = await embedder(text);
        input.vector = embedding;
      }
    } else if (typeof fieldValue === 'string') {
      // Shorthand: --where.vectorEmbedding "text" with --auto-embed
      // becomes { vector: [embedded], metric: 'COSINE' }
      const embedding = await embedder(fieldValue);
      rec[fieldName] = { vector: embedding };
    }
  }
  return where;
}

/**
 * Auto-embed text values in mutation input data (create/update).
 *
 * When --auto-embed is passed on create or update, any vector field in
 * the input data that contains a text string will be converted to an
 * embedding vector using the configured embedder.
 *
 * Usage:
 *   csdk article create --input.embedding "Machine learning concepts" --auto-embed
 *   csdk article update --id xxx --input.embedding "Updated description" --auto-embed
 *
 * This is a CLI-only convenience — in production, database triggers or
 * a job queue should handle embedding generation.
 *
 * @param data - The mutation input data object (mutated in place)
 * @param vectorFieldNames - Names of vector embedding fields (e.g. ['embedding'])
 * @param embedder - The resolved embedder function
 * @returns The modified data object with text values replaced by vectors
 */
export async function autoEmbedInput<T extends object>(
  data: T,
  vectorFieldNames: string[],
  embedder: EmbedderFunction,
): Promise<T> {
  const rec = data as unknown as Record<string, unknown>;
  for (const fieldName of vectorFieldNames) {
    const fieldValue = rec[fieldName];
    if (typeof fieldValue === 'string') {
      // Text string → embed to vector array
      const embedding = await embedder(fieldValue);
      rec[fieldName] = embedding;
    }
    // If it's already an array (pre-computed vector), leave it as-is
  }
  return data;
}
