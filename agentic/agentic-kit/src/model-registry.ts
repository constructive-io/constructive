import type { ModelDescriptor } from '@agentic-kit/protocol';

const modelsByProvider = new Map<string, Map<string, ModelDescriptor>>();

export function registerModel(model: ModelDescriptor): void {
  const providerModels = modelsByProvider.get(model.provider) ?? new Map<string, ModelDescriptor>();
  providerModels.set(model.id, model);
  modelsByProvider.set(model.provider, providerModels);
}

export function registerModels(models: ModelDescriptor[]): void {
  for (const model of models) {
    registerModel(model);
  }
}

export function getModel(provider: string, modelId: string): ModelDescriptor | undefined {
  return modelsByProvider.get(provider)?.get(modelId);
}

export function getModels(provider?: string): ModelDescriptor[] {
  if (provider) {
    return Array.from(modelsByProvider.get(provider)?.values() ?? []);
  }

  return Array.from(modelsByProvider.values()).flatMap((entries) => Array.from(entries.values()));
}

export function getProviders(): string[] {
  return Array.from(modelsByProvider.keys());
}

export function clearModels(): void {
  modelsByProvider.clear();
}
