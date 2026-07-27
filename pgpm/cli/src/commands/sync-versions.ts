import { PgpmPackage } from '@pgpmjs/core';
import { CLIOptions, Inquirerer } from 'inquirerer';

const syncVersionsUsageText = `
Sync Versions Command:

  pgpm sync-versions [OPTIONS]

  Sync extension metadata (.control default_version, Makefile sql filename,
  and the sql/<name>--<version>.sql bundle) to each module's package.json
  version. Inside a module, syncs just that module; at a workspace root,
  syncs every workspace module.

Options:
  --help, -h                      Show this help message
  --check                         Report version skew without writing; exits non-zero if skewed
  --cwd <directory>               Working directory (default: current directory)

Examples:
  pgpm sync-versions               Sync all out-of-sync modules
  pgpm sync-versions --check       Fail if any module's metadata is out of sync (for CI)
`;

export default async (
  argv: Partial<Record<string, any>>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(syncVersionsUsageText);
    process.exit(0);
  }

  const cwd = argv.cwd ?? process.cwd();
  const check = Boolean(argv.check);

  const project = new PgpmPackage(cwd);
  const result = await project.syncVersions({ check });

  if (check) {
    if (result.skewed.length > 0) {
      console.log(`${result.skewed.length} module(s) out of sync:`);
      for (const status of result.skewed) {
        console.log(
          `  ${status.name}: package.json ${status.packageVersion} != control ${status.controlVersion}` +
          (status.sqlFileExists ? '' : ` (missing sql/${status.name}--${status.packageVersion}.sql)`)
        );
      }
      process.exit(1);
    }
    console.log(`All ${result.ok.length} module(s) in sync.`);
    return argv;
  }

  if (result.synced.length === 0) {
    console.log(`All ${result.ok.length} module(s) already in sync.`);
  } else {
    console.log(`Synced ${result.synced.length} module(s); ${result.ok.length} already in sync.`);
  }

  return argv;
};
