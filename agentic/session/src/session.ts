import type { HostAccount, HostBackendConfig } from '@agentic-kit/db-tools';
import { ConfigStore } from 'appstash';

import { checkContextName, currentContextName, loadSession, openStore, STASH_DIR_ENV, stashBaseDir } from './account-store';
import { type AgentRecord, AgentRecordUnreadable, checkAgentName, readAgent } from './agent-store';
import { BackendConfig, backendFromEndpoints, differingPlanes, EndpointError, Plane, planeEndpoint, PLANES, readBackend } from './backend-store';

export type SessionSource = 'env' | 'store';

export type SessionKey =
  | { kind: 'none' }
  | { kind: 'active'; apiKey: string; keyId?: string; expiresAt?: string };

export interface SessionAccount {
  userId: string;
  /** Known for a stored session only. */
  email?: string;
  accessToken: string;
  accessTokenExpiresAt?: string;
  key: SessionKey;
}

/**
 * The one answer to "who talks to which backend". A credential is only ever
 * paired with the backend of its own source: a stored session with the
 * endpoints of the context it is filed under, an environment credential with
 * the endpoints the environment names.
 */
/** The states every resolution can answer: no backend, an incomplete one, or a wrong environment. */
type CommonState =
  /** No context is chosen (`context: null`), or the named one does not exist. */
  | { kind: 'no-backend'; context: string | null }
  /** A stored context lacks planes, for example one another app wrote. */
  | { kind: 'incomplete-backend'; context: string; missing: Plane[]; apiEndpoint?: string }
  /** An environment variable is missing, empty or wrong; `fix` says what to set. */
  | { kind: 'invalid-override'; variable: string; problem: string; fix: string }
  /** A context or an agent was named, but the environment variable `variable` decides the session; one of the two must go. */
  | { kind: 'conflict'; context: string; variable: string; problem: string; fix: string };

/** A person's session: what `resolveSession` answers without `agent`. */
export type PersonSession =
  | CommonState
  /**
   * A session is stored under the context, but it was issued for another
   * backend: `differs` names the planes whose endpoints are not the ones it
   * was issued for (`issuedFor`), or the session does not record the backend
   * it was issued for (`issuedFor: null`, `differs: []`). It is never used or
   * sent; a new sign-in replaces it.
   */
  | { kind: 'issuer-mismatch'; source: 'store'; context: string; backend: BackendConfig; issuedFor: BackendConfig | null; differs: Plane[] }
  | { kind: 'signed-out'; source: SessionSource; context: string | null; backend: BackendConfig }
  | { kind: 'signed-in'; source: SessionSource; context: string | null; backend: BackendConfig; account: SessionAccount };

/** The named agent cannot act; `fix` says how to recover. */
type AgentUnusable = { kind: 'agent-unusable'; context: string | null; agent: string; reason: AgentUnusableReason; problem: string; fix: string };

/** An agent's session that can be used or says why not: what `agentSession` answers. */
export type ResolvedAgentSession =
  | CommonState
  /**
   * An agent of the person acts: an access token minted with the agent's key,
   * filed under the person's context and bound to the endpoints it was issued
   * for. `account.userId` is the person's id, which the backend requires.
   */
  | { kind: 'signed-in'; source: 'agent'; context: string; backend: BackendConfig; account: SessionAccount; agent: AgentIdentity }
  | AgentUnusable;

/** Any resolution, for a caller that handles both (`sessionProblem`, the tools host). */
export type Session = PersonSession | ResolvedAgentSession;

export interface AgentIdentity {
  name: string;
  principalId: string;
  schemaChanges: boolean;
  /** When the access token in this session ends. */
  accessExpiresAt: string;
  /** When the agent's key ends; after that the agent must be set up again. */
  keyExpiresAt: string;
}

/**
 * `set-up-again`: the agent's key has ended, the backend refused it, or its
 * record cannot be read; only the person can add the agent again.
 * `mint-failed`: no token could be minted (no answer, or a server error); the
 * key is unchanged, so a retry is safe.
 */
export type AgentUnusableReason = 'not-found' | 'issuer-mismatch' | 'set-up-again' | 'mint-failed';

const CREDENTIAL_VARS = ['CONSTRUCTIVE_USER_ID', 'CONSTRUCTIVE_ACCESS_TOKEN', 'CONSTRUCTIVE_API_KEY'] as const;
const REQUIRED_CREDENTIAL_VARS = ['CONSTRUCTIVE_USER_ID', 'CONSTRUCTIVE_ACCESS_TOKEN'] as const;

const endpointVar = (plane: Plane) => `CONSTRUCTIVE_${plane.toUpperCase()}_ENDPOINT`;
const ENDPOINT_VARS = PLANES.map(endpointVar);

/** Every environment variable `resolveSession` reads, besides `CONSTRUCTIVE_STASH_DIR`. */
export const OVERRIDE_ENV_VARS = [...CREDENTIAL_VARS, ...ENDPOINT_VARS] as readonly string[];

const isSet = (env: NodeJS.ProcessEnv, name: string) => env[name] !== undefined;

type EnvBackend = { kind: 'none' } | { kind: 'backend'; backend: BackendConfig } | Extract<Session, { kind: 'invalid-override' }>;

function envBackend(env: NodeJS.ProcessEnv): EnvBackend {
  const empty = ENDPOINT_VARS.find((name) => env[name] === '');
  if (empty) return { kind: 'invalid-override', variable: empty, problem: `${empty} is set but empty.`, fix: `Set ${empty} to an http or https URL, or unset it.` };
  const api = env.CONSTRUCTIVE_API_ENDPOINT;
  if (api === undefined) {
    const stray = ENDPOINT_VARS.find((name) => isSet(env, name));
    if (!stray) return { kind: 'none' };
    return {
      kind: 'invalid-override',
      variable: 'CONSTRUCTIVE_API_ENDPOINT',
      problem: `${stray} is set, but CONSTRUCTIVE_API_ENDPOINT is not, so the environment names no backend.`,
      fix: `Set CONSTRUCTIVE_API_ENDPOINT to the api endpoint of the backend ${stray} belongs to, or unset ${stray}.`
    };
  }
  const given = Object.fromEntries(
    PLANES.filter((plane) => plane !== 'api' && isSet(env, endpointVar(plane))).map((plane) => [plane, env[endpointVar(plane)]])
  );
  try {
    return { kind: 'backend', backend: backendFromEndpoints({ api, ...given }) };
  } catch (err) {
    if (!(err instanceof EndpointError)) throw err;
    const variable = endpointVar(err.plane);
    const fix =
      err.reason === 'not-derivable'
        ? `Set every plane explicitly: ${ENDPOINT_VARS.filter((name) => !isSet(env, name)).join(', ')}.`
        : `Set ${variable} to an http or https URL with no user name or password.`;
    return { kind: 'invalid-override', variable: err.reason === 'not-derivable' ? 'CONSTRUCTIVE_API_ENDPOINT' : variable, problem: err.message, fix };
  }
}

type EnvAccount = { kind: 'none' } | { kind: 'account'; account: SessionAccount } | Extract<Session, { kind: 'invalid-override' }>;

function envAccount(env: NodeJS.ProcessEnv): EnvAccount {
  const set = CREDENTIAL_VARS.filter((name) => isSet(env, name));
  if (set.length === 0) return { kind: 'none' };
  const missing = REQUIRED_CREDENTIAL_VARS.find((name) => !env[name]);
  if (missing || env.CONSTRUCTIVE_API_KEY === '') {
    const variable = missing ?? 'CONSTRUCTIVE_API_KEY';
    return {
      kind: 'invalid-override',
      variable,
      problem: `${set.join(' and ')} ${set.length > 1 ? 'are' : 'is'} set, so the credential comes from the environment, but ${variable} is ${isSet(env, variable) ? 'empty' : 'not set'}.`,
      fix: `Set CONSTRUCTIVE_USER_ID and CONSTRUCTIVE_ACCESS_TOKEN (and optionally CONSTRUCTIVE_API_KEY), or unset all three to use the stored session.`
    };
  }
  const apiKey = env.CONSTRUCTIVE_API_KEY;
  return {
    kind: 'account',
    account: {
      userId: env.CONSTRUCTIVE_USER_ID,
      accessToken: env.CONSTRUCTIVE_ACCESS_TOKEN,
      key: apiKey ? { kind: 'active', apiKey } : { kind: 'none' }
    }
  };
}

const sameBackend = (a: BackendConfig, b: BackendConfig) => differingPlanes(a, b).length === 0;

/** The stored side: the context `named` (default: the active one), with the session filed under it. */
function storedSession(store: ConfigStore, named: string | undefined): PersonSession {
  const context = named ?? currentContextName(store);
  const stored = context ? readBackend(store, context) : null;
  if (!stored) return { kind: 'no-backend', context: context ?? null };
  if (stored.status === 'incomplete') {
    return { kind: 'incomplete-backend', context, missing: stored.missing, ...(stored.apiEndpoint ? { apiEndpoint: stored.apiEndpoint } : {}) };
  }
  const session = loadSession(store, context);
  if (!session) return { kind: 'signed-out', source: 'store', context, backend: stored.backend };
  const differs = session.issuedFor ? differingPlanes(session.issuedFor, stored.backend) : [];
  if (!session.issuedFor || differs.length > 0) {
    return { kind: 'issuer-mismatch', source: 'store', context, backend: stored.backend, issuedFor: session.issuedFor ?? null, differs };
  }
  const key: SessionKey = session.apiKey
    ? { kind: 'active', apiKey: session.apiKey, ...(session.keyId ? { keyId: session.keyId } : {}), ...(session.apiKeyExpiresAt ? { expiresAt: session.apiKeyExpiresAt } : {}) }
    : { kind: 'none' };
  return {
    kind: 'signed-in',
    source: 'store',
    context,
    backend: stored.backend,
    account: {
      userId: session.userId,
      ...(session.email ? { email: session.email } : {}),
      accessToken: session.accessToken,
      ...(session.accessTokenExpiresAt ? { accessTokenExpiresAt: session.accessTokenExpiresAt } : {}),
      key
    }
  };
}

interface ResolveOptions {
  context?: string;
  env?: NodeJS.ProcessEnv;
  store?: ConfigStore;
}

type InvalidOverride = Extract<CommonState, { kind: 'invalid-override' }>;

/** The store to read and the environment's backend and credential, or the environment variable that is wrong. */
function prepare({
  context,
  env,
  store
}: ResolveOptions & { env: NodeJS.ProcessEnv }): { store: ConfigStore; backend: Exclude<EnvBackend, InvalidOverride>; account: Exclude<EnvAccount, InvalidOverride> } | InvalidOverride {
  if (context !== undefined) checkContextName(context);
  let opened = store;
  if (!opened) {
    try {
      opened = openStore(stashBaseDir(env));
    } catch (err) {
      if (env[STASH_DIR_ENV] !== '') throw err;
      return { kind: 'invalid-override', variable: STASH_DIR_ENV, problem: (err as Error).message, fix: `Set ${STASH_DIR_ENV} to a directory, or unset it.` };
    }
  }
  const backend = envBackend(env);
  if (backend.kind === 'invalid-override') return backend;
  const account = envAccount(env);
  if (account.kind === 'invalid-override') return account;
  return { store: opened, backend, account };
}

/**
 * The person's session, resolved once from the environment and the store together.
 *
 * - Any credential variable selects the environment as the credential source;
 *   it needs CONSTRUCTIVE_USER_ID, CONSTRUCTIVE_ACCESS_TOKEN and the backend
 *   from CONSTRUCTIVE_API_ENDPOINT.
 * - An endpoint override alone gives that backend `signed-out`, unless it names
 *   exactly the backend of the stored context, whose session then applies.
 * - Otherwise the stored context `context` (default: the active one) and the
 *   session filed under it, used only when the context's auth endpoint issued it.
 * - A `context` named while the environment decides the session is `conflict`.
 *
 * Returns `invalid-override` or `conflict` rather than throwing for a wrong
 * environment. Throws `ContextNameError` for a `context` that is not a valid name.
 */
export function resolveSession({ context, env = process.env, store }: ResolveOptions = {}): PersonSession {
  const prepared = prepare({ context, env, store });
  if ('kind' in prepared) return prepared;
  const { store: opened, backend, account } = prepared;

  if (account.kind === 'account') {
    if (backend.kind === 'none') {
      return {
        kind: 'invalid-override',
        variable: 'CONSTRUCTIVE_API_ENDPOINT',
        problem: 'The credential comes from the environment, but CONSTRUCTIVE_API_ENDPOINT is not set, so it names no backend to send it to.',
        fix: 'Set CONSTRUCTIVE_API_ENDPOINT to the api endpoint the credential belongs to.'
      };
    }
    if (context !== undefined) return conflict(context, CREDENTIAL_VARS.find((name) => isSet(env, name)), backend.backend, 'credential');
    return { kind: 'signed-in', source: 'env', context: null, backend: backend.backend, account: account.account };
  }

  const stored = storedSession(opened, context);
  if (backend.kind === 'none') return stored;
  const storedBackend = stored.kind === 'signed-in' || stored.kind === 'signed-out' || stored.kind === 'issuer-mismatch' ? stored.backend : null;
  if (storedBackend && sameBackend(storedBackend, backend.backend)) return stored;
  if (context !== undefined) return conflict(context, 'CONSTRUCTIVE_API_ENDPOINT', backend.backend, 'backend');
  return { kind: 'signed-out', source: 'env', context: null, backend: backend.backend };
}

function agentConflict(context: string, agent: string, variable: string): Extract<Session, { kind: 'conflict' }> {
  return {
    kind: 'conflict',
    context,
    variable,
    problem: `The agent "${agent}" was named, but ${variable} is set, so the environment would decide the session, not the agent.`,
    fix: `Name no agent to use the environment, or unset ${variable} and the other CONSTRUCTIVE_* credential and endpoint variables to act as the agent.`
  };
}

export const agentFix = (agent: string) => `Remove the agent "${agent}" and add it again, which needs the person signed in.`;

/** The fix for an agent whose key has ended or was refused: a new key keeps its principal and grants. */
export const renewFix = (agent: string) => `Renew the key of the agent "${agent}", which needs the person's password; if the agent was removed in the app, add it again.`;

/** An agent whose record and key can be used, bound to the context's backend; it carries no access token yet. */
export type AgentBinding = Exclude<ResolvedAgentSession, { kind: 'signed-in' }> | { kind: 'bound'; context: string; backend: BackendConfig; record: AgentRecord };

/**
 * The stored agent `agent` under the context `context` (default: the active
 * one), checked against the context's endpoints and its key's end, with no
 * request. With any CONSTRUCTIVE_* credential or endpoint variable set, it is
 * `conflict`: the environment would decide the session, not the agent.
 */
export function agentBinding({ agent, context: named, env = process.env, store }: ResolveOptions & { agent: string }): AgentBinding {
  checkAgentName(agent);
  const prepared = prepare({ context: named, env, store });
  if ('kind' in prepared) return prepared;
  const opened = prepared.store;
  const variable = OVERRIDE_ENV_VARS.find((name) => isSet(env, name));
  if (variable) return agentConflict(named ?? currentContextName(opened) ?? '', agent, variable);

  const context = named ?? currentContextName(opened);
  const stored = context ? readBackend(opened, context) : null;
  if (!stored) return { kind: 'no-backend', context: context ?? null };
  if (stored.status === 'incomplete') {
    return { kind: 'incomplete-backend', context, missing: stored.missing, ...(stored.apiEndpoint ? { apiEndpoint: stored.apiEndpoint } : {}) };
  }
  const unusable = (reason: AgentUnusableReason, problem: string, fix = agentFix(agent)): AgentUnusable => ({ kind: 'agent-unusable', context, agent, reason, problem, fix });
  let record: AgentRecord | null;
  try {
    record = readAgent(opened, context, agent);
  } catch (err) {
    if (err instanceof AgentRecordUnreadable) return unusable('set-up-again', err.message.replace('of the agent', `of the agent "${agent}"`));
    throw err;
  }
  if (!record) {
    return unusable('not-found', `There is no agent named "${agent}" under the context "${context}".`, `Add the agent first, or name one that exists.`);
  }
  const differs = differingPlanes(record.issuedFor, stored.backend);
  if (differs.length > 0) {
    const changes = differs.map((plane) => `the ${plane} endpoint is ${planeEndpoint(stored.backend, plane)}, but the agent was set up for ${planeEndpoint(record.issuedFor, plane)}`);
    return unusable('issuer-mismatch', `The agent "${agent}" was set up for another backend: ${changes.join('; ')}. Its credential is not used or sent anywhere.`);
  }
  if (Date.parse(record.keyExpiresAt) <= Date.now()) {
    return unusable('set-up-again', `The key of the agent "${agent}" ended at ${record.keyExpiresAt}.`, renewFix(agent));
  }
  return { kind: 'bound', context, backend: stored.backend, record };
}

function conflict(context: string, variable: string, backend: BackendConfig, what: 'credential' | 'backend'): Extract<Session, { kind: 'conflict' }> {
  const unset = what === 'credential' ? 'CONSTRUCTIVE_USER_ID, CONSTRUCTIVE_ACCESS_TOKEN and CONSTRUCTIVE_API_KEY' : 'CONSTRUCTIVE_API_ENDPOINT and the other CONSTRUCTIVE_*_ENDPOINT variables';
  return {
    kind: 'conflict',
    context,
    variable,
    problem: `The context "${context}" was named, but ${variable} is set, so the environment decides the session: the ${what} for ${backend.apiEndpoint}, not the context.`,
    fix: `Name no context to use the environment, or unset ${unset} to use the context.`
  };
}

/** The tools' account for a signed-in session: an agent's names the agent, so a plan says who makes the change. */
export function hostAccount(session: Extract<Session, { kind: 'signed-in' }>): HostAccount {
  const { account } = session;
  return {
    userId: account.userId,
    ...(account.email ? { email: account.email } : {}),
    ...(session.source === 'agent' ? { agent: { name: session.agent.name, principalId: session.agent.principalId } } : {}),
    accessToken: account.accessToken,
    ...(account.key.kind === 'active' ? { apiKey: account.key.apiKey } : {})
  };
}

export function hostBackendConfig(backend: BackendConfig): HostBackendConfig {
  return {
    apiEndpoint: backend.apiEndpoint,
    modulesEndpoint: backend.modulesEndpoint,
    agentEndpoint: backend.agentEndpoint,
    computeEndpoint: backend.computeEndpoint
  };
}

const planeList = (missing: readonly Plane[]) => `${missing.join(', ')} endpoint${missing.length > 1 ? 's' : ''}`;

/**
 * Why a session cannot be used, in one or two sentences with the fix, or null
 * for a session that is only absent or signed out. `repairHint` names the
 * command of the binary that stores a complete context. No secret is in it.
 */
export function sessionProblem(session: Session, repairHint = 'Store the context again with every endpoint.'): string | null {
  switch (session.kind) {
  case 'incomplete-backend':
    return `The backend context "${session.context}" lacks the ${planeList(session.missing)}, so it cannot be used; no endpoint is filled in on its own. ${repairHint}`;
  case 'invalid-override':
  case 'conflict':
  case 'agent-unusable':
    return `${session.problem} ${session.fix}`;
  case 'issuer-mismatch': {
    const where = `The session stored under "${session.context}"`;
    if (!session.issuedFor) {
      return `${where} does not record the backend it was issued for, so it is not used or sent anywhere: it may not come from ${session.backend.authEndpoint}. A new sign-in replaces it.`;
    }
    const { issuedFor } = session;
    const changes = session.differs.map((plane) => `the ${plane} endpoint is ${planeEndpoint(session.backend, plane)}, but the session was issued for ${planeEndpoint(issuedFor, plane)}`);
    return `${where} was issued for another backend: ${changes.join('; ')}. It is not used or sent anywhere. A new sign-in replaces it.`;
  }
  default:
    return null;
  }
}
