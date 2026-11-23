/**
 * The one option reader. A `ProgramSpec` says how a program reads its options
 * and what each one does; `readArgs` reads a command's arguments with it, and
 * `optionSpecs` gives the options one spelling can be. The analyzer's rules
 * and the prefix guard both go through them, so they cannot read an option
 * differently.
 */

import type { Arg } from './analyze';

/** What an option makes the program do. */
export type Effect =
  /** It runs a program the value names, or code the program loads. */
  | 'runs-program'
  /** It writes the file the value names. */
  | 'writes-file'
  /** It reads the file the value names. */
  | 'reads-file'
  /** It sets a config key (`key=value`), and some keys run a program. */
  | 'sets-config'
  /** It runs the program in the dir the value names. */
  | 'changes-dir'
  /** It sends the program's data where the value names. */
  | 'sends-to'
  /** It rewrites or deletes history or refs, or discards work that is not committed. */
  | 'rewrites-history';

export interface OptionSpec {
  /**
   * The spellings of the options it describes (`-c`, `--command`). Options
   * that share a spec share its value and effect, and stay separate options.
   */
  readonly names: readonly string[];
  /** `none`: a flag. `required`: glued (`-cX`, `--opt=X`) or the next word. `optional`: glued only. */
  readonly value: 'none' | 'required' | 'optional';
  readonly effect?: Effect;
  /** The effect holds only for a value that matches (`ProxyCommand=…` among ssh's `-o` values); a value from a variable may. */
  readonly when?: RegExp;
  /** Captures, in group 1, the shell command the value runs, which the analysis reads as bash. */
  readonly shell?: RegExp;
}

/** An operand with an effect: an action word in first place (`reflog expire`), or a prefix any operand starts with (`+main`). */
export type OperandEffect = { readonly first: string; readonly effect: Effect } | { readonly prefix: string; readonly effect: Effect };

export interface ProgramSpec {
  /** A long option may be shortened to a prefix of its name (git's parse-options, getopt_long). */
  readonly abbreviations: boolean;
  /** The options end at the first operand (git's own options before the subcommand); otherwise they may follow operands. */
  readonly stopAtOperand: boolean;
  readonly options: readonly OptionSpec[];
  readonly operandEffects?: readonly OperandEffect[];
  /** A word with one dash is a whole option name, never a cluster (`-cmd`, `-ex`, PowerShell's `-Command`). */
  readonly singleDash?: boolean;
  /** Option names match in any case (PowerShell). */
  readonly anyCase?: boolean;
}

/** One option as the program reads it, with every option its spelling can be. */
export interface ReadOption {
  readonly arg: Arg;
  /** The spelling as written, without a glued value: `--conf`, `-c`. */
  readonly name: string;
  /** The full spellings it can be: `--config` for `--conf`; the written spelling for an option no spec lists. */
  readonly spellings: readonly string[];
  readonly specs: readonly OptionSpec[];
  readonly value?: Arg;
}

export interface ReadArgs {
  readonly options: readonly ReadOption[];
  readonly operands: readonly Arg[];
  /** Arguments from a variable that may be any option of the program. */
  readonly unknown: readonly Arg[];
  /** The operands and the arguments from a variable, in order: what is left where an operand may stand. */
  readonly positionals: readonly Arg[];
  /** The index of the first argument after the options when `stopAtOperand`, or the argument count. */
  readonly next: number;
}

/**
 * An argument from a variable that may be an option: its text does not start
 * with a literal, or an unquoted value in it may split off a word of its own.
 */
export function mayBeOption(arg: Arg): boolean {
  return arg.kind === 'unknown' && (arg.splits || !/^[\w./]/.test(arg.raw));
}

/** The options a written name can be: their full spellings, and the specs that describe them. */
interface Resolved {
  readonly spellings: readonly string[];
  readonly specs: readonly OptionSpec[];
}

/**
 * The options a spelling can be. An exact name wins; otherwise, where the
 * program takes abbreviations, every long option the spelling starts, since
 * the analysis does not know every option that could make it ambiguous.
 */
function resolveOption(spec: ProgramSpec, name: string): Resolved {
  const fold = (n: string) => (spec.anyCase ? n.toLowerCase() : n);
  const wanted = fold(name);
  const matching = (is: (n: string) => boolean): Resolved => {
    const specs = spec.options.filter((o) => o.names.some(is));
    const spellings = [...new Set(specs.flatMap((o) => o.names.filter(is)))];
    return { spellings: spellings.length > 0 ? spellings : [name], specs };
  };
  const exact = matching((n) => fold(n) === wanted);
  const long = name.startsWith('--') || (spec.singleDash === true && name.startsWith('-'));
  if (exact.specs.length > 0 || !spec.abbreviations || !long || name.length < 3) return exact;
  const dashes = name.startsWith('--') ? '--' : '-';
  return matching((n) => n.startsWith(dashes) && !n.startsWith(`${dashes}-`) && fold(n).startsWith(wanted));
}

export function optionSpecs(spec: ProgramSpec, name: string): readonly OptionSpec[] {
  return resolveOption(spec, name).specs;
}

/** The value an option takes: `required` when any option its spelling can be takes one. */
function valueOf(specs: readonly OptionSpec[]): OptionSpec['value'] {
  if (specs.some((o) => o.value === 'required')) return 'required';
  return specs.some((o) => o.value === 'optional') ? 'optional' : 'none';
}

/** The rest of an argument from `from` on, as an argument of its own (`x` out of `--opt=x`). */
function restOf(arg: Arg, from: number): Arg {
  return arg.kind === 'known' ? { ...arg, text: arg.text.slice(from) } : { ...arg, knownPrefix: arg.knownPrefix.slice(from) };
}

/** One option an argument spells, and where its value is: glued from `glued` on, or the next word. */
export interface SpelledOption {
  readonly name: string;
  readonly spellings: readonly string[];
  readonly specs: readonly OptionSpec[];
  /** The index in the argument's text where a glued value starts. */
  readonly glued?: number;
  /** The option takes the next word as its value. */
  readonly takesNext: boolean;
}

/**
 * The options one argument spells: a long option, with its value after `=`,
 * or each short option of a cluster up to one that takes a value, which takes
 * the rest of the cluster or the next word. `null` when it is not an option.
 */
export function optionsIn(spec: ProgramSpec, text: string): SpelledOption[] | null {
  const whole = text.startsWith('-') && !text.startsWith('--') && text.length > 2 ? text.split('=')[0] : null;
  if (whole !== null && (spec.singleDash || optionSpecs({ ...spec, abbreviations: false }, whole).length > 0)) {
    const { spellings, specs } = resolveOption(spec, whole);
    if (whole.length < text.length) return [{ name: whole, spellings, specs, glued: whole.length + 1, takesNext: false }];
    return [{ name: whole, spellings, specs, takesNext: valueOf(specs) === 'required' }];
  }
  if (text.startsWith('--') && text.length > 2) {
    const eq = text.indexOf('=');
    const name = eq < 0 ? text : text.slice(0, eq);
    const { spellings, specs } = resolveOption(spec, name);
    if (eq >= 0) return [{ name, spellings, specs, glued: eq + 1, takesNext: false }];
    return [{ name, spellings, specs, takesNext: valueOf(specs) === 'required' }];
  }
  if (!text.startsWith('-') || text.length < 2 || text === '--') return null;
  const spelled: SpelledOption[] = [];
  for (let c = 1; c < text.length; c++) {
    const name = `-${text[c]}`;
    const { spellings, specs } = resolveOption(spec, name);
    const value = valueOf(specs);
    if (value === 'none') {
      spelled.push({ name, spellings, specs, takesNext: false });
      continue;
    }
    if (c + 1 < text.length) spelled.push({ name, spellings, specs, glued: c + 1, takesNext: false });
    else spelled.push({ name, spellings, specs, takesNext: value === 'required' });
    break;
  }
  return spelled;
}

/**
 * Read a command's arguments as the program does: long options with `=` or
 * the next word as the value, short options alone or in a cluster with a value
 * glued to them or in the next word, and `--` ending the options. An option
 * that takes a value takes the next word even when it is `--`, as git and
 * getopt do.
 */
export function readArgs(spec: ProgramSpec, args: readonly Arg[]): ReadArgs {
  const options: ReadOption[] = [];
  const operands: Arg[] = [];
  const unknown: Arg[] = [];
  const positionals: Arg[] = [];
  let k = 0;
  for (; k < args.length; k++) {
    const arg = args[k];
    if (arg.kind === 'unknown') {
      if (mayBeOption(arg)) {
        unknown.push(arg);
        positionals.push(arg);
        continue;
      }
      if (spec.stopAtOperand) break;
      operands.push(arg);
      positionals.push(arg);
      continue;
    }
    const t = arg.text;
    if (t === '--') {
      operands.push(...args.slice(k + 1));
      positionals.push(...args.slice(k + 1));
      k = args.length;
      break;
    }
    const spelled = optionsIn(spec, t);
    if (spelled) {
      for (const { name, spellings, specs, glued, takesNext } of spelled) {
        if (glued !== undefined) options.push({ arg, name, spellings, specs, value: restOf(arg, glued) });
        else if (takesNext) options.push({ arg, name, spellings, specs, value: args[++k] });
        else options.push({ arg, name, spellings, specs });
      }
      continue;
    }
    if (spec.stopAtOperand) break;
    operands.push(arg);
    positionals.push(arg);
  }
  return { options, operands, unknown, positionals, next: k };
}

/** The effects the read options have; an argument that may be any option has every effect the program's options have. */
export function effectsOf(spec: ProgramSpec, read: ReadArgs): Set<Effect> {
  const effects = new Set<Effect>();
  for (const option of read.options) for (const s of option.specs) if (s.effect) effects.add(s.effect);
  if (read.unknown.length > 0) for (const s of spec.options) if (s.effect) effects.add(s.effect);
  return effects;
}

/** The effects of a program's operands, given as text after its name (and a git subcommand's name). */
export function operandEffects(spec: ProgramSpec, words: readonly string[]): Effect[] {
  return (spec.operandEffects ?? []).flatMap((o) => {
    const hit = 'first' in o ? words[0] === o.first : words.some((w) => !w.startsWith('-') && w.startsWith(o.prefix));
    return hit ? [o.effect] : [];
  });
}

/** The option has the effect for its value: always, or for a value that matches `when`, or one the analysis cannot know. */
function hasEffect(s: OptionSpec, effect: Effect, value: Arg | undefined): boolean {
  if (s.effect !== effect) return false;
  return !s.when || value === undefined || value.kind === 'unknown' || s.when.test(value.text);
}

/** The read options whose spelling can be an option with `effect` for its value. */
export function withEffect(read: ReadArgs, effect: Effect): ReadOption[] {
  return read.options.filter((o) => o.specs.some((s) => hasEffect(s, effect, o.value)));
}

/** The shell commands the read option's value runs, as the spec's `shell` captures them; empty when it names none. */
export function shellCommands(option: ReadOption): string[] {
  const value = option.value;
  if (value?.kind !== 'known') return [];
  return option.specs.flatMap((s) => {
    if (!s.shell) return [];
    const m = s.shell.exec(value.text);
    return m ? [m[1]] : [];
  });
}

/** The read option can be one of `names`, which list every spelling of an option (`-f`, `--file`). */
export function isOption(option: ReadOption, ...names: string[]): boolean {
  return option.spellings.some((s) => names.includes(s));
}

/** Any read option can be one spelled `name`. */
export function hasOption(read: ReadArgs, ...names: string[]): boolean {
  return read.options.some((o) => isOption(o, ...names));
}

/** The values of the read options that can be one spelled `name`. */
export function valuesOf(read: ReadArgs, ...names: string[]): Arg[] {
  return read.options.flatMap((o) => (o.value && isOption(o, ...names) ? [o.value] : []));
}
