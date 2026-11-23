import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { normalizeCommand } from '../src/bash/analyze';

const BASH = '/bin/bash';
const SEEDS = [7, 2027];
const COMMANDS_PER_SEED = 500;

/** Words, and words that hold blanks bash keeps as text: quotes, `${…}`, substitutions. */
const WORDS = ['a', 'b', '"a  b"', '"a\tb"', "'a  b'", "'a\tb'", '${x/ /-}', '${x/\t/-}', '${x//  /-}', '${y:-a  b}', '${y:-a\tb}'];
const WORDS_MORE = ['$(echo a  b)', '`echo a\t\tb`', '"$(printf \'a  b\')"', '$x', '"$x"', 'a$x', '#  c  d'];
const BLANKS = [' ', '  ', '\t', ' \t ', '\t\t'];
const LEADS = ['', '', 'IFS=; ', 'x=\'a  b\'; ', 'y=; '];

function generate(seed: number, count: number): string[] {
  let state = seed;
  const rnd = (n: number) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % n;
  };
  const pick = <T>(list: readonly T[]): T => list[rnd(list.length)];
  const words = [...WORDS, ...WORDS_MORE];
  return Array.from({ length: count }, () => {
    let command = `${pick(LEADS)}printf '[%s]'`;
    for (let k = 1 + rnd(5); k > 0; k--) command += pick(BLANKS) + pick(words);
    return command;
  });
}

const withBash = existsSync(BASH) ? describe : describe.skip;

/** A command and its exact-grant key are one grant, so bash must run them the same. */
withBash('two commands with the same exact-grant key run the same in bash', () => {
  let ws: string;
  beforeAll(() => {
    ws = mkdtempSync(path.join(tmpdir(), 'kit-exact-key-'));
  });
  afterAll(() => rmSync(ws, { recursive: true, force: true }));

  const run = (command: string) => {
    const r = spawnSync(BASH, ['-c', `x='a b\tc'; ${command}`], { cwd: ws, env: { PATH: '/usr/bin:/bin' }, encoding: 'utf8', timeout: 2000 });
    return `${r.status}|${r.stdout}`;
  };

  it.each(SEEDS)('seed %d', (seed) => {
    const differ: string[] = [];
    let pairs = 0;
    for (const command of generate(seed, COMMANDS_PER_SEED)) {
      const key = normalizeCommand(command);
      if (key === command || normalizeCommand(key) !== key) continue;
      pairs++;
      const [a, b] = [run(command), run(key)];
      if (a !== b) differ.push(`${JSON.stringify(command)} and ${JSON.stringify(key)}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
    }
    expect(differ).toEqual([]);
    expect(pairs).toBeGreaterThan(100);
  }, 30_000);
});
