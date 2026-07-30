import { Logger } from '@pgpmjs/logger';
import { MigrationBundle, verifyBundle } from '@pgpmjs/bundle';
import { getPgPool } from 'pg-cache';
import { PgConfig } from 'pg-env';

import { PgpmMigrate } from '../migrate/client';
import { readBundleArtifact } from './artifact';

const log = new Logger('deploy-bundled');

/** Why a bundled deploy could not be used, so the caller can fall back. */
export type BundledDeploySkipReason =
  | 'no-artifact'
  | 'unverified'
  | 'no-executable-sql'
  | 'unsupported-hash-method';

export interface BundledDeployResult {
  /** Module (package) name from the bundle manifest. */
  name: string;
  /** Changes executed and recorded on this run, in deploy order. */
  deployed: string[];
  /** Changes already present in the ledger with a matching hash. */
  skipped: string[];
}

export interface BundledDeployOptions {
  config: PgConfig;
  /** Target database (defaults to `config.database`). */
  database?: string;
  /** Record ledger rows without executing the DDL. */
  logOnly?: boolean;
  /** Wrap execution + ledger writes in one transaction. Default true. */
  useTransaction?: boolean;
  /**
   * Ledger hash scheme in force. The bundle's per-change digests are sha256 of
   * the deploy script's bytes, i.e. identical to `PgpmMigrate`'s `content`
   * scheme; the `ast` scheme is not reconcilable from the artifact, so it is
   * reported as a skip and the caller falls back.
   */
  hashMethod?: 'content' | 'ast';
}

/** Thrown when the ledger already holds a change with different content. */
export class BundledDeployConflictError extends Error {
  constructor(readonly packageName: string, readonly changeName: string) {
    super(
      `Change ${changeName} already deployed in package ${packageName} with different content`
    );
    this.name = 'BundledDeployConflictError';
  }
}

const isSkipped = (
  value: BundledDeployResult | BundledDeploySkipReason
): value is BundledDeploySkipReason => typeof value === 'string';

/**
 * The ledger hash for a bundled change: the sha256 of the deploy script bytes.
 *
 * This is deliberately the same value `PgpmMigrate.calculateScriptHash` derives
 * from `deploy/<change>.sql` under the default `content` hash method, so a
 * change hashed at package time and the hash recorded/compared at deploy time
 * agree — bundled and non-bundled deploys are interchangeable and idempotent
 * against each other.
 */
export function ledgerHashForChange(change: MigrationBundle['changes'][number]): string | null {
  return change.deploy?.digest ?? null;
}

/**
 * Deploy a module from its stored bundle artifact — the ledger-preserving "fast"
 * path.
 *
 * Reads `sql/<name>--<version>.bundle.tar.gz` (un-tarred in memory), gates on
 * `verifyBundle`, then executes the pending changes' pre-computed deploy SQL as a
 * single statement and records one `pgpm_migrate.changes` row per change with the
 * artifact's own digest as `script_hash` — bulk-inserted in one round-trip
 * instead of a `CALL pgpm_migrate.deploy` per change.
 *
 * Returns a {@link BundledDeploySkipReason} (rather than throwing) whenever the
 * artifact is missing, stale, or unverifiable, so the caller falls back to the
 * normal packaging/deploy path. Genuine SQL failures still throw.
 */
export async function deployModuleFromBundle(
  moduleDir: string,
  options: BundledDeployOptions
): Promise<BundledDeployResult | BundledDeploySkipReason> {
  if ((options.hashMethod ?? 'content') !== 'content') {
    return 'unsupported-hash-method';
  }

  const bundle = readBundleArtifact(moduleDir);
  if (!bundle) return 'no-artifact';

  const issues = verifyBundle(bundle);
  if (issues.length > 0) {
    log.warn(
      `⚠️ Bundle artifact for ${bundle.manifest.name} failed verification ` +
        `(${issues.map(i => i.kind).join(', ')}); falling back to packaging.`
    );
    return 'unverified';
  }

  const executable = bundle.changes.filter(change => change.deploy);
  if (executable.length === 0 || executable.some(change => !change.exec)) {
    return 'no-executable-sql';
  }

  const packageName = bundle.manifest.name;
  const config = options.database
    ? { ...options.config, database: options.database }
    : options.config;

  // Ensures the pgpm_migrate schema/procedures exist, exactly as the
  // per-change deploy path does.
  await new PgpmMigrate(config, { hashMethod: 'content' }).initialize();

  const pool = getPgPool(config);
  const existing = await pool.query<{ change_name: string; script_hash: string }>(
    'SELECT change_name, script_hash FROM pgpm_migrate.changes WHERE package = $1',
    [packageName]
  );
  const deployedHashes = new Map(existing.rows.map(row => [row.change_name, row.script_hash]));

  const pending: typeof executable = [];
  const skipped: string[] = [];
  for (const change of executable) {
    const hash = ledgerHashForChange(change)!;
    const recorded = deployedHashes.get(change.name);
    if (recorded === undefined) {
      pending.push(change);
      continue;
    }
    if (recorded !== hash) {
      throw new BundledDeployConflictError(packageName, change.name);
    }
    skipped.push(change.name);
  }

  if (pending.length === 0) {
    log.info(`⚡ ${packageName}: all ${skipped.length} change(s) already deployed.`);
    return { name: packageName, deployed: [], skipped };
  }

  const changeNames = pending.map(change => change.name);
  const hashes = pending.map(change => ledgerHashForChange(change)!);
  const depChanges: string[] = [];
  const depRequires: string[] = [];
  for (const change of pending) {
    for (const dep of new Set(change.dependencies)) {
      depChanges.push(change.name);
      depRequires.push(dep.includes(':') ? dep : `${packageName}:${dep}`);
    }
  }
  const deploySql = pending.map(change => change.exec!.sql).join('\n');

  const client = await pool.connect();
  const useTransaction = options.useTransaction ?? true;
  try {
    if (useTransaction) await client.query('BEGIN');
    if (!options.logOnly) {
      await client.query(deploySql);
    }
    await client.query(
      'INSERT INTO pgpm_migrate.packages (package) VALUES ($1) ON CONFLICT (package) DO NOTHING',
      [packageName]
    );
    await client.query(
      `WITH input AS (
         SELECT change_name, script_hash
         FROM unnest($2::text[], $3::text[]) AS t(change_name, script_hash)
       ), inserted AS (
         INSERT INTO pgpm_migrate.changes (change_id, change_name, package, script_hash)
         SELECT encode(sha256(($1 || change_name || script_hash)::bytea), 'hex'),
                change_name, $1, script_hash
         FROM input
         ON CONFLICT (package, change_name) DO NOTHING
         RETURNING change_id, change_name
       ), deps AS (
         INSERT INTO pgpm_migrate.dependencies (change_id, requires)
         SELECT inserted.change_id, d.requires
         FROM unnest($4::text[], $5::text[]) AS d(change_name, requires)
         JOIN inserted ON inserted.change_name = d.change_name
         ON CONFLICT DO NOTHING
         RETURNING change_id
       )
       INSERT INTO pgpm_migrate.events (event_type, change_name, package)
       SELECT 'deploy', change_name, $1 FROM inserted`,
      [packageName, changeNames, hashes, depChanges, depRequires]
    );
    if (useTransaction) await client.query('COMMIT');
  } catch (error) {
    if (useTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // the connection is already unusable; surface the original error
      }
    }
    throw error;
  } finally {
    client.release();
  }

  log.success(
    `⚡ ${packageName}: ${changeNames.length} change(s) ${options.logOnly ? 'logged' : 'deployed'} ` +
      `from bundle artifact (${skipped.length} already deployed).`
  );

  return { name: packageName, deployed: changeNames, skipped };
}

/** True when the value is a real bundled-deploy result rather than a skip. */
export function isBundledDeployResult(
  value: BundledDeployResult | BundledDeploySkipReason
): value is BundledDeployResult {
  return !isSkipped(value);
}
