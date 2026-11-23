/**
 * Programs read through the program registry whose options or text run a
 * program: tar, zip, sort and man by their options, and the programs with a
 * command language of their own (psql, sqlite3, mysql, …) by their text, from
 * options, operands and stdin. Where the text shows the shell command it runs,
 * the analysis reads that command as bash, so a credential read in it is
 * denied like any other; code it cannot read raises `shell-dynamic`.
 */

import type { Arg } from './analyze';
import { type CommandContext, generic, literalArg, restOf } from './args';
import { effectsOf, hasOption, type ProgramSpec, type ReadArgs, readArgs, shellCommands, valuesOf, withEffect } from './options';
import { MAN, SORT, TAR, type TextProgram, ZIP } from './programs';

/**
 * What the read options do: a program they run (its shell command read as
 * bash where the spec captures one), files they read or write, and an argument
 * from a variable, which may be any option the program takes.
 */
export function applyEffects(ctx: CommandContext, name: string, spec: ProgramSpec, read: ReadArgs): void {
  const { analyzer } = ctx;
  for (const option of withEffect(read, 'runs-program')) {
    const commands = shellCommands(option);
    if (commands.length === 0) analyzer.dynamic(`it runs ${name} ${option.arg.raw}, which runs a program the command names`);
    for (const command of commands) analyzer.nested(command, `it runs ${name} ${option.name}, which runs a shell command`);
  }
  for (const option of withEffect(read, 'reads-file')) if (option.value) analyzer.addPath(option.value, 'read', true);
  for (const option of withEffect(read, 'writes-file')) if (option.value) analyzer.addPath(option.value, 'write', true);
  const hidden = read.unknown[0];
  if (!hidden) return;
  const could = effectsOf(spec, { ...read, options: [] });
  if (could.has('runs-program')) analyzer.dynamic(`it passes ${name} ${hidden.raw}, a value from a variable that may be an option that runs a program`);
  if (could.has('reads-file') || could.has('writes-file')) {
    analyzer.unresolvable(`it passes ${name} ${hidden.raw}, a value from a variable that may be an option naming a file the analysis cannot place`);
  }
}

/** The text a program runs in its command language: a shell command it shows is read as bash, other code asks. */
function runText(ctx: CommandContext, name: string, program: TextProgram, text: Arg, where: string): void {
  const { analyzer } = ctx;
  if (text.kind === 'unknown') {
    analyzer.dynamic(`it runs ${name} commands from ${text.raw}, a value from a variable that may run a program`);
    return;
  }
  if (!program.language.runs.test(text.text)) return;
  const commands = program.language.shells.flatMap(({ pattern, sqlQuoted }) =>
    [...text.text.matchAll(pattern)].map((m) => (sqlQuoted ? m[1].replace(/''/g, "'") : m[1]))
  );
  if (commands.length === 0) analyzer.dynamic(`it runs ${name} commands ${where}, which can run a program`);
  for (const command of commands) analyzer.nested(command, `it runs a shell command from ${name} ${where}`);
}

/** A program with a command language of its own: its text from options, operands and stdin. */
export function textProgram(name: string, program: TextProgram, ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const read = readArgs(program.spec, rest);
  applyEffects(ctx, name, program.spec, read);
  const texts: { arg: Arg; where: string }[] = valuesOf(read, ...program.textOptions).map((arg) => ({ arg, where: 'in an option' }));
  const plus = (a: Arg) => program.plusText === true && (a.kind === 'known' ? a.text : a.knownPrefix).startsWith('+');
  for (const op of read.operands) if (plus(op)) texts.push({ arg: restOf(op, 1), where: 'in an argument' });
  const operands = read.operands.filter((op) => !plus(op));
  const textFrom = program.textFrom ?? operands.length;
  for (const arg of operands.slice(textFrom)) texts.push({ arg, where: 'in an argument' });
  for (const { arg, where } of texts) runText(ctx, name, program, arg, where);
  const given = texts.length > 0 || valuesOf(read, ...program.fileOptions).length > 0;
  if (program.readsStdin && !given && ctx.stdinFed) {
    const input = analyzer.stdin.text;
    if (input === null) analyzer.dynamic(`it feeds ${name} commands from input the analysis cannot see`);
    else runText(ctx, name, program, literalArg(input), 'on its input');
  }
  generic(ctx, operands.slice(0, textFrom));
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

export function tar(ctx: CommandContext, rest: readonly Arg[]): void {
  const read = readArgs(TAR, tarWords(rest));
  applyEffects(ctx, 'tar', TAR, read);
  generic(ctx, [...valuesOf(read, '-f', '--file'), ...read.operands]);
}

export function zip(ctx: CommandContext, rest: readonly Arg[]): void {
  const read = readArgs(ZIP, rest);
  applyEffects(ctx, 'zip', ZIP, read);
  generic(ctx, read.operands);
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
