import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import {
  BoilerplateSkill,
  DEFAULT_TEMPLATE_REPO,
  DEFAULT_TEMPLATE_TOOL_NAME,
  inspectTemplate,
  PgpmPackage,
  resolveBoilerplateBaseDir,
  scaffoldTemplate,
  scanBoilerplates,
  SkillInstaller,
  sluggify,
} from '@pgpmjs/core';
import { resolveWorkspaceByType } from '@pgpmjs/env';
import { errors } from '@pgpmjs/types';
import { CLIOptions, Inquirerer, OptionValue, Question, registerDefaultResolver } from 'inquirerer';

import {
  persistBoilerplateSource,
  readBoilerplateSource,
  resolveInitTemplateRepo,
} from './boilerplate';

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
  --pglite                Use the PGlite boilerplates (in-process WASM Postgres, no server/Docker).
                          Sugar for --repo https://github.com/constructive-io/pglite-boilerplates.git.
                          Recorded on the workspace so later \`init\` calls inherit it automatically.
  --from-branch <branch>  Branch/tag to use when cloning repo
  --dir <variant>         Template variant directory (e.g., supabase, drizzle)
  --template, -t <path>   Full template path (e.g., pnpm/module) - combines dir and fromPath
  --boilerplate           Prompt to select from available boilerplates
  --create-workspace, -w  Create a workspace first, then create the module inside it
  --use-skills            Use npx skills CLI for skill installation (slower, writes skills-lock.json)
  --extensions <a,b>      Extensions to require in the new module (default: none).
                          Add them later instead with \`${binaryName} extension\`.
  --with-extensions       Prompt interactively for extensions during module init

Examples:
  ${binaryName} init                                   Initialize new module (default, no extensions)
  ${binaryName} init workspace                         Initialize new workspace
  ${binaryName} init module                            Initialize new module explicitly
  ${binaryName} init --extensions uuid-ossp,citext     Initialize module requiring extensions
  ${binaryName} init --with-extensions                 Pick extensions interactively
  ${binaryName} init workspace --dir <variant>         Use variant templates
  ${binaryName} init --template pnpm/module            Use full template path (dir + type)
  ${binaryName} init --boilerplate                     Select from available boilerplates
  ${binaryName} init --repo owner/repo                 Use templates from GitHub repository
  ${binaryName} init --repo owner/repo --from-branch develop  Use specific branch
  ${binaryName} init --dir pnpm -w                     Create pnpm workspace + module in one command
  ${binaryName} init workspace --pglite                Create a PGlite (in-process) workspace
  ${binaryName} init --pglite                          Create a PGlite module (inherited automatically inside a --pglite workspace)
`;
};

export default async (
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(createInitUsageText('pgpm'));
    process.exit(0);
  }

  return handleInit(argv, prompter);
};

async function handleInit(argv: Partial<Record<string, any>>, prompter: Inquirerer) {
  const { cwd = process.cwd() } = argv;
  // `--pglite` is sugar for the pglite boilerplates repo; `--repo` overrides it.
  // `repoWasExplicit` means a module created inside a workspace should NOT
  // inherit the workspace's recorded repo (the user pinned one).
  const { templateRepo, repoWasExplicit } = resolveInitTemplateRepo({
    repo: argv.repo,
    pglite: Boolean(argv.pglite),
  });
  const branch = argv.fromBranch as string | undefined;
  const noTty = Boolean((argv as any).noTty || argv['no-tty'] || argv.tty === false || process.env.CI === 'true');
  const useBoilerplatePrompt = Boolean(argv.boilerplate);
  const createWorkspace = Boolean(argv.createWorkspace || argv['create-workspace'] || argv.w);
  const useNpxSkills = Boolean(argv.useSkills || argv['use-skills']);

  // Get fromPath from first positional arg
  const positionalFromPath = argv._?.[0] as string | undefined;

  // Handle --template flag: parses "dir/fromPath" format and extracts both components
  // When --template is provided, it takes precedence over --dir and positional fromPath
  const templateArg = argv.template as string | undefined;
  let dir = argv.dir as string | undefined;
  let templateFromPath: string | undefined;

  if (templateArg) {
    // Parse template path like "pnpm/module" into dir="pnpm" and fromPath="module"
    const slashIndex = templateArg.indexOf('/');
    if (slashIndex > 0) {
      dir = templateArg.substring(0, slashIndex);
      templateFromPath = templateArg.substring(slashIndex + 1);
    } else {
      // No slash - treat the whole thing as fromPath (e.g., --template workspace)
      templateFromPath = templateArg;
    }
  }

  // Handle --boilerplate flag: separate path from regular init
  if (useBoilerplatePrompt) {
    return handleBoilerplateInit(argv, prompter, {
      positionalFromPath,
      templateRepo,
      branch,
      dir,
      noTty,
      cwd,
      useNpxSkills,
    });
  }

  // Regular init path: --template takes precedence, then positional arg, then default to 'module'
  const fromPath = templateFromPath || positionalFromPath || 'module';
  // Track if user explicitly requested module (e.g., `pgpm init module` or `--template pnpm/module`)
  const wasExplicitModuleRequest = positionalFromPath === 'module' || templateFromPath === 'module';

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
      useNpxSkills,
      repoWasExplicit,
    });
  }

  // Default to module init (for 'module' type, 'generic' type, or unknown types)
  return handleModuleInit(argv, prompter, {
    fromPath,
    templateRepo,
    branch,
    dir,
    noTty,
    cwd,
    requiresWorkspace: inspection.config?.requiresWorkspace,
    createWorkspace,
    useNpxSkills,
    repoWasExplicit,
  }, wasExplicitModuleRequest);
}

interface BoilerplateInitContext {
  positionalFromPath?: string;
  templateRepo: string;
  branch?: string;
  dir?: string;
  noTty: boolean;
  cwd: string;
  useNpxSkills?: boolean;
}

async function handleBoilerplateInit(
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
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
      useNpxSkills: ctx.useNpxSkills,
    });
  }

  // Default to module init (for 'module' type, 'generic' type, or unknown types)
  // When using --boilerplate, user made an explicit choice, so treat as explicit request
  return handleModuleInit(argv, prompter, {
    fromPath,
    templateRepo: ctx.templateRepo,
    branch: ctx.branch,
    dir: ctx.dir,
    noTty: ctx.noTty,
    cwd: ctx.cwd,
    requiresWorkspace: inspection.config?.requiresWorkspace,
    useNpxSkills: ctx.useNpxSkills,
  }, true);
}

interface InitContext {
  fromPath: string;
  templateRepo: string;
  branch?: string;
  dir?: string;
  noTty: boolean;
  cwd: string;
  /** 
   * What type of workspace this template requires.
   * 'pgpm' also indicates pgpm files should be created.
   */
  requiresWorkspace?: 'pgpm' | 'pnpm' | 'lerna' | 'npm' | false;
  /**
   * If true, create a workspace first, then create the module inside it.
   */
  createWorkspace?: boolean;
  /**
   * If true, use npx skills CLI instead of built-in shallow clone.
   */
  useNpxSkills?: boolean;
  /**
   * True when the user pinned a template source explicitly (`--repo`/`--pglite`).
   * When false, a module created inside a workspace inherits the workspace's
   * recorded boilerplate repo (see `PgpmWorkspaceConfig.boilerplates`).
   */
  repoWasExplicit?: boolean;
}

function installSkills(skills: BoilerplateSkill[], cwd: string, useNpxSkills: boolean): void {
  if (process.env.PGPM_SKIP_SKILL_INSTALL) return;

  if (useNpxSkills) {
    installSkillsViaNpx(skills, cwd);
  } else {
    installSkillsBuiltin(skills, cwd);
  }
}

function installSkillsBuiltin(skills: BoilerplateSkill[], cwd: string): void {
  const installer = new SkillInstaller({ toolName: DEFAULT_TEMPLATE_TOOL_NAME });
  const result = installer.install(skills, cwd);

  if (result.installed.length > 0) {
    for (const name of result.installed) {
      process.stdout.write(`  installed ${name}\n`);
    }
  }

  if (result.failed.length > 0) {
    process.stdout.write('\n⚠️  Some skills could not be installed automatically.\n');
    process.stdout.write('Run the following commands manually:\n\n');
    for (const f of result.failed) {
      const source = f.source.includes('://')
        ? f.source
        : `https://github.com/${f.source}`;
      process.stdout.write(`  npx skills add ${source} --skill ${f.skill}\n`);
    }
    process.stdout.write('\n');
  }
}

function installSkillsViaNpx(skills: BoilerplateSkill[], cwd: string): void {
  const failed: string[] = [];

  for (const entry of skills) {
    const source = entry.source.includes('://')
      ? entry.source
      : `https://github.com/${entry.source}`;

    for (const skill of entry.skills) {
      const cmd = `npx --yes skills add ${source} --skill ${skill} --yes`;
      try {
        execSync(cmd, {
          cwd,
          stdio: ['pipe', 'inherit', 'inherit'],
          timeout: 120_000,
        });
      } catch {
        failed.push(`  npx skills add ${source} --skill ${skill}`);
      }
    }
  }

  if (failed.length > 0) {
    process.stdout.write('\n⚠️  Some skills could not be installed automatically.\n');
    process.stdout.write('Run the following commands manually:\n\n');
    for (const cmd of failed) {
      process.stdout.write(`${cmd}\n`);
    }
    process.stdout.write('\n');
  }
}

async function handleWorkspaceInit(
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
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

  // Record a non-default template source on the workspace so that modules
  // created later inside it (`pgpm init`) inherit the same boilerplate repo
  // without re-specifying `--pglite`/`--repo`.
  if (ctx.templateRepo !== DEFAULT_TEMPLATE_REPO) {
    persistBoilerplateSource(targetPath, {
      repo: ctx.templateRepo,
      branch: ctx.branch,
      dir: ctx.dir,
    });
  }

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

  // Install skills declared in .boilerplate.json
  const templateInfo = inspectTemplate({
    fromPath: ctx.fromPath,
    templateRepo: ctx.templateRepo,
    branch: ctx.branch,
    dir: ctx.dir,
    cwd: ctx.cwd,
  });
  if (templateInfo.config?.skills?.length) {
    process.stdout.write('\n📦 Installing skills...\n\n');
    installSkills(templateInfo.config.skills, targetPath, Boolean(ctx.useNpxSkills));
  }

  const relPath = path.relative(process.cwd(), targetPath);
  process.stdout.write(`\n✨ Enjoy!\n\ncd ./${relPath}\n`);

  return { ...argv, ...answers, cwd: targetPath };
}

interface WorkspaceTemplateConfig {
  repo: string;
  branch?: string;
  dir?: string;
}

function resolveWorkspaceTemplateRepo(options: {
  templateRepo: string;
  branch?: string;
  dir?: string;
  workspaceType: 'pgpm' | 'pnpm';
  cwd: string;
}): WorkspaceTemplateConfig {
  const { templateRepo, branch, dir, workspaceType, cwd } = options;

  // Determine the dir to use for workspace template.
  // - Explicit --dir always wins.
  // - For the default repo (which holds several families), fall back to the
  //   workspaceType (pgpm/pnpm) as the variant dir.
  // - For a custom/single-family repo (e.g. --pglite), leave dir undefined so
  //   the repo's own .boilerplates.json resolves the family (e.g. `pglite/`).
  const isDefaultRepo = templateRepo === DEFAULT_TEMPLATE_REPO;
  const workspaceDir = dir || (isDefaultRepo ? workspaceType : undefined);

  // Try to find workspace template in the specified repo
  try {
    const inspection = inspectTemplate({
      fromPath: 'workspace',
      templateRepo,
      branch,
      dir: workspaceDir,
      toolName: DEFAULT_TEMPLATE_TOOL_NAME,
      cwd,
    });

    // If we found a valid workspace template, use the specified repo
    if (inspection.config?.type === 'workspace') {
      return {
        repo: templateRepo,
        branch,
        dir: workspaceDir,
      };
    }
  } catch {
    // Template not found in specified repo, fall through to default
  }

  // Fall back to default template repo
  // Use the workspaceType as the dir variant (pgpm or pnpm)
  return {
    repo: DEFAULT_TEMPLATE_REPO,
    branch: undefined, // Use default branch for default repo
    dir: workspaceType,
  };
}

async function handleModuleInit(
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
  ctx: InitContext,
  wasExplicitModuleRequest: boolean = false
) {
  // Inherit the boilerplate source recorded on the enclosing workspace (e.g. by
  // `pgpm init workspace --pglite`) unless the user pinned one explicitly. This
  // makes a bare `pgpm init` inside a pglite workspace scaffold pglite modules.
  if (!ctx.repoWasExplicit) {
    const inherited = readBoilerplateSource(ctx.cwd);
    if (inherited) {
      ctx.templateRepo = inherited.repo;
      ctx.branch = inherited.branch;
      ctx.dir = inherited.dir;
    }
  }

  // Determine workspace requirement (defaults to 'pgpm' for backward compatibility)
  const workspaceType = ctx.requiresWorkspace ?? 'pgpm';
  // Whether this is a pgpm-managed template (creates pgpm.plan, .control files)
  const isPgpmTemplate = workspaceType === 'pgpm';

  let project = new PgpmPackage(ctx.cwd);

  // Track resolved workspace path for both pgpm and non-pgpm workspace types
  let resolvedWorkspacePath: string | undefined;
  let workspaceTypeName = '';

  // Check workspace requirement based on type (skip if workspaceType is false)
  if (workspaceType !== false) {
    if (workspaceType === 'pgpm') {
      resolvedWorkspacePath = project.workspacePath;
      workspaceTypeName = 'PGPM';
    } else {
      resolvedWorkspacePath = resolveWorkspaceByType(ctx.cwd, workspaceType);
      workspaceTypeName = workspaceType.toUpperCase();
    }

    if (!resolvedWorkspacePath) {
      const noTty = Boolean((argv as any).noTty || argv['no-tty'] || argv.tty === false || process.env.CI === 'true');

      // Handle --create-workspace flag: create workspace first, then module
      if (ctx.createWorkspace && (workspaceType === 'pgpm' || workspaceType === 'pnpm')) {
        // Resolve workspace template repo with fallback to default
        const workspaceTemplateConfig = resolveWorkspaceTemplateRepo({
          templateRepo: ctx.templateRepo,
          branch: ctx.branch,
          dir: ctx.dir,
          workspaceType,
          cwd: ctx.cwd,
        });

        // Create workspace first
        const workspaceResult = await handleWorkspaceInit(argv, prompter, {
          fromPath: 'workspace',
          templateRepo: workspaceTemplateConfig.repo,
          branch: workspaceTemplateConfig.branch,
          dir: workspaceTemplateConfig.dir,
          noTty: ctx.noTty,
          cwd: ctx.cwd,
          repoWasExplicit: ctx.repoWasExplicit,
        });

        // Update context to point to new workspace and continue with module creation
        const newCwd = workspaceResult.cwd as string;
        project = new PgpmPackage(newCwd);
        
        // Re-resolve workspace path with new cwd
        if (workspaceType === 'pgpm') {
          resolvedWorkspacePath = project.workspacePath;
        } else {
          resolvedWorkspacePath = resolveWorkspaceByType(newCwd, workspaceType);
        }

        // Update ctx for module creation
        ctx.cwd = newCwd;
        
        // Continue to module creation below (don't return here)
      } else {
        // If user explicitly requested module init or we're in non-interactive mode,
        // just show the error with helpful guidance
        if (wasExplicitModuleRequest || noTty) {
          process.stderr.write(`Not inside a ${workspaceTypeName} workspace.\n`);
          throw errors.NOT_IN_WORKSPACE({});
        }

        // Offer to create a workspace for pgpm templates or when --dir is specified
        // (when --dir is specified, we know which workspace variant to use)
        if (workspaceType === 'pgpm' || ctx.dir) {
          const recoveryQuestion: Question[] = [
            {
              name: 'workspace',
              alias: 'W',
              message: `You are not inside a ${workspaceTypeName} workspace. Would you like to create a new workspace instead?`,
              type: 'confirm',
              required: true,
            },
          ];

          const { workspace } = await prompter.prompt(argv, recoveryQuestion);

          if (workspace) {
            return handleWorkspaceInit(argv, prompter, {
              fromPath: 'workspace',
              templateRepo: ctx.templateRepo,
              branch: ctx.branch,
              dir: ctx.dir,
              noTty: ctx.noTty,
              cwd: ctx.cwd,
              repoWasExplicit: ctx.repoWasExplicit,
            });
          }
        }

        // User declined or non-pgpm workspace type without --dir, show the error
        process.stderr.write(`Not inside a ${workspaceTypeName} workspace.\n`);
        throw errors.NOT_IN_WORKSPACE({});
      }
    }
  }

  // Only check workspace directory constraints if we're in a workspace
  if (project.workspacePath) {
    if (!project.isInsideAllowedDirs(ctx.cwd) && !project.isInWorkspace() && !project.isParentOfAllowedDirs(ctx.cwd)) {
      process.stderr.write('You must be inside the workspace root or a parent directory of modules (like packages/).\n');
      throw errors.NOT_IN_WORKSPACE_MODULE({});
    }
  }

  // Build questions based on whether this is a pgpm template
  const moduleQuestions: Question[] = [
    {
      name: 'moduleName',
      message: 'Enter the module name',
      required: true,
      type: 'text',
    },
  ];

  // Extensions are opt-in: a bare `pgpm init` scaffolds a module with no
  // extensions (no `requires` line). Extensions are added explicitly later via
  // `pgpm extension`, or up front via `--extensions a,b` (non-interactive) or
  // `--with-extensions` (interactive picker). This matches the zero-config init
  // of comparable tools (sqitch, prisma, drizzle, dbmate, ...).
  // Normalize `--extensions a,b` (a comma string from the CLI) into an array so
  // it is consumed the same way as a programmatic string[].
  if (typeof (argv as any).extensions === 'string') {
    (argv as any).extensions = (argv as any).extensions
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  const extensionsProvided = (argv as any).extensions !== undefined;
  const wantExtensionsPrompt = Boolean(
    (argv as any).withExtensions || argv['with-extensions']
  );
  if (
    isPgpmTemplate &&
    project.workspacePath &&
    (extensionsProvided || wantExtensionsPrompt)
  ) {
    const availExtensions = await project.getAvailableModules();
    moduleQuestions.push({
      name: 'extensions',
      message: 'Which extensions?',
      options: availExtensions,
      type: 'checkbox',
      allowCustomOptions: true,
      default: [],
    });
  }

  const answers = await prompter.prompt(argv, moduleQuestions);
  const modName = sluggify(answers.moduleName);

  const extensions = isPgpmTemplate && answers.extensions
    ? answers.extensions
        .filter((opt: OptionValue) => opt.selected)
        .map((opt: OptionValue) => opt.name)
    : [];

  const templateAnswers = {
    ...argv,
    ...answers,
    moduleName: modName,
    packageIdentifier: (argv as any).packageIdentifier || modName
  };

  // Determine output path based on whether we're in a workspace
  let modulePath: string;
  if (project.workspacePath) {
    // PGPM workspace - use workspace-aware initModule
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
      noTty: ctx.noTty,
      pgpm: isPgpmTemplate,
      prompter,
    });

    const isRoot = path.resolve(project.workspacePath) === path.resolve(ctx.cwd);
    modulePath = isRoot
      ? path.join(ctx.cwd, 'packages', modName)
      : path.join(ctx.cwd, modName);
  } else if (resolvedWorkspacePath && workspaceType !== false) {
    // Non-pgpm workspace (pnpm, lerna, npm) - scaffold to packages/ directory
    const isRoot = path.resolve(resolvedWorkspacePath) === path.resolve(ctx.cwd);
    modulePath = isRoot
      ? path.join(ctx.cwd, 'packages', modName)
      : path.join(ctx.cwd, modName);
    fs.mkdirSync(modulePath, { recursive: true });

    await scaffoldTemplate({
      fromPath: ctx.fromPath,
      outputDir: modulePath,
      templateRepo: ctx.templateRepo,
      branch: ctx.branch,
      dir: ctx.dir,
      answers: templateAnswers,
      noTty: ctx.noTty,
      toolName: DEFAULT_TEMPLATE_TOOL_NAME,
      cwd: ctx.cwd,
      prompter
    });
  } else {
    // Not in any workspace (requiresWorkspace: false) - scaffold to current directory
    modulePath = path.join(ctx.cwd, modName);
    fs.mkdirSync(modulePath, { recursive: true });

    await scaffoldTemplate({
      fromPath: ctx.fromPath,
      outputDir: modulePath,
      templateRepo: ctx.templateRepo,
      branch: ctx.branch,
      dir: ctx.dir,
      answers: templateAnswers,
      noTty: ctx.noTty,
      toolName: DEFAULT_TEMPLATE_TOOL_NAME,
      cwd: ctx.cwd,
      prompter
    });
  }

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

  // Install skills declared in .boilerplate.json
  const moduleTemplateInfo = inspectTemplate({
    fromPath: ctx.fromPath,
    templateRepo: ctx.templateRepo,
    branch: ctx.branch,
    dir: ctx.dir,
    cwd: ctx.cwd,
  });
  if (moduleTemplateInfo.config?.skills?.length) {
    const skillsCwd = project.workspacePath || modulePath;
    process.stdout.write('\n📦 Installing skills...\n\n');
    installSkills(moduleTemplateInfo.config.skills, skillsCwd, Boolean(ctx.useNpxSkills));
  }

  const relPath = path.relative(process.cwd(), modulePath);
  process.stdout.write(`\n✨ Enjoy!\n\ncd ./${relPath}\n`);

  return { ...argv, ...answers };
}
