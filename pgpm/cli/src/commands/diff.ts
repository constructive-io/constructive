import { PgpmMigrate } from '@pgpmjs/core';
import {
  classifyAgainstLedger,
  deltaChangesToRows,
  DiffSide,
  emitLedgerBackfill,
  LedgerClassification,
  loadDiffSideFromDisk,
  sqlToDiffChanges
} from '@pgpmjs/diff';
import { Logger } from '@pgpmjs/logger';
import {
  appendModule,
  CHANGE_GRANULARITIES,
  ChangeCoverage,
  ChangeGranularity,
  coverChanges,
  diffChangeSets,
  EXPORT_GRANULARITIES,
  ExportGranularity,
  isChangeGranularity,
  isExportGranularity,
  loadModule,
  loadModuleSource,
  SemanticDiffResult,
  SemanticObjectDiff,
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

import { loadLedger, loadWorkspaceModules, loadWorkspaceSide, planChangeRefs } from '../utils/diff-sides';
import { emitModuleBundle, emitModuleSql, STDOUT_TARGET } from '../utils/module-projections';
import { catalogDifferences, withScratchDatabases } from '../utils/scratch-db';

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
    - a pgpm workspace directory (every local module, in dependency order,
      with package-qualified change names)
    - a raw .sql file
    - a live database: a postgres:// connection string, or db:<name>
      (uses PG* env for host/port/user; schema is read via pg_dump)

The delta is one model; every --emit-* flag is a projection of it, so they
compose (a single run can emit a module, a linear SQL file, and a bundle).

Options:
  --help, -h               Show this help message
  --emit-migration <dir>   Write the delta as a pgpm module (deploy/revert/
                           verify per change, spec-derived paths, graph-derived
                           requires) into <dir>/<pkg>
  --emit-module <dir>      Alias of --emit-migration
  --append-module <dir>    Append the delta into an EXISTING pgpm module at
                           <dir> (new changes only; existing changes, scripts,
                           and .control are left untouched). Standalone: not
                           combinable with --emit-*/--verify.
  --emit-sql <file|->      Also project the delta to a single consolidated SQL
                           file (deparsed in plan order); - writes to stdout
  --emit-bundle <file>     Also project the delta to a content-addressed
                           .bundle.tar.gz archive
  --ledger <db>            Read a database's pgpm_migrate ledger (db:<name> or a
                           connection string) as the deployment cursor for side
                           B, and report which of B's plan entries that database
                           already has (identical / drifted / pending / orphaned
                           / out-of-order). Combines with --emit-ledger.
  --emit-ledger <file>     Write an idempotent pgpm_migrate backfill script that
                           records B's already-satisfied changes without
                           executing them. Satisfaction is semantic (identity-
                           keyed against side A), so regenerated or reordered
                           plans still classify as satisfied.
  --pkg <name>             Emitted migration package name (default: diff-migration)
  --granularity <level>    Granularity for emitted changes: atomic | object |
                           consolidated (default: object)
  --change-granularity <level>
                           Change-level distribution for emitted changes:
                           alteration | object | single (default: object)
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
  pgpm diff db:prod ./workspace-v2 --ledger db:prod --emit-ledger ./backfill.sql \
           --emit-migration ./out --pkg upgrade
`;

const NAMING_STYLES = ['directory', 'flat'] as const;
type NamingStyle = (typeof NAMING_STYLES)[number];

/**
 * pg_dump a side's schema: `db:<name>` uses PG* env; DSNs pass through.
 * Migration metadata schemas (pgpm_migrate, sqitch) are excluded — they are
 * the ledger, not the schema under comparison.
 */
const dumpDatabase = async (spec: string): Promise<string> => {
  const args = ['--schema-only', '--no-owner', '--exclude-schema=pgpm_migrate', '--exclude-schema=sqitch'];
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
  const resolved = path.resolve(cwd, spec);
  if (isWorkspaceDir(resolved)) return loadWorkspaceSide(resolved);
  return loadDiffSideFromDisk(resolved);
};

/** A directory that is a workspace root rather than a module root. */
const isWorkspaceDir = (dir: string): boolean =>
  fs.existsSync(dir) &&
  fs.statSync(dir).isDirectory() &&
  !fs.existsSync(path.join(dir, 'pgpm.plan')) &&
  ['pgpm.json', 'pgpm.config.js'].some(f => fs.existsSync(path.join(dir, f)));

/** PgConfig for a `db:<name>` spec or a postgres:// connection string. */
const ledgerConfig = (spec: string): PgConfig => {
  if (spec.startsWith('db:')) return getPgEnvOptions({ database: spec.slice(3) });
  const url = new URL(spec);
  return getPgEnvOptions({
    ...(url.hostname && { host: url.hostname }),
    ...(url.port && { port: Number(url.port) }),
    ...(url.username && { user: decodeURIComponent(url.username) }),
    ...(url.password && { password: decodeURIComponent(url.password) }),
    ...(url.pathname.length > 1 && { database: url.pathname.slice(1) })
  });
};

/** `resolveDiffSideKind` without throwing on relative on-disk paths. */
const resolveDiffSideKindSafe = (spec: string): 'database' | 'disk' =>
  /^postgres(ql)?:\/\//.test(spec) || spec.startsWith('db:') ? 'database' : 'disk';

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
 * Oracle mode: deploy A into a scratch database, deploy the emitted migration
 * module on top (when there is one), and assert catalog equivalence with B
 * deployed fresh into a second scratch database. Column order is physical — a
 * drop+add migration cannot reproduce a fresh deploy's ordinals — so
 * equivalence is checked order-insensitively via `withoutColumnOrder`.
 */
const runVerify = async (
  sideA: DiffSide,
  sideB: DiffSide,
  specA: string,
  specB: string,
  migrationDir: string | undefined,
  cwd: string
): Promise<string[]> => {
  const config = getPgEnvOptions();
  const stamp = Date.now();
  const names = [`pgpm_diff_verify_a_${stamp}`, `pgpm_diff_verify_b_${stamp}`];
  return withScratchDatabases(config, names, async ([cfgMigrated, cfgTarget]) => {
    await applySide(cfgMigrated, sideA, specA, cwd);
    if (migrationDir) {
      const result = await new PgpmMigrate(cfgMigrated).deploy({ modulePath: migrationDir });
      if (result.failed) {
        throw new Error(`migration deploy failed at change ${result.failed}`);
      }
    }
    await applySide(cfgTarget, sideB, specB, cwd);
    return catalogDifferences(cfgMigrated, cfgTarget, withoutColumnOrder);
  });
};

interface LedgerReport {
  classification: LedgerClassification;
  coverage: ChangeCoverage[];
  /** Plan entries backfilled: semantically satisfied but absent from the ledger. */
  backfilled: string[];
  /** Satisfied-but-unprovable entries (inert/partial coverage), not backfilled. */
  unprovable: string[];
  backfillSql?: string;
}

/**
 * Ledger mode: relate side B's plan to a database's pgpm_migrate ledger.
 * Name/hash classification says what the ledger records; semantic coverage
 * (identity-keyed against side A's actual schema) says what is genuinely
 * satisfied even when a regenerated plan renamed or reordered everything.
 * The backfill records the satisfied-but-unrecorded entries so a subsequent
 * `pgpm deploy` of side B executes only the true delta.
 */
const buildLedgerReport = async (
  ledgerSpec: string,
  specB: string,
  cwd: string,
  sideB: DiffSide,
  result: SemanticDiffResult
): Promise<LedgerReport> => {
  const resolvedB = path.resolve(cwd, specB);
  const modules = isWorkspaceDir(resolvedB)
    ? (await loadWorkspaceModules(resolvedB)).modules
    : [loadModuleSource(resolvedB)];
  const refs = await planChangeRefs(modules);
  const ledger = await loadLedger(ledgerConfig(ledgerSpec));
  const classification = classifyAgainstLedger(refs, ledger);
  const coverage = coverChanges(sideB.changes, result);

  // Coverage names are the side's change names: `pkg:change` for workspaces,
  // plain change names for a single module. Key both ways.
  const coverageByName = new Map<string, ChangeCoverage>();
  for (const cov of coverage) coverageByName.set(cov.name, cov);
  const statusFor = (pkg: string, name: string): ChangeCoverage | undefined =>
    coverageByName.get(`${pkg}:${name}`) ?? coverageByName.get(name);

  const pendingInLedger = new Set(
    classification.entries.filter(e => e.status === 'pending').map(e => `${e.package}:${e.name}`)
  );

  const backfilled: string[] = [];
  const unprovable: string[] = [];
  const entries = refs
    .filter(ref => pendingInLedger.has(`${ref.package}:${ref.name}`))
    .filter(ref => {
      const cov = statusFor(ref.package, ref.name);
      if (cov?.status === 'satisfied') {
        backfilled.push(`${ref.package}:${ref.name}`);
        return true;
      }
      if (cov && (cov.status === 'inert' || cov.status === 'partial')) {
        unprovable.push(`${ref.package}:${ref.name}`);
      }
      return false;
    })
    .map(ref => ({
      package: ref.package,
      changeName: ref.name,
      // The content hash is what a default `pgpm deploy` records and skips by.
      scriptHash: ref.hashes[0] ?? '',
      requires: ref.dependencies
    }))
    .filter(entry => entry.scriptHash);

  return {
    classification,
    coverage,
    backfilled,
    unprovable,
    backfillSql: entries.length > 0 ? emitLedgerBackfill(entries) : undefined
  };
};

const printLedgerSummary = (report: LedgerReport, ledgerSpec: string): void => {
  const counts = new Map<string, number>();
  for (const entry of report.classification.entries) {
    counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  }
  const parts = [...counts.entries()].map(([status, n]) => `${n} ${status}`);
  console.log(`Ledger (${ledgerSpec}): ${parts.join(', ') || 'empty plan'}.`);
  if (report.classification.orphaned.length) {
    console.log(`  Orphaned ledger entries (${report.classification.orphaned.length}):`);
    for (const row of report.classification.orphaned) {
      console.log(`    ${row.package}:${row.changeName}`);
    }
  }
  if (report.classification.outOfOrder.length) {
    console.log(`  Deployed out of plan order: ${report.classification.outOfOrder.join(', ')}`);
  }
  if (report.backfilled.length) {
    console.log(`  Satisfied but unrecorded (backfillable): ${report.backfilled.length}`);
  }
  if (report.unprovable.length) {
    console.log(`  Not provably satisfied (inert/partial; will deploy normally): ${report.unprovable.join(', ')}`);
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
    await cliExitWithError('pgpm diff requires two sides: pgpm diff <A> <B> (module dir, workspace dir, .sql file, db:<name>, or connection string).');
  }

  const granularityRaw = argv.granularity ?? 'object';
  if (!isExportGranularity(granularityRaw)) {
    await cliExitWithError(`Invalid --granularity "${granularityRaw}". Expected one of: ${EXPORT_GRANULARITIES.join(', ')}.`);
  }
  const granularity = granularityRaw as ExportGranularity;

  const changeGranularityRaw = (argv['change-granularity'] as string) ?? (argv.changeGranularity as string) ?? 'object';
  if (!isChangeGranularity(changeGranularityRaw)) {
    await cliExitWithError(`Invalid --change-granularity "${changeGranularityRaw}". Expected one of: ${CHANGE_GRANULARITIES.join(', ')}.`);
  }
  const changeGranularity = changeGranularityRaw as ChangeGranularity;

  const namingRaw = (argv.naming as string) ?? 'directory';
  if (!(NAMING_STYLES as readonly string[]).includes(namingRaw)) {
    await cliExitWithError(`Invalid --naming "${namingRaw}". Expected one of: ${NAMING_STYLES.join(', ')}.`);
  }
  const naming = namingRaw as NamingStyle;

  const cwd = (argv.cwd as string) || process.cwd();
  const json = Boolean(argv.json);
  const verify = Boolean(argv.verify);
  const emitModuleRaw = argv['emit-migration'] ?? argv.emitMigration ?? argv['emit-module'] ?? argv.emitModule;
  const emitModuleDir = typeof emitModuleRaw === 'string' && emitModuleRaw
    ? path.resolve(cwd, emitModuleRaw)
    : undefined;
  const appendModuleRaw = argv['append-module'] ?? argv.appendModule;
  const appendModuleDir = typeof appendModuleRaw === 'string' && appendModuleRaw
    ? path.resolve(cwd, appendModuleRaw)
    : undefined;
  const emitSqlRaw = argv['emit-sql'] ?? argv.emitSql;
  const emitSql = typeof emitSqlRaw === 'string' && emitSqlRaw
    ? (emitSqlRaw === STDOUT_TARGET ? STDOUT_TARGET : path.resolve(cwd, emitSqlRaw))
    : undefined;
  const emitBundleRaw = argv['emit-bundle'] ?? argv.emitBundle;
  const emitBundle = typeof emitBundleRaw === 'string' && emitBundleRaw
    ? path.resolve(cwd, emitBundleRaw)
    : undefined;
  const sqlToStdout = emitSql === STDOUT_TARGET;
  const pkgName = (argv.pkg as string) || 'diff-migration';
  const ledgerSpec = typeof argv.ledger === 'string' && argv.ledger ? argv.ledger : undefined;
  const emitLedgerRaw = argv['emit-ledger'] ?? argv.emitLedger;
  const emitLedgerTarget = typeof emitLedgerRaw === 'string' && emitLedgerRaw
    ? path.resolve(cwd, emitLedgerRaw)
    : undefined;

  if (emitLedgerTarget && !ledgerSpec) {
    await cliExitWithError('--emit-ledger requires --ledger <db> (the database whose pgpm_migrate ledger is backfilled).');
  }
  if (ledgerSpec) {
    const resolvedB = path.resolve(cwd, specB!);
    const hasPlanSide =
      resolveDiffSideKindSafe(specB!) === 'disk' &&
      (isWorkspaceDir(resolvedB) || fs.existsSync(path.join(resolvedB, 'pgpm.plan')));
    if (!hasPlanSide) {
      await cliExitWithError('--ledger requires side B to be a pgpm workspace or module directory (it needs a plan to classify).');
    }
  }

  if (appendModuleDir && (emitModuleDir || emitSql || emitBundle || verify)) {
    await cliExitWithError(
      '--append-module is standalone; it cannot be combined with --emit-migration/--emit-module/--emit-sql/--emit-bundle/--verify.'
    );
  }

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

  const result = diffChangeSets(sideA.changes, sideB.changes, { granularity, changeGranularity, style: naming });
  const warnings = [
    ...sideA.warnings.map(w => `${sideA.label}: ${w}`),
    ...sideB.warnings.map(w => `${sideB.label}: ${w}`),
    ...result.warnings
  ];

  let ledgerReport: LedgerReport | undefined;
  if (ledgerSpec) {
    ledgerReport = await buildLedgerReport(ledgerSpec, specB!, cwd, sideB, result);
    if (emitLedgerTarget) {
      if (ledgerReport.backfillSql) {
        fs.mkdirSync(path.dirname(emitLedgerTarget), { recursive: true });
        fs.writeFileSync(emitLedgerTarget, ledgerReport.backfillSql);
        if (!sqlToStdout && !json) log.success(`wrote ledger backfill (${ledgerReport.backfilled.length} change(s)) to ${emitLedgerTarget}`);
      } else if (!sqlToStdout && !json) {
        log.info('no ledger backfill to emit (nothing satisfied-but-unrecorded).');
      }
    }
  }

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
      warnings,
      ...(ledgerReport
        ? {
          ledger: {
            entries: ledgerReport.classification.entries,
            orphaned: ledgerReport.classification.orphaned,
            outOfOrder: ledgerReport.classification.outOfOrder,
            coverage: ledgerReport.coverage,
            backfilled: ledgerReport.backfilled,
            unprovable: ledgerReport.unprovable
          }
        }
        : {})
    }, null, 2));
  } else {
    for (const warning of warnings) console.warn(`diff: ${warning}`);
    // Keep stdout clean when the SQL projection is piped there.
    if (!sqlToStdout) {
      printSummary(result, sideA.label, sideB.label);
      if (ledgerReport) printLedgerSummary(ledgerReport, ledgerSpec!);
    }
  }

  if (appendModuleDir) {
    const rows = deltaChangesToRows(result.changes);
    if (rows.length === 0) {
      log.info('no migration changes to append (sides are identical).');
    } else {
      const appended = appendModule(appendModuleDir, rows);
      for (const w of appended.warnings) console.warn(`diff: ${w}`);
      log.success(
        `appended ${appended.added.length} change(s) to ${appended.dir}` +
        (appended.skipped.length ? ` (${appended.skipped.length} skipped)` : '')
      );
    }
    prompter.close();
    return argv;
  }

  let migrationDir: string | undefined;
  const needModule = Boolean(emitModuleDir || emitSql || emitBundle) || (verify && !result.identical);
  if (needModule) {
    const outBase = emitModuleDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-diff-'));
    const rows = deltaChangesToRows(result.changes);
    if (rows.length === 0) {
      if (!sqlToStdout) log.info('no migration changes to emit (sides are identical).');
    } else {
      migrationDir = writeModule(outBase, { name: pkgName, requires: [], rows });
      if (emitModuleDir && !sqlToStdout) log.success(`wrote ${rows.length} migration change(s) to ${migrationDir}`);
      if (emitSql) {
        await emitModuleSql(migrationDir, emitSql);
        if (!sqlToStdout) log.success(`wrote linear SQL to ${emitSql}`);
      }
      if (emitBundle) {
        await emitModuleBundle(migrationDir, emitBundle);
        if (!sqlToStdout) log.success(`wrote bundle to ${emitBundle}`);
      }
    }
  }

  if (verify) {
    log.info('running --verify: deploying A plus the migration and B into scratch databases...');
    const diffs = await runVerify(sideA, sideB, specA, specB, migrationDir, cwd);
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
