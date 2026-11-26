import { CliError, type CommandContext, ExitCode, isCliError, type ServeCommand } from '@agentic-kit/command';
import { type AnyHarnessTool, failureText, type GateDecision, type GatePolicy, type HarnessToolResult, type ToolFailure } from '@agentic-kit/harness';
import { type McpToolsOptions, serveStdio } from '@agentic-kit/mcp';
import { getPackageJson } from 'inquirerer';
import { z } from 'zod';

import type { CliCode } from '../errors';
import { activeAccount, agentStep, CLI_NAME, configureTools, controlPlane, newTokenWords, openSession, type Session } from '../session';
import { mayWords } from './agents';
import { WRITES_BY_HAND } from './setup';
import { gate, toolEntries } from './tools';

/** The tools the CLI binds to commands, each once: the agent gets what a person gets, and no more. */
export const mcpTools = (): AnyHarnessTool[] => [...new Set(toolEntries.map((entry) => entry.tool))];

const withFailure = (result: HarnessToolResult, failure: ToolFailure): HarnessToolResult => ({ ...result, failure, content: [{ type: 'text', text: failureText(failure) }] });

/** A refusal once no new token helps: what is wrong with the agent, and what the person does about it. */
const unusableFailure = (failure: ToolFailure, session: Session): ToolFailure =>
  session.state.kind === 'agent-unusable' ? { ...failure, message: `${failure.message} ${session.state.problem}`, hint: session.state.fix } : failure;

type Refused = HarnessToolResult & { failure: ToolFailure };
const refusedCall = (result: HarnessToolResult): result is Refused => result.failure?.code === 'signed-out';

/**
 * A tool served under --as, through `agentStep`, as a command's step: a read is called once more with the new token.
 * A change answers with the call to make again, and is never made again by itself.
 */
function renewingTool(tool: AnyHarnessTool, ctx: CommandContext): AnyHarnessTool {
  return {
    ...tool,
    async execute(params, toolContext) {
      const step = await agentStep(ctx, { again: tool.effect === 'read', run: () => tool.execute(params, toolContext), refused: refusedCall });
      switch (step.kind) {
      case 'done':
        return step.outcome;
      case 'unusable':
        return withFailure(step.refused, unusableFailure(step.refused.failure, step.session));
      case 'not-run-again':
        return withFailure(step.refused, {
          ...step.refused.failure,
          message: `${step.refused.failure.message} ${newTokenWords(String(ctx.globals.as))}`,
          hint: 'Call the tool again: its plan is made again with the new token. Part of the change may already have been made, so read the state first.',
          retryable: true,
          calls: [{ tool: tool.name, input: params as Record<string, unknown>, why: 'Call it again with the new token; its plan is made again' }]
        });
      }
    }
  };
}

type Blocked = Extract<GateDecision, { kind: 'blocked' }>;
const refusedPlan = (decision: GateDecision): decision is Blocked => decision.kind === 'blocked' && decision.failure.code === 'signed-out';

/** The gate under --as, through `agentStep`, as a command's plan: a plan changes nothing, so it is made once more with the new token. */
function renewingGate(policy: GatePolicy, ctx: CommandContext): GatePolicy {
  return {
    isGated: (event) => policy.isGated(event),
    async resolvePrompt(event, cwd) {
      const step = await agentStep(ctx, { again: true, run: () => policy.resolvePrompt(event, cwd), refused: refusedPlan });
      return step.kind === 'done' ? step.outcome : { kind: 'blocked', failure: unusableFailure(step.refused.failure, step.session) };
    }
  };
}

const agentWords = (session: Session): string => `the agent "${session.agent}" of ${activeAccount(session)?.email ?? 'the person'}`;

/** The ways to a change the person has, when this server serves only the tools that read. */
function changeWays(session: Session): string {
  const yourself = `run the change themselves, for example "${CLI_NAME} field add <table> <name> --type <type>" ("${CLI_NAME} --help" lists the change commands)`;
  if (session.agent === null) return `For a change, tell the person to ${yourself}.`;
  const entry = `take --read-only out of this server's entry, in a host that asks the person before every write ("${CLI_NAME} setup agent" in this project gives Claude Code's entry)`;
  const schemaChanges = session.state.kind === 'signed-in' && session.state.source === 'agent' && session.state.agent.schemaChanges;
  return schemaChanges
    ? `You may change the schema, but this server serves only the tools that read. For a change, tell the person their two ways: ${yourself}, or ${entry}.`
    : `For a change, tell the person their two ways: ${yourself}, or let you change the schema with "${CLI_NAME} agent grant ${session.agent} --schema-changes" and then ${entry}.`;
}

/**
 * What the host tells its agent, after the server's own words on which tools read and write: who it acts as, that a
 * shell command acts as the agent only with --as (the person's sign-in is in the same store), and, read-only, how the
 * person makes a change.
 */
function serverInstructions(readOnly: boolean, session: Session): string | undefined {
  const who =
    session.agent === null
      ? []
      : [
        `You act as ${agentWords(session)}, which ${mayWords(session.state.kind === 'signed-in' && session.state.source === 'agent' && session.state.agent.schemaChanges)}.`,
        `Run every \`${CLI_NAME}\` command in a shell with \`--as ${session.agent}\`: a command without it acts as the person, with the person's rights, not as this agent.`
      ];
  const words = [...who, ...(readOnly ? [changeWays(session)] : [])];
  return words.length ? words.join(' ') : undefined;
}

/** The server for the project directory of `ctx` and the session it acts as; `readOnly` serves only the tools that read. */
export function mcpOptions(ctx: CommandContext, readOnly: boolean, session: Session): McpToolsOptions {
  const instructions = serverInstructions(readOnly, session);
  return {
    name: CLI_NAME,
    version: getPackageJson(__dirname).version,
    tools: ctx.globals.as === undefined ? mcpTools() : mcpTools().map((tool) => renewingTool(tool, ctx)),
    gate: ctx.globals.as === undefined ? gate : renewingGate(gate, ctx),
    cwd: ctx.cwd,
    readOnly,
    ...(instructions ? { instructions } : {})
  };
}

/** What every tool call will answer until the person fixes it, or null when the session can be used. */
function startupProblem(session: Session): string | null {
  try {
    controlPlane(session);
    return null;
  } catch (error) {
    if (!isCliError(error)) throw error;
    return [error.message, error.hint].filter(Boolean).join(' ');
  }
}

const McpInput = z.object({
  read_only: z.boolean().optional().describe('Serve only the tools that read, also to an agent that may change the schema'),
  write: z.boolean().optional().describe("Without --as: also serve the tools that write, on the person's own session; the host asks the person before each write")
});

type McpFlags = z.output<typeof McpInput>;

function usage(message: string, flag: string): CliError {
  return new CliError<CliCode>({ code: 'invalid-input', message, exitCode: ExitCode.usage, details: { flag } });
}

/**
 * Whether the server serves only the tools that read. Under --as the agent's grant decides, and --read-only can only
 * narrow it; without --as the person's session serves the tools that write only with --write.
 */
function servesReadOnly(input: McpFlags, session: Session): boolean {
  if (input.write && input.read_only) throw usage('--write and --read-only say the opposite: give one of them.', '--write');
  if (session.agent !== null) {
    if (input.write) throw usage(`--write is for the person's own session; with --as, what the agent may do decides, and "${CLI_NAME} agent grant" changes that.`, '--write');
    const schemaChanges = session.state.kind === 'signed-in' && session.state.source === 'agent' && session.state.agent.schemaChanges;
    return input.read_only === true || !schemaChanges;
  }
  return input.write !== true;
}

const AGENT_ENTRY = `{ "command": "${CLI_NAME}", "args": ["mcp", "--as", "<name>", "--read-only"] }`;

export const mcpCommand: ServeCommand<typeof McpInput> = {
  name: 'mcp',
  summary: 'Serve the database tools to an agent host over MCP, on stdin and stdout',
  description:
    'Serves the tools behind the database commands (the same ones, under their tool names) to an agent host over the Model Context Protocol, on stdio, ' +
    'until the host closes stdin. With --as <name> it acts as that agent of the person: it serves the tools that write only when the agent may change the schema and --read-only is not given. ' +
    "Without --as it acts as the person and serves only the tools that read, unless --write also serves the tools that write on the person's own session. " +
    'Each tool that writes asks the host to get the person to approve every call (anthropic/requiresUserInteraction), which Claude Code does in every permission mode. ' +
    `For any other host, use --read-only: "${CLI_NAME} setup agent" keeps it in the entries of Codex and Cursor, and ${WRITES_BY_HAND}. ` +
    'Tools that can lose data, and tools whose result carries a secret, are never served. ' +
    'It acts on the session of --context (or the active one) and on the database bound to the working directory (--cwd).',
  // Through the server a caller can make changes, so it is not a read; the host asks the person before each one.
  effect: 'write',
  // Standard output is the protocol: the layer sends every error, result and warning of this command to stderr.
  stdout: 'reserved',
  input: McpInput,
  examples: [
    { command: `${CLI_NAME} mcp --as helper --read-only`, description: 'What setup agent writes for an agent host; it speaks MCP on stdin and stdout' },
    { command: `${CLI_NAME} mcp --write --context staging --cwd ./my-app`, description: "Serve another backend and project on the person's session, with the tools that write" }
  ],
  notes: [
    `"${CLI_NAME} setup agent" gives the entry ${AGENT_ENTRY}: the server then acts as that agent of the person (--as), with the agent's own key. Claude Code's entry drops --read-only once the agent may change the schema; the entries of other hosts keep it.`,
    "Without --as and --write it serves only the tools that read, on the person's own session. Give --write only to a host that asks the person before each write.",
    'It never serves a tool that can lose data, nor one whose result carries a secret, such as a new API key: the person runs those as commands.',
    'Standard output carries only the protocol, also when it fails to start: every error and result goes to stderr. It never prompts, so it needs no terminal.',
    'A sign-in problem does not stop it: each tool call answers with it until the person runs login, and the server sees the new session without a restart.'
  ],
  async serve(input, ctx) {
    // A wrong --context or environment fails here: only a change to the host's settings fixes it, so a server could not recover.
    const session = await openSession(ctx);
    const readOnly = servesReadOnly(input, session);
    configureTools(session);
    const problem = startupProblem(session);
    if (problem) ctx.stderr.write(`${CLI_NAME} mcp: ${problem} Every tool call answers with this until it is fixed; the server needs no restart.\n`);
    const server = serveStdio(mcpOptions(ctx, readOnly, session));
    await server.closed;
    return { data: undefined };
  }
};
