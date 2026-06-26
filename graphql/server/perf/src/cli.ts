#!/usr/bin/env ts-node
import { getPerfPaths } from './lib/paths';
import { privateBenchmark } from './commands/private-benchmark';
import { privateCompare } from './commands/private-compare';
import { stress } from './commands/stress';
import { publicPreflight } from './commands/public-preflight';
import { publicLoad } from './commands/public-load';
import { run } from './commands/run';
import { sweep } from './commands/sweep';
import { summarizeShapes } from './commands/summarize-shapes';
import { preparePublicAccess } from './commands/prepare-public-access';
import { resetBusinessData } from './commands/reset-business-data';
import { e2eMatrix } from './commands/e2e-matrix';
import type { CommandDefinition } from './types';

const commands: CommandDefinition[] = [
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
  { name: 'e2e-matrix', summary: 'Run public/private × old/new E2E matrix wrapper', run: e2eMatrix },
];

const commandMap = new Map(commands.map((command) => [command.name, command]));

function printHelp(): void {
  console.log(`Constructive GraphQL Server Perf CLI\n\nUsage:\n  pnpm --dir graphql/server perf <command> [options]\n\nCommands:`);
  const max = Math.max(...commands.map((command) => command.name.length));
  for (const command of commands) {
    console.log(`  ${command.name.padEnd(max)}  ${command.summary}`);
  }
  console.log(`\nGlobal options:\n  --dry-run   Print delegated commands without executing them\n  --help      Show this help\n\nExamples:\n  pnpm --dir graphql/server perf private-benchmark --mode new --k 2 --duration-seconds 5 --workers 1\n  pnpm --dir graphql/server perf public-preflight --run-dir /tmp/constructive-perf/dbpm-smoke\n  pnpm --dir graphql/server perf e2e-matrix --routing-modes private,public --cache-modes old,new --k 10 --duration-seconds 300 --workers 4 --manage-server`);
}

async function main(): Promise<void> {
  const [, , maybeCommand, ...rest] = process.argv;
  if (!maybeCommand || maybeCommand === '--help' || maybeCommand === '-h' || maybeCommand === 'help') {
    printHelp();
    return;
  }

  const command = commandMap.get(maybeCommand);
  if (!command) {
    console.error(`Unknown perf command: ${maybeCommand}\n`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  const dryRun = rest.includes('--dry-run');
  const args = rest.filter((arg) => arg !== '--dry-run');
  await command.run({ args, dryRun, paths: getPerfPaths() });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
