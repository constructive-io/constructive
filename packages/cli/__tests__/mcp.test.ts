import { constructiveDbTools } from '@agentic-kit/db-tools';
import { createMcpServerFactory } from '@agentic-kit/mcp';
import { addBackend, backendFromEndpoints, openStore, OVERRIDE_ENV_VARS, selectBackend } from '@agentic-kit/session';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PassThrough, Writable } from 'stream';

import { createConstructiveCli } from '../src/cli';
import { mcpOptions } from '../src/commands/mcp';
import { configureTools } from '../src/session';
import { commandContext } from '../test-utils/command-context';
import { storeSignedIn } from '../test-utils/sessions';

// Records have no command yet, and a new API key is a secret in the result; a tool that can lose data is never served.
const NOT_SERVED = ['add_records', 'create_api_key'];
const BINDING = 'DATABASE_ID=00000000-0000-4000-8000-000000000001\nDATABASE_NAME=demo\n';
const bound = constructiveDbTools.filter((tool) => !NOT_SERVED.includes(tool.name));
const reads = bound.filter((tool) => tool.effect === 'read').map((tool) => tool.name).sort();
const writes = bound.filter((tool) => tool.effect === 'write').map((tool) => tool.name).sort();

let stash: string;
let project: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
  stash = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-stash-'));
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-project-'));
  env = { ...process.env, CONSTRUCTIVE_STASH_DIR: stash };
  for (const name of OVERRIDE_ENV_VARS) delete env[name];
  // A backend on a closed port, with no one signed in: no request reaches a real backend.
  const store = openStore(stash);
  const closed = Object.fromEntries(['api', 'auth', 'modules', 'agent', 'compute'].map((plane) => [plane, `http://127.0.0.1:1/${plane}/graphql`]));
  selectBackend(store, addBackend(store, backendFromEndpoints(closed as { api: string }), 'closed.test').name);
});

afterEach(() => {
  fs.rmSync(stash, { recursive: true, force: true });
  fs.rmSync(project, { recursive: true, force: true });
});

const signIn = () => storeSignedIn(openStore(stash));

async function run(argv: string[]) {
  let out = '';
  let err = '';
  const stdout = new Writable({ write(chunk, _encoding, done) { out += chunk; done(); } });
  const stderr = new Writable({ write(chunk, _encoding, done) { err += chunk; done(); } });
  const code = await createConstructiveCli().run(argv, { stdin: new PassThrough(), stdout, stderr, env, cwd: project });
  const envelope = (text: string) => (text.trimStart().startsWith('{') ? JSON.parse(text) : undefined);
  return { code, out, err, json: envelope(out), error: envelope(err) };
}

/** The server `constructive mcp` serves, on an in-memory pair, with the tools bound to the session as its run binds them. */
async function connect(readOnly = false) {
  const { ctx, session } = await commandContext([], { env, cwd: project });
  configureTools(session);
  const server = createMcpServerFactory(mcpOptions(ctx, readOnly, session))();
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

describe('the mcp command', () => {
  it('is labeled with the strongest effect its tools give it, and tells an agent host how to start it and who approves a write', async () => {
    const manifest = JSON.parse((await run(['--llms', '--json'])).out);
    expect(manifest.commands.find((command: { name: string }) => command.name === 'mcp')).toMatchObject({ effect: 'write', stdout: 'reserved' });
    const { code, out } = await run(['mcp', '--help']);
    expect(code).toBe(0);
    expect(out).toContain('{ "command": "constructive", "args": ["mcp", "--as", "<name>", "--read-only"] }');
    expect(out).toContain('--write');
    expect(out).toContain('asks the host to get the person to approve every call');
    expect(out).not.toMatch(/digest|approved_plan/);
  });

  it('refuses --dry-run and --yes before it serves anything: it has no plan, and --yes approves nothing here', async () => {
    const dryRun = await run(['mcp', '--dry-run', '--json']);
    expect(dryRun.code).toBe(2);
    expect(dryRun.error.error.code).toBe('dry-run-unsupported');
    const yes = await run(['mcp', '--yes', '--json']);
    expect(yes.code).toBe(2);
    expect(yes.error.error).toMatchObject({ code: 'invalid-input', details: { flag: '--yes' } });
    expect(dryRun.out + yes.out).toBe('');
  });

  it('refuses --write with --read-only before it serves anything', async () => {
    const { code, out, error } = await run(['mcp', '--write', '--read-only', '--json']);
    expect(code).toBe(2);
    expect(error.error).toMatchObject({ code: 'invalid-input', details: { flag: '--write' } });
    expect(out).toBe('');
  });

  it('refuses to start on a --context that does not exist, which only the host settings can fix', async () => {
    const { code, out, error } = await run(['--context', 'nope', 'mcp', '--json']);
    expect(code).toBe(2);
    expect(error.error.code).toBe('unknown-context');
    expect(out).toBe('');
  });

  it('serves the tools the CLI binds that read and write, under their own names, each write marked for the host to ask the person', async () => {
    const { client, close } = await connect();
    try {
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name).sort()).toEqual([...reads, ...writes].sort());
      for (const tool of tools) {
        const write = writes.includes(tool.name);
        expect(tool.annotations?.readOnlyHint).toBe(!write);
        expect(tool._meta?.['anthropic/requiresUserInteraction']).toBe(write ? true : undefined);
      }
    } finally {
      await close();
    }
  });

  it('serves only the tools that read with --read-only', async () => {
    const { client, close } = await connect(true);
    try {
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name).sort()).toEqual(reads);
    } finally {
      await close();
    }
  });

  it('tells the host with --read-only how the person makes a change, after the server says once that nothing changes through it', async () => {
    const readOnly = await connect(true);
    try {
      const words = readOnly.client.getInstructions();
      expect(words.match(/only tools that read|only the tools that read/g)).toHaveLength(1);
      expect(words).toContain('"constructive field add <table> <name> --type <type>"');
      expect(words).not.toContain('agent grant');
    } finally {
      await readOnly.close();
    }
    const full = await connect(false);
    try {
      expect(full.client.getInstructions()).not.toContain('field add');
    } finally {
      await full.close();
    }
  });

  it('answers a read signed out with the true failure, as data', async () => {
    fs.writeFileSync(path.join(project, '.env'), BINDING);
    const { client, close } = await connect();
    try {
      const result = await client.callTool({ name: 'describe_schema', arguments: {} });
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({ ok: false, error: { code: 'signed-out', hint: expect.stringContaining('constructive login') } });
    } finally {
      await close();
    }
  });

  it('sees a sign-in made while it runs, without a restart', async () => {
    fs.writeFileSync(path.join(project, '.env'), BINDING);
    const { client, close } = await connect();
    try {
      const before = await client.callTool({ name: 'describe_schema', arguments: {} });
      expect(before.structuredContent).toMatchObject({ error: { code: 'signed-out' } });
      signIn();
      const after = await client.callTool({ name: 'describe_schema', arguments: {} });
      expect((after.structuredContent as { error?: { code: string } }).error?.code).not.toBe('signed-out');
    } finally {
      await close();
    }
  });

  it('puts a change through the gate of the commands: with no database bound, it changes nothing and suggests the call that makes one', async () => {
    signIn();
    const { client, close } = await connect();
    try {
      const params = { table_name: 'notes', field_name: 'title', type: 'text' };
      const result = await client.callTool({ name: 'create_field', arguments: params });
      expect(result.structuredContent).toMatchObject({
        ok: false,
        error: { code: 'no-env' },
        calls: [{ tool: 'provision_database', input: {}, choose: ['database_name'] }]
      });
    } finally {
      await close();
    }
  });
});

describe('constructive mcp in its own process', () => {
  const requests = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'probe', version: '1.0.0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'describe_schema', arguments: {} } }
  ];

  /** Runs the entry point with `args`, sends the requests one line each, and closes stdin once every request has an answer. */
  function exchange(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-r', require.resolve('ts-node/register/transpile-only'), path.join(__dirname, '..', 'src', 'index.ts'), ...args], {
        cwd: project,
        env: { PATH: process.env.PATH, HOME: stash, CONSTRUCTIVE_STASH_DIR: stash, TS_NODE_PROJECT: path.join(__dirname, '..', 'tsconfig.json') },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`constructive mcp did not answer every request. stdout: ${stdout} stderr: ${stderr}`));
      }, 50_000);
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
        const answered = stdout.split('\n').filter(Boolean).flatMap((line) => {
          try {
            return [JSON.parse(line).id];
          } catch {
            return [];
          }
        });
        if ([1, 2, 3].every((id) => answered.includes(id))) child.stdin.end();
      });
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.on('error', reject);
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, code });
      });
      for (const request of requests) child.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }

  /** Runs the entry point with `args` and stdin closed at once, for a run that must stop before it serves. */
  function start(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-r', require.resolve('ts-node/register/transpile-only'), path.join(__dirname, '..', 'src', 'index.ts'), ...args], {
        cwd: project,
        env: { PATH: process.env.PATH, HOME: stash, CONSTRUCTIVE_STASH_DIR: stash, TS_NODE_PROJECT: path.join(__dirname, '..', 'tsconfig.json') },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.on('error', reject);
      child.on('close', (code) => resolve({ stdout, stderr, code }));
      child.stdin.end();
    });
  }

  it.each([
    [['mcp', '--yes'], 'invalid-input'],
    [['mcp', '--bogus'], 'unknown-flag'],
    [['--context', 'nope', 'mcp'], 'unknown-context'],
    [['mcp', '--dry-run'], 'dry-run-unsupported']
  ])('writes nothing to stdout when %j stops at start, and its error to stderr with exit 2 (review R2 L2)', async (args, code) => {
    const result = await start([...args, '--json']);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr).error.code).toBe(code);
  }, 60_000);

  it.each([[[] as string[], reads], [['--write'], [...reads, ...writes].sort()]])(
    'serves on stdio with %j: every byte of stdout is protocol, and a read signed out answers its failure',
    async (flags, expected) => {
      fs.writeFileSync(path.join(project, '.env'), BINDING);
      const { stdout, stderr, code } = await exchange(['mcp', ...flags]);
      expect(code).toBe(0);
      expect(stdout.endsWith('\n')).toBe(true);
      const messages = stdout.slice(0, -1).split('\n').map((line) => JSON.parse(line));
      for (const message of messages) expect(message.jsonrpc).toBe('2.0');
      const byId = Object.fromEntries(messages.map((message) => [message.id, message]));
      expect(byId[1].result.serverInfo.name).toBe('constructive');
      const listed = byId[2].result.tools as Array<{ name: string }>;
      expect(listed.map((tool) => tool.name).sort()).toEqual(expected);
      expect(byId[3].result).toMatchObject({ isError: true, structuredContent: { ok: false, error: { code: 'signed-out' } } });
      expect(stderr).toContain('constructive mcp: ');
    },
    120_000
  );
});
