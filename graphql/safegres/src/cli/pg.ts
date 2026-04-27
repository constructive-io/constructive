import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import { Client } from 'pg';
import { getPgEnvOptions, type PgConfig } from 'pg-env';

import { auditPg } from '../commands/pg';
import { renderJson } from '../report/json';
import { renderPretty } from '../report/pretty';
import type { Severity } from '../types';
import { meetsThreshold, SEVERITY_ORDER } from '../types';

const log = new Logger('safegres');

const usage = `
safegres pg — pure-PostgreSQL RLS auditor

  safegres pg [OPTIONS]

Connection (priority order, top wins):
  --connection <url>       Full PostgreSQL connection string
  --host <host>            PostgreSQL host        (else PGHOST,    default localhost)
  --port <port>            PostgreSQL port        (else PGPORT,    default 5432)
  --user <user>            PostgreSQL user        (else PGUSER,    default postgres)
  --password <pw>          PostgreSQL password    (else PGPASSWORD,default password)
  --database <db>          PostgreSQL database    (else PGDATABASE,default postgres)

Audit options:
  --schemas <csv>          Limit to these schemas (default: all non-system)
  --exclude-schemas <csv>  Skip these schemas
  --roles <csv>            Audit grants only for these roles (default: all)
  --exclude-roles <csv>    Skip grants for these roles
  --format <fmt>           "pretty" (default) | "json" | "json-pretty"
  --fail-on <severity>     Exit non-zero if any finding >= severity
                           (critical|high|medium|low|info; default: none)
  --skip-ast               Skip AST-level anti-pattern checks (faster)
  --no-color               Disable ANSI colors in pretty output
  --help, -h               Show this help message
`;

function csvList(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function buildClient(argv: ParsedArgs): Client {
  if (typeof argv.connection === 'string' && argv.connection.length > 0) {
    return new Client({ connectionString: argv.connection });
  }
  const overrides: Partial<PgConfig> = {};
  if (typeof argv.host === 'string') overrides.host = argv.host;
  if (typeof argv.port === 'number') overrides.port = argv.port;
  if (typeof argv.user === 'string') overrides.user = argv.user;
  if (typeof argv.password === 'string') overrides.password = argv.password;
  if (typeof argv.database === 'string') overrides.database = argv.database;
  return new Client(getPgEnvOptions(overrides));
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

  // minimist parses `--no-color` as `color: false`.
  const colorEnabled = argv.color !== false;

  const client = buildClient(argv);
  await client.connect();
  try {
    const report = await auditPg(client, {
      schemas: csvList(argv.schemas),
      excludeSchemas: csvList(argv['exclude-schemas']),
      includeRoles: csvList(argv.roles),
      excludeRoles: csvList(argv['exclude-roles']),
      skipAstChecks: argv['skip-ast'] === true
    });

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

    const failOn = typeof argv['fail-on'] === 'string' ? (argv['fail-on'] as Severity) : undefined;
    if (failOn) {
      if (!(failOn in SEVERITY_ORDER)) {
        log.error(`Unknown --fail-on severity: ${failOn}`);
        process.exit(2);
      }
      if (report.findings.some((f) => meetsThreshold(f.severity, failOn))) {
        process.exit(1);
      }
    }
  } finally {
    await client.end();
  }
};
