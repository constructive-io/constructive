import { PgpmMigrate } from '@pgpmjs/core';
import {
  deltaChangesToRows,
  DiffSide,
  loadDiffSideFromDisk,
  sqlToDiffChanges
} from '@pgpmjs/diff';
import { Logger } from '@pgpmjs/logger';
import {
  diffCatalogSnapshots,
  diffChangeSets,
  EXPORT_GRANULARITIES,
  ExportGranularity,
  isExportGranularity,
  loadModule,
  SemanticDiffResult,
  SemanticObjectDiff,
  snapshotCatalog,
  withoutColumnOrder,
  writeModule
} from '@pgpmjs/transform';
import { spawn } from 'child_process';
import * as fs from 'fs';
import { cliExitWithError, CLIOptions, extractFirst, Inquirerer, ParsedArgs } from 'inquirerer';
import * as os from 'os';
import * as path from 'path';
import { getPgPool } from 'pg-cache';
import type { PgConfig } from 'pg-env';
import { getPgEnvOptions, getSpawnEnvWithPg } from 'pg-env';

const log = new Logger('diff');

const diffUsageText = `
Diff Command:

  pgpm diff <A> <B> [OPTIONS]

  Identity-keyed semantic diff between two schema sources. Each side is
  normalized to an object set keyed by identity (kind/schema/name), so the
  same schema authored at different granularity, naming, or partitioning
  diffs as empty. Tables are compared column-by-column and
  constraint-by-constraint, so table changes emit ALTER TABLE, not a rebuild.

Sides:
  <A> / <B> may each be:
    - a pgpm module directory (flattened in plan order)
    - a raw .sql file
    - a live database: a postgres:// connection string, or db:<name>
      (uses PG* env for host/port/user; schema is read via pg_dump)

Options:
  --help, -h               Show this help message
  --emit-migration <dir>   Write the delta as a pgpm module (deploy/revert/
                           verify per change, spec-derived paths, graph-derived
                           requires) into <dir>/<pkg>
  --pkg <name>             Emitted migration package name (default: diff-migration)
  --granularity <level>    Granularity for emitted changes: atomic | object |
                           consolidated (default: object)
  --naming <style>         Change path naming style: directory | flat (default: directory)
  --json                   Machine-readable output
  --verify                 Oracle mode: deploy A plus the emitted migration into
                           a scratch database and assert catalog equivalence
                           with B deployed fresh
  --cwd <directory>        Working directory (default: current directory)

Exit status: 0 when the sides are identical or the diff succeeds; non-zero on
error or when --verify finds the migrated catalog differs from B.

Examples:
  pgpm diff ./v1-module ./v2-module
  pgpm diff ./v1-module ./schema-v2.sql --json
  pgpm diff db:app_v1 db:app_v2 --emit-migration ./out --verify
`;

const NAMING_STYLES = ['directory', 'flat'] as const;
type NamingStyle = (typeof NAMING_STYLES)[number];

/** pg_dump a side's schema: `db:<name>` uses PG* env; DSNs pass through. */
const dumpDatabase = async (spec: string): Promise<string> => {
  const args = ['--schema-only', '--no-owner'];
  let env = process.env;
  if (spec.startsWith('db:')) {
    const config = getPgEnvOptions({ database: spec.slice(3) });
    env = getSpawnEnvWithPg(config);
  } else {
    args.push('--dbname', spec);
  }
  return new Promise<string>((resolve, reject) => {
    const child = spawn('pg_dump', args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });
    child.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'ENOENT') {
        reject(new Error('pg_dump not found; ensure PostgreSQL client tools are installed and in PATH'));
        return;
      }
      reject(e);
    });
    child.on('close', code => {
      if (code === 0) resolve(out);
      else reject(new Error(`pg_dump exited with code ${code}: ${err.trim()}`));
    });
  });
};

/** Resolve one side spec into diff input changes. */
const loadSide = async (spec: string, cwd: string): Promise<DiffSide> => {
  if (resolveDiffSideKindSafe(spec) === 'database') {
    const label = spec.startsWith('db:') ? spec.slice(3) : spec;
    return {
      kind: 'database',
      label,
      changes: sqlToDiffChanges(await dumpDatabase(spec), label),
      warnings: []
    };
  }
  return loadDiffSideFromDisk(path.resolve(cwd, spec));
};

/** `resolveDiffSideKind` without throwing on relative on-disk paths. */
const resolveDiffSideKindSafe = (spec: string): 'database' | 'disk' =>
  /^postgres(ql)?:\/\//.test(spec) || spec.startsWith('db:') ? 'database' : 'disk';

const createScratchDb = async (config: PgConfig, dbName: string): Promise<void> => {
  const adminPool = getPgPool({ ...config, database: 'postgres' });
  await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await adminPool.query(`CREATE DATABASE "${dbName}"`);
};

const dropScratchDb = async (config: PgConfig, dbName: string): Promise<void> => {
  const adminPool = getPgPool({ ...config, database: 'postgres' });
  await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
};

/** Apply one diff side into a scratch database (module deploy or raw SQL). */
const applySide = async (config: PgConfig, side: DiffSide, spec: string, cwd: string): Promise<void> => {
  if (side.kind === 'module') {
    const client = new PgpmMigrate(config);
    const result = await client.deploy({ modulePath: path.resolve(cwd, spec) });
    if (result.failed) {
      throw new Error(`deploy failed at change ${result.failed} (module ${spec})`);
    }
    return;
  }
  const pool = getPgPool(config);
  const sql = side.changes.map(c => c.deploy).filter(Boolean).join('\n\n');
  if (sql.trim()) await pool.query(sql);
};

/**
 * Oracle mode: deploy A into a scratch database, deploy the emitted
 * migration module on top, and assert catalog equivalence with B deployed
 * fresh into a second scratch database.
 */
const runVerify = async (
  sideA: DiffSide,
  sideB: DiffSide,
  specA: string,
  specB: string,
  migrationDir: string,
  cwd: string
): Promise<string[]> => {
  const config = getPgEnvOptions();
  const stamp = Date.now();
  const dbMigrated = `pgpm_diff_verify_a_${stamp}`;
  const dbTarget = `pgpm_diff_verify_b_${stamp}`;

  try {
    await createScratchDb(config, dbMigrated);
    await createScratchDb(config, dbTarget);

    await applySide({ ...config, database: dbMigrated }, sideA, specA, cwd);
    const client = new PgpmMigrate({ ...config, database: dbMigrated });
    const result = await client.deploy({ modulePath: migrationDir });
    if (result.failed) {
      throw new Error(`migration deploy failed at change ${result.failed}`);
    }

    await applySide({ ...config, database: dbTarget }, sideB, specB, cwd);

    const snapMigrated = await snapshotCatalog(getPgPool({ ...config, database: dbMigrated }));
    const snapTarget = await snapshotCatalog(getPgPool({ ...config, database: dbTarget }));
    // Column order is physical: a drop+add migration cannot reproduce a fresh
    // deploy's ordinals, so equivalence is checked order-insensitively.
    return diffCatalogSnapshots(withoutColumnOrder(snapMigrated), withoutColumnOrder(snapTarget));
  } finally {
    try {
      await dropScratchDb(config, dbMigrated);
      await dropScratchDb(config, dbTarget);
    } catch (err) {
      log.warn(`failed to drop scratch databases: ${err instanceof Error ? err.message : err}`);
    }
  }
};

const printSummary = (result: SemanticDiffResult, labelA: string, labelB: string): void => {
  if (result.identical) {
    console.log(`No differences: ${labelA} and ${labelB} describe the same objects.`);
    return;
  }
  const byDelta = (delta: SemanticObjectDiff['delta']): SemanticObjectDiff[] =>
    result.objects.filter(o => o.delta === delta);
  const section = (title: string, objects: SemanticObjectDiff[]): void => {
    if (objects.length === 0) return;
    console.log(`${title} (${objects.length}):`);
    for (const obj of objects) {
      const detail: string[] = [];
      if (obj.columnsAdded?.length) detail.push(`+cols: ${obj.columnsAdded.join(', ')}`);
      if (obj.columnsRemoved?.length) detail.push(`-cols: ${obj.columnsRemoved.join(', ')}`);
      if (obj.columnsModified?.length) detail.push(`~cols: ${obj.columnsModified.join(', ')}`);
      console.log(`  ${obj.identity.kind} ${obj.path}${detail.length ? ` (${detail.join('; ')})` : ''}`);
    }
  };
  section('Added', byDelta('added'));
  section('Removed', byDelta('removed'));
  section('Changed', byDelta('modified'));
  console.log(`${result.changes.length} migration change(s) derivable.`);
};

export default async (
  argv: Partial<ParsedArgs>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(diffUsageText);
    process.exit(0);
  }

  const { first: specA, newArgv } = extractFirst(argv);
  const { first: specB, newArgv: restArgv } = extractFirst(newArgv);
  argv = restArgv;
  if (!specA || !specB) {
    await cliExitWithError('pgpm diff requires two sides: pgpm diff <A> <B> (module dir, .sql file, db:<name>, or connection string).');
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

  const cwd = (argv.cwd as string) || process.cwd();
  const json = Boolean(argv.json);
  const verify = Boolean(argv.verify);
  const emitRaw = argv['emit-migration'] ?? argv.emitMigration;
  const emitMigration = typeof emitRaw === 'string' && emitRaw
    ? path.resolve(cwd, emitRaw)
    : undefined;
  const pkgName = (argv.pkg as string) || 'diff-migration';

  await loadModule();

  let sideA: DiffSide;
  let sideB: DiffSide;
  try {
    sideA = await loadSide(specA, cwd);
    sideB = await loadSide(specB, cwd);
  } catch (err) {
    await cliExitWithError(err instanceof Error ? err.message : String(err));
    return;
  }

  const result = diffChangeSets(sideA.changes, sideB.changes, { granularity, style: naming });
  const warnings = [
    ...sideA.warnings.map(w => `${sideA.label}: ${w}`),
    ...sideB.warnings.map(w => `${sideB.label}: ${w}`),
    ...result.warnings
  ];

  if (json) {
    console.log(JSON.stringify({
      identical: result.identical,
      objects: result.objects,
      changes: result.changes.map(c => ({
        name: c.name,
        dependencies: c.dependencies,
        deploy: c.deploy,
        revert: c.revert,
        verify: c.verify
      })),
      warnings
    }, null, 2));
  } else {
    for (const warning of warnings) console.warn(`diff: ${warning}`);
    printSummary(result, sideA.label, sideB.label);
  }

  let migrationDir: string | undefined;
  if (emitMigration || (verify && !result.identical)) {
    const outBase = emitMigration ?? fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-diff-'));
    const rows = deltaChangesToRows(result.changes);
    if (rows.length === 0) {
      log.info('no migration changes to emit (sides are identical).');
    } else {
      migrationDir = writeModule(outBase, { name: pkgName, requires: [], rows });
      if (emitMigration) log.success(`wrote ${rows.length} migration change(s) to ${migrationDir}`);
    }
  }

  if (verify) {
    log.info('running --verify: deploying A plus the migration and B into scratch databases...');
    const diffs = await runVerifyOrEquivalence(sideA, sideB, specA, specB, migrationDir, cwd);
    if (diffs.length) {
      console.error(`--verify failed: catalogs differ (${diffs.length} differences):`);
      for (const diff of diffs) console.error(`  ${diff}`);
      await cliExitWithError('Migrated catalog does not match the target.');
    }
    log.success('--verify passed: migrated catalog is structurally equivalent to the target.');
  }

  prompter.close();
  return argv;
};

/** `runVerify`, tolerating an empty delta (no migration module to deploy). */
const runVerifyOrEquivalence = async (
  sideA: DiffSide,
  sideB: DiffSide,
  specA: string,
  specB: string,
  migrationDir: string | undefined,
  cwd: string
): Promise<string[]> => {
  if (migrationDir) return runVerify(sideA, sideB, specA, specB, migrationDir, cwd);
  const config = getPgEnvOptions();
  const stamp = Date.now();
  const dbA = `pgpm_diff_verify_a_${stamp}`;
  const dbB = `pgpm_diff_verify_b_${stamp}`;
  try {
    await createScratchDb(config, dbA);
    await createScratchDb(config, dbB);
    await applySide({ ...config, database: dbA }, sideA, specA, cwd);
    await applySide({ ...config, database: dbB }, sideB, specB, cwd);
    const snapA = await snapshotCatalog(getPgPool({ ...config, database: dbA }));
    const snapB = await snapshotCatalog(getPgPool({ ...config, database: dbB }));
    return diffCatalogSnapshots(withoutColumnOrder(snapA), withoutColumnOrder(snapB));
  } finally {
    try {
      await dropScratchDb(config, dbA);
      await dropScratchDb(config, dbB);
    } catch (err) {
      log.warn(`failed to drop scratch databases: ${err instanceof Error ? err.message : err}`);
    }
  }
};
