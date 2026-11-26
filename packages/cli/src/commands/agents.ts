import { type ChangeCommand, CliError, type CommandContext, ExitCode, type ImmediateCommand, type InputSchema, type NextStep, type Planned, type ReadCommand } from '@agentic-kit/command';
import {
  AgentError,
  type AgentInfo,
  type AgentRemoval,
  type AgentRenewal,
  checkAgentName,
  createAgent,
  grantSchemaChanges,
  listAgents,
  removeAgent,
  renewAgentKey,
  revokeSchemaChanges,
  SignInError
} from '@agentic-kit/session';
import { z } from 'zod';

import type { CliCode } from '../errors';
import {
  activeAccount,
  CLI_NAME,
  controlPlane,
  openPersonSession,
  PASSWORD_STDIN,
  passwordNeeds,
  passwordWords,
  personOnly,
  planAccount,
  readPassword,
  revocationWarning,
  type Session,
  signInFailed
} from '../session';

/**
 * What an agent may do, as the grant reads: schema changes cover every change of the schema, deletes and access rules
 * among them, so the person never approves less than the agent gets.
 */
export const mayWords = (schemaChanges: boolean): string =>
  schemaChanges
    ? 'may read and change the schema: add, change and delete tables, fields and relations (a delete also deletes the data in it), and replace the rules of who may read and write each table'
    : 'may read the schema and the access, and may not change the schema';

/** The flag that grants schema changes, in the words of the grant. */
export const SCHEMA_CHANGES_FLAG = 'Let it change the schema: tables, fields and relations, deletes among them, and the rules of who may read and write each table';

/** How the CLI uses an agent's key. */
const KEY_USE = 'The CLI uses the key to get a short-lived token, keeps that token, and uses it again until it ends.';

/** What holding an agent's key allows: the backend accepts the key itself on requests, as the agent. */
const KEY_HOLDER = `Whoever holds the key can act as the agent until the key ends, the person renews it, or "${CLI_NAME} agent remove" deletes the agent.`;

/** The agent's key, as the backend treats it. */
const AGENT_KEY_WORDS = `The agent has its own key, which lasts 30 days. ${KEY_USE} ${KEY_HOLDER}`;

export type Owner = { userId: string; email?: string };

export const ownerWords = (owner: Owner): string => owner.email ?? `user ${owner.userId}`;

/** The codes of a failed agent operation, by its kind; the sign-in kinds give the step that signs the person in again. */
const AGENT_ERRORS: { [kind in AgentError['kind']]: { code: CliCode; exit: number; signIn?: true; list?: true } } = {
  'invalid-name': { code: 'invalid-input', exit: ExitCode.usage },
  'not-a-person': { code: 'not-a-person', exit: ExitCode.usage, signIn: true },
  'sign-in-required': { code: 'signed-out', exit: ExitCode.signInRequired, signIn: true },
  'step-up-required': { code: 'step-up-required', exit: ExitCode.signInRequired, signIn: true },
  'name-taken': { code: 'name-taken', exit: ExitCode.failure, list: true },
  'not-found': { code: 'not-found', exit: ExitCode.failure, list: true },
  'unreadable-record': { code: 'failed', exit: ExitCode.failure, list: true },
  refused: { code: 'permission-denied', exit: ExitCode.failure },
  'backend-unreachable': { code: 'backend-unreachable', exit: ExitCode.failure },
  'server-error': { code: 'failed', exit: ExitCode.failure }
};

/** A failed agent operation, or the failed fresh sign-in a key for an agent needs, as the error of the command. */
export function agentError(error: unknown, ctx: CommandContext): never {
  if (error instanceof SignInError) throw signInFailed(error);
  if (!(error instanceof AgentError)) throw error;
  const { code, exit, signIn, list } = AGENT_ERRORS[error.kind];
  const next: NextStep[] = [
    ...(signIn ? [ctx.next(['login', '--email', { placeholder: 'email' }, ...passwordWords(ctx.interactive)], 'Sign in again as the person, with the password')] : []),
    ...(list ? [ctx.next(['agent', 'list'], 'See the agents of this context')] : [])
  ];
  throw new CliError<CliCode>({
    code,
    message: error.message,
    exitCode: exit,
    retryable: error.kind === 'backend-unreachable',
    ...(next.length ? { next } : {}),
    details: { kind: error.kind, ...(error.code ? { serverCode: error.code } : {}) }
  });
}

export function owner(session: Session): Owner {
  const account = activeAccount(session);
  return account ? { userId: account.userId, ...(account.email ? { email: account.email } : {}) } : { userId: controlPlane(session).userId };
}

function infoText(info: AgentInfo, who: Owner): string {
  if ('unreadable' in info) return `The agent "${info.name}" cannot be used: ${info.problem}`;
  const scope = info.organization ? ` within the organization ${info.organization}` : '';
  return `The agent "${info.name}" of ${ownerWords(who)}${scope} ${mayWords(info.schemaChanges)}. Its key lasts until ${info.keyExpiresAt}. ${KEY_USE} ${KEY_HOLDER}`;
}

/** The person's password for a new key of an agent, which a fresh sign-in makes. */
export const agentPassword = (ctx: CommandContext, stdin: boolean | undefined, command: string, who: Owner): Promise<string> =>
  readPassword(ctx, { stdin, command, prompt: `Password of ${ownerWords(who)}`, cause: "A key for the agent needs a fresh sign-in with the person's password." });

/** The sentence of a plan that makes a key for an agent. */
export const PASSWORD_LINE = 'It needs your password for a fresh sign-in, from a prompt on a terminal or from stdin with --password-stdin; the sign-in is ended when the key is made.';

const agentName = z.string().describe('The name of the agent, as agent list shows it');

const AddInput = z.object({
  name: agentName,
  organization: z.string().optional().describe('The id of the organization the agent is held to (default: every organization of the person)'),
  allow_schema_changes: z.boolean().optional().describe(SCHEMA_CHANGES_FLAG),
  ...PASSWORD_STDIN
});

const agentAdd: ChangeCommand<typeof AddInput, unknown, Planned & { session: Session; who: Owner }> = {
  name: 'agent add',
  summary: 'Add an agent of the signed-in person: its own credential, which may not change the schema unless allowed',
  description:
    'Creates a principal of the person on the backend, held to --organization when one is given, without the person\'s admin flag, and stores its key beside the person\'s session. ' +
    `${AGENT_KEY_WORDS} By default the agent may read the schema and the access, and may not change the schema. ` +
    'A fresh sign-in makes the key, so it needs the person\'s password. Use the agent with --as <name>.',
  effect: 'write',
  input: AddInput,
  positionals: ['name'],
  examples: [
    { command: `${CLI_NAME} agent add helper --dry-run`, description: 'The plan of an agent that reads the schema and the access' },
    { command: `printf %s "$PASSWORD" | ${CLI_NAME} agent add helper --password-stdin --yes`, description: 'From a script' }
  ],
  plan(input, ctx) {
    personOnly(ctx, 'agent add');
    try {
      checkAgentName(input.name);
    } catch (error) {
      throw new CliError<CliCode>({ code: 'invalid-input', message: (error as Error).message, exitCode: ExitCode.usage, details: { flag: 'name' } });
    }
    const session = openPersonSession(ctx);
    const plane = controlPlane(session);
    if (listAgents({ store: session.store, ...(session.context ? { context: session.context } : {}) }).some((info) => info.name === input.name)) {
      throw new CliError<CliCode>({ code: 'name-taken', message: `There is already an agent named "${input.name}" under this context.`, next: [ctx.next(['agent', 'list'], 'See the agents of this context')] });
    }
    const who = owner(session);
    const schemaChanges = input.allow_schema_changes === true;
    const scope = input.organization ? `, held to the organization ${input.organization}` : '';
    return {
      plan: {
        title: 'Add the agent?',
        message:
          `Add the agent "${input.name}" for ${ownerWords(who)}${scope}: a principal of the person on the backend, with its own key for 30 days stored beside the person's session, ` +
          `which acts for them until it is removed or its key ends. ${KEY_HOLDER} It ${mayWords(schemaChanges)}. ${PASSWORD_LINE}`,
        target: { kind: 'account', apiEndpoint: plane.endpoint, account: planAccount(session) }
      },
      ...passwordNeeds(input.password_stdin),
      session,
      who
    };
  },
  async apply(input, { session, who }, ctx) {
    const password = await agentPassword(ctx, input.password_stdin, 'agent add', who);
    let info: AgentInfo;
    try {
      info = await createAgent({
        store: session.store,
        session: session.state,
        password,
        name: input.name,
        allowSchemaChanges: input.allow_schema_changes === true,
        ...(input.organization ? { organization: input.organization } : {})
      });
    } catch (error) {
      agentError(error, ctx);
    }
    return {
      data: { ...info, owner: who },
      text: `Added the agent. ${infoText(info, who)}`,
      next: [
        ctx.next(['whoami', '--as', input.name], 'Check the agent: who it is, and what it may do'),
        ctx.next(['mcp', '--as', input.name], 'Serve the tools to an agent host as this agent')
      ]
    };
  }
};

const agentList: ReadCommand<InputSchema, AgentInfo[]> = {
  name: 'agent list',
  summary: 'List the agents of the person under the context, with what each may do and when its key ends',
  effect: 'read',
  run(_input, ctx) {
    personOnly(ctx, 'agent list');
    const session = openPersonSession(ctx);
    const agents = listAgents({ store: session.store, ...(session.context ? { context: session.context } : {}) });
    const text = agents.length
      ? agents.map((info) => ('unreadable' in info ? `${info.name}  cannot be used: ${info.problem}` : `${info.name}  ${info.state}  ${mayWords(info.schemaChanges)}; key ends ${info.keyExpiresAt}`)).join('\n')
      : 'No agents under this context.';
    return { data: agents, text, next: agents.length ? [] : [ctx.next(['agent', 'add', { placeholder: 'name' }], 'Add one')] };
  }
};


/** The agent of the person named `name` under the session's context, or the not-found error that names agent list. */
function knownAgent(session: Session, name: string, ctx: CommandContext): AgentInfo {
  const known = listAgents({ store: session.store, ...(session.context ? { context: session.context } : {}) }).find((info) => info.name === name);
  if (known) return known;
  throw new CliError<CliCode>({ code: 'not-found', message: `There is no agent named "${name}" under this context.`, next: [ctx.next(['agent', 'list'], 'See the agents of this context')] });
}

const scopeInput = (verb: 'grant' | 'revoke') =>
  z.object({ name: agentName, schema_changes: z.boolean().optional().describe(`${verb === 'grant' ? 'Grant' : 'Revoke'} schema changes`) });

/** Schema changes are the only right an agent's own credential has, and the flag says that is the one meant. */
function checkScope(input: { schema_changes?: boolean }, verb: 'grant' | 'revoke'): void {
  if (input.schema_changes === true) return;
  throw new CliError<CliCode>({
    code: 'invalid-input',
    message: `Name what to ${verb}: schema changes are the only right an agent's own credential has, with --schema-changes.`,
    exitCode: ExitCode.usage,
    details: { flag: '--schema-changes' }
  });
}

async function changeScope(session: Session, name: string, verb: 'grant' | 'revoke', ctx: CommandContext) {
  let info: AgentInfo;
  try {
    info = await (verb === 'grant' ? grantSchemaChanges : revokeSchemaChanges)({ store: session.store, session: session.state, name });
  } catch (error) {
    agentError(error, ctx);
  }
  return {
    data: info,
    text: infoText(info, owner(session)),
    next: verb === 'grant' ? [ctx.next(['setup', 'agent', name], 'In the project of the agent: see which host entries can now serve the change tools')] : []
  };
}

const GrantInput = scopeInput('grant');

// A grant widens what the agent may do on the backend, so the person approves its plan.
const agentGrant: ChangeCommand<typeof GrantInput, unknown, Planned & { session: Session }> = {
  name: 'agent grant',
  summary: 'Let an agent change the schema, after its plan is approved',
  effect: 'write',
  input: GrantInput,
  positionals: ['name'],
  examples: [{ command: `${CLI_NAME} agent grant helper --schema-changes --dry-run` }],
  plan(input, ctx) {
    personOnly(ctx, 'agent grant');
    checkScope(input, 'grant');
    const session = openPersonSession(ctx);
    knownAgent(session, input.name, ctx);
    const plane = controlPlane(session);
    const who = owner(session);
    return {
      plan: {
        title: 'Let the agent change the schema?',
        message:
          `Let the agent "${input.name}" of ${ownerWords(who)} change the schema: after this it ${mayWords(true)}. ` +
          `The backend applies it to every host that runs the agent with --as. An MCP entry with --read-only still serves only the tools that read, until that flag is taken out of it.`,
        target: { kind: 'account', apiEndpoint: plane.endpoint, account: planAccount(session) }
      },
      session
    };
  },
  apply: (input, { session }, ctx) => changeScope(session, input.name, 'grant', ctx)
};

const RevokeInput = scopeInput('revoke');

// A revoke only narrows what the agent may do, so it runs at once.
const agentRevoke: ImmediateCommand<typeof RevokeInput> = {
  name: 'agent revoke',
  summary: 'Stop an agent changing the schema',
  effect: 'write',
  immediate: true,
  input: RevokeInput,
  positionals: ['name'],
  examples: [{ command: `${CLI_NAME} agent revoke helper --schema-changes` }],
  run(input, ctx) {
    personOnly(ctx, 'agent revoke');
    checkScope(input, 'revoke');
    return changeScope(openPersonSession(ctx), input.name, 'revoke', ctx);
  }
};

const RenewInput = z.object({ name: agentName, ...PASSWORD_STDIN });

// A new key for the same principal: it widens nothing, but it revokes the old key and makes a secret, so the person approves it.
const agentRenew: ChangeCommand<typeof RenewInput, unknown, Planned & { session: Session; who: Owner }> = {
  name: 'agent renew',
  summary: 'Give an agent a new key that lasts 30 days, for the same principal, so it keeps what it may do',
  description:
    'Makes a new key for the agent\'s principal with a fresh sign-in of the person, stores it, and revokes the old key, which ends every access token minted with it. ' +
    'Run it before or after the key ends; the agent keeps its name, its principal and its grants. It needs the person\'s password.',
  effect: 'write',
  input: RenewInput,
  positionals: ['name'],
  examples: [{ command: `${CLI_NAME} agent renew helper --dry-run` }],
  plan(input, ctx) {
    personOnly(ctx, 'agent renew');
    const session = openPersonSession(ctx);
    const plane = controlPlane(session);
    const known = knownAgent(session, input.name, ctx);
    if ('unreadable' in known || known.state === 'issuer-mismatch') {
      throw new CliError<CliCode>({
        code: 'agent-unusable',
        message: `The agent "${input.name}" ${'unreadable' in known ? 'has a stored entry that cannot be read' : 'was set up for another backend than this context names'}, so a new key would not make it usable.`,
        hint: 'Remove it, then add it again.',
        next: [ctx.next(['agent', 'remove', input.name], 'Remove it first'), ctx.next(['agent', 'add', input.name, ...passwordWords(ctx.interactive)], 'Then add it again')]
      });
    }
    const who = owner(session);
    const ends = known.state === 'set-up-again' ? `Its key ended ${known.keyExpiresAt}.` : `Its key ends ${known.keyExpiresAt}.`;
    return {
      plan: {
        title: 'Renew the key of the agent?',
        message:
          `Give the agent "${input.name}" of ${ownerWords(who)} a new key that lasts 30 days, for the same principal, so it still ${mayWords(known.schemaChanges)}. ${ends} ` +
          `The old key is revoked, which ends every access token minted with it. ${PASSWORD_LINE}`,
        target: { kind: 'account', apiEndpoint: plane.endpoint, account: planAccount(session) }
      },
      ...passwordNeeds(input.password_stdin),
      session,
      who
    };
  },
  async apply(input, { session, who }, ctx) {
    const password = await agentPassword(ctx, input.password_stdin, 'agent renew', who);
    let renewal: AgentRenewal;
    try {
      renewal = await renewAgentKey({ store: session.store, session: session.state, password, name: input.name });
    } catch (error) {
      agentError(error, ctx);
    }
    const warning = revocationWarning(renewal.previousKey, `the agent "${input.name}"`);
    return {
      data: { ...renewal, owner: who },
      text: `Renewed the key of the agent. ${infoText(renewal.agent, who)}`,
      ...(warning ? { warnings: [warning] } : {}),
      next: [ctx.next(['whoami', '--as', input.name], 'Check the agent with its new key')]
    };
  }
};

const REMOVAL_TEXT: { [kind in AgentRemoval['kind']]: (name: string) => string } = {
  removed: (name) => `Removed the agent "${name}": its principal is deleted, so its key and every access token of it have ended, and its entry is gone.`,
  'already-gone': (name) => `The backend no longer had the agent "${name}", so only its entry was removed.`,
  'entry-removed': (name) => `The entry of the agent "${name}" could not be read, so only the entry was removed; its principal may still exist on the backend.`
};

const RemoveInput = z.object({ name: agentName });

const agentRemove: ChangeCommand<typeof RemoveInput, unknown, Planned & { session: Session }> = {
  name: 'agent remove',
  summary: 'Remove an agent: its principal on the backend, which ends every credential of it, and its stored entry',
  effect: 'destructive',
  input: RemoveInput,
  positionals: ['name'],
  examples: [{ command: `${CLI_NAME} agent remove helper --dry-run` }],
  plan(input, ctx) {
    personOnly(ctx, 'agent remove');
    const session = openPersonSession(ctx);
    const plane = controlPlane(session);
    knownAgent(session, input.name, ctx);
    const who = owner(session);
    return {
      plan: {
        title: 'Remove the agent?',
        message: `Delete the agent "${input.name}" of ${ownerWords(who)}: its principal on the backend is deleted, which ends its key and every access token of it at once, and its stored entry is removed. A host that runs it with --as stops working.`,
        target: { kind: 'account', apiEndpoint: plane.endpoint, account: planAccount(session) }
      },
      session
    };
  },
  async apply(input, { session }, ctx) {
    let removal: AgentRemoval;
    try {
      removal = await removeAgent({ store: session.store, session: session.state, name: input.name });
    } catch (error) {
      agentError(error, ctx);
    }
    return { data: removal, text: REMOVAL_TEXT[removal.kind](input.name) };
  }
};

export const agentCommands = [agentList, agentAdd, agentRenew, agentGrant, agentRevoke, agentRemove];
