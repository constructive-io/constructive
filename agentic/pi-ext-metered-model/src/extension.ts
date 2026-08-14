/**
 * The pi extension: register the gateway as a provider, optionally as the
 * session's model.
 *
 * This is the cloud metering lane — every model call leaves the process through
 * `agentic-server`, which is the billing authority, so usage cannot be
 * under-reported by the agent. The local lane (own provider keys, self-reported
 * usage) is `@agentic-kit/pi-ext-usage-report`.
 */

import type { ExtensionAPI, ExtensionFactory, ProviderConfig } from '@earendil-works/pi-coding-agent';

import { DEFAULT_PROVIDER_NAME, meteredProviderConfig,type MeteredProviderOptions } from './provider';

export interface MeteredModelExtensionOptions extends MeteredProviderOptions {
  /**
   * Model id to select once registered. Defaults to the first model; pass `false`
   * to leave the host's model choice alone.
   */
  selectModel?: string | false;
}

export interface MeteredModelExtension {
  extension: ExtensionFactory;
  /** The config handed to pi — asserted in tests, useful for host logging. */
  config: ProviderConfig;
  providerName: string;
  /** Model id pi selects on session start, if any. */
  selectedModel: string | undefined;
}

export function createMeteredModelExtension(options: MeteredModelExtensionOptions): MeteredModelExtension {
  const providerName = options.providerName ?? DEFAULT_PROVIDER_NAME;
  const config = meteredProviderConfig(options);

  const modelId = options.selectModel === false ? undefined : (options.selectModel ?? options.models[0].id);
  if (modelId !== undefined && !options.models.some((model) => model.id === modelId)) {
    // Selecting an unregistered id silently leaves pi on an unmetered model,
    // which is the one failure this package exists to prevent.
    throw new Error(`metered model: selectModel "${modelId}" is not one of the registered models`);
  }

  const extension: ExtensionFactory = (pi: ExtensionAPI) => {
    pi.registerProvider(providerName, config);
    if (modelId === undefined) return;

    // `pi.setModel` takes a resolved model, and the registry that resolves it
    // lives on the context — which an extension only gets on an event.
    // `session_start` is the first, and fires before the first turn.
    pi.on('session_start', async (_event, ctx) => {
      const model = ctx.modelRegistry.find(providerName, modelId);
      if (!model) throw new Error(`metered model: provider "${providerName}" has no model "${modelId}" after registration`);
      const ok = await pi.setModel(model);
      if (!ok) throw new Error(`metered model: pi refused model "${providerName}/${modelId}" (no usable credentials for the gateway)`);
    });
  };

  return { extension, config, providerName, selectedModel: modelId };
}
