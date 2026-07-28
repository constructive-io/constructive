import * as fs from 'fs';
import * as path from 'path';

import * as semver from 'semver';

import { RegistryClient, RegistryOptions } from './registry';

export interface UpdateCheckOptions extends RegistryOptions {
  pkg: string;
  /** Version currently in use. */
  currentVersion: string;
  /**
   * Semver range the installed harness supports (`compatibleSkillsRange`).
   * Newer releases outside this range are reported but never recommended.
   */
  compatibleRange?: string;
  /** Cache file (e.g. `harnessDirs().updateCheckFile`). */
  cacheFile: string;
  /** Re-query the registry only after this long (default 24h). */
  ttlMs?: number;
  now?: () => number;
}

export interface UpdateCheckResult {
  checkedAt: number;
  /** True when this result came from the cache file, not the registry. */
  fromCache: boolean;
  currentVersion: string;
  /** Newest published version overall. */
  latestVersion: string;
  /** Newest version inside compatibleRange — the one an updater may adopt. */
  latestCompatible: string | null;
  /** True when latestCompatible is newer than currentVersion. */
  updateAvailable: boolean;
  /** True when a newer release exists but only outside compatibleRange. */
  harnessUpgradeRequired: boolean;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Check the registry for newer skill releases, caching results on disk so
 * repeated sessions don't hit the network. Registry failures fall back to the
 * cached result (stale ok) or report "no update" — never throw.
 */
export async function checkForSkillsUpdate(
  options: UpdateCheckOptions
): Promise<UpdateCheckResult> {
  const now = options.now ?? Date.now;
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;

  const cached = readCache(options.cacheFile);
  if (cached && cached.currentVersion === options.currentVersion && now() - cached.checkedAt < ttl) {
    return { ...cached, fromCache: true };
  }

  let versions: string[];
  try {
    const packument = await new RegistryClient(options).packument(options.pkg);
    versions = Object.keys(packument.versions).filter((v) => semver.valid(v));
  } catch {
    if (cached) return { ...cached, fromCache: true };
    return noUpdate(options.currentVersion, now());
  }
  if (versions.length === 0) return noUpdate(options.currentVersion, now());

  const latestVersion = versions.sort(semver.rcompare)[0];
  const latestCompatible = options.compatibleRange
    ? semver.maxSatisfying(versions, options.compatibleRange)
    : latestVersion;
  const result: UpdateCheckResult = {
    checkedAt: now(),
    fromCache: false,
    currentVersion: options.currentVersion,
    latestVersion,
    latestCompatible,
    updateAvailable:
      latestCompatible !== null && semver.gt(latestCompatible, options.currentVersion),
    harnessUpgradeRequired:
      semver.gt(latestVersion, options.currentVersion) &&
      (latestCompatible === null || semver.gt(latestVersion, latestCompatible)),
  };
  writeCache(options.cacheFile, result);
  return result;
}

function noUpdate(currentVersion: string, checkedAt: number): UpdateCheckResult {
  return {
    checkedAt,
    fromCache: false,
    currentVersion,
    latestVersion: currentVersion,
    latestCompatible: currentVersion,
    updateAvailable: false,
    harnessUpgradeRequired: false,
  };
}

function readCache(cacheFile: string): UpdateCheckResult | null {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as UpdateCheckResult;
  } catch {
    return null;
  }
}

function writeCache(cacheFile: string, result: UpdateCheckResult): void {
  try {
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
  } catch {
    // Cache write failures are non-fatal.
  }
}
