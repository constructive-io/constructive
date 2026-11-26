import { CliError, type CommandContext, ExitCode, type ImmediateCommand, type InputSchema, type NextStep, type NextWord, type ReadCommand } from '@agentic-kit/command';
import {
  type AgentIdentity,
  type BackendConfig,
  backendFromEndpoints,
  checkContextName,
  ContextNameError,
  type CredentialCheck,
  EndpointError,
  keyEndsSoon,
  type KeyRevocation,
  listAgents,
  type Plane,
  sessionProblem,
  signIn,
  SignInError,
  signOut,
  verifySession
} from '@agentic-kit/session';
import { createFetch } from '@constructive-io/fetch';
import { z } from 'zod';

import type { CliCode } from '../errors';
import {
  type ActiveAccount,
  activeAccount,
  type ActiveBackend,
  activeBackend,
  AGENT_BINDING_KEY,
  agentStep,
  boundAgent,
  CLI_NAME,
  configureTools,
  databaseNext,
  type DatabaseState,
  databaseState,
  databaseText,
  KEY_TEXT,
  NO_PROMPT_CAUSE,
  openCliStore,
  openPersonSession,
  openSession,
  PASSWORD_STDIN,
  passwordWords,
  personOnly,
  planeList,
  readPassword,
  repairStep,
  revocationWarning,
  type Session,
  signedOutError,
  signInFailed,
  signInSteps
} from '../session';
import { mayWords } from './agents';

const LoginInput = z.object({
  email: z.string().describe('Email of the account'),
  api_endpoint: z
    .string()
    .optional()
    .describe('The api GraphQL endpoint of the backend, for example https://api.example.com/graphql. Default: the backend CONSTRUCTIVE_API_ENDPOINT names, else the backend of the context'),
  ...PASSWORD_STDIN
});

type LoginInput = z.output<typeof LoginInput>;

/** The agent `--as` names, as `whoami` and `status` show it: whose it is is the account; no secret. */
export type AgentView = AgentIdentity;

/** Who is signed in where; `login` and `whoami` return it. `check` is what the backend said of the credential. */

export interface WhoamiData {
  context: string | null;
  apiEndpoint: string | null;
  /** The person: under --as, the agent's owner. */
  account: { userId: string; email?: string };
  credential: ActiveAccount['credential'];
  check: CredentialCheck;
  agent?: AgentView;
  /** Without --as: the agent the project binding names, whose run this is not. */
  projectAgent?: ProjectAgent;
}

/** The agent `setup agent` recorded in the project binding (`.env`), or an entry there that is not an agent name, which is never shown. */
export type ProjectAgent = { name: string } | { invalid: true };

/** The agent of the project, for a run without --as: that run acts as the person, so a program that means to act as the agent must say --as. */
async function projectAgentOf(session: Session, cwd: string): Promise<ProjectAgent | undefined> {
  if (session.agent !== null) return undefined;
  const bound = await boundAgent(cwd);
  switch (bound.status) {
  case 'absent':
    return undefined;
  case 'invalid':
    return { invalid: true };
  case 'valid':
    return { name: bound.value };
  }
}

const projectAgentLine = (agent: ProjectAgent): string =>
  'invalid' in agent
    ? `The project's ${AGENT_BINDING_KEY} entry in .env is not a valid agent name, so it names no agent, and it is not shown; this run acts as the person. ` +
      `Run "${CLI_NAME} setup agent <name>" to name the agent of this project again, or remove the line.`
    : `This project is set up for the agent "${agent.name}" (${AGENT_BINDING_KEY} in .env), but this run acts as the person, with the person's rights. ` +
      `Run ${CLI_NAME} commands with --as ${agent.name} to act as that agent.`;

const projectAgentStep = (ctx: CommandContext, command: string, agent: ProjectAgent): NextStep =>
  'invalid' in agent
    ? ctx.next(['setup', 'agent', placeholder('name')], `Name the agent of this project again: it replaces the ${AGENT_BINDING_KEY} entry of .env`)
    : ctx.next([command, '--as', agent.name], `Run it as the agent "${agent.name}" of this project, with its own credential`);

const agentOf = (session: Session): AgentView | undefined =>
  session.state.kind === 'signed-in' && session.state.source === 'agent' ? session.state.agent : undefined;

/** Who the agent is, whose, what it may do, and when its key ends. */
function agentLine(agent: AgentView, owner: { userId: string; email?: string }): string {
  return `Acting as the agent "${agent.name}" of ${owner.email ?? `user ${owner.userId}`}: it ${mayWords(agent.schemaChanges)}. ` +
    `Its access token ends ${agent.accessExpiresAt}, and its key, which mints the next one, ends ${agent.keyExpiresAt}; then the person renews it with "${CLI_NAME} agent renew ${agent.name}".`;
}

/** The warning that a key ends within a week: the person signs in again, or renews the agent's key. */
function keyEndWarning(session: Session, account: ActiveAccount): string | undefined {
  const agent = agentOf(session);
  if (agent) {
    return keyEndsSoon({ expiresAt: agent.keyExpiresAt })
      ? `The key of the agent "${agent.name}" ends ${agent.keyExpiresAt}: the person renews it with "${CLI_NAME} agent renew ${agent.name}".`
      : undefined;
  }
  return account.credential.source === 'session' && keyEndsSoon({ expiresAt: account.credential.expiresAt })
    ? `Your key ends ${account.credential.expiresAt}: sign in again with "${CLI_NAME} login" before then.`
    : undefined;
}

function usageError(code: CliCode, message: string, extra: { cause?: string; hint?: string; flag: string; next?: NextStep[] }): CliError {
  return new CliError<CliCode>({ code, message, cause: extra.cause, hint: extra.hint, next: extra.next, exitCode: ExitCode.usage, details: { flag: extra.flag } });
}

const placeholder = (name: string): NextWord => ({ placeholder: name });

/** The backend to sign in to, the context to file the session under (null: the default name), and where the backend came from. */
interface LoginTarget {
  backend: BackendConfig;
  context: string | null;
  from: string;
}

function endpointBackend(endpoint: string, ctx: CommandContext): BackendConfig {
  try {
    return backendFromEndpoints({ api: endpoint });
  } catch (error) {
    if (!(error instanceof EndpointError)) throw error;
    if (error.reason !== 'not-derivable') {
      throw usageError('invalid-input', error.message, { hint: 'Pass the api GraphQL endpoint, for example --api-endpoint https://api.example.com/graphql.', flag: '--api-endpoint' });
    }
    // The layer repeats a --context of this run in every step, so a named context is not written twice.
    const named = ctx.globals.context as string | undefined;
    throw usageError('invalid-input', error.message, {
      hint: 'Add the backend with every plane first, then sign in to that context.',
      flag: '--api-endpoint',
      next: [
        ctx.next(['context', 'add', endpoint, '--name', named ?? placeholder('name'), ...(['auth', 'modules', 'agent', 'compute'].flatMap((plane) => [`--${plane}-endpoint`, placeholder('url')]))], 'Add the backend with every plane'),
        ctx.next(['login', ...(named ? [] : ['--context', placeholder('name')]), '--email', placeholder('email'), ...passwordWords(ctx.interactive)], 'Then sign in to it')
      ]
    });
  }
}

/** `--context` checked, without requiring the context to exist: a sign-in may file a new one. */
function contextToFile(ctx: CommandContext): string | null {
  const named = ctx.globals.context as string | undefined;
  if (named === undefined) return null;
  try {
    return checkContextName(named);
  } catch (error) {
    if (!(error instanceof ContextNameError)) throw error;
    throw usageError('invalid-input', error.message, { flag: '--context' });
  }
}

/**
 * Where `login` signs in: --api-endpoint (filed under --context when given),
 * else the backend the resolved session names (CONSTRUCTIVE_API_ENDPOINT, else
 * the context), else a prompt.
 */
async function loginTarget(input: LoginInput, ctx: CommandContext): Promise<LoginTarget> {
  if (input.api_endpoint !== undefined) return { backend: endpointBackend(input.api_endpoint, ctx), context: contextToFile(ctx), from: '--api-endpoint' };
  const session = openPersonSession(ctx);
  const { state } = session;
  switch (state.kind) {
  case 'signed-in':
  case 'signed-out':
  case 'issuer-mismatch':
    return { backend: state.backend, context: state.context, from: state.source === 'env' ? 'CONSTRUCTIVE_API_ENDPOINT' : `the context "${state.context}"` };
  case 'incomplete-backend':
    throw signedOutError(session);
  case 'no-backend':
    break;
  default: {
    const unknown: never = state;
    throw new Error(`Unknown session state ${JSON.stringify(unknown)}.`);
  }
  }
  if (!ctx.interactive) {
    throw usageError('missing-input', `"${CLI_NAME} login" needs --api-endpoint, because no backend is chosen yet.`, {
      cause: `There is no active context and CONSTRUCTIVE_API_ENDPOINT is not set, and ${NO_PROMPT_CAUSE}.`,
      hint: 'Pass the api GraphQL endpoint of the backend, for example --api-endpoint https://api.example.com/graphql.',
      flag: '--api-endpoint'
    });
  }
  const answers = await ctx.prompter.prompt<{ api_endpoint?: string }>({}, [
    { type: 'text', name: 'api_endpoint', message: 'API GraphQL endpoint (for example https://api.example.com/graphql)', required: true }
  ]);
  return { backend: endpointBackend(String(answers.api_endpoint ?? ''), ctx), context: contextToFile(ctx), from: 'the prompt' };
}

const targetLine = (target: LoginTarget): string => `Signing in to ${target.backend.apiEndpoint} (from ${target.from}).`;

const CHECK_TEXT: Record<CredentialCheck['kind'], string> = {
  accepted: 'The backend accepted it.',
  rejected: 'The backend rejected it.',
  unchecked: 'The backend could not check it.'
};

function whoamiText(data: WhoamiData): string {
  const text = personOrAgentText(data);
  return data.projectAgent ? `${text}\n${projectAgentLine(data.projectAgent)}` : text;
}

function personOrAgentText(data: WhoamiData): string {
  if (data.agent) {
    const where = data.apiEndpoint ? ` On ${data.apiEndpoint}${data.context ? ` (context "${data.context}")` : ''}.` : '';
    const reason = data.check.kind === 'accepted' ? '' : ` (${data.check.reason})`;
    return `${agentLine(data.agent, data.account)}${where} ${CHECK_TEXT[data.check.kind]}${reason}`;
  }
  const who = data.account.email ?? `user ${data.account.userId}`;
  const where = data.apiEndpoint ? ` on ${data.apiEndpoint}` : '';
  const context = data.context ? ` (context "${data.context}")` : '';
  const key = data.credential.kind === 'api-key' ? 'an API key' : 'an access token';
  const expiry = data.credential.expiresAt ? ` that expires ${data.credential.expiresAt}` : '';
  const source = data.credential.source === 'environment' ? ' from the environment' : '';
  const reason = data.check.kind === 'accepted' ? '' : ` (${data.check.reason})`;
  return `Signed in as ${who}${where}${context}, with ${key}${expiry}${source}. ${CHECK_TEXT[data.check.kind]}${reason}`;
}

/** The context the resolved session belongs to: null for a backend the environment names. */
function sessionContext(session: Session): string | null {
  const { state } = session;
  return state.kind === 'signed-in' || state.kind === 'signed-out' || state.kind === 'issuer-mismatch' ? state.context : session.context;
}

function whoamiData(session: Session, account: ActiveAccount, backend: ActiveBackend | null, check: CredentialCheck): WhoamiData {
  return {
    context: sessionContext(session),
    apiEndpoint: backend?.apiEndpoint ?? null,
    account: { userId: account.userId, ...(account.email ? { email: account.email } : {}) },
    credential: account.credential,
    check,
    ...(agentOf(session) ? { agent: agentOf(session) } : {})
  };
}

type Checked = { session: Session; check: CredentialCheck | null };

/**
 * What the backend says of the credential, and the session it says it of. Under --as, a token it refuses gets one new
 * token and one more check (`agentStep`); no new token, or a second refusal, is the agent's session with no check.
 */
async function checkedCredential(ctx: CommandContext, opened: Session): Promise<Checked> {
  const checked = async (session: Session): Promise<Checked> => ({ session, check: session.state.kind === 'signed-in' ? await verifySession(session.state) : null });
  const rejected = (outcome: Checked): outcome is Checked & { check: Extract<CredentialCheck, { kind: 'rejected' }> } => outcome.check?.kind === 'rejected';
  const step = await agentStep(ctx, { again: true, run: (renewed) => checked(renewed ?? opened), refused: rejected });
  return step.kind === 'done' ? step.outcome : { session: step.session, check: null };
}

function rejectedError(session: Session, check: Extract<CredentialCheck, { kind: 'rejected' }>): CliError {
  return new CliError<CliCode>({
    code: 'credential-rejected',
    message: session.agent
      ? `The backend rejected the access token of the agent "${session.agent}" (${check.reason}): the agent was removed, or its key was revoked.`
      : `The backend rejected the stored credential (${check.reason}), so commands that need it fail.`,
    hint: session.agent ? `Renew its key as the person with "${CLI_NAME} agent renew ${session.agent}", or add the agent again if it was removed.` : 'Sign in again.',
    next: signInSteps(session),
    exitCode: ExitCode.signInRequired,
    ...(check.code ? { details: { serverCode: check.code } } : {})
  });
}

const login: ImmediateCommand<typeof LoginInput, WhoamiData> = {
  name: 'login',
  summary: 'Sign in with email and password',
  description:
    'Signs in to a Constructive backend, makes an API key that lasts 30 days for every command, stores it in the shared Constructive stash, ends the password sign-in, and makes the backend the active context. ' +
    'The password comes from a prompt on a terminal, or from stdin with --password-stdin; it is never a flag value. Sign in again before the key ends.',
  effect: 'write',
  immediate: true,
  input: LoginInput,
  examples: [
    { command: `${CLI_NAME} login --api-endpoint https://api.example.com/graphql --email you@example.com`, description: 'On a terminal: the password is prompted' },
    { command: `printf %s "$PASSWORD" | ${CLI_NAME} login --email you@example.com --password-stdin`, description: 'From a script or an agent' }
  ],
  async run(input, ctx) {
    personOnly(ctx, 'login');
    const target = await loginTarget(input, ctx);
    const { backend } = target;
    const password = await readPassword(ctx, { stdin: input.password_stdin, command: 'login', prompt: 'Password', cause: targetLine(target) });
    let result;
    try {
      result = await signIn({ store: openCliStore(ctx.env), backend, ...(target.context ? { context: target.context } : {}), email: input.email, password });
    } catch (error) {
      if (error instanceof SignInError) throw signInFailed(error);
      throw error;
    }
    const { session: signedIn, context, apiKey, previousKey } = result;
    const expiresAt = signedIn.apiKey ? signedIn.apiKeyExpiresAt : signedIn.accessTokenExpiresAt;
    const data: WhoamiData = {
      context,
      apiEndpoint: backend.apiEndpoint,
      account: { userId: signedIn.userId, email: signedIn.email },
      credential: { kind: signedIn.apiKey ? 'api-key' : 'access-token', source: 'session', ...(expiresAt ? { expiresAt } : {}) },
      check: { kind: 'accepted' }
    };
    const warnings = [
      apiKey.kind === 'not-minted' ? `No new key was made (${apiKey.reason}), so the previous key stays in use until it ends. Run login again to retry.` : undefined,
      revocationWarning(previousKey, 'the replaced session')
    ].filter((warning): warning is string => !!warning);
    return {
      data,
      text: whoamiText(data),
      warnings: warnings.length ? warnings : undefined,
      next: [
        ctx.next(['db', 'create', placeholder('database_name')], 'Create a database for this directory'),
        ctx.next(['status'], 'See the account, the backend and the bound database')
      ]
    };
  }
};

export interface LogoutData {
  context: string | null;
  signedOut: boolean;
  /** What happened to the API key of the removed session; null when nothing was stored. */
  key: KeyRevocation | null;
  /** The person's agents under the context: each keeps its own key, so a sign-out does not end them. */
  agents?: { name: string; keyExpiresAt?: string }[];
}

/** The agents filed under `context`, which a sign-out leaves live, and the steps that remove them: removing needs the person signed in. */
function agentsLeft(session: Session, context: string | null, ctx: CommandContext): { agents: LogoutData['agents']; text: string[]; next: NextStep[] } {
  const agents = context ? listAgents({ store: session.store, context }) : [];
  if (!agents.length) return { agents: undefined, text: [], next: [] };
  return {
    agents: agents.map((info) => ('unreadable' in info ? { name: info.name } : { name: info.name, keyExpiresAt: info.keyExpiresAt })),
    text: agents.map((info) =>
      `The agent "${info.name}" stays live with its own key${'unreadable' in info ? '' : ` until ${info.keyExpiresAt}`}, unless it is removed: "${CLI_NAME} agent remove ${info.name}" ends it, after you sign in again.`),
    next: [
      ctx.next(['login', '--email', placeholder('email'), ...passwordWords(ctx.interactive)], 'Sign in again: removing an agent needs the person signed in'),
      ...agents.map((info) => ctx.next(['agent', 'remove', info.name], 'Then remove the agent, which ends its credential'))
    ]
  };
}

const logout: ImmediateCommand<InputSchema, LogoutData> = {
  name: 'logout',
  summary: 'Sign out: revoke the API key and remove the stored session',
  description:
    'Signs out of the session the command resolves (--context, else the active one): it revokes the API key at the backend that issued it, and removes the stored session in every case, ' +
    'also when the key cannot be revoked; the result says what happened to the key. A session from the environment has nothing stored to remove.',
  effect: 'write',
  immediate: true,
  async run(_input, ctx) {
    personOnly(ctx, 'logout');
    const session = openPersonSession(ctx);
    const result = await signOut({ store: session.store, session: session.state });
    switch (result.kind) {
    case 'not-signed-in': {
      const where = result.context ? ` to "${result.context}"` : '';
      const left = agentsLeft(session, result.context, ctx);
      return {
        data: { context: result.context, signedOut: false, key: null, ...(left.agents ? { agents: left.agents } : {}) },
        text: [`No one was signed in${where}.`, ...left.text].join('\n'),
        next: left.next.length ? left.next : signInSteps(session)
      };
    }
    case 'from-environment':
      return {
        data: { context: null, signedOut: false, key: null },
        text: 'The session comes from CONSTRUCTIVE_USER_ID and CONSTRUCTIVE_ACCESS_TOKEN, so nothing is stored to remove. Unset those variables to sign out.'
      };
    case 'cleared': {
      const warning = revocationWarning(result.key, 'the removed session');
      const left = agentsLeft(session, result.context, ctx);
      return {
        data: { context: result.context, signedOut: true, key: result.key, ...(left.agents ? { agents: left.agents } : {}) },
        text: [`Signed out of "${result.context}": the session was removed, and ${KEY_TEXT[result.key.kind]}.`, ...left.text].join('\n'),
        warnings: warning ? [warning] : undefined,
        next: left.next.length ? left.next : [ctx.next(['login', '--email', placeholder('email'), ...passwordWords(ctx.interactive)], 'Sign in again')]
      };
    }
    default: {
      const unknown: never = result;
      throw new Error(`Unknown sign-out result ${JSON.stringify(unknown)}.`);
    }
    }
  }
};

const whoami: ReadCommand<InputSchema, WhoamiData> = {
  name: 'whoami',
  summary: 'Show the signed-in account, and whether the backend accepts its credential',
  description: 'Asks the backend once. Fails with signed-out or credential-rejected (exit 4) when no usable credential is stored. Never prints a token.',
  effect: 'read',
  async run(_input, ctx) {
    const { session, check } = await checkedCredential(ctx, await openSession(ctx));
    const account = activeAccount(session);
    if (!account || !check) throw signedOutError(session);
    if (check.kind === 'rejected') throw rejectedError(session, check);
    const projectAgent = await projectAgentOf(session, ctx.cwd);
    const data: WhoamiData = { ...whoamiData(session, account, activeBackend(session), check), ...(projectAgent ? { projectAgent } : {}) };
    const warning = keyEndWarning(session, account);
    return { data, text: whoamiText(data), ...(warning ? { warnings: [warning] } : {}), ...(projectAgent ? { next: [projectAgentStep(ctx, 'whoami', projectAgent)] } : {}) };
  }
};

/** What the backend's server says it runs (GET /version), or why that is not known. */
export type ServerVersion =
  | { status: 'known'; name: string; version: string; commit: string | null }
  | { status: 'unknown'; reason: 'no-version-route' | 'unreachable' | 'bad-answer'; url: string; detail?: string };

/** How status asks the server its version: the fetch and the limit. The tests give it a fetch that reaches no network. */
export const versionRequest: { fetch: typeof fetch; timeoutMs: number } = { fetch: createFetch(), timeoutMs: 3000 };

/** GET /version beside the api endpoint; it never throws, so status never fails on it. */
async function serverVersion(apiEndpoint: string, signal: AbortSignal | undefined): Promise<ServerVersion> {
  const url = new URL('version', apiEndpoint).href;
  let response: Response;
  try {
    const timeout = AbortSignal.timeout(versionRequest.timeoutMs);
    response = await versionRequest.fetch(url, { headers: { Accept: 'application/json' }, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  } catch {
    return { status: 'unknown', reason: 'unreachable', url };
  }
  if (response.status === 404) return { status: 'unknown', reason: 'no-version-route', url };
  const body: unknown = await response.json().catch((): undefined => undefined);
  const { name, version, commit } = (body ?? {}) as Record<string, unknown>;
  const commitOrNull = commit === null ? null : typeof commit === 'string' ? commit || null : undefined;
  if (response.ok && typeof name === 'string' && typeof version === 'string' && commitOrNull !== undefined) {
    return { status: 'known', name, version, commit: commitOrNull };
  }
  return { status: 'unknown', reason: 'bad-answer', url, detail: response.ok ? 'the body is not { name, version, commit }' : `HTTP ${response.status}` };
}

function serverLine(server: ServerVersion): string {
  if (server.status === 'known') return `Server: ${server.name} ${server.version}, ${server.commit ? `commit ${server.commit}` : 'no commit recorded'}`;
  const why = {
    'no-version-route': `the server has no /version (${server.url}), so it is older than that route`,
    unreachable: `no answer from ${server.url} within ${versionRequest.timeoutMs / 1000} s`,
    'bad-answer': `${server.url} answered, but ${server.detail}`
  }[server.reason];
  return `Server: version unknown: ${why}.`;
}

export interface StatusData {
  context: string | null;
  backend: ActiveBackend | null;
  /** What the backend's server runs; null without a backend. */
  server: ServerVersion | null;
  /** The planes the context lacks; present only for an incomplete context. */
  missingPlanes?: Plane[];
  /** Why the stored session cannot be used, for example one another backend issued. */
  problem?: string;
  signedIn: boolean;
  account: { userId: string; email?: string } | null;
  credential: ActiveAccount['credential'] | null;
  /** What the backend said of the credential, when one is signed in. */
  check: CredentialCheck | null;
  database: DatabaseState;
  /** Under --as: the agent that acts. */
  agent?: AgentView;
  /** Without --as: the agent the project binding names, whose run this is not. */
  projectAgent?: ProjectAgent;
}

function statusNext(session: Session, data: StatusData): NextStep[] {
  if (data.missingPlanes) return [repairStep(session.store, data.context, session.next)];
  if (!data.signedIn || data.check?.kind === 'rejected') return signInSteps(session);
  return databaseNext(data.database, session);
}

function accountLine(data: StatusData): string {
  if (data.problem) return `Account: ${data.problem}`;
  if (data.agent && data.account) return `Account: ${agentLine(data.agent, data.account)}`;
  if (!data.account) return 'Account: signed out.';
  const source = data.credential.source === 'environment' ? ' from the environment' : '';
  const check = data.check ? ` ${CHECK_TEXT[data.check.kind]}${data.check.kind === 'accepted' ? '' : ` (${data.check.reason})`}` : '';
  return `Account: ${data.account.email ?? data.account.userId} (${data.credential.kind}${source}).${check}`;
}

function statusText(data: StatusData): string {
  const lines = [
    data.backend
      ? `Backend: ${data.backend.apiEndpoint}${data.context ? ` (context "${data.context}")` : ''}${data.backend.source === 'environment' ? ', from CONSTRUCTIVE_API_ENDPOINT' : ''}`
      : data.missingPlanes ? `Backend: the context "${data.context}" lacks the ${planeList(data.missingPlanes)}.` : 'Backend: none chosen.',
    ...(data.server ? [serverLine(data.server)] : []),
    accountLine(data),
    ...(data.projectAgent ? [`Agent: ${projectAgentLine(data.projectAgent)}`] : []),
    `Database: ${databaseText(data.database)}`
  ];
  return lines.join('\n');
}

const status: ReadCommand<InputSchema, StatusData> = {
  name: 'status',
  summary: 'Show the backend, the account and the database of this directory',
  description:
    'Asks the backend once whether it accepts the credential, once about the bound database, and its server which version it runs (GET /version). ' +
    'Never fails for a missing piece: the data says what is missing, and next names the command for it. Never prints a token.',
  effect: 'read',
  async run(_input, ctx) {
    const opened = await openSession(ctx);
    configureTools(opened);
    const backend = activeBackend(opened);
    const version = backend ? serverVersion(backend.apiEndpoint, ctx.signal) : null;
    const { session, check } = await checkedCredential(ctx, opened);
    const account = activeAccount(session);
    const problem = session.state.kind === 'issuer-mismatch' || session.state.kind === 'agent-unusable' ? sessionProblem(session.state) : null;
    const projectAgent = await projectAgentOf(session, ctx.cwd);
    const data: StatusData = {
      context: sessionContext(session),
      backend,
      ...(session.state.kind === 'incomplete-backend' ? { missingPlanes: session.state.missing } : {}),
      ...(problem ? { problem } : {}),
      signedIn: account !== null,
      account: account ? { userId: account.userId, ...(account.email ? { email: account.email } : {}) } : null,
      credential: account?.credential ?? null,
      check,
      database: await databaseState(ctx.cwd),
      server: await version,
      ...(agentOf(session) ? { agent: agentOf(session) } : {}),
      ...(projectAgent ? { projectAgent } : {})
    };
    const warning = account && check?.kind !== 'rejected' ? keyEndWarning(session, account) : undefined;
    return {
      data,
      text: statusText(data),
      ...(warning ? { warnings: [warning] } : {}),
      next: [...statusNext(session, data), ...(data.projectAgent ? [projectAgentStep(ctx, 'status', data.projectAgent)] : [])]
    };
  }
};

export const accountCommands = [login, logout, whoami, status];
