import { type ConfirmPrompt, defineHarnessTool, type GatePolicy, strictObject, type ToolFailure } from '@agentic-kit/harness';
import { Client, InMemoryTransport, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { z } from 'zod';

import { createMcpServerFactory } from '../src';

const cwd = '/tmp/agentic-mcp-project';
const runs: Array<{ tool: string; params: unknown; cwd: string }> = [];
const asked: string[] = [];
const state: { database: string; blocked?: ToolFailure } = { database: 'db-1' };

const listThings = defineHarnessTool({
  name: 'list_things',
  label: 'List things',
  description: 'List the things. Call create_thing to add one.',
  parameters: z.object({ prefix: z.string().optional() }),
  effect: 'read',
  async execute(params, ctx) {
    runs.push({ tool: 'list_things', params, cwd: ctx.cwd });
    return {
      content: [{ type: 'text', text: '2 things' }],
      details: { things: ['a', 'b'] },
      calls: [{ tool: 'create_thing', input: {}, why: 'Add a thing', choose: ['thing_name'] }]
    };
  }
});

const createThing = defineHarnessTool({
  name: 'create_thing',
  label: 'Create thing',
  description: 'Create a thing.',
  parameters: z.object({ thing_name: z.string().describe('Name of the thing') }),
  effect: 'write',
  async execute(params, ctx) {
    runs.push({ tool: 'create_thing', params, cwd: ctx.cwd });
    return { content: [{ type: 'text', text: `Created ${params.thing_name}` }], details: { created: params.thing_name } };
  }
});

const deleteThing = defineHarnessTool({
  name: 'delete_thing',
  label: 'Delete thing',
  description: 'Delete a thing.',
  parameters: z.object({ thing_name: z.string() }),
  effect: 'destructive',
  async execute(params, ctx) {
    runs.push({ tool: 'delete_thing', params, cwd: ctx.cwd });
    return { content: [{ type: 'text', text: `Deleted ${params.thing_name}` }], details: { deleted: params.thing_name } };
  }
});

const failure: ToolFailure = {
  code: 'permission-denied',
  message: 'This account may not change the thing.',
  hint: 'Call explain_access to see who may.',
  retryable: false,
  errorId: 'err-42',
  context: { table: 'things' },
  calls: [{ tool: 'explain_access', input: { table: 'things' }, why: 'See who may change it' }]
};

const failThing = defineHarnessTool({
  name: 'fail_thing',
  label: 'Fail thing',
  description: 'Always fails.',
  parameters: z.object({}),
  effect: 'read',
  async execute() {
    return { content: [{ type: 'text', text: `${failure.message} ${failure.hint}` }], details: { success: false }, failure };
  }
});

const throwThing = defineHarnessTool({
  name: 'throw_thing',
  label: 'Throw thing',
  description: 'Always throws.',
  parameters: z.object({}),
  effect: 'read',
  async execute() {
    // A thrown client error keeps the server's GraphQL errors, the logged one with its id.
    const error = Object.assign(new Error('relation "secret_private.thing" does not exist'), { errors: [{ message: 'Internal error', extensions: { errorId: 'err-123' } }] });
    error.stack = 'Error: relation "secret_private.thing" does not exist\n    at fetchWithToken (STACK-MARKER)';
    throw error;
  }
});

const tools = [listThings, createThing, deleteThing, failThing, throwThing];

const planOf = (input: Record<string, unknown> | undefined): ConfirmPrompt => ({
  title: 'Change it?',
  message: `Change ${JSON.stringify(input)}.`,
  target: {
    kind: 'database',
    database: { name: state.database, id: 'id-1' },
    apiEndpoint: 'http://api.localhost/graphql',
    account: { userId: 'user-1' }
  }
});

const gate: GatePolicy = {
  isGated: () => {
    throw new Error('The adapter must gate on the tool object, never by name.');
  },
  resolvePrompt: async (event, gateCwd) => {
    asked.push(`${event.toolName} in ${gateCwd}`);
    return state.blocked ? { kind: 'blocked', failure: state.blocked } : { kind: 'ask', prompt: planOf(event.input) };
  }
};

type Elicit = (message: string) => { action: 'accept' | 'decline' | 'cancel'; content?: Record<string, boolean> };

async function connect(options: { era?: 'legacy' | 'modern'; elicit?: Elicit; readOnly?: boolean; tools?: typeof tools; instructions?: string } = {}) {
  const factory = createMcpServerFactory({
    name: 'test-server',
    version: '1.0.0',
    tools: options.tools ?? tools,
    gate,
    cwd,
    readOnly: options.readOnly === true,
    instructions: options.instructions
  });
  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    {
      capabilities: options.elicit ? { elicitation: { form: {} } } : {},
      ...(options.era === 'modern' ? { versionNegotiation: { mode: { pin: '2026-07-28' as const } } } : {})
    }
  );
  if (options.elicit) {
    const elicit = options.elicit;
    client.setRequestHandler('elicitation/create', async (request) => elicit(request.params.message));
  }
  if (options.era === 'modern') {
    const handler = createMcpHandler(factory);
    await client.connect(new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
      fetch: (url, init) => handler.fetch(new Request(url, init))
    }));
    return { client, close: async () => { await client.close(); await handler.close(); } };
  }
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = factory();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

type Envelope = {
  ok: boolean;
  data?: any;
  plan?: ConfirmPrompt;
  error?: { code: string; message: string; hint?: string; retryable?: boolean; errorId?: string; context?: unknown };
  calls?: Array<{ tool: string; input: Record<string, unknown>; why: string; choose?: string[] }>;
};

const envelope = (result: { structuredContent?: unknown }): Envelope => result.structuredContent as Envelope;
const text = (result: { content?: unknown }): string =>
  (result.content as Array<{ type: string; text?: string }>).map((part) => part.text ?? '').join('\n');

let session: Awaited<ReturnType<typeof connect>> | undefined;
const open = async (options?: Parameters<typeof connect>[0]) => {
  session = await connect(options);
  return session.client;
};

beforeEach(() => {
  runs.length = 0;
  asked.length = 0;
  state.database = 'db-1';
  state.blocked = undefined;
});

afterEach(async () => {
  await session?.close();
  session = undefined;
});

describe('tools/list', () => {
  it('marks each write tool for the host to ask the person on every call, and serves no tool that can be destructive', async () => {
    const client = await open();
    const { tools: listed } = await client.listTools();
    const byName = Object.fromEntries(listed.map((tool) => [tool.name, tool]));
    expect(Object.keys(byName)).toEqual(['list_things', 'create_thing', 'fail_thing', 'throw_thing']);
    expect(byName.list_things).toMatchObject({ title: 'List things', description: 'List the things. Call create_thing to add one.' });
    expect(byName.list_things.annotations).toEqual({ readOnlyHint: true });
    expect(byName.list_things._meta).toBeUndefined();
    expect(byName.create_thing.annotations).toEqual({ readOnlyHint: false, destructiveHint: true, idempotentHint: false });
    expect(byName.create_thing._meta).toEqual({ 'anthropic/requiresUserInteraction': true });
    expect((byName.create_thing.inputSchema as any).properties).toEqual({ thing_name: { type: 'string', description: 'Name of the thing' } });
    await expect(client.callTool({ name: 'delete_thing', arguments: { thing_name: 'a' } })).rejects.toThrow(/not found/);
    expect(runs).toEqual([]);
  });

  it('serves only the tools whose effect is read when read-only', async () => {
    const client = await open({ readOnly: true });
    const { tools: listed } = await client.listTools();
    expect(listed.map((tool) => tool.name)).toEqual(['list_things', 'fail_thing', 'throw_thing']);
  });
});

describe('a read', () => {
  it('runs without the gate, with the text as content and the details and calls as data', async () => {
    const client = await open({ elicit: () => ({ action: 'decline' }) });
    const result = await client.callTool({ name: 'list_things', arguments: { prefix: 'a' } });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toBe('2 things');
    expect(envelope(result)).toEqual({
      ok: true,
      data: { things: ['a', 'b'] },
      calls: [{ tool: 'create_thing', input: {}, why: 'Add a thing', choose: ['thing_name'] }]
    });
    expect(runs).toEqual([{ tool: 'list_things', params: { prefix: 'a' }, cwd }]);
    expect(asked).toEqual([]);
  });
});

describe('a change on a connection without elicitation', () => {
  it('runs once on the call the host let through, and its result gives what changed and the plan', async () => {
    const client = await open();
    const result = await client.callTool({ name: 'create_thing', arguments: { thing_name: 'a' } });
    expect(result.isError).toBeFalsy();
    expect(envelope(result)).toEqual({ ok: true, data: { created: 'a' }, plan: planOf({ thing_name: 'a' }) });
    expect(text(result)).toMatch(/^Created a\n/);
    expect(text(result)).toContain('Change {"thing_name":"a"}.');
    expect(text(result)).toContain('Database: "db-1" (ID id-1)');
    expect(runs).toEqual([{ tool: 'create_thing', params: { thing_name: 'a' }, cwd }]);
    expect(asked).toEqual([`create_thing in ${cwd}`]);
  });
});

describe.each(['legacy', 'modern'] as const)('a change on a %s connection with form elicitation', (era) => {
  it('shows the plan once, and applies the change when the person accepts the form as given', async () => {
    const messages: string[] = [];
    const client = await open({ era, elicit: (message) => (messages.push(message), { action: 'accept', content: {} }) });
    const result = await client.callTool({ name: 'create_thing', arguments: { thing_name: 'a' } });
    expect(envelope(result)).toEqual({ ok: true, data: { created: 'a' }, plan: planOf({ thing_name: 'a' }) });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('Change {"thing_name":"a"}.');
    expect(messages[0]).toContain('Database: "db-1" (ID id-1)');
    expect(runs).toEqual([{ tool: 'create_thing', params: { thing_name: 'a' }, cwd }]);
  });

  it.each([
    ['declines', { action: 'decline' as const }],
    ['closes the preview', { action: 'cancel' as const }],
    ['accepts after unticking the box', { action: 'accept' as const, content: { apply: false } }]
  ])('changes nothing when the person %s, and says so with the plan', async (_case, answer) => {
    const client = await open({ era, elicit: () => answer });
    const result = await client.callTool({ name: 'create_thing', arguments: { thing_name: 'a' } });
    expect(result.isError).toBe(true);
    expect(envelope(result).error).toMatchObject({ code: 'cancelled', message: expect.stringMatching(/nothing was changed/) });
    expect(envelope(result).plan).toEqual(planOf({ thing_name: 'a' }));
    expect(text(result)).toContain('Database: "db-1" (ID id-1)');
    expect(runs).toEqual([]);
  });
});

describe('a blocked change', () => {
  it('stops with the failure and its calls, without asking anyone', async () => {
    state.blocked = { code: 'signed-out', message: 'No one is signed in.', hint: 'Sign in.', calls: [{ tool: 'describe_schema', input: {}, why: 'Check the session' }] };
    const messages: string[] = [];
    const client = await open({ elicit: (message) => (messages.push(message), { action: 'accept', content: { apply: true } }) });
    const result = await client.callTool({ name: 'create_thing', arguments: { thing_name: 'a' } });
    expect(result.isError).toBe(true);
    expect(envelope(result)).toEqual({
      ok: false,
      error: { code: 'signed-out', message: 'No one is signed in.', hint: 'Sign in.' },
      calls: [{ tool: 'describe_schema', input: {}, why: 'Check the session' }]
    });
    expect(text(result)).toBe('No one is signed in. Sign in.');
    expect(messages).toEqual([]);
    expect(runs).toEqual([]);
  });
});

describe('a failure', () => {
  it('is an error with the failure, the details and the calls as data, and tool names left as they are', async () => {
    const client = await open();
    const result = await client.callTool({ name: 'fail_thing', arguments: {} });
    expect(result.isError).toBe(true);
    expect(text(result)).toBe('This account may not change the thing. Call explain_access to see who may.');
    expect(envelope(result)).toEqual({
      ok: false,
      error: {
        code: 'permission-denied',
        message: 'This account may not change the thing.',
        hint: 'Call explain_access to see who may.',
        retryable: false,
        errorId: 'err-42',
        context: { table: 'things' }
      },
      data: { success: false },
      calls: [{ tool: 'explain_access', input: { table: 'things' }, why: 'See who may change it' }]
    });
  });

  it('is failed, with a fixed sentence and the error id, but no text or stack of the error, when the tool throws', async () => {
    const client = await open();
    const result = await client.callTool({ name: 'throw_thing', arguments: {} });
    expect(result.isError).toBe(true);
    expect(envelope(result).error).toMatchObject({ code: 'failed', message: expect.stringContaining('The tool throw_thing failed'), errorId: 'err-123' });
    expect(envelope(result).error.message).toContain('Error id: err-123');
    expect(JSON.stringify(result)).not.toMatch(/STACK-MARKER|secret_private|does not exist/);
  });
});

describe('null for an optional key, as a host with strict function calling sends it', () => {
  const findThings = defineHarnessTool({
    name: 'find_things',
    label: 'Find things',
    description: 'Find things.',
    parameters: strictObject('the input of find_things', { prefix: z.string().optional() }),
    effect: 'read',
    async execute(params, ctx) {
      runs.push({ tool: 'find_things', params, cwd: ctx.cwd });
      return { content: [{ type: 'text', text: 'found' }], details: {} };
    }
  });
  const setThing = defineHarnessTool({
    name: 'set_thing',
    label: 'Set thing',
    description: 'Set a thing.',
    parameters: strictObject('the input of set_thing', {
      thing_name: z.string(),
      note: z.string().optional(),
      default_value: z.union([z.string(), z.null()]).optional().describe('null removes the default')
    }),
    effect: 'write',
    async execute(params, ctx) {
      runs.push({ tool: 'set_thing', params, cwd: ctx.cwd });
      return { content: [{ type: 'text', text: 'set' }], details: {} };
    }
  });
  const nullTools = [findThings, setThing];

  it('reaches a read tool as not given', async () => {
    const client = await open({ tools: nullTools });
    const result = await client.callTool({ name: 'find_things', arguments: { prefix: null } });
    expect(envelope(result).ok).toBe(true);
    expect(runs).toHaveLength(1);
    expect(runs[0].params).not.toHaveProperty('prefix', null);
  });

  it('reaches a tool whose parameters are a plain zod object as not given, by the same rule', async () => {
    const client = await open();
    const result = await client.callTool({ name: 'list_things', arguments: { prefix: null } });
    expect(envelope(result).ok).toBe(true);
    expect(runs).toEqual([{ tool: 'list_things', params: {}, cwd }]);
  });

  it('lists each key with its own schema, and no key of the server', async () => {
    const client = await open({ tools: nullTools });
    const byName = Object.fromEntries((await client.listTools()).tools.map((tool) => [tool.name, tool.inputSchema as any]));
    expect(byName.find_things.properties).toEqual({ prefix: { type: 'string' } });
    expect(byName.set_thing.properties).toEqual({
      thing_name: { type: 'string' },
      note: { type: 'string' },
      default_value: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'null removes the default' }
    });
    expect(byName.set_thing.required).toEqual(['thing_name']);
  });
});

describe('server instructions', () => {
  it('say to call the read tools first, name the tools that change things and that the host asks the person, and stay under 4,096 characters', async () => {
    const client = await open();
    const instructions = client.getInstructions();
    expect(instructions.length).toBeLessThan(4096);
    expect(instructions).toMatch(/read tools first/);
    expect(instructions).toContain('list_things, fail_thing and throw_thing');
    expect(instructions).toContain('create_thing');
    expect(instructions).toMatch(/asks the person/);
    expect(instructions).not.toMatch(/delete_thing/);
  });

  it('say in read-only mode that nothing changes through this server, and name no change tool', async () => {
    const client = await open({ readOnly: true });
    const instructions = client.getInstructions();
    expect(instructions).toMatch(/only tools that read/);
    expect(instructions).toContain('list_things');
    expect(instructions).not.toContain('create_thing');
  });

  it.each(['legacy', 'modern'] as const)('end with the host\'s own instructions on a %s connection', async (era) => {
    const client = await open({ era, instructions: 'You act as the agent "helper" of the person.' });
    const instructions = client.getInstructions();
    expect(instructions).toMatch(/read tools first/);
    expect(instructions.endsWith('\n\nYou act as the agent "helper" of the person.')).toBe(true);
  });
});
