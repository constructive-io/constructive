import { existsSync, mkdtempSync, realpathSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { createPermissionEngine } from '../src';
import { tokenize } from '../src/bash/tokenize';
import { fencedEnv, runBash, seeded } from './differential';

const BASH = '/bin/bash';
const SEEDS = [1, 2, 3];
const FORMS_PER_SEED = 1000;

/** `$((_q_ …))` and `((_q_ …))` with nested parens, quotes, backticks, `$(` and `$((` in the body. */
const SINGLE = ['(', ')', ')', '(', '1', ' ', '+', ';', '|', '\\)', '\\(', "'", '"', '`', '#', '\n'];
const WRAPS = [0, 1, 2, 3, 4, 5];
const JOINS = [' | ', ';', '\n', ' && ', ' '];

function generate(seed: number, count: number): { forms: string[]; undrawn: string[] } {
  const { int, pick, undrawn } = seeded(seed);
  const atom = (depth: number): string => {
    if (depth > 2 || int(3) > 0) return pick(SINGLE);
    const inner = sequence(depth + 1, 3);
    return [`\`${inner}\``, `'${inner}'`, `"${inner}"`, `$(${inner})`, `$((${inner}))`, `(${inner})`][pick(WRAPS)];
  };
  const sequence = (depth: number, max: number): string => {
    let text = '';
    for (let n = int(max + 1); n > 0; n--) text += atom(depth);
    return text;
  };
  // Half the bodies close a paren early and open another, the shape bash reads as commands.
  const body = (): string => (int(2) ? sequence(0, 5) : `${sequence(0, 3)})${pick(JOINS)}(${sequence(0, 3)}`);
  const forms = Array.from({ length: count }, (_, k) => (k % 2 ? `((_q_ ${body()}))` : `echo $((_q_ ${body()}))`));
  return { forms, undrawn: undrawn({ SINGLE, WRAPS, JOINS }) };
}

type Reading = 'arithmetic' | 'commands';

/** How the kit reads a form: as bash does, or not at all (`unread`), which asks in every mode. */
type KitReading = Reading | 'unread';

/**
 * Run every form in bash and report how bash read each one. As a command,
 * `_q_` is a function that prints `C`; as an arithmetic name, its value holds
 * a subscript whose substitution prints `A`. A form that fails before either
 * marker prints is left out.
 */
function bashReadings(forms: string[], root: string): Map<number, Reading> {
  const quote = (text: string) => `'${text.split("'").join("'\\''")}'`;
  const script = [
    'exec 3>&1',
    '_q_() { printf C >&3; }',
    "_q_='_t[$(printf A >&3)]'",
    'PATH=',
    ...forms.map((form, k) => `printf '\\n@${k}:' >&3; ( eval ${quote(form)} ) >/dev/null 2>&1`)
  ].join('\n');
  const stdout = runBash(BASH, script, { cwd: root, env: fencedEnv(root, root) });
  const readings = new Map<number, Reading>();
  for (const [, k, marks] of stdout.matchAll(/@(\d+):([AC]*)/g)) {
    if (marks === 'A') readings.set(Number(k), 'arithmetic');
    else if (marks === 'C') readings.set(Number(k), 'commands');
    else if (marks !== '') throw new Error(`bash printed both markers for ${JSON.stringify(forms[Number(k)])}`);
  }
  return readings;
}

function kitReading(form: string): KitReading {
  const lexed = tokenize(form);
  if (lexed.error !== undefined || lexed.limits.includes('unparsed')) return 'unread';
  return lexed.commands.some((cmd) => cmd.words[0]?.raw === '_q_') ? 'commands' : 'arithmetic';
}

const withBash = existsSync(BASH) ? describe : describe.skip;

withBash('`$((` and `((` are arithmetic or commands as bash reads them', () => {
  let root: string;
  beforeAll(() => {
    root = realpathSync(mkdtempSync(path.join(tmpdir(), 'kit-arith-')));
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it.each(SEEDS)('seed %d', async (seed) => {
    const { forms, undrawn } = generate(seed, FORMS_PER_SEED);
    expect(undrawn).toEqual([]);
    const counts = { '$((': { arithmetic: 0, commands: 0 }, '((': { arithmetic: 0, commands: 0 } };
    const differ: string[] = [];
    const unread: string[] = [];
    for (const [k, reading] of bashReadings(forms, root)) {
      counts[forms[k].startsWith('echo') ? '$((' : '(('][reading]++;
      const kit = kitReading(forms[k]);
      if (kit === 'unread') unread.push(forms[k]);
      else if (kit !== reading) differ.push(`bash reads ${reading}: ${JSON.stringify(forms[k])}`);
    }
    expect(differ).toEqual([]);
    // A form the kit does not read is not a match, but it must fail closed: it asks in every mode.
    const engine = createPermissionEngine({ cwd: root, homeDir: root, roots: { temp: [] } });
    for (const form of unread) {
      const d = await engine.evaluate({ toolCallId: 't', toolName: 'bash', input: { command: form } }, { mode: 'full', grants: [] });
      expect([form, d.decision]).toEqual([form, 'ask']);
    }
    for (const form of Object.values(counts)) {
      expect(form.arithmetic).toBeGreaterThan(20);
      expect(form.commands).toBeGreaterThan(5);
    }
  }, 60_000);
});
