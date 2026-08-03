import { loadSession } from './account-store';
import { loadBackendConfig } from './backend-store';
import { loadConfig } from './config';

export type ResolvedAccount = {
  userId: string;
  accessToken: string;
  apiKey?: string;
};

export type ResolvedBackendConfig = {
  apiEndpoint?: string;
  modulesEndpoint?: string;
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
  const session = loadSession(loadConfig(process.env.AGENT_HOME).accountFile);
  if (!session) return null;
  return { userId: session.userId, accessToken: session.accessToken, apiKey: session.apiKey };
}

export function resolveBackendConfig(): ResolvedBackendConfig | undefined {
  const apiEndpoint = process.env.CONSTRUCTIVE_API_ENDPOINT;
  const modulesEndpoint = process.env.CONSTRUCTIVE_MODULES_ENDPOINT;
  if (apiEndpoint || modulesEndpoint) return { apiEndpoint, modulesEndpoint };
  const stored = loadBackendConfig(loadConfig(process.env.AGENT_HOME).backendFile);
  if (!stored) return undefined;
  return { apiEndpoint: stored.apiEndpoint, modulesEndpoint: stored.modulesEndpoint };
}
