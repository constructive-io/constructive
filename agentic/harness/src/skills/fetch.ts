import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as semver from 'semver';
import * as tar from 'tar';

import { verifyIntegrity } from './integrity';
import { Packument, RegistryClient, RegistryOptions } from './registry';

export interface FetchReleaseOptions extends RegistryOptions {
  /** npm package that ships the skills, e.g. `@constructive-io/skills`. */
  pkg: string;
  /**
   * Version pin: exact version, semver range, or dist-tag. Ranges resolve to
   * the highest satisfying published version.
   */
  pin: string;
  /** Root directory releases unpack into: `<skillsRoot>/<version>/`. */
  skillsRoot: string;
  /** Path of the skills tree inside the package (default `.agents/skills`). */
  packageSubdir?: string;
}

export interface FetchedRelease {
  version: string;
  /** Directory containing `<skill>/SKILL.md` folders, ready for DirectorySkillSource. */
  skillsDir: string;
  /** True when the release was already on disk and no download happened. */
  fromCache: boolean;
}

export function resolvePin(packument: Packument, pin: string): string {
  const distTag = packument['dist-tags'][pin];
  if (distTag) return distTag;
  if (packument.versions[pin]) return pin;
  const versions = Object.keys(packument.versions);
  const resolved = semver.maxSatisfying(versions, pin);
  if (!resolved) {
    throw new Error(`No published version of ${packument.name} satisfies pin "${pin}"`);
  }
  return resolved;
}

/**
 * Ensure a skills release is unpacked under `<skillsRoot>/<version>/` and
 * return its skills directory. Downloads at most once per version: an already
 * unpacked release is reused without touching the network, so a previously
 * fetched version keeps working offline.
 */
export async function fetchSkillsRelease(options: FetchReleaseOptions): Promise<FetchedRelease> {
  const subdir = options.packageSubdir ?? '.agents/skills';
  const client = new RegistryClient(options);

  const exactPin = semver.valid(options.pin);
  if (exactPin) {
    const cached = cachedRelease(options.skillsRoot, exactPin, subdir);
    if (cached) return cached;
  }

  const packument = await client.packument(options.pkg);
  const version = resolvePin(packument, options.pin);
  const cached = cachedRelease(options.skillsRoot, version, subdir);
  if (cached) return cached;

  const release = packument.versions[version];
  const data = await client.tarball(release.dist.tarball);
  verifyIntegrity(data, release.dist);

  const versionDir = path.join(options.skillsRoot, version);
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-skills-'));
  try {
    const tarballPath = path.join(staging, 'release.tgz');
    fs.writeFileSync(tarballPath, data);
    const unpackDir = path.join(staging, 'package');
    fs.mkdirSync(unpackDir);
    await tar.extract({ file: tarballPath, cwd: unpackDir, strip: 1 });
    fs.mkdirSync(path.dirname(versionDir), { recursive: true });
    fs.rmSync(versionDir, { recursive: true, force: true });
    fs.renameSync(unpackDir, versionDir);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }

  const skillsDir = path.join(versionDir, subdir);
  if (!fs.existsSync(skillsDir)) {
    throw new Error(`Release ${options.pkg}@${version} has no ${subdir} directory`);
  }
  return { version, skillsDir, fromCache: false };
}

/** Newest already-downloaded version under `skillsRoot`, or null. */
export function latestLocalRelease(skillsRoot: string, subdir = '.agents/skills'): FetchedRelease | null {
  if (!fs.existsSync(skillsRoot)) return null;
  const versions = fs
    .readdirSync(skillsRoot)
    .filter((name) => semver.valid(name) && fs.existsSync(path.join(skillsRoot, name, subdir)))
    .sort(semver.rcompare);
  if (versions.length === 0) return null;
  return {
    version: versions[0],
    skillsDir: path.join(skillsRoot, versions[0], subdir),
    fromCache: true,
  };
}

function cachedRelease(
  skillsRoot: string,
  version: string,
  subdir: string
): FetchedRelease | null {
  const skillsDir = path.join(skillsRoot, version, subdir);
  return fs.existsSync(skillsDir) ? { version, skillsDir, fromCache: true } : null;
}
