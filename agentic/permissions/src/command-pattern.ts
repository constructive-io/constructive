/**
 * The text form of a command grant: what a card and the Settings editor show,
 * and what a person types there. Prefixes end in ` *` and are separated by
 * commas (`git status *, npm run test *`). Text with no such ending is one
 * exact command, commas included (`echo a, b`).
 */

import { hasPlaceholder, MAX_COMMAND_LENGTH, normalizeCommand, trimBlanks } from './bash/analyze';
import { isShellSyntax } from './bash/parts';
import { tokenize } from './bash/tokenize';
import { firstNonPrefixWord, MAX_PREFIXES, prefixShortfall } from './command-prefix';
import type { CommandKey, CommandMatch, CommandPrefixMatch, ListedPrefix } from './types';

/** A typed pattern read back: the match, or a short plain reason that says what is wrong and how to fix it. */
export type CommandPatternResult = { ok: true; match: CommandMatch | CommandPrefixMatch } | { ok: false; reason: string };

type PrefixResult = { ok: true; prefix: ListedPrefix } | { ok: false; reason: string };

const PREFIX_END = ' *';

/** The text a command grant shows and the Settings editor takes: `pnpm test` or `git status *, npm run test *`. */
export function commandPattern(match: CommandMatch | CommandPrefixMatch): string {
  return match.type === 'command' ? match.command : match.prefixes.map((p) => `${p}${PREFIX_END}`).join(', ');
}

function isPrefixPiece(piece: string): boolean {
  return piece === '*' || piece.endsWith(PREFIX_END);
}

function shellCode(piece: string): PrefixResult {
  return { ok: false, reason: `\`${piece}\` holds shell code a rule can't match. Use plain words, or save the exact command instead.` };
}

/** One typed prefix (`git status *`), read by the rules a card's prefixes follow. */
function readPrefix(piece: string): PrefixResult {
  const text = normalizeCommand(piece.slice(0, -1));
  if (text === '') return { ok: false, reason: 'Add the command before `*`, as in `git status *`.' };
  const lexed = tokenize(text);
  if (lexed.error || lexed.dynamic.length > 0) return shellCode(piece);
  if (lexed.commands.length > 1) {
    return {
      ok: false,
      reason: `\`${piece}\` holds more than one command. Write each one as its own prefix, separated by commas.`
    };
  }
  const cmd = lexed.commands[0];
  if (cmd?.redirects.length > 0) return { ok: false, reason: `A prefix can't hold a redirection. Remove it from \`${piece}\`.` };
  const words = cmd?.words.map((w) => w.raw) ?? [];
  if (words.join(' ') !== text) return shellCode(piece);
  if (isShellSyntax(words[0])) {
    return { ok: false, reason: `A prefix can't start with the shell keyword \`${words[0]}\`. Start it with the program name.` };
  }
  const bad = firstNonPrefixWord(words);
  if (bad === undefined) return listed(piece, words) ?? { ok: true, prefix: text as string as ListedPrefix };
  if (bad.includes('*')) {
    return { ok: false, reason: `A \`*\` can only end a prefix, as in \`git status *\`. Remove the other \`*\` in \`${piece}\`.` };
  }
  if (bad.startsWith('-')) {
    return {
      ok: false,
      reason: `A prefix can't hold an option such as \`${bad}\`, because options can change what the command runs. Save the exact command instead.`
    };
  }
  return {
    ok: false,
    reason: `A prefix can only hold plain words, and \`${bad}\` isn't one. Write the word without quotes or \`$\`, or save the exact command instead.`
  };
}

/** A refusal when the table does not list the prefix, or `null`. */
function listed(piece: string, words: readonly string[]): PrefixResult | null {
  const shortfall = prefixShortfall(words);
  if (shortfall === null) return null;
  if ('short' in shortfall) {
    return { ok: false, reason: `\`${piece}\` is too broad. Add the script name after \`${shortfall.short}\`.` };
  }
  return {
    ok: false,
    reason: `\`${piece}\` isn't on the prefix list, so a rule can't cover its later runs. Use a listed prefix, such as \`git status *\` or \`npm run test *\`, or save the exact command instead.`
  };
}

function readExact(text: string): CommandPatternResult {
  const command = normalizeCommand(text);
  if (hasPlaceholder(command)) {
    return {
      ok: false,
      reason: 'A command with a `«secret:…»` placeholder asks every time, so this rule would never apply. Remove the placeholder.'
    };
  }
  return { ok: true, match: { type: 'command', command } };
}

/** `prefix` is one the table lists, written the way a card saves it. */
export function isStoredPrefix(prefix: string): prefix is ListedPrefix {
  const read = readPrefix(`${prefix}${PREFIX_END}`);
  return read.ok && read.prefix === prefix;
}

/** `command` is an exact-grant key the engine could have saved: its own normalized form, within the length cap. */
export function isExactKey(command: string): command is CommandKey {
  if (command === '' || command.length > MAX_COMMAND_LENGTH) return false;
  const read = readExact(command);
  return read.ok && read.match.type === 'command' && read.match.command === command;
}

/** A pattern a person typed, read back into a command match by the rules the engine matches with. */
export function parseCommandPattern(text: string): CommandPatternResult {
  if (text.trim() === '') return { ok: false, reason: 'Type a command, such as `pnpm test`, or a prefix, such as `git status *`.' };
  if (text.length > MAX_COMMAND_LENGTH) {
    return {
      ok: false,
      reason: `This rule is longer than ${MAX_COMMAND_LENGTH / 1024} KB, and the engine checks no command longer than that. Shorten it, or split it into several rules.`
    };
  }
  const trimmed = trimBlanks(text);
  const pieces = trimmed.split(',').map(trimBlanks);
  const starred = pieces.filter(isPrefixPiece).length;
  if (starred === 0) return readExact(trimmed);
  if (starred < pieces.length) {
    const reason = pieces.every((p) => p === '' || isPrefixPiece(p))
      ? 'Remove the extra comma.'
      : 'Use either prefixes or one exact command. End every part with ` *`, or remove each ` *` to save the exact command.';
    return { ok: false, reason };
  }
  const prefixes = new Set<ListedPrefix>();
  for (const piece of pieces) {
    const read = readPrefix(piece);
    if (read.ok === false) return read;
    prefixes.add(read.prefix);
  }
  if (prefixes.size > MAX_PREFIXES) {
    return {
      ok: false,
      reason: `A rule can hold at most ${MAX_PREFIXES} prefixes, and this one has ${prefixes.size}. Split it into two rules.`
    };
  }
  return { ok: true, match: { type: 'command-prefix', prefixes: [...prefixes] } };
}
