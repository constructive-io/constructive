import { type ChangeCommand, CliError, type CommandContext, ExitCode, type ImmediateCommand, type InputSchema, type NextStep, type Planned, type ReadCommand } from '@agentic-kit/command';
import { alignColumns } from '@agentic-kit/harness';
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
  dayOf,
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

/** What an agent may do, as the value of a `may` line. */
export const mayWords = (schemaChanges: boolean): string =>
  schemaChanges ? 'read and change the schema' : 'read the schema and the access; no schema changes';

/** What an agent may do, in two or three words, for a one-line result. */
const mayLabel = (schemaChanges: boolean): string => (schemaChanges ? 'may change the schema' : 'read only');

/**
 * What a grant of schema changes lets the agent do. It covers every change of the schema, deletes and access rules
 * among them, so the person never approves less than the agent gets.
 */
export const SCHEMA_CHANGES_SCOPE = 'It can add, change and delete tables, fields, relations and rules. A delete loses data.';

/** The flag that grants schema changes, in the words of the grant. */
export const SCHEMA_CHANGES_FLAG = 'Let it change the schema: tables, fields, relations and rules, deletes among them';

/** What holding an agent's key allows: the backend accepts the key itself on requests, as the agent. */
const KEY_HOLDER = 'Whoever holds the key acts as the agent until the key ends or the agent is removed.';

/** What a plan that makes a key for an agent needs from the person. */
export const PASSWORD_WORDS = 'your password once (prompt, or --password-stdin)';

/** Lines of `[key, value]` pairs, aligned, under a change line of a plan. */
export const planPairs = (rows: string[][]): string[] => alignColumns(rows).map((line) => `    ${line}`);

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

const scopeWords = (organization: string | null | undefined): string => (organization ? `, organization ${organization}` : '');

/** The person's password for a new key of an agent, which a fresh sign-in makes. */
export const agentPassword = (ctx: CommandContext, stdin: boolean | undefined, command: string, who: Owner): Promise<string> =>
  readPassword(ctx, { stdin, command, prompt: `Password of ${ownerWords(who)}`, cause: "A key for the agent needs a fresh sign-in with the person's password." });

const agentName = z.string().describe('The name of the agent, as agent list shows it');

const AddInput = z.object({
  name: agentName,
  organization: z.string().optional().describe('The id of the organization the agent is held to (default: every organization of the person)'),
  allow_schema_changes: z.boolean().optional().describe(SCHEMA_CHANGES_FLAG),
  ...PASSWORD_STDIN
});

const agentAdd: ChangeCommand<typeof AddInput, unknown, Planned & { session: Session; who: Owner }> = {
  name: 'agent add',
  summary: 'Add an agent with its own key',
  description:
    'Creates a principal of yours on the backend (held to --organization when one is given, never an admin), with its own 30-day key stored beside your session. ' +
    `By default it may read the schema and the access, and may not change the schema. ${KEY_HOLDER} ` +
    'The key needs a fresh sign-in, so it asks for your password. Use the agent with --as <name>.',
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
    const scope = input.organization ? ` (organization ${input.organization})` : '';
    return {
      plan: {
        title: `Add agent ${input.name}`,
        message: [
          `+ agent ${input.name}${scope}`,
          ...planPairs([
            ['may', mayWords(schemaChanges)],
            ['key', '30 days, in your store; whoever holds it acts as the agent'],
            ['needs', PASSWORD_WORDS]
          ]),
          ...(schemaChanges ? [`! ${SCHEMA_CHANGES_SCOPE}`] : [])
        ].join('\n'),
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
      text: 'unreadable' in info
        ? `Added agent ${input.name}, but its entry cannot be read: ${info.problem}`
        : `Added agent ${info.name} (${mayLabel(info.schemaChanges)}${scopeWords(info.organization)}). Key ends ${dayOf(info.keyExpiresAt)}.`,
      next: [
        ctx.next(['whoami', '--as', input.name], 'Check the agent: who it is, and what it may do'),
        ctx.next(['mcp', '--as', input.name], 'Serve the tools to an agent host as this agent')
      ]
    };
  }
};

const agentList: ReadCommand<InputSchema, AgentInfo[]> = {
  name: 'agent list',
  summary: 'List your agents',
  effect: 'read',
  run(_input, ctx) {
    personOnly(ctx, 'agent list');
    const session = openPersonSession(ctx);
    const agents = listAgents({ store: session.store, ...(session.context ? { context: session.context } : {}) });
    const rows = agents.map((info) =>
      'unreadable' in info
        ? [info.name, 'unusable', '', '']
        : [info.name, info.state, info.schemaChanges ? 'yes' : 'no', dayOf(info.keyExpiresAt)]);
    const problems = agents.flatMap((info) => ('unreadable' in info ? [`! ${info.name}: ${info.problem}`] : []));
    const text = agents.length
      ? [...alignColumns([['NAME', 'STATE', 'SCHEMA CHANGES', 'KEY ENDS'], ...rows]), ...problems].join('\n')
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
  const changed = verb === 'grant' ? 'may now change the schema' : 'may no longer change the schema';
  return {
    data: info,
    text: 'unreadable' in info ? `${name}: ${info.problem}` : `${name} ${changed}.`,
    next: verb === 'grant' ? [ctx.next(['setup', 'agent', name], 'In the project of the agent: see which host entries can now serve the change tools')] : []
  };
}

const GrantInput = scopeInput('grant');

// A grant widens what the agent may do on the backend, so the person approves its plan.
const agentGrant: ChangeCommand<typeof GrantInput, unknown, Planned & { session: Session }> = {
  name: 'agent grant',
  summary: 'Let an agent change the schema',
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
    return {
      plan: {
        title: `Let agent ${input.name} change the schema`,
        message: [
          `~ ${input.name}  read only -> may change the schema`,
          `! ${SCHEMA_CHANGES_SCOPE}`,
          'Every host that runs it with --as gets this. An MCP entry with --read-only still only reads.'
        ].join('\n'),
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
  summary: 'Give an agent a new 30-day key',
  description:
    'Makes a new key for the same principal with a fresh sign-in, and revokes the old key and every access token minted with it. ' +
    'The agent keeps its name and its grants. Run it before or after the key ends. It asks for your password.',
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
    return {
      plan: {
        title: `Renew the key of agent ${input.name}`,
        message: [
          `~ ${input.name}  new 30-day key; the old key and its tokens end now`,
          ...planPairs([
            ['key', `the current one ${known.state === 'set-up-again' ? 'ended' : 'ends'} ${dayOf(known.keyExpiresAt)}`],
            ['may', `${mayWords(known.schemaChanges)} (unchanged)`],
            ['needs', PASSWORD_WORDS]
          ])
        ].join('\n'),
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
      text: 'unreadable' in renewal.agent
        ? `Renewed the key of agent ${input.name}, but its entry cannot be read: ${renewal.agent.problem}`
        : `Renewed the key of agent ${input.name}. It ends ${dayOf(renewal.agent.keyExpiresAt)}.`,
      ...(warning ? { warnings: [warning] } : {}),
      next: [ctx.next(['whoami', '--as', input.name], 'Check the agent with its new key')]
    };
  }
};

const REMOVAL_TEXT: { [kind in AgentRemoval['kind']]: (name: string) => string } = {
  removed: (name) => `Removed agent ${name}. Its key and tokens have ended.`,
  'already-gone': (name) => `The backend no longer had agent ${name}, so only its entry was removed.`,
  'entry-removed': (name) => `The entry of agent ${name} could not be read, so only the entry was removed. Its principal may still exist on the backend.`
};

const RemoveInput = z.object({ name: agentName });

const agentRemove: ChangeCommand<typeof RemoveInput, unknown, Planned & { session: Session }> = {
  name: 'agent remove',
  summary: 'Remove an agent and end its key',
  effect: 'destructive',
  input: RemoveInput,
  positionals: ['name'],
  examples: [{ command: `${CLI_NAME} agent remove helper --dry-run` }],
  plan(input, ctx) {
    personOnly(ctx, 'agent remove');
    const session = openPersonSession(ctx);
    const plane = controlPlane(session);
    knownAgent(session, input.name, ctx);
    return {
      plan: {
        title: `Remove agent ${input.name}`,
        message: [`- agent ${input.name}  its key and tokens end now`, '! A host that runs it with --as stops working.'].join('\n'),
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
