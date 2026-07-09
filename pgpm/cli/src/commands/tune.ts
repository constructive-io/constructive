import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer } from 'inquirerer';
import { getPgPool } from 'pg-cache';

const log = new Logger('tune');

const tuneUsageText = `
Tune Command:

  pgpm tune [OPTIONS]

  Tune PostgreSQL for throwaway environments (CI, local dev, test containers).
  Disables durability guarantees to eliminate checkpoint/fsync I/O stalls,
  which can make DDL-heavy workloads (e.g. provisioning) dramatically faster
  and more reliable on slow disks.

  Applies via ALTER SYSTEM + pg_reload_conf() (no restart required):

    fsync = off
    synchronous_commit = off
    full_page_writes = off
    checkpoint_timeout = 30min
    max_wal_size = 8GB

  WARNING: These settings can cause data loss or corruption on crash.
  Only use against disposable databases — never production.

Options:
  --help, -h              Show this help message
  --yes                   Skip confirmation prompt
  --reset                 Restore all settings above to server defaults

Examples:
  pgpm tune --yes         Tune a CI/test database (non-interactive)
  pgpm tune --reset --yes Restore default durability settings
`;

const TUNE_SETTINGS: Record<string, string> = {
  fsync: 'off',
  synchronous_commit: 'off',
  full_page_writes: 'off',
  checkpoint_timeout: '30min',
  max_wal_size: '8GB'
};

export default async (
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(tuneUsageText);
    process.exit(0);
  }

  const reset = argv.reset === true;

  const { yes } = await prompter.prompt(argv, [
    {
      type: 'confirm',
      name: 'yes',
      message: reset
        ? 'Restore PostgreSQL durability settings to server defaults?'
        : 'Disable PostgreSQL durability? This risks data loss on crash and must never be used in production.',
      default: false
    }
  ]);

  if (!yes) {
    log.info('Operation cancelled.');
    return;
  }

  const db = await getPgPool({
    database: 'postgres'
  });

  for (const [setting, value] of Object.entries(TUNE_SETTINGS)) {
    if (reset) {
      await db.query(`ALTER SYSTEM RESET ${setting};`);
      log.info(`reset ${setting}`);
    } else {
      await db.query(`ALTER SYSTEM SET ${setting} = '${value}';`);
      log.info(`set ${setting} = ${value}`);
    }
  }

  await db.query('SELECT pg_reload_conf();');

  log.success(
    reset
      ? 'PostgreSQL durability settings restored to defaults.'
      : 'PostgreSQL tuned for throwaway environments (durability disabled).'
  );
};
