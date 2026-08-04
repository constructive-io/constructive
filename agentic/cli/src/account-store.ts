import { ConfigStore } from 'appstash';

import { BACKEND_PRESETS, saveBackendConfig } from './backend-store';

export interface AccountSession {
  userId: string;
  email: string;
  accessToken: string;
  accessTokenExpiresAt?: string;
  apiKey?: string;
  keyId?: string;
  apiKeyExpiresAt?: string;
  signedInAt: number;
}

/**
 * Sessions live in the shared Constructive stash, as the credentials of the
 * active context (the chosen backend). The store owns the file layout, the
 * atomic 0600 writes and the at-rest encoding; this module only maps between
 * its `ContextCredentials` and the session shape the CLI passes around.
 */
function currentContextName(store: ConfigStore): string | null {
  return store.getCurrentContext()?.name ?? null;
}

/** The active context, defaulting to localnet the first time one is needed. */
function ensureContextName(store: ConfigStore): string {
  return currentContextName(store) ?? saveBackendConfig(store, BACKEND_PRESETS.localnet);
}

export function loadSession(store: ConfigStore, context?: string): AccountSession | null {
  const contextName = context ?? currentContextName(store);
  if (!contextName) return null;
  const creds = store.getCredentials(contextName);
  if (!creds?.token || !creds.userId) return null;
  return {
    userId: creds.userId,
    email: creds.email ?? '',
    accessToken: creds.token,
    accessTokenExpiresAt: creds.expiresAt,
    apiKey: creds.apiKey,
    keyId: creds.keyId,
    apiKeyExpiresAt: creds.apiKeyExpiresAt,
    signedInAt: creds.signedInAt ?? 0
  };
}

/**
 * `context` names the backend the session belongs to; it does not have to exist
 * as a context yet, so a sign-in can be filed before the backend is committed
 * and a failed sign-in leaves nothing behind.
 */
export function saveSession(store: ConfigStore, session: AccountSession, context?: string): void {
  store.setCredentials(context ?? ensureContextName(store), {
    token: session.accessToken,
    expiresAt: session.accessTokenExpiresAt,
    userId: session.userId,
    email: session.email,
    apiKey: session.apiKey,
    keyId: session.keyId,
    apiKeyExpiresAt: session.apiKeyExpiresAt,
    signedInAt: session.signedInAt
  });
}

export function clearSession(store: ConfigStore, context?: string): void {
  const contextName = context ?? currentContextName(store);
  if (contextName) store.removeCredentials(contextName);
}
