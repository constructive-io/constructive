/**
 * The simple commands of a bash call, for grants that match one command at a
 * time. Only a plain list or pipeline has parts. A keyword (`if`, `for`,
 * `{ … }`), a function, a substitution, a heredoc or here-string, a `\r` or a
 * lexer error leaves it with none, and so does a `cd` (the analyzer checks
 * that), so only an exact grant of the whole command covers it.
 */

import type { CommandPart } from '../types';
import { expandWord } from './braces';
import type { Lexed, Redirect, Word } from './tokenize';
import { SHELL_KEYWORDS } from './words';

/** Words that open a compound command. */
const COMPOUND_OPENERS: ReadonlySet<string> = new Set(['for', 'select', 'case', 'function']);

/** Redirections that only read: a file, a heredoc, a here-string, or a copied input descriptor. */
const INPUT_OPS: ReadonlySet<string> = new Set(['<', '<<', '<<-', '<<<', '<&']);

/**
 * The redirection opens a file for writing. A copied descriptor (`2>&1`) has
 * no target. Only the literal `/dev/null` is exempt: another device or a word
 * with quotes or a variable is not proven harmless.
 */
function writesFile(r: Redirect): boolean {
  return !INPUT_OPS.has(r.op) && r.target !== null && r.target.raw !== '/dev/null';
}

/** The word is a shell keyword or opens a compound command, so it is syntax and not a program. */
export function isShellSyntax(word: string | undefined): boolean {
  return word !== undefined && (SHELL_KEYWORDS.has(word) || COMPOUND_OPENERS.has(word));
}

/** A word's text after quote removal, with the mask of characters brace expansion may act on. */
function literalText(word: Word): { text: string; mask: boolean[] } {
  let text = '';
  const mask: boolean[] = [];
  for (const part of word.parts) {
    const piece = part.kind === 'lit' ? part.text : '~';
    text += piece;
    for (let k = 0; k < piece.length; k++) mask.push(part.kind === 'lit' && !part.quoted);
  }
  return { text, mask };
}

/**
 * The options a part passes, after quote removal and brace expansion. A `--`
 * does not end them: git reads it as the value of an option that takes one
 * and goes on reading options. `null` when a word may hold an option the
 * lexer cannot read: an unquoted variable or an unknown part anywhere in it
 * (word splitting can turn `HEAD$IFS--upload-pack=x` into two words), or a
 * quoted variable at a start that may be an option.
 */
function optionsOf(words: readonly Word[]): string[] | null {
  const options: string[] = [];
  for (const word of words) {
    if (word.parts.some((p) => p.kind === 'unknown' || (p.kind === 'var' && !p.quoted))) return null;
    const open = word.parts.findIndex((p) => p.kind === 'var');
    if (open >= 0) {
      const lead = literalText({ ...word, parts: word.parts.slice(0, open) }).text;
      if (lead === '' || lead.startsWith('-') || lead.includes('{')) return null;
      continue;
    }
    const { text, mask } = literalText(word);
    const expanded: { text: string; mask: boolean[] }[] = [];
    if (!expandWord(text, mask, expanded)) return null;
    for (const e of expanded) if (e.text.startsWith('-')) options.push(e.text);
  }
  return options;
}

export function commandParts(command: string, lexed: Lexed): CommandPart[] | null {
  if (lexed.error || lexed.dynamic.length > 0 || lexed.commands.length === 0 || command.includes('\r')) return null;
  if (lexed.commands.some((cmd) => cmd.stdinDoc || isShellSyntax(cmd.words[0]?.raw))) return null;
  return lexed.commands.map((cmd) => ({
    words: cmd.words.map((w) => w.raw),
    writesFile: cmd.redirects.some(writesFile),
    options: optionsOf(cmd.words)
  }));
}
