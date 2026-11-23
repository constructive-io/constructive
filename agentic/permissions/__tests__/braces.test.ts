import { expandWord, NameBudget } from '../src/bash/braces';

const unquoted = (text: string) => [...text].map(() => true);

describe('expandWord', () => {
  it('stops expanding where the command runs out of names to check', () => {
    const text = 'w{a..z}{a..z}{a..f}';
    const out: { text: string; mask: boolean[] }[] = [];
    expect(expandWord(text, unquoted(text), out, new NameBudget(10))).toBe('brace-names');
    expect(out).toHaveLength(10);
    const rest: { text: string; mask: boolean[] }[] = [];
    expect(expandWord(text, unquoted(text), rest, new NameBudget(0))).toBe('brace-names');
    expect(rest).toHaveLength(1);
  });
});
