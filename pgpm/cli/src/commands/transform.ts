import { PgpmMigrate, PgpmPackage, PgpmRow } from '@pgpmjs/core';
import {
  diffCatalogSnapshots,
  EXPORT_GRANULARITIES,
  ExportGranularity,
  isExportGranularity,
  loadModuleSource,
  parsePartitionConfig,
  PartitionConfig,
  partitionExportRows,
  PartitionedPackageRows,
  restructureExportRows,
  snapshotCatalog
} from '@pgpmjs/export';
import { Logger } from '@pgpmjs/logger';
import { PartitionCycleError } from '@pgpmjs/transform';
import * as fs from 'fs';
import { CLIOptions, cliExitWithError, Inquirerer, ParsedArgs } from 'inquirerer';
import * as path from 'path';
import { getPgPool } from 'pg-cache';
import type { PgConfig } from 'pg-env';
import { getPgEnvOptions } from 'pg-env';

import { checkOverwrite, writePackage } from '../utils/emit-package';

export { checkOverwrite } from '../utils/emit-package';

const log = new Logger('transform');

const transformUsageText = `
Transform Command:

  pgpm transform --granularity <atomic|object|consolidated> [OPTIONS]

  Re-dial an existing pgpm module (or every module in a workspace) through the
  dials pipeline: flatten the deploy scripts in plan order, re-project them at
  the requested granularity with spec-derived change paths, graph-derived
  requires, and generated revert/verify scripts.

Options:
  --help, -h              Show this help message
  --granularity <level>   Target granularity: atomic | object | consolidated (required)
  --partition <file>      Partition config (JSON: rules/defaultPackage/splitRiders)
                          splitting the module into multiple pgpm packages with
                          derived cross-package requires.
  --naming <style>        Change path naming style: directory | flat (default: directory)
  --cwd <directory>       Module or workspace directory (default: current directory)
  --out <dir>             Output directory (default: sibling <module>-<granularity>)
  --write                 Allow writing over an existing/module directory
  --check                 Deploy original and transformed output into scratch
                          databases and assert the catalogs are equivalent
  --dry-run               Print the resulting plan/paths without writing

Examples:
  pgpm transform --granularity object
  pgpm transform --granularity atomic --naming flat --out ./out
  pgpm transform --granularity object --partition partition.json --check
`;

const NAMING_STYLES = ['directory', 'flat'] as const;
type NamingStyle = (typeof NAMING_STYLES)[number];

interface TransformedModule {
  /** Source module directory. */
  modulePath: string;
  /** Module (project) name. */
  name: string;
  /** Base directory the output package dir(s) are created in. */
  outBase: string;
  /** Packages to write: one for plain transforms, N when partitioned. */
  packages: PartitionedPackageRows[];
  warnings: string[];
}

/**
 * Resolve the base directory package dir(s) are created in. Without --out,
 * packages are written as siblings of the source module — a plain transform
 * of `my-mod` at granularity `object` lands in `../my-mod-object`.
 */
export const resolveOutBase = (modulePath: string, out?: string): string => {
  if (out) return path.resolve(out);
  return path.dirname(modulePath);
};

/** Order partition packages so prerequisites come before dependents. */
export const orderPackages = (packages: PartitionedPackageRows[]): PartitionedPackageRows[] => {
  const byName = new Map(packages.map(pkg => [pkg.name, pkg]));
  const ordered: PartitionedPackageRows[] = [];
  const seen = new Set<string>();
  const visit = (pkg: PartitionedPackageRows): void => {
    if (seen.has(pkg.name)) return;
    seen.add(pkg.name);
    for (const req of pkg.requires) {
      const dep = byName.get(req);
      if (dep) visit(dep);
    }
    ordered.push(pkg);
  };
  for (const pkg of packages) visit(pkg);
  return ordered;
};

const readControlRequires = (modulePath: string, name: string): string[] => {
  const controlPath = path.join(modulePath, `${name}.control`);
  if (!fs.existsSync(controlPath)) return [];
  const match = fs.readFileSync(controlPath, 'utf-8').match(/^requires\s*=\s*'([^']*)'\s*$/m);
  if (!match) return [];
  return match[1].split(',').map(s => s.trim()).filter(Boolean);
};

const createScratchDb = async (config: PgConfig, dbName: string): Promise<void> => {
  const adminPool = getPgPool({ ...config, database: 'postgres' });
  await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await adminPool.query(`CREATE DATABASE "${dbName}"`);
};

const dropScratchDb = async (config: PgConfig, dbName: string): Promise<void> => {
  const adminPool = getPgPool({ ...config, database: 'postgres' });
  await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
};

const deployModules = async (config: PgConfig, modulePaths: string[]): Promise<void> => {
  const client = new PgpmMigrate(config);
  for (const modulePath of modulePaths) {
    const result = await client.deploy({ modulePath });
    if (result.failed) {
      throw new Error(`deploy failed at change ${result.failed} (module ${modulePath})`);
    }
  }
};

/**
 * Prove the transform is structurally lossless: deploy the original module and
 * the transformed package(s) into two scratch databases and compare catalogs.
 */
const runCheck = async (transformed: TransformedModule): Promise<string[]> => {
  const config = getPgEnvOptions();
  const stamp = Date.now();
  const dbOriginal = `pgpm_transform_check_a_${stamp}`;
  const dbTransformed = `pgpm_transform_check_b_${stamp}`;

  try {
    await createScratchDb(config, dbOriginal);
    await createScratchDb(config, dbTransformed);

    await deployModules({ ...config, database: dbOriginal }, [transformed.modulePath]);

    const orderedDirs = orderPackages(transformed.packages).map(pkg =>
      path.join(transformed.outBase, pkg.name)
    );
    await deployModules({ ...config, database: dbTransformed }, orderedDirs);

    const poolOriginal = getPgPool({ ...config, database: dbOriginal });
    const poolTransformed = getPgPool({ ...config, database: dbTransformed });
    const snapOriginal = await snapshotCatalog(poolOriginal);
    const snapTransformed = await snapshotCatalog(poolTransformed);
    return diffCatalogSnapshots(snapOriginal, snapTransformed);
  } finally {
    try {
      await dropScratchDb(config, dbOriginal);
      await dropScratchDb(config, dbTransformed);
    } catch (err) {
      log.warn(`failed to drop scratch databases: ${err instanceof Error ? err.message : err}`);
    }
  }
};

const transformModule = async (
  modulePath: string,
  granularity: ExportGranularity,
  naming: NamingStyle,
  partition: PartitionConfig | undefined,
  out: string | undefined
): Promise<TransformedModule> => {
  const source = loadModuleSource(modulePath);
  const warnings = [...source.warnings];

  const rows: PgpmRow[] = source.changes.map(change => ({
    name: change.name,
    deploy: change.name,
    deps: change.dependencies,
    content: change.deploy
  }));

  const restructured = await restructureExportRows(rows, granularity, { naming });
  warnings.push(...restructured.warnings.map(w => `restructure (${granularity}): ${w}`));

  const outBase = resolveOutBase(modulePath, out);

  let packages: PartitionedPackageRows[];
  if (partition) {
    const result = await partitionExportRows(restructured.rows, partition);
    warnings.push(...result.warnings.map(w => `partition: ${w}`));
    packages = result.packages;
  } else {
    // Distinct package name so the output can live beside the source module
    // in the same workspace without colliding.
    packages = [{ name: `${source.name}-${granularity}`, requires: [], rows: restructured.rows }];
  }

  return { modulePath, name: source.name, outBase, packages, warnings };
};

const printDryRun = (transformed: TransformedModule): void => {
  console.log(`module ${transformed.name} (${transformed.modulePath})`);
  for (const pkg of transformed.packages) {
    console.log(`  package ${pkg.name} -> ${path.join(transformed.outBase, pkg.name)}`);
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
    console.log(transformUsageText);
    process.exit(0);
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

  const out = typeof argv.out === 'string' && argv.out ? path.resolve(cwd, argv.out) : undefined;
  const write = Boolean(argv.write);
  const check = Boolean(argv.check);
  const dryRun = Boolean(argv['dry-run'] ?? argv.dryRun);

  const pkg = new PgpmPackage(path.resolve(cwd));

  let modulePaths: string[];
  if (pkg.isInModule()) {
    modulePaths = [pkg.modulePath!];
  } else if (pkg.workspacePath) {
    const moduleMap = pkg.getModuleMap();
    modulePaths = Object.values(moduleMap).map(mod =>
      path.resolve(pkg.workspacePath!, mod.path)
    );
    if (modulePaths.length === 0) {
      await cliExitWithError('No modules found in workspace.');
    }
    if (out && modulePaths.length > 1) {
      await cliExitWithError('--out is not supported when transforming a multi-module workspace.');
    }
  } else {
    await cliExitWithError('Not inside a pgpm module or workspace (pass --cwd <dir>).');
    return;
  }

  for (const modulePath of modulePaths) {
    let transformed: TransformedModule;
    try {
      transformed = await transformModule(modulePath, granularity, naming, partition, out);
    } catch (err) {
      if (err instanceof PartitionCycleError) {
        await cliExitWithError(`Partition failed: ${err.message}`);
        return;
      }
      throw err;
    }

    for (const warning of transformed.warnings) {
      console.warn(`transform: ${warning}`);
    }

    if (dryRun) {
      printDryRun(transformed);
      continue;
    }

    for (const pkgRows of transformed.packages) {
      const targetDir = path.join(transformed.outBase, pkgRows.name);
      const guard = checkOverwrite(targetDir, modulePath, write);
      if (guard) {
        await cliExitWithError(guard);
      }
    }

    const sourceRequires = readControlRequires(modulePath, transformed.name);
    for (const pkgRows of transformed.packages) {
      const dir = writePackage(transformed.outBase, pkgRows, sourceRequires);
      log.success(`wrote ${pkgRows.rows.length} changes to ${dir}`);
    }

    if (check) {
      log.info('running --check: deploying original and transformed output to scratch databases...');
      const diffs = await runCheck(transformed);
      if (diffs.length) {
        console.error(`--check failed: catalogs differ (${diffs.length} differences):`);
        for (const diff of diffs) console.error(`  ${diff}`);
        await cliExitWithError('Transform is not structurally lossless.');
      }
      log.success('--check passed: catalogs are structurally equivalent.');
    }
  }

  prompter.close();
  return argv;
};
