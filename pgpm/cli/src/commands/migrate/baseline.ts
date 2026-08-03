import {
  baselineBackfillEntries,
  loadPlanSideModules,
  PgpmMigrate
} from '@pgpmjs/core';
import { emitLedgerBackfill } from '@pgpmjs/diff';
import { Logger } from '@pgpmjs/logger';
import { writeFileSync } from 'fs';
import { CLIOptions, Inquirerer, ParsedArgs, Question } from 'inquirerer';
import * as path from 'path';
import { getPgEnvOptions } from 'pg-env';

import { getTargetDatabase } from '../../utils/database';

const log = new Logger('migrate-baseline');

const STDOUT_TARGET = '-';

export const baselineUsageText = `
Migrate Baseline Command:

  pgpm migrate baseline [<workspace|module>] [OPTIONS]

  Record a plan's changes as already deployed WITHOUT executing any DDL, so a
  database that already carries the schema (imported from a dump, restored, or
  otherwise adopted from outside pgpm) is brought to the plan's head in the
  pgpm_migrate ledger. A subsequent 'pgpm deploy' then runs only genuinely new
  changes.

  Each change is recorded through the same pgpm_migrate.deploy procedure a real
  deploy uses, with log-only mode (empty script, p_log_only => TRUE), in plan
  order.

Options:
  --help, -h              Show this help message
  --emit-ledger <file|->  Write the log-only backfill SQL instead of applying
                          it (- for stdout). Offline; no database is touched.
                          The target must already have the pgpm_migrate schema
                          (run 'pgpm migrate init' first).
  --database <name>       Database to apply the baseline to (skips the prompt)
  -y, --yes               Skip the confirmation prompt when applying
  --no-tx                 Apply without wrapping each module in a transaction
  --cwd <directory>       Working directory (default: current directory)

Examples:
  pgpm migrate baseline ./my-app --emit-ledger baseline.sql
  pgpm migrate baseline --database mydb
  pgpm migrate baseline ./ws --emit-ledger -
`;

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(baselineUsageText);
    process.exit(0);
  }

  const cwd = (argv.cwd as string) || process.cwd();
  const spec = (argv._ as string[] | undefined)?.filter(Boolean)[0] ?? cwd;

  const modules = await loadPlanSideModules(spec, cwd);
  const entries = await baselineBackfillEntries(modules);

  if (entries.length === 0) {
    log.warn('No plan changes with deploy scripts found; nothing to baseline.');
    return argv;
  }

  const emitTarget = argv['emit-ledger'] ?? argv.emitLedger;

  // Offline emit: write the log-only backfill SQL, touch no database.
  if (typeof emitTarget === 'string' && emitTarget) {
    const sql = emitLedgerBackfill(entries);
    if (emitTarget === STDOUT_TARGET) {
      process.stdout.write(sql);
    } else {
      const outPath = path.resolve(cwd, emitTarget);
      writeFileSync(outPath, sql);
      log.success(`Wrote baseline backfill for ${entries.length} change(s) to ${outPath}`);
    }
    return argv;
  }

  // Apply: record every change log-only against the target database.
  const database = await getTargetDatabase(argv, prompter, {
    message: 'Select database to baseline'
  });

  const { yes } = await prompter.prompt(argv, [
    {
      name: 'yes',
      type: 'confirm',
      message: `Record ${entries.length} change(s) as deployed (log-only) in "${database}"?`,
      required: true
    } as Question
  ]);
  if (!yes) {
    log.info('Operation cancelled.');
    return argv;
  }

  const config = getPgEnvOptions({ database });
  const useTransaction = argv.tx !== false;
  const client = new PgpmMigrate(config);
  try {
    let recorded = 0;
    let skipped = 0;
    for (const mod of modules) {
      const result = await client.deploy({
        modulePath: mod.modulePath,
        logOnly: true,
        useTransaction
      });
      recorded += result.deployed.length;
      skipped += result.skipped.length;
    }
    log.success(
      `Baseline complete in "${database}": ${recorded} change(s) recorded, ${skipped} already present.`
    );
  } finally {
    await client.close();
  }

  return argv;
};
