/**
 * Quoting and bracket matching for the lexer: where a quote, a substitution or
 * a `${…}` ends, and how `$'…'` decodes. Every helper throws `LexError` on
 * input that does not close, and the lexer turns that into `shell-dynamic`.
 */

export class LexError extends Error {}

/** Find the `)` that closes a `(` at `open`, skipping quotes and nested parens. */
export function matchParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\') {
      i++;
    } else if (ch === "'") {
      const end = s.indexOf("'", i + 1);
      if (end < 0) throw new LexError('unterminated single quote');
      i = end;
    } else if (ch === '"') {
      i = skipDouble(s, i);
    } else if (ch === '`') {
      i = matchBacktick(s, i);
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new LexError('unterminated substitution');
}

function skipDouble(s: string, open: number): number {
  for (let i = open + 1; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\') i++;
    else if (ch === '"') return i;
    else if (ch === '$' && s[i + 1] === '(') i = matchParen(s, i + 1);
    else if (ch === '`') i = matchBacktick(s, i);
  }
  throw new LexError('unterminated double quote');
}

export function matchBacktick(s: string, open: number): number {
  for (let i = open + 1; i < s.length; i++) {
    if (s[i] === '\\') i++;
    else if (s[i] === '`') return i;
  }
  throw new LexError('unterminated backtick');
}

/** Find the `]` that closes a `[` at `open` (`$[…]`), skipping quotes and nested brackets. */
export function matchBracket(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\') i++;
    else if (ch === "'") {
      const end = s.indexOf("'", i + 1);
      if (end < 0) throw new LexError('unterminated single quote');
      i = end;
    } else if (ch === '"') i = skipDouble(s, i);
    else if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new LexError('unterminated $[');
}

export function matchBrace(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\') i++;
    else if (ch === "'") {
      const end = s.indexOf("'", i + 1);
      if (end < 0) throw new LexError('unterminated single quote');
      i = end;
    } else if (ch === '"') i = skipDouble(s, i);
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new LexError('unterminated ${');
}

const ANSI_ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  a: '\x07',
  b: '\b',
  e: '\x1b',
  E: '\x1b',
  f: '\f',
  v: '\v',
  '\\': '\\',
  "'": "'",
  '"': '"',
  '?': '?'
};

/** Decode a `$'…'` body (ANSI-C quoting), so `$'\x72m'` reads as `rm`. */
export function decodeAnsiC(body: string): string {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== '\\' || i + 1 >= body.length) {
      out += ch;
      continue;
    }
    const next = body[++i];
    if (ANSI_ESCAPES[next] !== undefined) {
      out += ANSI_ESCAPES[next];
    } else if (next === 'x') {
      const hex = /^[0-9a-fA-F]{1,2}/.exec(body.slice(i + 1))?.[0] ?? '';
      out += hex ? String.fromCharCode(parseInt(hex, 16)) : '\\x';
      i += hex.length;
    } else if (next === 'u' || next === 'U') {
      const hex = new RegExp(`^[0-9a-fA-F]{1,${next === 'u' ? 4 : 8}}`).exec(body.slice(i + 1))?.[0] ?? '';
      out += hex ? String.fromCodePoint(parseInt(hex, 16)) : `\\${next}`;
      i += hex.length;
    } else if (/[0-7]/.test(next)) {
      const oct = /^[0-7]{1,3}/.exec(body.slice(i))?.[0] ?? next;
      out += String.fromCharCode(parseInt(oct, 8));
      i += oct.length - 1;
    } else if (next === 'c') {
      out += String.fromCharCode((body.charCodeAt(i + 1) || 64) & 31);
      i++;
    } else {
      out += `\\${next}`;
    }
  }
  return out;
}

export function findAnsiClose(s: string, from: number): number {
  for (let i = from; i < s.length; i++) {
    if (s[i] === '\\') i++;
    else if (s[i] === "'") return i;
  }
  throw new LexError("unterminated $'");
}

/** Where a substitution that starts at `i` ends: `$(…)`, `${…}` or a backtick; `-1` when none starts there. */
function substitutionEnd(word: string, i: number): number {
  if (word[i] === '$' && word[i + 1] === '(') return matchParen(word, i + 1);
  if (word[i] === '$' && word[i + 1] === '{') return matchBrace(word, i + 1);
  if (word[i] === '`') return matchBacktick(word, i);
  return -1;
}

/**
 * A heredoc delimiter: its word after quote removal and nothing else, so
 * `<<$X` ends at a line `$X`, `<<~` at `~` and `<<$(x)` at `$(x)`. Any
 * quoting (`'EOF'`, `"EOF"`, `\EOF`, `$'EOF'`) keeps the body literal.
 */
export function heredocDelimiter(word: string): { delim: string; quoted: boolean } {
  let delim = '';
  let quoted = false;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const sub = substitutionEnd(word, i);
    if (sub >= 0) {
      delim += word.slice(i, sub + 1);
      i = sub;
    } else if (ch === '\\') {
      if (word[i + 1] !== '\n') {
        quoted = true;
        delim += word[i + 1] ?? '';
      }
      i++;
    } else if (ch === "'") {
      quoted = true;
      const end = word.indexOf("'", i + 1);
      delim += word.slice(i + 1, end);
      i = end;
    } else if (ch === '$' && word[i + 1] === "'") {
      quoted = true;
      const end = findAnsiClose(word, i + 2);
      delim += decodeAnsiC(word.slice(i + 2, end));
      i = end;
    } else if (ch === '"' || (ch === '$' && word[i + 1] === '"')) {
      quoted = true;
      i += ch === '$' ? 2 : 1;
      for (; i < word.length && word[i] !== '"'; i++) {
        const inner = substitutionEnd(word, i);
        if (inner >= 0) {
          delim += word.slice(i, inner + 1);
          i = inner;
        } else if (word[i] === '\\' && '$`"\\\n'.includes(word[i + 1] ?? '')) {
          i++;
          if (word[i] !== '\n') delim += word[i];
        } else {
          delim += word[i];
        }
      }
    } else {
      delim += ch;
    }
  }
  return { delim, quoted };
}

export function unescapeBackticks(inner: string): string {
  return inner.replace(/\\([`$\\])/g, '$1');
}

export function stripQuotes(text: string): string {
  return text.replace(/^(['"])(.*)\1$/s, '$2');
}
