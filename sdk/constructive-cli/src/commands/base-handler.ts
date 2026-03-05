/**
 * Base command handler types and utilities.
 *
 * Provides the standard command handler signature and helpers for building
 * CLI commands that work with inquirerer's CLI class.
 */

import type { CLIOptions, Inquirerer } from 'inquirerer';
import { extractFirst } from 'inquirerer';

/**
 * Standard command handler function signature.
 * All CLI commands follow this pattern for compatibility with inquirerer's CLI class.
 *
 * @param argv - Parsed command-line arguments from minimist
 * @param prompter - The inquirerer prompter instance for interactive prompts
 * @param options - CLI options including minimist configuration
 */
export type CommandHandler = (
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer,
  options: CLIOptions
) => Promise<void>;

/**
 * Command definition for registering commands with the CLI.
 */
export interface CommandDefinition {
  /** The command name (used as the subcommand) */
  name: string;
  /** The command handler function */
  handler: CommandHandler;
  /** Optional usage/help text */
  usage?: string;
}

/**
 * Build a commands map from an array of command definitions.
 * Returns the format expected by inquirerer's CLI class.
 *
 * @param definitions - Array of command definitions
 * @returns Commands map keyed by command name
 */
export function buildCommands(
  definitions: CommandDefinition[]
): Record<string, CommandHandler> {
  const commands: Record<string, CommandHandler> = {};
  for (const def of definitions) {
    commands[def.name] = def.handler;
  }
  return commands;
}

/**
 * Create a command handler that dispatches to subcommands.
 * Useful for building nested command structures (e.g. `cli context create`).
 *
 * @param subcommands - Map of subcommand name to handler function
 * @param usage - Usage text shown when no subcommand is provided or --help is used
 * @returns A command handler that extracts the first arg and dispatches
 */
export function createSubcommandHandler(
  subcommands: Record<string, CommandHandler>,
  usage: string
): CommandHandler {
  return async (argv, prompter, options) => {
    if (argv.help || argv.h) {
      console.log(usage);
      process.exit(0);
    }

    const { first: subcommand, newArgv } = extractFirst(argv);

    if (!subcommand || !subcommands[subcommand]) {
      console.log(usage);
      process.exit(1);
    }

    await subcommands[subcommand](newArgv, prompter, options);
  };
}
