import { toolCommand } from '@agentic-kit/command';
import { describeSchemaTool } from '@agentic-kit/db-tools';
import type { ToolCallSuggestion } from '@agentic-kit/harness';
import { addBackend, backendFromEndpoints, openStore, OVERRIDE_ENV_VARS, selectBackend } from '@agentic-kit/session';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PassThrough, Writable } from 'stream';

import { createConstructiveCli } from '../src/cli';
import { OWNER_NODE, OWNER_ONLY_RULE } from '../src/commands/access';
import { createToolCommands, toolEntries } from '../src/commands/tools';
import { storeSignedIn } from '../test-utils/sessions';

// The CLI binds no command to these tools on purpose, so a call of them has no step: records and API keys come later.
const NOT_BOUND = new Set(['add_records', 'create_api_key']);

const RULE = JSON.stringify(OWNER_ONLY_RULE);

let stash: string;
let project: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
  stash = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-stash-'));
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-project-'));
  // A scaffolded app, so db codegen never fetches its template.
  fs.mkdirSync(path.join(project, 'packages', 'app'), { recursive: true });
  fs.writeFileSync(path.join(project, 'packages', 'app', 'package.json'), '{}');
  env = { ...process.env, CONSTRUCTIVE_STASH_DIR: stash };
  for (const name of OVERRIDE_ENV_VARS) delete env[name];
  // A backend on a closed port: no request reaches a real one.
  const store = openStore(stash);
  const closed = Object.fromEntries(['api', 'auth', 'modules', 'agent', 'compute'].map((plane) => [plane, `http://127.0.0.1:1/${plane}/graphql`]));
  const backend = backendFromEndpoints(closed as { api: string });
  selectBackend(store, addBackend(store, backend, 'closed.test').name);
});

afterEach(() => {
  fs.rmSync(stash, { recursive: true, force: true });
  fs.rmSync(project, { recursive: true, force: true });
});

const signIn = () => {
  const store = openStore(stash);
  storeSignedIn(store);
};

/** A suggested call no command makes fails the run, unless its tool is one the CLI does not bind. */
function throwOnUnrendered(call: ToolCallSuggestion, reason: string): void {
  if (!NOT_BOUND.has(call.tool)) throw new Error(`No command makes the suggested call ${JSON.stringify(call)}: ${reason}`);
}

async function run(cli: ReturnType<typeof createConstructiveCli>, argv: string[]) {
  let out = '';
  const stdout = new Writable({ write(chunk, _encoding, done) { out += chunk; done(); } });
  const code = await cli.run([...argv, '--json'], { stdin: new PassThrough(), stdout, stderr: new PassThrough(), env, cwd: project });
  return { code, json: JSON.parse(out) };
}

describe('the calls a tool suggests', () => {
  // One call of each kind the tools suggest, and the step this CLI gives for it.
  const CALLS: Array<[ToolCallSuggestion, string[] | undefined]> = [
    [{ tool: 'describe_policy_type', input: { type: 'AuthzEntityMembership' }, why: 'its parameters' }, ['access', 'types', 'AuthzEntityMembership']],
    [
      { tool: 'update_field', input: { table_name: 'notes', field_name: 'entity_id', is_required: false }, why: 'make it optional' },
      ['field', 'update', 'notes', 'entity_id', '--no-is-required']
    ],
    [{ tool: 'delete_field', input: { table_name: 'notes', field_name: 'entity_id' }, why: 'drop it' }, ['field', 'delete', 'notes', 'entity_id']],
    [{ tool: 'retype_field', input: { table_name: 'notes', field_name: 'title', type: 'integer' }, why: 'retype' }, ['field', 'retype', 'notes', 'title', '--type', 'integer']],
    [{ tool: 'describe_schema', input: {}, why: 'the tables' }, ['schema', 'show']],
    [{ tool: 'list_templates', input: {}, why: 'the templates' }, ['template', 'list']],
    [{ tool: 'list_entity_types', input: {}, why: 'the entity types' }, ['entity-type', 'list']],
    [{ tool: 'create_entity_type', input: { name: 'team' }, why: 'create it' }, ['entity-type', 'create', 'team']],
    [
      { tool: 'delete_entity_type', input: { entity_type_id: '00000000-0000-4000-8000-000000000002' }, why: 'delete it' },
      ['entity-type', 'delete', '00000000-0000-4000-8000-000000000002']
    ],
    [
      { tool: 'add_relation', input: { source_table: 'notes', target_table: 'users' }, why: 'another name', choose: ['field_name'] },
      ['relation', 'add', 'notes', 'users', '--field-name', '<field_name>']
    ],
    [{ tool: 'provision_database', input: {}, why: 'a database', choose: ['database_name'] }, ['db', 'create', '<database_name>']],
    [{ tool: 'provision_database', input: { database_name: 'shop' }, why: 'keep waiting' }, ['db', 'create', 'shop']],
    [{ tool: 'replace_database', input: {}, why: 'replace it', choose: ['database_name'] }, ['db', 'recreate', '<database_name>']],
    [{ tool: 'explain_access', input: { table_name: 'notes' }, why: 'the access' }, ['access', 'explain', 'notes']],
    [{ tool: 'set_access', input: { table_name: 'notes', policies: [OWNER_ONLY_RULE] }, why: 'again' }, ['access', 'set', 'notes', '--rule', RULE]],
    [{ tool: 'run_codegen', input: {}, why: 'the SDK' }, ['db', 'codegen']],
    [{ tool: 'create_api_key', input: { key_name: 'ci' }, why: 'another name', choose: ['principal_name'] }, undefined]
  ];

  it('makes each one a step of the command bound to its tool, and leaves out only the tools the CLI does not bind', async () => {
    const suggest = toolCommand(
      { ...describeSchemaTool, name: 'suggest_calls', execute: async () => ({ content: [], details: {}, calls: CALLS.map(([call]) => call) }) },
      { name: 'suggest calls', summary: 'Suggest every kind of call' }
    );
    const cli = createConstructiveCli(createToolCommands([...toolEntries, suggest], throwOnUnrendered));
    const { code, json } = await run(cli, ['suggest', 'calls']);
    expect(code).toBe(0);
    expect(json.meta.next.map((step: { argv: string[] }) => step.argv.slice(1))).toEqual(CALLS.flatMap(([, argv]) => (argv ? [argv] : [])));
  });

  // Every tool command that needs the bound database, with its inputs; db create and db recreate need none,
  // and access types reads only the registry.
  const CONTEXT_COMMANDS: string[][] = [
    ['db', 'codegen'],
    ['schema', 'show'],
    ['table', 'add', 'notes', '--field', 'title:text', '--node', OWNER_NODE, '--rule', RULE],
    ['table', 'delete', 'notes'],
    ['field', 'add', 'notes', 'title', '--type', 'text'],
    ['field', 'update', 'notes', 'title', '--new-name', 'headline'],
    ['field', 'retype', 'notes', 'title', '--type', 'integer'],
    ['field', 'delete', 'notes', 'title'],
    ['relation', 'add', 'notes', 'users', '--field-name', 'user_id'],
    ['blueprint', 'apply', '--name', 'demo', '--description', 'Demo', '--definition', JSON.stringify({ tables: [{ table_name: 'notes', policies: [OWNER_ONLY_RULE] }] })],
    ['access', 'add', 'notes', '--rule', RULE],
    ['access', 'set', 'notes', '--rule', RULE],
    ['access', 'explain', 'notes'],
    ['entity-type', 'list'],
    ['entity-type', 'create', 'team'],
    ['entity-type', 'delete', '00000000-0000-4000-8000-000000000002'],
    ['template', 'list'],
    ['template', 'create', 'Demo'],
    ['template', 'apply', 'Demo'],
    ['template', 'update', 'Demo', '--patch', '{"description":"Notes"}'],
    ['template', 'delete', 'Demo']
  ];

  it('lists every tool command that needs the bound database', () => {
    const names = createToolCommands(toolEntries).map((command) => command.name);
    const listed = CONTEXT_COMMANDS.map((argv) => names.find((name) => argv.join(' ').startsWith(name)));
    expect([...listed, 'db create', 'db recreate', 'access types'].sort()).toEqual([...names].sort());
  });

  const SCENARIOS: Array<[string, () => void, string]> = [
    ['no .env', signIn, 'no-env'],
    ['no DATABASE_ID', () => { signIn(); fs.writeFileSync(path.join(project, '.env'), 'DATABASE_NAME=demo\n'); }, 'missing-credentials'],
    ['signed out', () => fs.writeFileSync(path.join(project, '.env'), 'DATABASE_ID=00000000-0000-4000-8000-000000000001\nDATABASE_NAME=demo\n'), 'signed-out']
  ];

  it.each(SCENARIOS)('renders every call of every tool command that fails with %s', async (_scenario, setUp, code) => {
    setUp();
    const cli = createConstructiveCli(createToolCommands(toolEntries, throwOnUnrendered));
    for (const argv of CONTEXT_COMMANDS) {
      const { json } = await run(cli, [...argv, '--yes']);
      expect({ argv, code: json.error?.code }).toEqual({ argv, code });
    }
  });

  it('repeats --context in every step of a success that names it, and adds none to a run without it', async () => {
    const suggest = toolCommand(
      { ...describeSchemaTool, name: 'suggest_calls', execute: async () => ({ content: [], details: {}, calls: CALLS.map(([call]) => call) }) },
      { name: 'suggest calls', summary: 'Suggest every kind of call', next: (_details, _params, ctx) => [ctx.next(['schema', 'show'], 'See the tables')] }
    );
    const cli = createConstructiveCli(createToolCommands([...toolEntries, suggest], throwOnUnrendered));
    const named = await run(cli, ['--context', 'closed.test', 'suggest', 'calls']);
    expect(named.json.meta.next.length).toBeGreaterThan(1);
    for (const step of named.json.meta.next) expect(step.argv.slice(0, 3)).toEqual(['constructive', '--context', 'closed.test']);

    const plain = await run(cli, ['suggest', 'calls']);
    expect(plain.json.meta.next.flatMap((step: { argv: string[] }) => step.argv)).not.toContain('--context');
  });

  it('repeats --context in every step of a run that names it, so a step acts on the same backend', async () => {
    const store = openStore(stash);
    const other = Object.fromEntries(['api', 'auth', 'modules', 'agent', 'compute'].map((plane) => [plane, `http://127.0.0.2:1/${plane}/graphql`]));
    const backend = backendFromEndpoints(other as { api: string });
    addBackend(store, backend, 'other');
    storeSignedIn(store, 'other', { userId: 'u2', email: 'other@example.com', accessToken: 'token-2' });

    const cli = createConstructiveCli(createToolCommands(toolEntries, throwOnUnrendered));
    const { json } = await run(cli, ['--context', 'other', 'table', 'add', 'notes', '--field', 'title:text', '--rule', RULE, '--yes']);
    expect(json.error.code).toBe('no-env');
    expect(json.meta.next.length).toBeGreaterThan(0);
    for (const step of json.meta.next) expect(step.argv.slice(0, 3)).toEqual(['constructive', '--context', 'other']);
  });
});
