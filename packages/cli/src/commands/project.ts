/**
 * Project management commands for the CNC execution engine
 */

import { CLIOptions, Inquirerer, extractFirst } from 'inquirerer';
import chalk from 'yanse';
import {
  createProject,
  listProjects,
  loadProject,
  deleteProject,
  getCurrentProject,
  setCurrentProject,
  loadSettings,
  saveSettings,
  getProjectCredentials,
  hasValidCredentials,
} from '../config';

const usage = `
Constructive Project Management:

  cnc project <command> [OPTIONS]

Commands:
  init <name>           Initialize a new project
  list                  List all projects
  use <name>            Set the active project
  info [name]           Show project details
  delete <name>         Delete a project configuration

Init Options:
  --endpoint <url>      GraphQL endpoint URL

Examples:
  cnc project init my-app --endpoint https://api.example.com/graphql
  cnc project list
  cnc project use my-app
  cnc project info
  cnc project delete my-app

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
        options: ['init', 'list', 'use', 'info', 'delete'],
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
    case 'init':
      return handleInit(argv, prompter);
    case 'list':
      return handleList();
    case 'use':
      return handleUse(argv, prompter);
    case 'info':
      return handleInfo(argv, prompter);
    case 'delete':
      return handleDelete(argv, prompter);
    default:
      console.log(usage);
      console.error(chalk.red(`Unknown subcommand: ${subcommand}`));
      process.exit(1);
  }
}

async function handleInit(
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
        message: 'Project name',
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
  const projectName = answersRecord.name as string;
  const endpoint = answersRecord.endpoint as string;

  const existing = loadProject(projectName);
  if (existing) {
    console.error(chalk.red(`Project "${projectName}" already exists.`));
    console.log(chalk.gray(`Use "cnc project delete ${projectName}" to remove it first.`));
    process.exit(1);
  }

  const project = createProject(projectName, endpoint);

  if (!settings.currentProject) {
    setCurrentProject(projectName);
    console.log(chalk.green(`Created and activated project: ${projectName}`));
  } else {
    console.log(chalk.green(`Created project: ${projectName}`));
  }

  console.log();
  console.log(`  Endpoint: ${project.endpoint}`);
  console.log();
  console.log(chalk.gray(`Next: Run "cnc auth set-token <token>" to configure authentication.`));
}

function handleList() {
  const projects = listProjects();
  const settings = loadSettings();

  if (projects.length === 0) {
    console.log(chalk.gray('No projects configured.'));
    console.log(chalk.gray('Run "cnc project init <name>" to create one.'));
    return;
  }

  console.log(chalk.bold('Projects:'));
  console.log();

  for (const project of projects) {
    const isCurrent = project.name === settings.currentProject;
    const hasAuth = hasValidCredentials(project.name);
    const marker = isCurrent ? chalk.green('*') : ' ';
    const authStatus = hasAuth ? chalk.green('[authenticated]') : chalk.yellow('[no token]');

    console.log(`${marker} ${chalk.bold(project.name)} ${authStatus}`);
    console.log(`    Endpoint: ${project.endpoint}`);
    console.log();
  }
}

async function handleUse(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const { first: name } = extractFirst(argv);
  const projects = listProjects();

  if (projects.length === 0) {
    console.log(chalk.gray('No projects configured.'));
    console.log(chalk.gray('Run "cnc project init <name>" to create one.'));
    return;
  }

  let projectName = name as string;

  if (!projectName) {
    const answer = await prompter.prompt(argv, [
      {
        type: 'autocomplete',
        name: 'name',
        message: 'Select project',
        options: projects.map(p => p.name),
      },
    ]);
    projectName = answer.name as string;
  }

  if (setCurrentProject(projectName)) {
    console.log(chalk.green(`Switched to project: ${projectName}`));
  } else {
    console.error(chalk.red(`Project "${projectName}" not found.`));
    process.exit(1);
  }
}

async function handleInfo(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
) {
  const { first: name } = extractFirst(argv);
  let projectName = name as string;

  if (!projectName) {
    const current = getCurrentProject();
    if (current) {
      projectName = current.name;
    } else {
      const projects = listProjects();
      if (projects.length === 0) {
        console.log(chalk.gray('No projects configured.'));
        return;
      }
      const answer = await prompter.prompt(argv, [
        {
          type: 'autocomplete',
          name: 'name',
          message: 'Select project',
          options: projects.map(p => p.name),
        },
      ]);
      projectName = answer.name as string;
    }
  }

  const project = loadProject(projectName);
  if (!project) {
    console.error(chalk.red(`Project "${projectName}" not found.`));
    process.exit(1);
  }

  const settings = loadSettings();
  const isCurrent = project.name === settings.currentProject;
  const creds = getProjectCredentials(projectName);
  const hasAuth = hasValidCredentials(projectName);

  console.log();
  console.log(chalk.bold(`Project: ${project.name}`) + (isCurrent ? chalk.green(' (active)') : ''));
  console.log();
  console.log(`  Endpoint:   ${project.endpoint}`);
  console.log(`  Created:    ${project.createdAt}`);
  console.log(`  Updated:    ${project.updatedAt}`);
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
  const projects = listProjects();

  if (projects.length === 0) {
    console.log(chalk.gray('No projects configured.'));
    return;
  }

  let projectName = name as string;

  if (!projectName) {
    const answer = await prompter.prompt(argv, [
      {
        type: 'autocomplete',
        name: 'name',
        message: 'Select project to delete',
        options: projects.map(p => p.name),
      },
    ]);
    projectName = answer.name as string;
  }

  const confirm = await prompter.prompt(argv, [
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete project "${projectName}"?`,
      default: false,
    },
  ]);

  if (!confirm.confirm) {
    console.log(chalk.gray('Cancelled.'));
    return;
  }

  if (deleteProject(projectName)) {
    // Clear current project if it was the deleted one
    const settings = loadSettings();
    if (settings.currentProject === projectName) {
      settings.currentProject = undefined;
      saveSettings(settings);
    }
    console.log(chalk.green(`Deleted project: ${projectName}`));
  } else {
    console.error(chalk.red(`Project "${projectName}" not found.`));
    process.exit(1);
  }
}
