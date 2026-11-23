import { spawnSync } from 'child_process';
import { existsSync } from 'fs';

import { tokenize } from '../src/bash/tokenize';

const BASH = '/bin/bash';
const SEEDS = [1, 2, 3];
const FORMS_PER_SEED = 1000;

/** `$((_q_ …))` and `((_q_ …))` with nested parens, quotes, backticks, `$(` and `$((` in the body. */
function generate(seed: number, count: number): string[] {
  let state = seed;
  const rnd = (n: number): number => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return Math.floor(state / 65536) % n;
  };
  const pick = (options: string[]): string => options[rnd(options.length)];
  const single = ['(', ')', ')', '(', '1', ' ', '+', ';', '|', '\\)', '\\(', "'", '"', '`', '#', '\n'];
  const atom = (depth: number): string => {
    if (depth > 2 || rnd(3) > 0) return pick(single);
    const inner = sequence(depth + 1, 3);
    return pick([`\`${inner}\``, `'${inner}'`, `"${inner}"`, `$(${inner})`, `$((${inner}))`, `(${inner})`]);
  };
  const sequence = (depth: number, max: number): string => {
    let text = '';
    for (let n = rnd(max + 1); n > 0; n--) text += atom(depth);
    return text;
  };
  // Half the bodies close a paren early and open another, the shape bash reads as commands.
  const body = (): string => (rnd(2) ? sequence(0, 5) : `${sequence(0, 3)})${pick([' | ', ';', '\n', ' && ', ' '])}(${sequence(0, 3)}`);
  return Array.from({ length: count }, (_, k) => (k % 2 ? `((_q_ ${body()}))` : `echo $((_q_ ${body()}))`));
}

type Reading = 'arithmetic' | 'commands';

/**
 * Run every form in bash and report how bash read each one. As a command,
 * `_q_` is a function that prints `C`; as an arithmetic name, its value holds
 * a subscript whose substitution prints `A`. A form that fails before either
 * marker prints is left out.
 */
function bashReadings(forms: string[]): Map<number, Reading> {
  const quote = (text: string) => `'${text.split("'").join("'\\''")}'`;
  const script = [
    'exec 3>&1',
    '_q_() { printf C >&3; }',
    "_q_='_t[$(printf A >&3)]'",
    'PATH=',
    ...forms.map((form, k) => `printf '\\n@${k}:' >&3; ( eval ${quote(form)} ) >/dev/null 2>&1`)
  ].join('\n');
  const { stdout } = spawnSync(BASH, ['-c', script], { encoding: 'utf8', env: {}, timeout: 30_000 });
  const readings = new Map<number, Reading>();
  for (const [, k, marks] of stdout.matchAll(/@(\d+):([AC]*)/g)) {
    if (marks === 'A') readings.set(Number(k), 'arithmetic');
    else if (marks === 'C') readings.set(Number(k), 'commands');
    else if (marks !== '') throw new Error(`bash printed both markers for ${JSON.stringify(forms[Number(k)])}`);
  }
  return readings;
}

function kitReading(form: string): Reading {
  return tokenize(form).commands.some((cmd) => cmd.words[0]?.raw === '_q_') ? 'commands' : 'arithmetic';
}

const withBash = existsSync(BASH) ? describe : describe.skip;

withBash('`$((` and `((` are arithmetic or commands as bash reads them', () => {
  it.each(SEEDS)('seed %d', (seed) => {
    const forms = generate(seed, FORMS_PER_SEED);
    const counts = { '$((': { arithmetic: 0, commands: 0 }, '((': { arithmetic: 0, commands: 0 } };
    const differ: string[] = [];
    for (const [k, reading] of bashReadings(forms)) {
      counts[forms[k].startsWith('echo') ? '$((' : '(('][reading]++;
      if (kitReading(forms[k]) !== reading) differ.push(`bash reads ${reading}: ${JSON.stringify(forms[k])}`);
    }
    expect(differ).toEqual([]);
    for (const form of Object.values(counts)) {
      expect(form.arithmetic).toBeGreaterThan(20);
      expect(form.commands).toBeGreaterThan(5);
    }
  }, 60_000);
});
