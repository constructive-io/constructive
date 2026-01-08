import { PgpmPackage, slicePlan, writeSliceResult, generateDryRunReport, SliceConfig } from '@pgpmjs/core';
import { getGitConfigInfo } from '@pgpmjs/types';
import { CLIOptions, Inquirerer } from 'inquirerer';
import { resolve } from 'path';

const sliceUsageText = `
Slice Command:

  pgpm slice [OPTIONS]

  Slice a large plan file into multiple modular packages based on folder structure.

Options:
  --help, -h              Show this help message
  --plan <path>           Path to source plan file (default: pgpm.plan in current module)
  --output <directory>    Output directory for sliced packages (default: ./sliced)
  --depth <number>        Folder depth for package extraction (default: 1)
  --prefix <string>       Prefix to strip from paths (default: schemas)
  --default <name>        Default package name for unmatched changes (default: core)
  --min-changes <number>  Minimum changes per package (smaller packages are merged)
  --use-tags              Use tags for cross-package dependencies
  --dry-run               Show what would be created without writing files
  --overwrite             Overwrite existing package directories
  --copy-files            Copy SQL files from source to output packages
  --cwd <directory>       Working directory (default: current directory)

Examples:
  pgpm slice                           Slice current module's plan
  pgpm slice --dry-run                 Preview slicing without writing files
  pgpm slice --depth 2                 Use 2-level folder grouping
  pgpm slice --output ./packages       Output to specific directory
  pgpm slice --min-changes 10          Merge packages with fewer than 10 changes
`;

export default async (
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(sliceUsageText);
    process.exit(0);
  }

  const { username, email } = getGitConfigInfo();
  const cwd = argv.cwd ?? process.cwd();
  const project = new PgpmPackage(cwd);

  // Determine source plan file
  let sourcePlan: string;
  if (argv.plan) {
    sourcePlan = resolve(cwd, argv.plan);
  } else if (project.isInModule()) {
    sourcePlan = resolve(project.getModulePath()!, 'pgpm.plan');
  } else {
    // Prompt for plan file
    const { planPath } = await prompter.prompt(argv, [
      {
        type: 'text',
        name: 'planPath',
        message: 'Path to source plan file',
        default: 'pgpm.plan',
        required: true
      }
    ]);
    sourcePlan = resolve(cwd, planPath);
  }

  // Determine output directory
  const outputDir = argv.output
    ? resolve(cwd, argv.output)
    : resolve(cwd, 'sliced');

  // Get configuration options
  const { depth, prefix, defaultPackage, minChanges, useTags } = await prompter.prompt(argv, [
    {
      type: 'number',
      name: 'depth',
      message: 'Folder depth for package extraction',
      default: 1,
      useDefault: true
    },
    {
      type: 'text',
      name: 'prefix',
      message: 'Prefix to strip from paths',
      default: 'schemas',
      useDefault: true
    },
    {
      type: 'text',
      name: 'defaultPackage',
      message: 'Default package name for unmatched changes',
      default: 'core',
      useDefault: true
    },
    {
      type: 'number',
      name: 'minChanges',
      message: 'Minimum changes per package (0 to disable merging)',
      default: 0,
      useDefault: true
    },
    {
      type: 'confirm',
      name: 'useTags',
      message: 'Use tags for cross-package dependencies?',
      default: false,
      useDefault: true
    }
  ]);

  // Build slice configuration
  const config: SliceConfig = {
    sourcePlan,
    outputDir,
    strategy: {
      type: 'folder',
      depth: argv.depth ?? depth ?? 1,
      prefixToStrip: argv.prefix ?? prefix ?? 'schemas'
    },
    defaultPackage: argv.default ?? defaultPackage ?? 'core',
    minChangesPerPackage: argv['min-changes'] ?? minChanges ?? 0,
    useTagsForCrossPackageDeps: argv['use-tags'] ?? useTags ?? false,
    author: `${username} <${email}>`
  };

  console.log(`\nSlicing plan: ${sourcePlan}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Strategy: folder-based (depth=${config.strategy.type === 'folder' ? config.strategy.depth : 1})`);
  console.log('');

  // Perform slicing
  const result = slicePlan(config);

  // Handle dry run
  if (argv['dry-run'] || argv.dryRun) {
    const report = generateDryRunReport(result);
    console.log(report);
    prompter.close();
    return argv;
  }

  // Show summary before writing
  console.log(`Found ${result.stats.totalChanges} changes`);
  console.log(`Creating ${result.stats.packagesCreated} packages`);
  console.log(`Cross-package dependency ratio: ${(result.stats.crossPackageRatio * 100).toFixed(1)}%`);
  console.log('');

  // Show warnings
  if (result.warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of result.warnings) {
      console.log(`  [${warning.type}] ${warning.message}`);
    }
    console.log('');
  }

  // Show deploy order
  console.log('Deploy order:');
  for (let i = 0; i < result.workspace.deployOrder.length; i++) {
    const pkg = result.workspace.deployOrder[i];
    const deps = result.workspace.dependencies[pkg] || [];
    const depStr = deps.length > 0 ? ` -> ${deps.join(', ')}` : '';
    console.log(`  ${i + 1}. ${pkg}${depStr}`);
  }
  console.log('');

  // Confirm before writing (unless --overwrite is specified)
  if (!argv.overwrite) {
    const confirmResult = await prompter.prompt({} as Record<string, unknown>, [
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with writing packages?',
        default: true
      }
    ]) as { confirm: boolean };

    if (!confirmResult.confirm) {
      console.log('Aborted.');
      prompter.close();
      return argv;
    }
  }

  // Determine source directory for copying files
  let sourceDir: string | undefined;
  if (argv['copy-files'] || argv.copyFiles) {
    if (project.isInModule()) {
      sourceDir = project.getModulePath();
    } else {
      // Use directory containing the plan file
      sourceDir = resolve(sourcePlan, '..');
    }
  }

  // Write packages to disk
  writeSliceResult(result, {
    outputDir,
    overwrite: argv.overwrite ?? false,
    copySourceFiles: argv['copy-files'] ?? argv.copyFiles ?? false,
    sourceDir
  });

  prompter.close();

  console.log(`
        |||
       (o o)
   ooO--(_)--Ooo-

Sliced into ${result.stats.packagesCreated} packages!

Output: ${outputDir}
`);

  return argv;
};
