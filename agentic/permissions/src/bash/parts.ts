/**
 * The simple commands of a bash call, for grants that match one command at a
 * time. Only a plain list or pipeline has parts. A keyword (`if`, `for`,
 * `{ … }`), a function, a substitution or a lexer error leaves it with none,
 * so only an exact grant of the whole command covers it.
 */

import type { CommandPart } from '../types';
import type { Lexed, Redirect } from './tokenize';
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

function isSyntax(word: string | undefined): boolean {
  return word !== undefined && (SHELL_KEYWORDS.has(word) || COMPOUND_OPENERS.has(word));
}

export function commandParts(lexed: Lexed): CommandPart[] | null {
  if (lexed.error || lexed.dynamic.length > 0 || lexed.commands.length === 0) return null;
  const parts = lexed.commands.map((cmd) => ({ words: cmd.words.map((w) => w.raw), writesFile: cmd.redirects.some(writesFile) }));
  return parts.some((p) => isSyntax(p.words[0])) ? null : parts;
}
