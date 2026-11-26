import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createConfirmGate, createConstructiveGatePolicy, type GateHost, type PlanTarget } from '@agentic-kit/harness';

import { constructiveDbTools, constructiveGateDeps } from '../src';
import type { RunCommand } from '../src/app-workspace';
import { configureHost } from '../src/host';
import { createRunCodegenTool } from '../src/tools/run-codegen';
import { DATABASE_ID, type FakeBackend, type GraphQLAnswer, projectAnswer, type SeenRequest, startFakeBackend } from './fake-backend';

// The review of Milestone 0 (finding H1) ran these two calls: the gate let
// each through with no prompt, and the tool then changed state.

let cwd: string;
let backend: FakeBackend;
let asked: number;

// A host that declines every prompt it is shown.
const decliningHost = (): GateHost => ({
  hasUI: true,
  confirmTool: async () => {
    asked += 1;
    return false;
  },
  notifyToolSkipped: () => undefined,
});

beforeEach(() => {
  cwd = mkdtempSync(path.join(os.tmpdir(), 'db-gate-precondition-'));
  asked = 0;
});
afterEach(async () => {
  rmSync(cwd, { recursive: true, force: true });
  await backend?.close();
  backend = undefined;
});

const bind = () => writeFileSync(path.join(cwd, '.env'), `DATABASE_ID=${DATABASE_ID}\nDATABASE_NAME=mydb\n`);

describe('a gated call never runs unasked', () => {
  it('asks before create_api_key on a database another account owns', async () => {
    // create_api_key acts on the data plane, where another account's live
    // database serves as it does in the Preview, so its check passes: the gate asks.
    backend = await startFakeBackend(({ query }) => projectAnswer(query, 'OTHER-ACCOUNT') ?? { data: {} });
    const delivered: string[] = [];
    configureHost({
      account: () => ({ userId: 'ME', accessToken: 'account-bearer' }),
      backendConfig: () => ({ apiEndpoint: backend.endpoint(), modulesEndpoint: backend.endpoint('modules.localhost') }),
      previewToken: async () => ({ accessToken: 'app-user-token', userId: 'U1' }),
      deliverSecret: async (delivery) => {
        delivered.push(delivery.envVar);
      },
    });
    bind();

    const tool = constructiveDbTools.find((candidate) => candidate.name === 'create_api_key');
    const input = { key_name: 'deploy bot' };
    const result = await createConfirmGate(constructiveGateDeps()).onToolCall(
      { toolName: tool.name, toolCallId: 'tc-1', input },
      decliningHost(),
      cwd,
    );
    // What every adapter does: run the tool only when the gate lets the call through.
    if (!result) await tool.execute(tool.parameters.parse(input), { cwd });

    expect(asked).toBe(1);
    expect(result).toMatchObject({ block: true });
    expect(delivered).toEqual([]);
  });

  it.each([
    ['there is no .env', false, 'no-env'],
    ['no one is signed in', true, 'signed-out'],
  ])('blocks run_codegen before any child process when %s', async (_case, bound, code) => {
    configureHost({
      account: () => null,
      backendConfig: () => ({ apiEndpoint: 'http://127.0.0.1:9/graphql', modulesEndpoint: 'http://127.0.0.1:9/graphql' }),
    });
    if (bound) bind();
    const commands: string[] = [];
    const exec: RunCommand = async (cmd, args) => {
      commands.push(`${cmd} ${args.join(' ')}`);
      return { ok: true, out: '' };
    };

    const blocked = await createConfirmGate(constructiveGateDeps()).onToolCall(
      { toolName: 'run_codegen', toolCallId: 'tc-1', input: {} },
      decliningHost(),
      cwd,
    );
    const result = await createRunCodegenTool(exec).execute({}, { cwd });

    expect(blocked?.failure?.code).toBe(code);
    expect(result.failure).toEqual(blocked.failure);
    expect(asked).toBe(0);
    expect(commands).toEqual([]);
    expect(readdirSync(cwd).filter((name) => name !== '.env')).toEqual([]);
  });
});

// What the named things are: the table "posts" (on the control plane and on the app's API) and the template "Blog".
function namedAnswer({ host, query }: SeenRequest): GraphQLAnswer {
  if (host.startsWith('api-mydb.')) return { data: { _meta: { tables: [{ name: 'Post', query: { all: 'posts' }, inflection: { tableType: 'Post' }, fields: [] }] } } };
  if (/blueprintTemplates/.test(query)) return { data: { blueprintTemplates: { nodes: [{ id: 'tpl-1', displayName: 'Blog', definition: {} }] } } };
  if (/uniqueConstraints/.test(query)) return { data: { uniqueConstraints: { nodes: [] } } };
  if (/\bfields\b/.test(query)) return { data: { fields: { nodes: [] } } };
  if (/\btables\b/.test(query)) return { data: { tables: { nodes: [{ id: 't1', name: 'posts' }] } } };
  return { data: {} };
}

describe('the plan names what the call acts on', () => {
  const account = { userId: 'ME' };
  const onDatabase = (extra: Partial<PlanTarget> = {}): PlanTarget =>
    ({ kind: 'database', database: { name: 'mydb', id: DATABASE_ID }, apiEndpoint: backend.endpoint(), account, ...extra }) as PlanTarget;
  const onAccount = (extra: Partial<PlanTarget> = {}): PlanTarget =>
    ({ kind: 'account', apiEndpoint: backend.endpoint(), account, ...extra }) as PlanTarget;

  beforeEach(async () => {
    backend = await startFakeBackend((request) => projectAnswer(request.query, 'ME') ?? namedAnswer(request));
    configureHost({
      account: () => ({ userId: 'ME', accessToken: 'account-bearer' }),
      backendConfig: () => ({ apiEndpoint: backend.endpoint(), modulesEndpoint: backend.endpoint('modules.localhost') }),
      previewToken: async () => ({ accessToken: 'app-user-token', userId: 'U1' }),
    });
    bind();
  });

  it.each<[string, Record<string, unknown>, () => PlanTarget]>([
    ['delete_table', { table_name: 'posts' }, () => onDatabase()],
    ['add_records', { table_name: 'posts', records: [{ title: 'a' }] }, () => onDatabase({ appUserId: 'U1' })],
    ['delete_template', { templateName: 'Blog' }, () => onAccount()],
    ['provision_database', { database_name: 'next' }, () => onAccount()],
    ['replace_database', { database_name: 'next' }, () => onAccount({ replaces: { name: 'mydb', id: DATABASE_ID } })],
  ])('%s %j: the precondition resolves the target, and the plan carries it', async (name, input, target) => {
    const deps = constructiveGateDeps();

    const ready = await deps.precondition(name, input, cwd);
    const decision = await createConstructiveGatePolicy(deps).resolvePrompt({ toolName: name, toolCallId: 'tc-1', input }, cwd);

    expect(ready).toEqual({ kind: 'ready', target: target() });
    expect(decision).toMatchObject({ kind: 'ask', prompt: { target: target() } });
  });
});

// What the backend answers when the sign-in has ended: each public code that means it, and an HTTP 401 with no code.
const refusedWith = (code: string, message: string): GraphQLAnswer => ({ data: null, errors: [{ message, extensions: { code, class: 'public' } }] });
const SIGNED_OUT_ANSWERS: Array<[string, GraphQLAnswer]> = [
  ['UNAUTHENTICATED', refusedWith('UNAUTHENTICATED', 'Unauthenticated.')],
  ['NOT_AUTHENTICATED', refusedWith('NOT_AUTHENTICATED', 'Not authenticated.')],
  ['USER_NOT_AUTHENTICATED', refusedWith('USER_NOT_AUTHENTICATED', 'You must be signed in to do that.')],
  ['an HTTP 401', { status: 401, data: null, errors: [{ message: 'Unauthorized' }] }],
];

describe('a refused sign-in is signed-out, whatever request it answers', () => {
  const signedInHost = () =>
    configureHost({
      account: () => ({ userId: 'ME', accessToken: 'account-bearer' }),
      backendConfig: () => ({ apiEndpoint: backend.endpoint(), modulesEndpoint: backend.endpoint('modules.localhost') }),
    });

  it.each(SIGNED_OUT_ANSWERS)('describe_schema: the database check passes, and the schema read answers %s', async (_case, refused) => {
    backend = await startFakeBackend((request) => (/schemas/.test(request.query) ? refused : (projectAnswer(request.query, 'ME') ?? namedAnswer(request))));
    signedInHost();
    bind();
    const describe = constructiveDbTools.find((tool) => tool.name === 'describe_schema');

    const result = await describe.execute({}, { cwd });
    const ready = await constructiveGateDeps().precondition('describe_schema', {}, cwd);

    expect(backend.requests.map((request) => (/ProbeDatabase/.test(request.query) ? 'probe' : /schemas/.test(request.query) ? 'schema' : 'other')).slice(0, 2)).toEqual(['probe', 'schema']);
    expect(result.failure).toMatchObject({ code: 'signed-out' });
    expect(ready).toMatchObject({ kind: 'blocked', failure: { code: 'signed-out' } });
  });

  it.each(SIGNED_OUT_ANSWERS.filter(([name]) => name.endsWith('NOT_AUTHENTICATED')))('the database check itself answers %s', async (_case, refused) => {
    backend = await startFakeBackend((request) => (/ProbeDatabase/.test(request.query) ? refused : (projectAnswer(request.query, 'ME') ?? namedAnswer(request))));
    signedInHost();
    bind();

    const ready = await constructiveGateDeps().precondition('describe_schema', {}, cwd);

    expect(ready).toMatchObject({ kind: 'blocked', failure: { code: 'signed-out' } });
  });
});

describe('the account a plan names', () => {
  it('names the agent the person acts as, for a change to the database and for a new one', async () => {
    const agent = { name: 'shop', principalId: 'p-1' };
    backend = await startFakeBackend((request) => projectAnswer(request.query, 'ME') ?? namedAnswer(request));
    configureHost({
      account: () => ({ userId: 'ME', email: 'me@example.com', accessToken: 'agent-bearer', agent }),
      backendConfig: () => ({ apiEndpoint: backend.endpoint(), modulesEndpoint: backend.endpoint('modules.localhost') }),
    });
    bind();

    const deps = constructiveGateDeps();
    const onTable = await deps.precondition('delete_table', { table_name: 'posts' }, cwd);
    const newDatabase = await deps.precondition('provision_database', { database_name: 'next' }, cwd);

    expect(onTable).toMatchObject({ kind: 'ready', target: { account: { userId: 'ME', email: 'me@example.com', agent } } });
    expect(newDatabase).toMatchObject({ kind: 'ready', target: { account: { userId: 'ME', email: 'me@example.com', agent } } });
  });

  it('carries the email the host gives beside the user id', async () => {
    backend = await startFakeBackend((request) => projectAnswer(request.query, 'ME') ?? namedAnswer(request));
    configureHost({
      account: () => ({ userId: 'ME', email: 'me@example.com', accessToken: 'account-bearer' }),
      backendConfig: () => ({ apiEndpoint: backend.endpoint(), modulesEndpoint: backend.endpoint('modules.localhost') }),
    });
    bind();

    const deps = constructiveGateDeps();
    const onTable = await deps.precondition('delete_table', { table_name: 'posts' }, cwd);
    const newDatabase = await deps.precondition('provision_database', { database_name: 'next' }, cwd);

    expect(onTable).toMatchObject({ kind: 'ready', target: { account: { userId: 'ME', email: 'me@example.com' } } });
    expect(newDatabase).toMatchObject({ kind: 'ready', target: { account: { userId: 'ME', email: 'me@example.com' } } });
  });
});
