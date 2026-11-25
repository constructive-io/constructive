/**
 * Static risk analysis of a bash command. It finds the paths a command touches
 * and the signals that make it risky, and it fails toward asking: anything it
 * cannot see through (substitution, `eval`, `sh -c`, a variable it cannot
 * resolve) raises `shell-dynamic`. Where the analysis stops at one of its own
 * limits or at text it cannot parse, it raises `unresolvable-path`, which asks
 * in every mode.
 *
 * This is best effort and is not a security boundary. A program the agent
 * wrote can still do anything the user can; only an OS sandbox stops that.
 */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Findings } from '../findings';
import { NEXT_STEP } from '../guidance';
import type { Access, CommandKey, CommandPart, Signal } from '../types';
import { unreachable } from '../unreachable';
import { generic } from './args';
import { runCommand, TESTS } from './commands';
import { type AssignOp, expandWord, ExpansionBudget, type ExpansionScope, MAX_EXPANSION_CHARS, MAX_EXPANSION_WORDS, type VariableRecord, Variables, type WordUse } from './expand';
import { type ContentFlow, FlowTracker, NO_INPUT, type Source, type Stdin, unseenInput } from './flows';
import type { Limit } from './limits';
import { commandParts } from './parts';
import { type Compound, type Heredoc, heredocsOf, type Lexed, MAX_SUBSTITUTION_DEPTH, type Redirect, type SimpleCommand, type Subshell, tokenize, type Word } from './tokenize';
import { isPathLike, isUrl, SHELL_KEYWORDS } from './words';
import { stripWrapper, type WrapperScope, xargsRuns } from './wrappers';

/** One argument after the expansions the analyzer can do. */
/** One argument after the expansions the analyzer can do: its whole text, or only the literal start of it. */
export type Arg = KnownArg | UnknownArg;

export interface KnownArg {
  kind: 'known';
  text: string;
  raw: string;
  /** Has an unquoted `*`, `?` or `[`. */
  glob: boolean;
}

/**
 * Part of the value is not known statically (`$VAR`, `$(…)`), so nothing may
 * read it as text: only `knownPrefix`, the literal text before the first
 * unknown part, is certain (`src/` in `src/$X`, empty in `$_`).
 */
export interface UnknownArg {
  kind: 'unknown';
  knownPrefix: string;
  raw: string;
  /** An unquoted value the analysis cannot know may split it into more words, and one may be an option. */
  splits: boolean;
}

export interface BashPath {
  raw: string;
  /** Absolute, not normalized: `..` is resolved physically when canonicalized. */
  abs: string;
  access: Access;
  /**
   * A real path operand (has `/`, starts with `.` or `~`, a redirection, or a
   * file operand of a known command). A soft one is a bare word that may or may
   * not be a file; it only becomes a target when it leaves the workspace.
   */
  hard: boolean;
  /** Has an unexpanded glob (`*`, `?`, `[…]`): matched as a pattern against the restrictive roots. */
  glob: boolean;
  /** The program loads the file without printing it (`--env-file`). */
  quiet: boolean;
}

export interface DestructiveCheck {
  raw: string;
  /** `null` when the target is not known until the command runs. */
  abs: string | null;
  what: string;
  /** Also destructive on a workspace or temp root itself (`rm -rf .`), not only outside. */
  rootCounts: boolean;
}

/** What the analysis found besides its signals, which go straight into the caller's findings. */
export interface BashAnalysis {
  paths: BashPath[];
  /** Targets that make the command destructive when they sit outside the workspace or are a root. */
  destructiveChecks: DestructiveCheck[];
  /** Where file contents go: copies, the clipboard, transforms. */
  flows: ContentFlow[];
  /** Variables the command expands that it did not set itself. */
  envRefs: string[];
  /** The command may turn on globs that match dotfiles (`shopt -s dotglob`). */
  dotglob: boolean;
  /** The simple commands of a plain list or pipeline; `null` for any other syntax, or after a `cd`. */
  parts: CommandPart[] | null;
}

export interface AnalyzeContext {
  cwd: string;
  homeDir: string;
}

/** The program a simple command runs, and its operands after the wrappers came off: those of every run when xargs runs it. */
export interface Run {
  name: string;
  rest: Arg[];
  xargs: boolean;
}

/**
 * The exact-grant key, built from the lexer's tokens alone: the unquoted runs
 * of spaces and tabs before the first token and after the last one dropped,
 * and each run between two tokens made one space, since bash reads any such
 * run the same. Everything inside a token stays as written: quotes, `${…}`, a
 * substitution, an escaped space (`a\ `), and so do a heredoc body and every
 * other character (newline, `\r`, NBSP), because bash reads each of them
 * differently from a space. A command the lexer cannot read, or one longer
 * than the analysis reads, is its own key as written.
 */
export function normalizeCommand(command: string): CommandKey {
  if (command.length > MAX_COMMAND_LENGTH) return command as CommandKey;
  const lexed = tokenize(command);
  if (lexed.error) return command as CommandKey;
  let key = '';
  let from = 0;
  for (const [start, end] of lexed.blanks) {
    key += command.slice(from, start) + (start === 0 || end === command.length ? '' : ' ');
    from = end;
  }
  return (key + command.slice(from)) as CommandKey;
}

/** Where the shell is at a point of the command: where it started, a dir it moved to, or one the analysis cannot know. */
export type Cwd = { kind: 'start' } | { kind: 'moved'; dir: string } | { kind: 'unknown' };

export function sameCwd(a: Cwd, b: Cwd): boolean {
  return a.kind === b.kind && (a.kind !== 'moved' || (b.kind === 'moved' && a.dir === b.dir));
}

/**
 * A trap's action, which the shell runs later: at exit only (`EXIT`), or
 * `anytime`, on a signal, before a command (`DEBUG`), on an error or a
 * return. `vars`: the variables where the trap was set.
 */
interface Trap {
  text: string;
  anytime: boolean;
  vars: Variables;
}

/**
 * The traps a subshell keeps: under `set -T` the DEBUG and RETURN traps, and
 * under `set -E` the ERR trap. The analysis cannot know those options (one
 * may come from a variable or the environment), so a subshell always keeps
 * them; it resets every other trap, as bash does.
 */
const SUBSHELL_TRAPS: ReadonlySet<string> = new Set(['DEBUG', 'RETURN', 'ERR']);

/** A shell's variables and the values HOME held, as a wrapper found them before it changed its program's environment. */
export interface ShellEnv {
  readonly vars: Variables;
  readonly homes: ReadonlySet<string | undefined> | null;
}

/** A copy of each condition's list, with the same trap objects in it. */
function copyTraps(traps: ReadonlyMap<string, readonly Trap[]>, keep: (key: string) => boolean = () => true): Map<string, Trap[]> {
  return new Map([...traps].filter(([key]) => keep(key)).map(([key, list]) => [key, [...list]]));
}

/**
 * One shell as the command runs in it: its variables and dir; every value of
 * HOME bash 5.3's tilde may read there (`null` once one is unknown); its
 * traps by condition, more than one where an action that may run anytime set
 * one in place of another; the names a trap that may run before any later
 * command assigns (unknown wherever they are read after it is set); and
 * whether such a trap moves the shell, so no later relative path is known.
 * A subshell and a child shell start from their own constructors; `eval` and
 * a trap's action run in the state itself.
 */
class ShellState {
  constructor(
    public vars: Variables,
    public cwd: Cwd,
    public homes: ReadonlySet<string | undefined> | null,
    readonly traps: Map<string, Trap[]> = new Map(),
    readonly trapAssigns: Set<string> = new Set(),
    public trapMovesDir = false
  ) {}

  /** What a subshell starts with: a fork of this shell, with the traps bash resets there gone. A name a trap may assign stays unknown. */
  subshell(): ShellState {
    return new ShellState(this.vars.copy(), this.cwd, this.homes, copyTraps(this.traps, (key) => SUBSHELL_TRAPS.has(key)), new Set(this.trapAssigns), this.trapMovesDir);
  }

  /** What a child shell (`sh -c`, a script on stdin) starts with: the exported environment, the HOME in it, and no traps. */
  child(): ShellState {
    const vars = this.vars.forChild();
    const home = vars.get('HOME');
    return new ShellState(vars, this.cwd, home === null ? null : new Set([home]), new Map(), new Set(this.trapAssigns), this.trapMovesDir);
  }

  /** The same shell copied whole, to read an action in and throw away. */
  scratch(): ShellState {
    return new ShellState(this.vars.copy(), this.cwd, this.homes, copyTraps(this.traps), new Set(this.trapAssigns), this.trapMovesDir);
  }

  /** What `other`, a copy of this shell, may have added to it: the traps it set, beside the ones they may replace, the names its traps assign, and whether they move the dir. */
  addTrapsOf(other: ShellState): void {
    for (const [key, list] of other.traps) {
      const mine = this.traps.get(key) ?? [];
      const added = list.filter((trap) => !mine.includes(trap));
      if (added.length > 0) this.traps.set(key, [...mine, ...added]);
    }
    for (const name of other.trapAssigns) this.trapAssigns.add(name);
    this.trapMovesDir ||= other.trapMovesDir;
  }

  /** HOME may have changed: keep the value it holds now. */
  noteHome(): void {
    if (this.homes === null) return;
    const home = this.vars.get('HOME');
    this.homes = home === null ? null : new Set([...this.homes, home]);
  }
}

/** A subshell open where the analysis is, and the state of the shell around it, which is the state again when it ends. */
interface Frame {
  subshell: Subshell;
  outer: ShellState;
}

/** The key bash keeps a trap's condition under: it reads `EXIT`, `exit`, `SIGEXIT` and `0` as one; `null` for one from a variable. */
function trapKey(condition: Arg): string | null {
  if (condition.kind === 'unknown') return null;
  const name = condition.text.toUpperCase().replace(/^SIG/, '');
  return name === '0' ? 'EXIT' : name;
}

/** How a shell string runs: `inherits` the stdin of the command that runs it, and `shared`, in the current shell (`eval`, a trap). */
export interface Nesting {
  inherits?: boolean;
  shared?: boolean;
}

/** The text an argument certainly starts with: all of it when known, its literal start otherwise. */
export function literalStart(arg: Arg): string {
  return arg.kind === 'known' ? arg.text : arg.knownPrefix;
}

/** Whether IFS may differ from bash's default (space, tab, newline). */
type IfsState = 'default' | 'maybe-changed';

/** How many shell strings (`sh -c`, `eval`, …) deep the analysis reads. */
const MAX_SHELL_STRING_DEPTH = 4;

/** The longest command the analysis reads. */
export const MAX_COMMAND_LENGTH = 64 * 1024;

/** What each limit of the analysis leaves unread. */
const LIMIT_REASONS: Record<Limit, string> = {
  'substitution-depth': `it nests command substitutions more than ${MAX_SUBSTITUTION_DEPTH} deep, and the analysis did not read past that`,
  'shell-string-depth': `it nests shell strings (\`sh -c\`, \`eval\`, …) more than ${MAX_SHELL_STRING_DEPTH} deep, and the analysis did not read past that`,
  'command-length': `it is longer than ${MAX_COMMAND_LENGTH / 1024} KB, and the analysis did not read it`,
  'expansion-chars': `its expansions, with the trap actions the analysis reads again, build more than ${MAX_EXPANSION_CHARS / 1024} KB of text, and the analysis did not read the rest`,
  'expansion-words': `its expansions make more than ${MAX_EXPANSION_WORDS} words, so not every word could be checked`,
  unparsed: 'the analysis could not parse it, so it did not read what bash may run there'
};

/** Builtins whose `NAME=value` arguments bash expands as assignments, with no splitting or glob. */
const DECLARATION_BUILTINS: ReadonlySet<string> = new Set(['export', 'declare', 'local', 'readonly', 'typeset']);

const ASSIGNMENT_WORD = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;

/** POSIX special builtins: an assignment before one persists in POSIX sh (macOS /bin/sh, `set -o posix`), and not in bash. */
const SPECIAL_BUILTINS: ReadonlySet<string> = new Set(['break', ':', 'continue', '.', 'source', 'eval', 'exec', 'exit', 'export', 'readonly', 'return', 'set', 'shift', 'times', 'trap', 'unset']);

/** Assignments that hold for one command only, by name: the record and export before the first one, and the record the last one left. */
type CommandScope = Map<string, { before: VariableRecord; set: VariableRecord; exported: boolean }>;

/** How many leading words are assignments or keywords, before the command word. */
function assignmentLead(words: readonly Word[]): number {
  let k = 0;
  while (k < words.length && (ASSIGNMENT_WORD.test(words[k].raw) || SHELL_KEYWORDS.has(words[k].raw))) k++;
  return k;
}

/** The word expands a variable one of `names` (an assignment before it in the same prefix). */
function refersTo(word: Word, names: ReadonlySet<string>): boolean {
  return word.parts.some((p) => (p.kind === 'var' && names.has(p.name)) || (p.kind === 'unknown' && p.ref !== undefined && names.has(p.ref)));
}

/** Device paths that are not files. */
const HARMLESS_DEVICES = new Set([
  '/dev/null',
  '/dev/stdin',
  '/dev/stdout',
  '/dev/stderr',
  '/dev/tty',
  '/dev/zero',
  '/dev/random',
  '/dev/urandom'
]);

/** Running `/usr/bin/x` is the same as running `x`. */
const SYSTEM_BIN_DIRS = new Set(['/bin', '/sbin', '/usr/bin', '/usr/sbin', '/usr/local/bin', '/opt/homebrew/bin']);

/**
 * Assignments that change which program runs, what it loads (the shell's and
 * every interpreter's preload and library paths), or where a path resolves.
 */
const DANGEROUS_VARS = new RegExp(
  `^(${[
    'PATH|IFS|ENV|BASH_ENV|PROMPT_COMMAND|SHELLOPTS|BASHOPTS|PS4|CDPATH|GLOBIGNORE',
    'GIT_SSH|GIT_SSH_COMMAND|GIT_EXEC_PATH|GIT_EDITOR|GIT_PAGER|EDITOR|VISUAL|PAGER',
    'LD_PRELOAD|LD_LIBRARY_PATH|LD_AUDIT|DYLD_\\w*',
    'NODE_OPTIONS|NODE_PATH|PYTHONPATH|PYTHONSTARTUP|PYTHONHOME|PYTHONINSPECT|PERL5OPT|PERL5LIB|PERLLIB|RUBYOPT|RUBYLIB|JAVA_TOOL_OPTIONS|_JAVA_OPTIONS'
  ].join('|')})$`
);

/** The oh-my-pi critical list (`tools/bash.ts`), matched on the raw command. */
const CRITICAL_PATTERNS: readonly RegExp[] = [
  /\brm\s+(?:-\S+\s+)*(?:-[a-z]*[rRfF][a-z]*|--recursive|--force)\s+(?:-\S+\s+)*\//i,
  /\brm\s+(?:-\S+\s+)*--no-preserve-root\b/i,
  /\bsudo\s+rm\b/i,
  /\bchmod\s+-R\s+[0-7]+\s+\//i,
  /\bchmod\s+-R\s+[ugoa+\-=rwxXst,]+\s+\//,
  /\bchown\s+-R\s+\S+\s+\//i,
  /:\(\)\s*\{\s*:\s*\|\s*:/i,
  />\s*\/dev\/sd[a-z]/i,
  />\s*\/dev\/disk\d/i,
  /\bmkfs(\.|\b)/i,
  /\bdd\s+if=.+of=\/dev\//i,
  /\bshred\s+\/dev\//i,
  /\bcryptsetup\b/i,
  />\s*\/etc\/(?:passwd|shadow|sudoers)\b/i,
  /\btee\s+(?:-a\s+)?\/etc\/(?:passwd|shadow|sudoers)\b/i,
  /\b(?:curl|wget|fetch)\b[^|]*\|\s*(?:sudo\s+)?(?:bash|sh|zsh|fish)\b/i,
  /(?:^|[\s;&|(])(?:bash|sh|zsh|source|\.)\s+<\(\s*(?:curl|wget|fetch)\b/i,
  /\beval\s+["'`]?\$\(\s*(?:curl|wget|fetch)\b|\beval\s+`\s*(?:curl|wget|fetch)\b/i,
  /\bkill\s+-9\s+1\b/,
  /(?:^|[\s;&|(])(?:shutdown|poweroff|reboot|halt)(?:\s|$|[;|&])/i,
  /(?:^|[\s;&|(])init\s+0\b/i,
  /\bnc\b[^|;]*\s-[a-zA-Z]*[ec][a-zA-Z]*\s/i
];

const PLACEHOLDER_RE = /«secret:[^»]*»/;

/** The command holds a `«secret:…»` placeholder, which raises `placeholder-in-command`. */
export function hasPlaceholder(command: string): boolean {
  return PLACEHOLDER_RE.test(command);
}

/** Shell options that make `*` match dotfiles. */
const DOTGLOB_RE = /dotglob|glob_?dots|GLOBIGNORE/i;

/** `$NAME` and `${NAME…}` in a heredoc body. */
const BODY_VAR_RE = /\$\{?[#!]?([A-Za-z_][A-Za-z0-9_]*)/g;

/** The word's leading literal text is `IFS`, `IFS=…` or `IFS+=…`. */
function namesIfs(word: Word): boolean {
  let lead = '';
  for (const part of word.parts) {
    if (part.kind !== 'lit') break;
    lead += part.text;
  }
  return /^IFS(\+?=|$)/.test(lead);
}

/** The commands, with the substitutions of their heredocs, at every depth. */
function withHeredocCommands(commands: readonly SimpleCommand[]): SimpleCommand[] {
  return commands.flatMap((cmd) => [cmd, ...withHeredocCommands(heredocsOf(cmd).flatMap((doc) => doc.commands))]);
}

function isHarmlessDevice(abs: string): boolean {
  return HARMLESS_DEVICES.has(abs) || abs.startsWith('/dev/fd/');
}

class Analyzer implements ExpansionScope {
  readonly paths: BashPath[] = [];
  readonly checks: DestructiveCheck[] = [];
  readonly tracker = new FlowTracker(this);
  /** Variables expanded but never set in the command: they come from the environment. */
  readonly envRefs = new Set<string>();
  /** git remotes the command adds or points elsewhere (`git remote add`, `set-url`, `-c remote.x.url=`). */
  readonly gitRemotes = new Set<string>();
  /** What the command being analyzed reads on stdin. */
  stdin: Stdin = NO_INPUT;
  /** What a command reads when no pipe or redirection sets its stdin: nothing at the top, and in a shell string what its runner gave it. */
  inheritedStdin: Stdin = NO_INPUT;
  /** The shell the analysis is in at this point of the command. */
  private state: ShellState;
  /** Some command ran, or the shell moved, outside the start dir. */
  private leftStart = false;
  /** What the expansions of this command may still build. */
  private readonly budget = new ExpansionBudget((limit) => this.incomplete(limit));
  /** The assignments that hold for the command being analyzed only. */
  private scope: CommandScope | null = null;
  /** The subshells open in the shell string being analyzed, outermost first. */
  private frames: Frame[] = [];
  /** The compound commands whose redirections were applied where they start. */
  private readonly applied = new Set<Compound>();
  /** Names unknown to the trap action being read at the end: the command assigned them after the trap was set. */
  private trapUnknown: ReadonlySet<string> | null = null;
  /** How many traps on a condition from a variable were set, which no later trap command replaces. */
  private unknownConditions = 0;
  /** The command mentions `lastpipe`, which runs a pipeline's last element in the shell itself. */
  lastpipe = false;

  /** The command's one text budget, for the texts the analysis builds beyond its words (printed output, heredocs). */
  get textBudget(): ExpansionBudget {
    return this.budget;
  }
  /**
   * Whether IFS may differ from bash's default: a word names it (`IFS=:`,
   * `read IFS`, `mapfile -t IFS`, `for IFS in …`) or the command assigns it
   * (also through a name it built, `N=IFS; export $N=:`).
   */
  private ifs: IfsState = 'default';
  /** How many shell strings (`sh -c`, `eval`, …) deep the analysis is. */
  private depth = 0;

  constructor(
    readonly ctx: AnalyzeContext,
    private readonly findings: Findings
  ) {
    this.state = new ShellState(new Variables((name) => this.outsideValue(name)), { kind: 'start' }, new Set([this.home]));
  }

  flag(signal: Signal, reason: string): void {
    this.findings.flag(signal, reason);
  }

  dynamic(reason: string): void {
    this.flag('shell-dynamic', reason);
  }

  /** A path the analyzer cannot place: it asks in every mode, so no mode lets it reach a denied root. */
  unresolvable(reason: string): void {
    this.flag('unresolvable-path', reason);
  }

  /** The analysis stopped at one of its own limits, or at text it cannot parse, so it has not read the whole command. */
  incomplete(limit: Limit, detail?: string): void {
    this.unresolvable(`${LIMIT_REASONS[limit]}${detail ? ` (${detail})` : ''}. ${NEXT_STEP.unread}`);
  }

  /** `cd dir` looks `dir` up in `CDPATH` when the command set it and `dir` is not `/…`, `./…` or `../…`. */
  searchesCdPath(dir: string): boolean {
    return this.state.vars.touched('CDPATH') && this.state.vars.get('CDPATH') !== undefined && !dir.startsWith('/') && !/^\.\.?(\/|$)/.test(dir);
  }

  /** Analyze one shell string in the shell the analysis is in. Returns what it lexed to, or `null` when it was not lexed. */
  analyzeString(command: string): Lexed | null {
    if (this.depth > MAX_SHELL_STRING_DEPTH) {
      this.incomplete('shell-string-depth');
      return null;
    }
    if (command.length > MAX_COMMAND_LENGTH) {
      this.incomplete('command-length');
      return null;
    }
    const lexed = tokenize(command);
    if (withHeredocCommands(lexed.commands).some((cmd) => cmd.words.some(namesIfs))) this.ifs = 'maybe-changed';
    if (lexed.error) this.incomplete('unparsed', lexed.error);
    for (const note of lexed.dynamic) this.dynamic(`it uses ${note}`);
    for (const limit of lexed.limits) this.incomplete(limit);
    const outerFrames = this.frames;
    this.frames = [];
    for (const cmd of lexed.commands) {
      this.enterSubshells(cmd.subshells);
      this.analyzeCommand(cmd);
    }
    this.enterSubshells([]);
    this.frames = outerFrames;
    return lexed;
  }

  /**
   * The shell the analysis is in exits, so the traps set in it run. Each
   * action is read again here, so its text is charged to the budget, which
   * bounds a trap that many subshells keep.
   */
  exitShell(): void {
    const around = this.trapUnknown;
    for (const trap of [...this.state.traps.values()].flat()) {
      if (!this.budget.takeChars(trap.text.length)) break;
      const outer = this.state;
      this.state = outer.scratch();
      // A trap that may have run earlier does not know a name assigned after it was set, nor one the trap read around it does not.
      const changed = trap.anytime ? outer.vars.changedFrom(trap.vars) : [];
      this.trapUnknown = around === null && !trap.anytime ? null : new Set([...(around ?? []), ...changed]);
      this.nested(trap.text, null, { shared: true });
      this.state = outer;
    }
    this.trapUnknown = around;
  }

  /** Leave the open subshells `chain` does not hold, innermost first, and open the ones it adds, outermost first. */
  private enterSubshells(chain: readonly Subshell[]): void {
    let keep = 0;
    while (keep < this.frames.length && this.frames[keep].subshell === chain[keep]) keep++;
    while (this.frames.length > keep) this.leaveSubshell(this.frames.pop());
    for (const subshell of chain.slice(keep)) {
      this.frames.push({ subshell, outer: this.state });
      this.state = this.state.subshell();
    }
  }

  /**
   * A subshell ends: its traps run, and the shell around it is as it was.
   * Under `lastpipe` the last element of a pipeline ran in the shell itself,
   * so a name it changed holds either value, a dir it moved to is unknown,
   * and the traps it set and their effects are the shell's too.
   */
  private leaveSubshell(frame: Frame): void {
    this.exitShell();
    const inner = this.state;
    const { outer } = frame;
    this.state = outer;
    if (!frame.subshell.lastElement || !this.lastpipe) return;
    for (const name of inner.vars.changedFrom(outer.vars)) outer.vars.either(name, outer.vars.record(name));
    outer.noteHome();
    if (!sameCwd(inner.cwd, outer.cwd)) outer.cwd = { kind: 'unknown' };
    outer.addTrapsOf(inner);
  }

  /**
   * `trap ACTION CONDITION…`: the shell keeps the action for each condition,
   * in place of the one it had, and runs it later, in itself. It is read
   * here, in the shell as it is now, and again when the shell exits. One that
   * may run before any later command (any condition but `EXIT`) may have run
   * by any later point, so what it does is added to the shell, and nothing it
   * resets is taken away: each name it assigns is unknown for the rest of the
   * command, the dir is unknown when it moves it, and a trap it sets runs
   * beside the one it may replace.
   */
  setTrap(text: string, conditions: readonly Arg[]): void {
    const keys = conditions.map(trapKey);
    const vars = this.state.vars.copy();
    for (const key of keys) this.state.traps.set(key ?? `\u0000${this.unknownConditions++}`, [{ text, anytime: key !== 'EXIT', vars }]);
    const outer = this.state;
    const read = outer.scratch();
    this.state = read;
    this.nested(text, null, { shared: true });
    this.state = outer;
    if (keys.every((k) => k === 'EXIT')) return;
    for (const name of read.vars.changedFrom(outer.vars)) outer.trapAssigns.add(name);
    outer.trapMovesDir ||= !sameCwd(read.cwd, outer.cwd);
    outer.addTrapsOf(read);
  }

  /** A trap reset (`trap - INT`) or ignore (`trap '' INT`): no action runs on those conditions. One from a variable may be any, so it removes none. */
  resetTraps(conditions: readonly Arg[]): void {
    const keys = conditions.map(trapKey);
    if (keys.includes(null)) return;
    for (const key of keys) this.state.traps.delete(key);
  }

  /** The working dir as an absolute path, or `null` when it cannot be known. */
  get base(): string | null {
    return this.state.trapMovesDir ? null : this.dirOf(this.state.cwd);
  }

  /** Every command so far ran in the start dir, so relative paths in its parts mean what they say. */
  get stayedAtStart(): boolean {
    return !this.leftStart;
  }

  private dirOf(cwd: Cwd): string | null {
    switch (cwd.kind) {
    case 'start':
      return path.resolve(this.ctx.cwd);
    case 'moved':
      return cwd.dir;
    case 'unknown':
      return null;
    default:
      return unreachable(cwd);
    }
  }

  /** The dir `text` names from `from` (the working dir by default). */
  dirAt(text: string, from: Cwd = this.state.cwd): Cwd {
    const abs = this.toAbs(text, this.dirOf(from));
    return abs === null ? { kind: 'unknown' } : { kind: 'moved', dir: path.resolve(abs) };
  }

  /** `cd`, `pushd`, `popd`: the shell moves for the rest of the command. */
  moveTo(next: Cwd): void {
    this.state.cwd = next;
    if (next.kind !== 'start') this.leftStart = true;
  }

  /** `env -C dir`: the shell moves for this one command, and `runArgs` moves it back. */
  moveForOneCommand(scope: WrapperScope, next: Cwd): void {
    scope.outerCwd ??= this.state.cwd;
    this.moveTo(next);
  }

  /**
   * The environment of the program a wrapper runs (`env A=1`, `env -u`,
   * `env -i`, sudo's reset), which a child shell it starts begins from. It
   * holds for this one command: the first change takes a copy, `change`
   * replaces it, and `runArgs` puts the shell's variables and HOME values back.
   */
  programEnv(scope: WrapperScope, change?: (vars: Variables) => Variables): Variables {
    if (!scope.outerEnv) {
      scope.outerEnv = { vars: this.state.vars, homes: this.state.homes };
      this.state.vars = this.state.vars.copy();
    }
    if (change) this.state.vars = change(this.state.vars);
    return this.state.vars;
  }

  /** The shell's working dir at this point of the command. */
  get cwdNow(): Cwd {
    return this.state.cwd;
  }

  /** `git -C dir`: run `fn` with the shell in `dir`, then move back. */
  within<T>(dir: Cwd, fn: () => T): T {
    const outer = this.state.cwd;
    this.moveTo(dir);
    try {
      return fn();
    } finally {
      this.state.cwd = outer;
    }
  }

  /**
   * A shell string run by `sh -c`, `eval`, `watch`, …, flagged with `why`
   * when it is code the command hides. `inherits`: it reads the stdin of the
   * command that runs it (`sh -c`, `eval`, `sudo -s`); otherwise its stdin is
   * one the analysis cannot see (a pager, tar's `--to-command`). `shared`: it
   * runs in the current shell (`eval`, a trap's action), so what it assigns,
   * the dir it moves to and the traps it sets hold after it; otherwise it runs
   * in a child shell, which starts from the exported environment and exits at
   * its end.
   */
  nested(text: string, why: string | null, how: Nesting = {}): void {
    if (why !== null) this.dynamic(why);
    const outer = this.state;
    const savedStdin = this.stdin;
    const savedInherited = this.inheritedStdin;
    this.inheritedStdin = how.inherits ? this.stdin : unseenInput();
    if (!how.shared) this.state = outer.child();
    this.depth++;
    this.analyzeString(text);
    if (!how.shared) this.exitShell();
    this.depth--;
    this.state = outer;
    this.stdin = savedStdin;
    this.inheritedStdin = savedInherited;
  }

  /**
   * `NAME=value`, inline or through `export`, `declare` or `readonly`.
   * `value` is `null` when it is not known statically.
   */
  /** An unquoted expansion may split where this analysis does not follow it. */
  ifsMayDiffer(): boolean {
    switch (this.ifs) {
    case 'default':
      return false;
    case 'maybe-changed':
      return true;
    default:
      return unreachable(this.ifs);
    }
  }

  /** `export $N=x`: an assignment whose name the analysis cannot know may set PATH, IFS or anything else. */
  assignUnknownName(raw: string): void {
    this.ifs = 'maybe-changed';
    this.dynamic(`it sets a variable whose name comes from ${raw}, which may change what runs`);
  }

  /** Every assignment goes through here: `NAME=value`, `NAME+=value`, and the builtins that set a name. */
  assign(name: string, op: AssignOp, value: string | null): void {
    if (name === 'IFS') this.ifs = 'maybe-changed';
    if (DANGEROUS_VARS.test(name)) this.dynamic(`it sets ${name}, which changes what runs`);
    this.state.vars.assign(name, op, value);
    if (name === 'HOME') this.state.noteHome();
  }

  /** `export NAME`, `declare -x NAME` (`on`), or `export -n NAME`, `declare +x NAME`: whether a child shell sees the value. */
  setExported(name: string, on: boolean): void {
    this.state.vars.setExported(name, on);
  }

  unexportAll(): void {
    this.state.vars.unexportAll();
  }

  /** An assignment before a command: it holds, exported, for this command only. */
  private assignForCommand(scope: CommandScope, name: string, op: AssignOp, value: string | null): void {
    const { vars, homes } = this.state;
    if (!scope.has(name)) scope.set(name, { before: vars.record(name), set: undefined, exported: vars.isExported(name) });
    this.assign(name, op, value);
    // Only the command's own environment holds it, so bash 5.3's tilde does not read it later.
    this.state.homes = homes;
    vars.setExported(name, true);
    scope.get(name).set = vars.record(name);
  }

  /**
   * After the command: each name its assignments set is put back, with its
   * export. Where the shell may keep it (before a special builtin, or a
   * command word from a variable, which may be one or expand to nothing) it
   * holds either value; one the command changed itself (`X=1 read X`) is
   * unknown.
   */
  private endCommandScope(scope: CommandScope, special: boolean): void {
    const { vars } = this.state;
    for (const [name, { before, set, exported }] of scope) {
      if (vars.record(name) !== set) vars.assign(name, '=', null);
      else if (special) vars.either(name, before);
      else vars.restore(name, before);
      vars.setExported(name, exported);
      if (name === 'HOME') this.state.noteHome();
    }
  }

  /**
   * The assignments before the command word, in order, each expanded after
   * the ones before it. Before a command (`scope`), bash 3.2 expands them
   * all first and bash 4+ one at a time, so one that refers to an earlier
   * one is unknown.
   */
  private assignPrefix(words: readonly Word[], scope: CommandScope | null): void {
    for (const word of words) {
      if (SHELL_KEYWORDS.has(word.raw)) continue;
      const arg = this.resolveWord(word, 'assignment')[0];
      const m = /^([A-Za-z_][A-Za-z0-9_]*)(\+?)=(.*)$/s.exec(literalStart(arg));
      if (!m) continue;
      const op: AssignOp = m[2] ? '+=' : '=';
      const value = arg.kind === 'known' && !(scope && refersTo(word, new Set(scope.keys()))) ? m[3] : null;
      if (scope) this.assignForCommand(scope, m[1], op, value);
      else this.assign(m[1], op, value);
    }
  }

  unset(name: string): void {
    if (name === 'IFS') this.ifs = 'maybe-changed';
    this.state.vars.unset(name);
    if (name === 'HOME') this.state.noteHome();
  }

  /** A variable the command expands: an env ref unless the command set it. */
  noteRef(name: string): void {
    if (!this.state.vars.touched(name)) this.envRefs.add(name);
  }

  /** A variable the command did not set: only HOME, IFS and PWD are known. */
  private outsideValue(name: string): string | null {
    if (name === 'HOME') return this.home;
    // Bash sets IFS to its default at startup and does not take it from the environment.
    if (name === 'IFS') return ' \t\n';
    if (name === 'PWD') return this.base;
    return null;
  }

  /** bash 3.2 (macOS's /bin/bash) and bash 4+ expand a word's braces differently: the command may make either word list. */
  bashesDiffer(word: string): void {
    this.unresolvable(`bash 3.2 and bash 4 or later expand the braces in ${word} to different words, and the analysis cannot know which bash runs it`);
  }

  /** After the command changed HOME, bash 3.2 and bash 5.3 expand a tilde to different dirs. */
  tildesDiffer(word: string): void {
    this.unresolvable(
      `bash 3.2 expands the ~ in ${word} from the HOME the command set, and bash 5.3 from the HOME the shell last passed to a program, which may be an earlier one, and the analysis cannot know which bash runs it`
    );
  }

  /**
   * The dirs `~` may expand to: the user's home for an unset HOME. bash 3.2
   * reads the shell's HOME, and bash 5.3 the HOME of the environment the shell
   * last built for a program it ran, which may be any value HOME held since
   * the shell started, so they differ once the command sets HOME.
   */
  tildeHomes(): readonly string[] | null {
    const now = this.lookup('HOME');
    const { homes } = this.state;
    if (now === null || homes === null) return null;
    return [...new Set([now, ...homes].map((home) => home ?? this.home))];
  }

  /** Its value; `null` when it cannot be known, `undefined` when the command unset it. */
  lookup(name: string): string | null | undefined {
    if (this.trapUnknown !== null ? this.trapUnknown.has(name) : this.state.trapAssigns.has(name)) return null;
    return this.state.vars.get(name);
  }

  /**
   * `$NAME`, or `${NAME-fallback}` and `${NAME:-fallback}`. The fallback
   * counts only when the variable is unset, or with the colon empty; one from
   * outside may hold anything. The `=` forms (`assigns`) also set the variable
   * to the fallback they take.
   */
  value(name: string, fallback: string | undefined, colon: boolean, assigns: boolean, tilde: boolean): string | null {
    const value = this.lookup(name);
    if (fallback === undefined) return value === undefined ? '' : value;
    if (value === null || (value !== undefined && !(colon && value === ''))) return value;
    const taken = this.fallbackValue(fallback, tilde);
    if (assigns) this.assign(name, '=', taken);
    return taken;
  }

  /**
   * A fallback's value: unknown with its own expansion, and a leading `~`
   * that expands (`tilde`) is the home dir as in bash (`~user`, and a `~` the
   * bashes read differently, is not known).
   */
  private fallbackValue(fallback: string, tilde: boolean): string | null {
    if (/[$`]/.test(fallback)) return null;
    if (!tilde || !fallback.startsWith('~')) return fallback;
    const homes = this.tildeHomes();
    return /^~(\/|$)/.test(fallback) && homes?.length === 1 ? homes[0] + fallback.slice(1) : null;
  }

  get home(): string {
    return path.resolve(this.ctx.homeDir);
  }

  /** The arguments a word expands to as bash expands an argument. */
  resolveWord(word: Word, use: WordUse = 'argument'): Arg[] {
    return expandWord(word, use, this, this.budget);
  }

  /**
   * A command's words as bash expands them: the assignments before the
   * command word, and the `NAME=value` arguments of a declaration builtin, as
   * assignments; every other word as an argument.
   */
  private expandWords(words: readonly Word[]): Arg[] {
    const args: Arg[] = [];
    let beforeCommand = true;
    let declaration = false;
    for (const word of words) {
      const assignment = ASSIGNMENT_WORD.test(word.raw);
      if (beforeCommand && !assignment && !SHELL_KEYWORDS.has(word.raw)) {
        beforeCommand = false;
        declaration = DECLARATION_BUILTINS.has(word.raw);
      }
      args.push(...this.resolveWord(word, assignment && (beforeCommand || declaration) ? 'assignment' : 'argument'));
    }
    return args;
  }

  /** The absolute location of an argument, or `null` when it is unknown. */
  toAbs(text: string, base: string | null = this.base): string | null {
    if (/^file:\/\//i.test(text)) {
      try {
        return fileURLToPath(text);
      } catch {
        return null;
      }
    }
    if (text.startsWith('/')) return text;
    if (base === null) return null;
    return `${base}/${text}`;
  }

  /** Record a path the command touches. `quiet`: the program loads it without printing it. */
  addPath(arg: Arg, access: Access, hard: boolean, quiet = false): void {
    if (arg.kind === 'unknown') {
      if (hard) this.unresolvable(`the path ${arg.raw} is built from a variable or substitution`);
      return;
    }
    if (arg.text === '') return;
    const abs = this.toAbs(arg.text);
    if (abs === null) {
      this.unresolvable(`${arg.raw} is used after a cd to an unknown dir`);
      return;
    }
    if (isHarmlessDevice(abs)) return;
    if (arg.glob) {
      const components = arg.text.split('/');
      const firstGlob = components.findIndex((c: string) => /[*?[]/.test(c));
      if (components.slice(firstGlob).includes('..')) {
        this.dynamic(`the glob ${arg.raw} climbs out with ..`);
        return;
      }
    }
    this.paths.push({ raw: arg.raw, abs, access, hard, glob: arg.glob, quiet });
  }

  destroy(arg: Arg | null, what: string, rootCounts = false): void {
    if (arg === null || arg.kind === 'unknown') {
      this.flag('destructive', `it runs ${what} on paths that are not known until it runs`);
      return;
    }
    const abs = this.toAbs(arg.text);
    if (abs === null) this.flag('destructive', `it runs ${what} after a cd to an unknown dir`);
    else this.checks.push({ raw: arg.raw, abs, what, rootCounts });
  }

  /**
   * One simple command, in POSIX's order ("Simple Commands"): a command of
   * assignments alone makes them before its redirections. Otherwise its words
   * and redirections expand first, and its assignments hold for it only.
   */
  analyzeCommand(cmd: SimpleCommand, chain: readonly Subshell[] = cmd.subshells): void {
    for (const compound of cmd.opens) {
      this.applied.add(compound);
      this.redirect(compound.redirects, chain);
    }
    // What feeds it, a compound command's redirections included, is expanded before anything in it runs.
    const stdin = this.tracker.stdinOf(cmd);
    const stdinFed = stdin.fed;
    const lead = assignmentLead(cmd.words);
    const prefix = cmd.words.slice(0, lead);
    const args = this.expandWords(cmd.words.slice(lead));
    // No command word is left, also when the words expand to nothing (`F=x $EMPTY`), so the assignments hold in the shell.
    const bare = args.length === 0;
    if (bare) this.assignPrefix(prefix, null);
    this.stdin = stdin;
    for (const doc of heredocsOf(cmd)) {
      if (!doc.quoted) for (const m of doc.body.matchAll(BODY_VAR_RE)) this.noteRef(m[1]);
    }

    const from = this.paths.length;
    const stdout = cmd.closes && this.applied.has(cmd.closes) ? [] : this.redirect(cmd.redirects, chain);
    const outer = this.scope;
    const scope: CommandScope | null = bare ? null : new Map();
    this.scope = scope;
    let run: Run | null;
    try {
      if (scope) this.assignPrefix(prefix, scope);
      run = this.runArgs(args, stdinFed);
    } finally {
      this.scope = outer;
    }
    const name = args[0];
    if (scope) this.endCommandScope(scope, name.kind === 'unknown' || SPECIAL_BUILTINS.has(name.text));
    const reads = this.paths.slice(from).filter((p) => p.access === 'read' && !p.quiet);
    const sources = [...reads.map(({ raw, abs }) => ({ raw, abs })), ...stdin.sources];
    this.tracker.record(cmd, run, sources, stdout);
  }

  /**
   * Redirections, in order, in the shell `chain` is in: a file one is a path,
   * and a heredoc's substitutions run where bash expands its body. Returns the
   * files the command's stdout goes to.
   */
  private redirect(redirects: readonly Redirect[], chain: readonly Subshell[]): Source[] {
    const stdout: Source[] = [];
    for (const r of redirects) {
      if (r.kind === 'heredoc') this.heredocCommands(r.doc, chain);
      if (r.kind !== 'file') continue;
      const access: Access = r.op === '<' ? 'read' : 'write';
      for (const target of this.resolveWord(r.target)) {
        if (target.kind === 'unknown') {
          this.unresolvable(`it redirects to ${target.raw}, a path from a variable or substitution`);
          continue;
        }
        this.addPath(target, access, true);
        const abs = this.toAbs(target.text);
        if (access === 'write' && r.fd !== 2 && abs !== null && !isHarmlessDevice(abs)) stdout.push({ raw: target.raw, abs });
      }
    }
    return stdout;
  }

  /** The substitutions of a heredoc's body, each in its subshell inside the shell of the command that owns the heredoc. */
  private heredocCommands(doc: Heredoc, chain: readonly Subshell[]): void {
    if (doc.commands.length === 0) return;
    const { stdin } = this;
    for (const cmd of doc.commands) {
      const inner = [...chain, ...cmd.subshells];
      this.enterSubshells(inner);
      this.analyzeCommand(cmd, inner);
    }
    this.enterSubshells(chain);
    this.stdin = stdin;
  }

  /**
   * Take assignments, keywords and wrappers off, then apply the command's
   * rules. Returns the program and its operands, or `null` when there is none.
   * A wrapper's working dir (`env -C`) holds for this command only.
   */
  runArgs(args: Arg[], stdinFed: boolean): Run | null {
    const scope: WrapperScope = { sudo: false, xargs: null, outerCwd: null, outerEnv: null };
    try {
      return this.run(args, stdinFed, scope);
    } finally {
      if (scope.outerCwd) this.state.cwd = scope.outerCwd;
      if (scope.outerEnv) {
        this.state.vars = scope.outerEnv.vars;
        this.state.homes = scope.outerEnv.homes;
      }
    }
  }

  private run(words: Arg[], stdinFed: boolean, scope: WrapperScope): Run | null {
    let args = words;
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      const assignment = /^([A-Za-z_][A-Za-z0-9_]*)(\+?)=(.*)$/s.exec(literalStart(arg));
      if (assignment && ASSIGNMENT_WORD.test(arg.raw)) {
        // After a wrapper (`env A=1`, `sudo A=1`) it sets the environment of the program the wrapper runs.
        this.programEnv(scope);
        this.assign(assignment[1], assignment[2] ? '+=' : '=', arg.kind === 'known' ? assignment[3] : null);
        this.state.vars.setExported(assignment[1], true);
        i++;
        continue;
      }
      if (arg.kind === 'known' && arg.raw === arg.text && SHELL_KEYWORDS.has(arg.text)) {
        i++;
        continue;
      }
      if (arg.raw === 'function') {
        this.dynamic('it defines a shell function');
        return null;
      }
      if (arg.raw === 'for' || arg.raw === 'select') {
        const name = args[i + 1];
        if (name?.kind === 'known' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name.text)) this.assign(name.text, '=', null);
        const inAt = args.findIndex((a, k) => k > i && a.raw === 'in');
        if (inAt > 0) for (const item of args.slice(inAt + 1)) this.operand(item);
        return null;
      }
      if (arg.raw === 'case') return null;
      const next = stripWrapper(this, args, i, scope);
      if (typeof next !== 'number') {
        args = next.argv;
        i = 0;
      } else if (next === i) {
        break;
      } else {
        i = next;
      }
    }
    if (i >= args.length) return null;

    const argv0 = args[i];
    if (argv0.kind === 'unknown' || (argv0.glob && !TESTS.has(argv0.text))) {
      this.dynamic(`the command name ${argv0.raw} ${argv0.kind === 'unknown' ? 'comes from a variable or substitution' : 'is a glob'}`);
      // Whatever it turns out to be, its operands are files it may touch.
      generic({ analyzer: this, stdinFed, xargs: scope.xargs !== null }, args.slice(i + 1));
      return null;
    }
    if (argv0.text.includes('/')) {
      const abs = this.toAbs(argv0.text);
      if (abs === null || !SYSTEM_BIN_DIRS.has(path.dirname(path.resolve(abs)))) this.addPath(argv0, 'exec', true);
    }
    const name = path.basename(argv0.text);
    if (scope.sudo && name === 'rm') this.flag('destructive', 'it runs rm as root');
    const own = args.slice(i + 1);
    const runs = scope.xargs ? xargsRuns(this, name, own, scope.xargs) : [own];
    for (const rest of runs) runCommand(name, rest, { analyzer: this, stdinFed, xargs: scope.xargs !== null });
    return { name, rest: runs.flat(), xargs: scope.xargs !== null };
  }

  /** A bare operand: a hard path when it looks like one, a soft one otherwise. URLs are skipped. */
  operand(arg: Arg, access: Access = 'read'): void {
    const start = literalStart(arg);
    if (isUrl(start)) return;
    const hard = isPathLike(start) || isPathLike(arg.raw) || /^file:\/\//i.test(start);
    this.addPath(arg, access, hard);
  }
}

/**
 * Analyze a bash command, flagging its signals into `findings`. Pure: no fs
 * access; paths are canonicalized by the caller.
 */
export function analyzeBash(command: string, ctx: AnalyzeContext, findings: Findings): BashAnalysis {
  const analyzer = new Analyzer(ctx, findings);
  analyzer.lastpipe = /lastpipe/.test(command);
  const lexed = analyzer.analyzeString(command);
  analyzer.exitShell();
  for (const pattern of CRITICAL_PATTERNS) {
    if (pattern.test(command)) {
      analyzer.flag('destructive', 'it matches a known destructive pattern');
      break;
    }
  }
  if (hasPlaceholder(command)) {
    analyzer.flag('placeholder-in-command', 'it contains a «secret:…» placeholder');
  }
  return {
    paths: analyzer.paths,
    destructiveChecks: analyzer.checks,
    flows: analyzer.tracker.flows,
    envRefs: [...analyzer.envRefs],
    dotglob: DOTGLOB_RE.test(command),
    parts: lexed && analyzer.stayedAtStart ? commandParts(command, lexed) : null
  };
}

export type { Analyzer };
