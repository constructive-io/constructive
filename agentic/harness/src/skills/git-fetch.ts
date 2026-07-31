import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import * as tar from 'tar';

import { FetchedRelease } from './fetch';
import { FetchLike } from './registry';

/**
 * GitHub-repo skill source: the skills repo is just a git repository
 * (e.g. `constructive-io/constructive-skills`), released by tagging. Releases
 * are downloaded as codeload tarballs and unpacked into the same
 * `<skillsRoot>/<version>/` layout the npm fetcher uses, so
 * `latestLocalRelease()` and `DirectorySkillSource` work identically for both.
 */
export interface GitFetchOptions {
  /** `owner/repo`, e.g. `constructive-io/constructive-skills`. */
  repo: string;
  /**
   * Ref pin: a tag (`v1.2.0`), a semver range resolved against tags
   * (`^1.2.0`), a full commit SHA, or a branch name. Tags and SHAs are
   * reproducible pins; a branch is a moving pointer resolved at fetch time.
   */
  pin: string;
  /** Root directory releases unpack into: `<skillsRoot>/<version>/`. */
  skillsRoot: string;
  /** Path of the skills tree inside the repo (default `.agents/skills`). */
  repoSubdir?: string;
  /** GitHub API/codeload base overrides (GHES) and injectable HTTP. */
  apiUrl?: string;
  codeloadUrl?: string;
  fetchImpl?: FetchLike;
  /** Token for private repos; sent as `authorization: Bearer <token>`. */
  token?: string;
}

interface GitRef {
  /** Directory name under skillsRoot: the semver for tags, else the SHA. */
  version: string;
  /** Ref to download (tag name, SHA, or branch). */
  ref: string;
  /** Commit SHA when known (tags/SHA pins) for integrity verification. */
  sha?: string;
}

const DEFAULT_API = 'https://api.github.com';
const DEFAULT_CODELOAD = 'https://codeload.github.com';
const FULL_SHA = /^[0-9a-f]{40}$/;

export async function fetchSkillsFromGit(options: GitFetchOptions): Promise<FetchedRelease> {
  const subdir = options.repoSubdir ?? '.agents/skills';
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);

  // Reproducible pins already on disk never touch the network.
  const exact = semver.valid(cleanTag(options.pin)) ?? (FULL_SHA.test(options.pin) ? options.pin : null);
  if (exact) {
    const cached = cachedGitRelease(options.skillsRoot, exact, subdir);
    if (cached) return cached;
  }

  const resolved = await resolveGitPin(options, fetchImpl);
  const cached = cachedGitRelease(options.skillsRoot, resolved.version, subdir);
  if (cached) return cached;

  const codeload = (options.codeloadUrl ?? DEFAULT_CODELOAD).replace(/\/$/, '');
  const url = `${codeload}/${options.repo}/tar.gz/${resolved.ref}`;
  const res = await fetchImpl(url, { headers: authHeaders(options.token) });
  if (!res.ok) {
    throw new Error(`Git tarball download failed: HTTP ${res.status} (${url})`);
  }
  const data = Buffer.from(await res.arrayBuffer());

  const versionDir = path.join(options.skillsRoot, resolved.version);
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-skills-git-'));
  try {
    const tarballPath = path.join(staging, 'release.tgz');
    fs.writeFileSync(tarballPath, data);
    const unpackDir = path.join(staging, 'repo');
    fs.mkdirSync(unpackDir);
    await tar.extract({ file: tarballPath, cwd: unpackDir, strip: 1 });
    if (!fs.existsSync(path.join(unpackDir, subdir))) {
      throw new Error(`${options.repo}@${resolved.ref} has no ${subdir} directory`);
    }
    fs.mkdirSync(path.dirname(versionDir), { recursive: true });
    fs.rmSync(versionDir, { recursive: true, force: true });
    fs.renameSync(unpackDir, versionDir);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }

  return {
    version: resolved.version,
    skillsDir: path.join(versionDir, subdir),
    fromCache: false,
  };
}

/**
 * Resolve a pin to a downloadable ref:
 *   1. full commit SHA → itself;
 *   2. exact tag (with or without `v`) → that tag;
 *   3. semver range → highest satisfying tag;
 *   4. anything else → treated as a branch, resolved to its head SHA.
 */
async function resolveGitPin(options: GitFetchOptions, fetchImpl: FetchLike): Promise<GitRef> {
  const { pin } = options;
  if (FULL_SHA.test(pin)) {
    return { version: pin, ref: pin, sha: pin };
  }

  const tags = await listTags(options, fetchImpl);
  const byVersion = new Map<string, { name: string; sha: string }>();
  for (const tag of tags) {
    const version = semver.valid(cleanTag(tag.name));
    if (version) byVersion.set(version, tag);
  }

  const exact = semver.valid(cleanTag(pin));
  if (exact && byVersion.has(exact)) {
    const tag = byVersion.get(exact)!;
    return { version: exact, ref: tag.name, sha: tag.sha };
  }

  const resolved = semver.maxSatisfying([...byVersion.keys()], pin);
  if (resolved) {
    const tag = byVersion.get(resolved)!;
    return { version: resolved, ref: tag.name, sha: tag.sha };
  }

  // Branch pin: resolve the head SHA so the unpacked dir is content-addressed.
  const api = (options.apiUrl ?? DEFAULT_API).replace(/\/$/, '');
  const res = await fetchImpl(`${api}/repos/${options.repo}/commits/${encodeURIComponent(pin)}`, {
    headers: { accept: 'application/vnd.github+json', ...authHeaders(options.token) },
  });
  if (!res.ok) {
    throw new Error(`No tag satisfies "${pin}" and ref lookup failed: HTTP ${res.status}`);
  }
  const commit = (await res.json()) as { sha: string };
  return { version: commit.sha, ref: commit.sha, sha: commit.sha };
}

/** Semver versions published as tags on the repo (e.g. `v1.2.0` → `1.2.0`). */
export async function listGitTagVersions(
  options: Pick<GitFetchOptions, 'repo' | 'apiUrl' | 'fetchImpl' | 'token'>
): Promise<string[]> {
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const tags = await listTags(options, fetchImpl);
  return tags.map((t) => semver.valid(cleanTag(t.name))).filter((v): v is string => v !== null);
}

async function listTags(
  options: Pick<GitFetchOptions, 'repo' | 'apiUrl' | 'token'>,
  fetchImpl: FetchLike
): Promise<Array<{ name: string; sha: string }>> {
  const api = (options.apiUrl ?? DEFAULT_API).replace(/\/$/, '');
  const res = await fetchImpl(`${api}/repos/${options.repo}/tags?per_page=100`, {
    headers: { accept: 'application/vnd.github+json', ...authHeaders(options.token) },
  });
  if (!res.ok) {
    throw new Error(`Tag listing failed for ${options.repo}: HTTP ${res.status}`);
  }
  const tags = (await res.json()) as Array<{ name: string; commit: { sha: string } }>;
  return tags.map((t) => ({ name: t.name, sha: t.commit.sha }));
}

function cachedGitRelease(
  skillsRoot: string,
  version: string,
  subdir: string
): FetchedRelease | null {
  const skillsDir = path.join(skillsRoot, version, subdir);
  return fs.existsSync(skillsDir) ? { version, skillsDir, fromCache: true } : null;
}

function cleanTag(tag: string): string {
  return tag.replace(/^v/, '');
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}
