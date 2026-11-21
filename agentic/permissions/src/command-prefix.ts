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

/** The most prefixes one grant holds: a card offers the exact command for a longer chain. */
export const MAX_PREFIXES = 5;

/** A word a prefix may keep past its key: plain text, not an option, quote, expansion or glob. */
const PREFIX_WORD = /^[\w@%+=:,./][\w@%+=:,./-]*$/;

/** The table entry the leading words name, longest key first. */
function arityKey(words: readonly string[]): { length: number; arity: number } | null {
  for (let k = Math.min(words.length, LONGEST_KEY); k > 0; k--) {
    const arity = ARITY.get(words.slice(0, k).join(' '));
    if (arity !== undefined) return { length: k, arity };
  }
  return null;
}

/** The first word a prefix may not hold, or `undefined`. A table key's own words count as plain (`python -m`). */
export function firstNonPrefixWord(words: readonly string[]): string | undefined {
  return words.slice(arityKey(words)?.length ?? 0).find((w) => !PREFIX_WORD.test(w));
}

/**
 * Options that make a listed program run another program or write a file the
 * analysis cannot place, by the program or by the program and subcommand. A
 * part that passes one is never covered by a prefix, and its card offers only
 * the exact command. A short option also matches inside a cluster (`-ix`), and
 * a long one by an abbreviation (`--upl`), because git and getopt accept both.
 * git's own `-c`, `--config-env` and `--exec-path` come before the subcommand,
 * where no git prefix can match; after it, `-c` means "create" or "count".
 */
const PACKAGE_MANAGER_RISKY = ['--script-shell', '--node-options', '--userconfig', '--globalconfig', '--config', '--prefix', '-C', '--dir', '--cwd'];

const RISKY_OPTIONS: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  [
    'git',
    [
      '--output',
      '--ext-diff',
      '--textconv',
      '-O',
      '--open-files-in-pager',
      '-x',
      '--exec',
      '--upload-pack',
      '--receive-pack',
      '--repo',
      '--config-env',
      '--exec-path'
    ]
  ],
  ['git fetch', ['-u']],
  ['git pull', ['-u']],
  ['npm', PACKAGE_MANAGER_RISKY],
  ['pnpm', PACKAGE_MANAGER_RISKY],
  ['yarn', PACKAGE_MANAGER_RISKY],
  ['bun', ['--preload', '-r', '--require', '--config', '-c', '--cwd']]
]);

function optionMatches(option: string, denied: string): boolean {
  if (!denied.startsWith('--')) return !option.startsWith('--') && option.slice(1).includes(denied.slice(1));
  const name = option.split('=')[0];
  return option.startsWith('--') && name.length > 2 && (denied.startsWith(name) || name.startsWith(denied));
}

/** The part passes a risky option, or an option it cannot read. */
function passesRiskyOption(part: CommandPart): boolean {
  if (part.options === null) return true;
  const denied = [part.words[0], part.words.slice(0, 2).join(' ')].flatMap((key) => RISKY_OPTIONS.get(key) ?? []);
  return part.options.some((option) => denied.some((d) => optionMatches(option, d)));
}

/** The prefix "always" saves for one part (`git status`), or `null` when only the exact command fits. */
export function prefixFor(part: CommandPart): string | null {
  if (part.writesFile || passesRiskyOption(part)) return null;
  const key = arityKey(part.words);
  if (!key || part.words.length < key.arity) return null;
  const kept = part.words.slice(0, key.arity);
  return firstNonPrefixWord(kept) === undefined ? kept.join(' ') : null;
}

/**
 * The part starts with the prefix's words, word by word, writes no file and
 * passes no risky option: Ask mode asks before a file change, so only an
 * exact grant of the whole command covers such a part.
 */
export function prefixCovers(prefix: string, part: CommandPart): boolean {
  if (part.writesFile || passesRiskyOption(part)) return false;
  const words = prefix.split(' ');
  return words.length <= part.words.length && words.every((w, i) => part.words[i] === w);
}

/** The part is exactly `command` and writes no file: an exact grant's share of a longer command. */
export function partIs(command: string, part: CommandPart): boolean {
  return !part.writesFile && normalizeCommand(part.words.join(' ')) === command;
}
