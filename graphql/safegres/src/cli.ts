#!/usr/bin/env node
/* eslint-disable no-console */
import { Client } from 'pg';

import { auditPg } from './commands/pg';
import { renderJson } from './report/json';
import { renderPretty } from './report/pretty';
import type { Severity } from './types';
import { meetsThreshold, SEVERITY_ORDER } from './types';
import { boolFlag, listFlag, parseArgs, stringFlag } from './util/args';

const HELP = `\
safegres — pure-PostgreSQL RLS auditor

Usage:
  safegres pg   [options]
  safegres help

Options (pg):
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
`;

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args.command ?? 'help';

  if (cmd === 'help' || cmd === '-h' || cmd === '--help' || args.flags.help === true) {
    process.stdout.write(HELP);
    return 0;
  }

  if (cmd !== 'pg') {
    process.stderr.write(`Unknown command: ${cmd}\n\n${HELP}`);
    return 2;
  }

  const connection = stringFlag(args.flags, 'connection') ?? process.env.DATABASE_URL;
  if (!connection) {
    process.stderr.write('error: --connection <url> or DATABASE_URL env required\n');
    return 2;
  }

  const client = new Client({ connectionString: connection });
  await client.connect();
  try {
    const report = await auditPg(client, {
      schemas: listFlag(args.flags, 'schemas'),
      excludeSchemas: listFlag(args.flags, 'exclude-schemas'),
      includeRoles: listFlag(args.flags, 'roles'),
      excludeRoles: listFlag(args.flags, 'exclude-roles'),
      skipAstChecks: boolFlag(args.flags, 'skip-ast')
    });

    const fmt = stringFlag(args.flags, 'format') ?? 'pretty';
    let output: string;
    switch (fmt) {
    case 'json':
      output = renderJson(report);
      break;
    case 'json-pretty':
      output = renderJson(report, { pretty: true });
      break;
    case 'pretty':
      output = renderPretty(report, { color: !boolFlag(args.flags, 'no-color') });
      break;
    default:
      process.stderr.write(`Unknown --format: ${fmt}\n`);
      return 2;
    }
    process.stdout.write(output);
    process.stdout.write('\n');

    const failOn = stringFlag(args.flags, 'fail-on') as Severity | undefined;
    if (failOn) {
      if (!(failOn in SEVERITY_ORDER)) {
        process.stderr.write(`Unknown --fail-on severity: ${failOn}\n`);
        return 2;
      }
      if (report.findings.some((f) => meetsThreshold(f.severity, failOn))) {
        return 1;
      }
    }
    return 0;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().then((code) => process.exit(code)).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(3);
  });
}
