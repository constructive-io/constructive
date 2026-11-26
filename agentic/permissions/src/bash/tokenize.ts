/**
 * A POSIX-shell lexer that is good enough to find what a command touches.
 *
 * It splits a command into simple commands (on `;`, `&&`, `||`, `|`, `&`,
 * newline and subshell parens), keeps quoting so expansion can be judged, and
 * records redirections and heredocs. Command substitution (`$(…)`, backticks,
 * `<(…)`) is lexed recursively, so the commands inside it are analyzed too.
 *
 * It never executes or expands anything that needs the environment. What it
 * cannot know it marks: a word part is `unknown`, and constructs that hide code
 * add a `dynamic` note, which the analyzer turns into `shell-dynamic`. A lexer
 * error (an unterminated quote) comes back in `error`; a substitution it cannot
 * parse, or one nested past `MAX_SUBSTITUTION_DEPTH`, is left unread and listed
 * in `limits`. The analyzer reports both as an incomplete analysis.
 */

import type { Limit } from './limits';
import {
  arithmeticEnd,
  decodeAnsiC,
  findAnsiClose,
  fallbackText,
  heredocDelimiter,
  LexError,
  matchBacktick,
  matchBrace,
  matchBracket,
  matchParen,
  unescapeBackticks
} from './quoting';
import { SHELL_KEYWORDS } from './words';

/** One piece of a word. `quoted` pieces take no globbing, brace or tilde expansion. */
export type Part =
  | { kind: 'lit'; text: string; quoted: boolean }
  /**
   * `fallback` from `${name-…}` or `${name:-…}`, after quote removal (`null` for one the analysis cannot read); `assigns` for `${name=…}` and `${name:=…}`, which also set the variable to it;
   * `tilde` when a `~` that starts the fallback expands, which needs it and the whole expansion unquoted.
   */
  | { kind: 'var'; name: string; quoted: boolean; fallback?: string | null; colon?: boolean; assigns?: boolean; tilde?: boolean; transform?: string }
  /**
   * `ref` names the variable a complex `${…}` reads (`${TOKEN:0:4}`). `splits`: bash may split its
   * value into more words (it is unquoted, or `$@`), which may be options.
   */
  | { kind: 'unknown'; ref?: string; splits: boolean };

export interface Word {
  parts: Part[];
  /** The source text of the word. */
  raw: string;
}

/** The operator of a redirection to or from a file. */
export type FileOp = '<' | '>' | '>>' | '>|' | '&>' | '&>>' | '<>' | '>&' | '<&';

export interface Heredoc {
  quoted: boolean;
  /**
   * The lines as bash reads them, before any expansion: an unquoted body's
   * `\` newline joins two lines, and `<<-` strips each line's leading tabs.
   * Filled in when the lexer reaches the lines after the command.
   */
  body: string;
  /**
   * The substitutions in an unquoted body. Bash runs them when the command
   * that owns the heredoc applies its redirections, each in a subshell, so
   * their subshell chains start there and not where the body was read.
   */
  commands: SimpleCommand[];
}

/** A redirection: to or from a file, a copied descriptor (`2>&1`), a heredoc or a here-string. */
export type Redirect =
  | { kind: 'file'; op: FileOp; fd: number | null; target: Word }
  | { kind: 'dup'; op: '>&' | '<&'; fd: number | null }
  | { kind: 'heredoc'; fd: number | null; doc: Heredoc }
  | { kind: 'here-string'; fd: number | null; word: Word };

/**
 * Where a command's stdin comes from when no redirection of its own sets it:
 * the shell's, the stdout of the command or group that pipes into it, or the
 * stdin of the compound command it is in.
 */
export type Input = { kind: 'inherited' } | { kind: 'pipe'; from: SimpleCommand } | { kind: 'group-pipe' } | { kind: 'compound'; of: Compound };

/**
 * A compound command (`( … )`, `{ …; }`, `if`, a loop, `case`): every command
 * in it reads its stdin, which is what feeds it, unless the redirections
 * after it closes (`( … ) < f`, `done <<< w`) set fd 0.
 */
export interface Compound {
  input: Input;
  redirects: Redirect[];
}

/**
 * A subshell: `( … )`, each element of a pipeline, a background job, or a
 * substitution. It runs on a copy of the shell's variables and dir, so what it
 * assigns or the dir it moves to does not outlast it.
 */
export interface Subshell {
  /** It is the last element of a pipeline, which bash runs in the shell itself under `shopt -s lastpipe`. */
  lastElement: boolean;
}

export interface SimpleCommand {
  words: Word[];
  redirects: Redirect[];
  input: Input;
  /** The subshells it runs in, outermost first. */
  subshells: Subshell[];
  /** The compound commands that open right before it, outermost first: they apply their redirections before it runs. */
  opens: Compound[];
  /** The compound command it closes (`}`, `done`, the redirections after `)`), whose redirections its own are. */
  closes?: Compound;
}

export function heredocsOf(cmd: SimpleCommand): Heredoc[] {
  return cmd.redirects.flatMap((r) => (r.kind === 'heredoc' ? [r.doc] : []));
}

/** stdin is a heredoc or a here-string. */
export function readsStdinDoc(cmd: SimpleCommand): boolean {
  return cmd.redirects.some((r) => r.kind === 'heredoc' || r.kind === 'here-string');
}

export interface Lexed {
  commands: SimpleCommand[];
  /** Notes on constructs that run code the analyzer cannot see. */
  dynamic: string[];
  /** The limits of the analysis the lexer stopped at, leaving text unread. */
  limits: Limit[];
  /** The runs of unquoted spaces and tabs that separate tokens, as `[start, end)` in the command. */
  blanks: [number, number][];
  error?: string;
}

export const MAX_SUBSTITUTION_DEPTH = 6;

/** Arithmetic with no name, substitution or quote in it: it reads no variable, so it runs no code. */
const PLAIN_ARITHMETIC = /^[\d\s+\-*/%()<>=!&|^~?:,]*$/;
const OPERATOR_CHARS = new Set([';', '&', '|', '(', ')', '<', '>']);
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SPECIAL_PARAMS = new Set(['?', '$', '!', '#', '@', '*', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

/** The words that open a compound command in command position, and the word that closes it. */
const COMPOUND_CLOSER: ReadonlyMap<string, string> = new Map([
  ['{', '}'],
  ['if', 'fi'],
  ['while', 'done'],
  ['until', 'done'],
  ['for', 'done'],
  ['select', 'done'],
  ['case', 'esac']
]);
const CLOSERS: ReadonlySet<string> = new Set(COMPOUND_CLOSER.values());

interface PendingHeredoc {
  delim: string;
  stripTabs: boolean;
  doc: Heredoc;
}

function newCommand(): SimpleCommand {
  return { words: [], redirects: [], input: { kind: 'inherited' }, subshells: [], opens: [] };
}

/**
 * Where, in the commands lexed so far, the current pipeline element and
 * and-or list of one nesting level start, whether a `|` came before this
 * element, and how many subshells are open around the level.
 */
interface Level {
  element: number;
  list: number;
  piped: boolean;
  depth: number;
}

class Lexer {
  readonly commands: SimpleCommand[] = [];
  readonly dynamic: string[] = [];
  readonly limits: Limit[] = [];
  readonly blanks: [number, number][] = [];
  private current = newCommand();
  private pending: PendingHeredoc[] = [];
  /** The stdin the next command gets: after `|` the stdout of what came before. */
  private nextInput: Input = { kind: 'inherited' };
  /** The compound commands open here, innermost last, with the word or `)` that closes each. */
  private readonly compounds: { closer: string; compound: Compound }[] = [];
  /** The compound command the last word or `)` closed: the redirections that follow it are its own. */
  private closed: Compound | null = null;
  /** The command so far is a function's name and `()`, or `function name`, so a `{` opens its body. */
  private functionHeader = false;
  /** The `( … )` subshells open here, outermost first. */
  private readonly subshells: Subshell[] = [];
  /** Compound commands opened since the last command was pushed, which the next one opens. */
  private pendingOpens: Compound[] = [];
  /** The pipeline bookkeeping of each nesting level, innermost last: the top, and each open compound command. */
  private readonly levels: Level[] = [{ element: 0, list: 0, piped: false, depth: 0 }];
  private i = 0;

  constructor(
    private readonly s: string,
    private readonly depth: number
  ) {}

  run(): void {
    const { s } = this;
    while (this.i < s.length) {
      const ch = s[this.i];
      if (ch === ' ' || ch === '\t') {
        this.skipBlanks();
      } else if (ch === '\\' && s[this.i + 1] === '\n') {
        this.i += 2;
      } else if (ch === '\n') {
        this.i++;
        // A pipe may continue on the next line.
        if (this.nextInput.kind === 'inherited' || this.current.words.length > 0 || this.current.redirects.length > 0) {
          this.endCommand(false);
          this.endPipeline(false, true);
        }
        this.readHeredocs();
      } else if (ch === '#') {
        const nl = s.indexOf('\n', this.i);
        this.i = nl < 0 ? s.length : nl;
      } else if (OPERATOR_CHARS.has(ch)) {
        this.operator();
      } else {
        const start = this.i;
        const parts = this.readWord();
        if (parts) this.addWord({ parts, raw: s.slice(start, this.i) });
      }
    }
    if (this.pending.length > 0) throw new LexError('unterminated heredoc');
    this.endCommand(false);
    this.endPipeline(false, true);
  }

  /** The commands from `from` on run in a subshell of their own, inside the `depth` subshells open around them. */
  private wrap(from: number, depth: number, lastElement = false): void {
    if (from >= this.commands.length) return;
    const subshell: Subshell = { lastElement };
    for (let k = from; k < this.commands.length; k++) this.commands[k].subshells.splice(depth, 0, subshell);
  }

  /** A `|` ends a pipeline element, which bash runs in a subshell. */
  private endElement(): void {
    const level = this.levels[this.levels.length - 1];
    this.wrap(level.element, level.depth);
    level.piped = true;
    level.element = this.commands.length;
  }

  /**
   * A pipeline ends: its last element runs in a subshell too, as bash runs it
   * unless `lastpipe` is on. `background` (`&`): the and-or list before it
   * runs in one. `list`: the and-or list ends too (`;`, a newline, `&`, not
   * `&&` or `||`).
   */
  private endPipeline(background: boolean, list: boolean): void {
    const level = this.levels[this.levels.length - 1];
    if (level.piped) this.wrap(level.element, level.depth, true);
    if (background) this.wrap(level.list, level.depth);
    level.piped = false;
    level.element = this.commands.length;
    if (list) level.list = this.commands.length;
  }

  /** A word of the current command. In command position (only keywords before it) it may open or close a compound command. */
  private addWord(word: Word): void {
    const raw = word.raw;
    if (this.current.words.every((w) => SHELL_KEYWORDS.has(w.raw)) || (this.functionHeader && raw === '{')) {
      const closer = COMPOUND_CLOSER.get(raw);
      if (closer) {
        this.open(closer);
        this.functionHeader = false;
      } else if (CLOSERS.has(raw)) {
        this.closed = this.close(raw);
      } else if (raw === 'function') {
        this.functionHeader = true;
      }
    }
    this.current.words.push(word);
  }

  /** The stdin a command starting here gets when no redirection of its own sets it. */
  private inputNow(): Input {
    if (this.nextInput.kind !== 'inherited') return this.nextInput;
    const open = this.compounds[this.compounds.length - 1];
    return open ? { kind: 'compound', of: open.compound } : { kind: 'inherited' };
  }

  /** A compound command opens: what would feed the next command feeds every command in it, and `(` opens a subshell. */
  private open(closer: string): void {
    const compound: Compound = { input: this.inputNow(), redirects: [] };
    this.compounds.push({ closer, compound });
    this.pendingOpens.push(compound);
    this.nextInput = { kind: 'inherited' };
    if (closer === ')') this.subshells.push({ lastElement: false });
    const at = this.commands.length;
    this.levels.push({ element: at, list: at, piped: false, depth: this.subshells.length });
  }

  /** The innermost compound command, when `closer` closes it. */
  private close(closer: string): Compound | null {
    const open = this.compounds[this.compounds.length - 1];
    if (open?.closer !== closer) return null;
    this.endPipeline(false, true);
    // One that held no command applies its redirections where it closes.
    this.pendingOpens = this.pendingOpens.filter((c) => c !== open.compound);
    this.compounds.pop();
    this.levels.pop();
    if (closer === ')') this.subshells.pop();
    return open.compound;
  }

  /** Skip a run of spaces and tabs between tokens, and note where it was. */
  private skipBlanks(): void {
    const start = this.i;
    while (this.s[this.i] === ' ' || this.s[this.i] === '\t') this.i++;
    if (this.i > start) this.blanks.push([start, this.i]);
  }

  private endCommand(pipe: boolean): void {
    const cmd = this.current;
    if (cmd.words.length > 0 || cmd.redirects.length > 0) {
      cmd.input = this.inputNow();
      cmd.subshells = [...this.subshells];
      // `( … ) < f`, `{ …; } <<< w`, `done < f`: the redirections belong to the compound command that just closed.
      if (this.closed) {
        this.closed.redirects.push(...cmd.redirects);
        cmd.closes = this.closed;
      }
      this.push([cmd]);
      this.nextInput = pipe ? { kind: 'pipe', from: cmd } : { kind: 'inherited' };
    } else {
      // `( … ) | x`: the group's output is piped on.
      this.nextInput = pipe ? { kind: 'group-pipe' } : { kind: 'inherited' };
    }
    this.closed = null;
    this.functionHeader = false;
    this.current = newCommand();
  }

  private operator(): void {
    const { s } = this;
    const ch = s[this.i];
    const two = s.slice(this.i, this.i + 2);
    if (ch === '<' || ch === '>' || two === '&>') {
      this.redirect(null);
      return;
    }
    if (two === '&&' || two === '||' || two === ';;' || two === ';&') {
      this.i += 2;
      this.endCommand(false);
      this.endPipeline(false, two === ';;' || two === ';&');
    } else if (two === '|&') {
      this.i += 2;
      this.endCommand(true);
      this.endElement();
    } else if (ch === '|') {
      this.i++;
      this.endCommand(true);
      this.endElement();
    } else {
      // `;`, `&`, `(`, `)`
      const arithmetic = ch === '(' && s[this.i + 1] === '(' ? arithmeticEnd(s, this.i, 'command') : null;
      if (arithmetic !== null) {
        this.arithmetic(s.slice(this.i + 2, arithmetic - 1), 'an arithmetic command ((…))');
        this.i = arithmetic + 1;
        return;
      }
      if (ch === '(' && s[this.i + 1] === ')') {
        // `name()`: a function definition hides a body that runs later.
        this.dynamic.push('defines a shell function');
        this.functionHeader = true;
        this.i += 2;
        return;
      }
      this.i++;
      if (ch === '(') {
        // Keywords before it (`! (`, `then (`) stay on the first command inside.
        if (this.current.redirects.length > 0 || this.current.words.some((w) => !SHELL_KEYWORDS.has(w.raw))) this.endCommand(false);
        this.open(')');
        this.functionHeader = false;
        return;
      }
      this.endCommand(false);
      if (ch === ')') this.closed = this.close(')');
      // A `)` that closes no subshell ends a `case` pattern.
      if (ch !== ')' || !this.closed) this.endPipeline(ch === '&', true);
    }
  }

  private redirect(fd: number | null): void {
    const { s } = this;
    const ops = ['&>>', '<<<', '<<-', '&>', '>>', '>|', '>&', '<<', '<>', '<&', '<(', '>(', '<', '>'];
    const op = ops.find((candidate) => s.startsWith(candidate, this.i));
    if (op === '<(' || op === '>(') {
      // Process substitution: a word whose value comes from a command.
      const start = this.i;
      const parts = this.readWord();
      if (parts) this.current.words.push({ parts, raw: s.slice(start, this.i) });
      return;
    }
    this.i += op.length;
    this.skipBlanks();
    if (this.i >= s.length || s[this.i] === '\n' || OPERATOR_CHARS.has(s[this.i])) {
      throw new LexError(`redirection ${op} has no target`);
    }
    const start = this.i;
    const heredoc = op === '<<' || op === '<<-';
    const parts = heredoc ? this.delimiterWord() : this.readWord();
    if (!parts) throw new LexError(`redirection ${op} has no target`);
    const target: Word = { parts, raw: s.slice(start, this.i) };
    const cmd = this.current;
    if (heredoc) {
      const { delim, quoted } = heredocDelimiter(target.raw);
      const doc: Heredoc = { quoted, body: '', commands: [] };
      this.pending.push({ delim, stripTabs: op === '<<-', doc });
      cmd.redirects.push({ kind: 'heredoc', fd, doc });
      return;
    }
    if (op === '<<<') {
      cmd.redirects.push({ kind: 'here-string', fd, word: target });
      return;
    }
    if ((op === '>&' || op === '<&') && /^(\d+-?|-)$/.test(target.raw)) {
      cmd.redirects.push({ kind: 'dup', op, fd });
      return;
    }
    cmd.redirects.push({ kind: 'file', op: op as FileOp, fd, target });
  }

  /** A heredoc's delimiter: bash expands nothing in it, so a lexer of its own reads the word, and the substitutions it finds there are dropped. */
  private delimiterWord(): Part[] | null {
    const reader = new Lexer(this.s, this.depth);
    reader.i = this.i;
    const parts = reader.readWord();
    this.i = reader.i;
    return parts;
  }

  /** Commands bash runs here, in order; the first opens the compound commands opened since the last one. */
  private push(commands: SimpleCommand[]): void {
    if (commands.length === 0) return;
    commands[0].opens = [...this.pendingOpens, ...commands[0].opens];
    this.pendingOpens = [];
    this.commands.push(...commands);
  }

  /** The next line of input, without its newline. */
  private nextLine(): string {
    const { s } = this;
    const nl = s.indexOf('\n', this.i);
    const line = s.slice(this.i, nl < 0 ? s.length : nl);
    this.i = nl < 0 ? s.length : nl + 1;
    return line;
  }

  /**
   * Read the pending heredoc bodies. An unquoted body joins a line that ends
   * in an odd run of backslashes to the next one before it looks for the
   * delimiter, as bash does; a quoted body stays literal.
   */
  private readHeredocs(): void {
    const { s } = this;
    for (const pending of this.pending) {
      const { doc } = pending;
      let body = '';
      let found = false;
      while (this.i < s.length) {
        let line = this.nextLine();
        while (!doc.quoted && /(^|[^\\])(\\\\)*\\$/.test(line) && this.i < s.length) line = line.slice(0, -1) + this.nextLine();
        const check = pending.stripTabs ? line.replace(/^\t+/, '') : line;
        if (check === pending.delim) {
          found = true;
          break;
        }
        body += `${check}\n`;
      }
      if (!found) throw new LexError('unterminated heredoc');
      if (!doc.quoted) this.scanExpansions(body, 'in a heredoc', doc.commands);
      doc.body = body;
    }
    this.pending = [];
  }

  /**
   * Text bash expands as in double quotes (an unquoted heredoc body, a `${…}`
   * word, arithmetic): lex its substitutions, into `into` when they run
   * somewhere else than where the text is read (a heredoc's).
   */
  private scanExpansions(text: string, where: string, into: SimpleCommand[] | null = null): void {
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\\') {
        i++;
      } else if (ch === '$' && text[i + 1] === '(') {
        const arithmetic = text[i + 2] === '(' ? arithmeticEnd(text, i + 1, 'dollar') : null;
        if (arithmetic !== null) {
          this.arithmetic(text.slice(i + 3, arithmetic - 1), 'arithmetic expansion $((…))', into);
          i = arithmetic;
        } else {
          const end = matchParen(text, i + 1);
          this.substitute(text.slice(i + 2, end), `command substitution ${where}`, into);
          i = end;
        }
      } else if (ch === '$' && text[i + 1] === '[') {
        const end = matchBracket(text, i + 1);
        this.arithmetic(text.slice(i + 2, end), 'arithmetic expansion $[…]', into);
        i = end;
      } else if (ch === '`') {
        const end = matchBacktick(text, i);
        this.substitute(unescapeBackticks(text.slice(i + 1, end)), `backtick substitution ${where}`, into);
        i = end;
      }
    }
  }

  /**
   * The text of `$((…))`, `$[…]` or `((…))`. Bash expands it as in double quotes
   * and then evaluates it, and a name in it reads a variable's value as an
   * expression, where a subscript runs code.
   */
  private arithmetic(text: string, note: string, into: SimpleCommand[] | null = null): void {
    if (!PLAIN_ARITHMETIC.test(text)) this.dynamic.push(note);
    this.scanExpansions(text, 'in arithmetic', into);
  }

  /** A substitution's commands, which run in a subshell of their own: here, or into `into` with a chain that starts at that subshell. */
  private substitute(inner: string, note: string, into: SimpleCommand[] | null = null): void {
    this.dynamic.push(note);
    if (this.depth >= MAX_SUBSTITUTION_DEPTH) {
      this.limits.push('substitution-depth');
      return;
    }
    const sub = new Lexer(inner, this.depth + 1);
    try {
      sub.run();
    } catch (error) {
      if (!(error instanceof LexError)) throw error;
      // Bash parses a backtick body (and in 3.2 a `$(…)` body) only when it expands it,
      // so a body it cannot parse fails that substitution and the command around it still runs.
      this.dynamic.push(`a substitution it could not read (${error.message})`);
      this.limits.push('unparsed');
    }
    const subshell: Subshell = { lastElement: false };
    for (const cmd of sub.commands) cmd.subshells = [...(into ? [] : this.subshells), subshell, ...cmd.subshells];
    if (into) into.push(...sub.commands);
    else this.push(sub.commands);
    this.dynamic.push(...sub.dynamic);
    this.limits.push(...sub.limits);
  }

  /** Read one word starting at `this.i`, up to unquoted whitespace or an operator. */
  private readWord(): Part[] | null {
    const { s } = this;
    const parts: Part[] = [];
    const lit = (text: string, quoted: boolean) => {
      const last = parts[parts.length - 1];
      if (last && last.kind === 'lit' && last.quoted === quoted) last.text += text;
      else parts.push({ kind: 'lit', text, quoted });
    };
    const wordStart = this.i;
    while (this.i < s.length) {
      const ch = s[this.i];
      if (ch === ' ' || ch === '\t' || ch === '\n') break;
      if ((ch === '<' || ch === '>') && s[this.i + 1] === '(') {
        const end = matchParen(s, this.i + 1);
        this.substitute(s.slice(this.i + 2, end), 'process substitution');
        parts.push({ kind: 'unknown', splits: false });
        this.i = end + 1;
        continue;
      }
      if (OPERATOR_CHARS.has(ch)) {
        // `2>file`: digits right before a redirection are its fd.
        if ((ch === '<' || ch === '>') && this.i > wordStart) {
          const text = s.slice(wordStart, this.i);
          if (/^\d+$/.test(text)) {
            parts.length = 0;
            this.redirect(Number(text));
            return null;
          }
        }
        break;
      }
      if (ch === '\\') {
        if (s[this.i + 1] === '\n') {
          this.i += 2;
          continue;
        }
        if (this.i + 1 < s.length) lit(s[this.i + 1], true);
        this.i += 2;
        continue;
      }
      if (ch === "'") {
        const end = s.indexOf("'", this.i + 1);
        if (end < 0) throw new LexError('unterminated single quote');
        lit(s.slice(this.i + 1, end), true);
        this.i = end + 1;
        continue;
      }
      if (ch === '"') {
        this.readDouble(parts, lit);
        continue;
      }
      if (ch === '`') {
        const end = matchBacktick(s, this.i);
        this.substitute(unescapeBackticks(s.slice(this.i + 1, end)), 'backtick substitution');
        parts.push({ kind: 'unknown', splits: true });
        this.i = end + 1;
        continue;
      }
      if (ch === '$') {
        this.readDollar(parts, lit, false);
        continue;
      }
      lit(ch, false);
      this.i++;
    }
    return parts;
  }

  private readDouble(parts: Part[], lit: (text: string, quoted: boolean) => void): void {
    const { s } = this;
    this.i++;
    while (this.i < s.length) {
      const ch = s[this.i];
      if (ch === '"') {
        this.i++;
        // An empty `""` is a part too: it keeps an empty word and stops a tilde before it.
        lit('', true);
        return;
      }
      if (ch === '\\') {
        const next = s[this.i + 1];
        if (next === '\n') {
          this.i += 2;
        } else if (next === '"' || next === '\\' || next === '$' || next === '`') {
          lit(next, true);
          this.i += 2;
        } else {
          lit('\\', true);
          this.i++;
        }
        continue;
      }
      if (ch === '`') {
        const end = matchBacktick(s, this.i);
        this.substitute(unescapeBackticks(s.slice(this.i + 1, end)), 'backtick substitution');
        parts.push({ kind: 'unknown', splits: false });
        this.i = end + 1;
        continue;
      }
      if (ch === '$') {
        this.readDollar(parts, lit, true);
        continue;
      }
      lit(ch, true);
      this.i++;
    }
    throw new LexError('unterminated double quote');
  }

  private readDollar(parts: Part[], lit: (text: string, quoted: boolean) => void, quoted: boolean): void {
    const { s } = this;
    const next = s[this.i + 1];
    const arithmetic = next === '(' && s[this.i + 2] === '(' ? arithmeticEnd(s, this.i + 1, 'dollar') : null;
    if (arithmetic !== null) {
      this.arithmetic(s.slice(this.i + 3, arithmetic - 1), 'arithmetic expansion $((…))');
      parts.push({ kind: 'unknown', splits: false });
      this.i = arithmetic + 1;
      return;
    }
    if (next === '[') {
      const end = matchBracket(s, this.i + 1);
      this.arithmetic(s.slice(this.i + 2, end), 'arithmetic expansion $[…]');
      parts.push({ kind: 'unknown', splits: false });
      this.i = end + 1;
      return;
    }
    if (next === '(') {
      const end = matchParen(s, this.i + 1);
      this.substitute(s.slice(this.i + 2, end), 'command substitution $(…)');
      parts.push({ kind: 'unknown', splits: !quoted });
      this.i = end + 1;
      return;
    }
    if (next === '{') {
      const end = matchBrace(s, this.i + 1);
      const inner = s.slice(this.i + 2, end);
      this.i = end + 1;
      if (NAME_RE.test(inner)) {
        parts.push({ kind: 'var', name: inner, quoted });
        return;
      }
      if (SPECIAL_PARAMS.has(inner)) {
        parts.push({ kind: 'unknown', splits: inner === '@' || !quoted });
        return;
      }
      // bash 4+'s `${x@Q}` and case changes run no code, so the value is read through them.
      const transform = /^([A-Za-z_][A-Za-z0-9_]*)(@[QULu]|\^\^|,,|\^|,)$/.exec(inner);
      if (transform) {
        parts.push({ kind: 'var', name: transform[1], quoted, transform: transform[2] });
        return;
      }
      const ref = /^[#!]?([A-Za-z_][A-Za-z0-9_]*)/.exec(inner)?.[1];
      const withDefault = /^([A-Za-z_][A-Za-z0-9_]*)(:?)([-=])(.*)$/s.exec(inner);
      this.dynamic.push(`parameter expansion \${${inner}}`);
      this.scanExpansions(inner, 'in a parameter expansion');
      if (withDefault) {
        parts.push({
          kind: 'var',
          name: withDefault[1],
          quoted,
          fallback: fallbackText(withDefault[4], quoted),
          colon: withDefault[2] === ':',
          assigns: withDefault[3] === '=',
          tilde: !quoted && withDefault[4].startsWith('~')
        });
        return;
      }
      const splits = inner.includes('@') || !quoted;
      parts.push(ref ? { kind: 'unknown', ref, splits } : { kind: 'unknown', splits });
      return;
    }
    if (next === "'" && !quoted) {
      const close = findAnsiClose(s, this.i + 2);
      lit(decodeAnsiC(s.slice(this.i + 2, close)), true);
      this.i = close + 1;
      return;
    }
    if (next === '"' && !quoted) {
      // `$"…"` is a locale string: a double-quoted string.
      this.i++;
      return;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(this.i + 1))?.[0];
    if (name) {
      parts.push({ kind: 'var', name, quoted });
      this.i += 1 + name.length;
      return;
    }
    if (next !== undefined && SPECIAL_PARAMS.has(next)) {
      parts.push({ kind: 'unknown', splits: next === '@' || !quoted });
      this.i += 2;
      return;
    }
    lit('$', quoted);
    this.i++;
  }
}

/** Lex a command. Never throws: a lexer error comes back in `error`. */
export function tokenize(command: string): Lexed {
  const lexer = new Lexer(command, 0);
  try {
    lexer.run();
    return { commands: lexer.commands, dynamic: lexer.dynamic, limits: lexer.limits, blanks: lexer.blanks };
  } catch (error) {
    if (!(error instanceof LexError)) throw error;
    return { commands: lexer.commands, dynamic: lexer.dynamic, limits: lexer.limits, blanks: lexer.blanks, error: error.message };
  }
}
