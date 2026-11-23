/**
 * Wrappers that run another command (`env`, `sudo`, `timeout`, `xargs`, …).
 * They come off the front of a command before its rules apply, so `/bin/rm`,
 * `command rm` and `env rm` are all `rm`.
 */

import * as path from 'node:path';

import { type Analyzer, type Arg, type Cwd, literalStart } from './analyze';
import { generic, knownTexts, leadingOptions, literalArg, textOf } from './args';
import { NO_OPERANDS } from './commands';
import { hasOption, isOption, readArgs, valuesOf } from './options';
import { ENV, XARGS } from './programs';
import { applyEffects } from './scripts';

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

/** `a` with every `replace` in it put back by the item `w`. */
function replaced(a: Arg, replace: string, w: Arg): Arg {
  if (a.kind !== 'known' || !a.text.includes(replace)) return a;
  if (w.kind === 'known') return { ...a, text: a.text.split(replace).join(w.text) };
  return { kind: 'unknown', knownPrefix: a.text.slice(0, a.text.indexOf(replace)) + w.knownPrefix, raw: a.raw, splits: false };
}

/** The runs one list of items makes: one per item with `-I`, else one with the items at the `-J` word or after the other words. */
function runsOf(rest: readonly Arg[], items: readonly Arg[], input: XargsInput): Arg[][] {
  const { replace, insert } = input;
  if (replace !== undefined) return items.map((item) => rest.map((a) => replaced(a, replace, item)));
  const at = insert === undefined ? -1 : rest.findIndex((a) => a.kind === 'known' && a.text === insert);
  return [at < 0 ? [...rest, ...items] : [...rest.slice(0, at), ...items, ...rest.slice(at + 1)]];
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
  if (!analyzer.textBudget.takeWords(lists.reduce((n, list) => n + list.length, 0))) return [rest];
  const runs = new Map<string, Arg[]>();
  for (const list of lists) for (const run of runsOf(rest, list, input)) runs.set(JSON.stringify(run.map(literalStart)), run);
  return runs.size > 0 ? [...runs.values()] : [rest];
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

/** The command line `sudo -s` and `sudo -i` give the shell: each word with every character but a letter, digit, `_`, `-` or `$` escaped by a backslash. */
function sudoShellLine(words: readonly string[]): string {
  return words.map((w) => w.replace(/[^A-Za-z0-9_$-]/g, (c) => `\\${c}`)).join(' ');
}

/** A runner's `-c` string: analyzed as a nested command, or dynamic when it is not known. */
function runCall(analyzer: Analyzer, call: Arg | null, what: string): void {
  if (!call || call.kind === 'unknown') analyzer.dynamic(`it runs ${what} with a string from a variable`);
  else analyzer.nested(call.text, `it runs a string with ${what}`, true);
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
  case 'exec':
    return opts(/^-a$/, /^-[cl]+$/);
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
  case 'env': {
    // `env -` is `env -i`.
    const from = textOf(args[i + 1]) === '-' ? i + 2 : i + 1;
    const rest = args.slice(from);
    const read = readArgs(ENV, rest);
    for (const option of read.options) {
      if (isOption(option, '-S', '--split-string')) {
        // env reads the split words, and the words after the option, as its arguments again.
        const at = rest.indexOf(option.arg);
        const after = rest.slice(option.value !== undefined && option.value === rest[at + 1] ? at + 2 : at + 1);
        const text = textOf(option.value);
        const words = text === undefined ? null : envSplit(text);
        if (words !== null) return { argv: [args[i], ...words.map((w) => literalArg(w, option.arg.raw)), ...after] };
        analyzer.dynamic(`it runs env -S ${option.value?.raw ?? ''}, a string the analysis cannot split`.trimEnd());
        generic({ analyzer, stdinFed: false, xargs: false }, after);
        return args.length;
      }
      if (isOption(option, '-C', '--chdir')) {
        analyzer.moveForOneCommand(scope, option.value?.kind === 'known' ? analyzer.dirAt(option.value.text) : { kind: 'unknown' });
      }
    }
    if (read.unknown.length > 0) {
      // It may be `-C dir` or `-S string`.
      analyzer.moveForOneCommand(scope, { kind: 'unknown' });
      analyzer.dynamic(`it passes env ${read.unknown[0].raw}, a value from a variable that may be an option that runs a string`);
    }
    return from + read.next;
  }
  case 'sudo':
  case 'doas':
  case 'pkexec': {
    scope.sudo = true;
    analyzer.flag('sudo', `it runs ${name} to get root`);
    const k = opts(/^(-[ugCDhprtTU]|--user|--group)$/, /^-/);
    const shellFlag = args.slice(i + 1, k).some((a) => /^-[a-zA-Z]*[si]/.test(textOf(a) ?? ''));
    if (shellFlag && k < args.length) {
      const words = knownTexts(args.slice(k));
      if (words === null) analyzer.dynamic(`it runs a shell with ${name} -s on words from a variable`);
      else analyzer.nested(sudoShellLine(words), `it runs a shell with ${name} -s`, true);
      return args.length;
    }
    return k;
  }
  case 'su': {
    scope.sudo = true;
    analyzer.flag('sudo', 'it runs su to switch user');
    const c = args.findIndex((a, k) => k > i && (textOf(a) === '-c' || textOf(a) === '--command'));
    const script = c > 0 ? args[c + 1] : undefined;
    if (script?.kind === 'known') analyzer.nested(script.text, 'it runs a string with su -c', true);
    else if (script) analyzer.dynamic('it runs su -c with a string from a variable');
    return args.length;
  }
  case 'xargs':
    return xargs(analyzer, args, i, scope);
  case 'watch': {
    const k = opts(/^-[nqd]$|^--(interval|differences)$/, /^-/);
    const words = knownTexts(args.slice(k));
    if (words === null) analyzer.dynamic('it runs watch on words from a variable');
    else analyzer.nested(words.join(' '), 'it runs a string with watch', true);
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
