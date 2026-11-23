/**
 * git subcommands that can discard uncommitted work, or rewrite or publish
 * history, each with a run of it. The prefix table lists none of them, so a
 * card offers only the exact command, and a held prefix for one covers
 * nothing: the prefix-guard tests check the kit, and the coverage oracle
 * counts none of these prefixes as covered.
 */
export const EXACT_ONLY_GIT: readonly string[] = [
  'git reset HEAD~1',
  'git rm src/a.ts',
  'git mv a.ts b.ts',
  'git checkout -- src',
  'git restore src/a.ts',
  'git switch main',
  'git stash drop',
  'git push origin main',
  'git pull origin main',
  'git merge feature',
  'git rebase main',
  'git cherry-pick abc123',
  'git revert HEAD'
];

/** The two-word prefix of each one (`git push`). */
export const EXACT_ONLY_PREFIXES: readonly string[] = EXACT_ONLY_GIT.map((command) => command.split(' ').slice(0, 2).join(' '));
