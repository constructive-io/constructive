import {
  dumpCompatibilityWarnings,
  importDumpRows,
  linkTextualDeps,
  loadDumpSource
} from '@pgpmjs/import';
import { Logger } from '@pgpmjs/logger';
import {
  EXPORT_GRANULARITIES,
  ExportGranularity,
  isExportGranularity,
  parsePartitionConfig,
  PartitionConfig,
  PartitionCycleError,
  partitionExportRows
} from '@pgpmjs/transform';
import { cliExitWithError, CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import * as path from 'path';

import { checkOverwrite, writePackage } from '../utils/emit-package';
import {
  hasEmitProjection,
  parseEmitProjectionTargets,
  projectModule,
  STDOUT_TARGET
} from '../utils/module-projections';

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
  --partition <file>      Partition config (JSON: rules/defaultPackage/splitRiders)
                          splitting the import into multiple pgpm packages with
                          derived cross-package requires
  --write                 Allow overwriting an existing module directory
  --emit-sql <file|->      Also project the imported module into a single linear
                          SQL script (- for stdout). Requires a single output
                          package (not supported with --partition).
  --emit-bundle <file>     Also project the imported module into a
                          content-addressed .bundle.tar.gz. Same single-package
                          requirement as --emit-sql.
  --cwd <directory>       Working directory (default: current directory)
  --dry-run               Print the resulting plan/paths without writing

The imported module is the canonical artifact; --emit-sql and --emit-bundle are
pure projections of it (the same machinery pgpm package and pgpm diff use).

Examples:
  pgpm import dump.sql --pkg my-app
  pgpm import dump.sql --pkg my-app --granularity consolidated --naming flat
  pgpm import ./sql-files --pkg my-app --out ./packages --with-data
  pgpm import dump.sql --pkg my-app --partition partition.json
  pgpm import dump.sql --pkg my-app --emit-sql my-app.sql
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

  let partition: PartitionConfig | undefined;
  if (typeof argv.partition === 'string' && argv.partition) {
    try {
      partition = parsePartitionConfig(path.resolve(cwd, argv.partition));
    } catch (err) {
      await cliExitWithError(err instanceof Error ? err.message : String(err));
    }
  }

  const outBase = typeof argv.out === 'string' && argv.out ? path.resolve(cwd, argv.out) : path.resolve(cwd);
  const withData = Boolean(argv['with-data'] ?? argv.withData);
  const write = Boolean(argv.write);
  const dryRun = Boolean(argv['dry-run'] ?? argv.dryRun);
  const emit = parseEmitProjectionTargets(argv, cwd);
  const emitRequested = hasEmitProjection(emit);
  const sqlToStdout = emit.emitSql === STDOUT_TARGET;

  if (emitRequested && dryRun) {
    await cliExitWithError('--emit-sql/--emit-bundle cannot be combined with --dry-run.');
  }

  let source;
  try {
    source = loadDumpSource(path.resolve(cwd, input!));
  } catch (err) {
    await cliExitWithError(err instanceof Error ? err.message : String(err));
    return;
  }

  if (source.files.length > 1 && !sqlToStdout) {
    log.info(`concatenated ${source.files.length} .sql files in sorted order`);
  }

  for (const warning of dumpCompatibilityWarnings(source)) {
    console.warn(`\nWARNING: ${warning}\n`);
  }

  const result = await importDumpRows(source, { granularity, naming, withData });

  let packages: { name: string; requires: string[]; rows: typeof result.rows }[];
  if (partition) {
    try {
      const partitioned = await partitionExportRows(result.rows, partition);
      result.warnings.push(...partitioned.warnings.map(w => `partition: ${w}`));
      packages = partitioned.packages.map(pkg => ({
        name: pkg.name,
        requires: [...result.controlRequires, ...pkg.requires],
        rows: linkTextualDeps(pkg.rows)
      }));
    } catch (err) {
      if (err instanceof PartitionCycleError) {
        await cliExitWithError(`Partition failed: ${err.message}`);
        return;
      }
      throw err;
    }
  } else {
    packages = [{ name: pkgName!, requires: result.controlRequires, rows: result.rows }];
  }

  for (const warning of result.warnings) {
    console.warn(`import: ${warning}`);
  }

  if (dryRun) {
    for (const pkg of packages) {
      console.log(`package ${pkg.name} -> ${path.join(outBase, pkg.name)}`);
      if (pkg.requires.length) {
        console.log(`  requires: ${pkg.requires.join(', ')}`);
      }
      for (const row of pkg.rows) {
        const deps = row.deps?.length ? ` [${row.deps.join(' ')}]` : '';
        console.log(`  ${row.deploy}${deps}`);
      }
    }
  } else {
    if (emitRequested && packages.length !== 1) {
      await cliExitWithError(
        '--emit-sql/--emit-bundle require a single output package; a --partition import emits multiple packages.'
      );
    }
    for (const pkg of packages) {
      const guard = checkOverwrite(path.join(outBase, pkg.name), source.files[0], write);
      if (guard) {
        await cliExitWithError(guard);
      }
    }
    let firstDir: string | undefined;
    for (const pkg of packages) {
      const dir = writePackage(outBase, pkg);
      firstDir ??= dir;
      if (!sqlToStdout) {
        log.success(`wrote ${pkg.rows.length} changes to ${dir}`);
      }
    }
    if (emitRequested && firstDir) {
      await projectModule(firstDir, emit, sqlToStdout ? undefined : msg => log.success(msg));
    }
  }

  const { summary } = result;
  if (!sqlToStdout) {
    log.success(
      `import: ${summary.statements} statement(s) -> ${summary.changes} change(s), ` +
      `${summary.skippedPreamble} preamble skipped, ${summary.skippedData} data skipped, ` +
      `${summary.misc} in misc, ${result.warnings.length} warning(s)`
    );
  }

  prompter.close();
  return argv;
};
