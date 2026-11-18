// Prints the fast-app timing report for one pi session file.
//
//   node dist/pipeline/timing-cli.js <session.jsonl> [--json]   (in agentic/fast-app, after a build)

import { readFileSync } from 'node:fs';

import { computeTiming, formatTiming, parseSessionJsonl } from './timing';

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith('--'));
if (!file) {
  console.error('usage: timing-cli.ts <session.jsonl> [--json]');
  process.exit(2);
}

const report = computeTiming(parseSessionJsonl(readFileSync(file, 'utf8')));
console.log(args.includes('--json') ? JSON.stringify(report, null, 2) : formatTiming(report));
