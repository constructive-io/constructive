/**
 * The text form of a command grant: what a card and the Settings editor show,
 * and what a person types there, always with the rule's kind beside it. A
 * prefix rule's text is its prefixes, separated by commas (`git status, npm
 * run test`). An exact rule's text is one command as written, `*` and commas
 * kept (`rm *`, `echo a, b`). The kind says which, so every text reads back
 * to the grant it came from.
 */

import { hasPlaceholder, MAX_COMMAND_LENGTH, normalizeCommand } from './bash/analyze';
import { isShellSyntax } from './bash/parts';
import { tokenize } from './bash/tokenize';
import { firstNonPrefixWord, grantCaveat, MAX_PREFIXES, prefixShortfall } from './command-prefix';
import { RULE_REFUSAL } from './grant-copy';
import type { CommandKey, CommandMatch, CommandPattern, CommandPrefixMatch, GrantCaveat, ListedPrefix } from './types';

/**
 * A typed pattern read back: the match, with the caveat a host shows beside it
 * when it needs one, or a short plain reason that says what is wrong and how
 * to fix it.
 */
export type CommandPatternResult =
  | { ok: true; match: CommandMatch | CommandPrefixMatch; caveat?: GrantCaveat }
  | { ok: false; reason: string };

type PrefixResult = { ok: true; prefix: ListedPrefix } | { ok: false; reason: string };

const refused = (reason: string): { ok: false; reason: string } => ({ ok: false, reason });

/** The kind and text a command grant shows and the Settings editor takes: `{ kind: 'prefix', text: 'git status, npm run test' }`. */
export function commandPattern(match: CommandMatch | CommandPrefixMatch): CommandPattern {
  return match.type === 'command' ? { kind: 'exact', text: match.command } : { kind: 'prefix', text: match.prefixes.join(', ') };
}

/** The prefix ends in a lone `*`, and `bad`, its first word a prefix may not keep, is that `*`. */
function endsInStar(words: readonly string[], bad: string): boolean {
  return bad === '*' && words.length > 1 && words.indexOf('*') === words.length - 1;
}

/** One typed prefix (`git status`), read by the rules a card's prefixes follow. */
function readPrefix(piece: string): PrefixResult {
  const text = normalizeCommand(piece);
  const lexed = tokenize(text);
  if (lexed.error || lexed.dynamic.length > 0) return refused(RULE_REFUSAL.shellCode(piece));
  if (lexed.commands.length > 1) return refused(RULE_REFUSAL.severalCommands(piece));
  const cmd = lexed.commands[0];
  if (cmd?.redirects.length > 0) return refused(RULE_REFUSAL.redirection(piece));
  const words = cmd?.words.map((w) => w.raw) ?? [];
  if (words.join(' ') !== text) return refused(RULE_REFUSAL.shellCode(piece));
  if (isShellSyntax(words[0])) return refused(RULE_REFUSAL.shellKeyword(words[0]));
  const bad = firstNonPrefixWord(words);
  if (bad === undefined) return listed(piece, words) ?? { ok: true, prefix: text as string as ListedPrefix };
  if (endsInStar(words, bad)) return refused(RULE_REFUSAL.trailingStar(piece));
  if (bad.includes('*')) return refused(RULE_REFUSAL.star(piece));
  if (bad.startsWith('-')) return refused(RULE_REFUSAL.option(bad));
  return refused(RULE_REFUSAL.notPlainWord(bad));
}

/** A refusal when the table does not list the prefix, or `null`. */
function listed(piece: string, words: readonly string[]): PrefixResult | null {
  const shortfall = prefixShortfall(words);
  if (shortfall === null) return null;
  return refused('short' in shortfall ? RULE_REFUSAL.tooBroad(piece, shortfall.short) : RULE_REFUSAL.unlisted(piece));
}

function readPrefixes(text: string): CommandPatternResult {
  const pieces = text.split(',').map((piece) => normalizeCommand(piece));
  if (pieces.includes('' as CommandKey)) return refused(RULE_REFUSAL.extraComma);
  const prefixes = new Set<ListedPrefix>();
  for (const piece of pieces) {
    const read = readPrefix(piece);
    if (read.ok === false) return read;
    prefixes.add(read.prefix);
  }
  if (prefixes.size > MAX_PREFIXES) return refused(RULE_REFUSAL.tooManyPrefixes(MAX_PREFIXES, prefixes.size));
  const match: CommandPrefixMatch = { type: 'command-prefix', prefixes: [...prefixes] };
  const caveat = grantCaveat(match);
  return caveat === undefined ? { ok: true, match } : { ok: true, match, caveat };
}

/**
 * The exact-grant key of a command, or why it has none: a blank command
 * (empty, or only blanks and newlines) runs nothing, a `«secret:…»`
 * placeholder asks every time, and the engine checks no command longer than
 * 64 KB. A card's option, a stored grant and a typed rule all get their key
 * here.
 */
export function exactKey(command: string): { ok: true; key: CommandKey } | { ok: false; reason: string } {
  if (command.trim() === '') return refused(RULE_REFUSAL.empty('exact'));
  if (command.length > MAX_COMMAND_LENGTH) return refused(RULE_REFUSAL.tooLong);
  const key = normalizeCommand(command);
  if (hasPlaceholder(key)) return refused(RULE_REFUSAL.placeholder);
  return { ok: true, key };
}

function readExact(text: string): CommandPatternResult {
  const read = exactKey(text);
  return read.ok === false ? read : { ok: true, match: { type: 'command', command: read.key } };
}

/** `prefix` is one the table lists, written the way a card saves it. */
export function isStoredPrefix(prefix: string): prefix is ListedPrefix {
  if (prefix === '') return false;
  const read = readPrefix(prefix);
  return read.ok && read.prefix === prefix;
}

/** `command` is an exact-grant key the engine could have saved: its own key. */
export function isExactKey(command: string): command is CommandKey {
  const read = exactKey(command);
  return read.ok && read.key === command;
}

/** A rule a person typed, read back into a command match of its kind by the rules the engine matches with. */
export function parseCommandPattern(pattern: CommandPattern): CommandPatternResult {
  const { kind, text } = pattern;
  switch (kind) {
  case 'prefix':
    if (text.trim() === '') return refused(RULE_REFUSAL.empty(kind));
    if (text.length > MAX_COMMAND_LENGTH) return refused(RULE_REFUSAL.tooLong);
    return readPrefixes(text);
  case 'exact':
    return readExact(text);
  default:
    throw new Error(
      `permissions: parseCommandPattern could not read a rule of kind ${JSON.stringify(kind satisfies never)}. Pass 'prefix' or 'exact', and check the kind where the host reads it from a file or a message.`
    );
  }
}
