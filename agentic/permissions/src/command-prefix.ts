/**
 * Command prefixes: how an "allow again" answer on a plain bash command
 * reaches the next variant of it. A prefix keeps a program's leading words, as
 * many as the arity table gives, so `npm run test -- --watch` saves
 * `npm run test` and later covers `npm run test` with any other arguments.
 */

import { normalizeCommand } from './bash/analyze';
import { type Effect, optionsIn } from './bash/options';
import { gitSubcommand, PROGRAMS } from './bash/programs';
import type { CommandPart, ListedPrefix } from './types';

/**
 * The prefixes "always" may offer and a grant may hold: by the words that name
 * the program, how many leading words a prefix keeps. The longest key wins
 * (`npm run` before `npm test`).
 *
 * A prefix is offered only when its words name an action that runs no code
 * taken from its arguments: a reader or filter by its name, a git or package
 * manager subcommand that acts on this repo, a package script by its name, or
 * an interpreter's script by its path (after `tsx watch` or `node inspect`, too). Anything else keeps the exact command:
 * a program that runs or fetches code named by an argument (`npx`, `npm
 * init`, `pnpm dlx`, `npm install <pkg>`, `go run`, `docker run`, `make`, `gh
 * api`, `git bisect run`), one that writes files (`touch`, `mkdir`, `sort -o`,
 * `tree -o`), one whose options run a program (`rg --pre`, `printf -v`), and
 * any program the table does not list.
 */
const ARITY: ReadonlyMap<string, number> = new Map<string, number>([
  ...[
    'cat',
    'head',
    'tail',
    'wc',
    'ls',
    'pwd',
    'echo',
    'grep',
    'cut',
    'diff',
    'jq',
    'which',
    'stat',
    'du',
    'df',
    'date',
    'sleep',
    'basename',
    'dirname',
    'realpath'
  ].map((name) => [name, 1] as const),
  ...[
    'status',
    'diff',
    'log',
    'show',
    'add',
    'commit',
    'restore',
    'switch',
    'checkout',
    'branch',
    'tag',
    'stash',
    'fetch',
    'pull',
    'push',
    'merge',
    'rebase',
    'cherry-pick',
    'revert',
    'reset',
    'rm',
    'mv',
    'blame',
    'grep',
    'ls-files',
    'rev-parse',
    'describe',
    'shortlog',
    'reflog'
  ].map((sub) => [`git ${sub}`, 2] as const),
  ...['test', 't', 'ls', 'outdated', 'view', 'why', 'explain'].map((sub) => [`npm ${sub}`, 2] as const),
  ...['test', 't', 'ls', 'list', 'outdated', 'why'].map((sub) => [`pnpm ${sub}`, 2] as const),
  ...['test', 'why', 'info'].map((sub) => [`yarn ${sub}`, 2] as const),
  ['bun test', 2],
  ...['node', 'python', 'python3', 'ruby', 'bash', 'sh', 'zsh', 'tsx', 'ts-node'].map((name) => [name, 2] as const),
  ...['npm run', 'pnpm run', 'yarn run', 'bun run'].map((name) => [name, 3] as const),
  ...['tsx watch', 'node inspect'].map((name) => [name, 3] as const)
]);

const LONGEST_KEY = Math.max(...[...ARITY.keys()].map((key) => key.split(' ').length));

/** The most prefixes one grant holds: a card offers the exact command for a longer chain. */
export const MAX_PREFIXES = 5;

/**
 * A word a prefix may keep: plain text, not an option (`-x`, `+x`), quote,
 * expansion or glob, and no `,`, which separates prefixes in the text form.
 */
const PREFIX_WORD = /^[\w@%=:./][\w@%+=:./-]*$/;

/** The table entry the leading words name, longest key first. */
function arityKey(words: readonly string[]): { length: number; arity: number } | null {
  for (let k = Math.min(words.length, LONGEST_KEY); k > 0; k--) {
    const arity = ARITY.get(words.slice(0, k).join(' '));
    if (arity !== undefined) return { length: k, arity };
  }
  return null;
}

/** The first word a prefix may not hold, or `undefined`. */
export function firstNonPrefixWord(words: readonly string[]): string | undefined {
  return words.find((w) => !PREFIX_WORD.test(w));
}

/**
 * Why `words` cannot be a prefix of the table: no listed program starts it,
 * or it stops before the words its entry keeps (`npm run`, `node`). `null`
 * for a listed prefix.
 */
export function prefixShortfall(words: readonly string[]): { unlisted: true } | { short: string } | null {
  const key = arityKey(words);
  if (!key) return { unlisted: true };
  return words.length < key.arity ? { short: words.slice(0, key.length).join(' ') } : null;
}

/**
 * The effects that keep a prefix from covering a part: an option that makes
 * the program run another program, write a file, set config that runs one,
 * move to another dir or send data elsewhere. A part that passes one is never
 * covered by a prefix, and its card offers only the exact command. A read is
 * not one of them: the analysis checks the file it reads like any other path.
 */
const GUARDED: ReadonlySet<Effect> = new Set(['runs-program', 'writes-file', 'sets-config', 'changes-dir', 'sends-to']);

/**
 * The part passes an option with a guarded effect, or an option it cannot
 * read. Its options are read with the program registry's spec, so every
 * spelling the program accepts counts (`-ix` holds `-x`, `--upl` is
 * `--upload-pack`). git's own options come before the subcommand, where no git
 * prefix can match.
 */
function passesRiskyOption(part: CommandPart): boolean {
  if (part.options === null) return true;
  const spec = part.words[0] === 'git' ? gitSubcommand(part.words[1]) : PROGRAMS.get(part.words[0]);
  if (!spec) return false;
  return part.options.some((option) =>
    (optionsIn(spec, option) ?? []).some(({ specs }) => specs.some((s) => s.effect !== undefined && GUARDED.has(s.effect)))
  );
}

/** The prefix "always" saves for one part (`git status`), or `null` when only the exact command fits. */
export function prefixFor(part: CommandPart): ListedPrefix | null {
  if (part.writesFile || passesRiskyOption(part)) return null;
  const key = arityKey(part.words);
  if (!key || part.words.length < key.arity) return null;
  const kept = part.words.slice(0, key.arity);
  return firstNonPrefixWord(kept) === undefined ? (kept.join(' ') as ListedPrefix) : null;
}

/**
 * The part starts with the prefix's words, word by word, the prefix is one
 * the table lists, and the part writes no file and passes no risky option: Ask mode asks before a file change, so only an
 * exact grant of the whole command covers such a part.
 */
export function prefixCovers(prefix: string, part: CommandPart): boolean {
  if (part.writesFile || passesRiskyOption(part)) return false;
  const words = prefix.split(' ');
  if (prefixShortfall(words) !== null || firstNonPrefixWord(words) !== undefined) return false;
  return words.length <= part.words.length && words.every((w, i) => part.words[i] === w);
}

/** The part is exactly `command` and writes no file: an exact grant's share of a longer command. */
export function partIs(command: string, part: CommandPart): boolean {
  return !part.writesFile && normalizeCommand(part.words.join(' ')) === command;
}
