import { CliError, type CommandContext, ExitCode, type ImmediateCommand, type InputSchema, type NextStep, type ReadCommand } from '@agentic-kit/command';
import { alignColumns } from '@agentic-kit/harness';
import {
  addBackend,
  type BackendContext,
  backendFromEndpoints,
  checkContextName,
  type ConfigStore,
  ContextInUseError,
  ContextNameError,
  EndpointError,
  type KeyRevocation,
  listAgents,
  listBackends,
  type Plane,
  readBackend,
  removeBackend,
  resolveSession,
  selectBackend,
  signOut,
  stashDirectories
} from '@agentic-kit/session';
import path from 'path';
import { z } from 'zod';

import type { CliCode } from '../errors';
import { CLI_NAME, KEY_TEXT, type NextBuilder, openCliStore, passwordWords, personOnly, planeList, repairStep, revocationWarning } from '../session';

/**
 * A stored context as the commands show it. `missing` and `repair` are present exactly when the context lacks a
 * plane; `invalidName` is present when it is stored under a name no command acts on, which has no repair.
 */
export interface ContextRow {
  name: string;
  current: boolean;
  complete: boolean;
  apiEndpoint?: string;
  missing?: Plane[];
  repair?: NextStep;
  invalidName?: string;
}

/** The contexts as a table: `*` marks the active one, and an incomplete one names the planes it lacks. */
function contextsText(rows: ContextRow[]): string {
  if (!rows.length) return 'No contexts yet.';
  return alignColumns([
    ['', 'NAME', 'API ENDPOINT', ''],
    ...rows.map((row) => [
      row.current ? '*' : '',
      row.name,
      row.apiEndpoint ?? '',
      row.invalidName ? 'invalid name' : row.complete ? '' : `missing: ${(row.missing ?? []).join(', ')}`
    ])
  ]).join('\n');
}

function toRow(store: ConfigStore, context: BackendContext, next: NextBuilder): ContextRow {
  if (context.status === 'complete') {
    return { name: context.name, current: context.current, complete: true, apiEndpoint: context.backend.apiEndpoint };
  }
  if (context.status === 'invalid-name') return { name: context.name, current: context.current, complete: false, invalidName: context.reason };
  return {
    name: context.name,
    current: context.current,
    complete: false,
    ...(context.apiEndpoint ? { apiEndpoint: context.apiEndpoint } : {}),
    missing: context.missing,
    repair: repairStep(store, context.name, next)
  };
}

export function contextRow(store: ConfigStore, name: string, next: NextBuilder): ContextRow {
  return toRow(store, readBackend(store, name), next);
}

const builder = (ctx: CommandContext): NextBuilder => (words, why) => ctx.next(words, why);

/** A context name given as input, checked: it is the stem of a file in the store. */
function checkedName(name: string, flag: string): string {
  try {
    return checkContextName(name);
  } catch (error) {
    if (!(error instanceof ContextNameError)) throw error;
    throw new CliError<CliCode>({ code: 'invalid-input', message: error.message, exitCode: ExitCode.usage, details: { flag } });
  }
}

function unknownContext(store: ConfigStore, name: string, ctx: CommandContext): CliError {
  const known = store.listContexts().map((context) => context.name);
  return new CliError<CliCode>({
    code: 'not-found',
    message: `There is no backend context named "${name}". Known contexts: ${known.join(', ') || '(none)'}.`,
    next: [ctx.next(['context', 'list'], 'List the contexts')]
  });
}

/** What to do with a context once it is chosen: repair it, sign in, or check the project. */
function nextFor(store: ConfigStore, row: ContextRow, ctx: CommandContext): NextStep[] {
  if (row.repair) return [row.repair];
  if (!store.getCredentials(row.name)) return [ctx.next(['login', '--email', { placeholder: 'email' }, ...passwordWords(ctx.interactive)], 'Sign in')];
  return [ctx.next(['status'], 'Check the account and the project')];
}

const NAME_INPUT = z.object({ name: z.string().describe('Name of the context, as context list shows it') });

const contextList: ReadCommand<InputSchema, ContextRow[]> = {
  name: 'context list',
  summary: 'List the backend contexts',
  description:
    'Every backend this machine knows, from the shared Constructive stash. A context that lacks a plane is incomplete: missing names the planes, and repair is the command that fixes it. ' +
    'A context stored under a name that is not a valid one (another program wrote it) shows invalidName with the reason; no command acts on it, and the warning names its file to remove by hand.',
  effect: 'read',
  run(_input, ctx) {
    personOnly(ctx, 'context list');
    const store = openCliStore(ctx.env);
    const rows = listBackends(store).map((context) => toRow(store, context, builder(ctx)));
    const contexts = path.join(stashDirectories(ctx.env).find((directory) => path.basename(directory) === 'config'), 'contexts');
    const warnings = rows.flatMap((row) => {
      if (row.invalidName) {
        return [`The context "${row.name}" is stored under a name no command acts on: ${row.invalidName} To drop it, remove its file from ${contexts} by hand.`];
      }
      return row.complete ? [] : [`The context "${row.name}" lacks the ${planeList(row.missing)}. Run: ${row.repair.command}`];
    });
    return { data: rows, text: contextsText(rows), warnings: warnings.length ? warnings : undefined };
  }
};

const PLANE_INPUT = (plane: Plane) =>
  z.string().optional().describe(`The ${plane} GraphQL endpoint. Default: derived from an api endpoint whose host starts with "api." (api.example.com gives ${plane}.example.com)`);

const ContextAddInput = z.object({
  api_endpoint: z.string().describe('The api GraphQL endpoint, for example https://api.example.com/graphql'),
  name: z.string().optional().describe('Name of the context. Default: the api host without its leading "api."'),
  auth_endpoint: PLANE_INPUT('auth'),
  modules_endpoint: PLANE_INPUT('modules'),
  agent_endpoint: PLANE_INPUT('agent'),
  compute_endpoint: PLANE_INPUT('compute')
});

/** A context add over a session other endpoints issued: nothing is stored; sign out of it first, then add again. */
function contextInUse(error: ContextInUseError, ctx: CommandContext): CliError {
  return new CliError<CliCode>({
    code: 'context-in-use',
    message: error.message,
    cause: `The session stored under "${error.context}" was issued for other endpoints than these, or does not record which.`,
    hint: `Sign out of "${error.context}" first, which revokes its key, then run the same command again; or pass another --name.`,
    next: [
      ctx.next(['logout', '--context', error.context], `Sign out of "${error.context}": its key is revoked, and its session goes`),
      ctx.followUp([], { why: 'Then store the endpoints again' })
    ],
    details: { context: error.context }
  });
}

const contextAdd: ImmediateCommand<typeof ContextAddInput, ContextRow> = {
  name: 'context add',
  summary: 'Add a backend context',
  description:
    'Stores the backend under the name of its domain (api.example.com is "example.com"), or under --name. ' +
    'The auth, modules, agent and compute endpoints are derived from an api endpoint whose host starts with "api."; for any other host, give each with its flag. ' +
    'A context of the same name is replaced and keeps its session; a context that holds a session other endpoints issued is left as it is, until you sign out of it. It does not make the context active.',
  effect: 'write',
  immediate: true,
  input: ContextAddInput,
  positionals: ['api_endpoint'],
  examples: [
    { command: `${CLI_NAME} context add https://api.example.com/graphql` },
    {
      command:
        `${CLI_NAME} context add https://example.com/api/graphql --name dev --auth-endpoint https://example.com/auth/graphql ` +
        '--modules-endpoint https://example.com/modules/graphql --agent-endpoint https://example.com/agent/graphql --compute-endpoint https://example.com/compute/graphql',
      description: 'A backend whose host cannot derive the other planes'
    }
  ],
  run(input, ctx) {
    personOnly(ctx, 'context add');
    let backend;
    try {
      backend = backendFromEndpoints({
        api: input.api_endpoint,
        auth: input.auth_endpoint,
        modules: input.modules_endpoint,
        agent: input.agent_endpoint,
        compute: input.compute_endpoint
      });
    } catch (error) {
      if (!(error instanceof EndpointError)) throw error;
      throw new CliError<CliCode>({
        code: 'invalid-input',
        message: error.message,
        hint: error.reason === 'not-derivable' ? 'Pass --auth-endpoint, --modules-endpoint, --agent-endpoint and --compute-endpoint.' : undefined,
        exitCode: ExitCode.usage,
        details: { flag: `--${error.plane}-endpoint` }
      });
    }
    const store = openCliStore(ctx.env);
    let added;
    try {
      added = addBackend(store, backend, input.name === undefined ? undefined : checkedName(input.name, '--name'));
    } catch (error) {
      if (error instanceof ContextInUseError) throw contextInUse(error, ctx);
      if (!(error instanceof ContextNameError)) throw error;
      throw new CliError<CliCode>({ code: 'invalid-input', message: error.message, hint: 'Pass a name for the context with --name.', exitCode: ExitCode.usage, details: { flag: '--name' } });
    }
    const row = contextRow(store, added.name, builder(ctx));
    const next = row.current ? nextFor(store, row, ctx) : [ctx.next(['context', 'use', row.name], 'Make it the active context')];
    return { data: row, text: `Added context ${row.name} (${row.apiEndpoint}).`, next };
  }
};

const contextUse: ImmediateCommand<typeof NAME_INPUT, ContextRow> = {
  name: 'context use',
  summary: 'Switch the active context',
  effect: 'write',
  immediate: true,
  input: NAME_INPUT,
  positionals: ['name'],
  examples: [{ command: `${CLI_NAME} context use example.com` }],
  run(input, ctx) {
    personOnly(ctx, 'context use');
    const name = checkedName(input.name, '--name');
    const store = openCliStore(ctx.env);
    if (!store.loadContext(name)) throw unknownContext(store, name, ctx);
    selectBackend(store, name);
    const row = contextRow(store, name, builder(ctx));
    return {
      data: row,
      text: row.complete ? `${name} is now the active context.` : `${name} is now the active context, but it lacks the ${planeList(row.missing)}.`,
      next: nextFor(store, row, ctx)
    };
  }
};

interface ContextRemoveData {
  name: string;
  removed: true;
  /** True when a session was stored under it: it was signed out first. */
  signedOut: boolean;
  /** What happened to the API key of that session; null when none was stored. */
  key: KeyRevocation | null;
}

/**
 * A context remove while agents are filed under the context: their keys would stay valid with no entry left to remove
 * them by, so nothing is removed; remove each agent first, which ends its key.
 */
function agentsInContext(context: string, agents: string[], ctx: CommandContext): CliError {
  return new CliError<CliCode>({
    code: 'context-in-use',
    message: `The context "${context}" holds ${agents.length === 1 ? 'an agent' : `${agents.length} agents`} of the person (${agents.join(', ')}), whose keys stay valid after the context is gone, so nothing was removed.`,
    hint: 'Remove each agent first, which ends its key, then run the same command again.',
    next: [
      ...agents.map((agent) => ctx.next(['agent', 'remove', agent, '--context', context], `Remove the agent "${agent}": its principal goes, and with it its key`, { drop: ['--context'] })),
      ctx.followUp([], { why: 'Then remove the context' })
    ],
    details: { context, agents }
  });
}

const contextRemove: ImmediateCommand<typeof NAME_INPUT, ContextRemoveData> = {
  name: 'context remove',
  summary: 'Sign out of a context and remove it',
  description:
    'Signs out of the session stored under the context first, as logout does (its API key is revoked at the backend that issued it), then deletes the context and the session. ' +
    'While agents of the person are filed under the context, it removes nothing (context-in-use), and the steps remove each agent first.',
  effect: 'write',
  immediate: true,
  input: NAME_INPUT,
  positionals: ['name'],
  examples: [{ command: `${CLI_NAME} context remove example.com` }],
  async run(input, ctx) {
    personOnly(ctx, 'context remove');
    const name = checkedName(input.name, '--name');
    const store = openCliStore(ctx.env);
    if (!store.loadContext(name)) throw unknownContext(store, name, ctx);
    const agents = listAgents({ store, context: name }).map((agent) => agent.name);
    if (agents.length) throw agentsInContext(name, agents, ctx);
    // The stored session of this context, whatever the environment says: it is the one being removed.
    const signedOut = await signOut({ store, session: resolveSession({ context: name, env: {}, store }) });
    removeBackend(store, name);
    const key = signedOut.kind === 'cleared' ? signedOut.key : null;
    const warning = key ? revocationWarning(key, `the session of "${name}"`) : undefined;
    return {
      data: { name, removed: true, signedOut: key !== null, key },
      text: key ? `Signed out of "${name}" (${KEY_TEXT[key.kind]}), and removed the context.` : `Removed the context "${name}".`,
      warnings: warning ? [warning] : undefined
    };
  }
};

export const contextCommands = [contextList, contextAdd, contextUse, contextRemove];
