/**
 * Authentication commands for the CNC execution engine
 */

import { CLIOptions, Inquirerer, extractFirst } from 'inquirerer';
import chalk from 'yanse';
import {
  getCurrentContext,
  loadContext,
  listContexts,
  getContextCredentials,
  setContextCredentials,
  removeContextCredentials,
  hasValidCredentials,
  loadSettings,
} from '../config';

const usage = `
Constructive Authentication:

  cnc auth <command> [OPTIONS]

Commands:
  set-token <token>     Set API token for the current context
  status                Show authentication status
  logout                Remove credentials for the current context

Options:
  --context <name>      Specify context (defaults to current context)
  --expires <date>      Token expiration date (ISO format)

Examples:
  cnc auth set-token eyJhbGciOiJIUzI1NiIs...
  cnc auth status
  cnc auth logout
  cnc auth set-token <token> --context my-api

  --help, -h            Show this help message
`;

export default async (
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(usage);
    process.exit(0);
  }

  const { first: subcommand, newArgv } = extractFirst(argv);

  if (!subcommand) {
    const answer = await prompter.prompt(argv, [
      {
        type: 'autocomplete',
        name: 'subcommand',
        message: 'What do you want to do?',
        options: ['set-token', 'status', 'logout'],
      },
    ]);
    return handleSubcommand(answer.subcommand as string, newArgv, prompter);
  }

  return handleSubcommand(subcommand, newArgv, prompter);
};

async function handleSubcommand(
  subcommand: string,
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  switch (subcommand) {
    case 'set-token':
      return handleSetToken(argv, prompter);
    case 'status':
      return handleStatus(argv);
    case 'logout':
      return handleLogout(argv, prompter);
    default:
      console.log(usage);
      console.error(chalk.red(`Unknown subcommand: ${subcommand}`));
      process.exit(1);
  }
}

async function getTargetContext(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
): Promise<string> {
  if (argv.context && typeof argv.context === 'string') {
    const context = loadContext(argv.context);
    if (!context) {
      console.error(chalk.red(`Context "${argv.context}" not found.`));
      process.exit(1);
    }
    return argv.context;
  }

  const current = getCurrentContext();
  if (current) {
    return current.name;
  }

  const contexts = listContexts();
  if (contexts.length === 0) {
    console.error(chalk.red('No contexts configured.'));
    console.log(chalk.gray('Run "cnc context create <name>" to create one first.'));
    process.exit(1);
  }

  const answer = await prompter.prompt(argv, [
    {
      type: 'autocomplete',
      name: 'context',
      message: 'Select context',
      options: contexts.map(c => c.name),
    },
  ]);

  return answer.context as string;
}

async function handleSetToken(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const contextName = await getTargetContext(argv, prompter);
  const { first: token, newArgv } = extractFirst(argv);

  let tokenValue = token as string;

  if (!tokenValue) {
    const answer = await prompter.prompt(newArgv, [
      {
        type: 'password',
        name: 'token',
        message: 'API Token',
        required: true,
      },
    ]);
    tokenValue = (answer as Record<string, unknown>).token as string;
  }

  if (!tokenValue || tokenValue.trim() === '') {
    console.error(chalk.red('Token cannot be empty.'));
    process.exit(1);
  }

  const expiresAt = argv.expires as string | undefined;

  setContextCredentials(contextName, tokenValue.trim(), { expiresAt });

  console.log(chalk.green(`Token saved for context: ${contextName}`));
  if (expiresAt) {
    console.log(chalk.gray(`Expires: ${expiresAt}`));
  }
}

function handleStatus(argv: Partial<Record<string, unknown>>) {
  const settings = loadSettings();
  const contexts = listContexts();

  if (contexts.length === 0) {
    console.log(chalk.gray('No contexts configured.'));
    return;
  }

  if (argv.context && typeof argv.context === 'string') {
    const context = loadContext(argv.context);
    if (!context) {
      console.error(chalk.red(`Context "${argv.context}" not found.`));
      process.exit(1);
    }
    showContextAuthStatus(context.name, settings.currentContext === context.name);
    return;
  }

  console.log(chalk.bold('Authentication Status:'));
  console.log();

  for (const context of contexts) {
    const isCurrent = context.name === settings.currentContext;
    showContextAuthStatus(context.name, isCurrent);
  }
}

function showContextAuthStatus(contextName: string, isCurrent: boolean) {
  const creds = getContextCredentials(contextName);
  const hasAuth = hasValidCredentials(contextName);
  const marker = isCurrent ? chalk.green('*') : ' ';

  console.log(`${marker} ${chalk.bold(contextName)}`);

  if (hasAuth && creds) {
    console.log(`    Status: ${chalk.green('Authenticated')}`);
    console.log(`    Token:  ${maskToken(creds.token)}`);
    if (creds.expiresAt) {
      const expiresAt = new Date(creds.expiresAt);
      const now = new Date();
      if (expiresAt <= now) {
        console.log(`    Expires: ${chalk.red(creds.expiresAt + ' (expired)')}`);
      } else {
        console.log(`    Expires: ${creds.expiresAt}`);
      }
    }
  } else if (creds && creds.token) {
    console.log(`    Status: ${chalk.red('Expired')}`);
    console.log(`    Token:  ${maskToken(creds.token)}`);
    if (creds.expiresAt) {
      console.log(`    Expired: ${creds.expiresAt}`);
    }
  } else {
    console.log(`    Status: ${chalk.yellow('Not authenticated')}`);
  }
  console.log();
}

function maskToken(token: string): string {
  if (token.length <= 10) {
    return '****';
  }
  return token.substring(0, 6) + '...' + token.substring(token.length - 4);
}

async function handleLogout(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const contextName = await getTargetContext(argv, prompter);

  const creds = getContextCredentials(contextName);
  if (!creds) {
    console.log(chalk.gray(`No credentials found for context: ${contextName}`));
    return;
  }

  const confirm = await prompter.prompt(argv, [
    {
      type: 'confirm',
      name: 'confirm',
      message: `Remove credentials for context "${contextName}"?`,
      default: false,
    },
  ]);

  if (!confirm.confirm) {
    console.log(chalk.gray('Cancelled.'));
    return;
  }

  if (removeContextCredentials(contextName)) {
    console.log(chalk.green(`Credentials removed for context: ${contextName}`));
  } else {
    console.log(chalk.gray(`No credentials found for context: ${contextName}`));
  }
}
