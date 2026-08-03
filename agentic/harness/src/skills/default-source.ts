import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';

import { FetchedRelease, latestLocalRelease } from './fetch';
import { fetchSkillsFromGit, GitFetchOptions } from './git-fetch';
import { SkillSourceRef } from './manifest';

/**
 * The default skills layer every harness consumer gets without declaring
 * anything: the public `constructive-skills` repo at branch head. The repo has
 * no semver tags yet, so `main` is the only "latest" mechanism; once tagging
 * starts, consumers can harden to a semver pin via their manifest.
 */
export const DEFAULT_SKILLS_REPO = 'constructive-io/constructive-skills';
export const DEFAULT_SKILLS_SOURCE_NAME = 'constructive-skills';
export const DEFAULT_SKILLS_PIN = 'main';

const DEFAULT_SUBDIR = '.agents/skills';

export type FetchDefaultSkillsOptions = Pick<GitFetchOptions, 'skillsRoot'> &
  Partial<Omit<GitFetchOptions, 'skillsRoot'>>;

/**
 * Fetch the default skills layer: `DEFAULT_SKILLS_REPO@main` through the
 * normal git fetcher (per-SHA on-disk cache, no re-download for an unchanged
 * head). When the fetch fails — offline, rate-limited — the newest release
 * already on disk is returned instead; with nothing cached the fetch error
 * propagates so the caller can skip the layer with a warning.
 */
export async function fetchDefaultSkills(
  options: FetchDefaultSkillsOptions
): Promise<FetchedRelease> {
  const subdir = options.repoSubdir ?? DEFAULT_SUBDIR;
  try {
    return await fetchSkillsFromGit({
      repo: DEFAULT_SKILLS_REPO,
      pin: DEFAULT_SKILLS_PIN,
      ...options,
    });
  } catch (error) {
    const local = latestLocalAnyRelease(options.skillsRoot, subdir);
    if (local) return local;
    throw error;
  }
}

/** Manifest ref for the default layer, lowest precedence by convention. */
export function defaultSkillLayer(): SkillSourceRef {
  return { name: DEFAULT_SKILLS_SOURCE_NAME };
}

/**
 * Newest already-downloaded release under `skillsRoot`, including branch-head
 * fetches. Branch heads unpack under commit-SHA directory names, which the
 * semver filter in `latestLocalRelease` cannot see — those fall back to
 * newest-by-mtime. Tagged (semver) releases win over SHA directories.
 */
export function latestLocalAnyRelease(
  skillsRoot: string,
  subdir = DEFAULT_SUBDIR
): FetchedRelease | null {
  const tagged = latestLocalRelease(skillsRoot, subdir);
  if (tagged) return tagged;
  if (!fs.existsSync(skillsRoot)) return null;

  let newest: { version: string; mtimeMs: number } | null = null;
  for (const name of fs.readdirSync(skillsRoot)) {
    if (semver.valid(name)) continue;
    const dir = path.join(skillsRoot, name);
    if (!fs.existsSync(path.join(dir, subdir))) continue;
    const mtimeMs = fs.statSync(dir).mtimeMs;
    if (!newest || mtimeMs > newest.mtimeMs) newest = { version: name, mtimeMs };
  }
  if (!newest) return null;
  return {
    version: newest.version,
    skillsDir: path.join(skillsRoot, newest.version, subdir),
    fromCache: true,
  };
}
