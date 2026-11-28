import { appstash, ConfigStore, createConfigStore } from 'appstash';

import type { BackendConfig } from './backend-store';

/**
 * Directory identity shared by every Constructive binary and the desktop app,
 * so a sign-in through one is a sign-in through all of them.
 */
export const STASH_NAME = 'constructive';

/** Base directory of the stash, for tests and isolated runs. Desktop reads the same variable. */
export const STASH_DIR_ENV = 'CONSTRUCTIVE_STASH_DIR';

/** An empty value is an error: treating it as unset would open the real store under the home directory. */
export function stashBaseDir(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const dir = env[STASH_DIR_ENV];
  if (dir === '') {
    throw new Error(`${STASH_DIR_ENV} is set but empty, so it names no directory. Set it to a directory, or unset it to use the store under the home directory.`);
  }
  return dir;
}

const STORE_DIRS = new WeakMap<ConfigStore, { config: string; cache: string }>();

export function openStore(baseDir: string | undefined = stashBaseDir()): ConfigStore {
  const store = createConfigStore(STASH_NAME, { stashName: STASH_NAME, baseDir });
  const { config, cache } = appstash(STASH_NAME, { baseDir });
  STORE_DIRS.set(store, { config, cache });
  return store;
}

/**
 * The directories of a store `openStore` opened: `config` holds files beside
 * the credentials, `cache` files that may be deleted at any time.
 */
export function storeDirs(store: ConfigStore): { config: string; cache: string } {
  const dirs = STORE_DIRS.get(store);
  if (!dirs) throw new Error('This store was not opened with openStore, so its directory is unknown. Open it with openStore().');
  return dirs;
}

/**
 * Every directory the store `openStore` opens uses (root, config, cache, data,
 * logs, tmp), from the same appstash resolution, so a caller can refuse a path
 * inside the store. Creates nothing.
 */
export function stashDirectories(env: NodeJS.ProcessEnv = process.env): string[] {
  const dirs = appstash(STASH_NAME, { baseDir: stashBaseDir(env) });
  return [...new Set([dirs.root, dirs.config, dirs.cache, dirs.data, dirs.logs, dirs.tmp])];
}

const CONTEXT_NAME = /^[a-z0-9][a-z0-9._-]{0,99}$/;

/** A context name that cannot name a file in the store's contexts directory. */
export class ContextNameError extends Error {
  constructor(readonly value: string) {
    super(
      `"${value.length > 120 ? `${value.slice(0, 120)}…` : value}" is not a valid context name. ` +
        'A context name has 1 to 100 characters: lower-case letters, digits, ".", "-" and "_", starting with a letter or a digit, with no "..".'
    );
    this.name = 'ContextNameError';
  }
}

/**
 * A context name is the stem of a file in the store, so it is checked before
 * any read or write: no separator, no `..`, no leading dot, and lower case
 * only, so two names never reach one file on a disk that ignores letter case.
 */
export function checkContextName(name: string): string {
  if (typeof name !== 'string' || !CONTEXT_NAME.test(name) || name.includes('..')) throw new ContextNameError(String(name));
  return name;
}

export interface AccountSession {
  userId: string;
  email: string;
  accessToken: string;
  accessTokenExpiresAt?: string;
  apiKey?: string;
  keyId?: string;
  apiKeyExpiresAt?: string;
  signedInAt: number;
  /** The whole backend the session was issued for. Absent for a session stored before it was recorded, or by another app. */
  issuedFor?: BackendConfig;
  /** The auth endpoint that issued the session, the field Desktop reads and writes. Written from `issuedFor` when it is known. */
  authEndpoint?: string;
}

const BACKEND_KEYS = ['apiEndpoint', 'authEndpoint', 'modulesEndpoint', 'agentEndpoint', 'computeEndpoint'] as const;

/** `value` as a complete backend, or undefined when it lacks an endpoint. */
export function issuedForOf(value: unknown): BackendConfig | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (!BACKEND_KEYS.every((key) => typeof record[key] === 'string' && record[key] !== '')) return undefined;
  return Object.fromEntries(BACKEND_KEYS.map((key) => [key, record[key]])) as unknown as BackendConfig;
}

type StoredCredentials = Parameters<ConfigStore['setCredentials']>[1] & { authEndpoint?: string; issuedFor?: BackendConfig };

/**
 * Sessions live in the shared Constructive stash, as the credentials of a
 * backend context. The store owns the file layout, the atomic 0600 writes and
 * the at-rest encoding; this module only maps between its `ContextCredentials`
 * and the session shape callers pass around.
 */
export function currentContextName(store: ConfigStore): string | null {
  const name = store.loadSettings().currentContext;
  if (!name) return null;
  return store.loadContext(checkContextName(name)) ? name : null;
}

/** The active context; a session is never filed under a backend nobody chose. */
function ensureContextName(store: ConfigStore): string {
  const name = currentContextName(store);
  if (!name) throw new Error('No backend chosen: select a backend before saving a session.');
  return name;
}

export function loadSession(store: ConfigStore, context?: string): AccountSession | null {
  const contextName = context === undefined ? currentContextName(store) : checkContextName(context);
  if (!contextName) return null;
  const creds = store.getCredentials(contextName) as StoredCredentials | null;
  if (!creds?.token || !creds.userId) return null;
  return {
    userId: creds.userId,
    email: creds.email ?? '',
    accessToken: creds.token,
    accessTokenExpiresAt: creds.expiresAt,
    apiKey: creds.apiKey,
    keyId: creds.keyId,
    apiKeyExpiresAt: creds.apiKeyExpiresAt,
    signedInAt: creds.signedInAt ?? 0,
    ...(issuedForOf(creds.issuedFor) ? { issuedFor: issuedForOf(creds.issuedFor) } : {}),
    ...(typeof creds.authEndpoint === 'string' && creds.authEndpoint ? { authEndpoint: creds.authEndpoint } : {})
  };
}

/**
 * `context` names the backend the session belongs to; it does not have to exist
 * as a context yet, so a sign-in can be filed before the backend is committed
 * and a failed sign-in leaves nothing behind.
 */
export function saveSession(store: ConfigStore, session: AccountSession, context?: string): void {
  const credentials: StoredCredentials = {
    token: session.accessToken,
    expiresAt: session.accessTokenExpiresAt,
    userId: session.userId,
    email: session.email,
    apiKey: session.apiKey,
    keyId: session.keyId,
    apiKeyExpiresAt: session.apiKeyExpiresAt,
    signedInAt: session.signedInAt,
    ...(session.issuedFor ? { issuedFor: session.issuedFor } : {}),
    ...(session.issuedFor || session.authEndpoint ? { authEndpoint: session.issuedFor?.authEndpoint ?? session.authEndpoint } : {})
  };
  store.setCredentials(context === undefined ? ensureContextName(store) : checkContextName(context), credentials);
}

export function clearSession(store: ConfigStore, context?: string): void {
  const contextName = context === undefined ? currentContextName(store) : checkContextName(context);
  if (contextName) store.removeCredentials(contextName);
}
