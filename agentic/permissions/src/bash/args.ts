/** Argument helpers and the generic operand rule, shared by the command rules. Options are read through the registry (`options.ts`). */

import type { Access } from '../types';
import { type Analyzer, type Arg, type KnownArg, literalStart } from './analyze';
import { mayBeOption } from './options';
import { isPathLike, isUrl } from './words';

export interface CommandContext {
  analyzer: Analyzer;
  /** stdin comes from a pipe, a heredoc, a here-string or a `<` redirect. */
  stdinFed: boolean;
  /** Run by `xargs`, so more operands arrive from stdin. */
  xargs: boolean;
}

/** An argument the analyzer made up itself (`.` for a default root): fully known, no glob. */
export function literalArg(text: string, raw: string = text): KnownArg {
  return { kind: 'known', text, raw, glob: false };
}

/** The argument may name a path: its literal start, or for an unknown one its spelling, looks like one. */
export function looksLikePath(arg: Arg): boolean {
  return isPathLike(literalStart(arg)) || (arg.kind === 'unknown' && isPathLike(arg.raw));
}

export function pathLikeArgs(rest: readonly Arg[]): Arg[] {
  return rest.filter(looksLikePath);
}

/** The first word that is not an option: a subcommand or action, known or not. */
export function firstOperand(rest: readonly Arg[]): Arg | undefined {
  return rest.find((a) => !literalStart(a).startsWith('-'));
}

/** The texts of `args` when every one is known, or `null` (a shell string built from them cannot be read). */
export function knownTexts(args: readonly Arg[]): string[] | null {
  const texts: string[] = [];
  for (const arg of args) {
    if (arg.kind === 'unknown') return null;
    texts.push(arg.text);
  }
  return texts;
}

export function isKnown(arg: Arg): arg is KnownArg {
  return arg.kind === 'known';
}

/** The text of a known argument, or `undefined` for an unknown or missing one. */
export function textOf(arg: Arg | undefined): string | undefined {
  return arg?.kind === 'known' ? arg.text : undefined;
}

/** The rest of `arg` from `from` on, as an argument of its own (`x` out of `--opt=x`); `from` indexes its literal start. */
export function restOf(arg: Arg, from: number): Arg {
  return arg.kind === 'known' ? { ...arg, text: arg.text.slice(from) } : { ...arg, knownPrefix: arg.knownPrefix.slice(from) };
}

export interface LeadingOption {
  /** One option: `-c` out of a `-xc` cluster, `--eval` out of `--eval=X`. */
  key: string;
  /** Its value, glued (`-cX`, `--eval=X`) or the next word: only for `withValue` keys. */
  value?: Arg;
}

/**
 * A program's own options, up to its first operand (`node -r x main.js -e y`
 * stops at `main.js`: the rest belongs to the script). `next` is the index
 * of the first operand; a word built
 * from a variable stops the scan, because it may be either. An option in
 * `stopAfter` ends the program's options (`python -c X`, `python -m X`).
 */
export function leadingOptions(
  rest: readonly Arg[],
  withValue: ReadonlySet<string>,
  stopAfter: ReadonlySet<string> = new Set()
): { options: LeadingOption[]; next: number } {
  const options: LeadingOption[] = [];
  let k = 0;
  for (; k < rest.length; k++) {
    const arg = rest[k];
    if (arg.kind === 'unknown') break;
    const t = arg.text;
    if (t === '--') return { options, next: k + 1 };
    if (!t.startsWith('-') || t === '-') break;
    if (t.startsWith('--')) {
      const eq = t.indexOf('=');
      const key = eq < 0 ? t : t.slice(0, eq);
      if (eq >= 0) options.push({ key, value: restOf(arg, eq + 1) });
      else options.push(withValue.has(key) ? { key, value: rest[++k] } : { key });
    } else {
      for (let c = 1; c < t.length; c++) {
        const key = `-${t[c]}`;
        if (!withValue.has(key)) {
          options.push({ key });
          continue;
        }
        const glued = t.slice(c + 1);
        options.push({ key, value: glued ? { ...arg, text: glued } : rest[++k] });
        break;
      }
    }
    if (stopAfter.has(options[options.length - 1]?.key ?? '')) return { options, next: k + 1 };
  }
  return { options, next: k };
}

/** A long option and every abbreviation git and getopt accept for it: `--o`, `--ou`, …, `--output`. */
export function longSpellings(option: string): string[] {
  return Array.from({ length: option.length - 2 }, (_, k) => option.slice(0, k + 3));
}

/** The first argument before the operands that may be an option the analysis cannot read, or `undefined`. */
export function hiddenLeadingOption(rest: readonly Arg[]): Arg | undefined {
  for (const arg of rest) {
    if (mayBeOption(arg)) return arg;
    const t = literalStart(arg);
    if ((arg.kind === 'known' && t === '--') || !/^[-+]/.test(t)) return undefined;
  }
  return undefined;
}


/** Options that load an env file into the program without printing it. */
const ENV_FILE_OPTIONS = new Set(['--env-file', '--env-file-if-exists']);

/** The generic rule: operands are reads; `--opt=path` and `KEY=path` values too. */
export function generic(ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  let afterDashes = false;
  for (let k = 0; k < rest.length; k++) {
    const arg = rest[k];
    const t = literalStart(arg);
    if (arg.kind === 'known' && t === '--') {
      afterDashes = true;
      continue;
    }
    if (!afterDashes && t.startsWith('-') && arg.kind === 'unknown') {
      // It may be an option, and it may split into `--` and a path.
      analyzer.operand(arg);
      continue;
    }
    if (!afterDashes && t.startsWith('-')) {
      const eq = t.indexOf('=');
      const key = eq < 0 ? t : t.slice(0, eq);
      const quiet = ENV_FILE_OPTIONS.has(key);
      const value = eq > 0 ? restOf(arg, eq + 1) : null;
      // An unknown value is a path when its spelling looks like one (`--file=$DIR/x`).
      if (value && (quiet || isPathLike(literalStart(value)) || (value.kind === 'unknown' && isPathLike(arg.raw)))) {
        analyzer.addPath(value, 'read', true, quiet);
      } else if (eq < 0 && quiet && rest[k + 1]) {
        analyzer.addPath(rest[++k], 'read', true, true);
      }
      continue;
    }
    if (arg.kind === 'known') {
      const kv = /^[A-Za-z_][\w.-]*=(.+)$/.exec(t);
      if (kv && isPathLike(kv[1]) && !isUrl(kv[1])) {
        analyzer.addPath({ ...arg, text: kv[1] }, 'read', true);
        continue;
      }
    }
    analyzer.operand(arg);
  }
}

export function files(ctx: CommandContext, list: readonly Arg[], access: Access): void {
  for (const arg of list) if (!isUrl(literalStart(arg))) ctx.analyzer.addPath(arg, access, true);
}

/**
 * The operands a program reads or writes, from `readArgs(…).positionals`. One
 * built from a variable is a path the analysis cannot place, also when it may
 * be an option (`cat --$_`), so it is never dropped.
 */
export function operands(ctx: CommandContext, list: readonly Arg[], access: Access): void {
  for (const arg of list) {
    if (arg.kind === 'known' && access === 'read') ctx.analyzer.operand(arg);
    else files(ctx, [arg], access);
  }
}
