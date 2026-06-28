import { e2eMatrix } from './commands/e2e-matrix';
import { preparePublicAccess } from './commands/prepare-public-access';
import { privateBenchmark } from './commands/private-benchmark';
import { privateCompare } from './commands/private-compare';
import { publicLoad } from './commands/public-load';
import { publicPreflight } from './commands/public-preflight';
import { resetBusinessData } from './commands/reset-business-data';
import { run } from './commands/run';
import { stress } from './commands/stress';
import { summarizeShapes } from './commands/summarize-shapes';
import { sweep } from './commands/sweep';
import { getPerfPaths } from './lib/paths';
import { createCommandUsageText, createUsageText } from './utils';
import type { CommandDefinition, PerfCliOptions } from './types';

export const commandDefinitions: CommandDefinition[] = [
  { name: 'private-benchmark', summary: 'Run lightweight private/header-routing HTTP benchmark', run: privateBenchmark },
  { name: 'private-compare', summary: 'Run old/new private-routing comparison', run: privateCompare },
  { name: 'stress', summary: 'Run curated private comparison stress matrix', run: stress },
  { name: 'public-preflight', summary: 'Provision/validate DBPM tenants and generate profiles', run: publicPreflight },
  { name: 'public-load', summary: 'Run DBPM-backed business load', run: publicLoad },
  { name: 'run', summary: 'Run public preflight + load for one run directory', run },
  { name: 'sweep', summary: 'Run repeated K/tenant-count sweeps', run: sweep },
  { name: 'summarize-shapes', summary: 'Summarize DBPM shape variants', run: summarizeShapes },
  { name: 'prepare-public-access', summary: 'Prepare public grants for perf business tables', run: preparePublicAccess },
  { name: 'reset-business-data', summary: 'Truncate generated business workload table data', run: resetBusinessData },
  { name: 'e2e-matrix', summary: 'Run public/private x old/new E2E matrix wrapper', run: e2eMatrix },
];

export function createCommandMap(): Map<string, CommandDefinition> {
  return new Map(commandDefinitions.map((command) => [command.name, command]));
}

export async function commands(argv: string[], options: PerfCliOptions = {}): Promise<void> {
  const [maybeCommand, ...rest] = argv;
  const usageText = createUsageText(commandDefinitions);
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;

  if (!maybeCommand || maybeCommand === '--help' || maybeCommand === '-h' || maybeCommand === 'help') {
    stdout.write(`${usageText}\n`);
    return;
  }

  const command = createCommandMap().get(maybeCommand);
  if (!command) {
    stderr.write(`Unknown perf command: ${maybeCommand}\n\n`);
    stdout.write(`${usageText}\n`);
    process.exitCode = 1;
    return;
  }

  if (rest.includes('--help') || rest.includes('-h')) {
    stdout.write(`${createCommandUsageText(command)}\n`);
    return;
  }

  const dryRun = rest.includes('--dry-run');
  const args = rest.filter((arg) => arg !== '--dry-run');
  await command.run({
    args,
    dryRun,
    paths: options.paths ?? getPerfPaths(),
  });
}
