#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { runCli } from './commands';

const readPackageVersion = (entrypoint: string | undefined): string => {
  if (!entrypoint) throw new Error('Unable to locate the CNC entrypoint.');
  let directory = dirname(realpathSync(resolve(entrypoint)));
  for (let depth = 0; depth < 4; depth += 1) {
    try {
      const candidate = JSON.parse(
        readFileSync(join(directory, 'package.json'), 'utf8')
      ) as { name?: unknown; version?: unknown };
      if (
        candidate.name === '@constructive-io/cli' &&
        typeof candidate.version === 'string'
      ) {
        return candidate.version;
      }
    } catch {
      // Keep walking; the ESM directory has its own type-only package.json.
    }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error('Unable to locate @constructive-io/cli package metadata.');
};

const controller = new AbortController();
const argv = process.argv.slice(2);
const structuredOutputRequested = argv.some(
  (token, index) =>
    token === '--agent' ||
    token === '--format=json' ||
    token === '--format=jsonl' ||
    (token === '--format' &&
      (argv[index + 1] === 'json' || argv[index + 1] === 'jsonl'))
);
const cancel = () => {
  if (!controller.signal.aborted) {
    controller.abort(
      new DOMException('The operation was cancelled.', 'AbortError')
    );
  }
};

process.once('SIGINT', cancel);
process.once('SIGTERM', cancel);

void runCli(argv, {
  cwd: process.cwd(),
  env: { ...process.env },
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  signal: controller.signal,
  version: readPackageVersion(process.argv[1]),
})
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    // This boundary only handles stream failures before the protocol can be
    // rendered; command and invocation failures are mapped by runCli.
    if (!structuredOutputRequested) {
      process.stderr.write(
        `Error [CLI_PROCESS_FAILURE]: ${error instanceof Error ? error.message : 'Unexpected process failure.'}\n`
      );
    }
    process.exitCode = 70;
  })
  .finally(() => {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  });
