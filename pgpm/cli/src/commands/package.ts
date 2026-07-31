import { checkPackages, PgpmPackage, writePackage } from '@pgpmjs/core';
import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, Question } from 'inquirerer';

const log = new Logger('package');

const packageUsageText = `
Package Command:

  pgpm package [OPTIONS]

  Package module for distribution.

Options:
  --help, -h                      Show this help message
  --plan                          Include deployment plan (default: true)
  --pretty                        Pretty-print output (default: true)
  --functionDelimiter <delimiter> Function delimiter (default: $EOFCODE$)
  --outputDiff                    Export AST diff files when round-trip mismatch detected (default: false)
  --bundle                        Also emit sql/<name>--<version>.bundle.tar.gz (default: true)
  --cwd <directory>               Working directory (default: current directory)

Check mode (no writes — verify committed artifacts are in sync with deploy/):
  --check                         Verify committed sql/<name>--<version>.bundle.tar.gz
                                  matches deploy/ for changed modules; exit 1 on drift
  --since <ref>                   Git branch/ref/tag to diff HEAD against for change
                                  detection (default: PR base in CI, else working tree)
  --all                           Check every workspace module (skip change detection)
  --dependents                    Also re-check modules that require a changed module
  --no-fail-fast                  Report all drifted modules instead of stopping at the first

Examples:
  pgpm package                     Package with defaults
  pgpm package --no-plan           Package without plan
  pgpm package --outputDiff        Package and export AST diff files if mismatch detected
  pgpm package --no-bundle         Package without emitting the bundle artifact
  pgpm package --check             Verify changed modules' bundles are in sync
  pgpm package --check --since origin/main   Verify modules changed vs origin/main
  pgpm package --check --all       Verify every module in the workspace
`;

export default async (
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(packageUsageText);
    process.exit(0);
  }

  // Check mode: verify committed artifacts, never write.
  if (argv.check) {
    const result = await checkPackages({
      cwd: argv.cwd,
      since: typeof argv.since === 'string' ? argv.since : undefined,
      all: argv.all === true,
      dependents: argv.dependents === true,
      failFast: argv.failFast !== false,
    });

    if (argv.all) {
      log.info(`Checking all ${result.targeted.length} workspace module(s)`);
    } else {
      log.info(
        `Change detection${result.base ? ` vs ${result.base}` : ' (working tree)'}: ` +
          `${result.changedModules.length} changed module(s)` +
          (result.targeted.length !== result.changedModules.length
            ? ` (${result.targeted.length} incl. dependents)`
            : '')
      );
    }

    if (result.drifted.length) {
      for (const drift of result.drifted) {
        log.error(`✖ ${drift.name}: ${drift.detail}`);
      }
      log.error(
        `${result.drifted.length} module(s) out of sync. Run \`pgpm package\` in each and commit the artifacts.`
      );
      process.exit(1);
    }

    if (result.checked.length === 0) {
      log.success('No changed modules to check.');
    } else {
      log.success(`${result.checked.length} module(s) in sync.`);
    }
    return argv;
  }
  const questions: Question[] = [
    {
      type: 'confirm',
      name: 'plan',
      default: true,
      useDefault: true,
      required: true
    },
    {
      type: 'confirm',
      name: 'pretty',
      default: true,
      useDefault: true,
      required: true
    },
    {
      type: 'text',
      name: 'functionDelimiter',
      default: '$EOFCODE$',
      useDefault: true,
      required: false
    },
    {
      type: 'confirm',
      name: 'outputDiff',
      default: false,
      useDefault: true,
      required: false
    },
    {
      type: 'confirm',
      name: 'bundle',
      default: true,
      useDefault: true,
      required: false
    }
  ];

  let { cwd, plan, pretty, functionDelimiter, outputDiff, bundle } = await prompter.prompt(argv, questions);

  const project = new PgpmPackage(cwd);

  project.ensureModule();

  const info = project.getModuleInfo();

  await writePackage({
    version: info.version,
    extension: true,
    usePlan: plan,
    packageDir: project.modulePath,
    pretty,
    functionDelimiter,
    outputDiff,
    bundle: bundle !== false
  });

  return argv;
};
