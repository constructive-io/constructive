/**
 * Command prefixes: how an "allow again" answer on a plain bash command
 * reaches the next variant of it. A prefix keeps a program's leading words, as
 * many as the arity table gives, so `npm run test -- --watch` saves
 * `npm run test` and later covers `npm run test` with any other arguments.
 */

import { normalizeCommand } from './bash/analyze';
import type { CommandPart } from './types';

/**
 * How many leading words a prefix keeps, by the words that name the program;
 * the longest key wins (`npm run` before `npm`). It lists programs whose
 * leading words say what a run does: a reader or filter by its name, a tool by
 * its subcommand, a script runner by its script. A program that is not listed
 * gets no prefix (its grant stays the exact command): an unknown CLI may hide
 * very different actions behind one name, and `rm`, `mv`, `sed` or `xargs`
 * would cover far more than the run the user saw.
 */
const ARITY: ReadonlyMap<string, number> = new Map([
  ...[
    'cat',
    'head',
    'tail',
    'less',
    'wc',
    'ls',
    'tree',
    'pwd',
    'echo',
    'printf',
    'grep',
    'rg',
    'sort',
    'uniq',
    'cut',
    'diff',
    'jq',
    'which',
    'file',
    'stat',
    'du',
    'df',
    'date',
    'sleep',
    'basename',
    'dirname',
    'realpath',
    'mkdir',
    'touch',
    'cd',
    'jest',
    'vitest',
    'pytest',
    'tsc',
    'eslint',
    'prettier'
  ].map((name) => [name, 1] as const),
  ...[
    'git',
    'npm',
    'npx',
    'pnpm',
    'yarn',
    'bun',
    'bunx',
    'deno',
    'docker',
    'podman',
    'kubectl',
    'helm',
    'cargo',
    'go',
    'make',
    'pip',
    'pip3',
    'uv',
    'poetry',
    'brew',
    'node',
    'python',
    'python3',
    'ruby',
    'bash',
    'sh',
    'zsh',
    'tsx',
    'ts-node'
  ].map((name) => [name, 2] as const),
  ...[
    'npm run',
    'npm exec',
    'pnpm run',
    'pnpm exec',
    'pnpm dlx',
    'yarn run',
    'bun run',
    'deno task',
    'uv run',
    'poetry run',
    'docker compose',
    'python -m',
    'python3 -m',
    'gh'
  ].map((name) => [name, 3] as const)
]);

const LONGEST_KEY = Math.max(...[...ARITY.keys()].map((key) => key.split(' ').length));

/** A word a prefix may keep past its key: plain text, not an option, quote, expansion or glob. */
const PREFIX_WORD = /^[\w@%+=:,./][\w@%+=:,./-]*$/;

/** The prefix "always" saves for one part (`git status`), or `null` when only the exact command fits. */
export function prefixFor(part: CommandPart): string | null {
  if (part.redirected) return null;
  const { words } = part;
  for (let k = Math.min(words.length, LONGEST_KEY); k > 0; k--) {
    const arity = ARITY.get(words.slice(0, k).join(' '));
    if (arity === undefined) continue;
    if (words.length < arity) return null;
    const kept = words.slice(0, arity);
    return kept.slice(k).every((w) => PREFIX_WORD.test(w)) ? kept.join(' ') : null;
  }
  return null;
}

/**
 * The part starts with the prefix's words, word by word, and has no
 * redirection: a redirection can write a file, which Ask mode asks about, so
 * only an exact grant of the whole command covers a part with one.
 */
export function prefixCovers(prefix: string, part: CommandPart): boolean {
  if (part.redirected) return false;
  const words = prefix.split(' ');
  return words.length <= part.words.length && words.every((w, i) => part.words[i] === w);
}

/** The part is exactly `command`, with no redirection: an exact grant's share of a longer command. */
export function partIs(command: string, part: CommandPart): boolean {
  return !part.redirected && normalizeCommand(part.words.join(' ')) === command;
}

/** A prefix as the user reads it: `git status *`. */
export function showPrefix(prefix: string): string {
  return `${prefix} *`;
}
