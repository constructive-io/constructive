/**
 * The simple commands of a bash call, for grants that match one command at a
 * time. Only a plain list or pipeline has parts. A keyword (`if`, `for`,
 * `{ … }`), a function, a substitution, a heredoc or here-string, a `\r` or a
 * lexer error leaves it with none, and so does a `cd` (the analyzer checks
 * that), so only an exact grant of the whole command covers it.
 */

import type { CommandPart } from '../types';
import { unreachable } from '../unreachable';
import { expandWord,ExpansionBudget, type ExpansionScope } from './expand';
import { type Lexed, readsStdinDoc, type Redirect, type Word } from './tokenize';
import { SHELL_KEYWORDS } from './words';

/** Words that open a compound command. */
const COMPOUND_OPENERS: ReadonlySet<string> = new Set(['for', 'select', 'case', 'function']);

/**
 * The redirection opens a file for writing. Input (`<`, a heredoc, a
 * here-string) and a copied descriptor (`2>&1`) do not. Only the literal
 * `/dev/null` is exempt: another device or a word with quotes or a variable
 * is not proven harmless.
 */
function writesFile(r: Redirect): boolean {
  switch (r.kind) {
  case 'file':
    return r.op !== '<' && r.op !== '<&' && r.target.raw !== '/dev/null';
  case 'dup':
  case 'heredoc':
  case 'here-string':
    return false;
  default:
    return unreachable(r);
  }
}

/** The word is a shell keyword or opens a compound command, so it is syntax and not a program. */
export function isShellSyntax(word: string | undefined): boolean {
  return word !== undefined && (SHELL_KEYWORDS.has(word) || COMPOUND_OPENERS.has(word));
}

/** Option words hold no variable here, so their expansion needs nothing from the analysis. */
const LITERAL_SCOPE: ExpansionScope = {
  home: '~',
  value: () => null,
  ifsMayDiffer: () => false,
  noteRef: () => undefined,
  dynamic: () => undefined
};

/** The texts a word of literals expands to: after braces, tilde and quote removal. */
function literalTexts(word: Word, budget: ExpansionBudget): string[] {
  return expandWord(word, 'argument', LITERAL_SCOPE, budget).map((arg) => (arg.kind === 'known' ? arg.text : arg.knownPrefix));
}

/**
 * The options a part passes, after quote removal and brace expansion. A `--`
 * does not end them: git reads it as the value of an option that takes one
 * and goes on reading options. `null` when a word may hold an option the
 * lexer cannot read: an unquoted variable or an unknown part anywhere in it
 * (word splitting can turn `HEAD$IFS--upload-pack=x` into two words), or a
 * quoted variable at a start that may be an option.
 */
function optionsOf(words: readonly Word[], budget: ExpansionBudget, spent: () => boolean): string[] | null {
  const options: string[] = [];
  for (const word of words) {
    if (word.parts.some((p) => p.kind === 'unknown' || (p.kind === 'var' && !p.quoted))) return null;
    const open = word.parts.findIndex((p) => p.kind === 'var');
    if (open >= 0) {
      const lead = word.parts
        .slice(0, open)
        .map((p) => (p.kind === 'lit' ? p.text : ''))
        .join('');
      if (lead === '' || lead.startsWith('-') || lead.includes('{')) return null;
      continue;
    }
    for (const text of literalTexts(word, budget)) if (text.startsWith('-')) options.push(text);
    if (spent()) return null;
  }
  return options;
}

export function commandParts(command: string, lexed: Lexed): CommandPart[] | null {
  if (lexed.error || lexed.dynamic.length > 0 || lexed.commands.length === 0 || command.includes('\r')) return null;
  if (lexed.commands.some((cmd) => readsStdinDoc(cmd) || isShellSyntax(cmd.words[0]?.raw))) return null;
  let spent = false;
  const budget = new ExpansionBudget(() => {
    spent = true;
  });
  return lexed.commands.map((cmd) => ({
    words: cmd.words.map((w) => w.raw),
    writesFile: cmd.redirects.some(writesFile),
    options: optionsOf(cmd.words, budget, () => spent)
  }));
}
