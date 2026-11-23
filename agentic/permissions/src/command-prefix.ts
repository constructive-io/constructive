/**
 * Command prefixes: how an "allow again" answer on a plain bash command
 * reaches the next variant of it. A prefix keeps a program's leading words, as
 * many as the arity table gives, so `npm run test -- --watch` saves
 * `npm run test` and later covers `npm run test` with any other arguments.
 */

import { normalizeCommand } from './bash/analyze';
import { type Effect, operandEffects, optionsIn } from './bash/options';
import { wordTexts } from './bash/parts';
import { gitSubcommand, PROGRAMS } from './bash/programs';
import type { CommandPart, GrantCaveat, GrantMatch, ListedPrefix } from './types';

/**
 * What a listed prefix's program does: reads or filters (`cat`), reads or adds
 * to a git repo (`git status`), runs the project's tests (`npm test`), reads
 * package data (`npm ls`), runs a package script by its name (`npm run
 * build`), or runs a script by its path (`node scripts/build.js`).
 */
type PrefixClass = 'reader' | 'vcs' | 'test' | 'package-query' | 'package-script' | 'script-runner';

interface PrefixEntry {
  /** How many leading words a prefix keeps. */
  arity: number;
  class: PrefixClass;
}

const entries = (keys: readonly string[], arity: number, cls: PrefixClass) => keys.map((key) => [key, { arity, class: cls }] as const);

/**
 * The prefixes "always" may offer and a grant may hold: by the words that name
 * the program, how many leading words a prefix keeps and its class. The
 * longest key wins (`npm run` before `npm test`).
 *
 * A prefix is offered only when its words name an action that runs no code
 * taken from its arguments: a reader or filter by its name, a git subcommand
 * that only reads or adds to the repo, a package manager subcommand that acts
 * on this repo, a package script by its name, or an interpreter's script by its
 * path (after `tsx watch` or `node inspect`, too). Anything else keeps the
 * exact command: a program that runs or fetches code named by an argument
 * (`npx`, `npm init`, `pnpm dlx`, `npm install <pkg>`, `go run`, `docker run`,
 * `make`, `gh api`, `git bisect run`), one that writes files (`touch`,
 * `mkdir`, `sort -o`, `tree -o`), one whose options run a program (`rg --pre`,
 * `printf -v`), a git subcommand that can discard uncommitted work or rewrite
 * or publish history (`reset`, `rm`, `mv`, `checkout`, `restore`, `switch`,
 * `stash`, `push`, `pull`, `merge`, `rebase`, `cherry-pick`, `revert`), and any
 * program the table does not list.
 */
const ARITY: ReadonlyMap<string, PrefixEntry> = new Map<string, PrefixEntry>([
  ...entries(
    [
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
    ],
    1,
    'reader'
  ),
  ...entries(
    [
      'status',
      'diff',
      'log',
      'show',
      'add',
      'commit',
      'branch',
      'tag',
      'fetch',
      'blame',
      'grep',
      'ls-files',
      'rev-parse',
      'describe',
      'shortlog',
      'reflog'
    ].map((sub) => `git ${sub}`),
    2,
    'vcs'
  ),
  ...entries(['npm test', 'npm t', 'pnpm test', 'pnpm t', 'yarn test', 'bun test'], 2, 'test'),
  ...entries(
    [
      ...['ls', 'outdated', 'view', 'why', 'explain'].map((sub) => `npm ${sub}`),
      ...['ls', 'list', 'outdated', 'why'].map((sub) => `pnpm ${sub}`),
      ...['why', 'info'].map((sub) => `yarn ${sub}`)
    ],
    2,
    'package-query'
  ),
  ...entries(['npm run', 'pnpm run', 'yarn run', 'bun run'], 3, 'package-script'),
  ...entries(['node', 'python', 'python3', 'ruby', 'bash', 'sh', 'zsh', 'tsx', 'ts-node'], 2, 'script-runner'),
  ...entries(['tsx watch', 'node inspect'], 3, 'script-runner')
]);

/** The caveat a host shows beside a prefix of each class. */
const CLASS_CAVEAT: Readonly<Record<PrefixClass, GrantCaveat | undefined>> = {
  reader: undefined,
  vcs: undefined,
  test: 'script-unchecked',
  'package-query': undefined,
  'package-script': 'script-unchecked',
  'script-runner': 'script-unchecked'
};

const LONGEST_KEY = Math.max(...[...ARITY.keys()].map((key) => key.split(' ').length));

/** The most prefixes one grant holds: a card offers the exact command for a longer chain. */
export const MAX_PREFIXES = 5;

/**
 * A word a prefix may keep: plain text, not an option (`-x`, `+x`), quote,
 * expansion or glob, and no `,`, which separates prefixes in the text form.
 */
const PREFIX_WORD = /^[\w@%=:./][\w@%+=:./-]*$/;

/** The table entry the leading words name, longest key first, with the number of words its key has. */
function arityKey(words: readonly string[]): (PrefixEntry & { length: number }) | null {
  for (let k = Math.min(words.length, LONGEST_KEY); k > 0; k--) {
    const entry = ARITY.get(words.slice(0, k).join(' '));
    if (entry !== undefined) return { ...entry, length: k };
  }
  return null;
}

/**
 * The caveat a host shows beside a stored or offered grant, from the class of
 * each prefix the table lists: `script-unchecked` when one runs a script the
 * kit never reads (by its path, a package script, or the project's tests). An
 * exact command, a path grant and an unlisted prefix get none.
 */
export function grantCaveat(match: GrantMatch): GrantCaveat | undefined {
  if (match.type !== 'command-prefix') return undefined;
  for (const prefix of match.prefixes) {
    const cls = listedClass(prefix);
    if (cls !== undefined && CLASS_CAVEAT[cls] !== undefined) return CLASS_CAVEAT[cls];
  }
  return undefined;
}

/** The class of a prefix the table lists, at least as long as its entry, or `undefined`. */
function listedClass(prefix: string): PrefixClass | undefined {
  const words = prefix.split(' ');
  const key = arityKey(words);
  return key && words.length >= key.arity ? key.class : undefined;
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
const GUARDED: ReadonlySet<Effect> = new Set(['runs-program', 'writes-file', 'sets-config', 'changes-dir', 'sends-to', 'rewrites-history']);

/**
 * The part passes an option or an operand form with a guarded effect, or one
 * it cannot read. Options are read with the program registry's spec, so every
 * spelling the program accepts counts (`-ix` holds `-x`, `--upl` is
 * `--upload-pack`); operand forms are read after quote removal (`'delete'`).
 * git's own options come before the subcommand, where no git prefix can match.
 */
function passesRiskyOption(part: CommandPart): boolean {
  if (part.options === null) return true;
  const git = part.words[0] === 'git';
  const spec = git ? gitSubcommand(part.words[1]) : PROGRAMS.get(part.words[0]);
  if (!spec) return false;
  const guarded = (effect: Effect | undefined) => effect !== undefined && GUARDED.has(effect);
  if (part.options.some((option) => (optionsIn(spec, option) ?? []).some(({ specs }) => specs.some((s) => guarded(s.effect))))) return true;
  if (!spec.operandEffects) return false;
  const texts = wordTexts(part.words);
  return texts === null || operandEffects(spec, texts.slice(git ? 2 : 1)).some(guarded);
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

/** The part, its input redirections included, is exactly `command`, and it writes no file: an exact grant's share of a longer command. */
export function partIs(command: string, part: CommandPart): boolean {
  return !part.writesFile && normalizeCommand([...part.words, ...part.inputs].join(' ')) === command;
}
