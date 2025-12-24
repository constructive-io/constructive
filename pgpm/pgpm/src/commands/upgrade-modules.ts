import { PgpmPackage } from '@pgpmjs/core';
import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, OptionValue, Question } from 'inquirerer';
import { ParsedArgs } from 'minimist';
import { fetchLatestVersion } from '../utils/npm-version';

const log = new Logger('upgrade-modules');

const upgradeModulesUsageText = `
Upgrade Modules Command:

  pgpm upgrade-modules [OPTIONS]

  Upgrade installed pgpm modules to their latest versions from npm.

Options:
  --help, -h              Show this help message
  --cwd <directory>       Working directory (default: current directory)
  --all                   Upgrade all modules without prompting
  --dry-run               Show what would be upgraded without making changes
  --modules <names>       Comma-separated list of specific modules to upgrade

Examples:
  pgpm upgrade-modules                     Interactive selection of modules to upgrade
  pgpm upgrade-modules --all               Upgrade all installed modules
  pgpm upgrade-modules --dry-run           Preview available upgrades
  pgpm upgrade-modules --modules @pgpm/base32,@pgpm/faker   Upgrade specific modules
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

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(upgradeModulesUsageText);
    process.exit(0);
  }

  const { cwd = process.cwd() } = argv;
  const dryRun = Boolean(argv['dry-run']);
  const upgradeAll = Boolean(argv.all);
  const specificModules = argv.modules 
    ? String(argv.modules).split(',').map(m => m.trim())
    : undefined;

  const project = new PgpmPackage(cwd);

  if (!project.isInModule()) {
    throw new Error('You must run this command inside a PGPM module.');
  }

  const { installed, installedVersions } = project.getInstalledModules();

  if (installed.length === 0) {
    log.info('No pgpm modules are installed in this module.');
    return;
  }

  log.info(`Found ${installed.length} installed module(s). Checking for updates...`);

  const moduleVersions = await fetchModuleVersions(installedVersions);
  const modulesWithUpdates = moduleVersions.filter(m => m.hasUpdate);

  if (modulesWithUpdates.length === 0) {
    log.success('All modules are already up to date.');
    return;
  }

  log.info(`\n${modulesWithUpdates.length} module(s) have updates available:\n`);
  for (const mod of modulesWithUpdates) {
    log.info(`  ${mod.name}: ${mod.currentVersion} -> ${mod.latestVersion}`);
  }
  console.log('');

  if (dryRun) {
    log.info('Dry run - no changes made.');
    return;
  }

  let modulesToUpgrade: string[];

  if (upgradeAll) {
    modulesToUpgrade = modulesWithUpdates.map(m => m.name);
  } else if (specificModules) {
    modulesToUpgrade = modulesWithUpdates
      .filter(m => specificModules.includes(m.name))
      .map(m => m.name);
    
    if (modulesToUpgrade.length === 0) {
      log.warn('None of the specified modules have updates available.');
      return;
    }
  } else {
    const options = modulesWithUpdates.map(mod => ({
      name: mod.name,
      value: mod.name,
      message: `${mod.name} (${mod.currentVersion} -> ${mod.latestVersion})`
    }));

    const questions: Question[] = [
      {
        name: 'selectedModules',
        message: 'Select modules to upgrade:',
        type: 'checkbox',
        options: options.map(o => o.message),
        default: options.map(o => o.message)
      }
    ];

    const answers = await prompter.prompt(argv, questions);
    const selectedOptions = (answers.selectedModules as OptionValue[])
      .filter(opt => opt.selected)
      .map(opt => opt.name);

    modulesToUpgrade = modulesWithUpdates
      .filter(mod => selectedOptions.includes(`${mod.name} (${mod.currentVersion} -> ${mod.latestVersion})`))
      .map(m => m.name);

    if (modulesToUpgrade.length === 0) {
      log.info('No modules selected for upgrade.');
      return;
    }
  }

  log.info(`\nUpgrading ${modulesToUpgrade.length} module(s)...`);

  await project.upgradeModules({ modules: modulesToUpgrade });

  log.success('\nUpgrade complete!');
};
