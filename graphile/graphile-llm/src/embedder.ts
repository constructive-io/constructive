/**
 * Embedder — pluggable text-to-vector embedding for the Graphile LLM plugin
 *
 * Two routes:
 *
 *   - The metered gateway (`AGENTIC_SERVER_URL`): every embedding is a
 *     `POST /v1/embeddings` carrying the request's identity headers, so the
 *     gateway resolves the upstream provider and records the call. This is the
 *     route a Constructive server uses.
 *   - A provider called directly (Ollama via @agentic-kit/ollama), for a
 *     standalone PostGraphile deployment with no gateway.
 *
 * Per-request state is read from AsyncLocalStorage (`llmConfigStore`): the
 * identity the gateway attributes the call to, taken from the request's
 * `jwt.claims.*` settings, and model/baseUrl overrides from the database's
 * `llm_module`. The same embedder function handles every request.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import { buildIdentityHeaders, type MeteredIdentity, normalizeGatewayUrl } from '@agentic-kit/metering';
import OllamaClient from '@agentic-kit/ollama';

import { getLlmEnvOptions } from './env';
import type { EmbedderConfig, EmbedderFunction, EmbeddingResult, LlmModuleData } from './types';

// ─── Per-request scope ──────────────────────────────────────────────────────

/**
 * What one request contributes to a model call: who it is for, and the
 * database's own model/baseUrl overrides. The embedder client itself stays
 * the same across requests.
 */
export interface LlmRequestScope {
  embeddingModel?: string;
  embeddingBaseUrl?: string;
  chatModel?: string;
  chatBaseUrl?: string;
  /** The identity the gateway meters on; absent when the request names no database. */
  identity?: MeteredIdentity;
}

/**
 * AsyncLocalStorage for the per-request scope.
 *
 * Set around every model call (the plan-time embedding step in
 * embed-inputs.ts, the RAG plugin), read by the embedder and chat completer
 * at call time.
 */
export const llmConfigStore = new AsyncLocalStorage<LlmRequestScope | null>();

/**
 * The identity a request's model calls are attributed to, read from the
 * `jwt.claims.*` settings the request carries into every transaction —
 * the same source the database attributes its own writes to. Nothing here
 * is looked up or defaulted: no `database_id` claim means no identity.
 */
export function identityFromClaims(
  pgSettings: Record<string, string> | null | undefined
): MeteredIdentity | undefined {
  const databaseId = pgSettings?.['jwt.claims.database_id'];
  if (!databaseId) return undefined;
  return {
    databaseId,
    entityId: pgSettings['jwt.claims.entity_id'],
    actorId: pgSettings['jwt.claims.user_id']
  };
}

/**
 * Headers for one gateway call: content type, the upstream dialect the
 * deployment names, and the identity the gateway records the call under.
 * A request without an identity cannot be attributed, so it is refused here
 * rather than reaching the gateway as an anonymous cost.
 */
export function gatewayHeaders(provider: string): Record<string, string> {
  const identity = llmConfigStore.getStore()?.identity;
  if (!identity) {
    throw new Error(
      'graphile-llm: the request carries no database_id claim, so the gateway cannot attribute this model call'
    );
  }
  return {
    'Content-Type': 'application/json',
    'X-LLM-Provider': provider,
    ...buildIdentityHeaders(identity)
  };
}

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

interface GatewayEmbeddingsResponse {
  data?: Array<{ embedding: number[] }>;
  usage?: { prompt_tokens?: number };
}

/**
 * Create an embedder that calls the metered gateway's `/v1/embeddings`.
 *
 * The gateway owns the upstream (URL, credentials) and the record of the
 * call; this side sends the model, the text and the request's identity.
 */
export function createGatewayEmbedder(
  gatewayUrl: string,
  defaultModel: string,
  provider: string
): EmbedderFunction {
  const root = normalizeGatewayUrl(gatewayUrl);

  return async (text: string): Promise<EmbeddingResult> => {
    const model = llmConfigStore.getStore()?.embeddingModel ?? defaultModel;
    const response = await fetch(`${root}/v1/embeddings`, {
      method: 'POST',
      headers: gatewayHeaders(provider),
      body: JSON.stringify({ model, input: text })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`gateway embeddings failed: ${response.status}${detail ? ` ${detail}` : ''}`);
    }
    const payload = (await response.json()) as GatewayEmbeddingsResponse;
    return {
      embedding: payload.data?.[0]?.embedding ?? [],
      promptTokens: payload.usage?.prompt_tokens ?? 0
    };
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
 * Build an embedder from an `llm_module` row.
 *
 * @param data - The llm_module data from metaschema_modules_public.llm_module
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
 *
 * With `AGENTIC_SERVER_URL` set, embeddings go through the metered gateway
 * and `EMBEDDER_PROVIDER` names the upstream dialect the gateway should use.
 * Otherwise the provider is called directly:
 *   EMBEDDER_PROVIDER  - Provider name (default: 'ollama')
 *   EMBEDDER_MODEL     - Model identifier (default: 'nomic-embed-text')
 *   EMBEDDER_BASE_URL  - Provider base URL (default: 'http://localhost:11434')
 */
export function buildEmbedderFromEnv(): EmbedderFunction | null {
  const { embedding, gateway } = getLlmEnvOptions();
  if (gateway.url) {
    return createGatewayEmbedder(gateway.url, embedding.model, embedding.provider);
  }
  return buildEmbedder(embedding);
}
