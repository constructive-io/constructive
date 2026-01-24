/**
 * Authentication commands for the CNC execution engine
 */

import { CLIOptions, Inquirerer, extractFirst } from 'inquirerer';
import chalk from 'yanse';
import {
  getCurrentProject,
  loadProject,
  listProjects,
  getProjectCredentials,
  setProjectCredentials,
  removeProjectCredentials,
  hasValidCredentials,
  loadSettings,
} from '../config';

const usage = `
Constructive Authentication:

  cnc auth <command> [OPTIONS]

Commands:
  set-token <token>     Set API token for the current project
  status                Show authentication status
  logout                Remove credentials for the current project

Options:
  --project <name>      Specify project (defaults to current project)
  --expires <date>      Token expiration date (ISO format)

Examples:
  cnc auth set-token eyJhbGciOiJIUzI1NiIs...
  cnc auth status
  cnc auth logout
  cnc auth set-token <token> --project my-app

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

async function getTargetProject(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
): Promise<string> {
  // Check if project was specified via --project flag
  if (argv.project && typeof argv.project === 'string') {
    const project = loadProject(argv.project);
    if (!project) {
      console.error(chalk.red(`Project "${argv.project}" not found.`));
      process.exit(1);
    }
    return argv.project;
  }

  // Try to use current project
  const current = getCurrentProject();
  if (current) {
    return current.name;
  }

  // No current project, prompt user to select
  const projects = listProjects();
  if (projects.length === 0) {
    console.error(chalk.red('No projects configured.'));
    console.log(chalk.gray('Run "cnc project init <name>" to create one first.'));
    process.exit(1);
  }

  const answer = await prompter.prompt(argv, [
    {
      type: 'autocomplete',
      name: 'project',
      message: 'Select project',
      options: projects.map(p => p.name),
    },
  ]);

  return answer.project as string;
}

async function handleSetToken(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const projectName = await getTargetProject(argv, prompter);
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

  setProjectCredentials(projectName, tokenValue.trim(), { expiresAt });

  console.log(chalk.green(`Token saved for project: ${projectName}`));
  if (expiresAt) {
    console.log(chalk.gray(`Expires: ${expiresAt}`));
  }
}

function handleStatus(argv: Partial<Record<string, unknown>>) {
  const settings = loadSettings();
  const projects = listProjects();

  if (projects.length === 0) {
    console.log(chalk.gray('No projects configured.'));
    return;
  }

  // If --project specified, show only that project
  if (argv.project && typeof argv.project === 'string') {
    const project = loadProject(argv.project);
    if (!project) {
      console.error(chalk.red(`Project "${argv.project}" not found.`));
      process.exit(1);
    }
    showProjectAuthStatus(project.name, settings.currentProject === project.name);
    return;
  }

  // Show all projects
  console.log(chalk.bold('Authentication Status:'));
  console.log();

  for (const project of projects) {
    const isCurrent = project.name === settings.currentProject;
    showProjectAuthStatus(project.name, isCurrent);
  }
}

function showProjectAuthStatus(projectName: string, isCurrent: boolean) {
  const creds = getProjectCredentials(projectName);
  const hasAuth = hasValidCredentials(projectName);
  const marker = isCurrent ? chalk.green('*') : ' ';

  console.log(`${marker} ${chalk.bold(projectName)}`);

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
  const projectName = await getTargetProject(argv, prompter);

  const creds = getProjectCredentials(projectName);
  if (!creds) {
    console.log(chalk.gray(`No credentials found for project: ${projectName}`));
    return;
  }

  const confirm = await prompter.prompt(argv, [
    {
      type: 'confirm',
      name: 'confirm',
      message: `Remove credentials for project "${projectName}"?`,
      default: false,
    },
  ]);

  if (!confirm.confirm) {
    console.log(chalk.gray('Cancelled.'));
    return;
  }

  if (removeProjectCredentials(projectName)) {
    console.log(chalk.green(`Credentials removed for project: ${projectName}`));
  } else {
    console.log(chalk.gray(`No credentials found for project: ${projectName}`));
  }
}
