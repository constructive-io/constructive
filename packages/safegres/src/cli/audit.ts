import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';

import { audit, type AuditOptions } from '../commands/audit';
import { loadConfig } from '../config/loader';
import type { Grade } from '../config/types';
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

Audit options:
  --schemas <csv>          Limit to these schemas (default: all non-system)
  --exclude-schemas <csv>  Skip these schemas
  --roles <csv>            Audit grants only for these roles (default: all)
  --exclude-roles <csv>    Skip grants for these roles
  --format <fmt>           "pretty" (default) | "json" | "json-pretty"
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
    output = renderPretty(report, { color: colorEnabled });
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
};
