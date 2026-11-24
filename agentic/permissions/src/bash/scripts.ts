/**
 * Programs read through the program registry whose options or text run a
 * program: tar, zip, sort and man by their options, and the programs with a
 * command language of their own (psql, sqlite3, mysql, …) by their text, from
 * options, operands and stdin. Where the text shows the shell command it runs,
 * the analysis reads that command as bash, so a credential read in it is
 * denied like any other; code it cannot read raises `shell-dynamic`.
 */

import { unreachable } from '../unreachable';
import { type Arg, type Cwd, sameCwd } from './analyze';
import { type CommandContext, generic, literalArg, operands, restOf, textOf } from './args';
import { type DirSpec, effectsOf, hasEffect, hasOption, isOption, namedFiles, type ProgramSpec, type ReadArgs, readArgs, type ReadOption, shellCommands, valuesOf } from './options';
import { MAN, SORT, TAR, type TextProgram, ZIP } from './programs';

/** A dir the program moves to: the option that moves it, and the dir it is in from there on. */
export interface DirChange {
  readonly at: Arg;
  readonly dir: Cwd;
}

/**
 * Where a dir option moves the program, by its repeat rule: a cumulative one
 * (`git -C`, `tar -C`) from the dir the one before it reached, a last-wins one
 * (`env -C`, gdb's `--cd`) from the dir the program started in. Its value is
 * read as a path from there.
 */
export function movedBy(analyzer: CommandContext['analyzer'], spec: DirSpec, value: Arg, reached: Cwd, start: Cwd): Cwd {
  const from = spec.repeat === 'cumulative' ? reached : start;
  analyzer.within(from, () => analyzer.addPath(value, 'read', true));
  return value.kind === 'known' ? analyzer.dirAt(value.text, from) : { kind: 'unknown' };
}

/** The spec of the dir option a read option can be, if any. */
export function dirSpecOf(option: ReadOption): DirSpec | undefined {
  return option.specs.find((s): s is DirSpec => s.effect === 'changes-dir');
}

/**
 * What the read options do, in order: a program they run (its shell command
 * read as bash where the spec captures one), files they read or write, and
 * the dir they move the program to, each resolved from the one before. An
 * argument from a variable may be any option the program takes. Returns the
 * dir changes, for the operands after them.
 */
export function applyEffects(ctx: CommandContext, name: string, spec: ProgramSpec, read: ReadArgs): DirChange[] {
  const { analyzer } = ctx;
  const changes: DirChange[] = [];
  const start = analyzer.cwdNow;
  for (const option of read.options) {
    const { value } = option;
    for (const s of option.specs) {
      if (s.effect === undefined || s.effect === 'plain' || !hasEffect(s, s.effect, value)) continue;
      switch (s.effect) {
      case 'runs-program': {
        const commands = shellCommands(option);
        if (commands.length === 0) analyzer.dynamic(`it runs ${name} ${option.arg.raw}, which runs a program or code the analysis does not read`);
        for (const command of commands) analyzer.nested(command, `it runs ${name} ${option.name}, which runs a shell command`);
        break;
      }
      case 'reads-file':
        for (const file of namedFiles(s, value)) analyzer.addPath(file, 'read', true);
        break;
      case 'writes-file':
        for (const file of namedFiles(s, value)) analyzer.addPath(file, 'write', true);
        break;
      case 'changes-dir':
        if (value) changes.push({ at: option.arg, dir: movedBy(analyzer, s, value, changes[changes.length - 1]?.dir ?? start, start) });
        break;
      // git, ssh and the prefix guard read these themselves.
      case 'sets-config':
      case 'sends-to':
      case 'rewrites-history':
        break;
      default:
        return unreachable(s.effect);
      }
    }
  }
  const hidden = read.unknown[0];
  if (!hidden) return changes;
  const could = effectsOf(spec, { ...read, options: [] });
  if (could.has('runs-program') || could.has('sets-config')) {
    analyzer.dynamic(`it passes ${name} ${hidden.raw}, a value from a variable that may be an option that runs a program`);
  }
  if (could.has('reads-file') || could.has('writes-file')) {
    analyzer.unresolvable(`it passes ${name} ${hidden.raw}, a value from a variable that may be an option naming a file the analysis cannot place`);
  }
  if (could.has('changes-dir')) changes.push({ at: hidden, dir: { kind: 'unknown' } });
  return changes;
}

/** The dir the program is in after all its dir changes, or `null` when it does not move. */
export function finalDir(changes: readonly DirChange[]): Cwd | null {
  return changes[changes.length - 1]?.dir ?? null;
}

/** The text a program runs in its command language: a shell command it shows is read as bash, other code asks. */
function runText(ctx: CommandContext, name: string, program: TextProgram, text: Arg, where: string): void {
  const { analyzer } = ctx;
  if (text.kind === 'unknown') {
    analyzer.dynamic(`it runs ${name} commands from ${text.raw}, a value from a variable that may run a program`);
    return;
  }
  const { escapes, shells } = program.language(text.text);
  if (!escapes) return;
  if (shells.length === 0) analyzer.dynamic(`it runs ${name} commands ${where} that can run a program or touch files`);
  for (const command of shells) analyzer.nested(command, `it runs a shell command from ${name} ${where}`);
}

/** The program reads stdin: an action option names it with `-`, or no action option and no operand text makes it run something else and exit. */
function readsStdin(read: ReadArgs, unless: readonly string[], operandText: boolean): boolean {
  const actions = read.options.filter((o) => isOption(o, ...unless));
  return actions.some((o) => textOf(o.value) === '-') || (actions.length === 0 && !operandText);
}

/** A program with a command language of its own: its text from options, operands and stdin. */
export function textProgram(name: string, program: TextProgram, ctx: CommandContext, rest: readonly Arg[]): void {
  for (const spec of program.readings?.(rest) ?? [program.spec]) readText(name, program, spec, ctx, rest);
}

/** One reading of a text program's arguments: its option effects, its texts, its stdin and its operands. */
function readText(name: string, program: TextProgram, spec: ProgramSpec, ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const read = readArgs(spec, rest);
  const dir = finalDir(applyEffects(ctx, name, spec, read));
  const texts: { arg: Arg; where: string }[] = valuesOf(read, ...program.textOptions).map((arg) => ({ arg, where: 'in an option' }));
  const plus = (a: Arg) => program.plusText === true && (a.kind === 'known' ? a.text : a.knownPrefix).startsWith('+');
  for (const op of read.operands) if (plus(op)) texts.push({ arg: restOf(op, 1), where: 'in an argument' });
  const operands = read.operands.filter((op) => !plus(op));
  const textFrom = program.textFrom ?? operands.length;
  for (const arg of operands.slice(textFrom)) texts.push({ arg, where: 'in an argument' });
  for (const { arg, where } of texts) runText(ctx, name, program, arg, where);
  if (program.stdin && ctx.stdinFed && readsStdin(read, program.stdin.unless, operands.length > textFrom)) {
    const input = analyzer.stdin.texts();
    const { file } = analyzer.stdin;
    if (input !== null) for (const text of new Set(input)) runText(ctx, name, program, literalArg(text), 'on its input');
    else if (!file) analyzer.dynamic(`it feeds ${name} commands from input the analysis cannot see`);
  }
  analyzer.within(dir ?? analyzer.cwdNow, () => generic(ctx, operands.slice(0, textFrom)));
}

/**
 * Traditional tar takes its option letters as the first word with no dash
 * (`tar cIf prog a.tar`), each letter that takes a value taking the next word.
 */
function tarWords(rest: readonly Arg[]): Arg[] {
  const first = rest[0];
  if (first?.kind !== 'known' || !/^[A-Za-z]+$/.test(first.text)) return [...rest];
  const values = rest.slice(1);
  const words: Arg[] = [];
  for (const letter of first.text) {
    const option = literalArg(`-${letter}`, first.raw);
    words.push(option);
    if (readArgs(TAR, [option]).options[0]?.specs.some((s) => s.value === 'required') && values.length > 0) words.push(values.shift());
  }
  return [...words, ...values];
}

/**
 * tar: the mode sets the archive's access (create, append and update write
 * it), and the -C chain sets where its members are. GNU tar reads options
 * anywhere, so a member is in the dir the -C before it reached; bsdtar stops
 * reading options at the first member, so every member is in the dir the
 * chain reached there. A member counts in both, and an extraction writes into
 * the dir of every member, or the dir the chain reached when it names none.
 */
export function tar(ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const words = tarWords(rest);
  const read = readArgs(TAR, words);
  const changes = applyEffects(ctx, 'tar', TAR, read);
  const writes = hasOption(read, '-c', '--create', '-r', '--append', '-u', '--update', '-A', '--catenate', '--concatenate', '--delete');
  if (writes) for (const archive of valuesOf(read, '-f', '--file')) if (textOf(archive) !== '-') analyzer.addPath(archive, 'write', true);
  const start = analyzer.cwdNow;
  const at = (arg: Arg) => words.indexOf(arg);
  const dirBefore = (index: number): Cwd => changes.filter((c) => at(c.at) < index).pop()?.dir ?? start;
  const members = read.positionals;
  const bsd = dirBefore(members.length > 0 ? at(members[0]) : words.length);
  const dirsOf = (member: Arg): Cwd[] => {
    const gnu = dirBefore(at(member));
    return sameCwd(gnu, bsd) ? [gnu] : [gnu, bsd];
  };
  if (hasOption(read, '-x', '--extract', '--get')) {
    const dirs = members.length > 0 ? members.flatMap(dirsOf) : [bsd];
    const distinct = dirs.filter((d, k) => dirs.findIndex((e) => sameCwd(d, e)) === k);
    for (const dir of distinct) analyzer.within(dir, () => analyzer.addPath(literalArg('.'), 'write', true));
    return;
  }
  if (!writes) return;
  for (const member of members) for (const dir of dirsOf(member)) analyzer.within(dir, () => operands(ctx, [member], 'read'));
}

/** zip: its first operand is the archive it writes, the rest are files it reads. */
export function zip(ctx: CommandContext, rest: readonly Arg[]): void {
  const read = readArgs(ZIP, rest);
  applyEffects(ctx, 'zip', ZIP, read);
  const [archive, ...members] = read.positionals;
  if (archive) ctx.analyzer.addPath(archive, 'write', true);
  operands(ctx, members, 'read');
}

/** sort reads its operands; one from a variable is a path, as for any reader. */
export function sort(ctx: CommandContext, rest: readonly Arg[]): void {
  const read = readArgs(SORT, rest);
  applyEffects(ctx, 'sort', SORT, read);
  for (const op of read.operands) if (op.kind === 'unknown') ctx.analyzer.addPath(op, 'read', true);
  generic(ctx, read.operands);
}

export function man(ctx: CommandContext, rest: readonly Arg[]): void {
  const read = readArgs(MAN, rest);
  applyEffects(ctx, 'man', MAN, read);
  generic(ctx, read.operands.filter((op) => op.kind === 'unknown' || op.text.includes('/')));
}

/** tar and zip take file names from stdin: `tar -T -`, `zip -@`. */
export function namesFromStdinIn(name: 'tar' | 'zip', rest: readonly Arg[]): boolean {
  if (name === 'zip') return hasOption(readArgs(ZIP, rest), '-@', '--names-stdin');
  return valuesOf(readArgs(TAR, tarWords(rest)), '-T', '--files-from').some((v) => v.kind === 'known' && v.text === '-');
}
