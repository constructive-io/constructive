import { CliError, type CommandContext, ExitCode, isCliError, type NextStep, type NextWord, type StepOptions } from '@agentic-kit/command';
import {
  classifyBackendErrors,
  configureHost,
  type DatabaseProbe,
  type HttpGraphQLResponse,
  probeBoundDatabase,
  readEnv
} from '@agentic-kit/db-tools';
import type { PlanAccount, ToolFailure, ToolFailureCode } from '@agentic-kit/harness';
import {
  agentSession,
  type AgentUnusableReason,
  type BackendConfig,
  backendFromEndpoints,
  checkAgentName,
  checkContextName,
  type ConfigStore,
  ContextNameError,
  type KeyRevocation,
  openStore,
  type PersonSession,
  type Plane,
  PLANES,
  type PreviousKey,
  type ResolvedAgentSession,
  resolveSession,
  sessionProblem,
  sessionToolsHost,
  SignInError,
  type SignInErrorKind,
  stashBaseDir
} from '@agentic-kit/session';
import { readFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

import type { CliCode } from './errors';

export const CLI_NAME = 'constructive';

const SIGN_IN_HINT = `Run \`${CLI_NAME} login\` to sign in.`;

/** What gives an agent a usable key again, as the person. */
const agentRenewHint = (agent: string): string => `Renew the key of the agent as the person signed in: \`${CLI_NAME} agent renew ${agent}\`, without --as.`;

/**
 * What to do when the backend refused an agent's access token: true before the run knows why, since a new token fixes
 * a token that was refused, and only a refused key needs the person.
 */
const agentCheckHint = (agent: string): string => `\`${CLI_NAME} whoami --as ${agent}\` says whether the agent can act, and what fixes it.`;

type Refused = { kind: 'invalid-override' } | { kind: 'conflict' };

/** The states of a person's session, and of an agent's under `--as`; `openSession` turns a wrong environment and a conflict into an error first. */
export type SessionState = PersonState | Exclude<ResolvedAgentSession, Refused>;

/** The states of a person's session. */
export type PersonState = Exclude<PersonSession, Refused>;

/** A next step that runs another command (`ctx.next`): each word a stored or given value becomes stays one argv word. */
export type NextBuilder = (words: readonly NextWord[], why: string, options?: StepOptions) => NextStep;

/** A step that acts as the person: the layer carries `--as` into every step, so this one leaves it out and keeps `--context` and `--cwd`. */
export const AS_PERSON: StepOptions = { drop: ['--as'] };

/** Why an agent cannot act, as the steps that fix it differ: its key ended or was refused, its backend changed, or no token could be minted for a moment. */
type AgentTrouble = 'renew' | 'set-up-again' | 'retry';

/** The steps, as the person, that let an agent act again: a new key, or for a backend that changed a new agent; a mint that failed for a moment has none. */
function agentSteps(next: NextBuilder, agent: string, trouble: AgentTrouble, interactive: boolean): NextStep[] {
  switch (trouble) {
  case 'renew':
    return [next(['agent', 'renew', agent, ...passwordWords(interactive)], 'Renew its key as the person: the agent keeps its principal and what it may do', AS_PERSON)];
  case 'set-up-again':
    return [
      next(['agent', 'remove', agent], 'Remove the agent as the person: its principal goes, and with it its key', AS_PERSON),
      next(['agent', 'add', agent, ...passwordWords(interactive)], 'Add it again as the person, for the backend of this context', AS_PERSON)
    ];
  case 'retry':
    return [];
  }
}

const TROUBLE: Record<AgentUnusableReason, AgentTrouble> = {
  'not-found': 'set-up-again',
  'issuer-mismatch': 'set-up-again',
  'set-up-again': 'renew',
  'mint-failed': 'retry'
};

/**
 * The stash, the backend context a command acts on (`--context`, else the
 * active one; null when none is chosen), the session resolved once from both
 * and the environment, and the builder of its next steps.
 */
export interface Session {
  store: ConfigStore;
  context: string | null;
  /** The context `--context` names; undefined when the run takes the active one or the environment. */
  namedContext: string | undefined;
  env: NodeJS.ProcessEnv;
  state: SessionState;
  next: NextBuilder;
  /** The agent `--as` names, whose credential the command uses; null for the person. */
  agent: string | null;
  /** The run can prompt, so a step to a command that needs the person's password leaves --password-stdin out. */
  interactive: boolean;
}

/** The person's session: what the commands that act only as the person work with. */
export interface PersonSessionHandle extends Omit<Session, 'state' | 'agent'> {
  state: PersonState;
  agent: null;
}

const placeholder = (name: string): NextWord => ({ placeholder: name });

function invalidOverride(variable: string, problem: string, fix: string): CliError {
  return new CliError<CliCode>({ code: 'invalid-override', message: problem, hint: fix, exitCode: ExitCode.usage, details: { variable } });
}

/** The shared store under `CONSTRUCTIVE_STASH_DIR`, or the `invalid-override` error for an empty one. */
export function openCliStore(env: NodeJS.ProcessEnv): ConfigStore {
  try {
    return openStore(stashBaseDir(env));
  } catch (error) {
    if (env.CONSTRUCTIVE_STASH_DIR !== '') throw error;
    throw invalidOverride('CONSTRUCTIVE_STASH_DIR', (error as Error).message, 'Set CONSTRUCTIVE_STASH_DIR to a directory, or unset it.');
  }
}

/** The name `--context` gives, checked: a context name is the stem of a file in the store. */
function namedContext(ctx: CommandContext): string | undefined {
  const named = ctx.globals.context as string | undefined;
  if (named === undefined) return undefined;
  try {
    return checkContextName(named);
  } catch (error) {
    if (!(error instanceof ContextNameError)) throw error;
    throw new CliError<CliCode>({ code: 'invalid-input', message: error.message, exitCode: ExitCode.usage, details: { flag: '--context' } });
  }
}

/** The name `--as` gives, checked like a context name, or undefined for the person. */
function namedAgent(ctx: CommandContext): string | undefined {
  const named = ctx.globals.as as string | undefined;
  if (named === undefined) return undefined;
  try {
    return checkAgentName(named);
  } catch (error) {
    throw new CliError<CliCode>({ code: 'invalid-input', message: (error as Error).message, exitCode: ExitCode.usage, details: { flag: '--as' } });
  }
}

/** Refuses `--as` on a command that acts only as the person: it signs in, signs out, or manages contexts or agents. */
export function personOnly(ctx: CommandContext, command: string): void {
  if (ctx.globals.as === undefined) return;
  throw new CliError<CliCode>({
    code: 'invalid-input',
    message: `${CLI_NAME} ${command} acts as the person who is signed in, never as an agent, so it takes no --as.`,
    hint: 'Run it without --as.',
    exitCode: ExitCode.usage,
    details: { flag: '--as' }
  });
}

/**
 * The session a command acts on: the person's (`--context`, else the active
 * context, or the environment), or under `--as` the agent's, through
 * `agentSession`, which mints a short access token with the agent's key when
 * the cached one is near its end.
 */
export async function openSession(ctx: CommandContext): Promise<Session> {
  const agent = namedAgent(ctx);
  if (agent === undefined) return openPersonSession(ctx);
  const { env } = ctx;
  const store = openCliStore(env);
  const named = knownContext(ctx, store);
  const state = await agentSession({ store, name: agent, context: named, env });
  if (state.kind === 'invalid-override') throw invalidOverride(state.variable, state.problem, state.fix);
  if (state.kind === 'conflict') {
    throw new CliError<CliCode>({ code: 'agent-conflict', message: state.problem, hint: state.fix, exitCode: ExitCode.usage, details: { flag: '--as', variable: state.variable } });
  }
  if (state.kind === 'agent-unusable' && state.reason === 'not-found') {
    throw new CliError<CliCode>({
      code: 'unknown-agent',
      message: state.problem,
      hint: state.fix,
      exitCode: ExitCode.usage,
      details: { flag: '--as', agent }
    });
  }
  return { store, context: named ?? store.getCurrentContext()?.name ?? null, namedContext: named, env, state, next: (words, why, options) => ctx.next(words, why, options), agent, interactive: ctx.interactive };
}

/** The context `--context` names, which must exist; undefined for the active one. */
function knownContext(ctx: CommandContext, store: ConfigStore): string | undefined {
  const named = namedContext(ctx);
  if (named !== undefined && !store.loadContext(named)) {
    const known = store.listContexts().map((context) => context.name);
    throw new CliError<CliCode>({
      code: 'unknown-context',
      message: `--context names "${named}", but there is no backend context with that name. Known contexts: ${known.join(', ') || '(none)'}.`,
      hint: 'Pass one of the known names, or add the backend with context add.',
      next: [ctx.next(['context', 'list'], 'List the contexts')],
      exitCode: ExitCode.usage
    });
  }
  return named;
}

/** The person's session, never an agent's: for the commands that act as the person, and for a sign-in step. */
export function openPersonSession(ctx: CommandContext): PersonSessionHandle {
  const { env } = ctx;
  const store = openCliStore(env);
  const named = knownContext(ctx, store);
  const state = resolveSession({ context: named, env, store });
  if (state.kind === 'invalid-override') throw invalidOverride(state.variable, state.problem, state.fix);
  if (state.kind === 'conflict') {
    throw new CliError<CliCode>({
      code: 'context-conflict',
      message: state.problem,
      hint: state.fix,
      exitCode: ExitCode.usage,
      details: { flag: '--context', variable: state.variable }
    });
  }
  return {
    store,
    context: named ?? store.getCurrentContext()?.name ?? null,
    namedContext: named,
    env,
    state,
    next: (words, why, options) => ctx.next(words, why, options),
    agent: null,
    interactive: ctx.interactive
  };
}

const PLANE_FLAG: Record<Exclude<Plane, 'api'>, string> = {
  auth: '--auth-endpoint',
  modules: '--modules-endpoint',
  agent: '--agent-endpoint',
  compute: '--compute-endpoint'
};

/**
 * The step that makes an incomplete context usable: `context add` under the
 * same name, keeping every plane it has, and a placeholder for each plane the
 * api host cannot derive. Without a stored api endpoint, removing it is the
 * only fix.
 */
export function repairStep(store: ConfigStore, name: string, next: NextBuilder): NextStep {
  const targets = store.loadContext(name)?.targets;
  const api = targets?.api?.endpoint;
  if (!api) return next(['context', 'remove', name], 'The context has no api endpoint to repair it from');
  let derived: BackendConfig | null = null;
  try {
    derived = backendFromEndpoints({ api });
  } catch {
    derived = null;
  }
  const flags = PLANES.filter((plane): plane is Exclude<Plane, 'api'> => plane !== 'api').flatMap((plane): NextWord[] => {
    const derivedValue = derived?.[`${plane}Endpoint` as keyof BackendConfig];
    const stored = targets?.[plane]?.endpoint;
    if (stored && stored !== derivedValue) return [PLANE_FLAG[plane], stored];
    return !stored && !derivedValue ? [PLANE_FLAG[plane], placeholder('url')] : [];
  });
  return next(['context', 'add', api, '--name', name, ...flags], 'The context lacks a plane; this rewrites them all');
}

/** What happened to the API key of a removed session, in words. */
export const KEY_TEXT: Record<KeyRevocation['kind'], string> = {
  revoked: 'the API key was revoked',
  absent: 'it had no API key',
  failed: 'the API key could not be revoked'
};

/** The warning for a key that could not be revoked: it stays valid until it expires. */
export function revocationWarning(key: KeyRevocation | PreviousKey, whose: string): string | undefined {
  return key.kind === 'failed' ? `The API key ${key.keyId} of ${whose} could not be revoked (${key.reason}), so it stays valid until it expires.` : undefined;
}

export function planeList(missing: readonly Plane[]): string {
  return `${missing.join(', ')} endpoint${missing.length > 1 ? 's' : ''}`;
}

function incompleteBackendError(session: Session, context: string, missing: readonly Plane[]): CliError {
  return new CliError<CliCode>({
    code: 'incomplete-backend',
    message: `The backend context "${context}" lacks the ${planeList(missing)}, so the command cannot reach that backend. Another app may have written it with fewer planes.`,
    hint: 'Store every plane of the context again; no plane is filled in on its own.',
    next: [repairStep(session.store, context, session.next)]
  });
}

/**
 * Points the database tools at the session's context, so a tool acts on the
 * same backend and account as the command. Fails with `incomplete-backend`
 * when the context lacks a plane.
 */
export function bindTools(session: Session): void {
  if (session.state.kind === 'incomplete-backend') throw incompleteBackendError(session, session.state.context, session.state.missing);
  configureTools(session);
}

/**
 * `bindTools` without the plane check, for a command that reports the state rather than acting on it. The CLI never
 * prepares an app in the project, so a new database comes with no clone and no install.
 */
export function configureTools(session: Session): void {
  configureHost({
    ...sessionToolsHost({
      signInHint: session.agent ? agentCheckHint(session.agent) : SIGN_IN_HINT,
      ...(session.namedContext ? { context: session.namedContext } : {}),
      env: session.env,
      ...(session.agent ? { agent: session.agent } : {})
    }),
    prewarmApp: false,
    reprovisionHint:
      `Run \`${CLI_NAME} db recreate <name>\` to bind this directory to a new database. ` +
      'The old database is kept; the new one starts with no tables and no records.'
  });
}

export interface ActiveBackend extends BackendConfig {
  source: 'context' | 'environment';
}

/** The backend the session talks to, or null when it has none it can use. A session another backend issued keeps the context's backend. */
export function activeBackend(session: Session): ActiveBackend | null {
  const { state } = session;
  if (state.kind !== 'signed-in' && state.kind !== 'signed-out' && state.kind !== 'issuer-mismatch') return null;
  return { source: state.source === 'env' ? 'environment' : 'context', ...state.backend };
}

export interface Credential {
  kind: 'api-key' | 'access-token';
  source: 'session' | 'environment' | 'agent';
  expiresAt?: string;
}

export interface ActiveAccount {
  userId: string;
  /** Unknown for an account given through the environment. */
  email?: string;
  credential: Credential;
}

/** The signed-in account, from the same resolution as `activeBackend`. */
export function activeAccount(session: Session): ActiveAccount | null {
  const { state } = session;
  if (state.kind !== 'signed-in') return null;
  const { account } = state;
  // An agent's account is the person's: their email is the one the person's own stored session records.
  const email = account.email ?? (state.source === 'agent' ? session.store.getCredentials(state.context)?.email : undefined);
  const kind = account.key.kind === 'active' ? 'api-key' : 'access-token';
  const expiresAt = account.key.kind === 'active' ? account.key.expiresAt : account.accessTokenExpiresAt;
  return {
    userId: account.userId,
    ...(email ? { email } : {}),
    credential: { kind, source: state.source === 'env' ? 'environment' : state.source === 'agent' ? 'agent' : 'session', ...(expiresAt ? { expiresAt } : {}) }
  };
}

/** The account a plan names: the person, and under --as the agent that makes the change for them. */
export function planAccount(session: Session): PlanAccount {
  const account = activeAccount(session);
  const { state } = session;
  return {
    userId: account?.userId ?? controlPlane(session).userId,
    ...(account?.email ? { email: account.email } : {}),
    ...(state.kind === 'signed-in' && state.source === 'agent' ? { agent: { name: state.agent.name, principalId: state.agent.principalId } } : {})
  };
}

const LOGIN_TO_BACKEND = (next: NextBuilder, interactive: boolean): NextStep =>
  next(['login', '--api-endpoint', placeholder('url'), '--email', placeholder('email'), ...passwordWords(interactive)], 'Choose a backend and sign in');

/**
 * The steps that give the session a usable credential. Under `--as` they act
 * as the person, so they leave `--as` out: renew the agent's key, set the agent
 * up again, or choose or repair the backend first. A mint that failed for a
 * moment has none: retry.
 */
export function signInSteps(session: Session): NextStep[] {
  const { state } = session;
  if (session.agent) {
    if (state.kind === 'agent-unusable') return agentSteps(session.next, session.agent, TROUBLE[state.reason], session.interactive);
    // A minted token the backend refused: the agent was removed, or its key revoked.
    if (state.kind === 'signed-in') return agentSteps(session.next, session.agent, 'renew', session.interactive);
    // No backend or an incomplete one: the person chooses or repairs it first.
    const person: NextBuilder = (words, why) => session.next(words, why, AS_PERSON);
    return signInSteps({ ...session, agent: null, next: person });
  }
  switch (state.kind) {
  case 'incomplete-backend':
    return [repairStep(session.store, state.context, session.next)];
  case 'no-backend':
    return [LOGIN_TO_BACKEND(session.next, session.interactive)];
  case 'issuer-mismatch':
  case 'signed-out':
  case 'signed-in':
    // The layer repeats a --context of this run in every step, and login signs in to the context the run resolved.
    return [session.next(['login', '--email', placeholder('email'), ...passwordWords(session.interactive)], 'Sign in')];
  case 'agent-unusable':
    return [];
  default: {
    const unknown: never = state;
    throw new Error(`Unknown session state ${JSON.stringify(unknown)}.`);
  }
  }
}

type UnusableAgent = Extract<SessionState, { kind: 'agent-unusable' }>;

/**
 * An agent that cannot act: what is wrong and its fix, from the session package. A mint that failed is a safe retry
 * (exit 1, no step), since the key is unchanged; every other reason is exit 4 with the steps the person takes.
 */
function agentUnusableError(session: Session, state: UnusableAgent): CliError {
  const next = signInSteps(session);
  const retry = TROUBLE[state.reason] === 'retry';
  return new CliError<CliCode>({
    code: 'agent-unusable',
    message: state.problem,
    hint: state.fix,
    ...(next.length ? { next } : {}),
    exitCode: retry ? ExitCode.failure : ExitCode.signInRequired,
    ...(retry ? { retryable: true } : {}),
    details: { agent: state.agent, reason: state.reason }
  });
}

/** The agent's state when the backend refused a newly minted token too: the person renews its key. */
function refusedAgain(session: Session): Session {
  const agent = session.agent ?? '';
  const state: UnusableAgent = {
    kind: 'agent-unusable',
    context: session.context ?? '',
    agent,
    reason: 'set-up-again',
    problem: `The backend refused a newly minted access token of the agent "${agent}" too, so the agent cannot act.`,
    fix: agentRenewHint(agent)
  };
  return { ...session, state };
}

/** What a step that the backend refused under --as came to: `R` is the outcome that is the refusal. */
export type AgentStep<T, R extends T> =
  | { kind: 'done'; outcome: T }
  | { kind: 'not-run-again'; refused: R }
  | { kind: 'unusable'; refused: R; session: Session };

export interface StepRun<T, R extends T> {
  /** Whether the step may run once more with the new token: true for one that changes nothing, a read or a plan. */
  again: boolean;
  /** Runs the step; once more, with the session of the new token. */
  run(renewed?: Session): Promise<T>;
  /** Whether an outcome is the backend refusing the agent's access token as signed out. */
  refused(outcome: T): outcome is R;
}

/**
 * The one place where a refused agent token gets one new token, for the commands and the MCP tools alike. Under --as,
 * when the backend refused the agent's access token as signed out, the cached token is dropped and one is minted from
 * the key (or the one another process cached meanwhile is used). A step that changes nothing then runs once more. A
 * change does not run again by itself, since a later request of it may be the one refused after earlier ones applied.
 * No new token, or a refusal of the new one too, is an agent the person makes usable again.
 */
export async function agentStep<T, R extends T>(ctx: CommandContext, step: StepRun<T, R> & { again: true }): Promise<Exclude<AgentStep<T, R>, { kind: 'not-run-again' }>>;
export async function agentStep<T, R extends T>(ctx: CommandContext, step: StepRun<T, R>): Promise<AgentStep<T, R>>;
export async function agentStep<T, R extends T>(ctx: CommandContext, step: StepRun<T, R>): Promise<AgentStep<T, R>> {
  const first = await step.run();
  if (ctx.globals.as === undefined || !step.refused(first)) return { kind: 'done', outcome: first };
  const session = await openSession(ctx);
  const { state } = session;
  if (state.kind !== 'signed-in') return { kind: 'done', outcome: first };
  const reminted = await agentSession({ store: session.store, name: session.agent, context: state.context, env: session.env, rejectedToken: state.account.accessToken });
  if (reminted.kind === 'invalid-override' || reminted.kind === 'conflict') return { kind: 'done', outcome: first };
  const renewed: Session = { ...session, state: reminted };
  if (reminted.kind !== 'signed-in') return { kind: 'unusable', refused: first, session: renewed };
  if (!step.again) return { kind: 'not-run-again', refused: first };
  const again = await step.run(renewed);
  return step.refused(again) ? { kind: 'unusable', refused: again, session: refusedAgain(renewed) } : { kind: 'done', outcome: again };
}

/** What follows a change refused under --as once a new token was minted, in place of advice to renew the key. */
export const newTokenWords = (agent: string): string =>
  `The backend refused the access token of the agent "${agent}", so a new one was minted; the change was not made again by itself.`;

function renewedChangeError(ctx: CommandContext, error: CliError): CliError {
  const why = ctx.yes
    ? 'Run it again with the new token: it keeps --yes, as given, so it makes the change without stopping at its plan'
    : 'Run it again with the new token: it makes its plan again and stops there without --yes';
  return new CliError<CliCode>({
    code: 'signed-out',
    message: `${error.message} ${newTokenWords(String(ctx.globals.as))}`,
    hint: 'Run the same command again: it makes its plan again with the new token. Part of the change may already have been made, so read the state first.',
    exitCode: ExitCode.failure,
    retryable: true,
    next: [ctx.followUp([], { why })],
    ...(error.details === undefined ? {} : { details: error.details })
  });
}

type Settled<T> = { value: T } | { error: unknown };
type SignedOut = { error: CliError };

async function settle<T>(run: () => Promise<T>): Promise<Settled<T>> {
  try {
    return { value: await run() };
  } catch (error) {
    return { error };
  }
}

const signedOut = <T>(outcome: Settled<T>): outcome is SignedOut & Settled<T> => 'error' in outcome && isCliError(outcome.error) && outcome.error.code === 'signed-out';

/** One step of a command (a read, a plan, an apply, a change that runs at once) through `agentStep`; `again` for a read or a plan. */
export async function retryRejectedAgent<T>(ctx: CommandContext, again: boolean, run: () => Promise<T>): Promise<T> {
  const step = await agentStep(ctx, { again, run: () => settle(run), refused: signedOut });
  switch (step.kind) {
  case 'done':
    if ('error' in step.outcome) throw step.outcome.error;
    return step.outcome.value;
  case 'not-run-again':
    throw renewedChangeError(ctx, step.refused.error);
  case 'unusable':
    throw signedOutError(step.session);
  }
}

export function signedOutError(session: Session): CliError {
  const { state } = session;
  if (state.kind === 'incomplete-backend') return incompleteBackendError(session, state.context, state.missing);
  if (state.kind === 'agent-unusable') return agentUnusableError(session, state);
  const problem = sessionProblem(state);
  const where = state.kind === 'signed-out' && state.source === 'env'
    ? ` to the backend CONSTRUCTIVE_API_ENDPOINT names (${state.backend.apiEndpoint}); a stored session is only used with the endpoints of its own context`
    : session.context ? ` to the backend "${session.context}"` : '';
  return new CliError<CliCode>({
    code: 'signed-out',
    message: problem ?? `No one is signed in${where}.`,
    hint: SIGN_IN_HINT,
    next: signInSteps(session),
    exitCode: ExitCode.signInRequired
  });
}

/** What a request to the platform api needs, or the error that says what is missing. */
export interface ControlPlane {
  endpoint: string;
  bearer: string;
  userId: string;
}

export function controlPlane(session: Session): ControlPlane {
  const { state } = session;
  switch (state.kind) {
  case 'signed-in':
    return {
      endpoint: state.backend.apiEndpoint,
      bearer: state.account.key.kind === 'active' ? state.account.key.apiKey : state.account.accessToken,
      userId: state.account.userId
    };
  case 'signed-out':
  case 'incomplete-backend':
  case 'issuer-mismatch':
  case 'agent-unusable':
    throw signedOutError(session);
  case 'no-backend':
    throw new CliError<CliCode>({
      code: 'no-backend',
      message: 'No Constructive backend is chosen.',
      hint: 'Sign in with login and --api-endpoint, or set CONSTRUCTIVE_API_ENDPOINT.',
      next: [LOGIN_TO_BACKEND(session.next, session.interactive)]
    });
  default: {
    const unknown: never = state;
    throw new Error(`Unknown session state ${JSON.stringify(unknown)}.`);
  }
  }
}

/** A failed backend answer as a `CliError`, with the codes the tools use. `action` says what was attempted. */
export function backendError(response: HttpGraphQLResponse<unknown>, action: string, session: Session): CliError {
  const message = `${action} failed: ${response.errors.map((error) => error.message).join('; ')}`;
  switch (classifyBackendErrors(response.errors)) {
  case 'network':
  case 'server':
    return new CliError<CliCode>({ code: 'backend-unreachable', message, hint: 'Check that the backend is running, then retry.', retryable: true });
  case 'auth':
    return new CliError<CliCode>({ code: 'signed-out', message, hint: session.agent ? agentCheckHint(session.agent) : SIGN_IN_HINT, next: signInSteps(session), exitCode: ExitCode.signInRequired });
  case 'forbidden':
    return new CliError<CliCode>({ code: 'permission-denied', message });
  case 'suspended':
    return new CliError<CliCode>({ code: 'database-unavailable', message: `${message}. The database was deleted or is suspended.` });
  default:
    return new CliError<CliCode>({ code: 'failed', message });
  }
}

/** The binding of `cwd`: its `.env`, read as variables; empty when there is none. */
async function binding(cwd: string): Promise<Record<string, string>> {
  try {
    return readEnv(await readFile(path.join(cwd, '.env'), 'utf8'));
  } catch {
    return {};
  }
}

/**
 * A value of the project binding: absent, one that passes its check, or one that does not. The `.env` of a cloned
 * project is not the person's text, so a value that fails its check is never shown or put into a step.
 */
export type BoundValue = { status: 'absent' } | { status: 'valid'; value: string } | { status: 'invalid' };

async function boundValue(cwd: string, key: string, valid: (value: string) => boolean): Promise<BoundValue> {
  const value = (await binding(cwd))[key];
  if (!value) return { status: 'absent' };
  return valid(value) ? { status: 'valid', value } : { status: 'invalid' };
}

const DATABASE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The DATABASE_ID in the `.env` of `cwd`, checked as a database id, which is a UUID. */
export const boundDatabaseId = (cwd: string): Promise<BoundValue> => boundValue(cwd, 'DATABASE_ID', (value) => DATABASE_ID.test(value));

/** The key of the project binding that names the agent `setup agent` set the project up for. */
export const AGENT_BINDING_KEY = 'CONSTRUCTIVE_AGENT';

const isAgentName = (value: string): boolean => {
  try {
    checkAgentName(value);
    return true;
  } catch {
    return false;
  }
};

/** The agent the binding of `cwd` names, checked as an agent name: a run still acts as the person unless it says --as. */
export const boundAgent = (cwd: string): Promise<BoundValue> => boundValue(cwd, AGENT_BINDING_KEY, isAgentName);

/** `invalid`: the DATABASE_ID of `.env` is not a database id, so it names no database, and it is not sent anywhere. */
export type DatabaseState = { status: 'unbound' } | { status: 'invalid' } | DatabaseProbe;

/** The database `cwd` is bound to, probed on the backend. Call `bindTools` first. */
export async function databaseState(cwd: string): Promise<DatabaseState> {
  const bound = await boundDatabaseId(cwd);
  switch (bound.status) {
  case 'absent':
    return { status: 'unbound' };
  case 'invalid':
    return { status: 'invalid' };
  case 'valid':
    return probeBoundDatabase(bound.value);
  }
}

type Step = (next: NextBuilder) => NextStep;

const SCHEMA_SHOW: Step = (next) => next(['schema', 'show'], 'See the tables and fields as they are now');
const DB_STATUS: Step = (next) => next(['db', 'status'], 'See the state of the database of this directory');
const DB_LIST: Step = (next) => next(['db', 'list'], 'See the databases this account has');
const DB_CREATE: Step = (next) => next(['db', 'create', placeholder('database_name')], 'Create a database for this directory');
const DB_USE: Step = (next) => next(['db', 'use', placeholder('name-or-id')], 'Bind this directory to a database you already have');
const DB_RECREATE: Step = (next) => next(['db', 'recreate', placeholder('database_name')], 'Bind this directory to a new database in place of one that is gone or not yours');
const WHOAMI: Step = (next) => next(['whoami'], 'See which account the command ran as');
const STATUS: Step = (next) => next(['status'], 'See whether the backend answers');

/** The steps `steps` gives, built for the run of `ctx`. */
const steps = (...list: Step[]) => (ctx: CommandContext): NextStep[] => list.map((step) => step((words, why) => ctx.next(words, why)));

const signIn = (why: string) => (ctx: CommandContext): NextStep[] =>
  ctx.globals.as === undefined
    ? signInSteps(openPersonSession(ctx)).map((step) => ({ ...step, why }))
    : agentSteps((words, reason, options) => ctx.next(words, reason, options), String(ctx.globals.as), 'renew', ctx.interactive);

/** The codes whose step is the sign-in of the run's session (`login`, or the repair of an incomplete context), which no fixed words can name. */
export const SESSION_STEP_CODES: ReadonlySet<ToolFailureCode> = new Set<ToolFailureCode>(['signed-out', 'step-up-required']);

/**
 * The commands only the CLI knows that help after a failure (sign-in, status,
 * the db commands), for every failure code the tools have. The calls a tool
 * suggests come before them, so an entry never repeats one; an empty list is
 * the decision that the CLI adds none. A new code does not compile until it
 * has an entry.
 */
/**
 * With no app in the project, db codegen cannot generate the app's SDK: the CLI's own codegen generates an ORM client
 * from the endpoint the failure names, into the project. Its output is given in full, because codegen writes relative
 * to the directory the shell is in, which --cwd does not change. Codegen signs in as no one, so the step has no --as.
 */
const generateWithoutApp = (ctx: CommandContext, failure: ToolFailure): NextStep[] => {
  const endpoint = failure.context?.appEndpoint;
  return [
    ctx.next(
      ['codegen', '--endpoint', typeof endpoint === 'string' ? endpoint : placeholder('app-endpoint'), '--orm', '--output', path.join(ctx.cwd, 'codegen')],
      "This project has no app, so db codegen cannot write the app's SDK: this generates an ORM client from the database's API into ./codegen instead",
      AS_PERSON
    )
  ];
};

export const FAILURE_NEXT: Record<ToolFailureCode, (ctx: CommandContext, failure: ToolFailure) => NextStep[]> = {
  'invalid-input': (ctx) => [ctx.followUp(['--schema'], { why: 'See every input property', drop: ['yes'] })],
  'query-too-large': steps(),
  'not-found': steps(),
  'name-taken': steps(),
  conflict: steps(),
  'no-rows-changed': steps(),
  partial: steps(SCHEMA_SHOW),
  'permission-denied': steps(WHOAMI),
  'read-only': steps(WHOAMI),
  unsupported: steps(),
  'plan-required': steps(),
  'limit-reached': steps(DB_LIST),
  'signed-out': signIn('Sign in'),
  'step-up-required': signIn('Sign in again: this change needs a fresh sign-in'),
  'app-signed-out': steps(),
  'no-env': steps(DB_USE, DB_LIST),
  'no-backend': (ctx) => [LOGIN_TO_BACKEND((words, why) => ctx.next(words, why), ctx.interactive)],
  'missing-credentials': steps(DB_USE, DB_LIST),
  'backend-unreachable': steps(STATUS),
  'account-mismatch': steps(WHOAMI, DB_RECREATE),
  'db-missing': steps(DB_RECREATE, DB_LIST),
  'db-suspended': steps(DB_STATUS),
  'database-unavailable': steps(DB_STATUS),
  'app-missing': generateWithoutApp,
  'schema-unresolved': steps(DB_STATUS),
  'binding-live': steps(DB_STATUS),
  'binding-changed': steps(DB_STATUS),
  'binding-not-saved': steps(DB_STATUS),
  'env-write-failed': steps(DB_USE),
  'reprovision-not-allowed': steps(DB_STATUS),
  'pending-other': steps(),
  'provision-pending': steps(),
  'provision-stuck': steps(DB_STATUS),
  'ticket-lost': steps(),
  'rate-limited': steps(),
  unverified: steps(),
  failed: steps()
};

/** The `failureNext` of every command that reports a tool failure; the adapter puts the calls the tool suggests first. */
export function failureNext(failure: ToolFailure, ctx: CommandContext): NextStep[] {
  return FAILURE_NEXT[failure.code](ctx, failure);
}

export function databaseNext(state: DatabaseState, session: Session): NextStep[] {
  switch (state.status) {
  case 'unbound':
    return [DB_CREATE(session.next), DB_USE(session.next)];
  case 'invalid':
    return [];
  case 'found':
    return [SCHEMA_SHOW(session.next)];
  case 'missing':
    return [DB_RECREATE(session.next)];
  case 'suspended':
    return [];
  case 'unreachable':
    return state.cause === 'auth' ? signInSteps(session) : [session.next(['status'], 'Retry once the backend answers')];
  default: {
    const unknown: never = state;
    throw new Error(`Unknown database state ${JSON.stringify(unknown)}.`);
  }
  }
}

export function databaseText(state: DatabaseState): string {
  switch (state.status) {
  case 'unbound':
    return 'This directory is not bound to a database.';
  case 'invalid':
    return "The DATABASE_ID in this directory's .env is not a database id, so the directory is bound to no database, and the value is not shown. Fix the line or remove it, then bind the directory again.";
  case 'found':
    return `Bound to the database "${state.name ?? '?'}" (ID ${state.databaseId}), which is live.`;
  case 'suspended':
    return `Bound to the database "${state.name ?? '?'}" (ID ${state.databaseId}), which is suspended since ${state.suspendedAt}${state.suspendedReason ? ` (${state.suspendedReason})` : ''}. Its data is kept.`;
  case 'missing':
    return `Bound to the database ${state.databaseId}, but it no longer exists on this backend, or this account lost access to it.`;
  case 'unreachable':
    return `Bound to the database ${state.databaseId}, but its state is unknown: ${state.detail}`;
  default: {
    const unknown: never = state;
    throw new Error(`Unknown database state ${JSON.stringify(unknown)}.`);
  }
  }
}

const SIGN_IN_FAILURE: Record<SignInErrorKind, { code: CliCode; hint: string; exitCode?: number; retryable?: boolean }> = {
  'invalid-input': { code: 'invalid-input', hint: 'Pass the email and the password.', exitCode: ExitCode.usage },
  'invalid-credentials': { code: 'invalid-credentials', hint: 'Check the email and the password, then retry.', exitCode: ExitCode.signInRequired },
  'second-factor-required': { code: 'second-factor-required', hint: 'This account needs a second factor; sign in through the app until the CLI supports it.', exitCode: ExitCode.signInRequired },
  refused: { code: 'sign-in-refused', hint: 'The server refused this sign-in, or made no key for it; the message says why. Wait, or ask an administrator.' },
  'backend-unreachable': { code: 'backend-unreachable', hint: 'Check that the backend is running and that the endpoint is right, then retry.', retryable: true },
  'server-error': { code: 'backend-error', hint: 'The backend failed; retry later.', retryable: true }
};

/** A failed password sign-in (of login, or the fresh one a key for an agent needs) as the error of the command. */
export function signInFailed(error: SignInError): CliError {
  const failure = SIGN_IN_FAILURE[error.kind];
  return new CliError<CliCode>({
    code: failure.code,
    message: error.message,
    hint: failure.hint,
    ...(failure.exitCode ? { exitCode: failure.exitCode } : {}),
    ...(failure.retryable ? { retryable: true } : {}),
    ...(error.code ? { details: { serverCode: error.code } } : {})
  });
}

async function readStdin(stdin: CommandContext['stdin']): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export const NO_PROMPT_CAUSE = 'prompts are off, because there is no terminal or --no-input was given';

/**
 * The person's password, from stdin with --password-stdin or from a prompt on a terminal; never a flag value. `command`
 * names the command in the error, `prompt` is what the prompt asks, and `cause` says what the password is for.
 */
export async function readPassword(ctx: CommandContext, { stdin, command, prompt, cause }: { stdin: boolean | undefined; command: string; prompt: string; cause: string }): Promise<string> {
  if (stdin) {
    const password = (await readStdin(ctx.stdin)).replace(/\r?\n$/, '');
    if (password) return password;
    throw new CliError<CliCode>({
      code: 'invalid-input',
      message: '--password-stdin read an empty password from stdin.',
      hint: `Pipe the password into the command, for example: printf %s "$PASSWORD" | ${CLI_NAME} ${command} --password-stdin.`,
      exitCode: ExitCode.usage,
      details: { flag: '--password-stdin' }
    });
  }
  if (!ctx.interactive) {
    throw new CliError<CliCode>({
      code: 'missing-input',
      message: `"${CLI_NAME} ${command}" needs the person's password, from a prompt or from stdin with --password-stdin; it never takes one as a flag value.`,
      cause: `${cause} No password was piped, and ${NO_PROMPT_CAUSE}.`,
      hint: 'Pipe the password into the command and pass --password-stdin.',
      exitCode: ExitCode.usage,
      details: { flag: '--password-stdin', missing: ['--password-stdin'] },
      next: [ctx.followUp(passwordWords(false), { why: "Run it again with the person's password piped to stdin" })]
    });
  }
  ctx.stderr.write(`${cause}\n`);
  // The prompt line shows the question's name as a flag, so it is named after the one flag that gives a password.
  const answers = await ctx.prompter.prompt<{ 'password-stdin'?: string }>({}, [{ type: 'password', name: 'password-stdin', message: prompt, required: true }]);
  return String(answers['password-stdin'] ?? '');
}

/** The flag of every command that needs the person's password. */
export const PASSWORD_STDIN = { password_stdin: z.boolean().optional().describe("Read the person's password from stdin; on a terminal it is asked for") };

/** The words a step to a command that needs the person's password adds on a run that cannot prompt, where only stdin can give it. */
export const passwordWords = (interactive: boolean): string[] => (interactive ? [] : ['--password-stdin']);

/** What the plan of a change that makes a key needs when the run did not pass the flag (`Planned.needs`). */
export const passwordNeeds = (given: boolean | undefined): { needs?: string[] } => (given ? {} : { needs: passwordWords(false) });
