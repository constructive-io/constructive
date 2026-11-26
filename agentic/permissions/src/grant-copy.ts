/**
 * Every sentence a person reads about a grant: the labels of a card's
 * options, what Settings lists for a rule, and why the Settings editor
 * refuses a typed rule. Labels are plain text. A refusal marks each command,
 * word or character it quotes with backticks, so a host can show it as code.
 */

import { MAX_COMMAND_LENGTH } from './bash/analyze';
import { displayDir } from './paths';
import type { Access, CommandRuleKind, GrantMatch, GrantScope } from './types';

export const ACCESS_VERB: Readonly<Record<Access, string>> = { read: 'reads', write: 'writes', exec: 'runs' };

/** `a`, `a or b`, `a, b or c`. */
function anyOf(items: readonly string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/** What a grant covers, in words: "commands that start with git status or npm test", "exactly: rm *", "reads in ~/work/lib/". */
export function describeGrant(match: GrantMatch, homeDir: string): string {
  switch (match.type) {
  case 'command-prefix':
    return `commands that start with ${anyOf(match.prefixes)}`;
  case 'command':
    return `exactly: ${match.command}`;
  case 'path':
    return `${ACCESS_VERB[match.access]} in ${displayDir(match.pathPrefix, homeDir)}`;
  }
}

/** The label of the card option that saves `match` for `scope`. */
export function grantOptionLabel(scope: GrantScope, match: GrantMatch, homeDir: string): string {
  return scope === 'chat' ? 'Allow in this chat' : `Always allow ${describeGrant(match, homeDir)}`;
}

/** Why the Settings editor refuses a typed rule: what is wrong, then how to fix it. */
export const RULE_REFUSAL = {
  empty: (kind: CommandRuleKind): string =>
    kind === 'prefix' ? 'Type the words a command starts with, such as `git status`.' : 'Type a command, such as `pnpm test`.',
  tooLong: `This rule is longer than ${MAX_COMMAND_LENGTH / 1024} KB, and the engine checks no command longer than that. Shorten it, or split it into several rules.`,
  placeholder: 'A command with a `«secret:…»` placeholder asks every time, so this rule would never apply. Remove the placeholder.',
  extraComma: 'Remove the extra comma.',
  tooManyPrefixes: (max: number, count: number): string =>
    `A rule can hold at most ${max} prefixes, and this one has ${count}. Split it into two rules.`,
  shellCode: (prefix: string): string => `\`${prefix}\` holds shell code a rule can't match. Use plain words, or save the exact command instead.`,
  severalCommands: (prefix: string): string =>
    `\`${prefix}\` holds more than one command. Write each one as its own prefix, separated by commas.`,
  redirection: (prefix: string): string => `A prefix can't hold a redirection. Remove it from \`${prefix}\`.`,
  shellKeyword: (word: string): string => `A prefix can't start with the shell keyword \`${word}\`. Start it with the program name.`,
  trailingStar: (prefix: string): string => `A prefix already covers whatever comes after its words. Remove the \`*\` from \`${prefix}\`.`,
  star: (prefix: string): string => `A prefix can't hold a \`*\`. Remove it from \`${prefix}\`, or save the exact command instead.`,
  option: (word: string): string =>
    `A prefix can't hold an option such as \`${word}\`, because options can change what the command runs. Save the exact command instead.`,
  notPlainWord: (word: string): string =>
    `A prefix can only hold plain words, and \`${word}\` isn't one. Write the word without quotes or \`$\`, or save the exact command instead.`,
  tooBroad: (prefix: string, entry: string): string => `\`${prefix}\` is too broad. Add the script name after \`${entry}\`.`,
  unlisted: (prefix: string): string =>
    `\`${prefix}\` isn't on the prefix list, so a rule can't cover its later runs. Use a listed prefix, such as \`git status\` or \`npm run test\`, or save the exact command instead.`
} as const;
