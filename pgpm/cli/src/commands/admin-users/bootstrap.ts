import { PgpmInit } from '@pgpmjs/core';
import { getConnEnvOptions } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import { getPgEnvOptions } from 'pg-env';

const log = new Logger('admin-users-bootstrap');

const bootstrapUsageText = `
Admin Users Bootstrap Command:

  pgpm admin-users bootstrap [OPTIONS]

  Initialize postgres roles and permissions. This command must be run before adding users.
  Creates the standard postgres roles: anonymous, authenticated, administrator.

Options:
  --help, -h              Show this help message
  --cwd <directory>       Working directory (default: current directory)
  --client                Also create the restricted authenticated_client role
                          (for SQL-level proxy clients: inherits from
                          authenticated; set_config/pg_notify revoked from
                          PUBLIC; server-enforced statement_timeout)

Examples:
  pgpm admin-users bootstrap              # Initialize postgres roles
  pgpm admin-users bootstrap --client     # Also create authenticated_client
`;

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(bootstrapUsageText);
    process.exit(0);
  }

  const pgEnv = getPgEnvOptions();

  const { yes } = await prompter.prompt(argv, [
    {
      type: 'confirm',
      name: 'yes',
      message: 'Are you sure you want to initialize postgres roles and permissions?',
      default: false
    }
  ]);

  if (!yes) {
    log.info('Operation cancelled.');
    return;
  }

  // Get merged options (defaults + config + env + overrides)
  const db = getConnEnvOptions();

  const init = new PgpmInit(pgEnv);
  
  try {
    await init.bootstrapRoles(db.roles!);
    if (argv.client) {
      await init.bootstrapClientRole(db.roles!);
    }
    log.success('postgres roles and permissions initialized successfully.');
  } finally {
    await init.close();
  }

  return argv;
};
