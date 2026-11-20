// Git on named paths only: the app's commits stage and commit the paths they
// name, never the whole project (build-commits.ts, snapshot-clone.ts). The
// desktop's Git panel uses the same steps (git/git.ts).

import path from 'node:path';

import { simpleGit } from 'simple-git';

// Reject any project-relative path that escapes the repo root. The change-list
// paths always come from `git status` (already within the repo), but the IPCs
// are reachable directly, so guard them like the other filesystem mutations.
export function assertWithinRoot(cwd: string, relPath: string): void {
  const root = path.resolve(cwd);
  const target = path.resolve(root, relPath);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Path escapes project root');
  }
}

export async function stageGitPaths(cwd: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  for (const p of paths) assertWithinRoot(cwd, p);
  await simpleGit(cwd).add(paths);
}

/** Commits only these paths (`git commit -- <paths>`); what is staged elsewhere stays staged. */
export async function commitGitPaths(
  cwd: string,
  message: string,
  paths: readonly string[],
): Promise<{ sha: string }> {
  const trimmed = message.trim();
  if (trimmed === '') throw new Error('Commit message is empty');
  if (paths.length === 0) throw new Error('No paths to commit');
  for (const p of paths) assertWithinRoot(cwd, p);
  const git = simpleGit(cwd);
  await git.raw(['commit', '-m', trimmed, '--', ...paths]);
  return { sha: (await git.revparse(['HEAD'])).trim() };
}
