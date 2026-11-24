import { deriveSubdomainEndpoint } from '@agentic-kit/pi';
import { ConfigStore } from 'appstash';

/** Every Constructive plane the agent talks to, one GraphQL endpoint each. */
export interface BackendConfig {
  apiEndpoint: string;
  authEndpoint: string;
  modulesEndpoint: string;
  agentEndpoint: string;
  computeEndpoint: string;
}

const PLANES = ['api', 'auth', 'modules', 'agent', 'compute'] as const;
type Plane = (typeof PLANES)[number];
const KEY: Record<Plane, keyof BackendConfig> = {
  api: 'apiEndpoint',
  auth: 'authEndpoint',
  modules: 'modulesEndpoint',
  agent: 'agentEndpoint',
  compute: 'computeEndpoint'
};

/**
 * The CLI ships no backend URLs: the user names the api endpoint, and the other
 * planes share its host scheme (api.<apex> -> auth.<apex>, modules.<apex>, ...).
 * Throws on anything that is not an absolute URL.
 */
export function backendFromApiEndpoint(apiEndpoint: string): BackendConfig {
  const api = apiEndpoint.trim();
  const config = { apiEndpoint: api } as BackendConfig;
  for (const plane of PLANES) {
    if (plane === 'api') continue;
    const endpoint = api ? deriveSubdomainEndpoint(api, plane) : '';
    if (!endpoint) throw new Error(`Invalid API endpoint URL: ${api || '(empty)'}`);
    config[KEY[plane]] = endpoint;
  }
  return config;
}

/**
 * A chosen backend is a named context in the shared store, named after the api
 * endpoint's apex (https://api.example.com/graphql -> example.com). Credentials
 * hang off the context, so each backend keeps an independent session.
 */
export function contextNameFor(config: BackendConfig): string {
  const { host } = new URL(config.apiEndpoint);
  const apex = host.includes('.') ? host.slice(host.indexOf('.') + 1) : host;
  return apex.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
}

function toBackendConfig(targets: Record<string, { endpoint: string }> | undefined): BackendConfig | null {
  const config = {} as BackendConfig;
  for (const plane of PLANES) {
    const endpoint = targets?.[plane]?.endpoint;
    if (!endpoint) return null;
    config[KEY[plane]] = endpoint;
  }
  return config;
}

/**
 * Endpoints of the active context, or null when no backend has been chosen or
 * the context lacks a plane: callers must fail then, never pick a default.
 */
export function loadBackendConfig(store: ConfigStore): BackendConfig | null {
  const ctx = store.getCurrentContext();
  if (!ctx) return null;
  return toBackendConfig(ctx.targets);
}

/** Persist the endpoints as a context and make it active. */
export function saveBackendConfig(store: ConfigStore, config: BackendConfig): string {
  const name = contextNameFor(config);
  const targets = Object.fromEntries(PLANES.map((plane) => [plane, { endpoint: config[KEY[plane]] }]));
  store.createContext(name, { endpoint: config.apiEndpoint, targets });
  store.setCurrentContext(name);
  return name;
}
