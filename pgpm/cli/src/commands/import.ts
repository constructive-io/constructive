import {
  EXPORT_GRANULARITIES,
  ExportGranularity,
  importDumpRows,
  isExportGranularity,
  loadDumpSource
} from '@pgpmjs/export';
import { Logger } from '@pgpmjs/logger';
import { CLIOptions, cliExitWithError, Inquirerer, ParsedArgs } from 'inquirerer';
import * as path from 'path';

import { checkOverwrite, writePackage } from '../utils/emit-package';

const log = new Logger('import');

const importUsageText = `
Import Command:

  pgpm import <dump.sql | dir-of-sql-files> --pkg <module-name> [OPTIONS]

  pgpm-itize an arbitrary SQL dump (e.g. pg_dump --schema-only output): parse
  it, classify every statement, and emit a complete deployable pgpm module —
  module dir, pgpm.plan, and deploy/revert/verify trees with spec-derived
  change paths, graph-derived requires, and generated revert/verify scripts.

  Directory inputs concatenate their .sql files in sorted (lexicographic)
  filename order.

  Dump handling:
  - pg_dump preamble noise (SET ..., SELECT set_config(...), psql backslash
    commands) is skipped; COMMENT ON and GRANT statements are kept, attached
    to their host object's change.
  - CREATE EXTENSION statements become .control requires (pgpm owns
    extension creation at deploy time).
  - COPY ... FROM stdin blocks and INSERTs are skipped with a warning unless
    --with-data is passed, which emits them as seed fixture changes (COPY
    data is converted to INSERTs).
  - Statements that classify to no object land in a misc/statements change
    with a warning — never dropped silently.

Options:
  --help, -h              Show this help message
  --pkg <name>            Module name for the generated package (required)
  --granularity <level>   Granularity dial: atomic | object | consolidated
                          (default: object)
  --naming <style>        Change path naming style: directory | flat (default: directory)
  --out <dir>             Output base directory (default: current directory);
                          the module is written to <out>/<pkg>
  --with-data             Import COPY/INSERT data as seed fixture changes
  --write                 Allow overwriting an existing module directory
  --cwd <directory>       Working directory (default: current directory)
  --dry-run               Print the resulting plan/paths without writing

Examples:
  pgpm import dump.sql --pkg my-app
  pgpm import dump.sql --pkg my-app --granularity consolidated --naming flat
  pgpm import ./sql-files --pkg my-app --out ./packages --with-data
`;

const NAMING_STYLES = ['directory', 'flat'] as const;
type NamingStyle = (typeof NAMING_STYLES)[number];

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(importUsageText);
    process.exit(0);
  }

  const cwd = (argv.cwd as string) || process.cwd();

  const input = (argv._ as string[] | undefined)?.filter(Boolean)[0];
  if (!input) {
    await cliExitWithError('Missing input: pgpm import <dump.sql | dir-of-sql-files> --pkg <name>');
  }

  const pkgName = argv.pkg as string | undefined;
  if (!pkgName || typeof pkgName !== 'string') {
    await cliExitWithError('--pkg <module-name> is required.');
  }

  const granularityRaw = argv.granularity ?? 'object';
  if (!isExportGranularity(granularityRaw)) {
    await cliExitWithError(`Invalid --granularity "${granularityRaw}". Expected one of: ${EXPORT_GRANULARITIES.join(', ')}.`);
  }
  const granularity = granularityRaw as ExportGranularity;

  const namingRaw = (argv.naming as string) ?? 'directory';
  if (!(NAMING_STYLES as readonly string[]).includes(namingRaw)) {
    await cliExitWithError(`Invalid --naming "${namingRaw}". Expected one of: ${NAMING_STYLES.join(', ')}.`);
  }
  const naming = namingRaw as NamingStyle;

  const outBase = typeof argv.out === 'string' && argv.out ? path.resolve(cwd, argv.out) : path.resolve(cwd);
  const withData = Boolean(argv['with-data'] ?? argv.withData);
  const write = Boolean(argv.write);
  const dryRun = Boolean(argv['dry-run'] ?? argv.dryRun);

  let source;
  try {
    source = loadDumpSource(path.resolve(cwd, input!));
  } catch (err) {
    await cliExitWithError(err instanceof Error ? err.message : String(err));
    return;
  }

  if (source.files.length > 1) {
    log.info(`concatenated ${source.files.length} .sql files in sorted order`);
  }

  const result = await importDumpRows(source, { granularity, naming, withData });

  for (const warning of result.warnings) {
    console.warn(`import: ${warning}`);
  }

  if (dryRun) {
    console.log(`package ${pkgName} -> ${path.join(outBase, pkgName!)}`);
    if (result.controlRequires.length) {
      console.log(`  requires: ${result.controlRequires.join(', ')}`);
    }
    for (const row of result.rows) {
      const deps = row.deps?.length ? ` [${row.deps.join(' ')}]` : '';
      console.log(`  ${row.deploy}${deps}`);
    }
  } else {
    const targetDir = path.join(outBase, pkgName!);
    const guard = checkOverwrite(targetDir, source.files[0], write);
    if (guard) {
      await cliExitWithError(guard);
    }

    const dir = writePackage(outBase, {
      name: pkgName!,
      requires: result.controlRequires,
      rows: result.rows
    });
    log.success(`wrote ${result.rows.length} changes to ${dir}`);
  }

  const { summary } = result;
  log.success(
    `import: ${summary.statements} statement(s) -> ${summary.changes} change(s), ` +
    `${summary.skippedPreamble} preamble skipped, ${summary.skippedData} data skipped, ` +
    `${summary.misc} in misc, ${result.warnings.length} warning(s)`
  );

  prompter.close();
  return argv;
};
