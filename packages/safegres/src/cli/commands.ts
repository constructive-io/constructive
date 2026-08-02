import { Logger } from '@pgpmjs/logger';
import { CLIOptions, extractFirst, Inquirerer, ParsedArgs } from 'inquirerer';

import audit from './audit';
import doctor from './doctor';
import evalCommand from './eval';
import printConfig from './print-config';

const log = new Logger('safegres');

const usage = `
safegres — Postgres security and performance auditor

Usage:
  safegres <command> [OPTIONS]

Commands:
  audit           Audit grants, RLS flags, policy coverage, and anti-patterns
  perf            Audit index hygiene and policy cost (audit --perf)
  doctor          Diagnose environment, connection, and configuration
  eval            Grade the auditor against a corpus with known answers
  print-config    Show the resolved effective configuration
  help            Show this help message

Run \`safegres <command> --help\` for command-specific options.
`;

const commandMap: Record<
  string,
  (argv: ParsedArgs, prompter: Inquirerer, options: CLIOptions) => unknown
> = {
  audit,
  perf: (argv, prompter, options) => audit({ ...argv, perf: true }, prompter, options),
  doctor,
  eval: evalCommand,
  'print-config': printConfig
};

export const commands = async (
  argv: ParsedArgs,
  prompter: Inquirerer,
  options: CLIOptions
): Promise<void> => {
  const { first: command, newArgv } = extractFirst(argv);

  if (!command && (argv.help || argv.h)) {
    process.stdout.write(usage);
    return;
  }
  if (!command || command === 'help') {
    process.stdout.write(usage);
    return;
  }

  const handler = commandMap[command];
  if (!handler) {
    log.error(`Unknown command: ${command}`);
    process.stdout.write(usage);
    process.exit(2);
  }

  await handler(newArgv as ParsedArgs, prompter, options);
};
