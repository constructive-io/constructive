/** Brace expansion (`{a,b}`, `{1..3}`) on the unquoted parts of a word. */

const MAX_BRACE_RESULTS = 256;

/** The most words a word of plain names may expand to, so that each name is still checked. */
export const MAX_PLAIN_NAME_RESULTS = 4096;

type Expansion = { text: string; mask: boolean[] };

/**
 * The word can only expand to plain names in the current dir: with no comma
 * alternative, `~`, `/`, `$`, `-` or glob character, only sequence groups
 * (`{1..300}`, `{a..z}`) expand.
 */
function expandsToPlainNames(text: string): boolean {
  return !/[-,~/$*?[]/.test(text);
}

/**
 * Expand a word's braces, every word it makes included: up to
 * `MAX_BRACE_RESULTS`, or up to `MAX_PLAIN_NAME_RESULTS` for a word of plain
 * names (`for i in {1..300}`), whose names can still spell a secret file or
 * a credential store (`.{a..z}{e..e}{a..z}{r..r}{c..c}` holds `.netrc`).
 * Returns `false` when it stopped at the limit, so some words are missing.
 */
export function expandWord(text: string, mask: boolean[], out: Expansion[]): boolean {
  if (expandBraces(text, mask, out, MAX_BRACE_RESULTS)) return true;
  if (!expandsToPlainNames(text)) return false;
  out.length = 0;
  return expandBraces(text, mask, out, MAX_PLAIN_NAME_RESULTS);
}

/**
 * Expand `{a,b}` and `{1..3}` in the unquoted parts of a word. Returns
 * `false` when it stopped at `limit`, so some words are missing.
 */
function expandBraces(text: string, mask: boolean[], out: Expansion[], limit: number): boolean {
  if (out.length >= limit) return false;
  for (let open = 0; open < text.length; open++) {
    if (text[open] !== '{' || !mask[open]) continue;
    let depth = 0;
    const commas: number[] = [];
    let close = -1;
    for (let j = open; j < text.length; j++) {
      if (!mask[j]) continue;
      if (text[j] === '{') depth++;
      else if (text[j] === '}') {
        depth--;
        if (depth === 0) {
          close = j;
          break;
        }
      } else if (text[j] === ',' && depth === 1) commas.push(j);
    }
    if (close < 0) {
      out.push({ text, mask });
      return true;
    }
    const pre = text.slice(0, open);
    const preMask = mask.slice(0, open);
    const post = text.slice(close + 1);
    const postMask = mask.slice(close + 1);
    let alternatives: { text: string; mask: boolean[] }[] = [];
    if (commas.length > 0) {
      const bounds = [open, ...commas, close];
      for (let k = 0; k < bounds.length - 1; k++) {
        alternatives.push({
          text: text.slice(bounds[k] + 1, bounds[k + 1]),
          mask: mask.slice(bounds[k] + 1, bounds[k + 1])
        });
      }
    } else {
      const seq = /^(-?\d+|[A-Za-z])\.\.(-?\d+|[A-Za-z])(?:\.\.(-?\d+))?$/.exec(text.slice(open + 1, close));
      if (!seq) continue;
      const values = sequence(seq[1], seq[2], seq[3], limit);
      if (values === null) return false;
      alternatives = values.map((t) => ({ text: t, mask: [...t].map(() => true) }));
    }
    let complete = true;
    for (const alt of alternatives) {
      complete = expandBraces(pre + alt.text + post, [...preMask, ...alt.mask, ...postMask], out, limit) && complete;
    }
    return complete;
  }
  out.push({ text, mask });
  return true;
}

/** The values of `{from..to..step}`, or `null` when there are more than `limit`. */
function sequence(from: string, to: string, step: string | undefined, limit: number): string[] | null {
  const numeric = /^-?\d+$/.test(from) && /^-?\d+$/.test(to);
  const a = numeric ? Number(from) : from.charCodeAt(0);
  const b = numeric ? Number(to) : to.charCodeAt(0);
  const inc = Math.max(1, Math.abs(Number(step ?? 1)));
  const out: string[] = [];
  for (let v = a; a <= b ? v <= b : v >= b; v += a <= b ? inc : -inc) {
    if (out.length >= limit) return null;
    out.push(numeric ? String(v) : String.fromCharCode(v));
  }
  return out;
}
