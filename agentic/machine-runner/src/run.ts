#!/usr/bin/env node

import { createLogger } from '@pgpmjs/logger';

import { CliIo, defaultConfigPath, RUNNER_USAGE, runRunnerCli } from './cli';
import { loadRunnerConfig } from './config';
import { MachineRunner } from './runner';
import { ensureSpawnHelperExecutable, nodePtyRoot } from './spawn-helper';

const logger = createLogger('machine-runner');

/**
 * Boot the daemon. `start` is what this process did before it grew verbs, and
 * `--config <path>` / `MACHINE_RUNNER_CONFIG` still address the same file
 * `enroll` writes.
 */
export function bootMachineRunner(argv: string[]): MachineRunner {
  const flagIndex = argv.indexOf('--config');
  const configPath = flagIndex >= 0 ? argv[flagIndex + 1] : defaultConfigPath();
  if (!configPath) {
    throw new Error(
      'machine-runner: pass --config <path> or set MACHINE_RUNNER_CONFIG to the config file'
    );
  }
  const config = loadRunnerConfig(configPath);
  // Before the first session, not on its failure: an unusable spawn-helper
  // surfaces as EACCES from deep inside forkpty, and the fix is a mode bit npm
  // dropped rather than anything the tenant asked for.
  for (const helper of ensureSpawnHelperExecutable(nodePtyRoot())) {
    logger.warn(`machine-runner: restored the executable bit on ${helper}`);
  }
  const runner = new MachineRunner({
    enrollments: config.enrollments,
    policy: config.policy,
    logger
  });
  runner.start();
  return runner;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function daemonize(argv: string[]): void {
  const runner = bootMachineRunner(argv);
  const shutdown = () => {
    runner.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function main(argv: string[]): Promise<void> {
  const io: CliIo = {
    out: line => process.stdout.write(`${line}\n`),
    readStdin,
    env: process.env
  };
  const [command, ...rest] = argv;
  // `start` takes over the process, so it is not one of the CLI's verbs.
  if (command === 'start') {
    daemonize(rest);
    return;
  }
  const handled = await runRunnerCli(argv, io);
  if (handled) return;
  // No verb at all keeps the pre-verb entrypoint working — the deployed unit
  // and the bundle both invoke `run.js --config <path>`.
  if (!command || command.startsWith('--')) {
    daemonize(argv);
    return;
  }
  throw new Error(`machine-runner: unknown command '${command}'\n\n${RUNNER_USAGE}`);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(err => {
    logger.error(`machine-runner failed to start: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
