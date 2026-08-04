import { ConfigStore } from 'appstash';

export interface BackendConfig {
  apiEndpoint: string;
  authEndpoint: string;
  modulesEndpoint: string;
}

export const BACKEND_PRESETS: Record<string, BackendConfig> = {
  localnet: {
    apiEndpoint: 'http://api.localhost:3000/graphql',
    authEndpoint: 'http://auth.localhost:3000/graphql',
    modulesEndpoint: 'http://modules.localhost:3000/graphql'
  },
  devnet: {
    apiEndpoint: 'https://api.launchql.dev/graphql',
    authEndpoint: 'https://auth.launchql.dev/graphql',
    modulesEndpoint: 'https://modules.launchql.dev/graphql'
  }
};

/** Context name used for endpoints that match no preset. */
export const CUSTOM_CONTEXT = 'custom';

/**
 * A chosen backend is a named context in the shared store: the preset name when
 * the endpoints match one, `custom` otherwise. Credentials hang off the context,
 * so signing in against localnet and devnet keeps two independent sessions.
 */
export function contextNameFor(config: BackendConfig): string {
  for (const [name, preset] of Object.entries(BACKEND_PRESETS)) {
    if (
      preset.apiEndpoint === config.apiEndpoint &&
      preset.authEndpoint === config.authEndpoint &&
      preset.modulesEndpoint === config.modulesEndpoint
    ) {
      return name;
    }
  }
  return CUSTOM_CONTEXT;
}

function toBackendConfig(targets: Record<string, { endpoint: string }> | undefined): BackendConfig | null {
  const apiEndpoint = targets?.api?.endpoint;
  const authEndpoint = targets?.auth?.endpoint;
  const modulesEndpoint = targets?.modules?.endpoint;
  if (!apiEndpoint || !authEndpoint || !modulesEndpoint) return null;
  return { apiEndpoint, authEndpoint, modulesEndpoint };
}

/** Endpoints of the active context, or null when no backend has been chosen. */
export function loadBackendConfig(store: ConfigStore): BackendConfig | null {
  const ctx = store.getCurrentContext();
  if (!ctx) return null;
  return toBackendConfig(ctx.targets);
}

/** Persist the endpoints as a context and make it active. */
export function saveBackendConfig(store: ConfigStore, config: BackendConfig): string {
  const name = contextNameFor(config);
  store.createContext(name, {
    endpoint: config.apiEndpoint,
    targets: {
      api: { endpoint: config.apiEndpoint },
      auth: { endpoint: config.authEndpoint },
      modules: { endpoint: config.modulesEndpoint }
    }
  });
  store.setCurrentContext(name);
  return name;
}
