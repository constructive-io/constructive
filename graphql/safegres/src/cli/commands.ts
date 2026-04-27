/* eslint-disable no-console */
import { CLIOptions, extractFirst, Inquirerer, ParsedArgs } from 'inquirerer';

import pg from './pg';

const usage = `
safegres — pure-PostgreSQL RLS auditor

Usage:
  safegres <command> [OPTIONS]

Commands:
  pg              Audit grants, RLS flags, policy coverage, and anti-patterns
  help            Show this help message

Run \`safegres <command> --help\` for command-specific options.
`;

const commandMap: Record<string, (argv: ParsedArgs, prompter: Inquirerer, options: CLIOptions) => unknown> = {
  pg
};

export const commands = async (
  argv: ParsedArgs,
  prompter: Inquirerer,
  options: CLIOptions
): Promise<void> => {
  const { first: command, newArgv } = extractFirst(argv);

  if (!command || command === 'help' || argv.help || argv.h) {
    console.log(usage);
    return;
  }

  const handler = commandMap[command];
  if (!handler) {
    console.error(`Unknown command: ${command}\n${usage}`);
    process.exit(2);
  }

  await handler(newArgv as ParsedArgs, prompter, options);
};
