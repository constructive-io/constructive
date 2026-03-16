#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');

const getArgValue = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
};

const parseIntArg = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pid = parseIntArg(getArgValue('--pid'), NaN);
if (!Number.isFinite(pid)) {
  console.error('Usage: capture-heap-snapshot.mjs --pid <process-id> [--dir <snapshot-dir>] [--timeout-ms <ms>]');
  process.exit(1);
}

const snapshotDir = path.resolve(getArgValue('--dir', packageDir));
const timeoutMs = parseIntArg(getArgValue('--timeout-ms'), 30_000);
const pollIntervalMs = 500;

const listHeapSnapshots = async () => {
  try {
    const entries = await fs.readdir(snapshotDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.heapsnapshot'))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  const before = new Set(await listHeapSnapshots());
  process.kill(pid, 'SIGUSR2');

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    await sleep(pollIntervalMs);
    const after = await listHeapSnapshots();
    const created = after.find((fileName) => !before.has(fileName));
    if (created) {
      console.log(path.join(snapshotDir, created));
      return;
    }
  }

  throw new Error(
    `Timed out waiting for a new heap snapshot in ${snapshotDir}. ` +
      'Start the server with NODE_OPTIONS="--heapsnapshot-signal=SIGUSR2 --expose-gc".',
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
