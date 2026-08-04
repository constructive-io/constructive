import { auth } from '@constructive-io/sdk';
import { ConfigStore } from 'appstash';

import { AccountSession, clearSession, loadSession, saveSession } from './account-store';
import {
  API_KEY_YEARS,
  buildCreateApiKeyInput,
  classifyApiKeyError,
  MintedApiKey,
  needsRemint,
  parseMintedKey,
  remintApiKey
} from './api-key';
import { describeAuthError, withAuthTimeout } from './auth-error';

type AuthClient = ReturnType<typeof auth.createClient>;

interface AuthRecord {
  userId?: string;
  accessToken?: string;
  accessTokenExpiresAt?: string;
}

export type ApiKeyRefreshStatus = 'ok' | 'reminted' | 'reauth-required' | 'unavailable' | 'signed-out';

const SELECT = {
  result: {
    select: { userId: true, accessToken: true, accessTokenExpiresAt: true }
  }
} as const;

const CREATE_KEY_SELECT = {
  result: { select: { apiKey: true, keyId: true, expiresAt: true } }
} as const;

const REVOKE_KEY_SELECT = { result: true } as const;

function authedClient(endpoint: string, bearer: string): AuthClient {
  return auth.createClient({
    endpoint,
    headers: { Authorization: `Bearer ${bearer}` }
  });
}

async function mint(client: AuthClient): Promise<MintedApiKey> {
  const data = (await client.mutation
    .createApiKey({ input: buildCreateApiKeyInput({ years: API_KEY_YEARS }) }, { select: CREATE_KEY_SELECT })
    .unwrap()) as { createApiKey?: { result?: MintedApiKey & { expiresAt?: string } } } | undefined;
  return parseMintedKey(data?.createApiKey?.result);
}

async function revoke(client: AuthClient, keyId: string): Promise<void> {
  await client.mutation.revokeApiKey({ input: { keyId } }, { select: REVOKE_KEY_SELECT }).unwrap();
}

/**
 * Ensure the stored session carries a usable, not-about-to-expire API key.
 * Never throws: returns a status the caller can surface. A mint/re-mint needs
 * the fresh-password step-up window, so it succeeds right after a sign-in and
 * degrades to 'reauth-required' when attempted cold.
 */
export async function refreshApiKeyIfNeeded({
  store,
  context,
  authEndpoint
}: {
  store: ConfigStore;
  /** Backend context the session is filed under; defaults to the active one. */
  context?: string;
  authEndpoint: string;
}): Promise<ApiKeyRefreshStatus> {
  const session = loadSession(store, context);
  if (!session) return 'signed-out';
  const hasKey = !!session.apiKey;
  const due = needsRemint({
    apiKeyExpiresAt: session.apiKeyExpiresAt,
    now: Date.now()
  });
  if (hasKey && !due) return 'ok';

  const client = authedClient(authEndpoint, session.accessToken);
  try {
    const minted = await remintApiKey({
      currentKeyId: session.keyId,
      revoke: (keyId) => revoke(client, keyId),
      mint: () => mint(client)
    });
    saveSession(
      store,
      {
        ...session,
        apiKey: minted.apiKey,
        keyId: minted.keyId,
        apiKeyExpiresAt: minted.apiKeyExpiresAt
      },
      context
    );
    return 'reminted';
  } catch (err) {
    const kind = classifyApiKeyError(err);
    if (kind === 'step-up-required' || kind === 'not-authenticated') return 'reauth-required';
    console.warn(`[agent] API key refresh failed (${kind}): ${describeAuthError(err, authEndpoint)}`);
    return 'unavailable';
  }
}

export async function signIn({
  store,
  context,
  authEndpoint,
  email,
  password
}: {
  store: ConfigStore;
  context?: string;
  authEndpoint: string;
  email: string;
  password: string;
}): Promise<AccountSession> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) throw new Error('Email and password are required.');

  const client = auth.createClient({ endpoint: authEndpoint });
  const request = client.mutation
    .signIn({ input: { email: trimmedEmail, password } }, { select: SELECT })
    .unwrap();

  let data: { signIn?: { result?: AuthRecord } } | undefined;
  try {
    data = (await withAuthTimeout(request, authEndpoint)) as { signIn?: { result?: AuthRecord } } | undefined;
  } catch (err) {
    throw new Error(describeAuthError(err, authEndpoint));
  }

  const record = data?.signIn?.result;
  if (!record?.accessToken || !record.userId) {
    throw new Error('Authentication returned no access token (MFA may be required).');
  }

  saveSession(
    store,
    {
      userId: record.userId,
      email: trimmedEmail,
      accessToken: record.accessToken,
      ...(record.accessTokenExpiresAt ? { accessTokenExpiresAt: record.accessTokenExpiresAt } : {}),
      signedInAt: Date.now()
    },
    context
  );
  // Mint the long-lived API key inside the fresh step-up window. Best-effort: a
  // mint failure leaves a valid signed-in session that lacks a key until re-auth.
  await refreshApiKeyIfNeeded({ store, context, authEndpoint });
  return loadSession(store, context);
}

export async function signOut({
  store,
  context,
  authEndpoint
}: {
  store: ConfigStore;
  /** Backend context the session is filed under; defaults to the active one. */
  context?: string;
  authEndpoint: string;
}): Promise<boolean> {
  const session = loadSession(store, context);
  if (!session) return false;
  if (session.keyId) {
    try {
      await revoke(authedClient(authEndpoint, session.accessToken), session.keyId);
    } catch (err) {
      console.warn(`[agent] API key revoke on sign-out failed: ${describeAuthError(err, authEndpoint)}`);
    }
  }
  clearSession(store, context);
  return true;
}
