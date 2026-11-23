import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { createPermissionEngine, grantFrom, parseCommandPattern, type PermissionEngine, sameMatch } from '../src';

const SEEDS = [1, 2];
const CASES_PER_SEED = 1500;

const PROGRAMS = ['node a,b.js', 'npm run a,b', 'git status', 'git log', 'git diff', 'npm test', 'npm run build', 'cat', 'ls', 'echo', 'grep'];
const PROGRAMS_MORE = ['node scripts/b.js', 'tsx watch src/i.ts', 'curl localhost:3000', 'rm -rf build', 'make', 'docker ps', 'pnpm test', 'python3 manage.py'];
const ARGS = ['-n', '--short', 'README.md', 'src', '-5', 'x', "'a b'", '$HOME', '2>&1', '| head', '>/dev/null', '> out.txt', '&& ls', '; echo done'];
const ARGS_MORE = ['--oneline', 'a,b', '"$X"', '*.ts'];

function generate(seed: number, count: number): string[] {
  let state = seed;
  const rnd = (n: number) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % n;
  };
  const pick = <T>(list: readonly T[]): T => list[rnd(list.length)];
  const programs = [...PROGRAMS, ...PROGRAMS_MORE];
  const args = [...ARGS, ...ARGS_MORE];
  return Array.from({ length: count }, () => {
    let command = pick(programs);
    for (let k = rnd(4); k > 0; k--) command += ` ${pick(args)}`;
    return command;
  });
}

/**
 * Every grant an ask card offers covers the same call the next time, and its
 * text form (the Settings editor) parses back to the same grant.
 */
describe('the grants an ask card offers', () => {
  let root: string;
  let engine: PermissionEngine;

  beforeAll(async () => {
    root = realpathSync(mkdtempSync(path.join(tmpdir(), 'kit-card-')));
    mkdirSync(path.join(root, 'src'));
    engine = createPermissionEngine({ cwd: root, homeDir: path.join(root, 'h'), roots: { temp: [] } });
    await engine.refreshSecrets({ env: {} });
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it.each(SEEDS)('seed %d', async (seed) => {
    const broken: string[] = [];
    let asks = 0;
    for (const command of generate(seed, CASES_PER_SEED)) {
      const call = { toolCallId: 't', toolName: 'bash', input: { command } };
      const d = await engine.evaluate(call, { mode: 'ask', grants: [] });
      if (d.decision !== 'ask') continue;
      asks++;
      for (const option of d.grantOptions) {
        const again = await engine.evaluate(call, { mode: 'ask', grants: [grantFrom(option)] });
        if (again.decision !== 'allow') broken.push(`${JSON.stringify(command)}: the ${option.scope} option ${option.pattern} does not cover its own call`);
        const back = parseCommandPattern(option.pattern);
        if (back.ok === false) broken.push(`${JSON.stringify(command)}: ${option.pattern} does not parse (${back.reason})`);
        else if (!sameMatch(back.match, option.match)) broken.push(`${JSON.stringify(command)}: ${option.pattern} parses to another grant`);
      }
    }
    expect(broken).toEqual([]);
    expect(asks).toBeGreaterThan(CASES_PER_SEED / 2);
  }, 30_000);
});
