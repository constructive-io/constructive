import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { createPermissionEngine } from '../src';
import { fencedEnv, runBash, seeded } from './differential';

const BASH = '/bin/bash';
const SEEDS = [1, 2];
const CASES_PER_SEED = 400;

/** Spellings of `~/.ssh/id_rsa` through the home dir, braces, globs, quotes and `..`. */
const HEAD = ['~', '$HOME', '${HOME}', '"$HOME"', '~/w/..', '{~,x}', '{x,~}', '{~,}', '~""', '{,~}', '{{~,y},x}', 'w/../..', '../'];
const MID = ['/.ssh', '/.s{s,x}h', '/{.ssh,x}', '/.ss?', '/.s*h', '/.[s]sh', '"/.ssh"', "'/.ssh'", '/.ssh/.', '/./.ssh', '/{.ssh,.ssh}', '/.ss{h,}'];
const TAIL = ['/id_rsa', '/id_rs{a,x}', '/{id_rsa,x}', '/id_r?a', '/id_*', '"/id_rsa"', '/i{d,x}_rsa'];
const WRAP: ((w: string) => string)[] = [
  (w) => w,
  (w) => `{${w},a}`,
  (w) => `{a,${w}}`,
  (w) => `{a,b}{,${w}}`,
  (w) => `x{,${w}}`,
  (w) => `{${w}}`,
  (w) => `"${w}"`,
  (w) => `{a,${w}}{,}`
];

function generate(seed: number, count: number): { forms: string[]; undrawn: string[] } {
  const { pick, undrawn } = seeded(seed);
  const forms = Array.from({ length: count }, () => `cat ${pick(WRAP)(pick(HEAD) + pick(MID) + pick(TAIL))}`);
  return { forms, undrawn: undrawn({ WRAP, HEAD, MID, TAIL }) };
}

const withBash = existsSync(BASH) ? describe : describe.skip;

/** Whatever spelling reaches the key, bash reading it means the kit denies it, Full mode included. */
withBash('a credential store read that bash runs is denied in every mode', () => {
  let root: string;
  let home: string;
  let ws: string;

  beforeAll(() => {
    root = realpathSync(mkdtempSync(path.join(tmpdir(), 'kit-hard-deny-')));
    home = path.join(root, 'home');
    ws = path.join(home, 'w');
    mkdirSync(path.join(home, '.ssh'), { recursive: true });
    mkdirSync(ws, { recursive: true });
    writeFileSync(path.join(home, '.ssh', 'id_rsa'), 'MARKER-KEY\n');
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it.each(SEEDS)('seed %d', async (seed) => {
    const { forms, undrawn } = generate(seed, CASES_PER_SEED);
    expect(undrawn).toEqual([]);
    const script = forms.map((form, k) => `printf '\\n@${k}:'; ${form} 2>/dev/null`).join('\n');
    const stdout = runBash(BASH, script, { cwd: ws, env: fencedEnv(root, home) });
    const read = forms.filter((_, k) => (stdout.split(`\n@${k}:`)[1] ?? '').split('\n@')[0].includes('MARKER-KEY'));
    const engine = createPermissionEngine({ cwd: ws, homeDir: home, roots: { temp: [] } });
    const allowed: string[] = [];
    for (const command of read) {
      const d = await engine.evaluate({ toolCallId: 't', toolName: 'bash', input: { command } }, { mode: 'full', grants: [] });
      if (d.decision !== 'deny') allowed.push(`${JSON.stringify(command)}: ${d.decision} ${d.request.signals.join(',')}`);
    }
    expect(allowed).toEqual([]);
    // With every wrap drawn, the quoted ones read nothing, so about two fifths of the forms reach the key.
    expect(read.length).toBeGreaterThan(CASES_PER_SEED / 4);
  }, 30_000);
});
