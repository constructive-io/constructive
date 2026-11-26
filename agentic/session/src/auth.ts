import { auth } from '@constructive-io/sdk';
import { ConfigStore } from 'appstash';

import { AccountSession, clearSession, loadSession, saveSession } from './account-store';
import { API_KEY_DAYS, buildCreateApiKeyInput, KeyRevocation, MintedApiKey, parseMintedKey, PreviousKey, remintApiKey, revokeKey } from './api-key';
import { describeAuthError, errorCodes, isNetworkError, SignInError, signInFailure, trackedFetch, withAuthTimeout } from './auth-error';
import { addBackend, BackendConfig, contextNameFor, selectBackend } from './backend-store';
import { type Session, sessionProblem } from './session';

type AuthClient = ReturnType<typeof auth.createClient>;

interface AuthRecord {
  userId?: string | null;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  mfaRequired?: boolean | null;
}

const SELECT = {
  result: {
    select: { userId: true, accessToken: true, accessTokenExpiresAt: true, mfaRequired: true }
  }
} as const;

const CREATE_KEY_SELECT = {
  result: { select: { apiKey: true, keyId: true, expiresAt: true } }
} as const;

const REVOKE_KEY_SELECT = { result: true } as const;

const NO_ISSUER = 'The session did not record the auth endpoint that issued it, so its key was not sent anywhere to be revoked; it stays valid until it expires.';

/** Talks to one auth endpoint with one bearer; every call has the sign-in timeout. */
function keyClient(endpoint: string, bearer: string) {
  const client: AuthClient = auth.createClient({ endpoint, headers: { Authorization: `Bearer ${bearer}` }, fetch: trackedFetch(endpoint).fetch });
  return {
    async mint(): Promise<MintedApiKey> {
      const request = client.mutation
        .createApiKey({ input: buildCreateApiKeyInput({ days: API_KEY_DAYS }) }, { select: CREATE_KEY_SELECT })
        .unwrap();
      const data = (await withAuthTimeout(request, endpoint)) as { createApiKey?: { result?: MintedApiKey & { expiresAt?: string } } } | undefined;
      return parseMintedKey(data?.createApiKey?.result);
    },
    async revoke(keyId: string): Promise<void> {
      try {
        await withAuthTimeout(client.mutation.revokeApiKey({ input: { keyId } }, { select: REVOKE_KEY_SELECT }).unwrap(), endpoint);
      } catch (err) {
        throw new Error(describeAuthError(err));
      }
    }
  };
}

/**
 * Where a stored session's key is revoked: the auth endpoint that issued it.
 * A session that records only that endpoint (Desktop's field) still names its
 * issuer, so its own token may go back there, though it is never used for
 * anything else.
 */
const issuerOf = (session: AccountSession | null | undefined): string | undefined => session?.issuedFor?.authEndpoint ?? session?.authEndpoint;

/**
 * The stored bearer is the key: the password sign-in that made it is ended
 * on the server once the key exists, so its token works nowhere.
 */
const withKey = (session: AccountSession, key: MintedApiKey): AccountSession => ({
  ...session,
  accessToken: key.apiKey,
  accessTokenExpiresAt: key.apiKeyExpiresAt,
  apiKey: key.apiKey,
  keyId: key.keyId,
  apiKeyExpiresAt: key.apiKeyExpiresAt
});

/** A person signed in with the password: a bearer session on the server until `endSignIn` ends it. */
export interface PasswordSignIn {
  userId: string;
  email: string;
  accessToken: string;
  accessTokenExpiresAt?: string;
}

/** One password sign-in at `authEndpoint`, which writes nothing. Throws a `SignInError`. */
export async function passwordSignIn(authEndpoint: string, email: string, password: string): Promise<PasswordSignIn> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) throw new SignInError('invalid-input', 'Email and password are required.');
  const http = trackedFetch(authEndpoint);
  const request = auth.createClient({ endpoint: authEndpoint, fetch: http.fetch }).mutation
    .signIn({ input: { email: trimmedEmail, password } }, { select: SELECT })
    .unwrap();

  let record: AuthRecord | null | undefined;
  try {
    record = ((await withAuthTimeout(request, authEndpoint)) as { signIn?: { result?: AuthRecord | null } } | undefined)?.signIn?.result;
  } catch (err) {
    throw signInFailure(err, authEndpoint, http.status());
  }
  if (record?.mfaRequired) {
    throw new SignInError('second-factor-required', `The account ${trimmedEmail} needs a second factor, which this sign-in does not support yet. Sign in through the app.`);
  }
  if (!record?.accessToken || !record.userId) {
    throw new SignInError('invalid-credentials', `The server at ${authEndpoint} rejected the email or the password.`);
  }
  return {
    userId: record.userId,
    email: trimmedEmail,
    accessToken: record.accessToken,
    ...(record.accessTokenExpiresAt ? { accessTokenExpiresAt: record.accessTokenExpiresAt } : {})
  };
}

/**
 * End a password sign-in's session on the server, so no bearer session is
 * left behind. Best effort: if the server cannot be reached, the session ends
 * at its own expiry, and the caller's work stands.
 */
export async function endSignIn(authEndpoint: string, accessToken: string): Promise<void> {
  const client = auth.createClient({ endpoint: authEndpoint, headers: { Authorization: `Bearer ${accessToken}` }, fetch: trackedFetch(authEndpoint).fetch });
  await withAuthTimeout(client.mutation.signOut({ input: {} }, { select: { clientMutationId: true } }).unwrap(), authEndpoint).catch((): void => undefined);
}

/** The sign-in worked, but no key could be made, so nothing is stored. */
function noKeyFailure(err: unknown, authEndpoint: string): SignInError {
  const why = `The sign-in to ${authEndpoint} worked, but no API key could be made (${describeAuthError(err)}), so nothing was stored and the sign-in was ended.`;
  if (isNetworkError(err)) return new SignInError('backend-unreachable', `${why} Retry the sign-in.`);
  const code = errorCodes(err)[0];
  if (code) return new SignInError('refused', `${why} Revoke an API key you no longer use in the app, or check that API keys are on, then sign in again.`, code);
  return new SignInError('server-error', `${why} Retry later, or check the backend logs.`);
}

export interface SignInResult {
  session: AccountSession;
  context: string;
  /** `not-minted`: the session keeps the key of the session it replaced, which is still valid. */
  apiKey: { kind: 'minted' } | { kind: 'not-minted'; reason: string };
  /** The key of the session this sign-in replaced. */
  previousKey: PreviousKey;
}

/**
 * Sign in to `backend` with email and password and mint the person's 30-day
 * API key inside the fresh step-up window, all before anything is written.
 * Then revoke the key of the session this one replaces, end the password
 * sign-in on the server, and store the backend, the session (whose bearer is
 * the key), and make the backend active, in that order, so credentials are
 * never filed under a context that does not exist. A failed sign-in, or one
 * that ends with no key, throws a `SignInError` and leaves the store as it was.
 */
export async function signIn({
  store,
  backend,
  context = contextNameFor(backend),
  email,
  password
}: {
  store: ConfigStore;
  backend: BackendConfig;
  /** The context to file the session under. Default: `contextNameFor(backend)`. */
  context?: string;
  email: string;
  password: string;
}): Promise<SignInResult> {
  const { authEndpoint } = backend;
  const signedIn = await passwordSignIn(authEndpoint, email, password);
  const session: AccountSession = { ...signedIn, signedInAt: Date.now(), issuedFor: backend };

  // The replaced key is revoked with the new token when it belongs to the same
  // account on the same auth plane (that also frees a key-limit slot for the
  // mint), else with the old session's own bearer at the issuer it records.
  const previous = loadSession(store, context);
  const previousAuth = issuerOf(previous);
  const sameAccount = !!previous && previous.userId === session.userId && previousAuth === authEndpoint;
  const result = await remintApiKey({ currentKeyId: sameAccount ? previous.keyId : undefined, ...keyClient(authEndpoint, session.accessToken) }).finally(() =>
    endSignIn(authEndpoint, session.accessToken)
  );

  let filed: AccountSession;
  let previousKey: PreviousKey = result.previousKey;
  let apiKey: SignInResult['apiKey'];
  if (result.kind === 'minted') {
    filed = withKey(session, result.minted);
    apiKey = { kind: 'minted' };
  } else if (sameAccount && result.previousKey.kind === 'kept' && previous.apiKey) {
    filed = withKey(session, { apiKey: previous.apiKey, keyId: previous.keyId, apiKeyExpiresAt: previous.apiKeyExpiresAt });
    apiKey = { kind: 'not-minted', reason: describeAuthError(result.error) };
  } else {
    // A key-limit retry may have revoked the stored key before the second mint failed.
    if (sameAccount && result.previousKey.kind === 'revoked') clearSession(store, context);
    throw noKeyFailure(result.error, authEndpoint);
  }
  if (!sameAccount && previous?.keyId) {
    previousKey = previousAuth
      ? await revokeKey(previous.keyId, keyClient(previousAuth, previous.apiKey ?? previous.accessToken).revoke)
      : { kind: 'failed', keyId: previous.keyId, reason: NO_ISSUER };
  }

  // The replaced session's key is handled above, so its record goes before the new backend is stored.
  if (previous) clearSession(store, context);
  addBackend(store, backend, context);
  saveSession(store, filed, context);
  selectBackend(store, context);
  return { session: filed, context, apiKey, previousKey };
}

export type SignOutResult =
  | { kind: 'not-signed-in'; context: string | null }
  /** The session comes from the environment: nothing is stored to remove. */
  | { kind: 'from-environment' }
  | { kind: 'cleared'; context: string; key: KeyRevocation };

/**
 * Sign out of exactly the session `resolveSession` gave: revoke its API key at
 * the auth endpoint that issued it, with its own bearer, and clear what is
 * stored under its context. The session is cleared in every state, also when
 * the context lacks planes, the issuer is not recorded or the revoke fails;
 * the result says what happened to the key. Throws the problem of an
 * `invalid-override` or `conflict` session. Prints nothing.
 */
export async function signOut({ store, session }: { store: ConfigStore; session: Session }): Promise<SignOutResult> {
  if (session.kind === 'invalid-override' || session.kind === 'conflict') throw new Error(sessionProblem(session));
  if ((session.kind === 'signed-in' || session.kind === 'signed-out') && session.source === 'env') return { kind: 'from-environment' };
  const context = 'context' in session ? session.context : null;
  if (!context || !store.getCredentials(context)) return { kind: 'not-signed-in', context };
  const stored = loadSession(store, context);
  let key: KeyRevocation = { kind: 'absent' };
  const issuer = issuerOf(stored);
  if (stored?.keyId) {
    key = issuer ? await revokeKey(stored.keyId, keyClient(issuer, stored.apiKey ?? stored.accessToken).revoke) : { kind: 'failed', keyId: stored.keyId, reason: NO_ISSUER };
  }
  clearSession(store, context);
  return { kind: 'cleared', context, key };
}

export type CredentialCheck =
  | { kind: 'accepted' }
  | { kind: 'rejected'; reason: string; code?: string }
  | { kind: 'unchecked'; reason: string };

/**
 * Ask the backend once whether the credential of a signed-in session is
 * accepted: `currentUser` at its auth endpoint, with the bearer the tools send
 * (the API key, else the access token), within the sign-in timeout. Classified
 * by facts only: no answer is `unchecked`; HTTP 401 or 403 is `rejected`;
 * another non-2xx status is `unchecked`; `UNAUTHENTICATED` or `FORBIDDEN` is
 * `rejected`, another error code `unchecked`; no user, or another user, is
 * `rejected`. Never throws.
 */
export async function verifySession(session: Extract<Session, { kind: 'signed-in' }>): Promise<CredentialCheck> {
  const { authEndpoint } = session.backend;
  const bearer = session.account.key.kind === 'active' ? session.account.key.apiKey : session.account.accessToken;
  const http = trackedFetch(authEndpoint);
  const client = auth.createClient({ endpoint: authEndpoint, headers: { Authorization: `Bearer ${bearer}` }, fetch: http.fetch });
  let result: Awaited<ReturnType<ReturnType<typeof client.query.currentUser>['execute']>>;
  try {
    result = await withAuthTimeout(client.query.currentUser({ select: { id: true } }).execute(), authEndpoint);
  } catch (err) {
    if (isNetworkError(err)) return { kind: 'unchecked', reason: describeAuthError(err) };
    return { kind: 'unchecked', reason: `The server at ${authEndpoint} gave an answer that could not be read (${describeAuthError(err)}).` };
  }
  const status = http.status();
  if (status === 401 || status === 403) return { kind: 'rejected', reason: `The server at ${authEndpoint} rejected the credential (HTTP ${status}).`, code: `HTTP_${status}` };
  if (status !== undefined && (status < 200 || status >= 300)) return { kind: 'unchecked', reason: `The server at ${authEndpoint} answered HTTP ${status}.` };
  if (!result.ok) {
    const codes = result.errors.map((error) => error.extensions?.code).filter((code): code is string => typeof code === 'string');
    const rejected = codes.find((code) => code === 'UNAUTHENTICATED' || code === 'FORBIDDEN');
    if (rejected) return { kind: 'rejected', reason: `The server at ${authEndpoint} rejected the credential (${rejected}).`, code: rejected };
    return { kind: 'unchecked', reason: `The server at ${authEndpoint} could not check the credential (${codes.join(', ') || 'no error code'}).` };
  }
  const id = (result.data as { currentUser?: { id?: string } | null })?.currentUser?.id;
  if (!id) return { kind: 'rejected', reason: `The server at ${authEndpoint} does not know the credential: it sees no signed-in user.` };
  if (id !== session.account.userId) return { kind: 'rejected', reason: `The credential belongs to another user than the session (${session.account.userId}).` };
  return { kind: 'accepted' };
}
