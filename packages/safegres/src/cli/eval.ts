import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import * as path from 'path';
import type { Client } from 'pg';
import yanse from 'yanse';

import { type EvalCaseResult, type EvalReport, runEval } from '../commands/eval';
import { configPathBase, loadConfig } from '../config/loader';
import type { EvalConfig } from '../config/types';
import { loadCorpus } from '../corpus';
import { buildClient, csvList } from './shared';

const usage = `
safegres eval — grade the auditor against a corpus with known answers

  safegres eval [OPTIONS]

Deploys each corpus case into the connected database, audits it under a sealed
preset, and grades the report against the case's answer key: every expected
finding present (recall), nothing the case forbids (precision). Exits non-zero
if any case fails. Each case's schemas are dropped afterwards.

Connection (same flags as \`safegres audit\`):
  --connection <url>       Full PostgreSQL connection string
  --host / --port / --user / --password / --database

Options:
  --preset <name>          Preset every case is graded under (default: recommended)
  --corpus <dir>           Corpus directory of <id>/{case.json,schema.sql}
  --case <id>              Run only these cases; id or id prefix, comma-separated
  --list                   List the corpus without connecting to a database
  --keep                   Leave the case schemas in the database
  --json                   Emit the machine-readable result instead of a table
  --no-color               Disable ANSI colors
  --help, -h               Show this help message

Config: a discovered safegres config may set \`eval.corpus\`, \`eval.preset\` and
\`eval.cases\` — what to run. It cannot retune the rules: cases are always
graded by the named preset alone, or the corpus would be measuring itself.
`;

/**
 * Discovery is used for *selection only* (which corpus, which preset, which
 * cases). Grading always loads the preset sealed, so nothing in the working
 * tree can change the answers.
 */
function evalDefaults(configFile?: string): EvalConfig {
  try {
    const loaded = loadConfig({ configFile });
    const config = loaded.config.eval ?? {};
    if (config.corpus === undefined) return config;
    // Like every other configured path: relative to the file that declared it,
    // so a corpus committed next to the config is found from any cwd.
    return { ...config, corpus: path.resolve(configPathBase(loaded).dirFor('eval.corpus'), config.corpus) };
  } catch {
    return {};
  }
}

function line(r: EvalCaseResult, color: boolean): string {
  const paint = (s: string): string => (!color ? s : r.passed ? yanse.green(s) : yanse.bold(yanse.red(s)));
  const detail = r.passed
    ? r.found.map((e) => e.code).join(' ')
    : [
      ...r.missed.map((e) => `missed ${e.code}${e.relation ? `@${e.relation}` : ''}`),
      ...r.falsePositives.map((code) => `false positive ${code}`)
    ].join(', ');
  return `  ${paint(r.passed ? 'PASS' : 'FAIL')}  ${r.id.padEnd(32)} ${r.dimension.padEnd(8)} `
    + `${String(r.score).padStart(3)} (${r.grade.padEnd(2)})  ${detail}\n`;
}

function summary(report: EvalReport, color: boolean): string {
  const pct = (n: number): string => `${Math.round(n * 100)}%`;
  const ok = report.passed === report.total;
  const headline = `${report.passed}/${report.total} cases passed`;
  return `\n${color ? (ok ? yanse.green(headline) : yanse.bold(yanse.red(headline))) : headline}`
    + ` · recall ${pct(report.recall)} · precision ${pct(report.precision)}\n`;
}

export default async (
  argv: ParsedArgs,
  _prompter: Inquirerer,
  _options: CLIOptions
): Promise<void> => {
  if (argv.help || argv.h) {
    process.stdout.write(usage);
    return;
  }

  const defaults = evalDefaults(typeof argv.config === 'string' ? argv.config : undefined);
  const corpus = typeof argv.corpus === 'string' ? argv.corpus : defaults.corpus;
  const preset = typeof argv.preset === 'string' ? argv.preset : (defaults.preset ?? 'recommended');
  const cases = csvList(argv.case) ?? defaults.cases;
  const color = argv.color !== false && argv.json !== true;

  if (argv.list === true) {
    for (const c of loadCorpus(corpus)) {
      process.stdout.write(`${c.id.padEnd(32)} ${c.dimension.padEnd(8)} ${c.title}\n`);
    }
    return;
  }

  const { config } = loadConfig({ sealed: true, preset });
  const client: Client = buildClient(argv);
  await client.connect();

  try {
    const report = await runEval(client, {
      config,
      preset,
      corpus,
      cases,
      keep: argv.keep === true,
      onResult: argv.json === true ? undefined : (r) => process.stdout.write(line(r, color))
    });

    if (argv.json === true) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      process.stdout.write(summary(report, color));
      for (const r of report.results.filter((x) => !x.passed)) {
        process.stdout.write(`\n${r.id}: ${r.title}\n  fix: ${r.fix}\n`);
      }
    }

    if (report.passed !== report.total) process.exit(1);
  } finally {
    await client.end();
  }
};
