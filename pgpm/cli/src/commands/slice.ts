import { PgpmPackage, slicePlan, writeSliceResult, generateDryRunReport, SliceConfig, PatternSlice } from '@pgpmjs/core';
import { getGitConfigInfo } from '@pgpmjs/types';
import { CLIOptions, Inquirerer } from 'inquirerer';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

const sliceUsageText = `
Slice Command:

  pgpm slice [OPTIONS]

  Slice a large plan file into multiple modular packages based on folder structure
  or glob patterns.

Options:
  --help, -h              Show this help message
  --plan <path>           Path to source plan file (default: pgpm.plan in current module)
  --output <directory>    Output directory for sliced packages (default: ./sliced)
  --strategy <type>       Grouping strategy: 'folder' or 'pattern' (default: folder)
  --depth <number>        Folder depth for package extraction (default: 1, folder strategy only)
  --prefix <string>       Prefix to strip from paths (default: schemas, folder strategy only)
  --patterns <file>       JSON file with pattern definitions (pattern strategy only)
  --default <name>        Default package name for unmatched changes (default: core)
  --min-changes <number>  Minimum changes per package (smaller packages are merged)
  --use-tags              Use tags for cross-package dependencies
  --dry-run               Show what would be created without writing files
  --overwrite             Overwrite existing package directories
  --copy-files            Copy SQL files from source to output packages
  --cwd <directory>       Working directory (default: current directory)

Strategies:
  folder   - Groups changes by folder depth (e.g., schemas/auth_public/* -> auth_public)
  pattern  - Groups changes by glob patterns defined in a JSON file

Pattern File Format (for --patterns):
  {
    "slices": [
      { "packageName": "auth", "patterns": ["schemas/*_auth_*/**", "schemas/*_tokens_*/**"] },
      { "packageName": "users", "patterns": ["schemas/*_users_*/**", "schemas/*_emails_*/**"] }
    ]
  }

Examples:
  pgpm slice                           Slice using folder strategy (default)
  pgpm slice --dry-run                 Preview slicing without writing files
  pgpm slice --depth 2                 Use 2-level folder grouping
  pgpm slice --strategy pattern --patterns ./slices.json   Use pattern-based slicing
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

  // Determine strategy type
  const strategyType = argv.strategy ?? 'folder';

  // Load pattern file if using pattern strategy
  let patternSlices: PatternSlice[] = [];
  if (strategyType === 'pattern') {
    if (!argv.patterns) {
      console.error('Error: --patterns <file> is required when using pattern strategy');
      process.exit(1);
    }
    const patternsPath = resolve(cwd, argv.patterns);
    if (!existsSync(patternsPath)) {
      console.error(`Error: Pattern file not found: ${patternsPath}`);
      process.exit(1);
    }
    try {
      const patternsContent = readFileSync(patternsPath, 'utf-8');
      const patternsData = JSON.parse(patternsContent);
      if (!patternsData.slices || !Array.isArray(patternsData.slices)) {
        console.error('Error: Pattern file must contain a "slices" array');
        process.exit(1);
      }
      patternSlices = patternsData.slices;
    } catch (err) {
      console.error(`Error parsing pattern file: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // Get configuration options (only prompt for folder-specific options if using folder strategy)
  const folderQuestions = strategyType === 'folder' ? [
    {
      type: 'number' as const,
      name: 'depth',
      message: 'Folder depth for package extraction',
      default: 1,
      useDefault: true
    },
    {
      type: 'text' as const,
      name: 'prefix',
      message: 'Prefix to strip from paths',
      default: 'schemas',
      useDefault: true
    }
  ] : [];

  const { depth, prefix, defaultPackage, minChanges, useTags } = await prompter.prompt(argv, [
    ...folderQuestions,
    {
      type: 'text' as const,
      name: 'defaultPackage',
      message: 'Default package name for unmatched changes',
      default: 'core',
      useDefault: true
    },
    {
      type: 'number' as const,
      name: 'minChanges',
      message: 'Minimum changes per package (0 to disable merging)',
      default: 0,
      useDefault: true
    },
    {
      type: 'confirm' as const,
      name: 'useTags',
      message: 'Use tags for cross-package dependencies?',
      default: false,
      useDefault: true
    }
  ]);

  // Build slice configuration based on strategy
  const config: SliceConfig = {
    sourcePlan,
    outputDir,
    strategy: strategyType === 'pattern'
      ? { type: 'pattern', slices: patternSlices }
      : {
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
  if (config.strategy.type === 'folder') {
    console.log(`Strategy: folder-based (depth=${config.strategy.depth})`);
  } else {
    console.log(`Strategy: pattern-based (${patternSlices.length} slice definitions)`);
  }
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
