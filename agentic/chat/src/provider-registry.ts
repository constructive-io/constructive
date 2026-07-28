import type { ProviderAdapter } from '@agentic-kit/protocol';

type RegisteredProvider = {
  adapter: ProviderAdapter;
  sourceId?: string;
};

const providersByApi = new Map<string, RegisteredProvider>();

export function registerProvider(adapter: ProviderAdapter, sourceId?: string): void {
  providersByApi.set(adapter.api, { adapter, sourceId });
}

export function getProvider(api: string): ProviderAdapter | undefined {
  return providersByApi.get(api)?.adapter;
}

export function getProviders(): ProviderAdapter[] {
  return Array.from(providersByApi.values(), (entry) => entry.adapter);
}

export function unregisterProviders(sourceId: string): void {
  for (const [api, entry] of providersByApi.entries()) {
    if (entry.sourceId === sourceId) {
      providersByApi.delete(api);
    }
  }
}

export function clearProviders(): void {
  providersByApi.clear();
}
