import { Logger } from '@pgpmjs/logger';
import { BundleChange, MigrationBundle, verifyBundle } from '@pgpmjs/bundle';
import { getPgPool } from 'pg-cache';
import { PgConfig } from 'pg-env';

import { PgpmMigrate } from '../migrate/client';
import { bundleMatchesModule, buildExecutableBundle, readBundleArtifact } from './artifact';

const log = new Logger('deploy-fast');

/**
 * Why the one-shot path could not be used, so the caller falls back to the
 * per-change migration path.
 */
export type BundledDeploySkipReason = 'no-executable-sql' | 'unsupported-hash-method';

/** How the executable bundle for a module was obtained. */
export type BundleSource = 'artifact' | 'packaged';

export interface BundledDeployResult {
  /** Module (package) name from the bundle manifest. */
  name: string;
  /** Where the executable bundle came from. */
  source: BundleSource;
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
   * scheme; the `ast` scheme is not reproducible here, so it is reported as a
   * skip and the caller falls back.
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

/**
 * The ledger hash for a change: the sha256 of the deploy script bytes.
 *
 * This is deliberately the same value `PgpmMigrate.calculateScriptHash` derives
 * from `deploy/<change>.sql` under the default `content` hash method, so a
 * change hashed at package time and the hash recorded/compared at deploy time
 * agree — the one-shot and per-change paths are interchangeable and idempotent
 * against each other.
 */
export function ledgerHashForChange(change: BundleChange): string | null {
  return change.deploy?.digest ?? null;
}

/**
 * Load a module's executable bundle: its stored artifact when one verifies,
 * otherwise built from `deploy/` on the fly.
 *
 * The artifact is purely an optimization — it removes the read+parse work, not
 * a capability. Whatever the source, the resulting bundle is byte-identical in
 * what it executes and in the hashes it records, so a module without an
 * artifact deploys exactly the same way, just slower.
 */
async function loadExecutableBundle(
  moduleDir: string
): Promise<{ bundle: MigrationBundle; source: BundleSource }> {
  const stored = readBundleArtifact(moduleDir);
  if (stored) {
    const issues = verifyBundle(stored);
    if (issues.length > 0) {
      log.warn(
        `⚠️ Bundle artifact for ${stored.manifest.name} failed verification ` +
          `(${issues.map(i => i.kind).join(', ')}); rebuilding from deploy/.`
      );
    } else if (!bundleMatchesModule(moduleDir, stored)) {
      log.warn(
        `⚠️ Bundle artifact for ${stored.manifest.name} is stale (deploy/ has ` +
          `changed since it was packaged); rebuilding from deploy/.`
      );
    } else {
      return { bundle: stored, source: 'artifact' };
    }
  }
  return { bundle: await buildExecutableBundle(moduleDir), source: 'packaged' };
}

/**
 * Deploy a module in one shot **and** record the migration ledger — the `fast`
 * deploy strategy.
 *
 * Pending changes' deploy SQL is concatenated and executed as a single
 * statement (the speed of the old fast path), then one `pgpm_migrate.changes`
 * row per change is bulk-inserted with the deploy script's own sha256 as
 * `script_hash` — one round-trip, instead of an `isDeployed` + `readScript` +
 * `CALL pgpm_migrate.deploy` per change. Because the ledger is written, the
 * path is idempotent and resumable: re-deploys skip changes whose stored hash
 * matches, and a same-name/different-content change raises
 * {@link BundledDeployConflictError} exactly as the per-change path does.
 *
 * Returns a {@link BundledDeploySkipReason} (rather than throwing) when it
 * cannot honour the requested semantics, so the caller falls back to the
 * per-change migration path. Genuine SQL failures still throw.
 */
export async function deployModuleFast(
  moduleDir: string,
  options: BundledDeployOptions
): Promise<BundledDeployResult | BundledDeploySkipReason> {
  if ((options.hashMethod ?? 'content') !== 'content') {
    return 'unsupported-hash-method';
  }

  const { bundle, source } = await loadExecutableBundle(moduleDir);

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

  const pending: BundleChange[] = [];
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
    return { name: packageName, source, deployed: [], skipped };
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
      `from ${source === 'artifact' ? 'bundle artifact' : 'packaged deploy/'} ` +
      `(${skipped.length} already deployed).`
  );

  return { name: packageName, source, deployed: changeNames, skipped };
}

/** True when the value is a real deploy result rather than a skip reason. */
export function isBundledDeployResult(
  value: BundledDeployResult | BundledDeploySkipReason
): value is BundledDeployResult {
  return typeof value !== 'string';
}
