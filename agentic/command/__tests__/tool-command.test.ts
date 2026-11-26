import { type ConfirmPrompt, defineHarnessTool, type GatePolicy, identifierParam, type ToolFailure } from '@agentic-kit/harness';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PassThrough, Writable } from 'stream';
import { z } from 'zod';

import { type CommandDefinition, createCli, toCliCommands, toolCallStep, toolCommand } from '../src';

const cwd = mkdtempSync(join(tmpdir(), 'agentic-command-'));
const calls: Array<{ tool: string; params: unknown; cwd: string }> = [];

const listTool = defineHarnessTool({
  name: 'list_things',
  label: 'List things',
  description: 'List the things.',
  parameters: z.object({ prefix: z.string().optional() }),
  effect: 'read',
  async execute(params, ctx) {
    calls.push({ tool: 'list_things', params, cwd: ctx.cwd });
    return {
      content: [{ type: 'text', text: '2 things.' }],
      details: { things: ['a', 'b'], message: '2 things.' }
    };
  }
});

const deleteTool = defineHarnessTool({
  name: 'delete_thing',
  label: 'Delete thing',
  description: 'Delete a thing.',
  parameters: z.object({ thing_name: identifierParam() }),
  effect: 'destructive',
  async execute(params, ctx) {
    calls.push({ tool: 'delete_thing', params, cwd: ctx.cwd });
    return { content: [{ type: 'text', text: `Deleted ${params.thing_name}` }], details: { deleted: params.thing_name } };
  }
});

const createTool = defineHarnessTool({
  name: 'create_thing',
  label: 'Create thing',
  description: 'Create a thing.',
  parameters: z.object({
    thing_name: identifierParam(),
    size: z.number().int().min(1).optional(),
    note: z.union([z.string(), z.null()]).optional(),
    replace: z.boolean().optional()
  }),
  effect: 'write',
  async execute(params, ctx) {
    calls.push({ tool: 'create_thing', params, cwd: ctx.cwd });
    return { content: [{ type: 'text', text: `Created ${params.thing_name}` }], details: { created: params.thing_name } };
  }
});

let failure: ToolFailure;
const connectTool = defineHarnessTool({
  name: 'connect_thing',
  label: 'Connect thing',
  description: 'Connect a thing.',
  parameters: z.object({}),
  effect: 'read',
  async execute() {
    return { content: [{ type: 'text', text: failure.message }], details: { connected: false, message: failure.message }, failure };
  }
});

const TARGET = { kind: 'account', apiEndpoint: 'http://api.localhost:3000/graphql', account: { userId: 'user-1' } } as const;

// A read that suggests what to do after it.
const suggestTool = defineHarnessTool({
  name: 'suggest_thing',
  label: 'Suggest thing',
  description: 'Suggest a thing.',
  parameters: z.object({}),
  effect: 'read',
  async execute() {
    return {
      content: [{ type: 'text', text: 'Suggested.' }],
      details: { suggested: true },
      calls: [
        { tool: 'delete_thing', input: { thing_name: 'old' }, why: 'Delete the old thing' },
        { tool: 'create_thing', input: { size: 2 }, why: 'Make a new one', choose: ['thing_name'] }
      ]
    };
  }
});

const unrendered: Array<{ tool: string; reason: string }> = [];

let ready = true;
const notReady: ToolFailure = {
  code: 'no-env',
  message: 'No .env found in the project.',
  hint: 'Create a thing first, then retry.'
};
const prompted: string[] = [];
const gate: GatePolicy = {
  isGated: () => true,
  resolvePrompt: async (event) => {
    prompted.push(event.toolName);
    if (!ready) return { kind: 'blocked', failure: notReady };
    const name = String(event.input?.thing_name);
    return {
      kind: 'ask',
      prompt: {
        title: 'Change thing?',
        message: `Change the thing "${name}".`,
        target: TARGET,
        preview: { kind: 'policies', tableName: name, policies: ['AuthzDirectOwner'] }
      }
    };
  }
};

const quickInput = z.object({ spec: z.string().describe('name:size') });

const cli = createCli({
  name: 'demo',
  version: '1.0.0',
  commands: toCliCommands([
    toolCommand(listTool, { name: 'thing list' }),
    toolCommand(deleteTool, { name: 'thing delete', positionals: ['thing_name'] }),
    toolCommand(createTool, {
      name: 'thing quick',
      input: quickInput,
      positionals: ['spec'],
      mapInput: ({ spec }: { spec: string }) => {
        const [thing_name, size] = spec.split(':');
        return { thing_name, size: Number(size) };
      }
    }),
    toolCommand(createTool, {
      name: 'thing create',
      positionals: ['thing_name'],
      next: (details, params, ctx) => [ctx.next(['thing', 'delete', params.thing_name], `Undo ${details.created}`)]
    }),
    toolCommand(connectTool, { name: 'thing connect' }),
    toolCommand(suggestTool, { name: 'thing suggest' })
  ], {
    gate,
    onUnrenderedCall: (call, reason) => unrendered.push({ tool: call.tool, reason }),
    // What the CLI passes: the command a person runs for a failure code, built for this run.
    failureNext: (failure, ctx) => {
      if (failure.code === 'signed-out') return [ctx.next(['login'], 'Sign in')];
      if (failure.code === 'no-env') return [ctx.next(['db', 'create', 'my app'], 'Create a database for this directory')];
      return [];
    }
  })
});

function capture(onWrite?: (text: string) => void) {
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

/** `answers`: when stderr contains the first string, type the second into stdin. `tty`: stdin and stdout are terminals. */
async function run(argv: string[], options: { tty?: boolean; answers?: Array<[string, string]> } = {}) {
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
  const code = await cli.run(argv, { stdin, stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd });
  return { code, stdout: stdout.text(), stderr: stderr.text(), json: () => JSON.parse(stdout.text()) };
}

const plan: ConfirmPrompt = {
  title: 'Change thing?',
  message: 'Change the thing "posts".',
  target: TARGET,
  preview: { kind: 'policies', tableName: 'posts', policies: ['AuthzDirectOwner'] }
};

beforeEach(() => {
  calls.length = 0;
  prompted.length = 0;
  ready = true;
});

describe('a read', () => {
  it('runs without asking the gate, and returns the details as data', async () => {
    const result = await run(['thing', 'list', '--prefix', 'a', '--dry-run']);
    expect(result.code).toBe(0);
    expect(result.json().data).toEqual({ things: ['a', 'b'], message: '2 things.' });
    expect(calls).toEqual([{ tool: 'list_things', params: { prefix: 'a' }, cwd }]);
    expect(prompted).toEqual([]);
  });

  it('prints the text content of the tool in text format', async () => {
    const result = await run(['thing', 'list', '--format', 'text']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('2 things.\n');
  });
});

describe('a change', () => {
  it('stops with approval-required and the plan when it is not interactive and has no --yes', async () => {
    const result = await run(['thing', 'delete', 'posts']);
    expect(result.code).toBe(3);
    const { error, meta } = result.json();
    expect(error.code).toBe('approval-required');
    expect(error.details).toEqual({ plan });
    expect(error.hint).toMatch(/plan/);
    expect(meta.next).toEqual([{ command: 'demo thing delete posts --yes', argv: ['demo', 'thing', 'delete', 'posts', '--yes'], why: expect.any(String) }]);
    expect(calls).toEqual([]);
  });

  it('prints the plan above the approval-required error in text format', async () => {
    const result = await run(['thing', 'delete', 'posts', '--format', 'text']);
    expect(result.code).toBe(3);
    expect(result.stderr).toMatch(/Change the thing "posts"[\s\S]*AuthzDirectOwner[\s\S]*Error \(approval-required\)/);
    expect(calls).toEqual([]);
  });

  it('returns the plan for --dry-run, offers the real run, and changes nothing', async () => {
    const result = await run(['thing', 'delete', 'posts', '--dry-run', '--yes']);
    expect(result.code).toBe(0);
    expect(result.json().data).toEqual({ applied: false, plan });
    expect(result.json().meta.next).toEqual([{ command: 'demo thing delete posts --yes', argv: ['demo', 'thing', 'delete', 'posts', '--yes'], why: expect.any(String) }]);
    expect(calls).toEqual([]);
  });

  it.each([[['--dry-run']], [['--yes']], [[]]])('stops a blocked call with the gate\'s failure (%j), and never runs it', async (flags) => {
    ready = false;
    const result = await run(['thing', 'delete', 'posts', ...flags]);
    expect(result.code).toBe(1);
    expect(result.json().error).toEqual({
      code: 'no-env',
      message: 'No .env found in the project.',
      hint: 'Create a thing first, then retry.'
    });
    expect(calls).toEqual([]);
  });

  it('runs with --yes', async () => {
    const result = await run(['thing', 'delete', 'posts', '--yes']);
    expect(result.code).toBe(0);
    expect(result.json().data).toEqual({ deleted: 'posts' });
    expect(calls).toEqual([{ tool: 'delete_thing', params: { thing_name: 'posts' }, cwd }]);
  });

  it('asks the gate for a write, and returns options.next', async () => {
    const write = await run(['thing', 'create', 'widgets', '--yes']);
    expect(write.json().meta.next).toEqual([{ command: 'demo thing delete widgets', argv: ['demo', 'thing', 'delete', 'widgets'], why: 'Undo widgets' }]);
    expect(prompted).toEqual(['create_thing']);
  });
});

describe('the interactive confirm', () => {
  it('shows the plan and runs when the person approves', async () => {
    const result = await run(['thing', 'delete', 'posts', '--json'], { tty: true, answers: [['Apply this change?', 'y\n']] });
    expect(result.code).toBe(0);
    expect(result.stderr).toContain('Change the thing "posts".');
    expect(calls).toHaveLength(1);
  });

  it('fails with cancelled when the person declines', async () => {
    const result = await run(['thing', 'delete', 'posts', '--json'], { tty: true, answers: [['Apply this change?', 'n\n']] });
    expect(result.code).toBe(1);
    expect(result.json().error.code).toBe('cancelled');
    expect(calls).toEqual([]);
  });
});

describe('input', () => {
  it('fails with invalid-input and names each bad flag when the tool schema, its input, rejects the params', async () => {
    const result = await run(['thing', 'create', 'bad\u0001name', '--size', '0', '--yes']);
    expect(result.code).toBe(2);
    const { error } = result.json();
    expect(error.code).toBe('invalid-input');
    expect(error.details.issues.map((issue: { flag: string }) => issue.flag)).toEqual(['<thing-name>', '--size']);
    expect(error.message).toContain('<thing-name>');
    expect(calls).toEqual([]);
    expect(prompted).toEqual([]);
  });

  it('builds the params with mapInput from a friendlier input', async () => {
    const result = await run(['thing', 'quick', 'widgets:3', '--yes']);
    expect(result.code).toBe(0);
    expect(calls).toEqual([{ tool: 'create_thing', params: { thing_name: 'widgets', size: 3 }, cwd }]);
  });

  it('validates what mapInput returns with the tool schema', async () => {
    const result = await run(['thing', 'quick', 'widgets:none', '--yes']);
    expect(result.code).toBe(2);
    expect(result.json().error.details.issues.map((issue: { path: string }) => issue.path)).toEqual(['size']);
    expect(calls).toEqual([]);
  });

  it('takes a nullable property as a flag and as null in --input', async () => {
    await run(['thing', 'create', 'a', '--note', 'hi', '--yes']);
    await run(['thing', 'create', '--input', '{"thing_name":"b","note":null}', '--yes']);
    expect(calls.map((call) => call.params)).toEqual([{ thing_name: 'a', note: 'hi' }, { thing_name: 'b', note: null }]);
  });
});

describe('a call a tool suggests', () => {
  it('becomes the first next step of a success, with a placeholder for an input left to choose', async () => {
    const { meta } = (await run(['thing', 'suggest'])).json();
    expect(meta.next).toEqual([
      { command: 'demo thing delete old', argv: ['demo', 'thing', 'delete', 'old'], why: 'Delete the old thing' },
      expect.objectContaining({ argv: expect.arrayContaining(['demo', 'thing', 'create', '--size', '2']), placeholders: [expect.any(String)], why: 'Make a new one' })
    ]);
  });

  it('is written with the flags of the command bound to its tool, through the binding', async () => {
    const renameTool = defineHarnessTool({
      name: 'rename_thing',
      label: 'Rename thing',
      description: 'Rename a thing.',
      parameters: z.object({ old_name: z.string(), new_name: z.string() }),
      effect: 'read',
      async execute() {
        return { content: [{ type: 'text', text: 'Renamed.' }], details: {}, calls: [{ tool: 'rename_thing', input: { old_name: 'a', new_name: 'b' }, why: 'Again' }] };
      }
    });
    const renaming = createCli({
      name: 'demo',
      version: '1.0.0',
      commands: toCliCommands([
        toolCommand(renameTool, {
          name: 'thing rename',
          input: z.object({ from: z.string(), to: z.string() }),
          positionals: ['from', 'to'],
          mapInput: ({ from, to }: { from: string; to: string }) => ({ old_name: from, new_name: to }),
          toInput: (params) => ({ from: params.old_name, to: params.new_name })
        })
      ], { gate })
    });
    const stdout = capture();
    await renaming.run(['thing', 'rename', 'x', 'y', '--json'], { stdin: new PassThrough(), stdout: stdout.stream, stderr: capture().stream, env: {}, cwd });
    expect(JSON.parse(stdout.text()).meta.next).toEqual([{ command: 'demo thing rename a b', argv: ['demo', 'thing', 'rename', 'a', 'b'], why: 'Again' }]);
  });
});

describe('a tool bound to two commands', () => {
  const changeTool = defineHarnessTool({
    name: 'change_thing',
    label: 'Change thing',
    description: 'Rename or resize a thing.',
    parameters: z.object({ thing_name: z.string(), new_name: z.string().optional(), new_size: z.number().optional() }),
    effect: 'read',
    async execute() {
      const calls = [{ tool: 'change_thing', input: { thing_name: 'a', new_size: 2 }, why: 'Resize it' }];
      return { content: [], details: {}, failure: { code: 'conflict', message: 'It does not fit.', calls } };
    }
  });
  const cli = createCli({
    name: 'demo',
    version: '1.0.0',
    commands: toCliCommands([
      toolCommand(changeTool, {
        name: 'thing change',
        input: z.object({ thing_name: z.string(), new_name: z.string().optional() }),
        positionals: ['thing_name'],
        mapInput: (input: { thing_name: string; new_name?: string }) => input
      }),
      toolCommand(changeTool, {
        name: 'thing resize',
        input: z.object({ thing_name: z.string(), size: z.number() }),
        positionals: ['thing_name'],
        mapInput: ({ thing_name, size }: { thing_name: string; size: number }) => ({ thing_name, new_size: size }),
        toInput: (params) => (params.new_size === undefined ? undefined : { thing_name: params.thing_name, size: params.new_size })
      })
    ], { gate })
  });

  it('writes a call as a step of the one command that takes its input', async () => {
    const stdout = capture();
    await cli.run(['thing', 'change', 'x', '--json'], { stdin: new PassThrough(), stdout: stdout.stream, stderr: capture().stream, env: {}, cwd });
    expect(JSON.parse(stdout.text()).meta.next[0].argv).toEqual(['demo', 'thing', 'resize', 'a', '--size', '2']);
  });
});

describe('a tool failure', () => {
  it.each([
    ['signed-out', 4],
    ['app-signed-out', 4],
    ['step-up-required', 4],
    ['invalid-input', 2],
    ['not-found', 1]
  ] as const)('%s exits %i with the tool details', async (code, exitCode) => {
    failure = { code, message: 'It failed.', hint: 'Retry.', retryable: true };
    const result = await run(['thing', 'connect']);
    expect(result.code).toBe(exitCode);
    expect(result.json().error).toEqual({
      code,
      message: 'It failed.',
      hint: 'Retry.',
      retryable: true,
      details: { connected: false, message: 'It failed.' }
    });
  });

  it('puts the error id and the backend context next to the tool details', async () => {
    failure = {
      code: 'query-too-large',
      message: 'The query asks for more rows than this backend allows.',
      errorId: '0123456789abcdef',
      context: { cost: 1010100, limit: 1000000 }
    };
    const { error } = (await run(['thing', 'connect'])).json();
    expect(error.details).toEqual({
      connected: false,
      message: 'The query asks for more rows than this backend allows.',
      errorId: '0123456789abcdef',
      context: { cost: 1010100, limit: 1000000 }
    });
  });

  it('gives the next steps the CLI names for a failed call', async () => {
    failure = { code: 'signed-out', message: 'No session.' };
    const result = await run(['thing', 'connect']);
    expect(result.json().meta.next).toEqual([{ command: 'demo login', argv: ['demo', 'login'], why: 'Sign in' }]);
  });

  it('gives the next steps the CLI names for a blocked call', async () => {
    ready = false;
    const result = await run(['thing', 'delete', 'posts']);
    expect(result.json().meta.next).toEqual([{ command: "demo db create 'my app'", argv: ['demo', 'db', 'create', 'my app'], why: 'Create a database for this directory' }]);
  });

  it('puts the calls a failure suggests first in the next steps, as commands, before the CLI\'s own', async () => {
    failure = {
      code: 'signed-out',
      message: 'Refused.',
      calls: [{ tool: 'create_thing', input: { thing_name: 'posts', replace: true }, why: 'Make it again' }]
    };
    const { meta } = (await run(['thing', 'connect'])).json();
    expect(meta.next).toEqual([
      { command: 'demo thing create posts --replace', argv: ['demo', 'thing', 'create', 'posts', '--replace'], why: 'Make it again' },
      { command: 'demo login', argv: ['demo', 'login'], why: 'Sign in' }
    ]);
  });

  it('gives no step, and does not fail the command, for a call no command can render', async () => {
    unrendered.length = 0;
    failure = {
      code: 'failed',
      message: 'Refused.',
      calls: [
        { tool: 'unbound_tool', input: {}, why: 'Nothing renders it' },
        { tool: 'create_thing', input: { thing_name: 'posts', colour: 'red' }, why: 'A key the command lacks' }
      ]
    };
    const result = await run(['thing', 'connect']);
    expect(result.json().error.code).toBe('failed');
    expect(result.json().meta.next ?? []).toEqual([]);
    expect(unrendered.map((entry) => entry.tool)).toEqual(['unbound_tool', 'create_thing']);
  });
});

describe('toolCallStep', () => {
  const entries = [
    toolCommand(deleteTool, { name: 'thing delete', positionals: ['thing_name'] }),
    toolCommand(createTool, {
      name: 'thing quick',
      input: quickInput,
      positionals: ['spec'],
      mapInput: ({ spec }: { spec: string }) => {
        const [thing_name, size] = spec.split(':');
        return { thing_name, size: Number(size) };
      }
    }),
    toolCommand(createTool, { name: 'thing create', positionals: ['thing_name'] }),
    toolCommand(connectTool, { name: 'thing connect' })
  ];
  const call = { tool: 'create_thing', input: { thing_name: 'posts', replace: true }, why: 'Make it again' };
  const step = toolCallStep(entries);
  // A command that renders the call with the renderer, inside a run, as a host such as the CLI's mcp command does.
  const probe: CommandDefinition = {
    name: 'probe',
    summary: 'Render a call',
    effect: 'read',
    run: (_input, ctx) => ({
      data: { plain: step(call, ctx), dropped: step(call, ctx, { drop: ['--as'] }), unbound: step({ tool: 'unbound_tool', input: {}, why: 'None' }, ctx) ?? null }
    })
  };
  const carrying = createCli({
    name: 'demo',
    version: '1.0.0',
    globals: z.object({ as: z.string().optional().meta({ description: 'Run as this agent', 'x-carry': true }) }),
    commands: [...toCliCommands(entries, { gate }), probe]
  });
  const runCarrying = async (argv: string[]) => {
    const stdout = capture();
    await carrying.run(argv, { stdin: new PassThrough(), stdout: stdout.stream, stderr: capture().stream, env: {}, cwd });
    return JSON.parse(stdout.text());
  };

  it('writes a call as the same command the steps of a failure give', async () => {
    failure = { code: 'failed', message: 'Refused.', calls: [call] };
    const fromFailure = (await runCarrying(['thing', 'connect', '--as', 'helper'])).meta.next[0];
    const { data } = await runCarrying(['probe', '--as', 'helper']);
    expect(data.plain).toEqual(fromFailure);
    expect(data.plain.argv).toEqual(['demo', '--as', 'helper', 'thing', 'create', 'posts', '--replace']);
    expect(data.unbound).toBeNull();
  });

  it('passes its step options on, so a carried flag can be left out', async () => {
    const { data } = await runCarrying(['probe', '--as', 'helper']);
    expect(data.dropped.argv).toEqual(['demo', 'thing', 'create', 'posts', '--replace']);
    expect(data.dropped.why).toBe('Make it again');
  });
});
