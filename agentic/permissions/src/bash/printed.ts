/**
 * The exact texts bash's `echo` and `printf` builtins print and a
 * here-document delivers, or `null` where the analysis cannot be sure of them. It follows bash's own readers: `echo`'s
 * options and `ansicstr` for `echo -e`, and printf's `tescape` for its format
 * and `%b`. A form whose output depends on the bash version, the locale or
 * the C library (`\u`, a byte above 0x7f or NUL, a number format) is `null`.
 */

/** The per-command text budget (`ExpansionBudget`): a charge that does not fit takes nothing. */
export interface TextBudget {
  takeChars(n: number): boolean;
}

interface Escape {
  /** The text the escape prints. */
  readonly text: string;
  /** How many characters after the backslash it takes. */
  readonly length: number;
  /** `\c`: the output stops here. */
  readonly stop?: true;
}

const SIMPLE: Readonly<Record<string, string>> = { a: '\x07', b: '\b', e: '\x1b', E: '\x1b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\' };

/** A byte the analysis reads as text: not NUL and not above 0x7f. */
const byte = (value: number, length: number): Escape | null => (value > 0 && value < 0x80 ? { text: String.fromCharCode(value), length } : null);

function digits(text: string, from: number, most: number, pattern: RegExp): string {
  let end = from;
  while (end < text.length && end - from < most && pattern.test(text[end])) end++;
  return text.slice(from, end);
}

/**
 * One escape after the backslash at `at`, as bash's printf reads it: in the
 * format (`bexpand` false) or in a `%b` argument (`bexpand` true).
 */
function printfEscape(text: string, at: number, bexpand: boolean): Escape | null {
  const c = text[at + 1];
  if (c === undefined) return { text: '\\', length: 0 };
  if (c in SIMPLE) return { text: SIMPLE[c], length: 1 };
  if (/[0-7]/.test(c)) {
    const more = digits(text, at + 2, c === '0' && bexpand ? 3 : 2, /[0-7]/);
    return byte(parseInt(c + more, 8) & 0xff, 1 + more.length);
  }
  if (c === 'x') {
    const hex = digits(text, at + 2, 2, /[0-9A-Fa-f]/);
    return hex === '' ? null : byte(parseInt(hex, 16), 1 + hex.length);
  }
  if (c === 'u' || c === 'U') return null;
  if (c === "'" || c === '"' || c === '?') return bexpand ? { text: '\\', length: 0 } : { text: c, length: 1 };
  if (c === 'c' && bexpand) return { text: '', length: 1, stop: true };
  return { text: '\\', length: 0 };
}

/** One escape after the backslash at `at`, as `echo -e` reads it. bash 3.2 has no `\e`. */
function echoEscape(text: string, at: number): Escape | null {
  const c = text[at + 1];
  if (c === undefined) return { text: '\\', length: 0 };
  if (c === 'e' || c === 'E') return null;
  if (c in SIMPLE) return { text: SIMPLE[c], length: 1 };
  if (c === '0') {
    const more = digits(text, at + 2, 3, /[0-7]/);
    return byte(parseInt(`0${more}`, 8) & 0xff, 1 + more.length);
  }
  if (c === 'x') {
    const hex = digits(text, at + 2, 2, /[0-9A-Fa-f]/);
    return hex === '' ? { text: '\\', length: 0 } : byte(parseInt(hex, 16), 1 + hex.length);
  }
  if (c === 'u' || c === 'U') return null;
  if (c === 'c') return { text: '', length: 1, stop: true };
  return { text: '\\', length: 0 };
}

interface Expanded {
  readonly text: string;
  readonly stop: boolean;
}

function expand(text: string, read: (text: string, at: number) => Escape | null): Expanded | null {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '\\') {
      out += text[i];
      continue;
    }
    const escape = read(text, i);
    if (escape === null) return null;
    out += escape.text;
    if (escape.stop) return { text: out, stop: true };
    i += escape.length;
  }
  return { text: out, stop: false };
}

/** No NUL, and no character above 0x7f, whose bytes depend on the locale. */
const ascii = (text: string) => ![...text].some((c) => c === '\0' || c > '\x7f');

/** What `echo` prints when it reads its options, escapes on or off by default. */
function echoText(words: readonly string[], escapesByDefault: boolean): string | null {
  let k = 0;
  let newline = true;
  let escapes = escapesByDefault;
  for (; k < words.length && /^-[neE]+$/.test(words[k]); k++) {
    for (const flag of words[k].slice(1)) {
      if (flag === 'n') newline = false;
      else escapes = flag === 'e';
    }
  }
  return echoBody(words.slice(k).join(' '), escapes, newline);
}

function echoBody(body: string, escapes: boolean, newline: boolean): string | null {
  if (!escapes) return newline ? `${body}\n` : body;
  const read = expand(body, echoEscape);
  if (read === null) return null;
  return read.stop || !newline ? read.text : `${read.text}\n`;
}

/**
 * The texts `echo` may print. bash reads escapes only with `-e`; with the
 * xpg_echo option (and in zsh) it reads them by default; and bash as POSIX
 * sh with xpg_echo (macOS /bin/sh) reads no options and every escape.
 */
function echoTexts(words: readonly string[], budget: TextBudget): string[] | null {
  if (!words.every(ascii)) return null;
  const texts = [echoText(words, false), echoText(words, true), echoBody(words.join(' '), true, true)];
  if (texts.includes(null)) return null;
  const known = [...new Set(texts as string[])];
  return budget.takeChars(known.reduce((n, text) => n + text.length, 0)) ? known : null;
}

const INTEGER = /^-?(?:0|[1-9]\d{0,14})$/;

/** One printf conversion, filled from its argument; `null` for a form the analysis does not model or a pad over the budget. */
function convert(spec: RegExpExecArray, arg: string | undefined, budget: TextBudget): Expanded | null {
  const [, flags, width, precision, conversion] = spec;
  if (flags !== '' && flags !== '-') return null;
  let read: Expanded | null;
  if (conversion === 's') {
    read = { text: arg ?? '', stop: false };
  } else if (conversion === 'b') {
    read = expand(arg ?? '', (text, at) => printfEscape(text, at, true));
    // bash 3.2 prints nothing, not the padding, for an empty `%b`.
    if (read === null || (read.text === '' && width !== undefined)) return null;
  } else if (conversion === 'd' || conversion === 'i') {
    if (precision !== undefined || (arg !== undefined && !INTEGER.test(arg))) return null;
    read = { text: String(Number(arg ?? '0')), stop: false };
  } else {
    return null;
  }
  if (!ascii(read.text)) return null;
  let text = precision === undefined ? read.text : read.text.slice(0, Number(precision));
  const padding = Math.max(0, Number(width ?? 0) - text.length);
  if (!budget.takeChars(padding)) return null;
  const pad = ' '.repeat(padding);
  text = flags === '-' ? text + pad : pad + text;
  return { text, stop: read.stop };
}

/** What `printf` prints: its format, used again while arguments are left, with `%s`, `%b`, `%d` and `%i` filled in. */
function printfText(words: readonly string[], budget: TextBudget): string | null {
  if (words[0] === '-v') return '';
  const [format, ...args] = words[0] === '--' ? words.slice(1) : words;
  if (format === undefined || /^-./.test(format) || !ascii(format)) return null;
  let out = '';
  let used = 0;
  for (;;) {
    const before = used;
    const built = out.length;
    for (let i = 0; i < format.length; i++) {
      if (format[i] === '\\') {
        const escape = printfEscape(format, i, false);
        if (escape === null) return null;
        out += escape.text;
        i += escape.length;
      } else if (format[i] !== '%') {
        out += format[i];
      } else if (format[i + 1] === '%') {
        out += '%';
        i++;
      } else {
        const spec = /^%([-+ #0']*)(\d+)?(?:\.(\d*))?([A-Za-z])/.exec(format.slice(i));
        if (!spec) return null;
        const filled = convert(spec, args[used], budget);
        if (filled === null) return null;
        if (used < args.length) used++;
        out += filled.text;
        if (filled.stop) return out;
        i += spec[0].length - 1;
      }
    }
    // Each pass over the format is charged, so a long format used again for many arguments stays in budget.
    if (!budget.takeChars(out.length - built)) return null;
    if (used === before || used >= args.length) return out;
  }
}

/** The texts `echo` or `printf` may print from these words, or `null` when the analysis cannot be sure of them. */
export function printedText(name: 'echo' | 'printf', words: readonly string[], budget: TextBudget): readonly string[] | null {
  if (name === 'echo') return echoTexts(words, budget);
  const text = printfText(words, budget);
  return text === null ? null : [text];
}

/**
 * The text a here-document gives its command. A quoted delimiter keeps the
 * body as written. An unquoted body is expanded, and in it `\` quotes only
 * `\`, `$` and `` ` `` (bash's manual, "Here Documents"), so any other `$`
 * or `` ` `` is an expansion the analysis does not run.
 */
export function heredocText(body: string, quoted: boolean, budget: TextBudget): string | null {
  if (!budget.takeChars(body.length)) return null;
  if (quoted) return body;
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '\\' && i + 1 < body.length && '\\$`'.includes(body[i + 1])) out += body[++i];
    else if (c === '$' || c === '`') return null;
    else out += c;
  }
  return out;
}
