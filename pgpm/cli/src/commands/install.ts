import { getMissingInstallableModules, PgpmPackage } from '@pgpmjs/core';
import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, ParsedArgs, createSpinner } from 'inquirerer';

const logger = new Logger('pgpm');

const installUsageText = `
Install Command:

  pgpm install [package]...

  Install pgpm modules into current module.

  When called without arguments, installs any missing modules that are
  listed in the module's .control file but not yet installed in the workspace.

Arguments:
  package                 One or more package names to install (optional)

Options:
  --help, -h              Show this help message
  --cwd <directory>       Working directory (default: current directory)

Examples:
  pgpm install                                 Install missing modules from .control file
  pgpm install @pgpm/base32                    Install single package
  pgpm install @pgpm/base32 @pgpm/utils        Install multiple packages
`;

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(installUsageText);
    process.exit(0);
  }
  const { cwd = process.cwd() } = argv;

  const project = new PgpmPackage(cwd);

  if (!project.isInModule()) {
    throw new Error('You must run this command inside a PGPM module.');
  }

  // If no packages specified, install missing modules from .control file
  if (argv._.length === 0) {
    const checkSpinner = createSpinner('Checking for missing modules...');
    checkSpinner.start();
    
    const requiredExtensions = project.getRequiredModules();
    const installedModules = project.getWorkspaceInstalledModules();
    const missingModules = getMissingInstallableModules(requiredExtensions, installedModules);

    if (missingModules.length === 0) {
      checkSpinner.succeed('All modules are already installed.');
      return;
    }

    const missingNames = missingModules.map(m => m.npmName);
    checkSpinner.succeed(`Found ${missingModules.length} missing module(s): ${missingNames.join(', ')}`);
    
    const installSpinner = createSpinner(`Installing ${missingModules.length} module(s)...`);
    installSpinner.start();
    await project.installModules(...missingNames);
    installSpinner.succeed(`Installed ${missingModules.length} module(s) successfully.`);
    return;
  }

  const installSpinner = createSpinner(`Installing ${argv._.length} module(s)...`);
  installSpinner.start();
  await project.installModules(...argv._);
  installSpinner.succeed(`Installed ${argv._.length} module(s) successfully.`);

};
