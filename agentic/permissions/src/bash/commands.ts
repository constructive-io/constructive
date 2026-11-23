/**
 * What known commands do with their arguments: which operands they read or
 * write, and which forms run hidden code, upload data or destroy things.
 * Everything not listed here gets the generic rule: every operand is a read.
 * The rules for files, git, the network and the machine live in their own
 * modules; this one holds the shells and interpreters and the dispatch.
 */

import * as path from 'node:path';

import { type Arg, literalStart } from './analyze';
import {
  type CommandContext,
  files,
  generic,
  hiddenLeadingOption,
  knownTexts,
  leadingOptions,
  literalArg,
  operands,
  pathLikeArgs,
  textOf
} from './args';
import { awk, chmodLike, copyLike, dd, find, grep, remove, sed, tee } from './file-commands';
import { git } from './git';
import { busyboxServer, curl, phpServer, publishes, pythonServer, remoteCopy, rubyServer, ssh, tunnel, TUNNELS, wget } from './network';
import { hasOption, operandWords, type ProgramSpec, readArgs, valuesOf as valuesRead } from './options';
import { CD, MAKERS, MAPFILE, PRINTF, READ, READER_OUTPUT, READERS, TEXT_PROGRAMS, TREE, UNSET } from './programs';
import { applyEffects, man, sort, tar, textProgram, zip } from './scripts';
import { CLIPBOARD, clipboard, namesFromStdin, persistence, security } from './system';

const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'mksh', 'fish', 'ash']);
const AWKS = new Set(['awk', 'gawk', 'mawk', 'nawk']);
const GREPS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'ggrep']);
const NETWORK_SHELLS = new Set(['nc', 'ncat', 'netcat', 'socat', 'telnet', 'ftp', 'tftp', 'sftp']);
const DISK_TOOLS = /^(mkfs(\..*)?|fdisk|sfdisk|gdisk|parted|wipefs|cryptsetup|newfs(_.*)?)$/;
const PERSISTENCE = new Set(['crontab', 'at', 'batch', 'launchctl', 'defaults']);

/** Commands that take no file operands. */
export const NO_OPERANDS = new Set([
  'echo',
  'printf',
  'true',
  'false',
  ':',
  'exit',
  'return',
  'set',
  'unset',
  'shift',
  'wait',
  'jobs',
  'type',
  'which',
  'hash',
  'alias',
  'unalias',
  'sleep',
  'date',
  'pwd',
  'whoami',
  'clear',
  'kill',
  'trap',
  'read',
  'mapfile',
  'readarray',
  'let'
]);

/**
 * Readers whose every operand is a file, with the options that take a value.
 * An operand built from a variable is then a path, not a word: it asks in
 * every mode, as it may name any file.
 */

/** The test commands: `[` and `[[` are names here, not globs. */
export const TESTS = new Set(['test', '[', '[[']);

/** `[[`'s arithmetic comparisons evaluate their operands as expressions. */
const ARITHMETIC_TESTS = new Set(['-eq', '-ne', '-lt', '-le', '-gt', '-ge']);

/**
 * A test reads the files it names. `-v NAME` (and, in `[[`, an arithmetic
 * comparison) evaluates array subscripts, which can run a substitution even
 * from a quoted word.
 */
function test(name: string, ctx: CommandContext, rest: readonly Arg[]): void {
  const close = name === '[' ? ']' : name === '[[' ? ']]' : null;
  const operands = close && textOf(rest[rest.length - 1]) === close ? rest.slice(0, -1) : rest;
  const evaluates = operands.some((a) => textOf(a) === '-v' || (name === '[[' && ARITHMETIC_TESTS.has(textOf(a) ?? '')));
  if (evaluates) ctx.analyzer.dynamic(`it runs ${name} with an operator that evaluates expressions`);
  generic(ctx, operands);
}

/** Builtins whose options (`-i`, `-n`, `-v`) make them read a value as a subscript or arithmetic. */
const EVALUATING_BUILTINS: ReadonlySet<string> = new Set(['declare', 'local', 'typeset', 'printf', 'read']);

/** The variables a builtin assigns or unsets by name: `printf -v NAME`, `read NAME…`, `mapfile NAME`, `unset NAME…`. */
function namedVariables(ctx: CommandContext, name: string, rest: readonly Arg[]): Arg[] {
  const operands = (spec: ProgramSpec) => {
    const read = readArgs(spec, rest);
    return { read, names: operandWords(read, rest) };
  };
  if (name === 'printf') return valuesRead(readArgs(PRINTF, rest), '-v');
  if (name === 'read') {
    const { read, names } = operands(READ);
    return [...valuesRead(read, '-a'), ...names];
  }
  if (name === 'mapfile' || name === 'readarray') {
    const { read, names } = operands(MAPFILE);
    applyEffects(ctx, name, MAPFILE, read);
    return names.length > 0 ? names.slice(0, 1) : [literalArg('MAPFILE')];
  }
  if (name === 'unset') {
    const { read, names } = operands(UNSET);
    return hasOption(read, '-f') ? [] : names;
  }
  return [];
}

/**
 * A variable a builtin assigns. The subscript of an array element is
 * arithmetic, which runs any substitution in it even from a quoted word, and
 * a name such as `PATH` changes what later commands run.
 */
function assignNamed(ctx: CommandContext, builtin: string, variable: Arg): void {
  const { analyzer } = ctx;
  if (variable.kind === 'unknown') return analyzer.dynamic(`it runs ${builtin} on a variable name from a variable or substitution`);
  if (variable.text.includes('[')) return analyzer.dynamic(`it runs ${builtin} on an array element, whose subscript runs as code`);
  if (builtin === 'unset') analyzer.unset(variable.text);
  else analyzer.assign(variable.text, '=', null);
}

/** Shell options that take a value; the `*file` ones name a script the shell loads. */
const SHELL_VALUE_OPTIONS = new Set(['-o', '-O', '--rcfile', '--init-file', '--command', '--init-command']);
const SHELL_LOADS = new Set(['--rcfile', '--init-file']);
/** `-c` takes its string from the first operand; fish's long forms carry it. */
const SHELL_INLINE = new Set(['--command', '--init-command']);

/** A word in a shell's option list that is not a plain letter cluster (`-ex`, `+o`). */
const isOddShellOption = (text: string): boolean => /^[-+][^-]/.test(text) && !/^[-+][a-zA-Z]+$/.test(text);

function shell(name: string, ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  // `+x`, `+o name`: the same options, turned off.
  const words = rest.map((a) => (a.kind === 'known' && /^\+[a-zA-Z]/.test(a.text) ? { ...a, text: `-${a.text.slice(1)}` } : a));
  const { options, next } = leadingOptions(words, SHELL_VALUE_OPTIONS);
  const odd = rest.slice(0, next).find((a) => isOddShellOption(literalStart(a)));
  if (odd) analyzer.dynamic(`it passes ${name} an option it cannot read: ${odd.raw}`);
  for (const { key, value } of options) if (value && SHELL_LOADS.has(key)) analyzer.operand(value);

  const inline = options.find((o) => SHELL_INLINE.has(o.key));
  const script = inline ? inline.value : options.some((o) => o.key === '-c') ? (rest[next] ?? null) : undefined;
  if (script !== undefined) {
    if (!script || script.kind === 'unknown') analyzer.dynamic(`it runs ${name} -c with a string from a variable`);
    else analyzer.nested(script.text, `it runs a shell string with ${name} -c`);
    return;
  }
  const file = rest[next];
  if (file && textOf(file) !== '-') {
    analyzer.addPath(file, 'read', true);
    generic(ctx, rest.slice(next + 1));
  } else if (ctx.stdinFed) {
    analyzer.dynamic(`it pipes a script into ${name}`);
  }
}

/**
 * An interpreter's command line: `inline` marks the options whose value is
 * code (`node -e`), `withValue` every option that takes a value, `loads` the
 * ones whose value is a file it loads (`node -r`), and `module` the one that
 * runs a module by name (`python -m`).
 */
interface Interpreter {
  inline: ReadonlySet<string>;
  withValue: ReadonlySet<string>;
  loads?: ReadonlySet<string>;
  module?: string;
  /** Options that end its own options (`python -c`, `python -m`). */
  stopAfter?: ReadonlySet<string>;
  /** Its built-in file server (`php -S`), checked first. */
  server?: (ctx: CommandContext, rest: readonly Arg[]) => void;
  /** The server a module runs (`python -m http.server`), with the module's own arguments. */
  moduleServer?: (ctx: CommandContext, module: string, args: readonly Arg[]) => void;
}

const interpreter = (inline: string[], others: string[], extra: Omit<Interpreter, 'inline' | 'withValue'> = {}): Interpreter => ({
  inline: new Set(inline),
  withValue: new Set([...inline, ...others, ...(extra.loads ?? [])]),
  ...extra
});

const NODE = interpreter(['-e', '-p', '--eval', '--print'], ['--input-type', '--conditions', '-C'], {
  loads: new Set(['-r', '--require', '--import', '--loader', '--experimental-loader'])
});
const SCRIPT_RUNNER = interpreter(['-e'], ['-l']);

/** By program name; every `python*` version is `python`. */
const INTERPRETERS = new Map<string, Interpreter>([
  ['python', interpreter(['-c'], ['-m', '-W', '-X', '-Q'], { module: '-m', stopAfter: new Set(['-c', '-m']), moduleServer: pythonServer })],
  ['node', NODE],
  ['nodejs', NODE],
  ['perl', interpreter(['-e', '-E'], ['-I', '-M', '-m'])],
  ['ruby', interpreter(['-e'], ['-I', '-C'], { loads: new Set(['-r']), server: rubyServer })],
  ['php', interpreter(['-r', '-B', '-R', '-E'], ['-c', '-d', '-S', '-t'], { loads: new Set(['-f']), server: phpServer })],
  ['lua', SCRIPT_RUNNER],
  ['luajit', SCRIPT_RUNNER],
  ['Rscript', SCRIPT_RUNNER],
  ['osascript', SCRIPT_RUNNER]
]);

function interpreterOf(name: string): Interpreter | undefined {
  return INTERPRETERS.get(/^python[0-9.]*$/.test(name) ? 'python' : name);
}

/** The script an interpreter runs is a read; inline code or piped code is dynamic. */
function interpret(name: string, spec: Interpreter, ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  spec.server?.(ctx, rest);
  const { options, next } = leadingOptions(rest, spec.withValue, spec.stopAfter);
  for (const { key, value } of options) {
    if (spec.inline.has(key)) return analyzer.dynamic(`it runs inline code with ${name} ${key}`);
    if (value && spec.loads?.has(key)) analyzer.operand(value);
    if (key === spec.module) {
      if (value?.kind === 'known') spec.moduleServer?.(ctx, value.text, rest.slice(next));
      return generic(ctx, rest.slice(next));
    }
  }
  const script = rest[next];
  if (script && textOf(script) !== '-') {
    analyzer.addPath(script, 'read', true);
    generic(ctx, rest.slice(next + 1));
  } else if (ctx.stdinFed) {
    analyzer.dynamic(`it pipes code into ${name}`);
  }
}

export function runCommand(name: string, rest: readonly Arg[], ctx: CommandContext): void {
  const { analyzer } = ctx;
  publishes(name, ctx, rest);
  if (ctx.stdinFed && namesFromStdin(name, rest)) {
    const words = analyzer.stdin.words;
    if (words === null) analyzer.flag('stdin-operands', `${name} takes file names from its input, which cannot be checked before it runs`);
    else for (const w of words) analyzer.addPath(w, 'read', true);
  }
  if (SHELLS.has(name)) return shell(name, ctx, rest);
  const language = TEXT_PROGRAMS.get(name);
  if (language) return textProgram(name, language, ctx, rest);
  const spec = interpreterOf(name);
  if (spec) return interpret(name, spec, ctx, rest);
  if (AWKS.has(name)) return awk(name, ctx, rest);
  if (GREPS.has(name)) return grep(ctx, rest);
  if (NETWORK_SHELLS.has(name)) {
    analyzer.flag('upload', `it uploads data: ${name} opens a raw network connection`);
    return generic(ctx, pathLikeArgs(rest));
  }
  if (TUNNELS.has(name)) return tunnel(name, ctx, rest);
  if (PERSISTENCE.has(name)) return persistence(name, ctx, rest);
  if (CLIPBOARD.has(name)) return clipboard(name, ctx, rest);
  if (DISK_TOOLS.test(name)) {
    analyzer.flag('destructive', `it runs ${name}, which formats or partitions a disk`);
    return;
  }
  if (TESTS.has(name)) return test(name, ctx, rest);
  const maker = MAKERS.get(name);
  if (maker) {
    const read = readArgs(maker, rest);
    applyEffects(ctx, name, maker, read);
    return operands(ctx, read.positionals, 'write');
  }
  const reader = READERS.get(name);
  if (reader) {
    const read = readArgs(reader, rest);
    applyEffects(ctx, name, reader, read);
    const out = READER_OUTPUT.get(name);
    operands(ctx, read.positionals.filter((_, k) => k !== out), 'read');
    if (out !== undefined && read.positionals[out]) files(ctx, [read.positionals[out]], 'write');
    return;
  }
  if (name === 'let') return analyzer.dynamic('it runs let, which reads its words as arithmetic');
  const hidden = EVALUATING_BUILTINS.has(name) ? hiddenLeadingOption(rest) : undefined;
  if (hidden) analyzer.dynamic(`it runs ${name} with ${hidden.raw}, which may be an option such as -i, -n or -v`);
  for (const variable of namedVariables(ctx, name, rest)) assignNamed(ctx, name, variable);
  if (NO_OPERANDS.has(name)) return;
  switch (name) {
  case 'cd':
  case 'pushd': {
    const target = operandWords(readArgs(CD, rest), rest)[0];
    if (!target) {
      analyzer.moveTo({ kind: 'moved', dir: path.resolve(analyzer.ctx.homeDir) });
    } else if (target.kind === 'unknown' || /^[-+]\d*$/.test(target.text) || analyzer.searchesCdPath(target.text)) {
      // `cd -`, `pushd +1` and a `CDPATH` lookup go to a dir the text does not name.
      analyzer.moveTo({ kind: 'unknown' });
    } else {
      analyzer.addPath(target, 'read', true);
      analyzer.moveTo(analyzer.dirAt(target.text));
    }
    return;
  }
  case 'popd':
    analyzer.moveTo({ kind: 'unknown' });
    return;
  case 'export':
  case 'declare':
  case 'local':
  case 'readonly':
  case 'typeset':
    if (rest.some((a) => /^-[A-Za-z]*i/.test(literalStart(a)))) analyzer.dynamic(`it runs ${name} -i, which reads every value it assigns as arithmetic`);
    // `export -n` takes the export flag off; only declare, local and typeset make a reference.
    if (name !== 'export' && name !== 'readonly' && rest.some((a) => /^-[A-Za-z]*n/.test(literalStart(a)))) {
      analyzer.dynamic(`it runs ${name} -n, which makes a name reference whose target is read as a subscript that can run code`);
    }
    for (const arg of rest) {
      const start = literalStart(arg);
      if (/^[^=-][^=]*\[/.test(start)) analyzer.dynamic(`it runs ${name} on an array element, whose subscript runs as code`);
      if (arg.kind === 'unknown' && !/^[A-Za-z_]/.test(start) && arg.raw.includes('=')) analyzer.assignUnknownName(arg.raw);
      const m = /^([A-Za-z_][A-Za-z0-9_]*)(\+?)=(.*)$/s.exec(start);
      if (m) analyzer.assign(m[1], m[2] ? '+=' : '=', arg.kind === 'known' ? m[3] : null);
    }
    return;
  case 'eval':
    {
      const words = knownTexts(rest);
      if (words === null) analyzer.dynamic('it runs eval on a value from a variable');
      else analyzer.nested(words.join(' '), 'it runs a string with eval');
    }
    return;
  case 'source':
  case '.':
    analyzer.dynamic(`it loads a script into the shell with ${name}`);
    if (rest[0]) analyzer.addPath(rest[0], 'read', true);
    return;
  case 'deno':
    if (textOf(rest[0]) === 'eval') return analyzer.dynamic('it runs inline code with deno eval');
    return generic(ctx, rest);
  case 'bun':
    if (leadingOptions(rest, NODE.inline).options.some((o) => NODE.inline.has(o.key))) {
      return analyzer.dynamic('it runs inline code with bun -e');
    }
    return generic(ctx, rest);
  case 'curl':
    return curl(ctx, rest);
  case 'wget':
    return wget(ctx, rest);
  case 'scp':
  case 'rsync':
    return remoteCopy(name, ctx, rest);
  case 'ssh':
    return ssh(ctx, rest);
  case 'tar':
  case 'gtar':
    return tar(ctx, rest);
  case 'zip':
    return zip(ctx, rest);
  case 'sort':
  case 'gsort':
    return sort(ctx, rest);
  case 'man':
    return man(ctx, rest);
  case 'security':
    return security(ctx, rest);
  case 'busybox':
    if (textOf(rest[0]) === 'httpd') return busyboxServer(ctx, rest.slice(1));
    if (rest[0]?.kind === 'unknown') {
      analyzer.dynamic(`it runs busybox ${rest[0].raw}, an applet from a variable`);
      return generic(ctx, rest.slice(1));
    }
    if (rest[0]) return runCommand(path.basename(rest[0].text), rest.slice(1), ctx);
    return;
  case 'find':
    return find(ctx, rest);
  case 'git':
    return git(ctx, rest);
  case 'sed':
  case 'gsed':
    return sed(ctx, rest);
  case 'rm':
  case 'rmdir':
  case 'unlink':
  case 'shred':
  case 'rimraf':
  case 'srm':
    return remove(name, ctx, rest);
  case 'tee':
    return tee(ctx, rest);
  case 'tree':
  {
    const read = readArgs(TREE, rest);
    applyEffects(ctx, name, TREE, read);
    return operands(ctx, read.positionals, 'read');
  }
  case 'cp':
  case 'mv':
  case 'ln':
  case 'install':
    return copyLike(name, ctx, rest);
  case 'chmod':
  case 'chown':
  case 'chgrp':
    return chmodLike(name, ctx, rest);
  case 'dd':
    return dd(ctx, rest);
  case 'diskutil':
    if (rest.some((a) => a.kind === 'unknown' || /^(erase|zero|partition|secureErase|reformat)/i.test(a.text))) {
      analyzer.flag('destructive', 'it runs diskutil to erase or partition a disk');
    }
    return;
  default:
    return generic(ctx, rest);
  }
}
