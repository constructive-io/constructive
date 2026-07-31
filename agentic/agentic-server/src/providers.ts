import type { AgenticServerOptions, ResolvedProvider } from './types';

/**
 * Resolve which provider to use for a given request.
 * Priority: model-based routing → explicit provider header → default.
 */
export function resolveProvider(
  options: AgenticServerOptions,
  requestModel?: string,
  requestProvider?: string
): ResolvedProvider {
  const providers = options.providers || [];

  if (providers.length > 0) {
    if (requestProvider) {
      const match = providers.find((p) => p.type === requestProvider);
      if (match) return match;
    }

    // Route by model prefix: "anthropic/claude-3" → anthropic provider
    if (requestModel && requestModel.includes('/')) {
      const prefix = requestModel.split('/')[0];
      const match = providers.find((p) => p.type === prefix);
      if (match) {
        return { ...match, defaultModel: requestModel.split('/').slice(1).join('/') };
      }
    }

    // Route by known model patterns
    if (requestModel) {
      if (requestModel.startsWith('claude')) {
        const match = providers.find((p) => p.type === 'anthropic');
        if (match) return match;
      }
      if (requestModel.startsWith('gpt') || requestModel.startsWith('o1') || requestModel.startsWith('o3')) {
        const match = providers.find((p) => p.type === 'openai');
        if (match) return match;
      }
      if (
        requestModel.startsWith('llama') ||
        requestModel.startsWith('mistral') ||
        requestModel.startsWith('gemma') ||
        requestModel.startsWith('nomic')
      ) {
        const match = providers.find((p) => p.type === 'ollama');
        if (match) return match;
      }
    }

    return providers[0];
  }

  // Legacy single-provider mode (default: ollama for local dev)
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
