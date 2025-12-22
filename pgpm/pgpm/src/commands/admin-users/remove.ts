import { PgpmInit, ResolvedRoleMapping } from '@pgpmjs/core';
import { getConnEnvOptions } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, Question } from 'inquirerer';
import { ParsedArgs } from 'minimist';
import { getPgEnvOptions } from 'pg-env';

const log = new Logger('admin-users-remove');

const removeUsageText = `
Admin Users Remove Command:

  pgpm admin-users remove [OPTIONS]

  Remove database users and revoke their postgres roles.

Options:
  --help, -h              Show this help message
  --username <username>   Username for the database user to remove
  --test                  Remove test users (app_user, app_admin)
  --cwd <directory>       Working directory (default: current directory)

Examples:
  pgpm admin-users remove --username myuser
  pgpm admin-users remove --test             # Remove test users
  pgpm admin-users remove                    # Will prompt for username
`;

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(removeUsageText);
    process.exit(0);
  }

  const pgEnv = getPgEnvOptions();
  const isTest = argv.test;

  // Get resolved options using deepmerge (defaults + config + env + overrides)
  const dbOptions = getConnEnvOptions();
  const roles: ResolvedRoleMapping = {
    anonymous: dbOptions.roles?.anonymous ?? 'anonymous',
    authenticated: dbOptions.roles?.authenticated ?? 'authenticated',
    administrator: dbOptions.roles?.administrator ?? 'administrator'
  };
  const appUser = dbOptions.connections?.app?.user ?? 'app_user';
  const adminUser = dbOptions.connections?.admin?.user ?? 'app_admin';

  const init = new PgpmInit(pgEnv);
  
  try {
    if (isTest) {
      const { yes: confirmTest } = await prompter.prompt(argv, [
        {
          type: 'confirm',
          name: 'yes',
          message: `Are you sure you want to remove test users (${appUser}, ${adminUser})?`,
          default: false
        }
      ]);

      if (!confirmTest) {
        log.info('Operation cancelled.');
        return;
      }

      await init.removeDbRoles(appUser, roles);
      await init.removeDbRoles(adminUser, roles);
      log.success('Test users removed successfully.');
    } else {
      const prompts: Question[] = [
        {
          type: 'text',
          name: 'username',
          message: 'Enter username for database user to remove:',
          validate: (input: any) => input && input.trim().length > 0
        }
      ];

      const { username } = await prompter.prompt(argv, prompts);

      const { yes } = await prompter.prompt(argv, [
        {
          type: 'confirm',
          name: 'yes',
          message: `Are you sure you want to remove database user "${username}"?`,
          default: false
        }
      ]);

      if (!yes) {
        log.info('Operation cancelled.');
        return;
      }

      await init.removeDbRoles(username, roles);
      log.success(`Database user "${username}" removed successfully.`);
    }
  } finally {
    await init.close();
  }

  return argv;
};
