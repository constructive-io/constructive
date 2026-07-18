import { getMissingInstallableModules, PgpmPackage } from '@pgpmjs/core';
import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, ParsedArgs, createSpinner } from 'inquirerer';

const logger = new Logger('pgpm');

const installUsageText = `
Install Command:

  pgpm install [package]...

  Install pgpm modules into the workspace extensions/ directory.

  Inside a module, installing without arguments installs any missing modules
  listed in the module's .control file, and explicit installs are recorded in
  the module's package.json and .control file.

  At the workspace root, installing without arguments installs the modules
  pinned in the workspace pgpm.json \`dependencies\` field, and explicit
  installs are recorded there.

Arguments:
  package                 One or more package names to install (optional)

Options:
  --help, -h              Show this help message
  --cwd <directory>       Working directory (default: current directory)
  --force                 Reinstall modules even if already installed

Examples:
  pgpm install                                 Install missing modules (.control or workspace pgpm.json)
  pgpm install --force                         Reinstall all declared modules
  pgpm install @pgpm/base32                    Install single package
  pgpm install @pgpm/base32@latest             Install the latest published version
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
  const force = Boolean(argv.force);

  if (!project.isInModule() && !project.isInWorkspace()) {
    throw new Error('You must run this command inside a PGPM module or workspace.');
  }

  // Workspace root: install pinned dependencies from pgpm.json
  if (!project.isInModule()) {
    const installSpinner = createSpinner('Installing workspace dependencies...');
    installSpinner.start();

    if (argv._.length > 0) {
      await project.installModules(...argv._);
      installSpinner.succeed(`Installed ${argv._.length} module(s) successfully.`);
      return;
    }

    const installed = await project.installWorkspaceDependencies({ force });
    if (installed.length === 0) {
      installSpinner.succeed('All workspace dependencies are already installed.');
    } else {
      installSpinner.succeed(`Installed ${installed.length} module(s): ${installed.join(', ')}`);
    }
    return;
  }

  // If no packages specified, install missing modules from .control file
  if (argv._.length === 0) {
    const checkSpinner = createSpinner('Checking for missing modules...');
    checkSpinner.start();
    
    const requiredExtensions = project.getRequiredModules();
    const installedModules = force ? [] : project.getWorkspaceInstalledModules();
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
