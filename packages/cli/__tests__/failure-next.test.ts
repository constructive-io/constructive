import type { CommandContext, FollowUpOptions, NextStep, NextWord } from '@agentic-kit/command';
import { TOOL_FAILURE_CODES, type ToolFailure, type ToolFailureCode } from '@agentic-kit/harness';
import { OVERRIDE_ENV_VARS } from '@agentic-kit/session';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PassThrough, Writable } from 'stream';

import { createConstructiveCli } from '../src/cli';
import { OWNER_ONLY_RULE } from '../src/commands/access';
import { databaseNext, type DatabaseState, FAILURE_NEXT, openPersonSession } from '../src/session';
import { commandContext } from '../test-utils/command-context';

let stash: string;
let project: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
  stash = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-stash-'));
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-project-'));
  env = { ...process.env, CONSTRUCTIVE_STASH_DIR: stash };
  for (const name of OVERRIDE_ENV_VARS) delete env[name];
});

afterEach(() => {
  fs.rmSync(stash, { recursive: true, force: true });
  fs.rmSync(project, { recursive: true, force: true });
});

async function run(argv: string[]) {
  let out = '';
  const stdout = new Writable({ write(chunk, _encoding, done) { out += chunk; done(); } });
  const code = await createConstructiveCli().run(argv, { stdin: new PassThrough(), stdout, stderr: new PassThrough(), env, cwd: project });
  return { code, out };
}

const step = (words: readonly NextWord[], why: string): NextStep => {
  const argv = ['constructive', ...words.map((word) => (typeof word === 'string' ? word : `<${word.placeholder}>`))];
  return { command: argv.join(' '), argv, why };
};

/** The context of `constructive table add tasks` with no terminal, as the layer would give it. */
function fakeContext(): CommandContext {
  return {
    cliName: 'constructive',
    invocation: 'constructive table add tasks',
    followUp: (flags: string[], options: FollowUpOptions) => step(['table', 'add', 'tasks', ...flags], options.why),
    next: (words: readonly NextWord[], why: string) => step(words, why),
    cwd: project,
    interactive: false,
    format: 'json',
    dryRun: false,
    yes: false,
    globals: {},
    env,
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    signal: new AbortController().signal
  } as unknown as CommandContext;
}

const APP_ENDPOINT = 'http://api-demo.example.com/graphql';

/** A failure of `code`, with the app endpoint an app-missing failure carries. */
const failureOf = (code: ToolFailureCode): ToolFailure => ({ code, message: 'It failed.', ...(code === 'app-missing' ? { context: { appEndpoint: APP_ENDPOINT } } : {}) });

/** Runs each step's argv with --help: the layer refuses an unknown command or flag before it prints help. */
async function expectRunnable(steps: NextStep[]) {
  for (const next of steps) {
    expect(next.argv[0]).toBe('constructive');
    const { code, out } = await run([...next.argv.slice(1), '--help']);
    expect({ argv: next.argv, code }).toEqual({ argv: next.argv, code: 0 });
    // A passthrough command answers --help with its own usage, in the envelope.
    if (out.startsWith('{')) expect(JSON.parse(out).data).toMatchObject({ command: next.argv[1], usage: expect.any(String) });
    else expect(out).toMatch(/^constructive [a-z-]+( [a-z-]+)?: /);
  }
}

describe('the next steps of a failure', () => {
  it.each(TOOL_FAILURE_CODES.map((code) => [code]))('%s: every step is a command this CLI runs', async (code: ToolFailureCode) => {
    const steps = FAILURE_NEXT[code](fakeContext(), failureOf(code));
    expect(Array.isArray(steps)).toBe(true);
    await expectRunnable(steps);
  });

  it('runs the top-level codegen against the app endpoint of an app-missing failure, into the project, and says why', () => {
    const [step] = FAILURE_NEXT['app-missing'](fakeContext(), failureOf('app-missing'));
    expect(step.argv).toEqual(['constructive', 'codegen', '--endpoint', APP_ENDPOINT, '--orm', '--output', path.join(project, 'codegen')]);
    expect(step.why).toMatch(/no app/);
  });

  it('leaves --yes out of the step after invalid-input, which only shows the input', async () => {
    const { ctx } = await commandContext(['--yes'], { env, cwd: project });
    const [step] = FAILURE_NEXT['invalid-input'](ctx, failureOf('invalid-input'));
    expect(step.argv).toEqual(['constructive', 'probe', '--schema']);
  });

  it.each<[string, DatabaseState]>([
    ['unbound', { status: 'unbound' }],
    ['found', { status: 'found', databaseId: 'db-1' }],
    ['missing', { status: 'missing', databaseId: 'db-1' }],
    ['suspended', { status: 'suspended', databaseId: 'db-1', suspendedAt: '2026-11-25' }],
    ['unreachable (auth)', { status: 'unreachable', databaseId: 'db-1', cause: 'auth', detail: 'rejected' }],
    ['unreachable (network)', { status: 'unreachable', databaseId: 'db-1', cause: 'network', detail: 'refused' }]
  ])('a database that is %s: every step is a command this CLI runs', async (_state, state) => {
    await expectRunnable(databaseNext(state, openPersonSession(fakeContext())));
  });

  it('writes the db create and db recreate steps of the CLI in the words of the steps the tools suggest', () => {
    const session = openPersonSession(fakeContext());
    expect(databaseNext({ status: 'unbound' }, session).map((next) => next.command)).toEqual([
      'constructive db create <database_name>',
      'constructive db use <name-or-id>'
    ]);
    expect(databaseNext({ status: 'missing', databaseId: 'db-1' }, session).map((next) => next.command)).toEqual(['constructive db recreate <database_name>']);
  });

  it('puts the steps in the envelope of a blocked change and of a failed read', async () => {
    const expected = ['constructive db create <database_name>', 'constructive db use <name-or-id>', 'constructive db list'];
    const blocked = await run(['table', 'add', 'tasks', '--field', 'title:text', '--rule', JSON.stringify(OWNER_ONLY_RULE), '--json']);
    const failed = await run(['schema', 'show', '--json']);
    for (const result of [blocked, failed]) {
      const envelope = JSON.parse(result.out);
      expect(result.code).toBe(1);
      expect(envelope.error.code).toBe('no-env');
      expect(envelope.meta.next.map((next: NextStep) => next.command)).toEqual(expected);
    }
  });
});
