/**
 * Wrappers that run another command (`env`, `sudo`, `timeout`, `xargs`, …).
 * They come off the front of a command before its rules apply, so `/bin/rm`,
 * `command rm` and `env rm` are all `rm`.
 */

import * as path from 'node:path';

import { type Analyzer, type Arg, type Cwd, literalStart, type ShellEnv } from './analyze';
import { builtArg, generic, knownTexts, leadingOptions, literalArg, textOf } from './args';
import { NO_OPERANDS } from './commands';
import type { ExpansionBudget, Variables } from './expand';
import { hasOption, isOption, type ReadArgs, readArgs, type ReadOption, valuesOf } from './options';
import { ENV, SU, SUDO, XARGS } from './programs';
import { applyEffects, dirSpecOf, movedBy } from './scripts';

/** How `xargs` feeds the command it runs. */
export interface XargsInput {
  /** `-I {}`: each input line is one item, put in place of this string in each word of a run of its own. */
  readonly replace?: string;
  /** BSD's `-J %`: every item goes in place of the first word that is exactly this string. */
  readonly insert?: string;
  /** The items come from a file (`-a`), or xargs splits them in a way the analysis does not read (`-0`, `-d`, an option from a variable). */
  readonly unseen: boolean;
}

/** What the wrappers taken off so far change about the command they run. */
export interface WrapperScope {
  sudo: boolean;
  /** Set once `xargs` came off: more operands arrive from its input. */
  xargs: XargsInput | null;
  /** The working dir before `env -C dir` moved it for this one command. */
  outerCwd: Cwd | null;
  /** The shell's own environment before a wrapper changed the one its program gets (`env -i`, sudo). */
  outerEnv: ShellEnv | null;
}

function xargs(analyzer: Analyzer, args: Arg[], i: number, scope: WrapperScope): number {
  const rest = args.slice(i + 1);
  const read = readArgs(XARGS, rest);
  applyEffects({ analyzer, stdinFed: false, xargs: false }, 'xargs', XARGS, read);
  const replace = read.options.filter((o) => isOption(o, '-I', '-i', '--replace')).pop();
  const replaceText = replace && (replace.value ? textOf(replace.value) : '{}');
  const insert = valuesOf(read, '-J').pop();
  const unseen =
    read.unknown.length > 0 ||
    (replace !== undefined && replaceText === undefined) ||
    (insert !== undefined && insert.kind !== 'known') ||
    hasOption(read, '-0', '--null', '-d', '--delimiter', '-a', '--arg-file');
  scope.xargs = { replace: replaceText, insert: textOf(insert), unseen };
  return i + 1 + read.next;
}

/**
 * The items xargs reads from one text: blanks and newlines separate them,
 * quotes group, and a backslash escapes the next character. With `-I`
 * (`lines`) each line is one item, from its first character that is no
 * blank: GNU keeps the blanks in it, and BSD joins its words with one space,
 * so a line where they differ gives both. `null` for an unmatched quote,
 * which makes xargs stop with an error.
 */
export function xargsItems(text: string, lines: boolean): string[] | null {
  const items: string[] = [];
  let words: string[] = [];
  let word: string | null = null;
  let line: string | null = null;
  const take = (t: string) => {
    word = (word ?? '') + t;
    line = (line ?? '') + t;
  };
  const endWord = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  const endLine = () => {
    endWord();
    if (!lines) items.push(...words);
    else if (line !== null) items.push(...new Set([line, words.join(' ')]));
    words = [];
    line = null;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\n') {
      endLine();
    } else if (c === ' ' || c === '\t') {
      endWord();
      if (line !== null) line += c;
    } else if (c === '\\') {
      if (i + 1 >= text.length) return null;
      take(text[++i]);
    } else if (c === "'" || c === '"') {
      const close = text.indexOf(c, i + 1);
      const newline = text.indexOf('\n', i + 1);
      if (close < 0 || (newline >= 0 && newline < close)) return null;
      take(text.slice(i + 1, close));
      i = close;
    } else {
      take(c);
    }
  }
  endLine();
  return items;
}

/** `a` with every `replace` in it put back by the item `w`, charged to the budget before it is built. */
function replaced(a: Arg, replace: string, w: Arg, budget: ExpansionBudget): Arg {
  if (a.kind !== 'known' || !a.text.includes(replace)) return a;
  if (w.kind !== 'known') return { kind: 'unknown', knownPrefix: a.text.slice(0, a.text.indexOf(replace)) + w.knownPrefix, raw: a.raw, splits: false };
  const parts = a.text.split(replace);
  return builtArg(budget, a.text.length + (parts.length - 1) * (w.text.length - replace.length), () => parts.join(w.text), a);
}

/** Without -I: one run with the items at the `-J` word, or after the other words. */
function placedRun(rest: readonly Arg[], items: readonly Arg[], insert: string | undefined): Arg[] {
  const at = insert === undefined ? -1 : rest.findIndex((a) => a.kind === 'known' && a.text === insert);
  return at < 0 ? [...rest, ...items] : [...rest.slice(0, at), ...items, ...rest.slice(at + 1)];
}

/**
 * With -I: one run per distinct item, each word with the item in place of the
 * string. Each run's words, and the text it builds, are charged; past the
 * budget no more runs are made, and the analysis is incomplete.
 */
function replacedRuns(rest: readonly Arg[], items: readonly Arg[], replace: string, budget: ExpansionBudget): Arg[][] {
  const seen = new Set<string>();
  const runs: Arg[][] = [];
  for (const item of items) {
    const key = `${item.kind}\u0000${literalStart(item)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (runs.length > 0 && !budget.takeWords(rest.length)) break;
    runs.push(rest.map((a) => replaced(a, replace, item, budget)));
  }
  return runs;
}

/**
 * The argument lists of the runs xargs makes of its command. Each text stdin
 * may carry gives its own items, and a file listing gives the roots its names
 * lie under. Otherwise the items cannot be seen, which is a signal, and the
 * command runs once with its own words.
 */
export function xargsRuns(analyzer: Analyzer, name: string, rest: Arg[], input: XargsInput): Arg[][] {
  const { listedUnder } = input.unseen ? { listedUnder: null } : analyzer.stdin;
  const texts = input.unseen ? null : analyzer.stdin.texts();
  const lists: Arg[][] | null = texts !== null ? itemLists(texts, input.replace !== undefined) : listedUnder !== null ? [listedUnder] : null;
  if (lists === null) {
    if (!NO_OPERANDS.has(name)) analyzer.flag('stdin-operands', `xargs gives ${name} file names from its input, which cannot be checked before it runs`);
    return [rest];
  }
  const budget = analyzer.textBudget;
  if (!budget.takeWords(lists.reduce((n, list) => n + list.length, 0))) return [rest];
  if (input.replace !== undefined) {
    const runs = replacedRuns(rest, lists.flat(), input.replace, budget);
    return runs.length > 0 ? runs : [rest];
  }
  const runs = new Map<string, Arg[]>();
  for (const list of lists) runs.set(list.map(literalStart).join('\u0000'), placedRun(rest, list, input.insert));
  return [...runs.values()];
}

/** The items of each text, or `null` when one has an unmatched quote. */
function itemLists(texts: readonly string[], lines: boolean): Arg[][] | null {
  const lists: Arg[][] = [];
  for (const text of new Set(texts)) {
    const items = xargsItems(text, lines);
    if (items === null) return null;
    lists.push(items.map((item) => literalArg(item)));
  }
  return lists;
}

const RUNNER_VALUE_OPTIONS = new Set(['-c', '--call', '-p', '--package']);

/**
 * `npx -c 'cmd'`, `pnpm exec --call=cmd`: the runner's options from `from` up
 * to the package name, its `-c` shell string, and where the package name is.
 */
function runnerOptions(args: Arg[], from: number): { call: Arg | null | undefined; next: number } {
  const { options, next } = leadingOptions(args.slice(from), RUNNER_VALUE_OPTIONS);
  const call = options.find((o) => o.key === '-c' || o.key === '--call');
  return { call: call ? (call.value ?? null) : undefined, next: from + next };
}

/** One escape `env -S` reads after a backslash, or `null` for one env refuses. `\_` is a space only in double quotes; outside them the caller splits on it. */
function envEscape(c: string | undefined, quoted: boolean): string | null {
  const simple: Readonly<Record<string, string>> = { f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '#': '#', $: '$', '"': '"', "'": "'", '\\': '\\' };
  if (c === '_' && quoted) return ' ';
  return c !== undefined && c in simple ? simple[c] : null;
}

/**
 * The words `env -S` splits its string into, as GNU and BSD env do: blanks
 * and an unquoted `\_` separate them, quotes group, an unquoted `#` at the
 * start of a word starts a comment, and `\c` ends the string. `null` for a
 * `$`, which env expands from its environment, or a string env refuses.
 */
export function envSplit(text: string): string[] | null {
  const words: string[] = [];
  let word: string | null = null;
  const end = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/[ \t\n\v\f\r]/.test(c)) {
      end();
      i++;
    } else if (c === '#' && word === null) {
      break;
    } else if (c === '$') {
      return null;
    } else if (c === '\\') {
      if (text[i + 1] === 'c') break;
      if (text[i + 1] === '_') {
        end();
        i += 2;
        continue;
      }
      const e = envEscape(text[i + 1], false);
      if (e === null) return null;
      word = (word ?? '') + e;
      i += 2;
    } else if (c === "'" || c === '"') {
      word ??= '';
      i++;
      while (text[i] !== c) {
        const d = text[i];
        if (d === undefined || (c === '"' && d === '$')) return null;
        if (d !== '\\') {
          word += d;
          i++;
        } else if (c === "'") {
          // In single quotes only `\'` and `\\` are escapes.
          const quoted = text[i + 1] === "'" || text[i + 1] === '\\';
          word += quoted ? text[i + 1] : '\\';
          i += quoted ? 2 : 1;
        } else {
          const e = envEscape(text[i + 1], true);
          if (e === null) return null;
          word += e;
          i += 2;
        }
      }
      i++;
    } else {
      word = (word ?? '') + c;
      i++;
    }
  }
  end();
  return words;
}

/**
 * The names sudo, doas or pkexec pass on from the environment they were
 * given. sudo's default `env_reset` builds a new one from its policy, which
 * the analysis cannot read, so none carries; `-E` keeps the environment and
 * `--preserve-env=A,B` the names it lists, but a login (`-i`) starts over.
 * The policy may set HOME to the target user's, so HOME never carries. doas
 * and pkexec reset it too.
 */
function rootKeeps(program: string, read: ReadArgs): (name: string) => boolean {
  if (program !== 'sudo' || hasOption(read, '-i', '--login')) return () => false;
  const preserve = read.options.filter((o) => isOption(o, '-E', '--preserve-env'));
  if (preserve.some((o) => o.value === undefined)) return (name) => name !== 'HOME';
  const listed = new Set(preserve.flatMap((o) => textOf(o.value)?.split(',') ?? []));
  return (name) => name !== 'HOME' && listed.has(name);
}

/** A wrapper's dir options, in order, each by its repeat rule from `start`, the dir the wrapper started in: the dir its command runs in, for this command only. */
function wrapperDirs(analyzer: Analyzer, scope: WrapperScope, options: readonly ReadOption[], start: Cwd): void {
  for (const option of options) {
    const spec = dirSpecOf(option);
    const dir = spec && movedBy(analyzer, spec, option.value, analyzer.cwdNow, start);
    if (dir) analyzer.moveForOneCommand(scope, dir);
  }
}

/** The command line `sudo -s` and `sudo -i` give the shell: each word with every character but a letter, digit, `_`, `-` or `$` escaped by a backslash. */
function sudoShellLine(words: readonly string[]): string {
  return words.map((w) => w.replace(/[^A-Za-z0-9_$-]/g, (c) => `\\${c}`)).join(' ');
}

/** A runner's `-c` string: analyzed as a nested command, or dynamic when it is not known. */
function runCall(analyzer: Analyzer, call: Arg | null, what: string): void {
  if (!call || call.kind === 'unknown') analyzer.dynamic(`it runs ${what} with a string from a variable`);
  else analyzer.nested(call.text, `it runs a string with ${what}`, { inherits: true });
}

/** No name of the program's environment can be known: an `env` option from a variable may be `-i` or `-u NAME`. */
const unknownEnv = (vars: Variables): Variables => vars.restricted(() => false);

/**
 * env's arguments, read as env reads them: `-S` splits its string into words
 * that env reads as arguments again, before the ones after it, and each `-C`
 * moves by its repeat rule (the last one counts, from the dir env started in).
 * `-i`, and a lone `-` after the options, empty the environment the command
 * gets, and `-u NAME` removes a name from it. An argument from a variable
 * before an `-S` may be any of these options. Each pass after a split reads
 * its words again, so they are charged to the budget. Returns the words from
 * its command on.
 */
function envArgs(analyzer: Analyzer, rest: Arg[], scope: WrapperScope): { argv: Arg[] } {
  const start = analyzer.cwdNow;
  let words = rest;
  for (;;) {
    const read = readArgs(ENV, words);
    const split = read.options.find((o) => isOption(o, '-S', '--split-string'));
    const at = split ? words.indexOf(split.arg) : words.length;
    const before = split ? read.options.slice(0, read.options.indexOf(split)) : read.options;
    for (const option of before) {
      if (isOption(option, '-i', '--ignore-environment')) analyzer.programEnv(scope, (vars) => vars.emptied());
      if (isOption(option, '-u', '--unset') && option.value) {
        const name = textOf(option.value);
        if (name === undefined) analyzer.programEnv(scope, unknownEnv);
        else analyzer.programEnv(scope).unset(name);
      }
    }
    wrapperDirs(analyzer, scope, before, start);
    const hidden = read.unknown.find((u) => words.indexOf(u) < at);
    if (hidden) {
      analyzer.moveForOneCommand(scope, { kind: 'unknown' });
      analyzer.programEnv(scope, unknownEnv);
      analyzer.dynamic(`it passes env ${hidden.raw}, a value from a variable that may be an option that runs a string`);
    }
    if (!split) {
      if (textOf(words[read.next]) !== '-') return { argv: words.slice(read.next) };
      analyzer.programEnv(scope, (vars) => vars.emptied());
      return { argv: words.slice(read.next + 1) };
    }
    const after = words.slice(split.value !== undefined && split.value === words[at + 1] ? at + 2 : at + 1);
    const text = textOf(split.value);
    const parts = text === undefined ? null : envSplit(text);
    if (parts === null) {
      analyzer.dynamic(`it runs env -S ${split.value?.raw ?? ''}, a string the analysis cannot split`.trimEnd());
      generic({ analyzer, stdinFed: false, xargs: false }, after);
      return { argv: [] };
    }
    words = [...parts.map((w) => literalArg(w, split.arg.raw)), ...after];
    if (!analyzer.textBudget.takeWords(words.length)) return { argv: [] };
  }
}

/**
 * Take one wrapper off the front of the command. Returns the index of the
 * next word, `i` when `args[i]` is not a wrapper, or the words the command
 * runs from here when the wrapper builds new ones (`env -S`).
 */
export function stripWrapper(analyzer: Analyzer, args: Arg[], i: number, scope: WrapperScope): number | { argv: Arg[] } {
  const program = textOf(args[i]);
  if (program === undefined) return i;
  const name = path.basename(program);
  const opts = (withValue: RegExp, flags: RegExp = /^-/): number => {
    let k = i + 1;
    while (k < args.length) {
      const t = textOf(args[k]);
      if (t === undefined) break;
      if (t === '--') return k + 1;
      if (withValue.test(t)) k += 2;
      else if (flags.test(t) && t !== '-') k++;
      else break;
    }
    return k;
  };
  switch (name) {
  case 'command':
  case 'builtin':
  case 'nohup':
  case 'chronic':
  case 'unbuffer':
    return opts(/^$/);
  case 'time':
    return opts(/^$/, /^-[pv]+$/);
  case 'exec': {
    const k = opts(/^-a$/, /^-[cl]+$/);
    // `-c` runs the program with an empty environment.
    if (args.slice(i + 1, k).some((a) => /^-l*c[cl]*$/.test(textOf(a) ?? ''))) analyzer.programEnv(scope, (vars) => vars.emptied());
    return k;
  }
  case 'nice':
    return opts(/^(-n|--adjustment)$/, /^-/);
  case 'ionice':
    return opts(/^-[cnp]$/, /^-/);
  case 'stdbuf':
    return opts(/^-[ioe]$/, /^-/);
  case 'caffeinate':
    return opts(/^-[tw]$/, /^-/);
  case 'timeout': {
    const k = opts(/^-[sk]$/, /^-/);
    return k + 1;
  }
  case 'env':
    return envArgs(analyzer, args.slice(i + 1), scope);
  case 'sudo':
  case 'doas':
  case 'pkexec': {
    scope.sudo = true;
    analyzer.flag('sudo', `it runs ${name} to get root`);
    const read = readArgs(SUDO, args.slice(i + 1));
    const k = i + 1 + read.next;
    analyzer.programEnv(scope, (vars) => vars.restricted(rootKeeps(name, read)));
    wrapperDirs(analyzer, scope, read.options, analyzer.cwdNow);
    if (read.unknown.length > 0) {
      analyzer.moveForOneCommand(scope, { kind: 'unknown' });
      analyzer.dynamic(`it passes ${name} ${read.unknown[0].raw}, a value from a variable that may be an option that runs a shell or moves the dir`);
    }
    if (hasOption(read, '-s', '--shell', '-i', '--login') && k < args.length) {
      const words = knownTexts(args.slice(k));
      if (words === null) analyzer.dynamic(`it runs a shell with ${name} -s on words from a variable`);
      else analyzer.nested(sudoShellLine(words), `it runs a shell with ${name} -s`, { inherits: true });
      return args.length;
    }
    return k;
  }
  case 'su': {
    scope.sudo = true;
    analyzer.flag('sudo', 'it runs su to switch user');
    const read = readArgs(SU, args.slice(i + 1));
    // `-` before the user is `-l`.
    const dash = textOf(read.operands[0]) === '-';
    // A login starts a new environment; otherwise su keeps it and sets HOME to the target user's.
    const login = dash || hasOption(read, '-l', '--login');
    analyzer.programEnv(scope, (vars) => vars.restricted(login ? () => false : (v) => v !== 'HOME'));
    wrapperDirs(analyzer, scope, read.options, analyzer.cwdNow);
    if (dash || read.unknown.length > 0) analyzer.moveForOneCommand(scope, { kind: 'unknown' });
    if (read.unknown.length > 0) analyzer.dynamic(`it passes su ${read.unknown[0].raw}, a value from a variable that may be an option that runs a string`);
    if (hasOption(read, '-s', '--shell')) analyzer.dynamic('it runs su -s, which runs a shell the analysis does not read');
    const script = valuesOf(read, '-c', '--command', '--session-command').pop();
    if (script?.kind === 'known') analyzer.nested(script.text, 'it runs a string with su -c', { inherits: true });
    else if (script) analyzer.dynamic('it runs su -c with a string from a variable');
    return args.length;
  }
  case 'xargs':
    return xargs(analyzer, args, i, scope);
  case 'watch': {
    const k = opts(/^-[nqd]$|^--(interval|differences)$/, /^-/);
    const words = knownTexts(args.slice(k));
    if (words === null) analyzer.dynamic('it runs watch on words from a variable');
    else analyzer.nested(words.join(' '), 'it runs a string with watch', { inherits: true });
    return args.length;
  }
  case 'npx':
  case 'pnpx':
  case 'bunx': {
    const { call, next } = runnerOptions(args, i + 1);
    if (call === undefined) return next;
    runCall(analyzer, call, `${name} -c`);
    return args.length;
  }
  case 'pnpm':
  case 'npm':
  case 'yarn':
  case 'bun': {
    const sub = textOf(args[i + 1]);
    if (sub !== 'exec' && sub !== 'dlx' && sub !== 'x') return i;
    const { call, next } = runnerOptions(args, i + 2);
    if (call === undefined) return next;
    runCall(analyzer, call, `${name} ${sub} -c`);
    return args.length;
  }
  default:
    return i;
  }
}
