/**
 * Bash's word expansions, in bash's order: brace expansion, tilde expansion,
 * parameter expansion, field splitting and pathname expansion. The lexer did
 * quote removal and says which parts were quoted. Each step acts only on the
 * characters bash lets it act on, so every character keeps a kind: `l` for an
 * unquoted literal (braces, tildes and globs act on it), `v` for the result of
 * an unquoted expansion (splitting and globs act on it), `q` for settled text
 * (quoted text, a tilde's home dir, the unknown mark), and `e` for the mark an
 * empty quoted part leaves, which no character of the word can be taken for.
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

/** Stands, with kind `e`, for an empty quoted part (`""`): it keeps a word that is otherwise empty, and it stops a tilde. */
const EMPTY_QUOTE = '\u0001';

/** The characters bash's default IFS splits on. */
const IFS_WHITESPACE = new Set([' ', '\t', '\n']);

const NAME_EQUALS = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;
/** `{1..9}` or `{a..z}`, with bash 4's optional step; both ends the same kind. */
const SEQUENCE = /^(?:([-+]?\d+)\.\.([-+]?\d+)|([A-Za-z])\.\.([A-Za-z]))(?:\.\.([-+]?\d+))?$/;

/** bash 3.2's sequence: no step. */
const SEQUENCE_32 = /^(?:([-+]?\d+)\.\.([-+]?\d+)|([A-Za-z])\.\.([A-Za-z]))$/;

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

/** How an assignment sets a variable: `=` replaces it, `+=` appends to it. */
export type AssignOp = '=' | '+=';

/**
 * A variable the command itself set or unset, or one that holds either the
 * environment's value or one the command gave it (`X=1 :`, where POSIX sh
 * keeps the assignment and bash does not), so it is unknown and its
 * references still count as the environment's.
 */
type Variable = { kind: 'set'; value: string } | { kind: 'unknown' } | { kind: 'unset' } | { kind: 'maybe-outside' };

/** The command's record of one name, to put back later; `undefined` when it never touched the name. */
export type VariableRecord = Variable | undefined;

/** Names bash sets itself when it starts, whatever its environment holds. */
const SET_AT_START: ReadonlySet<string> = new Set(['IFS', 'PWD']);

/**
 * The shell variables as the command leaves them, at every assignment site:
 * a `NAME=value` word, `export`, `declare` and the like, `read`, `printf -v`,
 * `mapfile` and `unset`. A variable the command never touched comes from the
 * environment, which `outside` reads; one `outside` knows (HOME) is in the
 * environment, so a change to it is exported. `exported`: the names the
 * command exported (`export`, `declare -x`, an assignment before a command).
 */
export class Variables {
  private readonly vars: Map<string, Variable>;
  private readonly exported: Set<string>;

  constructor(
    private readonly outside: (name: string) => string | null,
    vars: ReadonlyMap<string, Variable> = new Map(),
    exported: ReadonlySet<string> = new Set()
  ) {
    this.vars = new Map(vars);
    this.exported = new Set(exported);
  }

  isExported(name: string): boolean {
    return this.exported.has(name);
  }

  /** `export NAME`, `declare -x NAME` (`on`), or `export -n NAME`, `declare +x NAME`. */
  setExported(name: string, on: boolean): void {
    if (on) this.exported.add(name);
    else this.exported.delete(name);
  }

  /** `export -n "$N"`: any name may have lost its export. */
  unexportAll(): void {
    this.exported.clear();
  }

  /** `name=value` or `name+=value`; a `null` value is unknown. `+=` on an unset variable is `=`, as in bash. */
  assign(name: string, op: AssignOp, value: string | null): void {
    const before = op === '+=' ? this.get(name) : undefined;
    if (value === null || before === null) this.vars.set(name, { kind: 'unknown' });
    else this.vars.set(name, { kind: 'set', value: (before ?? '') + value });
  }

  /** bash drops the variable with its export, so a later assignment makes one that is not exported. */
  unset(name: string): void {
    this.vars.set(name, { kind: 'unset' });
    this.exported.delete(name);
  }

  /** It holds the value it had before the command set it, or the one the command set: unknown, and still the environment's when it was untouched. */
  either(name: string, before: VariableRecord): void {
    this.vars.set(name, before === undefined || before.kind === 'maybe-outside' ? { kind: 'maybe-outside' } : { kind: 'unknown' });
  }

  record(name: string): VariableRecord {
    return this.vars.get(name);
  }

  /** Put back a record `record` gave. */
  restore(name: string, record: VariableRecord): void {
    if (record === undefined) this.vars.delete(name);
    else this.vars.set(name, record);
  }

  /** The names whose record or export differs from `before`'s, a copy taken earlier: what was assigned, unset, exported or unexported since. */
  changedFrom(before: Variables): string[] {
    const names = new Set([...this.vars.keys(), ...before.vars.keys(), ...this.exported, ...before.exported]);
    return [...names].filter((name) => this.vars.get(name) !== before.vars.get(name) || this.exported.has(name) !== before.exported.has(name));
  }

  /** The command set or unset it, so the environment does not decide it. */
  touched(name: string): boolean {
    const v = this.vars.get(name);
    return v !== undefined && v.kind !== 'maybe-outside';
  }

  /** Its value; `null` when it cannot be known, `undefined` when it is unset. */
  get(name: string): string | null | undefined {
    const v = this.vars.get(name);
    if (v === undefined) return this.outside(name);
    switch (v.kind) {
    case 'set':
      return v.value;
    case 'unknown':
    case 'maybe-outside':
      return null;
    case 'unset':
      return undefined;
    default:
      return unreachable(v);
    }
  }

  copy(): Variables {
    return new Variables(this.outside, this.vars, this.exported);
  }

  /**
   * What a child shell (`sh -c`, a script on stdin) starts with: the
   * environment. An exported name and one the environment holds carry their
   * value, and an unset one stays unset (bash binds no HOME of its own when
   * not interactive). A name the command set without exporting it is passed
   * only when the environment had it, so its value there is unknown. bash
   * sets IFS and PWD itself.
   */
  forChild(): Variables {
    const vars = new Map<string, Variable>();
    for (const [name, v] of this.vars) {
      if (SET_AT_START.has(name)) continue;
      const passed = v.kind !== 'set' || this.exported.has(name) || this.outside(name) !== null;
      vars.set(name, passed ? v : { kind: 'unknown' });
    }
    return new Variables(this.outside, vars, this.exported);
  }
}

/** What the expansions need from the analysis. */
export interface ExpansionScope {
  /**
   * The dirs `~` may expand to: one where every bash agrees, more where the
   * command changed HOME (bash 3.2 follows the shell's HOME, and bash 5.3
   * reads the HOME the shell last exported, which may be any one HOME held),
   * `null` when HOME is unknown.
   */
  tildeHomes(): readonly string[] | null;
  /**
   * `$name`, or `${name-fallback}` (`colon` for `${name:-fallback}`, which
   * also takes the fallback for an empty value); `null` when it cannot be
   * known. `assigns`: the `=` forms, which also set the variable to the
   * fallback when they take it. `tilde`: a `~` that starts the fallback
   * expands; otherwise it is text.
   */
  value(name: string, fallback: string | undefined, colon: boolean, assigns: boolean, tilde: boolean): string | null;
  /** IFS may differ from bash's default, so an unquoted expansion splits where the analysis cannot follow. */
  ifsMayDiffer(): boolean;
  noteRef(name: string): void;
  dynamic(reason: string): void;
  /** bash 3.2 and bash 4+ expand the word's braces differently, so the analysis cannot know which words it makes. */
  bashesDiffer(word: string): void;
  /** bash 3.2 and bash 5.3 expand the word's tilde to different dirs. */
  tildesDiffer(word: string): void;
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
  if (use === 'assignment') {
    const readings = tildes(built, true, scope, budget);
    if (readings.length === 1) return [arg(readings[0], false)];
    // A variable holds one value, so where the bashes differ it is unknown, which asks where the command uses it.
    return [arg(withHome(built, tildeSpans(built, true), null, budget), false)];
  }
  const args: Arg[] = [];
  let differ = false;
  for (const piece of bothBashes(built, word.raw, scope, budget)) {
    const readings = tildes(piece, NAME_EQUALS.test(piece.text) && allLiteral(piece.kinds, 0, piece.text.indexOf('=')), scope, budget);
    differ ||= readings.length > 1;
    for (const reading of readings) {
      const fields = split(reading);
      if (fields.length > 1 && !budget.takeWords(fields.length - 1)) {
        args.push(arg(fields[0], true));
        return args;
      }
      for (const field of fields) args.push(arg(field, true));
    }
  }
  if (differ) scope.tildesDiffer(word.raw);
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
  const add = (piece: string, kind: 'l' | 'v' | 'q' | 'e') => {
    if (!budget.takeChars(piece.length)) return markUnknown(kind === 'v');
    text += piece;
    kinds += kind.repeat(piece.length);
  };
  for (const part of word.parts) {
    switch (part.kind) {
    case 'lit':
      if (part.text === '' && part.quoted) add(EMPTY_QUOTE, 'e');
      else add(part.text, part.quoted ? 'q' : 'l');
      break;
    case 'unknown':
      if (part.ref) scope.noteRef(part.ref);
      markUnknown(part.splits);
      break;
    case 'var': {
      scope.noteRef(part.name);
      // Looked up even when IFS may differ, since an `=` form assigns.
      const looked = scope.value(part.name, part.fallback, part.colon === true, part.assigns === true, part.tilde === true);
      const raw = !part.quoted && scope.ifsMayDiffer() ? null : looked;
      const value = raw === null || part.transform === undefined ? raw : transformed(raw, part.transform);
      if (value === null) markUnknown(!part.quoted);
      else if (value === '' && part.quoted) add(EMPTY_QUOTE, 'e');
      else add(value, part.quoted ? 'q' : 'v');
      break;
    }
    default:
      return unreachable(part);
    }
  }
  return { text, kinds, splits };
}

/**
 * bash 4+'s `${x@Q}` (the value quoted for reuse as input) and its case
 * changes (`@U`, `@L`, `@u`, `^^`, `,,`, `^`, `,`). bash 3.2 refuses them, so
 * the command runs only in bash 4+. Unknown where the result depends on the
 * locale (a non-ASCII value), or where `@Q` would use `$'…'` or an unset
 * name would give no word.
 */
function transformed(value: string, transform: string): string | null {
  if (!/^[\x20-\x7e]*$/.test(value)) return null;
  switch (transform) {
  case '@Q':
    return value === '' ? null : `'${value.split("'").join("'\\''")}'`;
  case '@U':
  case '^^':
    return value.toUpperCase();
  case '@L':
  case ',,':
    return value.toLowerCase();
  case '@u':
  case '^':
    return value.charAt(0).toUpperCase() + value.slice(1);
  case ',':
    return value.charAt(0).toLowerCase() + value.slice(1);
  default:
    return null;
  }
}

/** The characters from `from` up to `to` are all unquoted literals. */
function allLiteral(kinds: string, from: number, to: number): boolean {
  for (let k = from; k < to; k++) if (kinds[k] !== 'l') return false;
  return true;
}

/**
 * Brace expansion as bash 4 and later do it, on the unquoted literal braces.
 * A word that does not fit the budget stays as written, and the analysis is
 * incomplete.
 */
function braces(piece: Piece, budget: ExpansionBudget): Piece[] {
  return expand5(piece.text, piece.kinds, budget) ?? [piece];
}

/**
 * The next group from `from` that both bashes look at: from an unquoted `{`
 * to the first `}` at its level after an unquoted `,` or `..` (one not right
 * before that `}`) at its level. A `{` that starts the word, or the rest of
 * the word after a group (`start`), and is followed by `}` (find's `{}`)
 * starts none.
 */
function group(text: string, kinds: string, from: number, start: number): { open: number; close: number } | null {
  for (let open = from; open < text.length; open++) {
    if (text[open] !== '{' || kinds[open] !== 'l') continue;
    if (open === start && text[open + 1] === '}' && kinds[open + 1] === 'l') continue;
    let level = 0;
    let counts = 0;
    for (let j = open + 1; j < text.length; j++) {
      if (kinds[j] !== 'l') continue;
      const c = text[j];
      if (c === '}' && level === 0 && counts > 0) return { open, close: j };
      if (c === '{') level++;
      else if (c === '}' && level > 0) level--;
      else if (level === 0 && c === ',') counts++;
      else if (level === 0 && c === '.' && text[j + 1] === '.' && kinds[j + 1] === 'l' && !(text[j + 2] === '}' && kinds[j + 2] === 'l')) counts++;
    }
  }
  return null;
}

/** The unquoted commas at the group's own level, as indexes into the word. */
function levelCommas(text: string, kinds: string, open: number, close: number): number[] {
  const commas: number[] = [];
  let level = 0;
  for (let j = open + 1; j < close; j++) {
    if (kinds[j] !== 'l') continue;
    if (text[j] === '{') level++;
    else if (text[j] === '}' && level > 0) level--;
    else if (text[j] === ',' && level === 0) commas.push(j);
  }
  return commas;
}

type Expander = (text: string, kinds: string, budget: ExpansionBudget) => Piece[] | null;

/** Each part of a list, between the commas, expanded the same way. The parts' text is charged first, so a deep nesting ends at the budget. */
function alternatives(text: string, kinds: string, open: number, commas: readonly number[], close: number, budget: ExpansionBudget, expand: Expander): Piece[] | null {
  if (!budget.takeChars(close - open)) return null;
  const bounds = [open, ...commas, close];
  const out: Piece[] = [];
  for (let k = 1; k < bounds.length; k++) {
    const alt = expand(text.slice(bounds[k - 1] + 1, bounds[k]), kinds.slice(bounds[k - 1] + 1, bounds[k]), budget);
    if (alt === null) return null;
    out.push(...alt);
  }
  return out;
}

/** Each of `heads` followed by each of `tails`, in order, charged before each one is built; `null` past the budget. */
function product(heads: readonly Piece[], tails: readonly Piece[], budget: ExpansionBudget): Piece[] | null {
  const out: Piece[] = [];
  for (const head of heads) {
    for (const tail of tails) {
      if (!budget.takeChars(head.text.length + tail.text.length) || (out.length > 0 && !budget.takeWords(1))) return null;
      out.push({ text: head.text + tail.text, kinds: head.kinds + tail.kinds });
    }
  }
  return out;
}

/** A group one bash expands, and the words its braces make there (`null` past the budget). */
interface Expanded {
  readonly open: number;
  readonly close: number;
  readonly middles: readonly Piece[] | null;
}

/**
 * The words a word makes, built as a product over its groups from left to
 * right: the text before each group, then each word the group makes. `next`
 * finds the group a bash expands from a point of the word, or `null` when the
 * rest stays as written.
 */
function expandGroups(text: string, kinds: string, budget: ExpansionBudget, next: (start: number) => Expanded | null): Piece[] | null {
  let words: Piece[] = [{ text: '', kinds: '' }];
  for (let start = 0; ; ) {
    const found = next(start);
    if (found === null) return product(words, [{ text: text.slice(start), kinds: kinds.slice(start) }], budget);
    if (found.middles === null) return null;
    const before: Piece = { text: text.slice(start, found.open), kinds: kinds.slice(start, found.open) };
    words = product(words, found.middles.map((m) => ({ text: before.text + m.text, kinds: before.kinds + m.kinds })), budget);
    if (words === null) return null;
    start = found.close + 1;
  }
}

/** The values of a sequence group as words, or `null` when the group is not one this bash reads as a sequence. */
function sequenceGroup(text: string, kinds: string, open: number, close: number, modern: boolean, budget: ExpansionBudget): Piece[] | null {
  // A sequence needs every character between the braces unquoted.
  const seq = allLiteral(kinds, open + 1, close) ? (modern ? SEQUENCE : SEQUENCE_32).exec(text.slice(open + 1, close)) : null;
  if (!seq) return null;
  const [, fromNumber, toNumber, fromLetter, toLetter, step] = seq;
  return sequence(fromNumber ?? fromLetter, toNumber ?? toLetter, step, modern, budget.wordRoom + 1)?.map(sequenceWord) ?? null;
}

/**
 * bash 4 and later: a group with a comma at its own level is a list, one
 * without is a sequence (with a step and zero padding) or is left as written,
 * and the search goes on after its `{`.
 */
function expand5(text: string, kinds: string, budget: ExpansionBudget): Piece[] | null {
  return expandGroups(text, kinds, budget, (start) => {
    for (let found = group(text, kinds, start, start); found; found = group(text, kinds, found.open + 1, start)) {
      const { open, close } = found;
      const commas = levelCommas(text, kinds, open, close);
      if (commas.length > 0) return { open, close, middles: alternatives(text, kinds, open, commas, close, budget, expand5) };
      const middles = sequenceGroup(text, kinds, open, close, true, budget);
      if (middles) return { open, close, middles };
    }
    return null;
  });
}

/** One value of a sequence as a word: a backslash it makes is removed with the quotes, as in bash. */
function sequenceWord(text: string): Piece {
  return text === '\\' ? { text: EMPTY_QUOTE, kinds: 'e' } : literal(text);
}

const literal = (text: string): Piece => ({ text, kinds: 'l'.repeat(text.length) });

const INT64_MAX = 2n ** 63n - 1n;

/**
 * The first `limit` values of `{from..to..step}`: numbers, or the characters
 * between two letters. Both bashes read the numbers as 64-bit integers, so a
 * group with one past that range is no sequence (`null`). bash 3.2 then keeps
 * the low 32 bits of each end, takes no step and pads nothing; bash 4 and
 * later (`modern`) take the step's size and pad every number to the wider end
 * when an end has a leading zero (`{01..10}`).
 */
function sequence(from: string, to: string, step: string | undefined, modern: boolean, limit: number): string[] | null {
  const numeric = /\d/.test(from);
  const fits = (n: bigint) => -INT64_MAX - 1n <= n && n <= INT64_MAX;
  const inc = step === undefined ? 1n : BigInt(step);
  if (inc < -INT64_MAX || inc > INT64_MAX) return null;
  let a = numeric ? BigInt(from) : BigInt(from.charCodeAt(0));
  let b = numeric ? BigInt(to) : BigInt(to.charCodeAt(0));
  if (!fits(a) || !fits(b)) return null;
  if (!modern) {
    a = BigInt.asIntN(32, a);
    b = BigInt.asIntN(32, b);
  }
  const size = (inc < 0n ? -inc : inc) || 1n;
  const width = modern && numeric && (/^-?0\d/.test(from) || /^-?0\d/.test(to)) ? Math.max(from.length, to.length) : 0;
  const pad = (v: bigint) => (v < 0n ? `-${String(-v).padStart(width - 1, '0')}` : String(v).padStart(width, '0'));
  const texts: string[] = [];
  for (let v = a; (a <= b ? v <= b : v >= b) && texts.length < limit; v += a <= b ? size : -size) {
    texts.push(numeric ? pad(v) : String.fromCharCode(Number(v)));
  }
  return texts;
}

/**
 * The words a word's braces make in bash 4 and later and in bash 3.2, which
 * macOS ships as /bin/bash. Where they differ, every word of both counts, and
 * the analysis says it cannot know which bash runs the command.
 */
function bothBashes(piece: Piece, raw: string, scope: ExpansionScope, budget: ExpansionBudget): Piece[] {
  const modern = braces(piece, budget);
  if (!piece.text.includes('{')) return modern;
  const old = braces32(piece, budget);
  const seen = new Set(modern.map((p) => p.text));
  const extra = old.filter((p) => !seen.has(p.text) && seen.add(p.text));
  if (extra.length === 0 && old.length === modern.length) return modern;
  scope.bashesDiffer(raw);
  return [...modern, ...extra];
}

/**
 * Brace expansion as bash 3.2 does it, on the same groups: any comma in the
 * group, also a nested one, makes it a list split at its own level's commas;
 * without a comma it must be a sequence with no step and no padding, or the
 * rest of the word stays as written.
 */
function braces32(piece: Piece, budget: ExpansionBudget): Piece[] {
  return expand32(piece.text, piece.kinds, budget) ?? [piece];
}

function expand32(text: string, kinds: string, budget: ExpansionBudget): Piece[] | null {
  return expandGroups(text, kinds, budget, (start) => {
    const found = group(text, kinds, start, start);
    if (!found) return null;
    const { open, close } = found;
    // bash 3.2 looks for a comma anywhere in the group, nested or quoted; the kit cannot tell an escaped one from a quoted one, so it counts both.
    if (text.slice(open + 1, close).includes(',')) return { open, close, middles: alternatives(text, kinds, open, levelCommas(text, kinds, open, close), close, budget, expand32) };
    const middles = sequenceGroup(text, kinds, open, close, false, budget);
    return middles ? { open, close, middles } : null;
  });
}

/** A tilde prefix in a word: from its `~` up to the `/` (or `:`) after it; `named` for `~user`, `~+` and `~-`. */
interface TildeSpan {
  readonly start: number;
  readonly end: number;
  readonly named: boolean;
}

/**
 * The tilde prefixes bash expands: at the start of a word, and in an
 * assignment after its `=` and each unquoted `:`. A prefix runs to the first
 * unquoted `/` (or `:` in an assignment); a quoted or expanded character in it
 * stops the expansion.
 */
function tildeSpans(piece: Piece, assignment: boolean): TildeSpan[] {
  const { text, kinds } = piece;
  const starts = [0];
  if (assignment) {
    const eq = text.indexOf('=');
    starts[0] = eq + 1;
    for (let k = eq + 1; k < text.length; k++) if (text[k] === ':' && kinds[k] === 'l') starts.push(k + 1);
  }
  const spans: TildeSpan[] = [];
  for (const start of starts) {
    if (text[start] !== '~' || kinds[start] !== 'l') continue;
    let end = start + 1;
    while (end < text.length && !(kinds[end] === 'l' && (text[end] === '/' || (assignment && text[end] === ':')))) end++;
    if (allLiteral(kinds, start + 1, end)) spans.push({ start, end, named: end > start + 1 });
  }
  return spans;
}

/**
 * The word with each tilde prefix put back by `home`. A named one (`~user`),
 * a `null` home and a home past the budget name a dir the analysis cannot
 * know, so the word is unknown from there.
 */
function withHome(piece: Piece, spans: readonly TildeSpan[], home: string | null, budget: ExpansionBudget): Piece {
  const { text, kinds } = piece;
  let outText = '';
  let outKinds = '';
  let from = 0;
  for (const { start, end, named } of spans) {
    const value = named || home === null || !budget.takeChars(home.length) ? null : home;
    outText += text.slice(from, start) + (value ?? UNKNOWN);
    outKinds += kinds.slice(from, start) + (value === null ? 'q' : 'q'.repeat(value.length));
    from = end;
  }
  return { text: outText + text.slice(from), kinds: outKinds + kinds.slice(from) };
}

/** The word after tilde expansion, once for each dir `~` may expand to. */
function tildes(piece: Piece, assignment: boolean, scope: ExpansionScope, budget: ExpansionBudget): Piece[] {
  const spans = tildeSpans(piece, assignment);
  if (spans.length === 0) return [piece];
  const homes = spans.every((s) => s.named) ? null : scope.tildeHomes();
  return (homes ?? [null]).map((home) => withHome(piece, spans, home, budget));
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
  let settled = '';
  for (let k = 0; k < piece.text.length; k++) if (piece.kinds[k] !== 'e') settled += piece.text[k];
  const cut = settled.indexOf(UNKNOWN);
  if (cut >= 0) return { kind: 'unknown', knownPrefix: settled.slice(0, cut), raw, splits };
  return { kind: 'known', text: settled, raw, glob };
}
