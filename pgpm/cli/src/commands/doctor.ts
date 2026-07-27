import { spawn } from 'child_process';
import { CLIOptions, Inquirerer } from 'inquirerer';
import { getPgEnvOptions, getSpawnEnvWithPg } from 'pg-env';

import {
  checkDocker,
  checkDockerCompose,
  checkNode,
  checkPsql,
  CheckResult,
  detectPlatform,
  runCommand,
  summarizeChecks
} from '../utils/doctor';

const doctorUsageText = `
Doctor Command:

  pgpm doctor [OPTIONS]

  Check that your machine has the dependencies pgpm needs
  (Node.js, Docker, psql) and report OS-specific installation
  guidance for anything that is missing.

Options:
  --db               Also check PostgreSQL connectivity using the current environment
  --json             Output results as JSON
  --help, -h         Show this help message

Exit Codes:
  0                  All checks passed (warnings allowed)
  1                  One or more checks failed

Examples:
  pgpm doctor                Check node, docker, docker compose, and psql
  pgpm doctor --db           Also verify a PostgreSQL connection
  pgpm doctor --json         Machine-readable output (for CI)
`;

const STATUS_ICONS: Record<CheckResult['status'], string> = {
  pass: '✅',
  warn: '⚠️ ',
  fail: '❌'
};

async function checkDatabaseConnectivity(): Promise<CheckResult> {
  const pg = getPgEnvOptions();
  const target = `${pg.host}:${pg.port}/${pg.database} (user: ${pg.user})`;
  const result = await new Promise<{ code: number; stderr: string }>((resolve) => {
    const child = spawn('psql', ['-X', '-A', '-t', '-c', 'SELECT 1'], {
      stdio: 'pipe',
      env: getSpawnEnvWithPg(pg)
    });
    let stderr = '';
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('error', () => resolve({ code: 127, stderr: 'psql: command not found' }));
    child.on('close', (code) => resolve({ code: code ?? 0, stderr: stderr.trim() }));
  });

  if (result.code === 0) {
    return {
      name: 'database',
      status: 'pass',
      message: `connected to PostgreSQL at ${target}`
    };
  }
  return {
    name: 'database',
    status: 'fail',
    message: `could not connect to PostgreSQL at ${target}: ${result.stderr}`,
    remediation: 'Start a local PostgreSQL with `pgpm docker start`, or point PGHOST/PGPORT/PGUSER/PGPASSWORD at a running server (see `pgpm env`).'
  };
}

function printResults(results: CheckResult[]): void {
  console.log('');
  for (const result of results) {
    console.log(`  ${STATUS_ICONS[result.status]} ${result.name.padEnd(16)} ${result.message}`);
    if (result.remediation && result.status !== 'pass') {
      console.log(`     ↳ ${result.remediation}`);
    }
  }
  const { failed, warned, passed } = summarizeChecks(results);
  console.log('');
  console.log(`  ${passed} passed, ${warned} warning(s), ${failed} failed`);
  console.log('');
}

export default async (
  argv: Partial<Record<string, any>>,
  _prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(doctorUsageText);
    process.exit(0);
  }

  const platformInfo = detectPlatform();

  const results: CheckResult[] = [
    checkNode(),
    await checkDocker(platformInfo, runCommand),
    await checkDockerCompose(platformInfo, runCommand),
    await checkPsql(platformInfo, runCommand)
  ];

  if (argv.db === true) {
    results.push(await checkDatabaseConnectivity());
  }

  if (argv.json === true) {
    const { failed, warned, passed } = summarizeChecks(results);
    console.log(JSON.stringify({
      platform: platformInfo,
      checks: results,
      summary: { passed, warned, failed }
    }, null, 2));
  } else {
    printResults(results);
  }

  const { failed } = summarizeChecks(results);
  if (failed > 0) {
    process.exit(1);
  }
};
