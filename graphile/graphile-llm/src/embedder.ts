/**
 * Embedder — text-to-vector embedding for the Graphile LLM plugin
 *
 * Every embedding is a `POST /v1/embeddings` on the metered gateway
 * (`AGENTIC_SERVER_URL`) carrying the request's identity headers: the gateway
 * owns the upstream provider and records the call. There is no other route;
 * configuring an embedder without a gateway fails when the schema is built.
 *
 * Per-request state is read from AsyncLocalStorage (`llmConfigStore`): the
 * identity the gateway attributes the call to, taken from the request's
 * `jwt.claims.*` settings, and the model override from the database's
 * `llm_module`. The same embedder function handles every request.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import { buildIdentityHeaders, type MeteredIdentity, normalizeGatewayUrl } from '@agentic-kit/metering';

import { getEnvVars, getLlmEnvOptions } from './env';
import type { EmbedderConfig, EmbedderFunction, EmbeddingResult } from './types';

// ─── Per-request scope ──────────────────────────────────────────────────────

/**
 * What one request contributes to a model call: who it is for, and the
 * database's own model overrides. The gateway client itself stays the same
 * across requests.
 */
export interface LlmRequestScope {
  embeddingModel?: string;
  chatModel?: string;
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
 * The scope one request's model calls run under: the database's `llm_module`
 * model overrides (when the server exposes them on the GraphQL context) and
 * the identity the request's claims carry.
 */
export async function resolveRequestScope(graphqlContext: any): Promise<LlmRequestScope> {
  const scope: LlmRequestScope = { identity: identityFromClaims(graphqlContext?.pgSettings) };
  const ctx = graphqlContext?.constructive;
  if (!ctx?.useLlm) return scope;

  try {
    const llm = await ctx.useLlm();
    if (!llm?.embeddingModel) return scope;
    return {
      ...scope,
      embeddingModel: llm.embeddingModel,
      chatModel: llm.chatModel ?? undefined
    };
  } catch {
    return scope;
  }
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

// ─── Gateway client ─────────────────────────────────────────────────────────

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
 * The gateway every model call goes through. Configuring a model without one
 * would mean unrecorded calls, so it is refused when the schema is built
 * rather than discovered later as a missing record.
 */
export function requireGatewayUrl(what: string): string {
  const { gateway } = getLlmEnvOptions();
  if (!gateway.url) {
    throw new Error(
      `graphile-llm: ${what} is configured but AGENTIC_SERVER_URL is not set. ` +
        'Server-side model calls go through the agentic-server gateway, which records each one; ' +
        'set AGENTIC_SERVER_URL to the gateway root.'
    );
  }
  return gateway.url;
}

/**
 * Build an embedder from a config object: the gateway client for the named
 * provider and model. Throws when no gateway is configured.
 */
export function buildEmbedder(config: EmbedderConfig): EmbedderFunction {
  const gatewayUrl = requireGatewayUrl(`an embedder (${config.provider})`);
  return createGatewayEmbedder(gatewayUrl, config.model ?? getLlmEnvOptions().embedding.model, config.provider);
}

/**
 * Resolve an embedder from environment variables.
 *
 *   AGENTIC_SERVER_URL - The gateway root; with it set, an embedder is always
 *                        available (the gateway resolves the upstream).
 *   EMBEDDER_PROVIDER  - Upstream dialect the gateway should use (default: 'ollama')
 *   EMBEDDER_MODEL     - Model identifier (default: 'nomic-embed-text')
 *
 * Naming a provider or model without a gateway throws; naming nothing at all
 * leaves text fields disabled.
 */
export function buildEmbedderFromEnv(): EmbedderFunction | null {
  const { embedding, gateway } = getLlmEnvOptions();
  if (gateway.url) {
    return createGatewayEmbedder(gateway.url, embedding.model, embedding.provider);
  }
  if (getEnvVars().embedding) {
    requireGatewayUrl('EMBEDDER_PROVIDER / EMBEDDER_MODEL');
  }
  return null;
}
