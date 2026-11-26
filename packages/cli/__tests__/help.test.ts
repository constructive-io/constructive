import { renderReference } from '@agentic-kit/command';
import { OVERRIDE_ENV_VARS, STASH_DIR_ENV } from '@agentic-kit/session';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PassThrough, Writable } from 'stream';

import { commands, createConstructiveCli } from '../src/cli';

const TOPICS = ['environment', 'exit-codes', 'output', 'approval', 'agents', 'rules', 'files'];

let stash: string;
let project: string;
let env: NodeJS.ProcessEnv;

beforeAll(() => {
  stash = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-stash-'));
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-project-'));
  env = { ...process.env, CONSTRUCTIVE_STASH_DIR: stash };
  for (const name of OVERRIDE_ENV_VARS) delete env[name];
});

afterAll(() => {
  fs.rmSync(stash, { recursive: true, force: true });
  fs.rmSync(project, { recursive: true, force: true });
});

async function run(argv: string[]): Promise<{ code: number; out: string }> {
  let out = '';
  const stdout = new Writable({ write(chunk, _encoding, done) { out += chunk; done(); } });
  const code = await createConstructiveCli().run(argv, { stdin: new PassThrough(), stdout, stderr: new PassThrough(), env, cwd: project });
  return { code, out };
}

const topics = () => createConstructiveCli().manifest().topics;

describe('constructive help', () => {
  it('has the help topics, in this order', () => {
    expect(topics().map((topic) => topic.name)).toEqual(TOPICS);
  });

  it.each(TOPICS)('prints the topic %s', async (name) => {
    const { code, out } = await run(['help', name]);
    expect(code).toBe(0);
    const topic = topics().find((item) => item.name === name);
    expect(JSON.parse(out).data).toEqual({ kind: 'topic', name, text: `${topic.summary}\n\n${topic.body}\n` });
  });

  it.each([[['db', 'create']], [['access', 'types']], [['agent']]])('prints for %j the page that --help prints', async (words) => {
    const help = await run([...words, '--help']);
    const { code, out } = await run(['help', ...words]);
    expect(code).toBe(0);
    expect(JSON.parse(out).data.text).toBe(help.out);
  });

  it.each([
    [['agnets'], ['agents']],
    [['exit-code'], ['exit-codes']],
    [['db', 'craete'], ['db create']]
  ])('refuses %j with exit 2, naming the nearest command or topic', async (words, suggestions) => {
    const { code, out } = await run(['help', ...words]);
    expect(code).toBe(2);
    const { error, meta } = JSON.parse(out);
    expect(error.code).toBe('unknown-topic');
    expect(error.details.suggestions).toEqual(suggestions);
    expect(meta.next[0].argv).toEqual(['constructive', 'help']);
  });

  it('names in its topics only flags that the CLI has', () => {
    const { globals, commands: entries } = createConstructiveCli().manifest();
    const flags = new Set([globals, ...entries.map((entry) => entry.input)].flatMap((schema) =>
      Object.keys(schema?.properties ?? {}).map((property) => `--${property.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase()}`)));
    // The skills CLI's own command, which the agents topic quotes, has flags of its own.
    const named = topics().flatMap((topic): string[] => topic.body.replace(/`npx [^`]*`/g, '').match(/(?<![\w-])--[a-z][a-z-]*/g) ?? []);
    expect(named.filter((flag) => !flags.has(flag))).toEqual([]);
  });

  it.each([...OVERRIDE_ENV_VARS, STASH_DIR_ENV])('names %s in the environment topic', (variable) => {
    expect(topics().find((topic) => topic.name === 'environment').body).toContain(`\`${variable}\``);
  });
});

describe('the reference', () => {
  const reference = renderReference(createConstructiveCli().manifest());

  it.each([...commands.map((command) => command.name), 'help'])('has the command %s', (name) => {
    expect(reference).toContain(`\n### ${name}\n`);
  });

  it.each(TOPICS)('has the topic %s', (name) => {
    expect(reference).toContain(topics().find((topic) => topic.name === name).body);
  });
});

describe('the man page', () => {
  const PACKAGE = path.resolve(__dirname, '..');

  it('is the reference in roff, with every section, and cnc is the same page', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-man-'));
    try {
      execFileSync('node', [path.join(PACKAGE, 'scripts', 'man.mjs'), out], { cwd: PACKAGE });
      const page = fs.readFileSync(path.join(out, 'constructive.1'), 'utf8');
      const { version } = JSON.parse(fs.readFileSync(path.join(PACKAGE, 'package.json'), 'utf8'));
      expect(page).toMatch(new RegExp(`^\\.TH "CONSTRUCTIVE" "1" "\\d{4}-\\d{2}-\\d{2}" "constructive ${version.replace(/\./g, '\\.')}" "Constructive CLI"\n`));
      expect(page.match(/^\.SH .+$/gm)).toEqual(
        ['NAME', 'SYNOPSIS', 'DESCRIPTION', 'GLOBAL FLAGS', 'COMMANDS', 'OUTPUT', 'APPROVAL', 'AGENTS', 'RULES', 'EXIT STATUS', 'ENVIRONMENT', 'FILES', 'SEE ALSO'].map((name) => `.SH "${name}"`)
      );
      expect(page).toContain('\n.SS "db create"\n');
      // remark-man opens a nested list with ".RS 4" and ends it with ".RE 0", which closes every inset, so lists stay flat.
      expect(page).not.toMatch(/^\.RS 4$/m);
      expect(fs.readFileSync(path.join(out, 'cnc.1'), 'utf8')).toBe('.so man1/constructive.1\n');
      const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE, 'package.json'), 'utf8'));
      expect([...pkg.man].sort()).toEqual(Object.keys(pkg.bin).sort().map((name) => `./man/${name}.1`));
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });
});
