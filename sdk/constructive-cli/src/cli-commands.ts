/**
 * Built-in commands for the csdk CLI.
 *
 * Provides a base set of commands that demonstrate the SDK's capabilities
 * and offer useful utilities out of the box.
 */

import type { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import { extractFirst, getPackageJson } from 'inquirerer';

import { getConfigStore } from './config';
import { printSuccess, printError, printKeyValue, printTable } from './utils';

const TOOL_NAME = 'csdk';

const usageText = `
csdk <command>

Commands:
  context     Manage named contexts (endpoint + credentials)

Options:
  --version, -v   Show version
  --help, -h      Show this help message
`;

const contextUsage = `
csdk context <command>

Commands:
  create    Create a new context
  list      List all contexts
  use       Set the active context
  current   Show current context
  delete    Delete a context

  --help, -h  Show this help message
`;

async function handleContextCreate(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const answers = await prompter.prompt(argv, [
    { type: 'text', name: 'name', message: 'Context name', required: true },
    { type: 'text', name: 'endpoint', message: 'GraphQL endpoint URL', required: true }
  ]);

  const store = getConfigStore(TOOL_NAME);
  store.createContext(answers.name as string, { endpoint: answers.endpoint as string });

  const settings = store.loadSettings();
  if (!settings.currentContext) {
    store.setCurrentContext(answers.name as string);
  }

  printSuccess(`Created context: ${answers.name}`);
  printKeyValue('Endpoint', answers.endpoint as string, 2);
}

async function handleContextList() {
  const store = getConfigStore(TOOL_NAME);
  const contexts = store.listContexts();
  const settings = store.loadSettings();

  if (contexts.length === 0) {
    console.log('No contexts configured. Run "csdk context create" to create one.');
    return;
  }

  const rows = contexts.map((ctx) => {
    const marker = ctx.name === settings.currentContext ? '* ' : '  ';
    const authStatus = store.hasValidCredentials(ctx.name)
      ? '[authenticated]'
      : '[no token]';
    return [marker + ctx.name, ctx.endpoint, authStatus];
  });

  printTable(['Name', 'Endpoint', 'Auth'], rows);
}

async function handleContextUse(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const store = getConfigStore(TOOL_NAME);
  const contexts = store.listContexts();

  if (contexts.length === 0) {
    printError('No contexts available. Run "csdk context create" first.');
    return;
  }

  const answers = await prompter.prompt(argv, [
    {
      type: 'autocomplete',
      name: 'name',
      message: 'Select context',
      options: contexts.map((c) => c.name)
    }
  ]);

  store.setCurrentContext(answers.name as string);
  printSuccess(`Switched to context: ${answers.name}`);
}

async function handleContextCurrent() {
  const store = getConfigStore(TOOL_NAME);
  const ctx = store.getCurrentContext();

  if (!ctx) {
    console.log('No active context. Run "csdk context create" or "csdk context use" first.');
    return;
  }

  printKeyValue('Name', ctx.name);
  printKeyValue('Endpoint', ctx.endpoint);
}

async function handleContextDelete(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const store = getConfigStore(TOOL_NAME);
  const contexts = store.listContexts();

  if (contexts.length === 0) {
    printError('No contexts to delete.');
    return;
  }

  const answers = await prompter.prompt(argv, [
    {
      type: 'autocomplete',
      name: 'name',
      message: 'Select context to delete',
      options: contexts.map((c) => c.name)
    }
  ]);

  store.deleteContext(answers.name as string);
  printSuccess(`Deleted context: ${answers.name}`);
}

async function handleContextSubcommand(
  subcommand: string,
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  switch (subcommand) {
    case 'create':
      return handleContextCreate(argv, prompter);
    case 'list':
      return handleContextList();
    case 'use':
      return handleContextUse(argv, prompter);
    case 'current':
      return handleContextCurrent();
    case 'delete':
      return handleContextDelete(argv, prompter);
    default:
      console.log(contextUsage);
      process.exit(1);
  }
}

async function contextCommand(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  if (argv.help || argv.h) {
    console.log(contextUsage);
    process.exit(0);
  }

  const { first: subcommand, newArgv } = extractFirst(argv);

  if (!subcommand) {
    const answer = await prompter.prompt(argv, [
      {
        type: 'autocomplete',
        name: 'subcommand',
        message: 'What do you want to do?',
        options: ['create', 'list', 'use', 'current', 'delete']
      }
    ]);
    return handleContextSubcommand(answer.subcommand as string, newArgv, prompter);
  }

  return handleContextSubcommand(subcommand, newArgv, prompter);
}

const commandMap: Record<string, (argv: Partial<Record<string, unknown>>, prompter: Inquirerer) => Promise<void>> = {
  context: contextCommand
};

/**
 * Main command handler for the csdk CLI.
 * This is the single CommandHandler function passed to inquirerer's CLI class.
 */
export const commands = async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.version || argv.v) {
    const pkg = getPackageJson(__dirname);
    console.log(pkg.version);
    process.exit(0);
  }

  let { first: command, newArgv } = extractFirst(argv);

  if ((argv.help || argv.h) && !command) {
    console.log(usageText);
    process.exit(0);
  }

  if (command === 'help') {
    console.log(usageText);
    process.exit(0);
  }

  if (!command) {
    const answer = await prompter.prompt(argv, [
      {
        type: 'autocomplete',
        name: 'command',
        message: 'What do you want to do?',
        options: Object.keys(commandMap)
      }
    ]);
    command = answer.command as string;
  }

  const commandFn = commandMap[command];

  if (!commandFn) {
    console.log(usageText);
    process.exit(1);
  }

  await commandFn(newArgv, prompter);
  prompter.close();

  return argv;
};
