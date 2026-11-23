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
import type { Access, CommandKey, CommandPart, Signal } from '../types';
import { unreachable } from '../unreachable';
import { generic } from './args';
import { runCommand, TESTS } from './commands';
import { expandWord, ExpansionBudget, type ExpansionScope, MAX_EXPANSION_CHARS, MAX_EXPANSION_WORDS, type WordUse } from './expand';
import { type ContentFlow, FlowTracker, type Source, type Stdin } from './flows';
import type { Limit } from './limits';
import { commandParts } from './parts';
import {
  heredocsOf,
  isPipedIn,
  type Lexed,
  MAX_SUBSTITUTION_DEPTH,
  readsStdinDoc,
  type SimpleCommand,
  tokenize,
  type Word
} from './tokenize';
import { isPathLike, isUrl, SHELL_KEYWORDS } from './words';
import { stripWrapper, type WrapperScope, xargsOperands } from './wrappers';

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

/** The program a simple command runs, and its operands after the wrappers came off. */
export interface Run {
  name: string;
  rest: Arg[];
}

/** The text without the spaces and tabs at its ends; any other character there stays. */
export function trimBlanks(text: string): string {
  return text.replace(/^[ \t]+|[ \t]+$/g, '');
}

/**
 * The exact-grant key, built from the lexer's tokens: the ends trimmed of
 * spaces and tabs, and each run of them between two tokens made one space,
 * since bash reads any such run the same. The text inside a token (quotes,
 * `${…}`, a substitution) and a heredoc body stay as written, and so does every
 * other character (newline, `\r`, NBSP), because bash reads each of them
 * differently from a space. A command the lexer cannot read, or one longer than
 * the analysis reads, keeps its spacing as written.
 */
export function normalizeCommand(command: string): CommandKey {
  const trimmed = trimBlanks(command);
  if (trimmed.length > MAX_COMMAND_LENGTH) return trimmed as CommandKey;
  const lexed = tokenize(trimmed);
  if (lexed.error) return trimmed as CommandKey;
  let key = '';
  let from = 0;
  for (const [start, end] of lexed.blanks) {
    key += `${trimmed.slice(from, start)} `;
    from = end;
  }
  return (key + trimmed.slice(from)) as CommandKey;
}

/** Where the shell is at a point of the command: where it started, a dir it moved to, or one the analysis cannot know. */
export type Cwd = { kind: 'start' } | { kind: 'moved'; dir: string } | { kind: 'unknown' };

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
  'expansion-chars': `its expansions build more than ${MAX_EXPANSION_CHARS / 1024} KB of text, and the analysis did not build the rest`,
  'expansion-words': `its expansions make more than ${MAX_EXPANSION_WORDS} words, so not every word could be checked`,
  unparsed: 'the analysis could not parse it, so it did not read what bash may run there'
};

/** Builtins whose `NAME=value` arguments bash expands as assignments, with no splitting or glob. */
const DECLARATION_BUILTINS: ReadonlySet<string> = new Set(['export', 'declare', 'local', 'readonly', 'typeset']);

const ASSIGNMENT_WORD = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;

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
  stdin: Stdin = { sources: [], words: [], listedUnder: null };
  /** Shell variables set earlier in the command. `null` = set to something unknown. */
  vars = new Map<string, string | null>();
  /** The shell's working dir at this point of the command. */
  private cwd: Cwd = { kind: 'start' };
  /** Some command ran, or the shell moved, outside the start dir. */
  private leftStart = false;
  /** What the expansions of this command may still build. */
  private readonly budget = new ExpansionBudget((limit) => this.incomplete(limit));
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
    this.unresolvable(detail ? `${LIMIT_REASONS[limit]} (${detail})` : LIMIT_REASONS[limit]);
  }

  /** `cd dir` looks `dir` up in `CDPATH` when the command set it and `dir` is not `/…`, `./…` or `../…`. */
  searchesCdPath(dir: string): boolean {
    return this.vars.has('CDPATH') && !dir.startsWith('/') && !/^\.\.?(\/|$)/.test(dir);
  }

  /** Analyze one shell string. Returns what it lexed to, or `null` when it was not lexed. */
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
    if (lexed.commands.some((cmd) => cmd.words.some(namesIfs))) this.ifs = 'maybe-changed';
    if (lexed.error) this.incomplete('unparsed', lexed.error);
    for (const note of lexed.dynamic) this.dynamic(`it uses ${note}`);
    for (const limit of lexed.limits) this.incomplete(limit);
    for (const cmd of lexed.commands) this.analyzeCommand(cmd);
    return lexed;
  }

  /** The working dir as an absolute path, or `null` when it cannot be known. */
  get base(): string | null {
    return this.dirOf(this.cwd);
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
  dirAt(text: string, from: Cwd = this.cwd): Cwd {
    const abs = this.toAbs(text, this.dirOf(from));
    return abs === null ? { kind: 'unknown' } : { kind: 'moved', dir: path.resolve(abs) };
  }

  /** `cd`, `pushd`, `popd`: the shell moves for the rest of the command. */
  moveTo(next: Cwd): void {
    this.cwd = next;
    if (next.kind !== 'start') this.leftStart = true;
  }

  /** `env -C dir`: the shell moves for this one command, and `runArgs` moves it back. */
  moveForOneCommand(scope: WrapperScope, next: Cwd): void {
    scope.outerCwd ??= this.cwd;
    this.moveTo(next);
  }

  /** `git -C dir`: run `fn` with the shell in `dir`, then move back. */
  within<T>(dir: Cwd, fn: () => T): T {
    const outer = this.cwd;
    this.moveTo(dir);
    try {
      return fn();
    } finally {
      this.cwd = outer;
    }
  }

  /** A shell string run by `sh -c`, `eval`, `watch`, …: analyze it in its own scope. */
  nested(text: string, why: string): void {
    this.dynamic(why);
    const savedCwd = this.cwd;
    const savedVars = new Map(this.vars);
    const savedStdin = this.stdin;
    this.depth++;
    this.analyzeString(text);
    this.depth--;
    this.cwd = savedCwd;
    this.vars = savedVars;
    this.stdin = savedStdin;
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

  assign(name: string, value: string | null): void {
    if (name === 'IFS') this.ifs = 'maybe-changed';
    if (DANGEROUS_VARS.test(name)) this.dynamic(`it sets ${name}, which changes what runs`);
    this.vars.set(name, value);
  }

  /** A variable the command expands: an env ref unless the command set it. */
  noteRef(name: string): void {
    if (!this.vars.has(name)) this.envRefs.add(name);
  }

  lookup(name: string): string | null {
    if (this.vars.has(name)) return this.vars.get(name);
    if (name === 'HOME') return this.home;
    if (name === 'PWD') return this.base;
    return null;
  }

  /**
   * `$NAME`, or `${NAME:-fallback}`. The fallback counts only when this
   * command set the variable to empty: one from outside may hold anything, and
   * a fallback with its own expansion or a `~` is not known either.
   */
  value(name: string, fallback: string | undefined): string | null {
    const value = this.lookup(name);
    if (fallback === undefined || value !== '') return value;
    return /[$`~]/.test(fallback) ? null : fallback;
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

  analyzeCommand(cmd: SimpleCommand): void {
    const args = this.expandWords(cmd.words);
    const stdinFed = isPipedIn(cmd) || readsStdinDoc(cmd) || cmd.redirects.some((r) => r.kind === 'file' && r.op === '<');
    const stdin = this.tracker.stdinOf(cmd);
    this.stdin = stdin;
    for (const doc of heredocsOf(cmd)) {
      if (!doc.quoted) for (const m of doc.body.matchAll(BODY_VAR_RE)) this.noteRef(m[1]);
    }

    const from = this.paths.length;
    const stdout: Source[] = [];
    for (const r of cmd.redirects) {
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
    const run = this.runArgs(args, stdinFed);
    const reads = this.paths.slice(from).filter((p) => p.access === 'read' && !p.quiet);
    const sources = [...reads.map(({ raw, abs }) => ({ raw, abs })), ...stdin.sources];
    this.tracker.record(cmd, run, sources, stdout);
  }

  /**
   * Take assignments, keywords and wrappers off, then apply the command's
   * rules. Returns the program and its operands, or `null` when there is none.
   * A wrapper's working dir (`env -C`) holds for this command only.
   */
  runArgs(args: Arg[], stdinFed: boolean): Run | null {
    const scope: WrapperScope = { sudo: false, xargs: null, outerCwd: null };
    try {
      return this.run(args, stdinFed, scope);
    } finally {
      if (scope.outerCwd) this.cwd = scope.outerCwd;
    }
  }

  private run(args: Arg[], stdinFed: boolean, scope: WrapperScope): Run | null {
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      const assignment = /^([A-Za-z_][A-Za-z0-9_]*)\+?=(.*)$/s.exec(literalStart(arg));
      if (assignment && /^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(arg.raw)) {
        this.assign(assignment[1], arg.kind === 'known' ? assignment[2] : null);
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
        const inAt = args.findIndex((a, k) => k > i && a.raw === 'in');
        if (inAt > 0) for (const item of args.slice(inAt + 1)) this.operand(item);
        return null;
      }
      if (arg.raw === 'case') return null;
      const next = stripWrapper(this, args, i, scope);
      if (next === i) break;
      i = next;
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
    const rest = scope.xargs ? xargsOperands(this, name, args.slice(i + 1), scope.xargs) : args.slice(i + 1);
    runCommand(name, rest, { analyzer: this, stdinFed, xargs: scope.xargs !== null });
    return { name, rest };
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
  const lexed = analyzer.analyzeString(command);
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
