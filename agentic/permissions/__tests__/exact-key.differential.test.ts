import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { normalizeCommand } from '../src/bash/analyze';
import { fencedEnv, runBash, seeded } from './differential';

const BASH = '/bin/bash';
const SEEDS = [7, 2027];
const COMMANDS_PER_SEED = 500;

/** Words, and words that hold blanks bash keeps as text: quotes, `${…}`, substitutions. */
const WORDS = ['a', 'b', '"a  b"', '"a\tb"', "'a  b'", "'a\tb'", '${x/ /-}', '${x/\t/-}', '${x//  /-}', '${y:-a  b}', '${y:-a\tb}'];
const WORDS_MORE = ['$(echo a  b)', '`echo a\t\tb`', '"$(printf \'a  b\')"', '$x', '"$x"', 'a$x', '#  c  d'];
const BLANKS = [' ', '  ', '\t', ' \t ', '\t\t'];
const LEADS = ['', '', 'IFS=; ', 'x=\'a  b\'; ', 'y=; '];

const ALL_WORDS = [...WORDS, ...WORDS_MORE];

function generate(seed: number, count: number): { commands: string[]; undrawn: string[] } {
  const { int, pick, undrawn } = seeded(seed);
  const commands = Array.from({ length: count }, () => {
    let command = `${pick(LEADS)}printf '[%s]'`;
    for (let k = 1 + int(5); k > 0; k--) command += pick(BLANKS) + pick(ALL_WORDS);
    return command;
  });
  return { commands, undrawn: undrawn({ ALL_WORDS, BLANKS, LEADS }) };
}

const withBash = existsSync(BASH) ? describe : describe.skip;

/** A command and its exact-grant key are one grant, so bash must run them the same. */
withBash('two commands with the same exact-grant key run the same in bash', () => {
  let ws: string;
  beforeAll(() => {
    ws = mkdtempSync(path.join(tmpdir(), 'kit-exact-key-'));
  });
  afterAll(() => rmSync(ws, { recursive: true, force: true }));

  // The status goes on its own line, after any `#` comment in the command.
  const run = (command: string) => runBash(BASH, `x='a b\tc'; ${command}\nprintf '|%s' "$?"`, { cwd: ws, env: fencedEnv(ws, ws), timeout: 2000 });

  it.each(SEEDS)('seed %d', (seed) => {
    const differ: string[] = [];
    let pairs = 0;
    const { commands, undrawn } = generate(seed, COMMANDS_PER_SEED);
    expect(undrawn).toEqual([]);
    for (const command of commands) {
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
