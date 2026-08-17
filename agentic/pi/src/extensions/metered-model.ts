/**
 * The pi side of the metering lane: register the resolved gateway as a pi
 * provider, optionally as the session's model.
 *
 * Every model call then leaves the process through `agentic-server`, which is the
 * billing authority, so usage cannot be under-reported by the agent. The
 * endpoint itself is resolved by `@agentic-kit/metering`; only the registration
 * shape below is pi's. The self-reporting lane (own provider keys) is
 * `./usage-report`.
 */

import {
  DEFAULT_PROVIDER_NAME,
  type MeteredGateway,
  type MeteredGatewayOptions,
  resolveMeteredGateway
} from '@agentic-kit/metering';
import type { ExtensionAPI, ExtensionFactory, ProviderConfig } from '@earendil-works/pi-coding-agent';

export interface MeteredModelExtensionOptions extends MeteredGatewayOptions {
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
  /** The neutral endpoint the config was built from. */
  gateway: MeteredGateway;
  providerName: string;
  /** Model id pi selects on session start, if any. */
  selectedModel: string | undefined;
}

/** Shape a resolved gateway as pi's provider registration. */
export function piProviderConfig(gateway: MeteredGateway): ProviderConfig {
  return {
    name: gateway.displayName,
    baseUrl: gateway.baseUrl,
    api: gateway.api,
    headers: gateway.headers,
    apiKey: gateway.apiKey,
    models: gateway.models.map((model) => ({ ...model }))
  };
}

export function createMeteredModelExtension(options: MeteredModelExtensionOptions): MeteredModelExtension {
  const providerName = options.providerName ?? DEFAULT_PROVIDER_NAME;
  const gateway = resolveMeteredGateway(options);
  const config = piProviderConfig(gateway);

  const modelId = options.selectModel === false ? undefined : (options.selectModel ?? options.models[0].id);
  if (modelId !== undefined && !options.models.some((model) => model.id === modelId)) {
    // Selecting an unregistered id silently leaves pi on an unmetered model,
    // which is the one failure this lane exists to prevent.
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

  return { extension, config, gateway, providerName, selectedModel: modelId };
}
