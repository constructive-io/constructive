import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import type { Client } from 'pg';
import yanse from 'yanse';

import { doctor, type DoctorStatus } from '../commands/doctor';
import { buildClient, configParamsFromArgv } from './shared';

const usage = `
safegres doctor — diagnose the environment, connection, and configuration

  safegres doctor [OPTIONS]

Connection (same flags as \`safegres audit\`):
  --connection <url>       Full PostgreSQL connection string
  --host / --port / --user / --password / --database

Configuration:
  --config <path>          Explicit config file
  --preset <name>          Apply a built-in preset
  --rule <CODE=SETTING>    Retune a rule (repeatable)

Options:
  --no-color               Disable ANSI colors
  --help, -h               Show this help message

Checks: config discovery & rule validation, pgsql-parser availability,
connection, catalog access (pg_policy), audit blind spots (BYPASSRLS),
and whether any tables actually have RLS enabled.
`;

const STATUS_LABEL: Record<DoctorStatus, string> = {
  ok: 'OK  ',
  warn: 'WARN',
  fail: 'FAIL'
};

export default async (
  argv: ParsedArgs,
  _prompter: Inquirerer,
  _options: CLIOptions
): Promise<void> => {
  if (argv.help || argv.h) {
    process.stdout.write(usage);
    return;
  }

  const colorEnabled = argv.color !== false;
  const paint = (status: DoctorStatus, s: string): string => {
    if (!colorEnabled) return s;
    if (status === 'ok') return yanse.green(s);
    if (status === 'warn') return yanse.yellow(s);
    return yanse.bold(yanse.red(s));
  };

  let client: Client | null = buildClient(argv);
  try {
    await client.connect();
  } catch {
    client = null;
  }

  try {
    const report = await doctor(client, configParamsFromArgv(argv));
    for (const check of report.checks) {
      process.stdout.write(
        `[${paint(check.status, STATUS_LABEL[check.status])}] ${check.name.padEnd(12)} ${check.detail}\n`
      );
    }
    process.stdout.write('\n');
    process.stdout.write(report.ok ? 'doctor: all checks passed\n' : 'doctor: some checks failed\n');
    if (!report.ok) process.exit(1);
  } finally {
    if (client) await client.end();
  }
};
