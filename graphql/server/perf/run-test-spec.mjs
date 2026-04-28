#!/usr/bin/env node

import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  DEFAULT_TMP_ROOT,
  getArgValue,
  makeRunId,
} from './common.mjs';

const args = process.argv.slice(2);
const phase = getArgValue(args, '--phase', 'all');
const runId = getArgValue(args, '--run-id', makeRunId());
const runDir = path.resolve(getArgValue(args, '--run-dir', path.join(DEFAULT_TMP_ROOT, runId)));

const forwardArgs = args.filter((arg, index) => {
  const blocked = new Set(['--phase', '--run-id', '--run-dir']);
  if (blocked.has(arg)) return false;
  const prev = index > 0 ? args[index - 1] : '';
  if (blocked.has(prev)) return false;
  return true;
});

const runNodeScript = (scriptName, extraArgs = []) =>
  new Promise((resolve, reject) => {
    const scriptPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), scriptName);
    const child = spawn(process.execPath, [scriptPath, '--run-dir', runDir, ...extraArgs, ...forwardArgs], {
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptName} failed with exit code ${code}`));
      }
    });
  });

const main = async () => {
  if (phase === 'phase1') {
    await runNodeScript('phase1-preflight.mjs');
    return;
  }
  if (phase === 'phase2') {
    await runNodeScript('phase2-load.mjs');
    return;
  }
  if (phase !== 'all') {
    throw new Error(`Unknown --phase value: ${phase}`);
  }

  await runNodeScript('phase1-preflight.mjs');
  await runNodeScript('phase2-load.mjs');
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
