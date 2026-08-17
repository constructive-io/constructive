/**
 * The metered gateway as a resolved model endpoint.
 *
 * `agentic-server` speaks OpenAI's `/v1/chat/completions`, so routing a harness
 * through it needs no custom streaming code — only an endpoint whose `baseUrl` is
 * the gateway and whose headers carry the run's identity. Every harness worth
 * adapting can already talk to an OpenAI-compatible endpoint, which is why this
 * resolution is neutral and only the registration is vendor-specific: an adapter
 * turns `MeteredGateway` into whatever its harness calls a provider.
 */

import { buildIdentityHeaders, type MeteredIdentity } from './identity';

/** The api the gateway exposes. */
export const GATEWAY_API = 'openai-completions';

/** Default provider name; also the prefix a model picker shows. */
export const DEFAULT_PROVIDER_NAME = 'constructive-gateway';

/** Per-token cost, for client-side display only. */
export interface MeteredModelCost {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface MeteredModelSpec {
  /** Model id as the gateway routes it, e.g. `anthropic/claude-sonnet-4`. */
  id: string;
  name?: string;
  contextWindow: number;
  maxTokens: number;
  reasoning?: boolean;
  input?: ('text' | 'image')[];
  /**
   * Per-token cost for the host's own display. The gateway is the billing
   * authority, so zeros here mean "not priced client-side", never "free".
   */
  cost?: MeteredModelCost;
}

export interface MeteredGatewayOptions {
  /** Gateway root, e.g. `https://agentic.example.com` — not a `/v1` path. */
  gatewayUrl: string;
  identity: MeteredIdentity;
  models: readonly MeteredModelSpec[];
  /** Provider name to register under. Defaults to `constructive-gateway`. */
  providerName?: string;
  /** Display name in the host's UI. */
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

/** A gateway endpoint an adapter can register with its harness. */
export interface MeteredGateway {
  providerName: string;
  displayName: string;
  baseUrl: string;
  api: typeof GATEWAY_API;
  headers: Record<string, string>;
  apiKey: string;
  models: readonly MeteredModel[];
}

/** A model as the gateway serves it, with every default resolved. */
export interface MeteredModel {
  id: string;
  name: string;
  reasoning: boolean;
  input: ('text' | 'image')[];
  cost: MeteredModelCost;
  contextWindow: number;
  maxTokens: number;
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
  // An OpenAI-compatible client appends `/v1/chat/completions`, so a baseUrl that
  // already ends in `/v1` would request `/v1/v1/chat/completions` and 404 at the
  // first model turn.
  if (/\/v1$/.test(path)) throw new Error(`metered model: gatewayUrl must be the gateway root, not ${raw} (drop the /v1)`);
  return `${parsed.origin}${path}`;
}

export function resolveMeteredModel(spec: MeteredModelSpec): MeteredModel {
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
 * Resolve the gateway endpoint for a run.
 *
 * Identity headers are computed once here rather than per request: a run's
 * identity is fixed for its lifetime, and harnesses generally expose no
 * per-request header hook a provider registration participates in.
 */
export function resolveMeteredGateway(options: MeteredGatewayOptions): MeteredGateway {
  if (options.models.length === 0) throw new Error('metered model: at least one model is required');

  const headers = { ...options.headers, ...buildIdentityHeaders(options.identity) };
  return {
    providerName: options.providerName ?? DEFAULT_PROVIDER_NAME,
    displayName: options.displayName ?? 'Constructive (metered)',
    baseUrl: normalizeGatewayUrl(options.gatewayUrl),
    api: GATEWAY_API,
    headers,
    // Harnesses typically require an apiKey once models are declared; the gateway
    // authenticates by identity headers, so a placeholder satisfies that
    // validation without implying a real secret.
    apiKey: options.apiKey ?? headers.Authorization?.replace(/^Bearer /, '') ?? 'unused',
    models: options.models.map(resolveMeteredModel)
  };
}
