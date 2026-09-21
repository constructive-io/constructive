import { PgpmPackage } from '@pgpmjs/core';
import { cliExitWithError, CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import path from 'path';

const lsUsageText = `
List Command:

  pgpm ls [OPTIONS]

  List the pgpm modules in the current workspace.

Options:
  --help, -h       Show this help message
  --json           Print JSON output
  --names          Print module names only
  --paths          Print workspace-relative module paths only
  --cwd <dir>      Working directory (default: current directory)

Examples:
  pgpm ls
  pgpm ls --names
  pgpm ls --paths --json
`;

interface ModuleListing {
  name: string;
  version: string;
  path: string;
  requires: string[];
}

export default async (
  argv: Partial<ParsedArgs>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(lsUsageText);
    process.exit(0);
  }

  const names = Boolean(argv.names);
  const paths = Boolean(argv.paths);
  const json = Boolean(argv.json);

  if (names && paths) {
    await cliExitWithError('--names and --paths cannot be used together.');
  }

  const cwd = path.resolve((argv.cwd as string) || process.cwd());
  const workspace = new PgpmPackage(cwd);
  const workspacePath = workspace.getWorkspacePath();
  if (!workspacePath) {
    await cliExitWithError(
      `Not inside a pgpm workspace: ${cwd}. Pass --cwd <workspace-directory>.`
    );
  }

  const entries: ModuleListing[] = Object.entries(workspace.getModuleMap())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, module]) => ({
      name,
      version: module.version || 'unknown',
      path: module.path,
      requires: [...module.requires]
    }));

  if (json) {
    if (names) {
      process.stdout.write(JSON.stringify(entries.map(entry => entry.name)));
      return;
    }
    if (paths) {
      process.stdout.write(JSON.stringify(entries.map(entry => entry.path)));
      return;
    }
    process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
    return;
  }

  if (names) {
    process.stdout.write(entries.map(entry => entry.name).join('\n'));
    if (entries.length > 0) process.stdout.write('\n');
    return;
  }

  if (paths) {
    process.stdout.write(entries.map(entry => entry.path).join('\n'));
    if (entries.length > 0) process.stdout.write('\n');
    return;
  }

  if (entries.length === 0) {
    process.stdout.write('No modules found.\n');
    return;
  }

  const nameWidth = Math.max(...entries.map(entry => entry.name.length));
  const versionWidth = Math.max(...entries.map(entry => entry.version.length));
  process.stdout.write(entries
    .map(entry =>
      `${entry.name.padEnd(nameWidth)}  ${entry.version.padEnd(versionWidth)}  ${entry.path}`
    )
    .join('\n') + '\n');
};
