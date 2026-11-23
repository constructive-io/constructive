/**
 * The one option reader. A `ProgramSpec` says how a program reads its options
 * and what each one does; `readArgs` reads a command's arguments with it, and
 * `optionSpecs` gives the options one spelling can be. The analyzer's rules
 * and the prefix guard both go through them, so they cannot read an option
 * differently.
 */

import type { Arg } from './analyze';
import { isPathLike } from './words';

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

/** What an option's value is to the program: what one of the effects acts on, or plain text it opens and runs nothing with. */
export type ValueKind = Effect | 'plain';

/**
 * The files one value of an option names, when only some forms of its value
 * name one (curl's `-d @file`, a `-F` form's files): it gets the value's text,
 * or for a value from a variable its literal start (`whole` false), and gives
 * the files named in it and whether the rest may name more.
 */
export type FileForm = (text: string, whole: boolean) => NamedFiles;

export interface NamedFiles {
  readonly paths: readonly string[];
  /** A value from a variable may name another file in the part the analysis cannot see. */
  readonly open: boolean;
}

interface SpecFields {
  /**
   * The spellings of the options it describes (`-c`, `--command`). Options
   * that share a spec share its value and effect, and stay separate options.
   */
  readonly names: readonly string[];
  /** The effect holds only for a value that matches (`ProxyCommand=…` among ssh's `-o` values); a value from a variable may. */
  readonly when?: RegExp;
  /** Captures, in group 1, the shell command the value runs, which the analysis reads as bash. */
  readonly shell?: RegExp;
  /** The value `-` is stdin or stdout, not a file of that name (`curl -o -`, `psql -f -`). */
  readonly stdio?: true;
  /** The value names files only in these forms; without it, a file option's whole value is the file. */
  readonly files?: FileForm;
}

/** A flag. It takes no value, and it may still have an effect (`--ext-diff`, `--amend`). */
interface FlagSpec extends SpecFields {
  readonly value: 'none';
  readonly effect?: Effect;
}

/** An option with a value: `required` is glued (`-cX`, `--opt=X`) or the next word, `optional` glued only. Its value has a kind. */
interface ValueSpec extends SpecFields {
  readonly value: 'required' | 'optional';
  readonly effect: ValueKind;
}

export type OptionSpec = FlagSpec | ValueSpec;

/** The effect an option has, or `undefined` for a flag with none or a plain value. */
export function effectOf(s: OptionSpec): Effect | undefined {
  return s.effect === 'plain' ? undefined : s.effect;
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
  /** A dash word is an option only when every letter in it is a listed one; otherwise it is an operand (`chmod -w f`). */
  readonly strictShort?: boolean;
}

/**
 * An option no spec lists, with a glued value that looks like a path
 * (`--contents=~/x`): a possible read, so the table need not list every option
 * that names a file.
 */
const UNLISTED_PATH: OptionSpec = { names: [], value: 'required', effect: 'reads-file' };

/** A glued value of an option no spec lists that may name a path: its literal start, or for a value from a variable its spelling, looks like one. */
function unlistedPath(specs: readonly OptionSpec[], value: Arg): readonly OptionSpec[] {
  if (specs.length > 0) return specs;
  const start = value.kind === 'known' ? value.text : value.knownPrefix;
  return isPathLike(start) || (value.kind === 'unknown' && isPathLike(value.raw)) ? [UNLISTED_PATH] : specs;
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
  /** A `--` ended the options. */
  readonly ended: boolean;
}

/**
 * An argument from a variable that may be an option: what it certainly starts
 * with, after quote removal, is not plain text (`"$X"`, `--$X`), or an
 * unquoted value in it may split off a word of its own.
 */
export function mayBeOption(arg: Arg): boolean {
  return arg.kind === 'unknown' && (arg.splits || !/^[\w./]/.test(arg.knownPrefix));
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
  if (spec.strictShort && [...text.slice(1)].some((c) => optionSpecs(spec, `-${c}`).length === 0)) return null;
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
 * getopt do. For a program whose options stop at its first operand, `next`
 * is the word after the `--`, where its command or operands start.
 */
export function readArgs(spec: ProgramSpec, args: readonly Arg[]): ReadArgs {
  const options: ReadOption[] = [];
  const operands: Arg[] = [];
  const unknown: Arg[] = [];
  const positionals: Arg[] = [];
  let ended = false;
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
      ended = true;
      if (spec.stopAtOperand) {
        k++;
        break;
      }
      operands.push(...args.slice(k + 1));
      positionals.push(...args.slice(k + 1));
      k = args.length;
      break;
    }
    const spelled = optionsIn(spec, t);
    if (spelled) {
      for (const { name, spellings, specs, glued, takesNext } of spelled) {
        if (glued !== undefined) {
          const value = restOf(arg, glued);
          options.push({ arg, name, spellings, specs: unlistedPath(specs, value), value });
        }
        else if (takesNext) options.push({ arg, name, spellings, specs, value: args[++k] });
        else options.push({ arg, name, spellings, specs });
      }
      continue;
    }
    if (spec.stopAtOperand) break;
    operands.push(arg);
    positionals.push(arg);
  }
  return { options, operands, unknown, positionals, next: k, ended };
}

/**
 * Every word that may be an operand: the ones read, and for a program whose
 * options stop at its first operand, every word from there on.
 */
export function operandWords(read: ReadArgs, args: readonly Arg[]): Arg[] {
  return [...read.positionals, ...args.slice(read.next)];
}

/** The effects the read options have; an argument that may be any option has every effect the program's options have. */
export function effectsOf(spec: ProgramSpec, read: ReadArgs): Set<Effect> {
  const effects = new Set<Effect>();
  const add = (s: OptionSpec) => {
    const effect = effectOf(s);
    if (effect) effects.add(effect);
  };
  for (const option of read.options) option.specs.forEach(add);
  if (read.unknown.length > 0) spec.options.forEach(add);
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
export function hasEffect(s: OptionSpec, effect: Effect, value: Arg | undefined): boolean {
  if (s.effect !== effect) return false;
  return !s.when || value === undefined || value.kind === 'unknown' || s.when.test(value.text);
}

/**
 * The files a file option's value names: the whole value, none for a `-`
 * that is stdin or stdout, or what the spec's form finds in it. A value from
 * a variable that may name one more gives a path the analysis cannot place.
 */
export function namedFiles(s: OptionSpec, value: Arg | undefined): Arg[] {
  if (!value) return [];
  if (s.stdio && value.kind === 'known' && value.text === '-') return [];
  if (!s.files) return [value];
  const whole = value.kind === 'known';
  const { paths, open } = s.files(whole ? value.text : value.knownPrefix, whole);
  const files: Arg[] = paths.map((text) => ({ kind: 'known', text, raw: value.raw, glob: value.kind === 'known' && value.glob && /[*?[]/.test(text) }));
  if (open) files.push({ kind: 'unknown', knownPrefix: '', raw: value.raw, splits: false });
  return files;
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
