/* eslint-disable no-console */
import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import { Client } from 'pg';

import { auditPg } from '../commands/pg';
import { renderJson } from '../report/json';
import { renderPretty } from '../report/pretty';
import type { Severity } from '../types';
import { meetsThreshold, SEVERITY_ORDER } from '../types';

const usage = `
safegres pg — pure-PostgreSQL RLS auditor

  safegres pg [OPTIONS]

Options:
  --connection <url>       PostgreSQL connection string (or env DATABASE_URL)
  --schemas <csv>          Limit to these schemas (default: all non-system)
  --exclude-schemas <csv>  Skip these schemas (default: pg_catalog,information_schema,pg_toast)
  --roles <csv>            Audit grants only for these roles (default: all)
  --exclude-roles <csv>    Skip grants for these roles
  --format <fmt>           "pretty" (default) | "json" | "json-pretty"
  --fail-on <severity>     Exit non-zero if any finding >= severity
                           (critical|high|medium|low|info; default: none)
  --skip-ast               Skip AST-level anti-pattern checks (faster)
  --no-color               Disable ANSI colors in pretty output
  --help, -h               Show this help message
`;

function csv(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function bool(value: unknown): boolean {
  return value === true || value === 'true';
}

export default async (
  argv: ParsedArgs,
  _prompter: Inquirerer,
  _options: CLIOptions
): Promise<void> => {
  if (argv.help || argv.h) {
    console.log(usage);
    return;
  }

  const connection = string(argv.connection) ?? process.env.DATABASE_URL;
  if (!connection) {
    console.error('error: --connection <url> or DATABASE_URL env required');
    process.exit(2);
  }

  // `--no-color` is parsed by minimist as `color: false` (negation of `--color`).
  const colorFlag = 'color' in argv ? argv.color !== false : !bool(argv['no-color']);

  const client = new Client({ connectionString: connection });
  await client.connect();
  try {
    const report = await auditPg(client, {
      schemas: csv(argv.schemas),
      excludeSchemas: csv(argv['exclude-schemas']),
      includeRoles: csv(argv.roles),
      excludeRoles: csv(argv['exclude-roles']),
      skipAstChecks: bool(argv['skip-ast'])
    });

    const fmt = string(argv.format) ?? 'pretty';
    let output: string;
    switch (fmt) {
    case 'json':
      output = renderJson(report);
      break;
    case 'json-pretty':
      output = renderJson(report, { pretty: true });
      break;
    case 'pretty':
      output = renderPretty(report, { color: colorFlag });
      break;
    default:
      console.error(`Unknown --format: ${fmt}`);
      process.exit(2);
    }
    process.stdout.write(output);
    process.stdout.write('\n');

    const failOn = string(argv['fail-on']) as Severity | undefined;
    if (failOn) {
      if (!(failOn in SEVERITY_ORDER)) {
        console.error(`Unknown --fail-on severity: ${failOn}`);
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
