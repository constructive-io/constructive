import { Logger } from '@pgpmjs/logger';
import * as fs from 'fs';
import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';

import { diffCallGraph, parseBaseline, serializeBaseline, toBaseline } from '../callgraph/baseline';
import { audit, type AuditOptions } from '../commands/audit';
import { loadConfig } from '../config/loader';
import type { Grade } from '../config/types';
import { diffPerf, parsePerfBaseline, serializePerfBaseline, toPerfBaseline } from '../perf/baseline';
import { renderJson } from '../report/json';
import { renderPretty } from '../report/pretty';
import { meetsGrade } from '../score/score';
import type { Report, Severity } from '../types';
import { meetsThreshold, SEVERITY_ORDER, summarize } from '../types';
import { buildClient, configParamsFromArgv, csvList } from './shared';

const log = new Logger('safegres');

/**
 * `--pgpm` mode needs the optional peer dependency `pgsql-test`, so the
 * helper module is loaded lazily with a friendly error when it's missing.
 */
function importPgpmTest(): typeof import('../pgpm-test') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../pgpm-test');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
      log.error('--pgpm requires the optional peer dependency "pgsql-test" — install it (e.g. `npm i -D pgsql-test`) and retry');
      process.exit(2);
    }
    throw err;
  }
}

const usage = `
safegres audit — pure-PostgreSQL RLS auditor

  safegres audit [OPTIONS]

Connection (priority order, top wins):
  --pgpm [dir]             No connection needed: deploy the pgpm workspace at
                           [dir] (default: nearest from cwd) into an ephemeral
                           test database and audit it (requires pgsql-test)
  --connection <url>       Full PostgreSQL connection string
  --host <host>            PostgreSQL host        (else PGHOST,    default localhost)
  --port <port>            PostgreSQL port        (else PGPORT,    default 5432)
  --user <user>            PostgreSQL user        (else PGUSER,    default postgres)
  --password <pw>          PostgreSQL password    (else PGPASSWORD,default password)
  --database <db>          PostgreSQL database    (else PGDATABASE,default postgres)

Configuration:
  --config <path>          Explicit config file (else discovered: safegres.config.{ts,js,mjs,cjs},
                           .safegresrc{,.json,.yaml,.yml,.js}, safegres.json, package.json "safegres")
  --preset <name>          Apply a built-in preset (recommended|strict|constructive|minimal)
  --rule <CODE=SETTING>    Retune a rule (repeatable), e.g. --rule A3=off --rule A5=high

Exposure (what the score is computed against):
  --exposure-schemas <csv> Declare the API-exposed schemas; findings outside
                           them become unscored internal advisories
  --exposed-only           Hide internal (non-exposed) findings from output

Performance dimension (optional; scored separately from security):
  --perf                   Also audit index hygiene (X1/X5/X6/X7/X8), policy-aware
                           index coverage (X2/X3/X4) and policy cost (P1/P1b),
                           scored on its own 0-100 axis (report.perf)
  --fail-on-perf-score <n> Exit non-zero if the perf score is below n (0-100)
  --fail-on-perf-grade <g> Exit non-zero if the perf grade is below g (A+|A|B|C|D)
  --write-perf-baseline <file>
                           Snapshot today's perf findings to <file> as accepted
                           debt (implies --perf)
  --perf-baseline <file>   Diff perf findings against a committed baseline and
                           report only NEW debt (implies --perf)
  --fail-on-new-perf       Exit non-zero when --perf-baseline finds new debt

Call graph (unscored; human review):
  --call-graph             Analyze the functions reachable from the exposed entry
                           points and list trust boundaries: SECURITY DEFINER hops,
                           RLS-bypass paths, auth-context mutations, internal-table
                           reach, and opaque (dynamic SQL) nodes
  --write-baseline <file>  Snapshot the call-graph boundaries to <file>
                           (implies --call-graph)
  --baseline <file>        Diff the call graph against a committed snapshot and
                           report NEW trust boundaries (implies --call-graph)
  --fail-on-new-boundaries Exit non-zero when --baseline finds new boundaries

Audit options:
  --schemas <csv>          Limit to these schemas (default: all non-system)
  --exclude-schemas <csv>  Skip these schemas
  --roles <csv>            Audit grants only for these roles (default: all)
  --exclude-roles <csv>    Skip grants for these roles
  --format <fmt>           "pretty" (default) | "json" | "json-pretty"
  --summary, -q            Print only exposure, score, and severity counts (no findings)
  --verbose                Expand internal (non-exposed) advisories (listed as a count otherwise)
  --fail-on <severity>     Exit non-zero if any finding >= severity
                           (critical|high|medium|low|info; default: none)
  --fail-on-score <n>      Exit non-zero if the score is below n (0-100)
  --fail-on-grade <g>      Exit non-zero if the grade is below g (A+|A|B|C|D)
  --skip-ast               Skip AST-level anti-pattern checks (faster)
  --no-color               Disable ANSI colors in pretty output
  --help, -h               Show this help message
`;

export default async (
  argv: ParsedArgs,
  _prompter: Inquirerer,
  _options: CLIOptions
): Promise<void> => {
  if (argv.help || argv.h) {
    process.stdout.write(usage);
    return;
  }

  // minimist parses `--no-color` as `color: false`.
  const colorEnabled = argv.color !== false;

  const pgpmCwd = typeof argv.pgpm === 'string' ? argv.pgpm : undefined;
  const { config } = loadConfig({ cwd: pgpmCwd, ...configParamsFromArgv(argv) });

  const exposureSchemas = csvList(argv['exposure-schemas']);
  const auditOptions: AuditOptions = {
    schemas: csvList(argv.schemas),
    excludeSchemas: csvList(argv['exclude-schemas']),
    includeRoles: csvList(argv.roles),
    excludeRoles: csvList(argv['exclude-roles']),
    skipAstChecks: argv['skip-ast'] === true,
    perf:
      argv.perf === true
      || typeof argv['perf-baseline'] === 'string'
      || typeof argv['write-perf-baseline'] === 'string'
        ? true
        : undefined,
    callGraph:
      argv['call-graph'] === true
      || typeof argv.baseline === 'string'
      || typeof argv['write-baseline'] === 'string',
    exposure: exposureSchemas
      ? { ...config.exposure, schemas: exposureSchemas }
      : undefined,
    config
  };

  let report: Report;
  if (argv.pgpm) {
    const { auditPgpmWorkspace } = importPgpmTest();
    report = await auditPgpmWorkspace({ ...auditOptions, cwd: pgpmCwd });
  } else {
    const client = buildClient(argv);
    await client.connect();
    try {
      report = await audit(client, auditOptions);
    } finally {
      await client.end();
    }
  }

  if (typeof argv['write-baseline'] === 'string' && report.callGraph) {
    fs.writeFileSync(argv['write-baseline'], serializeBaseline(toBaseline(report.callGraph)));
    log.info(`wrote call-graph baseline: ${argv['write-baseline']}`);
  }

  if (typeof argv['write-perf-baseline'] === 'string' && report.perf) {
    fs.writeFileSync(
      argv['write-perf-baseline'],
      serializePerfBaseline(toPerfBaseline(report.perf.findings))
    );
    log.info(`wrote perf baseline: ${argv['write-perf-baseline']}`);
  }

  if (typeof argv['perf-baseline'] === 'string' && report.perf) {
    let raw: string;
    try {
      raw = fs.readFileSync(argv['perf-baseline'], 'utf8');
    } catch {
      log.error(
        `cannot read --perf-baseline file: ${argv['perf-baseline']} (create one with --write-perf-baseline)`
      );
      process.exit(2);
    }
    report.perf.diff = diffPerf(report.perf.findings, parsePerfBaseline(raw));
  }

  if (typeof argv.baseline === 'string' && report.callGraph) {
    let raw: string;
    try {
      raw = fs.readFileSync(argv.baseline, 'utf8');
    } catch {
      log.error(`cannot read --baseline file: ${argv.baseline} (create one with --write-baseline)`);
      process.exit(2);
    }
    report.callGraphDiff = diffCallGraph(report.callGraph, parseBaseline(raw));
  }

  if (argv['exposed-only'] === true) {
    report.findings = report.findings.filter((f) => f.exposed !== false);
    report.summary = summarize(report.findings);
  }

  const fmt = typeof argv.format === 'string' ? argv.format : 'pretty';
  let output: string;
  switch (fmt) {
  case 'json':
    output = renderJson(report);
    break;
  case 'json-pretty':
    output = renderJson(report, { pretty: true });
    break;
  case 'pretty':
    output = renderPretty(report, {
      color: colorEnabled,
      summary: argv.summary === true,
      verbose: argv.verbose === true
    });
    break;
  default:
    log.error(`Unknown --format: ${fmt}`);
    process.exit(2);
  }
  process.stdout.write(output);
  process.stdout.write('\n');

  const failOnSeverity =
    typeof argv['fail-on'] === 'string' ? (argv['fail-on'] as Severity) : config.failOn?.severity;
  if (failOnSeverity) {
    if (!(failOnSeverity in SEVERITY_ORDER)) {
      log.error(`Unknown --fail-on severity: ${failOnSeverity}`);
      process.exit(2);
    }
    if (report.findings.some((f) => meetsThreshold(f.severity, failOnSeverity))) {
      process.exit(1);
    }
  }

  const failOnScore =
    typeof argv['fail-on-score'] === 'number' ? argv['fail-on-score'] : config.failOn?.score;
  if (failOnScore != null && report.score && report.score.value < failOnScore) {
    log.error(`score ${report.score.value} is below --fail-on-score ${failOnScore}`);
    process.exit(1);
  }

  const failOnGrade =
    typeof argv['fail-on-grade'] === 'string' ? (argv['fail-on-grade'] as Grade) : config.failOn?.grade;
  if (failOnGrade && report.score && !meetsGrade(report.score.grade, failOnGrade)) {
    log.error(`grade ${report.score.grade} is below --fail-on-grade ${failOnGrade}`);
    process.exit(1);
  }

  const failOnPerfScore =
    typeof argv['fail-on-perf-score'] === 'number'
      ? argv['fail-on-perf-score']
      : config.failOn?.perfScore;
  if (failOnPerfScore != null && report.perf && report.perf.score.value < failOnPerfScore) {
    log.error(`perf score ${report.perf.score.value} is below --fail-on-perf-score ${failOnPerfScore}`);
    process.exit(1);
  }

  const failOnPerfGrade =
    typeof argv['fail-on-perf-grade'] === 'string'
      ? (argv['fail-on-perf-grade'] as Grade)
      : config.failOn?.perfGrade;
  if (failOnPerfGrade && report.perf && !meetsGrade(report.perf.score.grade, failOnPerfGrade)) {
    log.error(`perf grade ${report.perf.score.grade} is below --fail-on-perf-grade ${failOnPerfGrade}`);
    process.exit(1);
  }

  if (argv['fail-on-new-perf'] === true && report.perf?.diff && report.perf.diff.added.length > 0) {
    const count = report.perf.diff.added.length;
    log.error(
      `${count} new performance finding${count === 1 ? '' : 's'} since the perf baseline — fix them, or re-baseline with --write-perf-baseline to accept`
    );
    process.exit(1);
  }

  if (
    argv['fail-on-new-boundaries'] === true
    && report.callGraphDiff
    && report.callGraphDiff.added.length > 0
  ) {
    log.error(
      `${report.callGraphDiff.added.length} new trust boundar${report.callGraphDiff.added.length === 1 ? 'y' : 'ies'} since the baseline — review and re-baseline to accept`
    );
    process.exit(1);
  }
};
