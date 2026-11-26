import { type Cli, type CommandDefinition, createCli } from '@agentic-kit/command';
import { getPackageJson } from 'inquirerer';
import { z } from 'zod';

import { accountCommands } from './commands/account';
import { agentCommands } from './commands/agents';
import { apiCommands } from './commands/api';
import { contextCommands } from './commands/context';
import { dbCommands } from './commands/db';
import { mcpCommand } from './commands/mcp';
import { passthroughCommands } from './commands/passthrough';
import { setupCommands } from './commands/setup';
import { toolCommands } from './commands/tools';
import { CLI_NAME, retryRejectedAgent } from './session';
import { helpTopics } from './topics';

/**
 * A command whose steps, under --as, get one new token after the backend refuses the agent's: a read and a plan change
 * nothing, so they run once more; an apply, or a change that runs at once, does not. A server and a passthrough command
 * keep their own.
 */
function withAgentRetry(command: CommandDefinition): CommandDefinition {
  if ('passthrough' in command || 'serve' in command) return command;
  if (command.effect === 'read' || 'immediate' in command) {
    const { run } = command;
    return { ...command, run: (input, ctx) => retryRejectedAgent(ctx, command.effect === 'read', async () => run(input, ctx)) };
  }
  const { plan, apply } = command;
  return {
    ...command,
    plan: (input, ctx) => retryRejectedAgent(ctx, true, async () => plan(input, ctx)),
    apply: (input, planned, ctx) => retryRejectedAgent(ctx, false, async () => apply(input, planned, ctx))
  };
}

/** Every command of the binary with `tools` as its tool commands, in help order. */
const commandsWith = (tools: CommandDefinition[]): CommandDefinition[] => [
  ...accountCommands,
  ...agentCommands,
  ...contextCommands,
  ...dbCommands,
  ...tools,
  ...apiCommands,
  mcpCommand,
  ...setupCommands(),
  ...passthroughCommands
].map(withAgentRetry);

export const commands = commandsWith(toolCommands);

const GLOBALS = z.object({
  context: z.string().optional().meta({ description: 'The backend context to use (default: the active one; see context list)', 'x-carry': true }),
  as: z.string().optional().meta({ description: 'Run the command as this agent of the person (see agent list), with its own key; without it, a command acts as the person', 'x-carry': true })
});

export function createConstructiveCli(tools: CommandDefinition[] = toolCommands): Cli {
  const all = commandsWith(tools);
  const noPlan = all.filter((command) => command.effect !== 'read' && !('plan' in command)).map((command) => command.name);
  const passthrough = all.filter((command) => 'passthrough' in command).map((command) => command.name);
  return createCli({
    name: CLI_NAME,
    version: getPackageJson(__dirname).version,
    description: 'Use the Constructive platform from a terminal or an agent: sign in, create a database, and change its schema.',
    globals: GLOBALS,
    notes: [
      `Sign in first with "${CLI_NAME} login"; "${CLI_NAME} status" names whatever is still missing.`,
      `"${CLI_NAME} schema show" reads the tables of the database bound to the working directory.`,
      'Every change has a plan: on exit 3 the plan, with what it acts on, where and as whom, is in error.details.plan. Show it to the person, and rerun with --yes once they approve.',
      `These have no plan, so they change at once and refuse --dry-run: ${noPlan.join(', ')}. ` +
        "They change only the person's sign-in or stored contexts, or narrow what an agent may do; codegen takes its own flags and writes generated files; mcp starts a server, whose host asks the person before each change made through it.",
      `Without a terminal, every command prints one JSON envelope, but ${passthrough.join(', ')}, which take their own flags and print their own output; ` +
        'meta.next lists the commands to run next, each with argv to run as it is and placeholders to fill first.',
      `"${CLI_NAME} setup agent" sets a project up for an agent host in one plan: an agent of the person, its name in the project binding (.env), and the MCP entry that runs the tools as that agent.`,
      'A command acts as the person who signed in unless it says --as <name>; then it acts as that agent of the person, with its own key, and it may not change the schema unless the person grants it.',
      `"${CLI_NAME} mcp" serves only the tools that read unless --write (as the person) or an agent that may change the schema (--as) says otherwise; each tool that writes asks the host to get the person's approval of every call. Use --read-only for a host that cannot ask.`
    ],
    commands: all,
    topics: helpTopics(all)
  });
}
