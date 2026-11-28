import { type ChangeCommand, CliError, type CommandContext, ExitCode, type NextStep, type Planned } from '@agentic-kit/command';
import { mergeEnv, readEnv } from '@agentic-kit/db-tools';
import { alignColumns, listed } from '@agentic-kit/harness';
import { type AgentDetails, type AgentInfo, checkAgentName, createAgent, grantSchemaChanges, listAgents, renewAgentKey } from '@agentic-kit/session';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseToml } from 'smol-toml';
import { isDeepStrictEqual, promisify } from 'util';
import { z } from 'zod';

import type { CliCode } from '../errors';
import { checkWrites, writeFileReplacing, writtenFile } from '../project-files';
import { AGENT_BINDING_KEY, boundAgent, type BoundValue, CLI_NAME, controlPlane, dayOf, openPersonSession, PASSWORD_STDIN, passwordNeeds, personOnly, planAccount, type Session } from '../session';
import { agentError, agentPassword, type Owner, owner, PASSWORD_WORDS, SCHEMA_CHANGES_FLAG, SCHEMA_CHANGES_SCOPE } from './agents';

const SERVER = 'constructive';

/** What the person decides on: the agent's own credential is not a sandbox for a program that runs as them. */
export const SHELL_LIMIT = "The agent's limits cover Constructive's tools, not its own shell commands, which can use your sign-in.";

/** How a project gets the Constructive skill: the skills CLI installs and updates it, not this one. */
export const SKILLS: NextStep = {
  command: 'npx skills add constructive-io/constructive-skills --skill constructive-headless',
  argv: ['npx', 'skills', 'add', 'constructive-io/constructive-skills', '--skill', 'constructive-headless'],
  why: 'Add the Constructive skill to the agent host of this project'
};

const HOSTS = ['claude', 'codex', 'cursor'] as const;

type Host = (typeof HOSTS)[number];

/**
 * How each host is told to start a local MCP server, as its own documentation says: Claude Code reads the project's
 * .mcp.json and asks once to trust it (code.claude.com/docs/en/mcp); Codex reads .codex/config.toml in a trusted
 * project (learn.chatgpt.com/docs/extend/mcp); Cursor reads .cursor/mcp.json (cursor.com/docs/context/mcp). `found`
 * are the files that show a host is used here. `asksBeforeWrites` is true only for a host known to ask the person before
 * every call of a tool the server marks with `anthropic/requiresUserInteraction`, in every mode: every other host's
 * entry keeps --read-only.
 */
export const HOST_SETUP: { [host in Host]: { label: string; found: string[]; mcpFile: string; format: 'json' | 'toml'; pickUp: string; asksBeforeWrites: boolean } } = {
  claude: {
    label: 'Claude Code',
    found: ['.claude', '.mcp.json', 'CLAUDE.md'],
    mcpFile: '.mcp.json',
    format: 'json',
    pickUp: `Claude Code asks once whether to trust the servers of .mcp.json: run claude in this directory and approve "${SERVER}".`,
    asksBeforeWrites: true
  },
  codex: {
    label: 'Codex',
    found: ['.codex', 'AGENTS.md'],
    mcpFile: '.codex/config.toml',
    format: 'toml',
    pickUp: 'Codex reads .codex/config.toml in a trusted project only, and starts the server when a thread starts.',
    asksBeforeWrites: false
  },
  cursor: {
    label: 'Cursor',
    found: ['.cursor'],
    mcpFile: '.cursor/mcp.json',
    format: 'json',
    pickUp: 'Restart Cursor to load the server.',
    asksBeforeWrites: false
  }
};

/** How a person lets an agent write through a host that keeps --read-only. */
export const WRITES_BY_HAND =
  'to let an agent write through such a host, take "--read-only" out of its entry\'s args by hand, once you have checked that the host asks you before every call of a tool that writes';

type Entry = { command: string; args: string[] };

const entryOf = (name: string, readOnly: boolean): Entry => ({ command: CLI_NAME, args: ['mcp', '--as', name, ...(readOnly ? ['--read-only'] : [])] });

/** Whether a host's entry keeps --read-only: always for an agent that may not change the schema, and for a host not known to ask before each write. */
const readOnlyFor = (host: Host, schemaChanges: boolean): boolean => !schemaChanges || !HOST_SETUP[host].asksBeforeWrites;

/** Why a host's entry keeps --read-only for an agent that may change the schema; undefined when it does not. */
function readOnlyWarning(host: Host, schemaChanges: boolean): string | undefined {
  const { label, asksBeforeWrites } = HOST_SETUP[host];
  if (!schemaChanges || asksBeforeWrites) return undefined;
  return `! ${label} keeps --read-only: ${CLI_NAME} cannot tell that it asks you before each write. ${WRITES_BY_HAND[0].toUpperCase()}${WRITES_BY_HAND.slice(1)}.`;
}

const entryWords = (entry: Entry): string => [entry.command, ...entry.args].join(' ');

/** A host file that holds only our server, which is also the block a person adds to a file that exists. */
const configText = (format: 'json' | 'toml', entry: Entry): string =>
  format === 'toml'
    ? `[mcp_servers.${SERVER}]\ncommand = ${JSON.stringify(entry.command)}\nargs = [${entry.args.map((word) => JSON.stringify(word)).join(', ')}]\n`
    : `${JSON.stringify({ mcpServers: { [SERVER]: entry } }, null, 2)}\n`;

/**
 * What setup does with the MCP file of a host. It writes a file only where there is none, and never edits one that
 * exists: Claude Code's own `claude mcp add` adds the entry when the file has no server of that name; a server that is
 * this agent's entry but for --read-only gets the one change to make by hand; otherwise the result gives the entry for
 * the person to add.
 */
type McpAction =
  | { kind: 'create'; file: string; content: string }
  | { kind: 'keep'; file: string }
  | { kind: 'host-command'; file: string; argv: string[] }
  | { kind: 'read-only-flag'; file: string; change: 'add' | 'remove' }
  | { kind: 'print'; file: string; block: string; why: string };

const READ_ONLY_CHANGE: { [change in 'add' | 'remove']: { plan: string; apply: string } } = {
  add: { plan: 'add "--read-only" to its args by hand', apply: 'Add "--read-only" to its args by hand, then reload the host, so that it serves only the tools that read' },
  remove: { plan: 'take "--read-only" out of its args by hand', apply: 'Take "--read-only" out of its args by hand, then reload the host, so that it serves the tools that write' }
};

const DIFFERS_IN_READ_ONLY = `its "${SERVER}" server differs from this entry only in --read-only`;

function readText(file: string): string | undefined {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
}

const UNREADABLE = Symbol('unreadable');

/** Our server in a host file, as plain data (the TOML parser's tables have no prototype): undefined when it has none. */
function serverOf(text: string, format: 'json' | 'toml'): unknown {
  try {
    const config = format === 'toml' ? parseToml(text) : JSON.parse(text);
    const servers = (config as { mcp_servers?: unknown; mcpServers?: unknown })[format === 'toml' ? 'mcp_servers' : 'mcpServers'];
    const entry = typeof servers === 'object' && servers !== null ? (servers as Record<string, unknown>)[SERVER] : undefined;
    return entry === undefined ? undefined : JSON.parse(JSON.stringify(entry));
  } catch {
    return UNREADABLE;
  }
}

/** Whether `program` is an executable file in a directory of the run's PATH. */
function onPath(program: string, env: NodeJS.ProcessEnv): boolean {
  return (env.PATH ?? '').split(path.delimiter).filter(Boolean).some((directory) => {
    const file = path.join(directory, program);
    try {
      fs.accessSync(file, fs.constants.X_OK);
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  });
}

function planMcp(cwd: string, host: Host, name: string, readOnly: boolean, claudeOnPath: boolean): McpAction {
  const { mcpFile: file, format } = HOST_SETUP[host];
  const entry = entryOf(name, readOnly);
  const text = readText(path.join(cwd, file));
  if (text === undefined) return { kind: 'create', file, content: configText(format, entry) };
  const held = serverOf(text, format);
  if (isDeepStrictEqual(held, entry)) return { kind: 'keep', file };
  if (isDeepStrictEqual(held, entryOf(name, !readOnly))) return { kind: 'read-only-flag', file, change: readOnly ? 'add' : 'remove' };
  if (host === 'claude' && held === undefined && claudeOnPath) {
    return { kind: 'host-command', file, argv: ['claude', 'mcp', 'add', '--scope', 'project', SERVER, '--', entry.command, ...entry.args] };
  }
  // A project file is not the person's text, so the plan never quotes what another server in it runs.
  const why =
    held === UNREADABLE
      ? `${file} does not parse, and ${CLI_NAME} never edits a host's file`
      : held === undefined
        ? `${file} exists, and ${CLI_NAME} never edits a host's file`
        : `${file} has another "${SERVER}" server, and ${CLI_NAME} never edits a host's file`;
  return { kind: 'print', file, block: configText(format, entry), why };
}

/** A host's row of the plan, [mark, file, what], and the warning when its entry keeps --read-only for an agent that may write. */
function mcpRow(action: McpAction, entry: Entry): string[] {
  switch (action.kind) {
  case 'create':
    return ['+', action.file, entryWords(entry)];
  case 'keep':
    return ['=', action.file, entryWords(entry)];
  case 'host-command':
    return ['+', action.file, `${entryWords(entry)}, added by "${action.argv.join(' ')}"`];
  case 'read-only-flag':
    return ['!', action.file, `${DIFFERS_IN_READ_ONLY}. ${CLI_NAME} never edits a host's file, so the result says to ${READ_ONLY_CHANGE[action.change].plan}.`];
  case 'print':
    return ['!', action.file, `${action.why}, so the result gives the entry to add by hand: ${entryWords(entry)}`];
  }
}

/** The agent name of a directory: its folder name, in the characters an agent name may hold. */
function defaultName(cwd: string): string {
  const name = path.basename(cwd).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 100);
  return name || 'agent';
}

/** What happens to the agent: a new one, or one that exists, with a new key when its key ended and the grant the flag asks for. */
type AgentPlan = { kind: 'add' } | { kind: 'existing'; info: AgentDetails; renew: boolean; grant: boolean };

/** A new agent and a renewal each make a key, which needs the person's password. */
const makesKey = (agent: AgentPlan): boolean => agent.kind === 'add' || agent.renew;

const SetupInput = z.object({
  name: z.string().optional().describe('The name of the agent (default: the one the project binding names, else the folder name)'),
  host: z.array(z.enum(HOSTS)).optional().describe('The agent hosts to set up (default: the ones this directory shows)'),
  allow_schema_changes: z.boolean().optional().describe(SCHEMA_CHANGES_FLAG),
  organization: z.string().optional().describe('The id of the organization the agent is held to'),
  ...PASSWORD_STDIN
});

/** What `apply` sets up: the agent, the binding and the host entries, exactly as the plan said, and the facts the plan was made from. */
interface SetupPlanned extends Planned {
  session: Session;
  who: Owner;
  name: string;
  hosts: Host[];
  agent: AgentPlan;
  schemaChanges: boolean;
  mcps: Array<{ host: Host; entry: Entry; action: McpAction }>;
}

/** The agent's rows of the plan, [mark, item, what], then the lines that warn or explain. */
function agentRows(name: string, agent: AgentPlan, schemaChanges: boolean, asked: boolean): { rows: string[][]; notes: string[] } {
  const label = schemaChanges ? 'may change the schema' : 'read only';
  if (agent.kind === 'add') return { rows: [['+', 'agent', `${name}  ${label}; needs ${PASSWORD_WORDS}`]], notes: schemaChanges ? [`! ${SCHEMA_CHANGES_SCOPE}`] : [] };
  return {
    rows: [
      agent.renew
        ? ['~', 'agent', `${name}  key ended ${dayOf(agent.info.keyExpiresAt)} -> new 30-day key; needs ${PASSWORD_WORDS}`]
        : ['=', 'agent', `${name}  exists; ${agent.grant ? 'read only' : label}`],
      ...(agent.grant ? [['~', 'agent', `${name}  read only -> may change the schema`]] : [])
    ],
    notes: [
      ...(agent.grant ? [`! ${SCHEMA_CHANGES_SCOPE}`] : []),
      ...(schemaChanges && !asked ? [`It keeps schema changes; "${CLI_NAME} agent revoke ${name} --schema-changes" narrows it.`] : [])
    ]
  };
}

/** Writes a new file, never one that exists (an exclusive create also refuses a link): false when the file is there by now. */
function createFile(file: string, content: string): boolean {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    fs.writeFileSync(file, content, { flag: 'wx', mode: 0o644 });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}

const run = promisify(execFile);

/**
 * Runs a host's own command that adds the entry, then reads the file again: undefined when the file has the entry,
 * else the warning, and the result gives the entry to add by hand. The exit code says only that the command ran.
 */
async function hostAdded(action: Extract<McpAction, { kind: 'host-command' }>, host: Host, name: string, readOnly: boolean, ctx: CommandContext): Promise<string | undefined> {
  const command = `"${action.argv.join(' ')}"`;
  try {
    await run(action.argv[0], action.argv.slice(1), { cwd: ctx.cwd, env: ctx.env, timeout: 30_000 });
  } catch (error) {
    const stderr = String((error as { stderr?: unknown }).stderr ?? '').trim().split('\n')[0];
    return `${command} failed (${stderr || (error as Error).message}), so the entry was not added to ${action.file}.`;
  }
  return planMcp(ctx.cwd, host, name, readOnly, true).kind === 'keep' ? undefined : `${command} ran, but ${action.file} does not have the "${SERVER}" server afterwards, so the entry was not added.`;
}

/** What the plan does to the binding, as a row [mark, file, what]: write it, keep it, or replace the entry, which it shows only when that is an agent name. */
function bindingRow(bound: BoundValue, name: string): string[] {
  switch (bound.status) {
  case 'absent':
    return ['+', '.env', `${AGENT_BINDING_KEY}=${name}`];
  case 'invalid':
    return ['~', '.env', `${AGENT_BINDING_KEY} (not a valid agent name) -> ${name}`];
  case 'valid':
    return bound.value === name ? ['=', '.env', `${AGENT_BINDING_KEY}=${name}`] : ['~', '.env', `${AGENT_BINDING_KEY}=${bound.value} -> ${name}`];
  }
}

/**
 * The agent of the run: the name given, else the one the binding names, else the folder's, checked. An entry in .env
 * that is not an agent name stops the run without its text, since a cloned project's .env is not the person's.
 */
function agentNameOf(given: string | undefined, bound: BoundValue, ctx: CommandContext): string {
  if (given === undefined && bound.status === 'invalid') {
    throw new CliError<CliCode>({
      code: 'invalid-binding',
      message: `The ${AGENT_BINDING_KEY} entry in the .env of this project is not a valid agent name, so setup agent cannot tell which agent to set up. The entry is not shown.`,
      hint: `Name the agent with "${CLI_NAME} setup agent <name>", which replaces the entry; or fix the line in .env, or remove it.`,
      exitCode: ExitCode.usage,
      details: { file: '.env', variable: AGENT_BINDING_KEY },
      next: [ctx.next(['setup', 'agent', { placeholder: 'name' }], `Name the agent: it replaces the ${AGENT_BINDING_KEY} entry of .env`)]
    });
  }
  try {
    return checkAgentName(given ?? (bound.status === 'valid' ? bound.value : defaultName(ctx.cwd)));
  } catch (error) {
    throw new CliError<CliCode>({ code: 'invalid-input', message: (error as Error).message, exitCode: ExitCode.usage, details: { flag: 'name' } });
  }
}

/** `setup agent`. */
export function setupCommands(): ChangeCommand<typeof SetupInput, unknown, SetupPlanned>[] {
  const setupAgent: ChangeCommand<typeof SetupInput, unknown, SetupPlanned> = {
    name: 'setup agent',
    summary: 'Set up this project for an agent host',
    description:
      'Adds the agent, or renews its key when the key ended; --allow-schema-changes also grants an agent that exists. ' +
      `It writes the agent's name to .env (${AGENT_BINDING_KEY}) and gives each host it finds the MCP server "${CLI_NAME} mcp --as <name>" ` +
      `(${HOSTS.map((host) => `${HOST_SETUP[host].label}: ${HOST_SETUP[host].mcpFile}`).join('; ')}). ` +
      `The entry keeps --read-only unless the agent may change the schema and the host asks you before each write, which only ${listed(HOSTS.filter((host) => HOST_SETUP[host].asksBeforeWrites).map((host) => HOST_SETUP[host].label))} is known to do. ` +
      "It creates a host's file only where there is none, and never edits one. It writes no secret to the project and installs no skill. " +
      SHELL_LIMIT,
    effect: 'write',
    input: SetupInput,
    positionals: ['name'],
    examples: [
      { command: `${CLI_NAME} setup agent helper --dry-run`, description: 'Show what it would add and write; nothing changes' },
      { command: `printf %s "$PASSWORD" | ${CLI_NAME} setup agent helper --host claude --password-stdin --yes`, description: 'From a script' }
    ],
    async plan(input, ctx) {
      personOnly(ctx, 'setup agent');
      const bound = await boundAgent(ctx.cwd);
      const name = agentNameOf(input.name, bound, ctx);
      const hosts = input.host?.length ? input.host : HOSTS.filter((host) => HOST_SETUP[host].found.some((file) => fs.existsSync(path.join(ctx.cwd, file))));
      if (!hosts.length) {
        throw new CliError<CliCode>({
          code: 'missing-input',
          message: `This directory shows no agent host (${HOSTS.map((host) => `${HOST_SETUP[host].label}: ${HOST_SETUP[host].found.join(' or ')}`).join('; ')}), so name one with --host.`,
          exitCode: ExitCode.usage,
          details: { flag: '--host', missing: ['--host'] },
          next: HOSTS.map((host) => ctx.next(['setup', 'agent', name, '--host', host], `Set it up for ${HOST_SETUP[host].label}`))
        });
      }
      const session = openPersonSession(ctx);
      const plane = controlPlane(session);
      const who = owner(session);
      const existing: AgentInfo | undefined = listAgents({ store: session.store, ...(session.context ? { context: session.context } : {}) }).find((info) => info.name === name);
      if (existing && ('unreadable' in existing || existing.state === 'issuer-mismatch')) {
        throw new CliError<CliCode>({
          code: 'agent-unusable',
          message: `The agent "${name}" exists but cannot be used (${'unreadable' in existing ? 'its stored entry cannot be read' : 'it was set up for another backend'}), so it is not set up again on its own.`,
          hint: 'Remove it, then run setup agent again.',
          next: [ctx.next(['agent', 'remove', name], 'Remove it first')]
        });
      }
      const asked = input.allow_schema_changes === true;
      const known = existing && !('unreadable' in existing) ? existing : undefined;
      // The flag on an agent that exists grants through this plan; leaving it out never narrows one.
      const agent: AgentPlan = known ? { kind: 'existing', info: known, renew: known.state === 'set-up-again', grant: !known.schemaChanges && asked } : { kind: 'add' };
      const schemaChanges = agent.kind === 'existing' ? agent.info.schemaChanges || agent.grant : asked;
      checkWrites(ctx.cwd, [path.join(ctx.cwd, '.env'), ...hosts.map((host) => path.join(ctx.cwd, HOST_SETUP[host].mcpFile))]);
      const claudeOnPath = onPath('claude', ctx.env);
      const mcps = hosts.map((host) => {
        const readOnly = readOnlyFor(host, schemaChanges);
        return { host, entry: entryOf(name, readOnly), action: planMcp(ctx.cwd, host, name, readOnly, claudeOnPath) };
      });
      const forAgent = agentRows(name, agent, schemaChanges, asked);
      const lines = [
        `directory: ${ctx.cwd}`,
        ...alignColumns([...forAgent.rows, bindingRow(bound, name), ...mcps.map(({ entry, action }) => mcpRow(action, entry))]),
        ...forAgent.notes,
        ...mcps.map(({ host }) => readOnlyWarning(host, schemaChanges)).filter((warning): warning is string => warning !== undefined),
        `No secret goes into the project. Commands still act as you unless they say --as ${name}.`,
        `! ${SHELL_LIMIT}`
      ];
      const labels = listed(hosts.map((host) => HOST_SETUP[host].label));
      return {
        plan: { title: `Set up this directory for ${labels}`, message: lines.join('\n'), target: { kind: 'account', apiEndpoint: plane.endpoint, account: planAccount(session) } },
        ...(makesKey(agent) ? passwordNeeds(input.password_stdin) : {}),
        session,
        who,
        name,
        hosts,
        agent,
        schemaChanges,
        mcps
      };
    },
    async apply(input, { session, who, name, hosts, agent, schemaChanges, mcps }, ctx) {
      // A question on a terminal can stay open: the files the plan was made from are checked and read again first.
      checkWrites(ctx.cwd, [path.join(ctx.cwd, '.env'), ...hosts.map((host) => path.join(ctx.cwd, HOST_SETUP[host].mcpFile))]);
      const claudeOnPath = onPath('claude', ctx.env);
      const changed = mcps
        .filter(({ host, action }) => !isDeepStrictEqual(planMcp(ctx.cwd, host, name, readOnlyFor(host, schemaChanges), claudeOnPath), action))
        .map(({ action }) => action.file);
      if (changed.length) {
        throw new CliError<CliCode>({
          code: 'conflict',
          message: `Nothing was changed: ${changed.join(', ')} changed since the plan was made.`,
          hint: 'Run setup agent again to see the plan of the files as they are now.',
          details: { files: changed }
        });
      }
      const password = makesKey(agent) ? await agentPassword(ctx, input.password_stdin, 'setup agent', who) : undefined;
      let info: AgentInfo;
      try {
        if (agent.kind === 'add') {
          info = await createAgent({ store: session.store, session: session.state, password, name, allowSchemaChanges: schemaChanges, ...(input.organization ? { organization: input.organization } : {}) });
        } else {
          info = agent.renew ? (await renewAgentKey({ store: session.store, session: session.state, password, name })).agent : agent.info;
          if (agent.grant) info = await grantSchemaChanges({ store: session.store, session: session.state, name });
        }
      } catch (error) {
        agentError(error, ctx);
      }

      const envFile = writtenFile(path.join(ctx.cwd, '.env'));
      const env = readText(envFile);
      if (env === undefined || readEnv(env)[AGENT_BINDING_KEY] !== name) writeFileReplacing(ctx.cwd, envFile, mergeEnv(env ?? '', { [AGENT_BINDING_KEY]: name }));

      const warnings: string[] = [];
      const hostLines: string[] = [];
      const results: Array<{ host: Host; file: string; entry: Entry; action: McpAction['kind']; change?: 'add' | 'remove'; block?: string }> = [];
      for (const { host, entry, action } of mcps) {
        const { pickUp } = HOST_SETUP[host];
        const warning = readOnlyWarning(host, schemaChanges);
        const done = (line: string) => hostLines.push(line, ...(warning ? [warning] : []));
        if (action.kind === 'create' && createFile(path.join(ctx.cwd, action.file), action.content)) {
          done(`+ ${action.file}  created. ${pickUp}`);
          results.push({ host, file: action.file, entry, action: action.kind });
        } else if (action.kind === 'keep') {
          done(`= ${action.file}  has the entry already. ${pickUp}`);
          results.push({ host, file: action.file, entry, action: action.kind });
        } else if (action.kind === 'read-only-flag') {
          const block = configText(HOST_SETUP[host].format, entry);
          done(`! ${action.file}: ${DIFFERS_IN_READ_ONLY}. ${READ_ONLY_CHANGE[action.change].apply}:\n${block.trimEnd()}`);
          results.push({ host, file: action.file, entry, action: action.kind, change: action.change, block });
        } else {
          const problem = action.kind === 'host-command' ? await hostAdded(action, host, name, readOnlyFor(host, schemaChanges), ctx) : undefined;
          if (action.kind === 'host-command' && problem === undefined) {
            done(`+ ${action.file}  added by "${action.argv.join(' ')}". ${pickUp}`);
            results.push({ host, file: action.file, entry, action: action.kind });
            continue;
          }
          const block = configText(HOST_SETUP[host].format, entry);
          if (action.kind === 'create') warnings.push(`${action.file} was created by another program while setup ran, so nothing was written to it.`);
          if (problem) warnings.push(problem);
          done(`! ${action.file}: add this "${SERVER}" server by hand, then reload the host:\n${block.trimEnd()}`);
          results.push({ host, file: action.file, entry, action: 'print', block });
        }
      }
      return {
        data: { agent: info, owner: who, binding: { file: '.env', key: AGENT_BINDING_KEY, name }, hosts: results },
        text: [
          `Set up agent ${name} (${schemaChanges ? 'may change the schema' : 'read only'}) for this directory.`,
          ...(schemaChanges ? [`! ${SCHEMA_CHANGES_SCOPE}`] : []),
          `= .env  ${AGENT_BINDING_KEY}=${name}`,
          ...hostLines,
          `Commands still act as you unless they say --as ${name}. Next, add the skill: ${SKILLS.command}`,
          `! ${SHELL_LIMIT}`
        ].join('\n'),
        ...(warnings.length ? { warnings } : {}),
        next: [ctx.next(['whoami', '--as', name], 'Check the agent: who it is, and what it may do'), SKILLS]
      };
    }
  };
  return [setupAgent];
}
