import { PgpmPackage } from '@pgpmjs/core';
import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, PackageInfo, ParsedArgs, createSpinner, upgradePrompt } from 'inquirerer';
import { fetchLatestVersion } from '../utils/npm-version';

const log = new Logger('upgrade');

const upgradeUsageText = `
Upgrade Command:

  pgpm upgrade [PACKAGE...] [OPTIONS]

  Upgrade installed pgpm modules to their latest versions from npm.
  When used without arguments, upgrades all modules.

Options:
  --help, -h              Show this help message
  --cwd <directory>       Working directory (default: current directory)
  -i, --interactive       Show outdated modules and select which ones to upgrade
  --dry-run               Show what would be upgraded without making changes
  -w, --workspace         Upgrade modules across all packages in the workspace

Examples:
  pgpm upgrade                          Upgrade all installed modules
  pgpm upgrade -i                       Interactive selection of modules to upgrade
  pgpm upgrade @pgpm/base32             Upgrade specific module
  pgpm upgrade @pgpm/base32 @pgpm/uuid  Upgrade multiple specific modules
  pgpm upgrade --dry-run                Preview available upgrades
  pgpm upgrade --workspace              Upgrade all modules across the entire workspace
  pgpm up                               Alias for upgrade
`;

interface ModuleUpdateInfo {
  name: string;
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
}

async function fetchModuleVersions(
  installedVersions: Record<string, string>
): Promise<ModuleUpdateInfo[]> {
  const moduleNames = Object.keys(installedVersions);
  const results: ModuleUpdateInfo[] = [];

  for (const name of moduleNames) {
    const currentVersion = installedVersions[name];
    const latestVersion = await fetchLatestVersion(name);
    
    results.push({
      name,
      currentVersion,
      latestVersion,
      hasUpdate: latestVersion !== null && latestVersion !== currentVersion
    });
  }

  return results;
}

async function upgradeModulesForProject(
  project: PgpmPackage,
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  dryRun: boolean,
  interactive: boolean,
  specificModules: string[] | undefined,
  moduleName?: string
): Promise<boolean> {
  const { installed, installedVersions } = project.getInstalledModules();

  if (installed.length === 0) {
    if (moduleName) {
      log.info(`[${moduleName}] No pgpm modules are installed.`);
    } else {
      log.info('No pgpm modules are installed in this module.');
    }
    return false;
  }

  const prefix = moduleName ? `[${moduleName}] ` : '';
  
  // Use spinner while checking for updates
  const spinner = createSpinner(`${prefix}Checking ${installed.length} installed module(s) for updates...`);
  spinner.start();
  
  const moduleVersions = await fetchModuleVersions(installedVersions);
  const modulesWithUpdates = moduleVersions.filter(m => m.hasUpdate);
  
  spinner.succeed(`${prefix}Found ${modulesWithUpdates.length} module(s) with updates available`);

  if (modulesWithUpdates.length === 0) {
    log.success(`${prefix}All modules are already up to date.`);
    return false;
  }

  log.info(`\n${prefix}${modulesWithUpdates.length} module(s) have updates available:\n`);
  for (const mod of modulesWithUpdates) {
    log.info(`  ${mod.name}: ${mod.currentVersion} -> ${mod.latestVersion}`);
  }
  console.log('');

  if (dryRun) {
    log.info(`${prefix}Dry run - no changes made.`);
    return true;
  }

  let modulesToUpgrade: string[];

  if (specificModules && specificModules.length > 0) {
    // Specific modules provided as positional arguments
    modulesToUpgrade = modulesWithUpdates
      .filter(m => specificModules.includes(m.name))
      .map(m => m.name);
    
    if (modulesToUpgrade.length === 0) {
      log.warn(`${prefix}None of the specified modules have updates available.`);
      return false;
    }
  } else if (interactive) {
    // Interactive mode: use pnpm-style upgrade UI
    const packages: PackageInfo[] = modulesWithUpdates.map(mod => ({
      name: mod.name,
      current: mod.currentVersion,
      latest: mod.latestVersion!,
      type: 'dependencies' as const
    }));

    const result = await upgradePrompt(packages, 10);

    if (result.updates.length === 0) {
      log.info(`${prefix}No modules selected for upgrade.`);
      return false;
    }

    modulesToUpgrade = result.updates.map(u => u.name);
  } else {
    // Default behavior: upgrade all modules with updates (like pnpm upgrade)
    modulesToUpgrade = modulesWithUpdates.map(m => m.name);
  }

  log.info(`\n${prefix}Upgrading ${modulesToUpgrade.length} module(s)...`);

  await project.upgradeModules({ modules: modulesToUpgrade });

  log.success(`${prefix}Upgrade complete!`);
  return true;
}

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(upgradeUsageText);
    process.exit(0);
  }

  const { cwd = process.cwd() } = argv;
  const dryRun = Boolean(argv['dry-run']);
  const interactive = Boolean(argv.i || argv.interactive);
  const workspaceMode = Boolean(argv.w || argv.workspace);
  
  // Get specific modules from positional arguments (argv._)
  const specificModules = argv._ && argv._.length > 0 
    ? argv._.map((m: string) => String(m).trim())
    : undefined;

  const project = new PgpmPackage(cwd);

  if (workspaceMode) {
    if (!project.getWorkspacePath()) {
      throw new Error('You must run this command inside a PGPM workspace when using --workspace.');
    }

    const modules = await project.getModules();

    if (modules.length === 0) {
      log.info('No modules found in the workspace.');
      return;
    }

    log.info(`Found ${modules.length} module(s) in the workspace.\n`);

    let anyUpgraded = false;
    for (const moduleProject of modules) {
      const moduleName = moduleProject.getModuleName();
      const upgraded = await upgradeModulesForProject(
        moduleProject,
        argv,
        prompter,
        dryRun,
        interactive,
        specificModules,
        moduleName
      );
      if (upgraded) {
        anyUpgraded = true;
      }
      console.log('');
    }

    if (!anyUpgraded && !dryRun) {
      log.success('All modules across the workspace are already up to date.');
    }
  } else {
    if (!project.isInModule()) {
      throw new Error('You must run this command inside a PGPM module. Use --workspace to upgrade all modules in the workspace.');
    }

    await upgradeModulesForProject(project, argv, prompter, dryRun, interactive, specificModules);
  }
};
