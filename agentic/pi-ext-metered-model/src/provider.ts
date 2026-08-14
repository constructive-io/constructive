/**
 * The gateway as a pi provider.
 *
 * `agentic-server` speaks OpenAI's `/v1/chat/completions`, which is one of pi's
 * built-in api types, so routing a pi session through it needs no custom
 * streaming code — only a provider whose `baseUrl` is the gateway and whose
 * headers carry the run's identity.
 *
 * This module builds the config as a plain object so it can be asserted in tests
 * without pi's registry; `./extension.ts` hands it to `pi.registerProvider`.
 */

import type { ProviderConfig, ProviderModelConfig } from '@earendil-works/pi-coding-agent';

import { buildIdentityHeaders, type MeteredIdentity } from './identity';

/** The api the gateway exposes. */
export const GATEWAY_API = 'openai-completions';

/** Default provider name; also the prefix pi shows in the model picker. */
export const DEFAULT_PROVIDER_NAME = 'constructive-gateway';

export interface MeteredModelSpec {
  /** Model id as the gateway routes it, e.g. `anthropic/claude-sonnet-4`. */
  id: string;
  name?: string;
  contextWindow: number;
  maxTokens: number;
  reasoning?: boolean;
  input?: ('text' | 'image')[];
  /**
   * Per-token cost for pi's own display. The gateway is the billing authority,
   * so zeros here mean "not priced client-side", never "free".
   */
  cost?: ProviderModelConfig['cost'];
}

export interface MeteredProviderOptions {
  /** Gateway root, e.g. `https://agentic.example.com` — not a `/v1` path. */
  gatewayUrl: string;
  identity: MeteredIdentity;
  models: readonly MeteredModelSpec[];
  /** Provider name to register under. Defaults to `constructive-gateway`. */
  providerName?: string;
  /** Display name in pi's UI. */
  displayName?: string;
  /** Extra headers, e.g. `X-LLM-Provider` to pin the upstream provider. */
  headers?: Record<string, string>;
  /**
   * API key for the gateway itself. Identity travels in headers, so this is
   * usually unnecessary; when the ingress wants a bearer, prefer
   * `identity.runToken`.
   */
  apiKey?: string;
}

const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } as const;

/** Normalize the gateway root: absolute http(s), no trailing slash, no `/v1`. */
export function normalizeGatewayUrl(gatewayUrl: string): string {
  const raw = gatewayUrl?.trim();
  if (!raw) throw new Error('metered model: gatewayUrl is required');

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`metered model: gatewayUrl must be an absolute URL, got ${raw}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`metered model: gatewayUrl must be http(s), got ${parsed.protocol}`);
  }

  const path = parsed.pathname.replace(/\/+$/, '');
  // pi appends `/v1/chat/completions`, so a baseUrl that already ends in `/v1`
  // would request `/v1/v1/chat/completions` and 404 at the first model turn.
  if (/\/v1$/.test(path)) throw new Error(`metered model: gatewayUrl must be the gateway root, not ${raw} (drop the /v1)`);
  return `${parsed.origin}${path}`;
}

export function meteredModelConfig(spec: MeteredModelSpec): ProviderModelConfig {
  if (!spec.id?.trim()) throw new Error('metered model: model id is required');
  return {
    id: spec.id,
    name: spec.name ?? spec.id,
    reasoning: spec.reasoning ?? false,
    input: spec.input ? [...spec.input] : ['text'],
    cost: spec.cost ?? { ...ZERO_COST },
    contextWindow: spec.contextWindow,
    maxTokens: spec.maxTokens
  };
}

/**
 * Build the pi provider config for the gateway.
 *
 * Identity headers are computed once here rather than per request: a run's
 * identity is fixed for its lifetime, and pi has no per-request header hook that
 * a provider config participates in.
 */
export function meteredProviderConfig(options: MeteredProviderOptions): ProviderConfig {
  if (options.models.length === 0) throw new Error('metered model: at least one model is required');

  const headers = { ...options.headers, ...buildIdentityHeaders(options.identity) };
  const config: ProviderConfig = {
    name: options.displayName ?? 'Constructive (metered)',
    baseUrl: normalizeGatewayUrl(options.gatewayUrl),
    api: GATEWAY_API,
    headers,
    models: options.models.map(meteredModelConfig)
  };
  // pi requires an apiKey when models are declared; the gateway authenticates by
  // identity headers, so a placeholder keeps its validation satisfied without
  // implying a real secret.
  config.apiKey = options.apiKey ?? headers.Authorization?.replace(/^Bearer /, '') ?? 'unused';
  return config;
}
