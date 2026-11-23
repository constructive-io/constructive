/**
 * Where file contents go inside one command line: down pipes, into
 * redirections and copies, onto the clipboard, and through programs that
 * change them. The analyzer only records the flows; the classifier decides
 * which sources are secret files, since that needs the real paths.
 */

import { unreachable } from '../unreachable';
import { type Analyzer, type Arg, literalStart, type Run } from './analyze';
import { isKnown, knownTexts, literalArg } from './args';
import { findRoots } from './file-commands';
import { heredocText, printedText } from './printed';
import type { Compound, Input, Redirect, SimpleCommand } from './tokenize';

export interface Source {
  raw: string;
  abs: string;
}

export type FlowSink =
  /** A copy into a file, or into a dir when `dir` (the file keeps its name). */
  | { kind: 'file'; raw: string; abs: string; dir: boolean }
  | { kind: 'clipboard' }
  /** A program whose output is not the text it read (`base64`, `sed`, `node`). */
  | { kind: 'transform' };

export interface ContentFlow {
  sources: Source[];
  to: FlowSink;
  /** The program, for the reason: `cp`, `base64`, `>`. */
  what: string;
}

/** What one command reads on stdin. */
export interface Stdin {
  /** Something feeds it: a pipe, a redirection, or the compound command or runner around it. The shell's own stdin is empty. */
  fed: boolean;
  /** Files whose contents arrive on stdin. */
  sources: Source[];
  /**
   * The texts stdin may carry: one when it is sure, more when it depends on
   * the shell (`echo`'s escapes); `['']` for none; `null` when it cannot be
   * seen or does not fit the command's text budget. Built only when a
   * program reads them.
   */
  texts: () => readonly string[] | null;
  /** stdin is a file a `<` redirect names, which a program reads like a script it runs by name (`psql -f`). */
  file: boolean;
  /**
   * When stdin is a file listing (`find src |`, `git ls-files |`): the roots
   * every listed name lies under. `null` when it is anything else.
   */
  listedUnder: Arg[] | null;
}

/** The shell's own stdin: nothing. */
export const NO_INPUT: Stdin = { fed: false, sources: [], texts: () => [''], file: false, listedUnder: null };

/** A stdin the analysis cannot see, carrying the contents of `sources`. */
export function unseenInput(sources: Source[] = []): Stdin {
  return { fed: true, sources, texts: () => null, file: false, listedUnder: null };
}

/** Readers whose output is the file's text unchanged, so redaction still matches it. */
const VERBATIM = new Set([
  'cat',
  'head',
  'tail',
  'less',
  'more',
  'bat',
  'grep',
  'egrep',
  'fgrep',
  'ggrep',
  'rg',
  'ag',
  'ack',
  'wc',
  'diff',
  'tee',
  'sort',
  'uniq',
  'nl'
]);

/**
 * Commands that do not print what they read (`ls`, `test`, `rm`), or whose
 * output another signal already covers (copies, the clipboard, `source`).
 */
const NO_CONTENT = new Set([
  'ls',
  'stat',
  'du',
  'file',
  'test',
  '[',
  '[[',
  'touch',
  'cd',
  'pushd',
  'realpath',
  'readlink',
  'basename',
  'dirname',
  'rm',
  'rmdir',
  'unlink',
  'shred',
  'srm',
  'rimraf',
  'chmod',
  'chown',
  'chgrp',
  'mkdir',
  'find',
  'git',
  'source',
  '.',
  'trap',
  'cp',
  'mv',
  'install',
  'ln',
  'dd',
  'pbcopy',
  'xclip',
  'xsel',
  'wl-copy'
]);

/** `head -c`, `grep -o`, `rg -r`: a verbatim reader that cuts values apart. */
function trims(name: string, rest: readonly Arg[]): boolean {
  const flags = rest.map(literalStart).filter((t) => t.startsWith('-'));
  if (name === 'head' || name === 'tail') return flags.some((t) => /^(-c|--bytes)/.test(t));
  if (name === 'rg' && flags.some((t) => /^(-r|--replace)/.test(t))) return true;
  return flags.some((t) => t === '--only-matching' || /^-[a-zA-Z]*o[a-zA-Z]*$/.test(t));
}

/** The program prints what it read as is, or prints nothing of it. */
export function keepsContent(name: string, rest: readonly Arg[]): boolean {
  if (NO_CONTENT.has(name)) return true;
  return VERBATIM.has(name) && !trims(name, rest);
}

/** `fn`'s value, computed on the first call. */
function once<T>(fn: () => T): () => T {
  let done = false;
  let value: T;
  return () => {
    if (!done) {
      value = fn();
      done = true;
    }
    return value;
  };
}

/** The redirection sets fd 0: an input one with no fd, or any one on fd 0. */
function setsStdin(r: Redirect): boolean {
  if (r.fd !== null) return r.fd === 0;
  switch (r.kind) {
  case 'heredoc':
  case 'here-string':
    return true;
  case 'file':
    return r.op === '<' || r.op === '<>' || r.op === '<&';
  case 'dup':
    return r.op === '<&';
  default:
    return unreachable(r);
  }
}

/** The redirection bash applies to fd 0 last, which wins over a pipe and every one before it (`cat <<< a <<< b` reads `b`). */
function stdinRedirect(redirects: readonly Redirect[]): Redirect | undefined {
  return redirects.filter(setsStdin).pop();
}

/**
 * The roots a file-listing command prints names under: `find`, `ls`, and
 * `git ls-files`. `null` for any other command, an unknown root, or a `find`
 * that follows symlinks (`-L`), whose names can leave its roots.
 */
function listedRoots(name: string, rest: readonly Arg[]): Arg[] | null {
  if (!rest.every(isKnown)) return null;
  if (name === 'find') {
    if (rest.some((a) => a.text === '-L' || a.text === '-follow')) return null;
    return findRoots(rest).roots;
  }
  if (name === 'ls') {
    const roots = rest.filter((a) => !a.text.startsWith('-'));
    return roots.length > 0 ? roots : [literalArg('.')];
  }
  if (name === 'git' && rest[0]?.text === 'ls-files') return [literalArg('.')];
  return null;
}

const GROUP_END = new Set(['}', 'done', 'fi', 'esac']);

/** Follows contents from command to command within one analyzed string. */
export class FlowTracker {
  readonly flows: ContentFlow[] = [];
  /** The files whose contents each command's stdout carries. */
  private readonly outputs = new Map<SimpleCommand, Source[]>();
  /** The stdin of each compound command, which every command in it reads. */
  private readonly compounds = new Map<Compound, Stdin>();
  /** The texts each `echo` or `printf` may have printed, built when a program reads them. */
  private readonly printedTexts = new Map<SimpleCommand, () => readonly string[] | null>();
  /** The roots each file-listing command printed names under. */
  private readonly listed = new Map<SimpleCommand, Arg[]>();
  /** Every source seen so far: what a `( … ) |` group may print. */
  private readonly all: Source[] = [];

  constructor(private readonly analyzer: Analyzer) {}

  /** What arrives on the command's stdin: the last redirection of fd 0, or else what feeds it. */
  stdinOf(cmd: SimpleCommand): Stdin {
    const r = stdinRedirect(cmd.redirects);
    return r ? this.fromRedirect(r) : this.fromInput(cmd.input);
  }

  private fromRedirect(r: Redirect): Stdin {
    const { analyzer } = this;
    const text = (built: () => string | null): Stdin => ({
      fed: true,
      sources: [],
      texts: once(() => {
        const t = built();
        return t === null ? null : [t];
      }),
      file: false,
      listedUnder: null
    });
    switch (r.kind) {
    case 'heredoc':
      return text(() => heredocText(r.doc.body, r.doc.quoted, analyzer.textBudget));
    case 'here-string': {
      const known = knownTexts(analyzer.resolveWord(r.word));
      return text(() => (known?.length === 1 && analyzer.textBudget.takeChars(known[0].length + 1) ? `${known[0]}\n` : null));
    }
    case 'file': {
      if (r.op !== '<' && r.op !== '<>') return unseenInput();
      const sources: Source[] = [];
      for (const t of analyzer.resolveWord(r.target)) {
        const abs = t.kind === 'unknown' ? null : analyzer.toAbs(t.text);
        if (abs) sources.push({ raw: t.raw, abs });
      }
      return { ...unseenInput(sources), file: true };
    }
    case 'dup':
      return unseenInput();
    default:
      return unreachable(r);
    }
  }

  private fromInput(input: Input): Stdin {
    switch (input.kind) {
    case 'inherited':
      return this.analyzer.inheritedStdin;
    case 'group-pipe':
      return unseenInput([...this.all]);
    case 'pipe': {
      const up = input.from;
      if (up.words.every((w) => GROUP_END.has(w.raw))) return unseenInput([...this.all]);
      return {
        fed: true,
        sources: this.outputs.get(up) ?? [],
        texts: this.printedTexts.get(up) ?? (() => null),
        file: false,
        listedUnder: this.listed.get(up) ?? null
      };
    }
    case 'compound': {
      let stdin = this.compounds.get(input.of);
      if (!stdin) {
        const r = stdinRedirect(input.of.redirects);
        stdin = r ? this.fromRedirect(r) : this.fromInput(input.of.input);
        this.compounds.set(input.of, stdin);
      }
      return stdin;
    }
    default:
      return unreachable(input);
    }
  }

  /**
   * After a command ran: remember what its stdout carries, and record a
   * transform and its stdout redirections as flows.
   */
  record(cmd: SimpleCommand, run: Run | null, sources: Source[], redirects: Source[]): void {
    this.outputs.set(cmd, sources);
    for (const source of sources) this.all.push(source);
    if (!run) return;
    // What a command xargs runs prints is the output of every run it makes, which the analysis does not build.
    if (!run.xargs && (run.name === 'echo' || run.name === 'printf')) {
      const texts = knownTexts(run.rest);
      const { name } = run;
      const budget = this.analyzer.textBudget;
      this.printedTexts.set(cmd, once(() => (texts === null ? null : printedText(name, texts, budget))));
    }
    const roots = run.xargs ? null : listedRoots(run.name, run.rest);
    if (roots) this.listed.set(cmd, roots);
    if (sources.length === 0) return;
    if (!keepsContent(run.name, run.rest)) this.flows.push({ sources, to: { kind: 'transform' }, what: run.name });
    for (const r of redirects) this.flows.push({ sources, to: { kind: 'file', ...r, dir: false }, what: '>' });
  }
}
