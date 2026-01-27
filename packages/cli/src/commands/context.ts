/**
 * Context management commands for the CNC execution engine
 * Similar to kubectl contexts - manages named endpoint + credential configurations
 */

import { CLIOptions, Inquirerer, extractFirst } from 'inquirerer';
import chalk from 'yanse';
import {
  createContext,
  listContexts,
  loadContext,
  deleteContext,
  getCurrentContext,
  setCurrentContext,
  loadSettings,
  saveSettings,
  getContextCredentials,
  hasValidCredentials,
} from '../config';

const usage = `
Constructive Context Management:

  cnc context <command> [OPTIONS]

Commands:
  create <name>         Create a new context
  list                  List all contexts
  use <name>            Set the active context
  current               Show current context
  delete <name>         Delete a context

Create Options:
  --endpoint <url>      GraphQL endpoint URL

Examples:
  cnc context create my-api --endpoint https://api.example.com/graphql
  cnc context list
  cnc context use my-api
  cnc context current
  cnc context delete my-api

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
        options: ['create', 'list', 'use', 'current', 'delete'],
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
    case 'create':
      return handleCreate(argv, prompter);
    case 'list':
      return handleList();
    case 'use':
      return handleUse(argv, prompter);
    case 'current':
      return handleCurrent();
    case 'delete':
      return handleDelete(argv, prompter);
    default:
      console.log(usage);
      console.error(chalk.red(`Unknown subcommand: ${subcommand}`));
      process.exit(1);
  }
}

async function handleCreate(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const { first: name, newArgv } = extractFirst(argv);
  const settings = loadSettings();

  const answers = await prompter.prompt(
    { name, ...newArgv },
    [
      {
        type: 'text',
        name: 'name',
        message: 'Context name',
        required: true,
      },
      {
        type: 'text',
        name: 'endpoint',
        message: 'GraphQL endpoint URL',
        required: true,
      },
    ]
  );

  const answersRecord = answers as Record<string, unknown>;
  const contextName = answersRecord.name as string;
  const endpoint = answersRecord.endpoint as string;

  const existing = loadContext(contextName);
  if (existing) {
    console.error(chalk.red(`Context "${contextName}" already exists.`));
    console.log(chalk.gray(`Use "cnc context delete ${contextName}" to remove it first.`));
    process.exit(1);
  }

  const context = createContext(contextName, endpoint);

  if (!settings.currentContext) {
    setCurrentContext(contextName);
    console.log(chalk.green(`Created and activated context: ${contextName}`));
  } else {
    console.log(chalk.green(`Created context: ${contextName}`));
  }

  console.log();
  console.log(`  Endpoint: ${context.endpoint}`);
  console.log();
  console.log(chalk.gray(`Next: Run "cnc auth set-token <token>" to configure authentication.`));
}

function handleList() {
  const contexts = listContexts();
  const settings = loadSettings();

  if (contexts.length === 0) {
    console.log(chalk.gray('No contexts configured.'));
    console.log(chalk.gray('Run "cnc context create <name>" to create one.'));
    return;
  }

  console.log(chalk.bold('Contexts:'));
  console.log();

  for (const context of contexts) {
    const isCurrent = context.name === settings.currentContext;
    const hasAuth = hasValidCredentials(context.name);
    const marker = isCurrent ? chalk.green('*') : ' ';
    const authStatus = hasAuth ? chalk.green('[authenticated]') : chalk.yellow('[no token]');

    console.log(`${marker} ${chalk.bold(context.name)} ${authStatus}`);
    console.log(`    Endpoint: ${context.endpoint}`);
    console.log();
  }
}

async function handleUse(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const { first: name } = extractFirst(argv);
  const contexts = listContexts();

  if (contexts.length === 0) {
    console.log(chalk.gray('No contexts configured.'));
    console.log(chalk.gray('Run "cnc context create <name>" to create one.'));
    return;
  }

  let contextName = name as string;

  if (!contextName) {
    const answer = await prompter.prompt(argv, [
      {
        type: 'autocomplete',
        name: 'name',
        message: 'Select context',
        options: contexts.map(c => c.name),
      },
    ]);
    contextName = answer.name as string;
  }

  if (setCurrentContext(contextName)) {
    console.log(chalk.green(`Switched to context: ${contextName}`));
  } else {
    console.error(chalk.red(`Context "${contextName}" not found.`));
    process.exit(1);
  }
}

function handleCurrent() {
  const current = getCurrentContext();
  if (!current) {
    console.log(chalk.gray('No current context set.'));
    console.log(chalk.gray('Run "cnc context use <name>" to set one.'));
    return;
  }

  const creds = getContextCredentials(current.name);
  const hasAuth = hasValidCredentials(current.name);

  console.log();
  console.log(chalk.bold(`Current context: ${current.name}`));
  console.log();
  console.log(`  Endpoint:   ${current.endpoint}`);
  console.log(`  Created:    ${current.createdAt}`);
  console.log(`  Updated:    ${current.updatedAt}`);
  console.log();
  console.log(chalk.bold('Authentication:'));
  if (hasAuth) {
    console.log(`  Status: ${chalk.green('Authenticated')}`);
    if (creds?.expiresAt) {
      console.log(`  Expires: ${creds.expiresAt}`);
    }
  } else {
    console.log(`  Status: ${chalk.yellow('Not authenticated')}`);
    console.log(chalk.gray(`  Run "cnc auth set-token <token>" to configure.`));
  }
  console.log();
}

async function handleDelete(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const { first: name } = extractFirst(argv);
  const contexts = listContexts();

  if (contexts.length === 0) {
    console.log(chalk.gray('No contexts configured.'));
    return;
  }

  let contextName = name as string;

  if (!contextName) {
    const answer = await prompter.prompt(argv, [
      {
        type: 'autocomplete',
        name: 'name',
        message: 'Select context to delete',
        options: contexts.map(c => c.name),
      },
    ]);
    contextName = answer.name as string;
  }

  const confirm = await prompter.prompt(argv, [
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete context "${contextName}"?`,
      default: false,
    },
  ]);

  if (!confirm.confirm) {
    console.log(chalk.gray('Cancelled.'));
    return;
  }

  if (deleteContext(contextName)) {
    const settings = loadSettings();
    if (settings.currentContext === contextName) {
      settings.currentContext = undefined;
      saveSettings(settings);
    }
    console.log(chalk.green(`Deleted context: ${contextName}`));
  } else {
    console.error(chalk.red(`Context "${contextName}" not found.`));
    process.exit(1);
  }
}
