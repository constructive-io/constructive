import { providerName } from './transforms';
import type { AgenticServerOptions, ProviderConfig, ResolvedProvider } from './types';

/**
 * Open-weights families Ollama serves. `gpt-oss` is listed because the
 * `gpt` prefix would otherwise read as OpenAI's hosted models.
 */
const OLLAMA_MODEL_PREFIXES = ['gpt-oss', 'llama', 'mistral', 'gemma', 'nomic', 'qwen', 'glm'];

const startsWithAny = (model: string, prefixes: readonly string[]): boolean =>
  prefixes.some((prefix) => model.startsWith(prefix));

/**
 * The entry a request addresses: by registry name first, so two providers of
 * one dialect are both reachable, then by dialect for an entry with no name of
 * its own.
 */
const findNamed = (providers: ProviderConfig[], name: string): ProviderConfig | undefined =>
  providers.find((p) => providerName(p) === name) ?? providers.find((p) => p.type === name);

/**
 * Resolve which provider to use for a given request.
 * Priority: explicit provider header → `name/model` prefix → known model
 * families → the first configured provider.
 */
export function resolveProvider(
  options: AgenticServerOptions,
  requestModel?: string,
  requestProvider?: string
): ResolvedProvider {
  const providers = options.providers || [];

  if (providers.length > 0) {
    if (requestProvider) {
      const match = findNamed(providers, requestProvider);
      if (match) return match;
    }

    // Route by model prefix: "anthropic/claude-3" → the provider named anthropic
    if (requestModel && requestModel.includes('/')) {
      const [prefix, ...rest] = requestModel.split('/');
      const match = findNamed(providers, prefix);
      if (match) {
        return { ...match, defaultModel: rest.join('/') };
      }
    }

    // Route by known model families
    if (requestModel) {
      if (requestModel.startsWith('claude')) {
        const match = providers.find((p) => p.type === 'anthropic');
        if (match) return match;
      }
      if (startsWithAny(requestModel, OLLAMA_MODEL_PREFIXES)) {
        const match = providers.find((p) => p.type === 'ollama');
        if (match) return match;
      }
      if (requestModel.startsWith('gpt') || requestModel.startsWith('o1') || requestModel.startsWith('o3')) {
        const match = providers.find((p) => p.type === 'openai');
        if (match) return match;
      }
    }

    return providers[0];
  }

  // Single-provider mode (default: ollama for local dev)
  return {
    type: options.providerType || 'ollama',
    baseUrl: options.providerBaseUrl || 'http://localhost:11434',
    apiKey: options.providerApiKey,
    defaultModel: options.defaultModel
  };
}

export function resolveUpstreamUrl(provider: ResolvedProvider, path: string): string {
  if (provider.type === 'ollama') {
    if (path === '/v1/chat/completions') return `${provider.baseUrl}/api/chat`;
    if (path === '/v1/embeddings') return `${provider.baseUrl}/api/embed`;
  }
  if (provider.type === 'anthropic') {
    if (path === '/v1/chat/completions') return `${provider.baseUrl}/v1/messages`;
  }
  return `${provider.baseUrl}${path}`;
}

export function buildProviderHeaders(provider: ResolvedProvider): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.apiKey) {
    if (provider.type === 'anthropic') {
      headers['x-api-key'] = provider.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }
  }
  return headers;
}
