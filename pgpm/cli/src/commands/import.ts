import { PgpmRow } from '@pgpmjs/core';
import {
  EXPORT_GRANULARITIES,
  ExportGranularity,
  isExportGranularity,
  loadDumpSource,
  parsePartitionConfig,
  PartitionConfig,
  PartitionedPackageRows,
  partitionExportRows,
  restructureExportRows
} from '@pgpmjs/export';
import { Logger } from '@pgpmjs/logger';
import { PartitionCycleError } from '@pgpmjs/transform';
import { CLIOptions, cliExitWithError, Inquirerer, ParsedArgs } from 'inquirerer';
import * as path from 'path';

import { checkOverwrite, writePackage } from './transform';

const log = new Logger('import');

const importUsageText = `
Import Command:

  pgpm import <dump.sql> --granularity <atomic|object|consolidated> [OPTIONS]

  pgpm-itize a SQL dump (pg_dump plain format or any plain SQL file) through
  the dials pipeline: psql meta-commands and session/ownership noise are
  stripped, then the statements are re-projected at the requested granularity
  with spec-derived change paths, graph-derived requires, and generated
  revert/verify scripts — emitting a complete pgpm module.

Options:
  --help, -h              Show this help message
  --granularity <level>   Target granularity: atomic | object | consolidated (required)
  --name <module>         Module name (default: dump file name without extension)
  --partition <file>      Partition config (JSON: rules/defaultPackage/splitRiders)
                          splitting the import into multiple pgpm packages with
                          derived cross-package requires.
  --naming <style>        Change path naming style: directory | flat (default: directory)
  --cwd <directory>       Base directory (default: current directory)
  --out <dir>             Output directory the module dir is created in (default: --cwd)
  --write                 Allow writing over an existing output directory
  --dry-run               Print the resulting plan/paths without writing

Examples:
  pg_dump --schema-only mydb > mydb.sql
  pgpm import mydb.sql --granularity object
  pgpm import mydb.sql --granularity consolidated --name my-module --out ./packages
  pgpm import mydb.sql --granularity object --partition partition.json
`;

const NAMING_STYLES = ['directory', 'flat'] as const;
type NamingStyle = (typeof NAMING_STYLES)[number];

interface ImportedDump {
  name: string;
  outBase: string;
  packages: PartitionedPackageRows[];
  warnings: string[];
}

const importDump = async (
  dumpFile: string,
  name: string | undefined,
  granularity: ExportGranularity,
  naming: NamingStyle,
  partition: PartitionConfig | undefined,
  outBase: string
): Promise<ImportedDump> => {
  const source = loadDumpSource(dumpFile, name);
  const warnings = [...source.warnings];

  const rows: PgpmRow[] = [
    {
      name: source.name,
      deploy: source.name,
      deps: [],
      content: source.sql
    }
  ];

  const restructured = await restructureExportRows(rows, granularity, { naming });
  warnings.push(...restructured.warnings.map(w => `restructure (${granularity}): ${w}`));

  let packages: PartitionedPackageRows[];
  if (partition) {
    const result = await partitionExportRows(restructured.rows, partition);
    warnings.push(...result.warnings.map(w => `partition: ${w}`));
    packages = result.packages;
  } else {
    packages = [{ name: source.name, requires: [], rows: restructured.rows }];
  }

  return { name: source.name, outBase, packages, warnings };
};

const printDryRun = (imported: ImportedDump): void => {
  for (const pkg of imported.packages) {
    console.log(`  package ${pkg.name} -> ${path.join(imported.outBase, pkg.name)}`);
    for (const row of pkg.rows) {
      const deps = row.deps?.length ? ` [${row.deps.join(' ')}]` : '';
      console.log(`    ${row.deploy}${deps}`);
    }
  }
};

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(importUsageText);
    process.exit(0);
  }

  const dumpFile = argv._?.[0] as string | undefined;
  if (!dumpFile) {
    await cliExitWithError('Usage: pgpm import <dump.sql> --granularity <atomic|object|consolidated>');
    return;
  }

  const granularityRaw = argv.granularity;
  if (granularityRaw === undefined) {
    await cliExitWithError(`--granularity is required. Expected one of: ${EXPORT_GRANULARITIES.join(', ')}.`);
  }
  if (!isExportGranularity(granularityRaw)) {
    await cliExitWithError(`Invalid --granularity "${granularityRaw}". Expected one of: ${EXPORT_GRANULARITIES.join(', ')}.`);
  }
  const granularity = granularityRaw as ExportGranularity;

  const namingRaw = (argv.naming as string) ?? 'directory';
  if (!(NAMING_STYLES as readonly string[]).includes(namingRaw)) {
    await cliExitWithError(`Invalid --naming "${namingRaw}". Expected one of: ${NAMING_STYLES.join(', ')}.`);
  }
  const naming = namingRaw as NamingStyle;

  const cwd = (argv.cwd as string) || process.cwd();

  let partition: PartitionConfig | undefined;
  if (typeof argv.partition === 'string' && argv.partition) {
    try {
      partition = parsePartitionConfig(path.resolve(cwd, argv.partition));
    } catch (err) {
      await cliExitWithError(err instanceof Error ? err.message : String(err));
    }
  }

  const name = typeof argv.name === 'string' && argv.name ? argv.name : undefined;
  const outBase = typeof argv.out === 'string' && argv.out ? path.resolve(cwd, argv.out) : path.resolve(cwd);
  const write = Boolean(argv.write);
  const dryRun = Boolean(argv['dry-run'] ?? argv.dryRun);

  let imported: ImportedDump;
  try {
    imported = await importDump(path.resolve(cwd, dumpFile), name, granularity, naming, partition, outBase);
  } catch (err) {
    if (err instanceof PartitionCycleError) {
      await cliExitWithError(`Partition failed: ${err.message}`);
      return;
    }
    await cliExitWithError(err instanceof Error ? err.message : String(err));
    return;
  }

  for (const warning of imported.warnings) {
    console.warn(`import: ${warning}`);
  }

  if (dryRun) {
    printDryRun(imported);
    prompter.close();
    return argv;
  }

  for (const pkg of imported.packages) {
    const targetDir = path.join(imported.outBase, pkg.name);
    const guard = checkOverwrite(targetDir, path.resolve(cwd, dumpFile), write);
    if (guard) {
      await cliExitWithError(guard);
    }
  }

  for (const pkg of imported.packages) {
    const dir = writePackage(imported.outBase, pkg, []);
    log.success(`wrote ${pkg.rows.length} changes to ${dir}`);
  }

  prompter.close();
  return argv;
};
