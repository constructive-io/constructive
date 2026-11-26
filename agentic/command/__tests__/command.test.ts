import type { ConfirmPrompt } from '@agentic-kit/harness';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { PassThrough, Writable } from 'stream';
import { z } from 'zod';

import {
  type ChangeCommand,
  CliError,
  COMMAND_ERROR_CODES,
  type CommandContext,
  type CommandDefinition,
  createCli,
  ExitCode,
  type HelpTopic,
  renderReference
} from '../src';

interface Captured {
  stream: Writable;
  text: () => string;
}

function capture(onWrite?: (text: string) => void): Captured {
  let text = '';
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      text += chunk.toString();
      onWrite?.(text);
      callback();
    }
  });
  return { stream, text: () => text };
}

interface RunOptions {
  /** stdin and stdout are terminals. */
  tty?: boolean;
  /** Text piped into stdin; without it stdin stays open and silent. */
  stdin?: string;
  env?: NodeJS.ProcessEnv;
  /** In order: when stderr contains the first string, type the second into stdin. */
  answers?: Array<[string, string]>;
}

const dir = mkdtempSync(join(tmpdir(), 'agentic-command-'));
writeFileSync(join(dir, 'columns.json'), JSON.stringify([{ name: 'id' }]));
writeFileSync(join(dir, 'input.json'), JSON.stringify({ table_name: 'from-file', rowCount: 4 }));

async function exec(cli: ReturnType<typeof createCli>, argv: string[], options: RunOptions = {}) {
  const stdin = new PassThrough();
  const stdout = capture();
  const answers = [...(options.answers ?? [])];
  const stderr = capture((text) => {
    if (answers.length && text.includes(answers[0][0])) {
      const [, keys] = answers.shift();
      setImmediate(() => stdin.write(keys));
    }
  });
  if (options.tty) {
    Object.assign(stdin, { isTTY: true });
    Object.assign(stdout.stream, { isTTY: true });
  }
  if (options.stdin !== undefined) stdin.end(options.stdin);
  const code = await cli.run(argv, { stdin, stdout: stdout.stream, stderr: stderr.stream, env: options.env ?? {}, cwd: dir });
  return { code, stdout: stdout.text(), stderr: stderr.text(), json: () => JSON.parse(stdout.text()) };
}

const seen: Array<{ input: Record<string, unknown>; ctx: CommandContext }> = [];
const record = (input: Record<string, unknown>, ctx: CommandContext) => {
  seen.push({ input, ctx });
  return { data: input };
};
const lastInput = () => seen[seen.length - 1].input;

const planOf = (what: string): ConfirmPrompt => ({ title: `Change ${what}?`, message: `Change ${what}.`, target: { kind: 'workspace', cwd: dir } });

const tableAdd: CommandDefinition = {
  name: 'table add',
  summary: 'Add a table',
  effect: 'read',
  positionals: ['table_name'],
  input: z.object({
    table_name: z.string().describe('Name of the table'),
    rowCount: z.number().int().default(0).describe('Rows to seed'),
    ratio: z.number().optional(),
    kind: z.enum(['plain', 'audit']).optional().describe('Kind of table'),
    force: z.boolean().optional().describe('Replace an existing table'),
    tags: z.array(z.string()).optional(),
    columns: z.array(z.strictObject({ name: z.string() })).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
    password: z.string().default('default-secret').meta({ 'x-secret': true, description: 'Database password' })
  }),
  examples: [{ command: 'demo table add users --password s3cret-example', description: 'Add users' }],
  notes: ['Run demo table list afterwards.'],
  run: record
};

const applied: string[] = [];
const bumped: string[] = [];

/**
 * A change: its plan names the target, and apply records that it ran. A target named "blocked" cannot be planned, and
 * one named "keyed" needs --from-stdin to be applied where no terminal can ask.
 */
const deploy: ChangeCommand<z.ZodObject<{ target: z.ZodString; from_stdin: z.ZodOptional<z.ZodBoolean> }>, unknown, { plan: ConfirmPrompt; target: string; needs?: string[] }> = {
  name: 'deploy',
  summary: 'Deploy a target',
  effect: 'destructive',
  positionals: ['target'],
  input: z.object({ target: z.string().describe('What to deploy'), from_stdin: z.boolean().optional().describe('Read the key from stdin') }),
  plan: ({ target, from_stdin }, ctx) => {
    seen.push({ input: { target }, ctx });
    if (target === 'blocked') throw new CliError({ code: 'no-env', message: 'There is nothing to deploy here.', hint: 'Bind the directory first.' });
    return { plan: planOf(target), target, ...(target === 'keyed' && !from_stdin ? { needs: ['--from-stdin'] } : {}) };
  },
  apply: (_input, { target }) => {
    applied.push(target);
    return { data: { deployed: target } };
  }
};

const cli = createCli({
  name: 'demo',
  version: '1.2.3',
  description: 'Demo CLI.',
  globals: z.object({
    context: z.string().default('local').meta({ description: 'Backend to use', 'x-carry': true }),
    as: z.string().optional().meta({ description: 'Act as this agent', 'x-carry': true })
  }),
  notes: ['Pass --json for machine output.'],
  commands: [
    tableAdd,
    {
      name: 'table list',
      summary: 'List tables',
      effect: 'read',
      run: () => ({
        data: [
          { name: 'users', owner: { id: 1, name: 'ann' }, rows: 3 },
          { name: 'posts', owner: { id: 2, name: 'bob' }, rows: 5 }
        ]
      })
    },
    {
      name: 'status',
      summary: 'Show status',
      effect: 'read',
      run: (_input: Record<string, unknown>, ctx: CommandContext) => ({
        data: { ready: true, owner: { id: 1, name: 'ann' } },
        text: 'All good',
        next: [ctx.next(['table', 'list'], 'See the tables')],
        warnings: ['Low disk']
      })
    },
    {
      name: 'setup',
      summary: 'Set up',
      effect: 'read',
      input: z.object({
        kind: z.enum(['plain', 'audit']).describe('Pick a kind'),
        confirmed: z.boolean().describe('Continue?')
      }),
      run: record
    },
    {
      name: 'login',
      summary: 'Sign in',
      effect: 'read',
      input: z.object({
        email: z.string().describe('Email'),
        password: z.string().meta({ 'x-secret': true, description: 'Password' }),
        pin: z.number().int().optional().meta({ 'x-secret': true })
      }),
      run: (input, ctx) => {
        throw new CliError({
          code: 'signed-out',
          message: `Sign-in failed for ${input.email} with ${input.password}.`,
          next: [ctx.next(['login', '--email', String(input.email), '--password', String(input.password)], 'Sign in again')],
          details: { tried: input.password }
        });
      }
    },
    deploy,
    {
      name: 'bump',
      summary: 'Bump a counter at once',
      effect: 'write',
      immediate: true,
      input: z.object({ by: z.number().int().default(1).describe('How much') }),
      run: ({ by }) => {
        bumped.push(String(by));
        return { data: { bumped: by } };
      }
    },
    { name: 'boom', summary: 'Fail', effect: 'read', hidden: true, run: () => { throw new Error('kaput'); } },
    {
      name: 'deny',
      summary: 'Fail with a CliError',
      effect: 'read',
      hidden: true,
      run: () => {
        throw new CliError({ code: 'signed-out', message: 'You are signed out.', hint: 'Run demo login.', retryable: false, exitCode: ExitCode.signInRequired });
      }
    },
    { name: 'server', summary: 'Run the server', effect: 'write', passthrough: async (argv, ctx) => record(argv, ctx) },
    {
      name: 'quiet',
      summary: 'A passthrough that prints its own output',
      effect: 'read',
      hidden: true,
      passthrough: async (input) => (input.undefined ? undefined : { data: undefined })
    },
    {
      name: 'vault',
      summary: 'Store secrets',
      effect: 'write',
      hidden: true,
      positionals: ['label'],
      input: z.object({
        label: z.string(),
        pin: z.number().int().optional().meta({ 'x-secret': true }),
        tokens: z.array(z.string()).optional().meta({ 'x-secret': true }),
        keys: z.array(z.string().meta({ 'x-secret': true })).optional(),
        creds: z.strictObject({ secret: z.string().optional().meta({ 'x-secret': true }), user: z.string().optional() }).optional(),
        fail: z.boolean().optional()
      }),
      plan: (input: Record<string, unknown>, ctx: CommandContext) => {
        record(input, ctx);
        return { plan: planOf('the vault') };
      },
      apply: (input: Record<string, unknown>, _planned, ctx: CommandContext) => {
        if (input.fail) throw new Error(`vault failed: ${JSON.stringify(input)}`);
        return { data: { stored: true }, next: [ctx.next(['vault', String(input.label), '--creds', JSON.stringify(input.creds ?? {})], 'Store it again')] };
      }
    },
    {
      name: 'ask',
      summary: 'Prompt through ctx.prompter',
      effect: 'read',
      hidden: true,
      run: async (_input: Record<string, unknown>, ctx: CommandContext) => ({
        data: await ctx.prompter.prompt({}, [{ name: 'who', type: 'text', message: 'Who', required: true }])
      })
    },
    {
      name: 'reader',
      summary: 'Read a line from stdin and a variable from the environment',
      effect: 'read',
      hidden: true,
      run: async (_input: Record<string, unknown>, ctx: CommandContext) => {
        let text = '';
        for await (const chunk of ctx.stdin) text += chunk;
        return { data: { line: text.split('\n')[0], token: ctx.env.READER_TOKEN } };
      }
    },
    {
      name: 'pair',
      summary: 'Two positionals',
      effect: 'read',
      hidden: true,
      positionals: ['a', 'b'],
      input: z.object({ a: z.string().optional(), b: z.string().optional() }),
      run: record
    },
    {
      name: 'field',
      summary: 'Optional properties that hosts send as null',
      effect: 'read',
      hidden: true,
      positionals: ['name'],
      input: z.object({
        name: z.string(),
        is_required: z.boolean().optional(),
        label: z.string().default('Untitled'),
        default_value: z.union([z.string(), z.null()]).optional(),
        note: z.string().nullable().optional(),
        rules: z.array(z.strictObject({ kind: z.string(), limit: z.number().int().optional() })).optional()
      }),
      run: record
    },
    {
      name: 'policy',
      summary: 'JSON input with closed objects',
      effect: 'read',
      hidden: true,
      input: z.object({
        policies: z.array(z.strictObject({
          policy_type: z.enum(['AuthzEntityMembership', 'AuthzDirectOwner']),
          permissive: z.boolean().optional(),
          data: z.strictObject({ entity_field: z.string().optional(), membership_type: z.number().int().optional() }).optional()
        })).optional(),
        mode: z.enum(['alpha', 'beta']).optional().meta({ 'x-secret': true }),
        vault: z.strictObject({ tier: z.enum(['gold', 'silver']).optional() }).optional().meta({ 'x-secret': true })
      }),
      run: record
    },
    {
      name: 'serve',
      summary: 'Speak a protocol on stdout',
      effect: 'write',
      hidden: true,
      stdout: 'reserved',
      serve: async (_input: Record<string, unknown>, ctx: CommandContext) => {
        if (ctx.globals.context === 'nope') throw new CliError({ code: 'context-unknown', message: 'No context is named nope.', exitCode: ExitCode.usage });
        ctx.stdout.write('PROTOCOL\n');
        return { data: { closed: true }, next: [ctx.next(['status'], 'Check')], warnings: ['closed'] };
      }
    },
    {
      name: 'shape',
      summary: 'Every flag kind',
      effect: 'read',
      hidden: true,
      positionals: ['name', 'level', 'paths'],
      input: z.object({
        name: z.string().optional(),
        level: z.number().int().optional(),
        paths: z.array(z.string()).optional(),
        count: z.number().int().optional(),
        ratio: z.number().optional(),
        force: z.boolean().optional(),
        quiet: z.boolean().default(true),
        kind: z.enum(['plain', 'audit']).optional(),
        size: z.literal([1, 2, 3]).optional(),
        tags: z.array(z.string()).optional(),
        ports: z.array(z.number().int()).optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
        columns: z.array(z.record(z.string(), z.unknown())).optional(),
        anything: z.unknown().optional(),
        nullable: z.string().nullable().optional(),
        password: z.string().optional().meta({ 'x-secret': true }),
        creds: z.object({ secret: z.string().optional().meta({ 'x-secret': true }), user: z.string().optional() }).optional()
      }),
      run: record
    },
    {
      name: 'proto',
      summary: 'Keys that are also Object.prototype names',
      effect: 'read',
      hidden: true,
      input: z.object({
        constructor: z.string(),
        creds: z.strictObject({ toString: z.string(), user: z.string().optional() }).optional()
      }),
      run: record
    }
  ]
});

beforeEach(() => {
  applied.length = 0;
  bumped.length = 0;
});

describe('command resolution', () => {
  it.each([
    [['table', 'add', 'users'], 0, 'table add'],
    [['--json', 'table', 'add', 'users'], 0, 'table add'],
    [['--yes', 'table', 'add', 'users'], 0, 'table add'],
    [['table', 'list', '--format', 'json'], 0, 'table list']
  ])('%j runs the longest matching command', async (argv, code, command) => {
    const result = await exec(cli, argv);
    expect(result.code).toBe(code);
    expect(result.json().meta.command).toBe(command);
  });

  it.each([
    [['tabel', 'add', 'x'], 'demo --help', ['table add']],
    [['table', 'bogus'], 'demo table --help', []],
    [['stauts'], 'demo --help', ['status']]
  ])('%j is unknown-command, exit 2, with the closest names', async (argv, help, suggestions) => {
    const result = await exec(cli, argv);
    expect(result.code).toBe(ExitCode.usage);
    const { error, meta } = result.json();
    expect(error.code).toBe('unknown-command');
    expect(error.details.suggestions).toEqual(suggestions);
    expect(meta.next).toEqual([{ command: help, argv: help.split(' '), why: 'List the commands' }]);
  });

  it('prints the help of a group named alone', async () => {
    const result = await exec(cli, ['table']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('demo table <command> [flags]');
    expect(result.stdout).toContain('table add');
    expect(result.stdout).toContain('table list');
    expect(result.stdout).not.toContain('status');
  });
});

describe('flags and values', () => {
  it.each([
    [['--row-count', '5']],
    [['--row_count', '5']],
    [['--rowCount', '5']],
    [['--row-count=5']]
  ])('%j sets the property rowCount', async (flag) => {
    const result = await exec(cli, ['table', 'add', 't', ...flag]);
    expect(result.code).toBe(0);
    expect(lastInput().rowCount).toBe(5);
  });

  it.each(['--table-name', '--table_name', '--tableName'])('%s sets the property table_name', async (flag) => {
    const result = await exec(cli, ['table', 'add', flag, 'orders']);
    expect(result.code).toBe(0);
    expect(lastInput().table_name).toBe('orders');
  });

  it.each([
    [['--ratio', '0.5'], { ratio: 0.5 }],
    [['--ratio', '-2'], { ratio: -2 }],
    [['--kind', 'audit'], { kind: 'audit' }],
    [['--force'], { force: true }],
    [['--no-force'], { force: false }],
    [['--force=false'], { force: false }],
    [['--force', 'false'], { force: false }],
    [['--tags', 'a', '--tags', 'b'], { tags: ['a', 'b'] }],
    [['--tags', '["a","b"]'], { tags: ['a', 'b'] }],
    [['--columns', '[{"name":"id"}]'], { columns: [{ name: 'id' }] }],
    [['--columns', '@columns.json'], { columns: [{ name: 'id' }] }],
    [['--meta', '{"a":[1]}'], { meta: { a: [1] } }],
    [[], { rowCount: 0, password: 'default-secret' }]
  ])('%j is coerced by the schema', async (flags, expected) => {
    const result = await exec(cli, ['table', 'add', 't', ...flags]);
    expect(result.code).toBe(0);
    expect(lastInput()).toMatchObject({ table_name: 't', ...expected });
  });

  it('does not let a boolean flag swallow the positional after it', async () => {
    const result = await exec(cli, ['table', 'add', '--force', 'users']);
    expect(result.code).toBe(0);
    expect(lastInput()).toMatchObject({ table_name: 'users', force: true });
  });

  it.each([
    [['--row-count', '1.5'], '--row-count', 'integer'],
    [['--row-count', 'abc'], '--row-count', 'integer'],
    [['--ratio'], '--ratio', 'needs a value'],
    [['--kind', 'bogus'], '--kind', 'plain, audit'],
    [['--force=maybe'], '--force', 'true or false'],
    [['--columns', '[{}]'], '--columns', 'required key "name"'],
    [['--columns', '@missing.json'], '--columns', 'could not read'],
    [['--meta', 'not-json'], '--meta', 'not valid JSON'],
    [['--row-count', '1', '--row-count', '2'], '--row-count', 'given 2 times'],
    [['--row-count', '0x10'], '--row-count', 'decimal'],
    [['--row-count', '9007199254740993'], '--row-count', 'safe integer'],
    [['--ratio', '0x10'], '--ratio', 'decimal'],
    [['--ratio', '9007199254740993'], '--ratio', 'safe integer'],
    [['--table-name', 'u'], '--table-name', 'given twice']
  ])('%j is invalid-input, exit 2, naming the flag', async (flags, flag, text) => {
    const result = await exec(cli, ['table', 'add', 't', ...flags]);
    expect(result.code).toBe(ExitCode.usage);
    const { error } = result.json();
    expect(error.code).toBe('invalid-input');
    expect(error.details.flag).toBe(flag);
    expect(error.message).toContain(text);
  });

  it.each([
    [['table', 'add', 't', '--tabel-name', 'x'], ['--table-name']],
    [['table', 'add', 't', '--rowcount', '1'], ['--row-count']],
    [['table', 'add', 't', '--bogus'], []],
    [['table', 'add', 't', '-x'], []],
    [['table', 'add', 't', '--no-kind'], []],
    [['--bogus'], []]
  ])('%j is unknown-flag, exit 2, with the closest flags', async (argv, suggestions) => {
    const result = await exec(cli, argv);
    expect(result.code).toBe(ExitCode.usage);
    const { error } = result.json();
    expect(error.code).toBe('unknown-flag');
    expect(error.details.suggestions).toEqual(suggestions);
  });

  it('gives an extra positional unexpected-argument, exit 2', async () => {
    const result = await exec(cli, ['table', 'add', 't', 'extra']);
    expect(result.code).toBe(ExitCode.usage);
    expect(result.json().error.code).toBe('unexpected-argument');
  });

  it('gives every argument left to a last positional that is a list', async () => {
    const result = await exec(cli, ['shape', 'users', '3', 'a', 'b', 'c']);
    expect(result.code).toBe(0);
    expect(lastInput()).toMatchObject({ name: 'users', level: 3, paths: ['a', 'b', 'c'] });
  });
});

describe('--input', () => {
  it.each([
    [['--input', '{"table_name":"t","rowCount":2}'], undefined, { table_name: 't', rowCount: 2 }],
    [['--input', '{"tableName":"t"}'], undefined, { table_name: 't' }],
    [['--input', '@input.json'], undefined, { table_name: 'from-file', rowCount: 4 }],
    [['--input', '-'], '{"table_name":"piped","kind":"audit"}', { table_name: 'piped', kind: 'audit' }],
    [['--input', '{"table_name":"t","rowCount":2}', '--row-count', '9'], undefined, { table_name: 't', rowCount: 9 }],
    [['override', '--input', '{"table_name":"t"}'], undefined, { table_name: 'override' }]
  ])('%j supplies the whole input, and flags override it', async (flags, stdin, expected) => {
    const result = await exec(cli, ['table', 'add', ...flags], { stdin });
    expect(result.code).toBe(0);
    expect(lastInput()).toMatchObject(expected);
  });

  it.each([
    [['--input', '{"tabel_name":"t"}'], 'unknown key "tabel_name"'],
    [['--input', '[1]'], 'must be a JSON object'],
    [['--input', '{"table_name":"t","rowCount":"2"}'], 'at rowCount, expected number'],
    [['--input', '{"table_name":"t","rowCount":9007199254740993}'], 'at rowCount, '],
    [['--input', '{"table_name":'], 'not valid JSON']
  ])('%j is invalid-input', async (flags, text) => {
    const result = await exec(cli, ['table', 'add', ...flags]);
    expect(result.code).toBe(ExitCode.usage);
    const { error } = result.json();
    expect(error.code).toBe('invalid-input');
    expect(error.message).toContain(text);
  });
});

describe('missing input', () => {
  it.each([
    [{ tty: false }, [], 'stdin is not a terminal'],
    [{ tty: true, env: { CI: '1' } }, [], 'CI'],
    [{ tty: true }, ['--no-input'], '--no-input'],
    [{ tty: true }, ['--tty', 'false'], '--tty false'],
    [{ tty: true }, ['--no-tty'], '--tty false']
  ])('%j %j gives missing-input, exit 2, without waiting on stdin', async (options, flags, reason) => {
    const result = await exec(cli, ['login', '--json', ...flags], options);
    expect(result.code).toBe(ExitCode.usage);
    const { error, meta } = result.json();
    expect(error.code).toBe('missing-input');
    expect(error.details.missing).toEqual(['--email', '--password']);
    expect(error.cause).toContain(reason);
    expect(meta.next).toEqual([{ command: 'demo login --schema', argv: ['demo', 'login', '--schema'], why: 'See every input property' }]);
  });

  it('prompts with a text prompt when interactive', async () => {
    const result = await exec(cli, ['table', 'add', '--json'], { tty: true, answers: [['Name of the table', 'users\n']] });
    expect(result.code).toBe(0);
    expect(lastInput().table_name).toBe('users');
  });

  it('prompts with a list for an enum and a confirm for a boolean', async () => {
    const result = await exec(cli, ['setup', '--json'], {
      tty: true,
      answers: [['audit', '\u001b[B'], ['> audit', '\r'], ['Continue?', 'y\n']]
    });
    expect(result.code).toBe(0);
    expect(lastInput()).toEqual({ kind: 'audit', confirmed: true });
  });
});

describe('output', () => {
  it('prints one success envelope and nothing on stderr in JSON mode', async () => {
    const result = await exec(cli, ['status', '--json']);
    expect(result.code).toBe(0);
    expect(result.json()).toEqual({
      ok: true,
      data: { ready: true, owner: { id: 1, name: 'ann' } },
      meta: { command: 'status', next: [{ command: 'demo table list', argv: ['demo', 'table', 'list'], why: 'See the tables' }], warnings: ['Low disk'] }
    });
    expect(result.stderr).toBe('');
  });

  it('prints the text, a Next block on stdout and warnings on stderr in text mode', async () => {
    const result = await exec(cli, ['status'], { tty: true });
    expect(result.stdout).toBe('All good\nNext:\n  demo table list  # See the tables\n');
    expect(result.stderr).toBe('Warning: Low disk\n');
  });

  it('renders data with the default renderer when the command gives no text', async () => {
    const result = await exec(cli, ['table', 'list'], { tty: true });
    expect(result.stdout.trimEnd().split('\n').map((line) => line.split(/ {2,}/))).toEqual([
      ['name', 'owner', 'rows'],
      ['users', '{"id":1,"name":"ann"}', '3'],
      ['posts', '{"id":2,"name":"bob"}', '5']
    ]);
  });

  it.each([
    [['table', 'list', '--fields', 'name,owner.name'], [{ name: 'users', owner: { name: 'ann' } }, { name: 'posts', owner: { name: 'bob' } }]],
    [['status', '--fields', 'owner.id,ready'], { owner: { id: 1 }, ready: true }]
  ])('%j keeps only the given paths of data', async (argv, data) => {
    const result = await exec(cli, [...argv, '--json']);
    expect(result.json().data).toEqual(data);
  });

  it.each([
    [['status', '--fields', 'missing'], ['missing']],
    [['table', 'list', '--fields', 'name,nope'], ['nope']],
    [['status', '--fields', 'owner.nope,ready'], ['owner.nope']],
    [['status', '--fields', 'constructor'], ['constructor']]
  ])('%j is invalid-input when a path of a read matches nothing', async (argv, unmatched) => {
    const result = await exec(cli, [...argv, '--json']);
    expect(result.code).toBe(ExitCode.usage);
    const { error } = result.json();
    expect(error.code).toBe('invalid-input');
    expect(error.details.unmatched).toEqual(unmatched);
  });

  it('warns, and keeps the exit code, when a path matches nothing after a change', async () => {
    const result = await exec(cli, ['vault', 'l', '--fields', 'stored,nope', '--yes', '--json']);
    expect(result.code).toBe(0);
    const { ok, data, meta } = result.json();
    expect({ ok, data }).toEqual({ ok: true, data: { stored: true } });
    expect(meta.warnings).toEqual([expect.stringContaining('--fields "nope" matched nothing in the data of "vault"')]);
  });

  it.each([
    [['deny'], ExitCode.signInRequired, { code: 'signed-out', message: 'You are signed out.', hint: 'Run demo login.', retryable: false }],
    [['boom'], ExitCode.failure, { code: 'failed', message: 'kaput', hint: 'Rerun with DEBUG=1 to see the stack trace.' }]
  ])('%j prints one error envelope with exit %i', async (argv, code, error) => {
    const result = await exec(cli, [...argv, '--json']);
    expect(result.code).toBe(code);
    expect(result.json()).toEqual({ ok: false, error, meta: { command: argv[0] } });
    expect(result.stderr).toBe('');
  });

  it('includes the stack of an unexpected error only with DEBUG', async () => {
    const result = await exec(cli, ['boom', '--json'], { env: { DEBUG: '1' } });
    expect(result.json().error.details.stack).toContain('kaput');
  });

  it('prints an error on stderr in text mode', async () => {
    const result = await exec(cli, ['deny'], { tty: true });
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Error (signed-out): You are signed out.\nHint: Run demo login.\n');
  });

  it('passes the context flags to the command', async () => {
    await exec(cli, ['table', 'add', 't', '--dry-run', '--yes', '--cwd', 'sub', '--context', 'prod', '--json']);
    const { ctx } = seen[seen.length - 1];
    expect(ctx).toMatchObject({ cliName: 'demo', yes: true, cwd: resolve(dir, 'sub'), format: 'json', interactive: false, globals: { context: 'prod' } });
  });
});

describe('secrets', () => {
  it.each([
    [['--email', 'a@b.c', '--password', 'hunter2-flag']],
    [['--input', '{"email":"a@b.c","password":"hunter2-json"}']]
  ])('%j never echoes an x-secret value in an error or a next command', async (flags) => {
    const result = await exec(cli, ['login', ...flags, '--json']);
    expect(result.stdout).not.toContain('hunter2');
    const { error, meta } = result.json();
    expect(error.message).toBe('Sign-in failed for a@b.c with ***.');
    expect(meta.next).toEqual([{
      command: 'demo login --email a@b.c --password ***',
      argv: ['demo', 'login', '--email', 'a@b.c', '--password', '***'],
      why: 'Sign in again'
    }]);
    expect(error.details).toEqual({ tried: '***' });
  });

  it('does not quote a secret value that fails coercion', async () => {
    const result = await exec(cli, ['login', '--email', 'a', '--password', 'p', '--pin', 'hunter2-pin', '--json']);
    expect(result.json().error.code).toBe('invalid-input');
    expect(result.stdout).not.toContain('hunter2');
  });
});

describe('help, --schema and --llms', () => {
  it.each([[['--help']], [['-h']], [[]]])('%j prints the root help with the agent block', async (argv) => {
    const result = await exec(cli, argv);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Usage:\n  demo <command> [flags]');
    expect(result.stdout).toContain('Agents:\n  - Pass --json for machine output.');
    expect(result.stdout).toContain('--context <string>');
    expect(result.stdout).toContain('--no-input');
    expect(result.stdout).not.toContain('boom');
  });

  it('prints the command help with usage, flags, examples and notes', async () => {
    const result = await exec(cli, ['table', 'add', '--help']);
    expect(result.code).toBe(0);
    const help = result.stdout;
    expect(help).toContain('demo table add: Add a table\nEffect: read');
    expect(help).toContain('demo table add <table-name> [flags]');
    expect(help).toMatch(/--table-name <string> +Name of the table \(required, or argument 1\)/);
    expect(help).toMatch(/--row-count <integer> +Rows to seed \(default: 0\)/);
    expect(help).toMatch(/--kind <plain\|audit> +Kind of table/);
    expect(help).toMatch(/--tags <string>\.\.\. +\(repeatable\)/);
    expect(help).toContain('demo table add users --password <secret>\n      Add users');
    expect(help).toContain('Notes:\n  - Run demo table list afterwards.');
    expect(help).not.toContain('default-secret');
    expect(help).not.toContain('s3cret-example');
  });

  it('prints the command schema, made from zod, without secret defaults', async () => {
    const result = await exec(cli, ['table', 'add', '--schema']);
    const schema = result.json();
    expect(Object.keys(schema)).toEqual(['name', 'summary', 'effect', 'positionals', 'input']);
    expect(schema).toMatchObject({ name: 'table add', effect: 'read', positionals: ['table_name'] });
    expect(schema.input.properties.rowCount.default).toBe(0);
    expect(schema.input.properties.password).toEqual({ type: 'string', 'x-secret': true, description: 'Database password' });
    const expected = z.toJSONSchema(tableAdd.input, { io: 'input' }) as Record<string, unknown>;
    delete expected.$schema;
    expect({ ...schema.input, properties: { ...schema.input.properties, password: undefined } }).toEqual({
      ...expected,
      properties: { ...(expected.properties as object), password: undefined }
    });
  });

  it('prints a Markdown index with --llms', async () => {
    const result = await exec(cli, ['--llms']);
    expect(result.stdout).toContain('# demo\n');
    expect(result.stdout).toContain('- `demo table add <table-name>` (read): Add a table\n');
    expect(result.stdout).toContain('- `demo deploy <target>` (destructive): Deploy a target\n');
    expect(result.stdout).toContain('## Notes\n\n- Pass --json for machine output.\n');
    expect(result.stdout).not.toContain('boom');
  });

  it('prints the full manifest with --llms --json', async () => {
    const manifest = (await exec(cli, ['--llms', '--json'])).json();
    expect(manifest).toEqual(JSON.parse(JSON.stringify(cli.manifest())));
    expect(manifest.commands.map((command: { name: string }) => command.name)).toEqual(['table add', 'table list', 'status', 'setup', 'login', 'deploy', 'bump', 'server', 'help']);
    const add = manifest.commands[0];
    expect(Object.keys(add)).toEqual(['name', 'summary', 'effect', 'positionals', 'input', 'examples', 'notes']);
    expect(add.examples).toEqual([{ command: 'demo table add users --password <secret>', description: 'Add users' }]);
    expect(add.input.properties.password.default).toBeUndefined();
    expect(manifest.commands[6]).toMatchObject({ name: 'bump', effect: 'write', immediate: true });
    expect(manifest.commands[7]).toMatchObject({ name: 'server', effect: 'write', passthrough: true });
    expect(Object.keys(manifest.globals.properties)).toEqual(expect.arrayContaining(['context', 'json', 'input', 'no_input']));
  });
});

describe('help topics and the help command', () => {
  const topics: HelpTopic[] = [
    { name: 'output', summary: 'What a command prints', body: 'Without a terminal, a command prints one JSON envelope.\n\n- `--json` asks for it on a terminal too.' },
    { name: 'exit-codes', summary: 'What each exit code means', body: '- `0`: Done.\n- `2`: Bad input.', section: 'EXIT STATUS' },
    { name: 'environment', summary: 'The variables the CLI reads', body: '- `DEMO_HOME`: where it keeps its files.', section: 'ENVIRONMENT' },
    { name: 'files', summary: 'The files the CLI writes', body: '- `~/.demo/`: the store.', section: 'FILES' }
  ];
  const guide = createCli({
    name: 'demo',
    version: '1.2.3',
    description: 'Demo CLI.',
    notes: ['Pass --json for machine output.'],
    topics,
    commands: [tableAdd, { name: 'table list', summary: 'List tables', effect: 'read', run: () => ({ data: [] }) }, deploy]
  });

  it.each([
    [['help'], ['--help'], { kind: 'cli', name: 'demo' }],
    [['help', 'table', 'add'], ['table', 'add', '--help'], { kind: 'command', name: 'table add' }],
    [['help', 'table'], ['table', '--help'], { kind: 'group', name: 'table' }]
  ])('%j prints the page that %j prints', async (argv, same, page) => {
    const expected = (await exec(guide, same)).stdout;
    const text = await exec(guide, argv, { tty: true });
    expect(text.code).toBe(0);
    expect(text.stdout).toBe(expected);
    expect((await exec(guide, argv)).json().data).toEqual({ ...page, text: expected });
  });

  it('prints a topic: its summary, then its body', async () => {
    const result = await exec(guide, ['help', 'output'], { tty: true });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('What a command prints\n\nWithout a terminal, a command prints one JSON envelope.\n\n- `--json` asks for it on a terminal too.\n');
    expect((await exec(guide, ['help', 'output'])).json().data).toEqual({ kind: 'topic', name: 'output', text: result.stdout });
  });

  it.each([
    [['help', 'outptu'], ['output']],
    [['help', 'tabel', 'ad'], ['table add']],
    [['help', 'tabel'], ['table']],
    [['help', 'nothing', 'like', 'it'], []]
  ])('%j is unknown-topic, exit 2, with the nearest command or topic', async (argv, suggestions) => {
    const result = await exec(guide, argv);
    expect(result.code).toBe(ExitCode.usage);
    const { error, meta } = result.json();
    expect(error.code).toBe('unknown-topic');
    expect(error.details.suggestions).toEqual(suggestions);
    expect(meta.next).toEqual([{ command: 'demo help', argv: ['demo', 'help'], why: 'List the commands and the help topics' }]);
  });

  it('lists the topics in the root help, in --llms and in the manifest, and help takes words', async () => {
    const root = (await exec(guide, ['--help'])).stdout;
    expect(root).toMatch(/Help topics:\n {2}output +What a command prints\n/);
    expect(root).toContain('Run "demo help <topic>" to read one.');
    expect(root).toMatch(/\n {2}help +Show the help of the CLI, a command, a group or a help topic \(read\)\n/);
    expect((await exec(guide, ['help', '--help'])).stdout).toContain('demo help [name...] [flags]');
    const llms = (await exec(guide, ['--llms'])).stdout;
    expect(llms).toContain('## Help topics\n\n');
    expect(llms).toContain('- `demo help output`: What a command prints\n');
    expect(guide.manifest().topics).toEqual(topics);
  });

  it('renders the manifest as one Markdown reference, with every command and every topic', () => {
    const reference = renderReference(guide.manifest());
    expect(reference.startsWith('# demo(1) -- Demo CLI.\n')).toBe(true);
    expect(reference.match(/^## .+$/gm)).toEqual([
      '## SYNOPSIS',
      '## DESCRIPTION',
      '## GLOBAL FLAGS',
      '## COMMANDS',
      '## OUTPUT',
      '## EXIT STATUS',
      '## ENVIRONMENT',
      '## FILES',
      '## SEE ALSO'
    ]);
    expect(reference.match(/^### .+$/gm)).toEqual(['### table add', '### table list', '### deploy', '### help']);
    for (const topic of topics) expect(reference).toContain(topic.body);
    expect(reference).toContain('`demo table add <table-name> [flags]`');
    expect(reference).toMatch(/- `--table-name <string>`: Name of the table \(required, or argument 1\)\n/);
    expect(reference).toContain('- `-y, --yes`: Approve the plan of a change without a prompt\n');
    expect(reference).toContain('demo table add users --password <secret>');
    expect(reference).toContain('- Pass --json for machine output.\n');
    expect(reference).not.toContain('default-secret');
    expect(reference).not.toContain('s3cret-example');
  });

  it.each([
    [{ topics: [{ name: 'table', summary: 's', body: 'b' }] }, 'the name of a command or a group'],
    [{ topics: [{ name: 'deploy', summary: 's', body: 'b' }] }, 'the name of a command or a group'],
    [{ topics: [{ name: 'Exit Codes', summary: 's', body: 'b' }] }, 'invalid name'],
    [{ topics: [{ name: 'a', summary: 's', body: 'b' }, { name: 'a', summary: 's', body: 'b' }] }, 'defined twice'],
    [{ topics: [{ name: 'a', summary: 's', body: 'Intro.\n\n## Part' }] }, 'no headings'],
    [{ commands: [{ name: 'help', summary: 'h', effect: 'read', run: () => ({ data: null }) } as CommandDefinition] }, 'built into the command layer']
  ])('refuses the definition %#', (overrides, text) => {
    expect(() => createCli({ name: 'bad', version: '0.0.0', commands: [tableAdd, deploy], ...overrides })).toThrow(text);
  });
});

describe('ctx.invocation', () => {
  it.each([
    [['table', 'add', 'users', '--row-count', '5', '--json'], 'demo table add users --row-count 5 --json'],
    [['--json', 'table', 'add', 'users'], 'demo --json table add users'],
    [['table', 'add', "it's here", '--meta', '{"a": 1}', '--tags', '', '--json'], `demo table add 'it'\\''s here' --meta '{"a": 1}' --tags '' --json`],
    [['table', 'add', 't', '--password', 'hunter2', '--json'], "demo table add t --password '***' --json"],
    [['table', 'add', 't', '--password=hunter2', '--json'], "demo table add t '--password=***' --json"],
    [['table', 'add', '--input', '{"table_name":"t","password":"hunter2"}', '--json'], `demo table add --input '{"table_name":"t","password":"***"}' --json`],
    [['table', 'add', '--input', '{ "table_name": "t" }', '--json'], `demo table add --input '{ "table_name": "t" }' --json`],
    [['server', 'extra', '--port', '5555'], 'demo server extra --port 5555']
  ])('%j is %s', async (argv, invocation) => {
    const result = await exec(cli, argv);
    expect(result.code).toBe(0);
    expect(seen[seen.length - 1].ctx.invocation).toBe(invocation);
  });
});

describe('passthrough commands', () => {
  it('get every token after the command path, parsed by parseArgv', async () => {
    const result = await exec(cli, ['server', 'extra', '--port', '5555', '--help', '-x', '--json']);
    expect(result.code).toBe(0);
    expect(lastInput()).toEqual({ _: ['extra'], port: 5555, help: true, x: true, json: true });
    expect(result.json().ok).toBe(true);
  });

  it.each([
    [['server', '--format', 'yaml'], { _: [], format: 'yaml' }],
    [['server', '--cwd'], { _: [], cwd: true }],
    [['server', '--context', 'a', '--context', 'b'], { _: [], context: ['a', 'b'] }],
    [['server', '--dry-run'], { _: [], 'dry-run': true }]
  ])('%j is not validated by the layer, and has no plan', async (argv, input) => {
    const result = await exec(cli, argv);
    expect(result.code).toBe(0);
    expect(lastInput()).toEqual(input);
  });

  it.each([[['quiet', '--json']], [['quiet', '--undefined', '--json']]])('%j prints nothing when the command returns nothing', async (argv) => {
    const result = await exec(cli, argv);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
  });
});

describe('secrets come from the schema', () => {
  it.each([
    [['vault', 'l', '--creds', '{"secret":"NESTED-SECRET-9","user":"u"}'], `demo vault l --creds '{"secret":"***","user":"u"}'`],
    [['vault', 'l', '--keys', '["KEY-AAAA-1111","KEY-BBBB-2222"]'], `demo vault l --keys '["***","***"]'`],
    [
      ['vault', '--input', '{"label":"l","tokens":["TOKEN-ONE-111"],"pin":4242,"creds":{"secret":"NESTED-SECRET-9"}}'],
      `demo vault --input '{"label":"l","tokens":"***","pin":"***","creds":{"secret":"***"}}'`
    ]
  ])('%j replaces nested, numeric and list secrets in ctx.invocation', async (argv, invocation) => {
    const result = await exec(cli, [...argv, '--yes', '--json']);
    expect(result.code).toBe(0);
    expect(seen[seen.length - 1].ctx.invocation).toBe(`${invocation} --yes --json`);
  });

  it('keeps nested and list secrets out of an error, a plan stop and a next command', async () => {
    const failed = await exec(cli, ['vault', 'l', '--creds', '{"secret":"NESTED-SECRET-9"}', '--tokens', 'TOKEN-ONE-111', '--fail', '--yes', '--json']);
    expect(failed.json().error.code).toBe('failed');
    expect(failed.stdout).not.toMatch(/NESTED-SECRET-9|TOKEN-ONE-111/);
    const stopped = await exec(cli, ['vault', 'l', '--creds', '{"secret":"NESTED-SECRET-9"}', '--json']);
    expect(stopped.code).toBe(ExitCode.approvalRequired);
    expect(stopped.json().meta.next[0].argv).toEqual(['demo', 'vault', 'l', '--creds', '<creds>', '--json', '--yes']);
    expect(stopped.stdout).not.toContain('NESTED-SECRET-9');
    const ok = await exec(cli, ['vault', 'l', '--creds', '{"secret":"NESTED-SECRET-9","user":"u"}', '--yes', '--json']);
    expect(ok.json().meta.next).toEqual([{
      command: `demo vault l --creds '{"secret":"***","user":"u"}'`,
      argv: ['demo', 'vault', 'l', '--creds', '{"secret":"***","user":"u"}'],
      why: 'Store it again'
    }]);
  });

  it('never uses a short secret as a search pattern, so other text stays intact', async () => {
    const result = await exec(cli, ['login', '--email', 'a@b.c', '--password', 'e', '--json']);
    expect(result.json().error.message).toBe('Sign-in failed for a@b.c with e.');
    expect(result.json().meta.next[0].argv).toEqual(['demo', 'login', '--email', 'a@b.c', '--password', 'e']);
  });

  const leaky = createCli({
    name: 'x',
    version: '1',
    commands: [{
      name: 'go',
      summary: 'Go',
      effect: 'read',
      input: z.object({ password: z.string().optional().meta({ 'x-secret': true }) }),
      run: ({ password }, ctx) => {
        throw new CliError({ code: 'denied', message: `denied ${JSON.stringify({ password })}`, next: [ctx.next(['go', '--password', String(password)], 'Retry')] });
      }
    }]
  });

  it.each(['p"a\\ss\nx-long-secret', "it's a long secret"])('redacts the raw, JSON-escaped and shell-quoted forms of %j', async (password) => {
    const result = await exec(leaky, ['go', '--input', '-', '--json'], { stdin: JSON.stringify({ password }) });
    const { error, meta } = result.json();
    expect(error.message).toBe('denied {"password":"***"}');
    expect(meta.next).toEqual([{ command: 'x go --password ***', argv: ['x', 'go', '--password', '***'], why: 'Retry' }]);
  });

  it('takes a value that starts with -- after a secret flag and never echoes it', async () => {
    const result = await exec(cli, ['login', '--email', 'a@b.c', '--password', '--hunter2-long', '--json']);
    expect(result.json().error.code).toBe('signed-out');
    expect(result.stdout).not.toContain('hunter2');
  });
});

describe('a CliError from a second copy of the package', () => {
  it('keeps its code, exit code and next', async () => {
    let Other: typeof CliError;
    jest.isolateModules(() => {
      Other = require('../src/types').CliError;
    });
    expect(Other).not.toBe(CliError);
    const copy = createCli({
      name: 'x',
      version: '1',
      commands: [{
        name: 'go',
        summary: 'Go',
        effect: 'read',
        run: () => {
          throw new Other({
            code: 'approval-required',
            message: 'needs approval',
            exitCode: ExitCode.approvalRequired,
            next: [{ command: 'x go --yes', argv: ['x', 'go', '--yes'], why: 'Approve' }]
          });
        }
      }]
    });
    const result = await exec(copy, ['go', '--json']);
    expect(result.code).toBe(ExitCode.approvalRequired);
    expect(result.json()).toEqual({ ok: false, error: { code: 'approval-required', message: 'needs approval' }, meta: { command: 'go', next: [{ command: 'x go --yes', argv: ['x', 'go', '--yes'], why: 'Approve' }] } });
  });
});

describe('schemas without one plain type', () => {
  const loose = () => createCli({
    name: 'x',
    version: '1',
    commands: [{
      name: 'loose',
      summary: 'Loose',
      effect: 'read',
      input: z.object({
        default_value: z.union([z.string(), z.null()]).optional().describe('A default'),
        level: z.union([z.null(), z.number().int()]).optional(),
        mode: z.enum(['a', 'b']).nullable().optional(),
        anything: z.unknown().optional(),
        either: z.union([z.string(), z.number()]).optional()
      }),
      run: record
    }]
  });

  it('do not stop the CLI at start-up', () => {
    expect(loose).not.toThrow();
  });

  it.each([
    [['--default-value', 'abc'], { default_value: 'abc' }],
    [['--level', '3'], { level: 3 }],
    [['--mode', 'b'], { mode: 'b' }],
    [['--anything', '{"a":[1]}'], { anything: { a: [1] } }],
    [['--anything', '@columns.json'], { anything: [{ name: 'id' }] }],
    [['--either', '5'], { either: 5 }],
    [['--either', '"five"'], { either: 'five' }]
  ])('%j reads a nullable scalar as the scalar and any other schema as JSON', async (flags, expected) => {
    const result = await exec(loose(), ['loose', ...flags, '--json']);
    expect(result.code).toBe(0);
    expect(lastInput()).toEqual(expected);
  });
});

describe('layer prompts', () => {
  it.each([
    ['a text prompt', ['table', 'add', '--json'], { tty: true, answers: [['Name of the table', 'users\n']] }, 0],
    ['a list and a confirm', ['setup', '--json'], { tty: true, answers: [['audit', '\u001b[B'], ['> audit', '\r'], ['Continue?', 'y\n']] }, 0],
    ['the approval of a change', ['deploy', 'web', '--json'], { tty: true, answers: [['Apply this change?', 'y\n']] }, 0],
    ['ctx.prompter without a terminal', ['ask', '--json'], {}, ExitCode.failure]
  ] as Array<[string, string[], RunOptions, number]>)('never reset the terminal: %s', async (_name, argv, options, code) => {
    const result = await exec(cli, argv, options);
    expect(result.code).toBe(code);
    expect(result.stderr).not.toContain('\x1bc');
  });
});

describe('ctx.stdin and ctx.env', () => {
  it('come from the io given to run()', async () => {
    const result = await exec(cli, ['reader', '--json'], { stdin: 'from-stdin\nrest', env: { READER_TOKEN: 'from-env' } });
    expect(result.code).toBe(0);
    expect(result.json().data).toEqual({ line: 'from-stdin', token: 'from-env' });
  });
});

describe('ctx.next', () => {
  const contextOf = async () => {
    expect((await exec(cli, ['pair', 'one'])).code).toBe(0);
    return seen[seen.length - 1].ctx;
  };

  it('gives the exact words as argv and the same line quoted for POSIX shells', async () => {
    const ctx = await contextOf();
    const words = ['api', 'describe', 'Database', '--endpoint', 'https://api.example.com/graphql', 'a=b', 'x@y.z', '-1'];
    expect(ctx.next(words, 'Describe it')).toEqual({
      command: 'demo api describe Database --endpoint https://api.example.com/graphql a=b x@y.z -1',
      argv: ['demo', ...words],
      why: 'Describe it'
    });
  });

  it.each([
    ['a b', "'a b'"],
    ["it's", `'it'\\''s'`],
    ['"q"', `'"q"'`],
    ['a;b', "'a;b'"],
    ['$HOME', "'$HOME'"],
    ['`id`', "'`id`'"],
    ['a\nb', "'a\nb'"],
    ['', "''"],
    ['a|b&c', "'a|b&c'"],
    ['*', "'*'"],
    ['~', "'~'"],
    ['#c', "'#c'"],
    ['a\\b', "'a\\b'"],
    ['{a,b}', "'{a,b}'"],
    ['é', "'é'"],
    ['=name', "'=name'"],
    ['<name>', "'<name>'"]
  ])('quotes %j as one shell word and keeps it as is in argv', async (word, quoted) => {
    const ctx = await contextOf();
    const step = ctx.next(['api', 'describe', word], 'Describe it');
    expect(step.command).toBe(`demo api describe ${quoted}`);
    expect(step.argv).toEqual(['demo', 'api', 'describe', word]);
    expect(step.placeholders).toBeUndefined();
  });

  it('gives back the same words when a POSIX shell reads the line', async () => {
    const ctx = await contextOf();
    const words = ['Database', 'a b', "it's", '"q"', 'a;b', '$HOME', '`echo pwned`', '$(echo pwned)', 'a\nb', '', 'x|y', '*', '~', '#c', 'a\\b', '!', '{a,b}', 'é ✓', '-x', 'a=b', '=x'];
    const { command } = ctx.next(words, 'Run it');
    const output = execFileSync('/bin/sh', ['-c', `printf '%s\\0' ${command.slice('demo '.length)}`]).toString('utf8');
    expect(output.split('\0').slice(0, -1)).toEqual(words);
  });

  it('names each placeholder a caller must replace', async () => {
    const ctx = await contextOf();
    expect(ctx.next(['context', 'add', { placeholder: 'url' }, '--name', { placeholder: 'name' }], 'Add a context')).toEqual({
      command: 'demo context add <url> --name <name>',
      argv: ['demo', 'context', 'add', '<url>', '--name', '<name>'],
      placeholders: ['<url>', '<name>'],
      why: 'Add a context'
    });
  });
});

describe('ctx.nextFor', () => {
  const contextOf = async () => {
    expect((await exec(cli, ['pair', 'one'])).code).toBe(0);
    return seen[seen.length - 1].ctx;
  };
  const hostile = ['a b', "it's", '"q"', 'a;b', '$HOME', '`echo pwned`', '$(echo pwned)', 'a\nb', '', 'x|y', '*', '~', '#c', 'a\\b', '!', '{a,b}', 'é ✓', '=x', '<name>'];
  const inputs: Record<string, unknown>[] = [
    { name: 'users' },
    { name: 'users', level: 3, paths: ['a', 'b c'], count: 5, ratio: -0.5, force: true, quiet: false, kind: 'audit', size: 2 },
    { name: 'u', level: -2, paths: [], tags: ['x', '--y', '[z', '-w'], ports: [80, -1], meta: { a: [1], b: null }, columns: [{ n: 1 }], anything: 'free text' },
    { name: '-dash', level: 1, paths: ['p'] },
    { name: '--double', force: false, quiet: true },
    { paths: ['only-a-later-positional'], ratio: 1e21, tags: [] },
    { nullable: null, anything: null, meta: {} },
    { nullable: 'set', anything: [1, 'two', { three: 3 }] },
    { name: hostile[0], tags: hostile, paths: hostile, anything: hostile },
    ...hostile.map((word) => ({ name: word, kind: 'plain' }))
  ];

  it.each(inputs.map((input, index) => [index, input] as const))(
    'input %i parses back from its next step, beside the carried flags, and a POSIX shell reads the line as its argv',
    async (_index, input) => {
      expect((await exec(cli, ['--as', 'bot', '--context', 'staging', 'pair', 'one', '--cwd', 'sub'])).code).toBe(0);
      const step = seen[seen.length - 1].ctx.nextFor('shape', input, 'Shape it', { drop: ['--as'] });
      expect(step.argv.slice(0, 6)).toEqual(['demo', '--context', 'staging', '--cwd', 'sub', 'shape']);
      expect(step.placeholders).toBeUndefined();
      const result = await exec(cli, [...step.argv.slice(1), '--json']);
      expect(result.code).toBe(0);
      expect(lastInput()).toEqual({ quiet: true, ...input });
      expect(seen[seen.length - 1].ctx).toMatchObject({ globals: { context: 'staging' }, cwd: resolve(dir, 'sub') });
      expect(seen[seen.length - 1].ctx.globals.as).toBeUndefined();
      const words = execFileSync('/bin/sh', ['-c', `printf '%s\\0' ${step.command.slice('demo '.length)}`]).toString('utf8');
      expect(words.split('\0').slice(0, -1)).toEqual(step.argv.slice(1));
    }
  );

  it('renders positionals as bare words in order, then flags in the spelling the parser reads', async () => {
    const ctx = await contextOf();
    expect(ctx.nextFor('shape', { kind: 'audit', name: 'users', level: 3, force: false, tags: ['a', 'b'] }, 'Shape it')).toEqual({
      command: 'demo shape users 3 --kind audit --no-force --tags a --tags b',
      argv: ['demo', 'shape', 'users', '3', '--kind', 'audit', '--no-force', '--tags', 'a', '--tags', 'b'],
      why: 'Shape it'
    });
  });

  it('turns a placeholder value and every secret into a placeholder word', async () => {
    const ctx = await contextOf();
    const step = ctx.nextFor('shape', { name: { placeholder: 'name' }, password: 'hunter2-long', creds: { secret: 'NESTED-SECRET-9', user: 'u' } }, 'Shape it');
    expect(step).toEqual({
      command: 'demo shape <name> --password <password> --creds <creds>',
      argv: ['demo', 'shape', '<name>', '--password', '<password>', '--creds', '<creds>'],
      placeholders: ['<name>', '<password>', '<creds>'],
      why: 'Shape it'
    });
  });

  it.each([
    ['no such', {}, 'not a command'],
    ['shape', { nope: 1 }, '"nope"'],
    ['shape', { constructor: 'x' }, '"constructor"'],
    ['shape', { count: 'five' }, '--count']
  ])('refuses %j with %j', async (command, input, text) => {
    const ctx = await contextOf();
    expect(() => ctx.nextFor(command, input, 'Shape it')).toThrow(text);
  });
});

describe('flags that choose the target of a run', () => {
  const perRun = ['--json', '--format', 'json', '--yes', '--dry-run', '--fields', 'a', '--input', '{}', '--no-input'];

  it.each([
    [['--context', 'staging', 'pair', 'one', '--cwd', 'sub', ...perRun], ['--context', 'staging', '--cwd', 'sub']],
    [['pair', 'one', '--context=staging', ...perRun], ['--context=staging']],
    [['pair', 'one', ...perRun], []]
  ])('%j gives next and nextFor steps that start with %j', async (argv, carried) => {
    expect((await exec(cli, argv)).code).toBe(0);
    const { ctx } = seen[seen.length - 1];
    expect(ctx.next(['table', 'list'], 'List them').argv).toEqual(['demo', ...carried, 'table', 'list']);
    expect(ctx.nextFor('table add', { table_name: 'users' }, 'Add it')).toMatchObject({
      command: ['demo', ...carried, 'table', 'add', 'users'].join(' '),
      argv: ['demo', ...carried, 'table', 'add', 'users']
    });
    expect(ctx.followUp([], { why: 'Again' }).argv).toEqual(['demo', ...argv]);
  });
});

describe('null for an optional property', () => {
  it.each([
    ['a top-level optional null is absent', ['--input', '{"name":"n","is_required":null}'], { name: 'n', label: 'Untitled' }],
    ['a top-level null in another spelling is absent', ['--input', '{"name":"n","isRequired":null}'], { name: 'n', label: 'Untitled' }],
    ['a null inside a list item is absent', ['--input', '{"name":"n","rules":[{"kind":"a","limit":null}]}'], { name: 'n', label: 'Untitled', rules: [{ kind: 'a' }] }],
    ['a null inside a JSON flag is absent', ['n', '--rules', '[{"kind":"a","limit":null}]'], { name: 'n', label: 'Untitled', rules: [{ kind: 'a' }] }],
    ['a property that takes null keeps it', ['--input', '{"name":"n","default_value":null,"note":null}'], { name: 'n', label: 'Untitled', default_value: null, note: null }],
    ['a null for a property with a default gets the default', ['--input', '{"name":"n","label":null}'], { name: 'n', label: 'Untitled' }]
  ])('%s', async (_case, argv, input) => {
    const result = await exec(cli, ['field', ...argv, '--json']);
    expect(result.code).toBe(0);
    expect(lastInput()).toEqual(input);
  });

  it.each([
    ['a required property', '{"name":null}', 'at name, expected string'],
    ['a required key in a list item', '{"name":"n","rules":[{"kind":null}]}', 'at rules[0].kind, expected string']
  ])('%s still refuses null', async (_case, json, message) => {
    const result = await exec(cli, ['field', '--input', json, '--json']);
    expect(result.code).toBe(ExitCode.usage);
    expect(result.json().error.message).toContain(message);
  });

  it('reads the same way in ctx.nextFor', async () => {
    expect((await exec(cli, ['pair', 'one'])).code).toBe(0);
    const step = seen[seen.length - 1].ctx.nextFor('field', { name: 'n', is_required: null, rules: [{ kind: 'a', limit: null }], note: null }, 'Add it');
    expect(step.argv).toEqual(['demo', 'field', 'n', '--rules', '[{"kind":"a"}]', '--input', '{"note":null}']);
  });
});

describe('a key or a value the schema does not allow', () => {
  const schemaStep = { command: 'demo policy --schema', argv: ['demo', 'policy', '--schema'], why: 'See the input schema' };

  it.each([
    ['at the top level of --input', ['--input', '{"policies":[],"polices":[]}'], 'unknown key "polices"', 'Did you mean "policies"?'],
    ['nested in a list', ['--policies', '[{"policy_type":"AuthzEntityMembership","permisive":false}]'], 'at [0], the key "permisive" is not allowed',
      'Did you mean "permissive"? The keys allowed at [0] are policy_type, permissive, data.'],
    ['nested in an object', ['--policies', '[{"policy_type":"AuthzDirectOwner","data":{"entity_feild":"owner_id"}}]'], 'at [0].data, the key "entity_feild" is not allowed',
      'Did you mean "entity_field"? The keys allowed at [0].data are entity_field, membership_type.'],
    ['an enum value in JSON', ['--policies', '[{"policy_type":"AuthzEntityMembrship"}]'], 'at [0].policy_type, expected one of', 'Did you mean "AuthzEntityMembership"?'],
    ['a key with nothing close', ['--policies', '[{"policy_type":"AuthzDirectOwner","foo":1}]'], 'the key "foo" is not allowed', 'The keys allowed at [0] are policy_type, permissive, data.']
  ])('%s names the nearest allowed one and gives the --schema step', async (_case, flags, message, hint) => {
    const result = await exec(cli, ['policy', ...flags, '--json']);
    expect(result.code).toBe(ExitCode.usage);
    const { error, meta } = result.json();
    expect(error.code).toBe('invalid-input');
    expect(error.message).toContain(message);
    expect(error.hint).toBe(hint);
    expect(meta.next).toEqual([schemaStep]);
  });

  it('names the nearest enum value of a flag', async () => {
    const result = await exec(cli, ['table', 'add', 't', '--kind', 'audt', '--json']);
    expect(result.json().error.hint).toBe('Did you mean "audit"?');
    expect(result.json().meta.next[0].argv).toEqual(['demo', 'table', 'add', '--schema']);
  });

  it.each([
    [['--mode', 'alhpa'], 'alhpa'],
    [['--vault', '{"tier":"gld"}'], 'gld'],
    [['--vault', '{"tierr":"gold"}'], 'tierr']
  ])('names nothing from a secret value: %j', async (flags, typed) => {
    const result = await exec(cli, ['policy', ...flags, '--json']);
    expect(result.json().error.code).toBe('invalid-input');
    expect(result.stdout).not.toContain(typed);
    expect(result.stdout).not.toMatch(/Did you mean/);
  });
});

describe('a command that serves a protocol', () => {
  it.each([
    ['--bogus', ['serve', '--bogus'], 'unknown-flag'],
    ['--dry-run', ['serve', '--dry-run'], 'dry-run-unsupported'],
    ['--yes', ['serve', '--yes'], 'invalid-input'],
    ['-y', ['serve', '-y'], 'invalid-input'],
    ['--context nope', ['--context', 'nope', 'serve'], 'context-unknown']
  ])('writes nothing to stdout when %s fails at start-up, in JSON and in text', async (_case, argv, code) => {
    const json = await exec(cli, [...argv, '--json']);
    expect(json.code).toBe(ExitCode.usage);
    expect(json.stdout).toBe('');
    expect(JSON.parse(json.stderr).error.code).toBe(code);
    const text = await exec(cli, argv, { tty: true });
    expect(text.code).toBe(ExitCode.usage);
    expect(text.stdout).toBe('');
    expect(text.stderr).toContain(`Error (${code})`);
  });

  it('leaves stdout to the command on success, and writes its result to stderr, in JSON and in text', async () => {
    const json = await exec(cli, ['serve', '--json']);
    expect(json.code).toBe(0);
    expect(json.stdout).toBe('PROTOCOL\n');
    expect(JSON.parse(json.stderr)).toMatchObject({ ok: true, data: { closed: true }, meta: { command: 'serve', warnings: ['closed'] } });
    const text = await exec(cli, ['serve'], { tty: true });
    expect(text.code).toBe(0);
    expect(text.stdout).toBe('PROTOCOL\n');
    expect(text.stderr).toContain('closed: true\nNext:\n  demo status  # Check\n');
  });
});

describe('the error codes of the layer', () => {
  it('give each code one sentence, none empty and none repeated', () => {
    const sentences = Object.values(COMMAND_ERROR_CODES);
    expect(Object.keys(COMMAND_ERROR_CODES)).toEqual(expect.arrayContaining([
      'unknown-command', 'unknown-flag', 'unexpected-argument', 'missing-input', 'invalid-input',
      'dry-run-unsupported', 'approval-required', 'cancelled', 'interrupted', 'failed'
    ]));
    for (const sentence of sentences) expect(sentence.trim()).toMatch(/^[A-Z].*\.$/);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it('let a host type its own codes on a CliError', () => {
    type HostCode = 'agent-unusable' | 'unknown-agent';
    const error = new CliError<HostCode>({ code: 'agent-unusable', message: 'The agent cannot be used.' });
    const code: HostCode = error.code;
    expect(code).toBe('agent-unusable');
  });
});

describe('-y, the short form of --yes', () => {
  it('approves like --yes and takes no value, so the words after it stay arguments', async () => {
    expect((await exec(cli, ['pair', '-y', 'one', 'two', '--json'])).code).toBe(0);
    const { input, ctx } = seen[seen.length - 1];
    expect(ctx.yes).toBe(true);
    expect(input).toEqual({ a: 'one', b: 'two' });
    expect((await exec(cli, ['deploy', '-y', 'web', '--json'])).code).toBe(0);
    expect(applied).toEqual(['web']);
  });

  it('shows in help, in the manifest and in --llms', async () => {
    expect((await exec(cli, ['--help'])).stdout).toMatch(/-y, --yes +Approve the plan of a change without a prompt/);
    expect((await exec(cli, ['--help'])).stdout).toMatch(/-h, --help +Show help/);
    expect((await exec(cli, ['--llms', '--json'])).json().globals.properties.yes['x-short']).toBe('y');
    expect((await exec(cli, ['--llms'])).stdout).toContain('`-y` is `--yes`');
  });

  it.each([
    ['a command', { commands: [{ name: 'x', summary: 'x', effect: 'read', input: z.object({ yes_please: z.boolean().optional().meta({ 'x-short': 'y' }) }), run: (): { data: null } => ({ data: null }) }] }],
    ['a global of the CLI', { globals: z.object({ force: z.boolean().optional().meta({ 'x-short': 'f' }) }), commands: [] }]
  ])('cannot be declared by %s', (_owner, config) => {
    expect(() => createCli({ name: 'bad', version: '0.0.0', ...config } as unknown as Parameters<typeof createCli>[0])).toThrow('short form');
  });
});

describe('a carried flag given more than once', () => {
  it('becomes one placeholder in the step, so the person chooses one value', async () => {
    const result = await exec(cli, ['--as', 'a', '--context', 'staging', '--as', 'b', 'pair', 'one', '--json']);
    expect(result.code).toBe(ExitCode.usage);
    const { error, meta } = result.json();
    expect(error.message).toContain('--as was given 2 times');
    expect(meta.next).toEqual([{
      command: 'demo --as <as> --context staging pair --schema',
      argv: ['demo', '--as', '<as>', '--context', 'staging', 'pair', '--schema'],
      placeholders: ['<as>'],
      why: 'See the input schema'
    }]);
  });
});

describe('a step that leaves out a carried flag', () => {
  const run = async (argv: string[]) => {
    expect((await exec(cli, argv)).code).toBe(0);
    return seen[seen.length - 1].ctx;
  };

  it.each([
    [['--as', 'bot', '--context', 'staging', 'pair', 'one', '--cwd', 'sub'], ['--as'], ['--context', 'staging', '--cwd', 'sub'], ['--as', 'bot', '--context', 'staging', '--cwd', 'sub']],
    [['pair', 'one', '--as=bot', '--context=staging'], ['as'], ['--context=staging'], ['--as=bot', '--context=staging']]
  ])('%j drops %j from one step, keeps the other carried flags, and keeps it in the next step', async (argv, drop, kept, all) => {
    const ctx = await run(argv);
    expect(ctx.next(['agent', 'remove', 'bot'], 'Remove it', { drop }).argv).toEqual(['demo', ...kept, 'agent', 'remove', 'bot']);
    expect(ctx.nextFor('table add', { table_name: 'users' }, 'Add it', { drop }).argv).toEqual(['demo', ...kept, 'table', 'add', 'users']);
    expect(ctx.next(['status'], 'Check').argv).toEqual(['demo', ...all, 'status']);
  });

  it.each([['--bogus'], ['--json'], ['--table-name']])('refuses to drop %s, which is not a carried global flag', async (name) => {
    const ctx = await run(['--as', 'bot', 'pair', 'one']);
    expect(() => ctx.next(['status'], 'Check', { drop: [name] })).toThrow(`cannot drop ${name}`);
    expect(() => ctx.nextFor('status', {}, 'Check', { drop: [name] })).toThrow(`cannot drop ${name}`);
  });
});

describe('the steps the layer builds itself', () => {
  it.each([
    ['missing-input', ['--context', 'staging', 'login', '--json'], ['login', '--schema']],
    ['unknown-flag', ['--context', 'staging', 'table', 'add', 't', '--bogus', '--json'], ['table', 'add', '--help']],
    ['unexpected-argument of a command', ['table', 'add', 't', 'extra', '--context=staging', '--json'], ['table', 'add', '--help']],
    ['unexpected-argument of a group', ['--context', 'staging', 'table', '--json', '--', 'x'], ['table', '--help']],
    ['unknown-command', ['--context', 'staging', 'tabel', 'add', '--json'], ['--help']],
    ['unknown-command in a group', ['--context', 'staging', 'table', 'bogus', '--json'], ['table', '--help']],
    ['dry-run-unsupported', ['--context', 'staging', 'bump', '--dry-run', '--json'], ['bump', '--help']]
  ])('%s carries the target flags of the run', async (code, argv, words) => {
    const result = await exec(cli, ['--cwd', 'sub', ...argv]);
    const { error, meta } = result.json();
    expect(error.code).toBe(code.split(' ')[0]);
    const carried = argv.includes('--context=staging') ? ['--context=staging'] : ['--context', 'staging'];
    expect(meta.next[0].argv).toEqual(['demo', '--cwd', 'sub', ...carried, ...words]);
  });
});

describe('ctx.followUp', () => {
  it.each([
    [['pair', 'one', '--', '-x'], [['--yes']], 'demo pair one --yes -- -x'],
    [['pair', 'one', 'two', '--yes', 'false'], [['--yes'], { drop: ['--yes'] }], 'demo pair one two --yes'],
    [['pair', 'one', 'two', '--no-yes', '--dry-run', '--json'], [['--yes'], { drop: ['--yes', '--dry-run'] }], 'demo pair one two --json --yes'],
    [['--json', 'pair', 'one'], [['--yes'], { command: 'table add' }], 'demo --json table add one --yes'],
    [['pair', 'pair', '--json'], [[], { command: 'table add' }], 'demo table add pair --json']
  ])('%j with %j is %s', async (argv, args, command) => {
    expect((await exec(cli, argv)).code).toBe(0);
    const [flags, options] = args as [string[], { drop?: string[]; command?: string }?];
    const step = seen[seen.length - 1].ctx.followUp(flags, { why: 'Apply it', ...options });
    expect(step).toEqual({ command, argv: command.split(' '), why: 'Apply it' });
  });

  it('turns each secret into a named placeholder, because an agent must not run ***', async () => {
    expect((await exec(cli, ['vault', 'l', '--pin', '4242', '--creds={"secret":"NESTED-SECRET-9"}', '--yes'])).code).toBe(0);
    expect(seen[seen.length - 1].ctx.followUp([], { why: 'Apply it' })).toEqual({
      command: 'demo vault l --pin <pin> --creds <creds> --yes',
      argv: ['demo', 'vault', 'l', '--pin', '<pin>', '--creds', '<creds>', '--yes'],
      placeholders: ['<pin>', '<creds>'],
      why: 'Apply it'
    });
  });

  it.each([
    [{ drop: ['--bogus'] }, '--bogus'],
    [{ command: 'no such' }, 'no such']
  ])('refuses %j', async (options, text) => {
    await exec(cli, ['pair', 'one']);
    expect(() => seen[seen.length - 1].ctx.followUp(['--yes'], { why: 'Apply it', ...options })).toThrow(text);
  });
});

describe('the approval of a change', () => {
  const PLAN = planOf('web');
  const RERUN = { command: 'demo deploy web --json --yes', argv: ['demo', 'deploy', 'web', '--json', '--yes'], why: 'Apply the change once the person approves the plan' };

  it('stops before the change with exit 3, the plan and the rerun with --yes, when there is no terminal', async () => {
    const result = await exec(cli, ['deploy', 'web', '--json']);
    expect(result.code).toBe(ExitCode.approvalRequired);
    expect(result.json()).toEqual({
      ok: false,
      error: {
        code: 'approval-required',
        message: 'This change needs approval, and prompts are off, so nothing was changed.',
        hint: 'Show the plan to the person. When they approve it, run the same command with --yes.',
        details: { plan: PLAN }
      },
      meta: { command: 'deploy', next: [RERUN] }
    });
    expect(applied).toEqual([]);
  });

  it('prints the plan above the error in text format', async () => {
    const result = await exec(cli, ['deploy', 'web', '--format', 'text']);
    expect(result.code).toBe(ExitCode.approvalRequired);
    expect(result.stderr).toMatch(/Directory: [\s\S]*Change web\.\n\nError \(approval-required\)/);
    expect(applied).toEqual([]);
  });

  it.each([[['--dry-run']], [['--dry-run', '--yes']], [['--dry-run', '-y']]])('returns the plan for %j, offers the real run, and changes nothing', async (flags) => {
    const result = await exec(cli, ['deploy', 'web', ...flags, '--json']);
    expect(result.code).toBe(0);
    expect(result.json().data).toEqual({ applied: false, plan: PLAN });
    expect(result.json().meta.next).toEqual([RERUN]);
    expect(applied).toEqual([]);
  });

  it('adds the flags its plan needs to the exit-3 step and the dry-run step when there is no terminal, and only then', async () => {
    const step = (command: string) => ({ command, argv: command.split(' '), why: RERUN.why });
    expect((await exec(cli, ['deploy', 'keyed', '--json'])).json().meta.next).toEqual([step('demo deploy keyed --json --from-stdin --yes')]);
    expect((await exec(cli, ['deploy', 'keyed', '--dry-run', '--json'])).json().meta.next).toEqual([step('demo deploy keyed --json --from-stdin --yes')]);
    expect((await exec(cli, ['deploy', 'keyed', '--from-stdin', '--dry-run', '--json'])).json().meta.next).toEqual([step('demo deploy keyed --from-stdin --json --yes')]);
    expect((await exec(cli, ['deploy', 'keyed', '--dry-run', '--json'], { tty: true })).json().meta.next).toEqual([step('demo deploy keyed --json --yes')]);
    expect(applied).toEqual([]);
  });

  it.each([
    [['--yes', 'false', '--json'], false],
    [['--no-yes', '--json'], false],
    [['--no-input', '--format', 'json'], true]
  ])('does not take %j as approval (terminal: %s)', async (flags, tty) => {
    const result = await exec(cli, ['deploy', 'web', ...flags], { tty });
    expect(result.code).toBe(ExitCode.approvalRequired);
    expect(applied).toEqual([]);
  });

  it('applies the plan with --yes', async () => {
    const result = await exec(cli, ['deploy', 'web', '--yes', '--json']);
    expect(result.code).toBe(0);
    expect(result.json().data).toEqual({ deployed: 'web' });
    expect(applied).toEqual(['web']);
  });

  it.each([[['--dry-run']], [['--yes']], [[]]])('stops a change whose plan fails with that failure (%j), and never applies it', async (flags) => {
    const result = await exec(cli, ['deploy', 'blocked', ...flags, '--json']);
    expect(result.code).toBe(ExitCode.failure);
    expect(result.json().error).toEqual({ code: 'no-env', message: 'There is nothing to deploy here.', hint: 'Bind the directory first.' });
    expect(applied).toEqual([]);
  });

  it('shows the plan on a terminal and applies it when the person says yes', async () => {
    const result = await exec(cli, ['deploy', 'web', '--json'], { tty: true, answers: [['Apply this change?', 'y\n']] });
    expect(result.code).toBe(0);
    expect(result.stderr).toContain('Change web.');
    expect(applied).toEqual(['web']);
  });

  it('fails with cancelled, exit 1, when the person declines', async () => {
    const result = await exec(cli, ['deploy', 'web', '--json'], { tty: true, answers: [['Apply this change?', 'n\n']] });
    expect(result.code).toBe(ExitCode.failure);
    expect(result.json().error).toEqual({ code: 'cancelled', message: 'The change was not approved, so nothing was changed.' });
    expect(applied).toEqual([]);
  });

  it('labels a change by its effect alone in --schema, the manifest and help', async () => {
    expect((await exec(cli, ['deploy', '--schema'])).json()).toMatchObject({ name: 'deploy', effect: 'destructive' });
    expect((await exec(cli, ['deploy', '--help'])).stdout).toContain('Effect: destructive');
    expect((await exec(cli, ['--help'])).stdout).toMatch(/deploy +Deploy a target \(destructive\)/);
    expect((await exec(cli, ['--help'])).stdout).toMatch(/server +Run the server \(write, takes its own flags\)/);
  });
});

describe('a change that runs at once', () => {
  it('runs without --yes and without a terminal, and asks nothing', async () => {
    const result = await exec(cli, ['bump', '--by', '2', '--json']);
    expect(result.code).toBe(0);
    expect(result.json().data).toEqual({ bumped: 2 });
    expect(bumped).toEqual(['2']);
    expect((await exec(cli, ['bump', '--yes', '--json'])).code).toBe(0);
    expect(bumped).toEqual(['2', '1']);
  });

  it('refuses --dry-run before it runs, because it has no plan', async () => {
    const result = await exec(cli, ['bump', '--dry-run', '--json']);
    expect(result.code).toBe(ExitCode.usage);
    expect(result.json().error).toMatchObject({ code: 'dry-run-unsupported', details: { flag: '--dry-run' } });
    expect(result.json().error.message).toContain('makes its change as soon as it runs');
    expect(bumped).toEqual([]);
  });

  it('says it runs at once in help', async () => {
    expect((await exec(cli, ['bump', '--help'])).stdout).toContain('Effect: write, at once');
    expect((await exec(cli, ['--help'])).stdout).toMatch(/bump +Bump a counter at once \(write, at once\)/);
  });
});

describe('definition errors', () => {
  // These rows build definitions that the type refuses on purpose, as an untyped caller could.
  const nothing = (): { data: unknown } => ({ data: null });
  const none = async (): Promise<undefined> => undefined;
  const command = (overrides: Record<string, unknown>): CommandDefinition =>
    ({ name: 'x', summary: 'x', effect: 'read', run: nothing, ...overrides }) as unknown as CommandDefinition;
  const plan = () => ({ plan: planOf('x') });

  it.each([
    [[command({}), command({})], 'defined twice'],
    [[command({ name: 'a  b' })], 'invalid name'],
    [[command({ positionals: ['missing'], input: z.object({}) })], 'no such property'],
    [[command({ input: z.object({ json: z.boolean().optional() }) })], 'a flag the command layer owns'],
    [[command({ input: z.object({ foo_bar: z.string().optional(), fooBar: z.string().optional() }) })], 'is a spelling of both "foo_bar"'],
    [[command({ run: undefined, passthrough: none, input: z.object({}) })], 'passthrough'],
    [[command({ passthrough: none })], 'passthrough'],
    [[command({ effect: 'write' })], 'has plan() and apply() and no run()'],
    [[command({ effect: 'destructive', plan, apply: nothing })], 'has plan() and apply() and no run()'],
    [[command({ effect: 'read', run: undefined, plan, apply: nothing })], 'is a "read" command'],
    [[command({ effect: 'write', run: undefined, plan })], 'has plan() and apply()'],
    [[command({ run: undefined, serve: nothing })], "stdout: 'reserved'"],
    [[command({ stdout: 'reserved' })], 'reserves stdout'],
    [[command({ effect: 'maybe' })], 'Give it "read", "write" or "destructive"'],
    [[command({ effect: 'destructive', immediate: true })], 'runs at once (immediate: true)'],
    [[command({ effect: 'read', immediate: true })], 'runs at once (immediate: true)'],
    [[command({ effect: 'write', immediate: true, run: undefined, plan, apply: nothing })], 'runs at once (immediate: true)']
  ])('rejects %#', (commands, text) => {
    expect(() => createCli({ name: 'bad', version: '0.0.0', commands })).toThrow(text);
  });
});

describe('object keys that are also Object.prototype names', () => {
  it.each([
    [['--constructor', 'c', '--creds', '{"toString":"t","constructor":1}'], 'invalid-input'],
    [['--constructor', 'c', '--creds', '{"user":"u"}'], 'invalid-input'],
    [[], 'missing-input']
  ])('%j are unknown keys', async (flags, code) => {
    const result = await exec(cli, ['proto', ...flags, '--json']);
    expect(result.code).toBe(ExitCode.usage);
    expect(result.json().error.code).toBe(code);
  });

  it('never hands a command a __proto__ key, nor sets one on any object', async () => {
    const result = await exec(cli, ['proto', '--constructor', 'c', '--creds', '{"toString":"t","__proto__":{"polluted":1}}', '--json']);
    expect(result.code).toBe(0);
    expect(Object.keys(lastInput().creds as object)).toEqual(['toString']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('output that --schema describes', () => {
  const output = z.object({ id: z.string(), rows: z.number().int(), tags: z.array(z.string()), owner: z.object({ name: z.string() }).nullable() });
  const typed = createCli({
    name: 'typed',
    version: '1',
    commands: [{ name: 'show', summary: 'Show', effect: 'read', output, run: () => ({ data: { id: 'a1', rows: 3, tags: ['x'], owner: null } }) }]
  });

  it('prints the output schema, and the real --json data validates against it', async () => {
    const schema = (await exec(typed, ['show', '--schema'])).json().output;
    const { data } = (await exec(typed, ['show', '--json'])).json();
    expect(z.fromJSONSchema(schema).safeParse(data).success).toBe(true);
    expect(z.fromJSONSchema(schema).safeParse({ ...data, rows: 'three' }).success).toBe(false);
  });
});

describe('round trip', () => {
  const schema = z.object({
    table_name: z.string().optional(),
    rowCount: z.number().int().optional(),
    ratio: z.number().optional(),
    is_public: z.boolean().optional(),
    kind: z.enum(['plain', 'audit']).optional(),
    tags: z.array(z.string()).optional(),
    ports: z.array(z.number().int()).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
    columns: z.array(z.record(z.string(), z.unknown())).optional()
  });
  const echo = createCli({ name: 'echo', version: '0.0.0', commands: [{ name: 'echo', summary: 'Echo', effect: 'read', input: schema, run: (input) => ({ data: input }) }] });

  const inputs: Record<string, unknown>[] = [
    { table_name: 'users', rowCount: 3, ratio: 0.25, is_public: true, kind: 'audit', tags: ['a', 'b c'], ports: [80, -1], meta: { nested: { x: [1] } }, columns: [{ name: 'id' }] },
    { table_name: '', rowCount: -7, ratio: -0.5, is_public: false },
    { table_name: 'true', kind: 'plain', tags: ['--not-a-flag', '-1'] },
    { table_name: 'a=b', tags: [], ports: [0] },
    { table_name: 'ünïcødé ✓', ratio: 1e21, columns: [] }
  ];

  const words = (property: string) => property.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().split('_');
  const spellings: Record<string, (property: string) => string> = {
    kebab: (property) => words(property).join('-'),
    snake: (property) => words(property).join('_'),
    camel: (property) => words(property).map((word, index) => (index ? word[0].toUpperCase() + word.slice(1) : word)).join('')
  };

  const argvFor = (input: Record<string, unknown>, spell: (property: string) => string): string[] =>
    Object.entries(input).flatMap(([property, value]) => {
      const flag = `--${spell(property)}`;
      const pair = (text: string) => (text.startsWith('--') ? [`${flag}=${text}`] : [flag, text]);
      if (typeof value === 'boolean') return [value ? flag : `--no-${spell(property)}`];
      if (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item !== 'object')) {
        return value.flatMap((item) => pair(String(item)));
      }
      return typeof value === 'object' ? [flag, JSON.stringify(value)] : pair(String(value));
    });

  it.each(Object.keys(spellings).flatMap((spelling) => inputs.map((input, index) => [spelling, index, input] as const)))(
    '%s spelling of input %i parses back to the same object',
    async (spelling, _index, input) => {
      const result = await exec(echo, ['echo', ...argvFor(input, spellings[spelling]), '--json']);
      expect(result.code).toBe(0);
      expect(result.json().data).toEqual(input);
    }
  );
});
