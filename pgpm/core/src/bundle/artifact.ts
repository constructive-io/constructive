import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { hashString } from '@pgpmjs/ast';
import { getExtensionName, parseControlContent } from '@pgpmjs/ast/files';
import {
  BUNDLE_ARCHIVE_EXTENSION,
  bundleFromModule,
  CreateBundleOptions,
  ExecSqlByChange,
  MigrationBundle,
  readBundleArchiveFile,
  withExecutableSql,
  writeBundleArchiveFile
} from '@pgpmjs/bundle';

import { cleanSql } from '../migrate/clean';

/**
 * Artifact file name for a module's stored bundle: it lives beside the packaged
 * `sql/<name>--<version>.sql` as `sql/<name>--<version>.bundle.tar.gz`.
 */
export function bundleArtifactFileName(name: string, version: string): string {
  return `${name}--${version}${BUNDLE_ARCHIVE_EXTENSION}`;
}

/**
 * Locate a module's stored bundle artifact, if it has one.
 *
 * Prefers the version declared in the module's `.control` file, then falls back
 * to any single `sql/*.bundle.tar.gz` present — so a module packaged at a
 * different version still gets the fast path instead of silently degrading.
 * Returns `null` when the module ships no artifact.
 */
export function resolveBundleArtifactPath(moduleDir: string): string | null {
  const sqlDir = join(moduleDir, 'sql');
  if (!existsSync(sqlDir)) return null;

  let name: string;
  try {
    name = getExtensionName(moduleDir);
  } catch {
    return null;
  }

  const controlPath = join(moduleDir, `${name}.control`);
  if (existsSync(controlPath)) {
    const { version } = parseControlContent(readFileSync(controlPath, 'utf-8'));
    if (version) {
      const versioned = join(sqlDir, bundleArtifactFileName(name, version));
      if (existsSync(versioned)) return versioned;
    }
  }

  const candidates = readdirSync(sqlDir).filter(
    file => file.startsWith(`${name}--`) && file.endsWith(BUNDLE_ARCHIVE_EXTENSION)
  );
  if (candidates.length !== 1) return null;
  return join(sqlDir, candidates[0]);
}

/**
 * Build the executable form of a module's bundle: the content-addressed AST
 * snapshot plus, per change, the deploy SQL with transaction-control
 * statements stripped (`cleanSql`).
 *
 * That pre-computation is the whole point of the artifact — the parse/deparse
 * work moves from every deploy to the one-time package step, while the digests
 * still cover the exact bytes that will be executed.
 */
export async function buildExecutableBundle(
  moduleDir: string,
  options?: CreateBundleOptions
): Promise<MigrationBundle> {
  const bundle = bundleFromModule(moduleDir, options);
  const execSql: ExecSqlByChange = {};
  for (const change of bundle.changes) {
    if (!change.deploy) continue;
    execSql[change.name] = await cleanSql(change.deploy.sql, false, '$EOFCODE$');
  }
  return withExecutableSql(bundle, execSql);
}

/**
 * Emit a module's stored bundle artifact into `sql/`, returning its path.
 */
export async function writeBundleArtifact(
  moduleDir: string,
  version: string,
  options?: CreateBundleOptions
): Promise<string> {
  const bundle = await buildExecutableBundle(moduleDir, options);
  const outPath = join(moduleDir, 'sql', bundleArtifactFileName(bundle.manifest.name, version));
  writeBundleArchiveFile(bundle, outPath);
  return outPath;
}

/**
 * Whether a stored bundle still describes what is on disk.
 *
 * `verifyBundle` only proves an artifact is internally consistent — it cannot
 * tell that `deploy/` moved on since the artifact was written. A committed
 * artifact plus a rebased branch is exactly that case, and using it would
 * deploy the stale SQL while recording hashes for it, silently.
 *
 * The check is deliberately I/O-only (read + sha256, no parse), so it costs a
 * fraction of the parse/deparse work the artifact exists to avoid.
 */
export function bundleMatchesModule(moduleDir: string, bundle: MigrationBundle): boolean {
  const planPath = join(moduleDir, 'pgpm.plan');
  if (!existsSync(planPath)) return false;
  if (readFileSync(planPath, 'utf-8') !== bundle.plan) return false;

  for (const change of bundle.changes) {
    if (!change.deploy) continue;
    const deployPath = join(moduleDir, 'deploy', `${change.name}.sql`);
    if (!existsSync(deployPath)) return false;
    if (hashString(readFileSync(deployPath, 'utf-8')) !== change.deploy.digest) return false;
  }
  return true;
}

/**
 * Read a module's stored bundle artifact, or `null` when it has none or the
 * archive cannot be read. Never throws — a broken artifact must degrade to the
 * normal packaging path, not fail the deploy.
 */
export function readBundleArtifact(moduleDir: string): MigrationBundle | null {
  const artifactPath = resolveBundleArtifactPath(moduleDir);
  if (!artifactPath) return null;
  try {
    return readBundleArchiveFile(artifactPath);
  } catch {
    return null;
  }
}
