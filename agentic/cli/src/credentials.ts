import { loadSession } from './account-store';
import { backendFromApiEndpoint, loadBackendConfig } from './backend-store';
import { loadConfig } from './config';

export type ResolvedAccount = {
  userId: string;
  accessToken: string;
  apiKey?: string;
};

export type ResolvedBackendConfig = {
  apiEndpoint: string;
  modulesEndpoint: string;
  agentEndpoint: string;
  computeEndpoint: string;
};

// Both resolvers run on every tool call and re-read the store, so a login or
// logout mid-session is picked up without a restart. CONSTRUCTIVE_* env vars
// win over the store (the CI/headless path); tokens never enter process.env
// from here.
export function resolveAccount(): ResolvedAccount | null {
  const userId = process.env.CONSTRUCTIVE_USER_ID;
  const accessToken = process.env.CONSTRUCTIVE_ACCESS_TOKEN;
  if (userId && accessToken) {
    return { userId, accessToken, apiKey: process.env.CONSTRUCTIVE_API_KEY };
  }
  const session = loadSession(loadConfig(process.env.AGENT_HOME).store);
  if (!session) return null;
  return { userId: session.userId, accessToken: session.accessToken, apiKey: session.apiKey };
}

// CONSTRUCTIVE_API_ENDPOINT picks the whole backend: the other planes derive
// from it unless their own CONSTRUCTIVE_*_ENDPOINT is set. A plane override
// without an api endpoint names no backend, so it is an error, never a partial
// config the tools would complete with a guess.
export function resolveBackendConfig(): ResolvedBackendConfig | undefined {
  const env = process.env;
  const overrides = {
    modulesEndpoint: env.CONSTRUCTIVE_MODULES_ENDPOINT,
    agentEndpoint: env.CONSTRUCTIVE_AGENT_ENDPOINT,
    computeEndpoint: env.CONSTRUCTIVE_COMPUTE_ENDPOINT
  };
  const backend = env.CONSTRUCTIVE_API_ENDPOINT
    ? backendFromApiEndpoint(env.CONSTRUCTIVE_API_ENDPOINT)
    : loadBackendConfig(loadConfig(env.AGENT_HOME).store);
  if (!backend) {
    const stray = Object.entries(overrides).find(([, value]) => value);
    if (stray) throw new Error('CONSTRUCTIVE_API_ENDPOINT is required when any CONSTRUCTIVE_*_ENDPOINT override is set.');
    return undefined;
  }
  return {
    apiEndpoint: backend.apiEndpoint,
    modulesEndpoint: overrides.modulesEndpoint || backend.modulesEndpoint,
    agentEndpoint: overrides.agentEndpoint || backend.agentEndpoint,
    computeEndpoint: overrides.computeEndpoint || backend.computeEndpoint
  };
}
