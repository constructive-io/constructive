/**
 * Bash's word expansions, in bash's order: brace expansion, tilde expansion,
 * parameter expansion, field splitting and pathname expansion. The lexer did
 * quote removal and says which parts were quoted. Each step acts only on the
 * characters bash lets it act on, so every character keeps a kind: `l` for an
 * unquoted literal (braces, tildes and globs act on it), `v` for the result of
 * an unquoted expansion (splitting and globs act on it), and `q` for settled
 * text (quoted text, a tilde's home dir, and the marks below).
 *
 * One `ExpansionBudget` per command bounds the text and the words that the
 * expansions build. It is charged before anything is built, and past it the
 * analysis is incomplete.
 */

import { unreachable } from '../unreachable';
import type { Arg } from './analyze';
import type { Limit } from './limits';
import type { Word } from './tokenize';

/** The most characters the expansions of one command may build. */
export const MAX_EXPANSION_CHARS = 1024 * 1024;

/** The most words the expansions of one command may add to its checks. */
export const MAX_EXPANSION_WORDS = 8192;

/** Stands for an unknown part: the word is known only up to it. */
const UNKNOWN = '\u0000';

/** Stands for an empty quoted part (`""`): it keeps a word that is otherwise empty, and it stops a tilde. */
const EMPTY_QUOTE = '\u0001';

/** The characters bash's default IFS splits on. */
const IFS_WHITESPACE = new Set([' ', '\t', '\n']);

const NAME_EQUALS = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;
const SEQUENCE = /^(-?\d+|[A-Za-z])\.\.(-?\d+|[A-Za-z])(?:\.\.(-?\d+))?$/;

type ExpansionLimit = Extract<Limit, 'expansion-chars' | 'expansion-words'>;

/** A word on its way through the expansions: its text and one kind per character. */
interface Piece {
  text: string;
  kinds: string;
}

/** What the expansions of one command may still build. A charge that does not fit takes nothing. */
export class ExpansionBudget {
  private chars = MAX_EXPANSION_CHARS;
  private words = MAX_EXPANSION_WORDS;

  constructor(private readonly onLimit: (limit: ExpansionLimit) => void) {}

  /** Room for `n` more characters. */
  takeChars(n: number): boolean {
    if (n <= this.chars) {
      this.chars -= n;
      return true;
    }
    this.onLimit('expansion-chars');
    return false;
  }

  /** Room for `n` more words. */
  takeWords(n: number): boolean {
    if (n <= this.words) {
      this.words -= n;
      return true;
    }
    this.onLimit('expansion-words');
    return false;
  }

  get wordRoom(): number {
    return this.words;
  }
}

/** What the expansions need from the analysis. */
export interface ExpansionScope {
  /** The dir `~` expands to. */
  readonly home: string;
  /** `$name`, or `${name:-fallback}`; `null` when it cannot be known. */
  value(name: string, fallback: string | undefined): string | null;
  /** IFS may differ from bash's default, so an unquoted expansion splits where the analysis cannot follow. */
  ifsMayDiffer(): boolean;
  noteRef(name: string): void;
  dynamic(reason: string): void;
}

/**
 * How bash expands a word. An argument goes through every step. An assignment
 * (`NAME=value` before the command word, or an argument of `export`,
 * `declare`, `local`, `readonly` or `typeset`) takes tilde and parameter
 * expansion only: no braces, no splitting, no glob.
 */
export type WordUse = 'argument' | 'assignment';

/** The arguments a word expands to, in order. */
export function expandWord(word: Word, use: WordUse, scope: ExpansionScope, budget: ExpansionBudget): Arg[] {
  const built = build(word, scope, budget);
  const arg = (piece: Piece, globs: boolean) => toArg(piece, word.raw, globs, built.splits);
  if (use === 'assignment') return [arg(tildes(built, true, scope, budget), false)];
  const args: Arg[] = [];
  for (const piece of braces(built, budget)) {
    const fields = split(tildes(piece, NAME_EQUALS.test(piece.text) && allLiteral(piece.kinds, 0, piece.text.indexOf('=')), scope, budget));
    if (fields.length > 1 && !budget.takeWords(fields.length - 1)) {
      args.push(arg(fields[0], true));
      break;
    }
    for (const field of fields) args.push(arg(field, true));
  }
  return args;
}

/** The word's parts as one piece, with each known variable's value in place and an unknown part marked. */
/** The built word, and whether an unknown unquoted value in it may split it further. */
function build(word: Word, scope: ExpansionScope, budget: ExpansionBudget): Piece & { splits: boolean } {
  let text = '';
  let kinds = '';
  let unknown = false;
  let splits = false;
  const markUnknown = (split: boolean) => {
    splits ||= split;
    if (unknown) return;
    unknown = true;
    text += UNKNOWN;
    kinds += 'q';
  };
  const add = (piece: string, kind: 'l' | 'v' | 'q') => {
    if (!budget.takeChars(piece.length)) return markUnknown(kind === 'v');
    text += piece;
    kinds += kind.repeat(piece.length);
  };
  for (const part of word.parts) {
    switch (part.kind) {
    case 'lit':
      if (part.text === '' && part.quoted) add(EMPTY_QUOTE, 'q');
      else add(part.text, part.quoted ? 'q' : 'l');
      break;
    case 'unknown':
      if (part.ref) scope.noteRef(part.ref);
      markUnknown(part.splits);
      break;
    case 'var': {
      scope.noteRef(part.name);
      const value = !part.quoted && scope.ifsMayDiffer() ? null : scope.value(part.name, part.fallback);
      if (value === null) markUnknown(!part.quoted);
      else if (value === '' && part.quoted) add(EMPTY_QUOTE, 'q');
      else add(value, part.quoted ? 'q' : 'v');
      break;
    }
    default:
      return unreachable(part);
    }
  }
  return { text, kinds, splits };
}

/** The characters from `from` up to `to` are all unquoted literals. */
function allLiteral(kinds: string, from: number, to: number): boolean {
  for (let k = from; k < to; k++) if (kinds[k] !== 'l') return false;
  return true;
}

/**
 * Brace expansion on the unquoted literal braces. A word that cannot be built
 * within the budget keeps what was built, and at least itself, so later words
 * keep their positions.
 */
function braces(piece: Piece, budget: ExpansionBudget): Piece[] {
  const out: Piece[] = [];
  expandBraces(piece.text, piece.kinds, out, budget);
  return out.length > 0 ? out : [piece];
}

/** Expand the first brace group, then the rest of each result. Returns `false` once the budget runs out. */
function expandBraces(text: string, kinds: string, out: Piece[], budget: ExpansionBudget): boolean {
  for (let open = 0; open < text.length; open++) {
    if (text[open] !== '{' || kinds[open] !== 'l') continue;
    let depth = 0;
    const commas: number[] = [];
    let close = -1;
    for (let j = open; j < text.length; j++) {
      if (kinds[j] !== 'l') continue;
      if (text[j] === '{') depth++;
      else if (text[j] === '}') {
        depth--;
        if (depth === 0) {
          close = j;
          break;
        }
      } else if (text[j] === ',' && depth === 1) commas.push(j);
    }
    if (close < 0) break;
    let alternatives: Piece[];
    if (commas.length > 0) {
      const bounds = [open, ...commas, close];
      alternatives = bounds.slice(1).map((end, k) => ({ text: text.slice(bounds[k] + 1, end), kinds: kinds.slice(bounds[k] + 1, end) }));
    } else {
      const seq = SEQUENCE.exec(text.slice(open + 1, close));
      if (!seq) continue;
      alternatives = sequence(seq[1], seq[2], seq[3], budget.wordRoom + 1).map((t) => ({ text: t, kinds: 'l'.repeat(t.length) }));
    }
    const around = open + text.length - close - 1;
    for (const alt of alternatives) {
      if (!budget.takeChars(around + alt.text.length)) return false;
      const next = text.slice(0, open) + alt.text + text.slice(close + 1);
      if (!expandBraces(next, kinds.slice(0, open) + alt.kinds + kinds.slice(close + 1), out, budget)) return false;
    }
    return true;
  }
  if (out.length > 0 && !budget.takeWords(1)) return false;
  out.push({ text, kinds });
  return true;
}

/** The first `limit` values of `{from..to..step}`. */
function sequence(from: string, to: string, step: string | undefined, limit: number): string[] {
  const numeric = /^-?\d+$/.test(from) && /^-?\d+$/.test(to);
  const a = numeric ? Number(from) : from.charCodeAt(0);
  const b = numeric ? Number(to) : to.charCodeAt(0);
  const inc = Math.max(1, Math.abs(Number(step ?? 1)));
  const texts: string[] = [];
  for (let v = a; (a <= b ? v <= b : v >= b) && texts.length < limit; v += a <= b ? inc : -inc) {
    texts.push(numeric ? String(v) : String.fromCharCode(v));
  }
  return texts;
}

/**
 * Tilde expansion at the start of a word, and in an assignment after its `=`
 * and each unquoted `:`. The prefix runs to the first unquoted `/` (or `:` in
 * an assignment); any quoted or expanded character in it stops the expansion.
 * `~user` cannot be known.
 */
function tildes(piece: Piece, assignment: boolean, scope: ExpansionScope, budget: ExpansionBudget): Piece {
  const { text, kinds } = piece;
  const starts = [0];
  if (assignment) {
    const eq = text.indexOf('=');
    starts[0] = eq + 1;
    for (let k = eq + 1; k < text.length; k++) if (text[k] === ':' && kinds[k] === 'l') starts.push(k + 1);
  }
  let outText = '';
  let outKinds = '';
  let from = 0;
  for (const start of starts) {
    if (text[start] !== '~' || kinds[start] !== 'l') continue;
    let end = start + 1;
    while (end < text.length && !(kinds[end] === 'l' && (text[end] === '/' || (assignment && text[end] === ':')))) end++;
    if (!allLiteral(kinds, start + 1, end)) continue;
    const login = text.slice(start + 1, end);
    if (login !== '') {
      scope.dynamic(`it uses ~${login} expansion`);
      continue;
    }
    if (!budget.takeChars(scope.home.length)) continue;
    outText += text.slice(from, start) + scope.home;
    outKinds += kinds.slice(from, start) + 'q'.repeat(scope.home.length);
    from = end;
  }
  return from === 0 ? piece : { text: outText + text.slice(from), kinds: outKinds + kinds.slice(from) };
}

/**
 * Field splitting on the results of unquoted expansions, at bash's default IFS
 * (a changed IFS made those values unknown). A word that comes out empty from
 * unquoted expansions alone makes no word; an empty quoted part keeps it.
 */
function split(piece: Piece): Piece[] {
  const { text, kinds } = piece;
  if (text === '') return [];
  if (!kinds.includes('v')) return [piece];
  const fields: Piece[] = [];
  let start = -1;
  for (let k = 0; k <= text.length; k++) {
    const delimiter = k === text.length || (kinds[k] === 'v' && IFS_WHITESPACE.has(text[k]));
    if (!delimiter) {
      if (start < 0) start = k;
      continue;
    }
    if (start >= 0) fields.push({ text: text.slice(start, k), kinds: kinds.slice(start, k) });
    start = -1;
  }
  return fields;
}

/** The argument a finished piece stands for; a glob character counts when it is unquoted. */
function toArg(piece: Piece, raw: string, globs: boolean, splits: boolean): Arg {
  let glob = false;
  for (let k = 0; globs && !glob && k < piece.text.length; k++) {
    glob = piece.kinds[k] !== 'q' && (piece.text[k] === '*' || piece.text[k] === '?' || piece.text[k] === '[');
  }
  const settled = piece.text.split(EMPTY_QUOTE).join('');
  const cut = settled.indexOf(UNKNOWN);
  if (cut >= 0) return { kind: 'unknown', knownPrefix: settled.slice(0, cut), raw, splits };
  return { kind: 'known', text: settled, raw, glob };
}
