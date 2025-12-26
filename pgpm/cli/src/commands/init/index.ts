import fs from 'fs';
import path from 'path';

import {
  DEFAULT_TEMPLATE_REPO,
  DEFAULT_TEMPLATE_TOOL_NAME,
  inspectTemplate,
  PgpmPackage,
  resolveBoilerplateBaseDir,
  scaffoldTemplate,
  scanBoilerplates,
  sluggify,
} from '@pgpmjs/core';
import { errors } from '@pgpmjs/types';
import { CLIOptions, Prompter, OptionValue, Question, registerDefaultResolver } from 'genomic';

const DEFAULT_MOTD = `
                 |              _   _
     ===         |.===.        '\\-//\`
    (o o)        {}o o{}        (o o)
ooO--(_)--Ooo-ooO--(_)--Ooo-ooO--(_)--Ooo-
`;

export const createInitUsageText = (binaryName: string, productLabel?: string): string => {
  const displayName = productLabel ?? binaryName;

  return `
Init Command:

  ${binaryName} init [OPTIONS] [<fromPath>]

  Initialize ${displayName} from a template. The template's type (workspace/module)
  determines the behavior automatically.

Options:
  --help, -h              Show this help message
  --cwd <directory>       Working directory (default: current directory)
  --repo <repo>           Template repo (default: https://github.com/constructive-io/pgpm-boilerplates.git)
  --from-branch <branch>  Branch/tag to use when cloning repo
  --dir <variant>         Template variant directory (e.g., supabase, drizzle)
  --boilerplate           Prompt to select from available boilerplates

Examples:
  ${binaryName} init                                   Initialize new module (default)
  ${binaryName} init workspace                         Initialize new workspace
  ${binaryName} init module                            Initialize new module explicitly
  ${binaryName} init workspace --dir <variant>         Use variant templates
  ${binaryName} init --boilerplate                     Select from available boilerplates
  ${binaryName} init --repo owner/repo                 Use templates from GitHub repository
  ${binaryName} init --repo owner/repo --from-branch develop  Use specific branch
`;
};

export default async (
  argv: Partial<Record<string, any>>,
  prompter: Prompter,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(createInitUsageText('pgpm'));
    process.exit(0);
  }

  return handleInit(argv, prompter);
};

async function handleInit(argv: Partial<Record<string, any>>, prompter: Prompter) {
  const { cwd = process.cwd() } = argv;
  const templateRepo = (argv.repo as string) ?? DEFAULT_TEMPLATE_REPO;
  const branch = argv.fromBranch as string | undefined;
  const dir = argv.dir as string | undefined;
  const noTty = Boolean((argv as any).noTty || argv['no-tty'] || process.env.CI === 'true');
  const useBoilerplatePrompt = Boolean(argv.boilerplate);

  // Get fromPath from first positional arg
  const positionalFromPath = argv._?.[0] as string | undefined;

  // Handle --boilerplate flag: separate path from regular init
  if (useBoilerplatePrompt) {
    return handleBoilerplateInit(argv, prompter, {
      positionalFromPath,
      templateRepo,
      branch,
      dir,
      noTty,
      cwd,
    });
  }

  // Regular init path: default to 'module' if no fromPath provided
  const fromPath = positionalFromPath || 'module';
  // Track if user explicitly requested module (e.g., `pgpm init module`)
  const wasExplicitModuleRequest = positionalFromPath === 'module';

  // Inspect the template to get its type
  const inspection = inspectTemplate({
    fromPath,
    templateRepo,
    branch,
    dir,
    toolName: DEFAULT_TEMPLATE_TOOL_NAME,
    cwd,
  });

  const templateType = inspection.config?.type;

  // Branch based on template type
  if (templateType === 'workspace') {
    return handleWorkspaceInit(argv, prompter, {
      fromPath,
      templateRepo,
      branch,
      dir,
      noTty,
      cwd,
    });
  }

  // Default to module init (for 'module' type or unknown types)
  return handleModuleInit(argv, prompter, {
    fromPath,
    templateRepo,
    branch,
    dir,
    noTty,
    cwd,
  }, wasExplicitModuleRequest);
}

interface BoilerplateInitContext {
  positionalFromPath?: string;
  templateRepo: string;
  branch?: string;
  dir?: string;
  noTty: boolean;
  cwd: string;
}

async function handleBoilerplateInit(
  argv: Partial<Record<string, any>>,
  prompter: Prompter,
  ctx: BoilerplateInitContext
) {
  let fromPath: string;

  if (ctx.positionalFromPath) {
    // If a positional fromPath was provided with --boilerplate, use it directly
    fromPath = ctx.positionalFromPath;
  } else {
    // No positional arg: prompt user to select from available boilerplates
    if (ctx.noTty) {
      throw new Error(
        'Cannot use --boilerplate without a <fromPath> argument in non-interactive mode. ' +
        'Please specify a boilerplate explicitly, e.g., `pgpm init workspace --boilerplate`'
      );
    }

    // Inspect without fromPath to get the template directory for scanning
    const initialInspection = inspectTemplate({
      templateRepo: ctx.templateRepo,
      branch: ctx.branch,
      dir: ctx.dir,
      toolName: DEFAULT_TEMPLATE_TOOL_NAME,
      cwd: ctx.cwd,
    });

    // Resolve the base directory for scanning boilerplates:
    // - If --dir is specified, use the resolvedTemplatePath (bypasses .boilerplates.json)
    // - Otherwise, use .boilerplates.json's dir (defaults to repo root if missing)
    const baseDir = ctx.dir
      ? initialInspection.resolvedTemplatePath
      : resolveBoilerplateBaseDir(initialInspection.templateDir);
    const boilerplates = scanBoilerplates(baseDir);

    if (boilerplates.length === 0) {
      throw new Error(
        `No boilerplates found in the template repository.\n` +
        `Checked directory: ${baseDir}\n` +
        `Make sure the repository contains boilerplate directories with .boilerplate.json files.`
      );
    }

    const boilerplateQuestion: Question[] = [
      {
        name: 'selectedBoilerplate',
        message: 'Select a boilerplate',
        type: 'autocomplete',
        options: boilerplates.map((bp) => bp.name),
        required: true,
      },
    ];

    const boilerplateAnswer = await prompter.prompt(argv, boilerplateQuestion);
    fromPath = boilerplateAnswer.selectedBoilerplate;
  }

  // Inspect the selected template to get its type
  const inspection = inspectTemplate({
    fromPath,
    templateRepo: ctx.templateRepo,
    branch: ctx.branch,
    dir: ctx.dir,
    toolName: DEFAULT_TEMPLATE_TOOL_NAME,
    cwd: ctx.cwd,
  });

  const templateType = inspection.config?.type;

  // Branch based on template type
  if (templateType === 'workspace') {
    return handleWorkspaceInit(argv, prompter, {
      fromPath,
      templateRepo: ctx.templateRepo,
      branch: ctx.branch,
      dir: ctx.dir,
      noTty: ctx.noTty,
      cwd: ctx.cwd,
    });
  }

  // Default to module init (for 'module' type or unknown types)
  // When using --boilerplate, user made an explicit choice, so treat as explicit request
  return handleModuleInit(argv, prompter, {
    fromPath,
    templateRepo: ctx.templateRepo,
    branch: ctx.branch,
    dir: ctx.dir,
    noTty: ctx.noTty,
    cwd: ctx.cwd,
  }, true);
}

interface InitContext {
  fromPath: string;
  templateRepo: string;
  branch?: string;
  dir?: string;
  noTty: boolean;
  cwd: string;
}

async function handleWorkspaceInit(
  argv: Partial<Record<string, any>>,
  prompter: Prompter,
  ctx: InitContext
) {
  const workspaceQuestions: Question[] = [
    {
      name: 'name',
      message: 'Enter workspace name',
      required: true,
      type: 'text'
    }
  ];

  const answers = await prompter.prompt(argv, workspaceQuestions);
  const targetPath = path.join(ctx.cwd, sluggify(answers.name));

  // Register workspace.dirname resolver so boilerplate templates can use it via defaultFrom/setFrom
  const dirName = path.basename(targetPath);
  registerDefaultResolver('workspace.dirname', () => dirName);

  await scaffoldTemplate({
    fromPath: ctx.fromPath,
    outputDir: targetPath,
    templateRepo: ctx.templateRepo,
    branch: ctx.branch,
    dir: ctx.dir,
    answers: {
      ...argv,
      ...answers,
      workspaceName: answers.name
    },
    toolName: DEFAULT_TEMPLATE_TOOL_NAME,
    noTty: ctx.noTty,
    cwd: ctx.cwd,
    prompter
  });

  // Check for .motd file and print it, or use default ASCII art
  const motdPath = path.join(targetPath, '.motd');
  let motd = DEFAULT_MOTD;
  if (fs.existsSync(motdPath)) {
    try {
      motd = fs.readFileSync(motdPath, 'utf8');
      fs.unlinkSync(motdPath);
    } catch {
      // Ignore errors reading/deleting .motd
    }
  }
  process.stdout.write(motd);
  if (!motd.endsWith('\n')) {
    process.stdout.write('\n');
  }

  process.stdout.write(`\n✨ Enjoy!\n\ncd ./${dirName}\n`);

  return { ...argv, ...answers, cwd: targetPath };
}

async function handleModuleInit(
  argv: Partial<Record<string, any>>,
  prompter: Prompter,
  ctx: InitContext,
  wasExplicitModuleRequest: boolean = false
) {
  const project = new PgpmPackage(ctx.cwd);

  if (!project.workspacePath) {
    const noTty = Boolean((argv as any).noTty || argv['no-tty'] || process.env.CI === 'true');

    // If user explicitly requested module init or we're in non-interactive mode,
    // just show the error with helpful guidance
    if (wasExplicitModuleRequest || noTty) {
      process.stderr.write('Not inside a PGPM workspace.\n');
      throw errors.NOT_IN_WORKSPACE({});
    }

    // Offer to create a workspace instead
    const recoveryQuestion: Question[] = [
      {
        name: 'createWorkspace',
        message: 'You are not inside a PGPM workspace. Would you like to create a new workspace instead?',
        type: 'confirm',
        required: true,
      },
    ];

    const { createWorkspace } = await prompter.prompt(argv, recoveryQuestion);

    if (createWorkspace) {
      return handleWorkspaceInit(argv, prompter, {
        fromPath: 'workspace',
        templateRepo: ctx.templateRepo,
        branch: ctx.branch,
        dir: ctx.dir,
        noTty: ctx.noTty,
        cwd: ctx.cwd,
      });
    }

    // User declined, show the error
    process.stderr.write('Not inside a PGPM workspace.\n');
    throw errors.NOT_IN_WORKSPACE({});
  }

  if (!project.isInsideAllowedDirs(ctx.cwd) && !project.isInWorkspace() && !project.isParentOfAllowedDirs(ctx.cwd)) {
    process.stderr.write('You must be inside the workspace root or a parent directory of modules (like packages/).\n');
    throw errors.NOT_IN_WORKSPACE_MODULE({});
  }

  const availExtensions = await project.getAvailableModules();

  // Note: moduleName is needed here before scaffolding because initModule creates
  // the directory first, then scaffolds. The boilerplate's ____moduleName____ question
  // gets skipped because the answer is already passed through. So users only see it
  // once, but the definition exists in two places for this architectural reason.
  const moduleQuestions: Question[] = [
    {
      name: 'moduleName',
      message: 'Enter the module name',
      required: true,
      type: 'text',
    },
    {
      name: 'extensions',
      message: 'Which extensions?',
      options: availExtensions,
      type: 'checkbox',
      allowCustomOptions: true,
      required: true,
      default: ['plpgsql', 'uuid-ossp'],
    },
  ];

  const answers = await prompter.prompt(argv, moduleQuestions);
  const modName = sluggify(answers.moduleName);

  const extensions = answers.extensions
    .filter((opt: OptionValue) => opt.selected)
    .map((opt: OptionValue) => opt.name);

  const templateAnswers = {
    ...argv,
    ...answers,
    moduleName: modName,
    packageIdentifier: (argv as any).packageIdentifier || modName
  };

  await project.initModule({
    name: modName,
    description: answers.description || modName,
    author: answers.author || modName,
    extensions,
    templateRepo: ctx.templateRepo,
    templatePath: ctx.fromPath,
    branch: ctx.branch,
    dir: ctx.dir,
    toolName: DEFAULT_TEMPLATE_TOOL_NAME,
    answers: templateAnswers,
    noTty: ctx.noTty
  });

  const isRoot = path.resolve(project.getWorkspacePath()!) === path.resolve(ctx.cwd);
  const modulePath = isRoot
    ? path.join(ctx.cwd, 'packages', modName)
    : path.join(ctx.cwd, modName);

  const motdPath = path.join(modulePath, '.motd');
  let motd = DEFAULT_MOTD;
  if (fs.existsSync(motdPath)) {
    try {
      motd = fs.readFileSync(motdPath, 'utf8');
      fs.unlinkSync(motdPath);
    } catch {
      // Ignore errors reading/deleting .motd
    }
  }
  process.stdout.write(motd);
  if (!motd.endsWith('\n')) {
    process.stdout.write('\n');
  }

  const relPath = isRoot ? `packages/${modName}` : modName;
  process.stdout.write(`\n✨ Enjoy!\n\ncd ./${relPath}\n`);

  return { ...argv, ...answers };
}
