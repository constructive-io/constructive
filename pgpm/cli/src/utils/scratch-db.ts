/**
 * Scratch-database catalog oracle shared by the dials commands that prove
 * structural equivalence (`pgpm transform --check`, `pgpm diff --verify`).
 *
 * Both commands do the same dance: create throwaway databases, deploy a
 * schema into each, snapshot the catalogs, and diff them — always dropping the
 * scratch databases afterwards even on failure. This centralizes the lifecycle
 * (`withScratchDatabases`) and the snapshot/compare step (`catalogDifferences`)
 * so each command only supplies what is genuinely command-specific: how it
 * deploys a side.
 *
 * It lives in the CLI (not `@pgpmjs/transform`) because deploying touches
 * `PgpmMigrate` from `@pgpmjs/core`, and `core` already depends on `transform`
 * — hosting the oracle in `transform` would close that cycle.
 */
import { Logger } from '@pgpmjs/logger';
import { CatalogSnapshot, diffCatalogSnapshots, snapshotCatalog } from '@pgpmjs/transform';
import { getPgPool } from 'pg-cache';
import type { PgConfig } from 'pg-env';

const log = new Logger('scratch-db');

const createScratchDb = async (config: PgConfig, dbName: string): Promise<void> => {
  const adminPool = getPgPool({ ...config, database: 'postgres' });
  await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await adminPool.query(`CREATE DATABASE "${dbName}"`);
};

const dropScratchDb = async (config: PgConfig, dbName: string): Promise<void> => {
  const adminPool = getPgPool({ ...config, database: 'postgres' });
  await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
};

/**
 * Create the named scratch databases, run `fn` with a per-database `PgConfig`
 * for each (in the same order as `names`), and drop them all afterwards —
 * even if `fn` throws. Drop failures are logged, never thrown, so they can't
 * mask the original error.
 */
export const withScratchDatabases = async <T>(
  config: PgConfig,
  names: string[],
  fn: (configs: PgConfig[]) => Promise<T>
): Promise<T> => {
  try {
    for (const name of names) await createScratchDb(config, name);
    return await fn(names.map(name => ({ ...config, database: name })));
  } finally {
    try {
      for (const name of names) await dropScratchDb(config, name);
    } catch (err) {
      log.warn(`failed to drop scratch databases: ${err instanceof Error ? err.message : err}`);
    }
  }
};

/**
 * Snapshot the catalogs of two databases and return their differences. An
 * optional `normalize` transform is applied to both snapshots first (e.g.
 * `withoutColumnOrder` when a drop+add migration cannot reproduce a fresh
 * deploy's physical column ordinals). Empty result means equivalent.
 */
export const catalogDifferences = async (
  configA: PgConfig,
  configB: PgConfig,
  normalize: (snap: CatalogSnapshot) => CatalogSnapshot = snap => snap
): Promise<string[]> => {
  const snapA = await snapshotCatalog(getPgPool(configA));
  const snapB = await snapshotCatalog(getPgPool(configB));
  return diffCatalogSnapshots(normalize(snapA), normalize(snapB));
};
