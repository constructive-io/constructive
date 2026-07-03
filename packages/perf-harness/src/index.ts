#!/usr/bin/env node
/**
 * perf-harness — Constructive performance / regression CLI.
 *
 * Non-interactive, script-friendly router:
 *   perf-harness <domain> <subcommand> [flags]
 *
 * Each `src/commands/<domain>.ts` self-registers via `{ domain, summary,
 * subcommands }`. This shell is deliberately a hand-rolled router over
 * `core/args.parseArgv` rather than the `inquirerer` CLI class the sibling
 * `packages/cli` uses: the domain contract returns numeric exit codes (0/1/2),
 * routing is 2–3 positionals deep (`run soak start|status|stop`), and the
 * automation contract forbids interactive prompts — none of which the
 * prompt-driven `inquirerer` shell accommodates cleanly. See DESIGN.md
 * "Command registration contract" (a working non-interactive CLI beats
 * framework conformance).
 *
 * stdout is reserved for the machine-readable JSON/JSONL protocol emitted by
 * subcommands; help/usage (human output) goes to stderr via `usageExit`.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';

import * as fleet from './commands/fleet';
import * as load from './commands/load';
import * as measure from './commands/measure';
import * as regression from './commands/regression';
import * as report from './commands/report';
import * as run from './commands/run';
import { Argv, parseArgv, usageExit } from './core/args';

interface Subcommand {
  usage: string;
  run(argv: Argv): Promise<number>;
}

interface Domain {
  domain: string;
  summary: string;
  subcommands: Record<string, Subcommand>;
}

// Ordered for help rendering; the registry below is keyed off each `.domain`.
const DOMAIN_LIST: Domain[] = [fleet, load, measure, run, report, regression];

const domains: Record<string, Domain> = {};
for (const d of DOMAIN_LIST) domains[d.domain] = d;

function readVersion(): string {
  // Published layout puts package.json next to index.js (publishConfig.directory
  // = dist); built/dev layouts put it one level up. Walk up until the first
  // package.json with a version is found.
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      if (pkg && typeof pkg.version === 'string') return pkg.version;
    } catch {
      // not here — keep walking up
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return '0.0.0';
}

function topLevelHelp(): string {
  const w = Math.max(...DOMAIN_LIST.map((d) => d.domain.length));
  const lines = DOMAIN_LIST.map((d) => `  ${d.domain.padEnd(w)}  ${d.summary}`);
  return [
    'perf-harness — Constructive performance / regression harness',
    '',
    'Usage: perf-harness <domain> <subcommand> [flags]',
    '',
    'Domains:',
    ...lines,
    '',
    "Run 'perf-harness <domain> --help' to list a domain's subcommands.",
    'Global flags: --help/-h, --version.',
    'Common flags: --allow-hub, --out-dir <dir>, --pg-host/--pg-port/--pg-user/--pg-password/--pg-database.'
  ].join('\n');
}

function domainHelp(d: Domain): string {
  const usageLines = Object.values(d.subcommands).map((s) => `  ${s.usage}`);
  return [
    `perf-harness ${d.domain} — ${d.summary}`,
    '',
    `Usage: perf-harness ${d.domain} <subcommand> [flags]`,
    '',
    'Subcommands:',
    ...usageLines
  ].join('\n');
}

async function main(): Promise<number> {
  const raw = process.argv.slice(2);
  const argv = parseArgv(raw);

  // Detect meta-flags from the RAW argv: parseArgv treats `--flag value` as
  // key=value, which would otherwise let `--version`/`--help` swallow a
  // following positional. These flags are always standalone booleans.
  if (raw.includes('--version')) {
    console.log(readVersion());
    return 0;
  }
  const wantHelp = raw.includes('--help') || raw.includes('-h');

  const domainName = argv._[0];
  if (domainName === 'help' && !argv._[1]) return usageExit(topLevelHelp(), 0);
  if (!domainName) return usageExit(topLevelHelp(), wantHelp ? 0 : 1);

  const domain = domains[domainName];
  if (!domain) return usageExit(`Unknown domain: ${domainName}\n\n${topLevelHelp()}`, 1);

  const subName = argv._[1];
  if (subName === 'help') return usageExit(domainHelp(domain), 0);
  if (!subName) return usageExit(domainHelp(domain), wantHelp ? 0 : 1);

  const sub = domain.subcommands[subName];
  if (!sub) {
    if (wantHelp) return usageExit(domainHelp(domain), 0);
    return usageExit(`Unknown subcommand: ${domainName} ${subName}\n\n${domainHelp(domain)}`, 1);
  }

  // Pass the full argv through unchanged: subcommands read their own
  // positionals (e.g. `run soak` dispatches on argv._[2] = start|status|stop)
  // and handle their own `--help`.
  const code = await sub.run(argv);
  return typeof code === 'number' ? code : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err && err.message ? err.message : String(err));
    process.exitCode = 1;
  });
