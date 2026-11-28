import { auth } from '@constructive-io/sdk';
import { ConfigStore } from 'appstash';

import { currentContextName } from './account-store';
import {
  agentEntryExists,
  AgentNameError,
  AgentRecord,
  AgentRecordUnreadable,
  type CachedToken,
  checkAgentName,
  createAgentEntry,
  deleteAgent,
  dropCachedToken,
  listAgentNames,
  readAgent,
  readCachedToken,
  writeAgent,
  writeCachedToken
} from './agent-store';
import { type KeyRevocation, revokeKey } from './api-key';
import { endSignIn, passwordSignIn } from './auth';
import { describeAuthError, errorCodes, isNetworkError, trackedFetch, withAuthTimeout } from './auth-error';
import { type BackendConfig, differingPlanes, readBackend } from './backend-store';
import { agentBinding, renewFix, type ResolvedAgentSession, type Session, type SessionAccount } from './session';

/**
 * The org capability mask of an agent that may not change the schema: every
 * capability but `manage_database`. The platform's org capabilities are 64
 * bits wide, `manage_database` is org capability 12, and bit N counts from the
 * right. The backend right-pads a shorter mask with zeros, so the mask must be
 * the full width; a wider backend would read this one as removing more
 * capabilities, never fewer.
 */
const ORG_CAPABILITY_WIDTH = 64;
const MANAGE_DATABASE_BIT = 12;
export const SCHEMA_READ_ONLY_MASK = Array.from({ length: ORG_CAPABILITY_WIDTH }, (_, i) => (i === ORG_CAPABILITY_WIDTH - MANAGE_DATABASE_BIT ? '0' : '1')).join('');

/** The org membership type, where the platform's schema capabilities live. */
const ORG_MEMBERSHIP_TYPE = 2;

/** How long an agent's key lasts: the cap set on its principal, and what its key asks for. */
const AGENT_KEY_DAYS = 30;

/** Mint a new access token once less than this is left of the cached one: covers clock skew and one request. */
const TOKEN_MARGIN_MS = 30_000;

export type AgentErrorKind =
  | 'invalid-name'
  | 'not-a-person'
  | 'sign-in-required'
  | 'step-up-required'
  | 'name-taken'
  | 'not-found'
  | 'unreadable-record'
  | 'refused'
  | 'backend-unreachable'
  | 'server-error';

/** A failed agent operation. `code` is the server's error code when it gave one. No secret is in it. */
export class AgentError extends Error {
  constructor(
    readonly kind: AgentErrorKind,
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

const SIGN_IN_AGAIN = 'Sign in again with your password, then retry.';

/** Classified by facts only: no answer, the HTTP status, then `extensions.code`. */
function agentFailure(err: unknown, what: string, endpoint: string, status: number | undefined): AgentError {
  if (isNetworkError(err)) return new AgentError('backend-unreachable', `${what} failed: ${describeAuthError(err)}`);
  if (status !== undefined && (status < 200 || status >= 300)) {
    return new AgentError('server-error', `${what} failed: the server at ${endpoint} answered HTTP ${status}. Retry later, or check the backend logs.`, `HTTP_${status}`);
  }
  const code = errorCodes(err)[0];
  if (!code) return new AgentError('server-error', `${what} failed: ${describeAuthError(err)}. Retry later, or check the backend logs.`);
  if (code.startsWith('STEP_UP_REQUIRED')) return new AgentError('step-up-required', `${what} needs a recent sign-in (${code}). ${SIGN_IN_AGAIN}`, code);
  if (code === 'UNAUTHENTICATED' || code === 'NOT_AUTHENTICATED') return new AgentError('sign-in-required', `${what} was refused because the sign-in has ended (${code}). ${SIGN_IN_AGAIN}`, code);
  if (code.startsWith('PRINCIPAL_CANNOT_') || code === 'PRINCIPAL_REQUIRED') {
    return new AgentError('not-a-person', `${what} was refused: only the person, not an agent, may do this (${code}). Run it signed in as yourself.`, code);
  }
  if (code === 'PRINCIPAL_NOT_FOUND') return new AgentError('not-found', `${what} failed: the backend has no such principal (${code}).`, code);
  return new AgentError('refused', `${what} was refused by the server (${code}).`, code);
}

type AuthClient = ReturnType<typeof auth.createClient>;

/** One auth-plane call with the sign-in timeout, its failure classified. */
async function call<T>(endpoint: string, bearer: string | undefined, what: string, request: (client: AuthClient) => { unwrap(): Promise<T> }): Promise<T> {
  const http = trackedFetch(endpoint);
  const client = auth.createClient({ endpoint, fetch: http.fetch, ...(bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {}) });
  try {
    return await withAuthTimeout(request(client).unwrap(), endpoint);
  } catch (err) {
    throw agentFailure(err, what, endpoint, http.status());
  }
}

/** What a person must hold to manage agents: a stored session of their own, which names the account and the backend. */
interface SignedInPerson {
  kind: 'signed-in';
  source: 'store';
  context: string;
  backend: BackendConfig;
  account: SessionAccount;
}

function person(session: Session): SignedInPerson {
  if (session.kind !== 'signed-in' || session.source !== 'store') {
    const what =
      session.kind === 'signed-in' && session.source === 'agent'
        ? 'an agent, and only the person may manage agents'
        : session.kind === 'signed-in' || session.kind === 'signed-out'
          ? 'a credential from the environment, so there is no stored context to file the agent under'
          : 'no sign-in';
    throw new AgentError('not-a-person', `Managing agents needs the person signed in, with a session stored by this computer; this session is ${what}. Unset the CONSTRUCTIVE_* credential variables if they are set, sign in as yourself, then retry.`);
  }
  return session as SignedInPerson;
}

/** The person's stored bearer (the key, else the token another app stored), for the calls that make no credential. */
function storedBearer(owner: SignedInPerson): string {
  const { key, accessToken, accessTokenExpiresAt } = owner.account;
  const expires = key.kind === 'active' ? key.expiresAt : accessTokenExpiresAt;
  if (expires && Date.parse(expires) <= Date.now()) throw new AgentError('sign-in-required', `The person's sign-in ended at ${expires}. ${SIGN_IN_AGAIN}`);
  return key.kind === 'active' ? key.apiKey : accessToken;
}

/**
 * Run `task` with a new password sign-in of the person, which a key for a
 * principal needs, and end that sign-in on the server when it is done, so no
 * bearer session is left behind. Throws a `SignInError` when the sign-in fails.
 */
async function withFreshSignIn<T>(owner: SignedInPerson, password: string, task: (bearer: string) => Promise<T>): Promise<T> {
  const endpoint = owner.backend.authEndpoint;
  if (!owner.account.email) throw new AgentError('sign-in-required', `The stored session records no email to sign in with. ${SIGN_IN_AGAIN}`);
  const fresh = await passwordSignIn(endpoint, owner.account.email, password);
  try {
    if (fresh.userId !== owner.account.userId) {
      throw new AgentError('not-a-person', `The password signed in another account than ${owner.account.email}, which is signed in here. Use the password of ${owner.account.email}.`);
    }
    return await task(fresh.accessToken);
  } finally {
    await endSignIn(endpoint, fresh.accessToken);
  }
}

/**
 * An agent as listed: its facts, or, for a record that cannot be read, the
 * reason it cannot be used. An agent that is `ready` keeps working until its
 * key ends (`keyExpiresAt`) or it is removed, also after the person signs out.
 */
export type AgentInfo = AgentDetails | { name: string; context: string; state: 'set-up-again'; unreadable: true; problem: string };

export interface AgentDetails {
  name: string;
  context: string;
  principalId: string;
  schemaChanges: boolean;
  organization?: string;
  createdAt: string;
  keyExpiresAt: string;
  /** `set-up-again`: the key has ended. `issuer-mismatch`: the context now names other endpoints. */
  state: 'ready' | 'set-up-again' | 'issuer-mismatch';
}

function infoOf(store: ConfigStore, record: AgentRecord): AgentDetails {
  const stored = readBackend(store, record.context);
  let state: AgentDetails['state'] = 'ready';
  if (stored?.status !== 'complete' || differingPlanes(record.issuedFor, stored.backend).length > 0) state = 'issuer-mismatch';
  else if (Date.parse(record.keyExpiresAt) <= Date.now()) state = 'set-up-again';
  return {
    name: record.name,
    context: record.context,
    principalId: record.principalId,
    schemaChanges: record.schemaChanges,
    ...(record.organization ? { organization: record.organization } : {}),
    createdAt: record.createdAt,
    keyExpiresAt: record.keyExpiresAt,
    state
  };
}

/** The stored record of an agent the person manages, or the AgentError that says why there is none. */
function ownedRecord(store: ConfigStore, context: string, name: string): AgentRecord {
  let record: AgentRecord | null;
  try {
    record = readAgent(store, context, name);
  } catch (err) {
    if (err instanceof AgentRecordUnreadable) throw new AgentError('unreadable-record', `${err.message} Remove the agent and add it again.`);
    throw err;
  }
  if (!record) throw new AgentError('not-found', `There is no agent named "${name}" under the context "${context}".`);
  return record;
}

const nameTaken = (name: string, context: string) =>
  new AgentError('name-taken', `There is already an agent named "${name}" under the context "${context}". Pick another name, or remove that agent first.`);

function checkedName(name: string): string {
  try {
    return checkAgentName(name);
  } catch (err) {
    if (err instanceof AgentNameError) throw new AgentError('invalid-name', err.message);
    throw err;
  }
}

async function setScope(endpoint: string, bearer: string, principalId: string, schemaChanges: boolean): Promise<void> {
  await call(endpoint, bearer, 'Setting what the agent may change', (client) =>
    client.mutation.setPrincipalScope(
      {
        input: {
          principalId,
          membershipType: ORG_MEMBERSHIP_TYPE,
          allowedMask: schemaChanges ? null : SCHEMA_READ_ONLY_MASK,
          // The scope's own default is true, which would give the agent the person's admin flag back.
          useAdminOwner: false,
          isActive: true,
          isReadOnly: false
        }
      },
      { select: { result: true } }
    )
  );
}

/** Cap every key minted for the principal; the backend applies a cap when it mints a key, so this comes first. */
async function capKeys(endpoint: string, bearer: string, principalId: string): Promise<void> {
  // The generated SDK types this input as a table patch; the backend's updatePrincipal takes each setting as its own argument.
  const input = { principalId, apiKeyMaxDuration: { days: AGENT_KEY_DAYS } } as unknown as Parameters<AuthClient['mutation']['updatePrincipal']>[0]['input'];
  const capped = await call(endpoint, bearer, "Capping the agent's key lifetime", (client) => client.mutation.updatePrincipal({ input }, { select: { result: true } })).then(
    (data) => (data as { updatePrincipal?: { result?: boolean } })?.updatePrincipal?.result
  );
  if (capped !== true) throw new AgentError('server-error', "Capping the agent's key lifetime failed: the backend did not confirm it. Retry later, or check the backend logs.");
}

async function createKey(endpoint: string, bearer: string, principalId: string, name: string): Promise<{ apiKey: string; keyId: string; keyExpiresAt: string }> {
  const data = await call(endpoint, bearer, 'Creating the key of the agent', (client) =>
    client.mutation.createApiKey(
      { input: { keyName: `agent:${name}`, accessLevel: 'full_access', mfaLevel: 'none', expiresIn: { days: AGENT_KEY_DAYS }, principalId } },
      { select: { result: { select: { apiKey: true, keyId: true, expiresAt: true } } } }
    )
  );
  const key = (data as { createApiKey?: { result?: { apiKey?: string; keyId?: string; expiresAt?: string } } })?.createApiKey?.result;
  if (!key?.apiKey || !key.keyId || !key.expiresAt) {
    throw new AgentError('server-error', 'Creating the key of the agent failed: the backend answered without a key and its end. Retry later, or check the backend logs.');
  }
  return { apiKey: key.apiKey, keyId: key.keyId, keyExpiresAt: key.expiresAt };
}

/**
 * Create an agent of the signed-in person: a principal that does not share the
 * person's admin flag, held to `organization` when one is given, that may not
 * change the schema unless `allowSchemaChanges`, with every key of it capped at
 * 30 days, and one such key, stored under the person's context. This package
 * uses the key only to mint access tokens, but the backend accepts the key itself
 * on requests too. It signs the person in afresh with `password`
 * and ends that sign-in when done. A failure after the principal exists
 * deletes it again and says so.
 */
export async function createAgent({
  store,
  session,
  password,
  name,
  organization,
  allowSchemaChanges
}: {
  store: ConfigStore;
  session: Session;
  password: string;
  name: string;
  organization?: string;
  allowSchemaChanges: boolean;
}): Promise<AgentInfo> {
  const agentName = checkedName(name);
  const owner = person(session);
  const context = owner.context;
  if (agentEntryExists(store, context, agentName)) throw nameTaken(agentName, context);
  return withFreshSignIn(owner, password, (bearer) => createWith(store, owner, bearer, agentName, organization, allowSchemaChanges));
}

async function createWith(store: ConfigStore, owner: SignedInPerson, bearer: string, agentName: string, organization: string | undefined, allowSchemaChanges: boolean): Promise<AgentInfo> {
  const context = owner.context;
  const endpoint = owner.backend.authEndpoint;
  const principalId = await call(endpoint, bearer, 'Creating the agent', (client) =>
    client.mutation.createPrincipal(
      { input: { name: agentName, useAdminOwner: false, ...(organization ? { entityIds: [organization] } : {}) } },
      { select: { result: true } }
    )
  ).then((data) => (data as { createPrincipal?: { result?: string } })?.createPrincipal?.result);
  if (!principalId) throw new AgentError('server-error', 'Creating the agent failed: the backend answered without a principal id. Retry later, or check the backend logs.');

  try {
    await setScope(endpoint, bearer, principalId, allowSchemaChanges);
    await capKeys(endpoint, bearer, principalId);
    const key = await createKey(endpoint, bearer, principalId, agentName);
    const record: AgentRecord = {
      name: agentName,
      context,
      principalId,
      ownerId: owner.account.userId,
      ...(organization ? { organization } : {}),
      schemaChanges: allowSchemaChanges,
      createdAt: new Date().toISOString(),
      issuedFor: owner.backend,
      ...key
    };
    try {
      createAgentEntry(store, record);
    } catch (err) {
      // Another add of this name may have finished since the first check.
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') throw nameTaken(agentName, context);
      throw err;
    }
    return infoOf(store, record);
  } catch (err) {
    const cleanup = await call(endpoint, bearer, 'Deleting the half-made agent', (client) =>
      client.mutation.deletePrincipal({ input: { principalId } }, { select: { result: true } })
    ).then(
      () => 'The principal it made was deleted again.',
      (cleanupErr: AgentError) => `The principal ${principalId} it made could not be deleted (${cleanupErr.message}); delete it from the app.`
    );
    if (err instanceof AgentError) throw new AgentError(err.kind, `${err.message} ${cleanup}`, err.code);
    throw err;
  }
}

/**
 * The agents filed under `context` (default: the active one). No secret is in
 * the result. The person's sign-out leaves each agent working; this is what to
 * tell them, and `removeAgent` is what stops one.
 */
export function listAgents({ store, context }: { store: ConfigStore; context?: string }): AgentInfo[] {
  const resolved = context ?? currentContextName(store);
  if (!resolved) return [];
  return listAgentNames(store, resolved).flatMap((name): AgentInfo[] => {
    try {
      const record = readAgent(store, resolved, name);
      return record ? [infoOf(store, record)] : [];
    } catch (err) {
      if (!(err instanceof AgentRecordUnreadable)) throw err;
      return [{ name, context: resolved, state: 'set-up-again', unreadable: true, problem: `${err.message} Remove the agent and add it again.` }];
    }
  });
}

type Unusable = Extract<ResolvedAgentSession, { kind: 'agent-unusable' }>;

/** Mint an access token with the agent's key, for its principal. The refresh token the backend makes is never asked for. */
async function mint(record: AgentRecord): Promise<CachedToken | Unusable> {
  const unusable = (reason: Unusable['reason'], problem: string, fix: string): Unusable => ({ kind: 'agent-unusable', context: record.context, agent: record.name, reason, problem, fix });
  let result: { accessToken?: string; accessExpiresAt?: string } | undefined;
  try {
    const data = await call(record.issuedFor.authEndpoint, record.apiKey, 'Issuing the agent an access token', (client) =>
      client.mutation.mintAccessToken(
        { input: { principalId: record.principalId, intent: `agent:${record.name}` } },
        { select: { result: { select: { accessToken: true, accessExpiresAt: true } } } }
      )
    );
    result = (data as { mintAccessToken?: { result?: typeof result } })?.mintAccessToken?.result;
  } catch (err) {
    if (!(err instanceof AgentError)) throw err;
    if (err.kind === 'sign-in-required' || err.kind === 'not-found') {
      return unusable('set-up-again', `The backend no longer accepts the key of the agent "${record.name}" (${err.code}): the agent was removed, or its key was revoked or has ended.`, renewFix(record.name));
    }
    return unusable('mint-failed', err.message, 'Retry: the key of the agent is unchanged.');
  }
  if (!result?.accessToken || !result.accessExpiresAt) {
    return unusable('mint-failed', `Issuing the agent "${record.name}" an access token failed: the backend answered without a token.`, 'Retry later, or check the backend logs.');
  }
  return { keyId: record.keyId, accessToken: result.accessToken, accessExpiresAt: result.accessExpiresAt };
}

/**
 * The agent's session for use: the cached access token while more than a
 * short margin of it is left, else a new one minted with the agent's key and
 * cached. Processes need no lock: a token may be used many times, so two that
 * mint at once both work, and the cache keeps one of them.
 *
 * `rejectedToken` is an access token of this agent that the backend just
 * refused as signed out. When it is the cached one, that entry is dropped and
 * one token is minted from the key; when another process already cached a new
 * one, that one is used. It never retries on its own, so a caller passes it
 * once per refusal.
 */
export async function agentSession({
  store,
  name,
  context,
  env = process.env,
  rejectedToken
}: {
  store: ConfigStore;
  name: string;
  context?: string;
  env?: NodeJS.ProcessEnv;
  rejectedToken?: string;
}): Promise<ResolvedAgentSession> {
  const bound = agentBinding({ store, context, env, agent: name });
  if (bound.kind !== 'bound') return bound;
  const { record } = bound;
  let cached = readCachedToken(store, bound.context, record.name);
  if (rejectedToken !== undefined && cached?.accessToken === rejectedToken) {
    dropCachedToken(store, bound.context, record.name);
    cached = null;
  }
  let token: CachedToken;
  if (cached && cached.keyId === record.keyId && Date.parse(cached.accessExpiresAt) - Date.now() > TOKEN_MARGIN_MS) {
    token = cached;
  } else {
    const minted = await mint(record);
    if ('kind' in minted) return minted;
    writeCachedToken(store, bound.context, record.name, minted);
    token = minted;
  }
  return {
    kind: 'signed-in',
    source: 'agent',
    context: bound.context,
    backend: bound.backend,
    account: { userId: record.ownerId, accessToken: token.accessToken, accessTokenExpiresAt: token.accessExpiresAt, key: { kind: 'none' } },
    agent: { name: record.name, principalId: record.principalId, schemaChanges: record.schemaChanges, accessExpiresAt: token.accessExpiresAt, keyExpiresAt: record.keyExpiresAt }
  };
}

/** Change what an agent may do with the schema, on the backend and in its record. */
async function setSchemaChanges(store: ConfigStore, session: Session, name: string, schemaChanges: boolean): Promise<AgentInfo> {
  const agentName = checkedName(name);
  const owner = person(session);
  const record = ownedRecord(store, owner.context, agentName);
  await setScope(owner.backend.authEndpoint, storedBearer(owner), record.principalId, schemaChanges);
  const updated = { ...record, schemaChanges };
  writeAgent(store, updated);
  return infoOf(store, updated);
}

/** Let an agent change the schema: the scope's mask is removed. */
export const grantSchemaChanges = ({ store, session, name }: { store: ConfigStore; session: Session; name: string }) => setSchemaChanges(store, session, name, true);

/** Stop an agent changing the schema: `manage_database` is masked out again. */
export const revokeSchemaChanges = ({ store, session, name }: { store: ConfigStore; session: Session; name: string }) => setSchemaChanges(store, session, name, false);

/** A renewed agent, and what happened to its old key. */
export interface AgentRenewal {
  agent: AgentInfo;
  previousKey: KeyRevocation;
}

/**
 * Give an agent a new 30-day key for the same principal, so it keeps its
 * grants: with a new password sign-in of the person (ended when done), the new
 * key is stored first, the cached token dropped, then the old key revoked,
 * which ends every token minted with it. A failure before the new key is
 * stored keeps the old key and the record as they were.
 */
export async function renewAgentKey({ store, session, password, name }: { store: ConfigStore; session: Session; password: string; name: string }): Promise<AgentRenewal> {
  const agentName = checkedName(name);
  const owner = person(session);
  const record = ownedRecord(store, owner.context, agentName);
  const endpoint = owner.backend.authEndpoint;
  return withFreshSignIn(owner, password, async (bearer) => {
    const key = await createKey(endpoint, bearer, record.principalId, agentName);
    const renewed: AgentRecord = { ...record, ...key };
    writeAgent(store, renewed);
    dropCachedToken(store, owner.context, agentName);
    const previousKey = await revokeKey(record.keyId, async (keyId): Promise<void> => {
      await call(endpoint, bearer, 'Revoking the old key of the agent', (client) => client.mutation.revokeApiKey({ input: { keyId } }, { select: { result: true } }));
    });
    return { agent: infoOf(store, renewed), previousKey };
  });
}

/**
 * Delete the agent's principal on the backend, which ends its key and every
 * token minted with it at once, then its stored entry and cached token. A
 * failed delete keeps the entry and throws; a principal the backend no longer
 * has is `already-gone`, and its entry is removed.
 */
export type AgentRemoval =
  | { kind: 'removed' | 'already-gone'; name: string }
  /** The record could not be read, so its principal is unknown: only the entry was removed. */
  | { kind: 'entry-removed'; name: string; problem: string };

export async function removeAgent({ store, session, name }: { store: ConfigStore; session: Session; name: string }): Promise<AgentRemoval> {
  const agentName = checkedName(name);
  const owner = person(session);
  let record: AgentRecord;
  try {
    record = ownedRecord(store, owner.context, agentName);
  } catch (err) {
    if (!(err instanceof AgentError && err.kind === 'unreadable-record')) throw err;
    deleteAgent(store, owner.context, agentName);
    return {
      kind: 'entry-removed',
      name: agentName,
      problem: `The stored record of the agent "${agentName}" could not be read, so its principal is unknown and was not deleted. Delete the principal "${agentName}" in the app; its credential works until then.`
    };
  }
  let kind: 'removed' | 'already-gone' = 'removed';
  try {
    const data = await call(owner.backend.authEndpoint, storedBearer(owner), 'Removing the agent', (client) =>
      client.mutation.deletePrincipal({ input: { principalId: record.principalId } }, { select: { result: true } })
    );
    if (!(data as { deletePrincipal?: unknown })?.deletePrincipal) kind = 'already-gone';
  } catch (err) {
    if (!(err instanceof AgentError && err.kind === 'not-found')) {
      if (err instanceof AgentError) throw new AgentError(err.kind, `${err.message} The agent is still stored, and its credential still works.`, err.code);
      throw err;
    }
    kind = 'already-gone';
  }
  deleteAgent(store, owner.context, agentName);
  return { kind, name: agentName };
}
