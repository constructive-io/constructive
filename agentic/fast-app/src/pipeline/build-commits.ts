// The app's commits: each build's one commit, found again by the mark in its
// message, and the commit of the app's own paths that ends a build or a
// passing verify_app.

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { simpleGit } from 'simple-git';

import { noteActivity, recordActivity } from './activity';
import type { BuildRecord } from './build-record';
import { commitGitPaths, stageGitPaths } from './git-paths';
import { appDirOf } from './snapshot-clone';
import { APP_PATHS } from './touched-files';

export const BUILD_COMMIT_MARK = 'from its app spec';

export function buildCommitMessage(name: string): string {
  return `feat: build ${name} ${BUILD_COMMIT_MARK}`;
}

/** A follow-up's commit; it carries the mark too, so its spec counts as built. */
export function followUpCommitMessage(name: string): string {
  return `feat: update ${name} ${BUILD_COMMIT_MARK}`;
}

/** The commit a build of this kind makes. */
export function buildCommitMessageFor(kind: BuildRecord['kind'], name: string): string {
  return (kind === 'update' ? followUpCommitMessage : buildCommitMessage)(name);
}

export type BuildHistory = {
  /** The build commits on HEAD: 1 until a follow-up plan_app commits. */
  builds: number;
  /** The latest build commit, with its commit time in epoch ms. */
  last: { sha: string; at: number } | null;
  /** Commits after the latest build's: 0 means the app is still the generated one. */
  since: number | null;
};

const NO_BUILDS: BuildHistory = { builds: 0, last: null, since: null };

/** What git knows of the builds: one log of the build commits, one count after the last. */
export async function readBuildHistory(cwd: string): Promise<BuildHistory> {
  try {
    const git = simpleGit(cwd);
    const log = (
      await git.raw(['log', '--format=%H %ct', '--grep', BUILD_COMMIT_MARK, 'HEAD'])
    ).trim();
    if (!log) return NO_BUILDS;
    const lines = log.split('\n');
    const [sha, seconds] = lines[0].split(' ');
    const since = Number((await git.raw(['rev-list', '--count', `${sha}..HEAD`])).trim());
    return { builds: lines.length, last: { sha, at: Number(seconds) * 1000 }, since };
  } catch {
    return NO_BUILDS;
  }
}

/**
 * Whether the record's build still owes its commit: no commit with the build's
 * mark came after it started. The agent's own `git commit -a` has no mark, so
 * it doesn't end a first build.
 */
export function buildCommitOwed(
  record: Pick<BuildRecord, 'startedAt'>,
  history: BuildHistory,
): boolean {
  return !history.last || Date.parse(record.startedAt) > history.last.at;
}

/**
 * One commit of the app, the spec, and the files the caller names; never the
 * whole project, and never what the user staged elsewhere, which stays
 * staged. Nothing to commit is not an error.
 */
export async function commitPhase(
  cwd: string,
  message: string,
  extraPaths: readonly string[] = [],
): Promise<string | null> {
  const git = simpleGit(cwd);
  if (!(await git.checkIsRepo().catch(() => false))) return null;
  const paths = [...APP_PATHS, ...extraPaths].filter((p) => existsSync(path.join(cwd, p)));
  if (!paths.length) return null;
  await stageGitPaths(cwd, paths);
  // Relative to the project, which can be a folder inside a larger repo.
  // Without renames, a moved file lists both its names, so both go in the commit.
  const staged = (
    await git.raw(['diff', '--cached', '--name-only', '--relative', '--no-renames', '--', ...paths])
  )
    .split('\n')
    .filter(Boolean);
  // Only the paths with staged changes: a path git knows nothing of fails the commit.
  const changed = paths.filter((p) =>
    staged.some((file) => file === p || file.startsWith(`${p}/`)),
  );
  if (!changed.length) {
    noteActivity({ kind: 'fact', label: 'Nothing to commit: no file changed' });
    return null;
  }
  const { sha } = await recordActivity(
    { kind: 'commit', label: message, cwd },
    () => commitGitPaths(cwd, message, changed),
    (commit) => ({
      sha: commit.sha.slice(0, 7),
      detail: `${staged.length} file${staged.length === 1 ? '' : 's'}`,
    }),
  );
  return sha;
}

/** What the user lands on after a design pass, for verify_app's nudge. */
export type HomeState = 'generated' | 'unnamed' | 'domain';

const HOME_PAGE = 'src/app/(app)/page.tsx';
const NAV_FILE = 'src/config/nav.ts';

const withoutGeneratedLine = (text: string) =>
  text
    .split('\n')
    .filter((line) => !line.startsWith('// @generated'))
    .join('\n')
    .trim();

const homeNavLine = (text: string) =>
  text.split('\n').find((line) => line.startsWith('export const homeNav')) ?? '';

/**
 * Whether the home page is still the build's generated dashboard, or a new
 * page whose sidebar row keeps the generated name. Deleting the @generated
 * line alone takes ownership without changing what the user lands on, so
 * the body is compared with the build commit's. null when it can't tell.
 */
export async function homeState(cwd: string, buildSha: string): Promise<HomeState | null> {
  try {
    const git = simpleGit(cwd);
    const atBuild = async (rel: string) => {
      const file = path.join(appDirOf(cwd), rel);
      const tracked = path.relative(cwd, file).split(path.sep).join('/');
      return [await git.raw(['show', `${buildSha}:${tracked}`]), await readFile(file, 'utf8')];
    };
    const [homeBefore, homeNow] = await atBuild(HOME_PAGE);
    if (withoutGeneratedLine(homeBefore) === withoutGeneratedLine(homeNow)) return 'generated';
    const [navBefore, navNow] = await atBuild(NAV_FILE);
    // A template without homeNav has no row to name.
    if (homeNavLine(navNow) && homeNavLine(navBefore) === homeNavLine(navNow)) return 'unnamed';
    return 'domain';
  } catch {
    return null;
  }
}
