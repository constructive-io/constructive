import { openStore, OVERRIDE_ENV_VARS, stashDirectories } from '@agentic-kit/session';
import * as fs from 'fs';
import * as http from 'http';
import type { AddressInfo } from 'net';
import * as os from 'os';
import * as path from 'path';
import { PassThrough, Writable } from 'stream';

import { createConstructiveCli } from '../src/cli';
import { versionRequest } from '../src/commands/account';
import { storeSignedIn } from '../test-utils/sessions';
import { shellWords } from '../test-utils/shell-words';

type Reply = { status?: number; body: unknown };
type Seen = { path: string; authorization?: string; body: { query: string; variables?: unknown; operationName?: string } };

const PLANES = ['api', 'auth', 'modules', 'agent', 'compute'];
const API_KEY = 'test-api-key';

let server: http.Server;
let base: string;
let seen: Seen[];
let reply: (request: Seen) => Reply;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const request: Seen = { path: req.url, authorization: req.headers.authorization, body: raw ? JSON.parse(raw) : undefined };
      seen.push(request);
      const { status = 200, body } = reply(request);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

let stash: string;
let project: string;
let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
  stash = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-stash-'));
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-project-'));
  process.env.CONSTRUCTIVE_STASH_DIR = stash;
  for (const name of OVERRIDE_ENV_VARS) delete process.env[name];
  seen = [];
  reply = () => ({ body: { data: { ok: true } } });

  const store = openStore(stash);
  const targets = Object.fromEntries(PLANES.map((plane) => [plane, { endpoint: `${base}/${plane}/graphql` }]));
  store.createContext('fake.test', { endpoint: `${base}/api/graphql`, targets });
  store.setCurrentContext('fake.test');
  storeSignedIn(store, 'fake.test', { userId: 'user-1', accessToken: 'test-token', apiKey: API_KEY });
});

afterEach(() => {
  process.env = savedEnv;
  fs.rmSync(stash, { recursive: true, force: true });
  fs.rmSync(project, { recursive: true, force: true });
});

async function run(argv: string[], stdinText?: string) {
  let out = '';
  const stdout = new Writable({ write(chunk, _encoding, done) { out += chunk; done(); } });
  const stdin = new PassThrough();
  if (stdinText !== undefined) stdin.end(stdinText);
  const code = await createConstructiveCli().run(argv, { stdin, stdout, stderr: new PassThrough(), env: process.env, cwd: project });
  return { code, out, json: out.trimStart().startsWith('{') ? JSON.parse(out) : undefined };
}

describe('api query and api mutate', () => {
  it('declares one effect per command', async () => {
    const { json } = await run(['--llms', '--json']);
    const effects = Object.fromEntries(json.commands.map((command: { name: string; effect: string }) => [command.name, command.effect]));
    expect(effects).toMatchObject({ 'api query': 'read', 'api mutate': 'write', 'api search': 'read', 'api describe': 'read' });
  });

  it('runs a query at once on the api plane, with the session credential', async () => {
    reply = () => ({ body: { data: { databases: { totalCount: 2 } } } });
    const { code, json } = await run(['api', 'query', '{ databases { totalCount } }']);
    expect(code).toBe(0);
    expect(json.data).toEqual({ databases: { totalCount: 2 } });
    expect(seen).toEqual([expect.objectContaining({ path: '/api/graphql', authorization: `Bearer ${API_KEY}` })]);
  });

  it('sends to the plane --plane names, with the variables and the operation name', async () => {
    const { code } = await run([
      'api', 'query', 'query A { a } query B { b }', '--plane', 'modules', '--variables', '{"first":3}', '--operation-name', 'B'
    ]);
    expect(code).toBe(0);
    expect(seen).toEqual([
      expect.objectContaining({
        path: '/modules/graphql',
        authorization: `Bearer ${API_KEY}`,
        body: { query: 'query A { a } query B { b }', variables: { first: 3 }, operationName: 'B' }
      })
    ]);
  });

  it('reads the variables from stdin with -, and refuses stdin for both the document and the variables', async () => {
    expect((await run(['api', 'query', 'query Q($first: Int) { a(first: $first) }', '--variables', '-'], '{"first":5}')).code).toBe(0);
    expect(seen[0].body.variables).toEqual({ first: 5 });

    const both = await run(['api', 'query', '-', '--variables', '-'], '{ a }');
    expect(both.code).toBe(2);
    expect(both.json.error.code).toBe('invalid-input');
    expect(seen).toHaveLength(1);
  });

  it('refuses variables that are not a JSON object, before anything is sent', async () => {
    const { code, json } = await run(['api', 'query', '{ a }', '--variables', '[1,2]']);
    expect(code).toBe(2);
    expect(json.error).toMatchObject({ code: 'invalid-input', details: { flag: '--variables' } });
    expect(seen).toEqual([]);
  });

  it('reads the document from stdin with -, and from a file with @path', async () => {
    fs.writeFileSync(path.join(project, 'q.graphql'), '{ fromFile }');
    expect((await run(['api', 'query', '-'], '{ fromStdin }')).code).toBe(0);
    expect((await run(['api', 'query', '@q.graphql'])).code).toBe(0);
    expect(seen.map((request) => request.body.query)).toEqual(['{ fromStdin }', '{ fromFile }']);
  });

  it.each([
    [['api', 'query', 'mutation { createThing { id } }'], 'constructive api mutate'],
    [['api', 'query', 'subscription { onThing { id } }'], 'constructive api mutate'],
    [['api', 'mutate', '{ things { id } }'], 'constructive api query']
  ])('refuses %j, which belongs to the other command, before anything is sent', async (argv, other) => {
    const { code, json } = await run(argv);
    expect(code).toBe(2);
    expect(json.error.code).toBe('invalid-input');
    expect(json.meta.next[0].command).toMatch(new RegExp(`^${other} `));
    expect(seen).toEqual([]);
  });

  it.each([
    [['api', '--json', 'query', 'mutation { x }']],
    [['--fields', 'api query', 'api', 'query', 'mutation { x }']]
  ])('gives %j a next step that runs api mutate with the same flags, and rewrites no flag value', async (argv) => {
    const refused = await run(argv);
    expect(refused.code).toBe(2);
    const { argv: next } = refused.json.meta.next[0];
    expect(next[0]).toBe('constructive');
    if (argv.includes('--fields')) expect(next.slice(next.indexOf('--fields'), next.indexOf('--fields') + 2)).toEqual(['--fields', 'api query']);
    const planned = await run([...next.slice(1), '--dry-run']);
    expect(planned.json.meta.command).toBe('api mutate');
    expect(seen).toEqual([]);
  });

  it('refuses a document that does not parse, before anything is sent', async () => {
    const { code, json } = await run(['api', 'query', '{ databases { ']);
    expect(code).toBe(2);
    expect(json.error.code).toBe('invalid-input');
    expect(seen).toEqual([]);
  });

  it('stops a mutation without --yes with a plan that names the operation and its target, then sends it with --yes', async () => {
    const document = 'mutation CreateThing { createThing(input: {}) { id } }';
    const stopped = await run(['api', 'mutate', document]);
    expect(stopped.code).toBe(3);
    expect(stopped.json.error.code).toBe('approval-required');
    expect(stopped.json.error.details.plan.message).toContain('CreateThing');
    expect(stopped.json.error.details.plan.target).toMatchObject({ kind: 'account', apiEndpoint: `${base}/api/graphql` });
    expect(seen).toEqual([]);

    const sent = await run(['api', 'mutate', document, '--yes']);
    expect(sent.code).toBe(0);
    expect(seen).toEqual([expect.objectContaining({ path: '/api/graphql', authorization: `Bearer ${API_KEY}` })]);
  });
});

describe('a mutation that changed nothing', () => {
  it('warns when the payload of a mutation names no row, and keeps the data as the server sent it', async () => {
    reply = () => ({ body: { data: { renamed: { thing: null, clientMutationId: null }, other: { thing: { id: 't1' } } } } });
    const document = 'mutation { renamed: updateThing(input: {}) { thing { id } clientMutationId } other: updateThing(input: {}) { thing { id } } }';
    const { code, json } = await run(['api', 'mutate', document, '--yes']);
    expect(code).toBe(0);
    expect(json.data.renamed).toEqual({ thing: null, clientMutationId: null });
    expect(json.meta.warnings).toEqual([expect.stringContaining('renamed (updateThing) changed no row')]);
  });
});

describe('the api commands reach only the planes of the session backend', () => {
  const credentials = () => path.join(stash, '.constructive', 'config', 'credentials.json');

  it('refuses the reproduction of review finding H1 with a usage error, and sends nothing', async () => {
    const { code, json } = await run([
      'api', 'query', 'query ($tokens: JSON) { __typename }', '--variables', `@${credentials()}`, '--endpoint', `${base}/collect`
    ]);
    expect(code).toBe(2);
    expect(json.error.code).toBe('unknown-flag');
    expect(seen).toEqual([]);
  });

  it('has no --endpoint flag on any api command', async () => {
    const { json } = await run(['--llms', '--json']);
    const api = json.commands.filter((command: { name: string }) => command.name.startsWith('api '));
    expect(api.map((command: { name: string }) => command.name).sort()).toEqual(['api describe', 'api mutate', 'api query', 'api search']);
    for (const command of api) expect(Object.keys(command.input.properties)).not.toContain('endpoint');
  });

  it('never reads a file of the session store as input, also through --cwd and through a link', async () => {
    const config = path.dirname(credentials());
    fs.symlinkSync(credentials(), path.join(project, 'vars.json'));
    const document = 'query ($tokens: JSON) { __typename }';
    for (const argv of [
      ['api', 'query', document, '--variables', `@${credentials()}`],
      ['api', 'query', document, '--variables', '@credentials.json', '--cwd', config],
      ['api', 'query', document, '--variables', '@vars.json'],
      ['api', 'mutate', `@${credentials()}`]
    ]) {
      const { code, json } = await run(argv);
      expect({ argv, code }).toEqual({ argv, code: 2 });
      expect(json.error.code).toBe('invalid-input');
      expect(json.error.message).toContain('session store');
    }
    expect(seen).toEqual([]);
  });

  it('never reads the default store either, nor a hard link to a file of the current one (review M2 L1)', async () => {
    // The default store lives under APPSTASH_BASE_DIR, which the jest setup points at a temporary directory.
    const [, defaultConfig] = stashDirectories({});
    fs.mkdirSync(defaultConfig, { recursive: true });
    const other = path.join(defaultConfig, 'credentials.json');
    fs.writeFileSync(other, '{"secret":"default-store"}');
    fs.linkSync(credentials(), path.join(project, 'hard.json'));
    try {
      const document = 'query ($tokens: JSON) { __typename }';
      for (const argv of [
        ['api', 'query', document, '--variables', `@${other}`],
        ['api', 'query', document, '--variables', '@hard.json'],
        ['api', 'mutate', '@hard.json']
      ]) {
        const { code, json } = await run(argv);
        expect({ argv, code }).toEqual({ argv, code: 2 });
        expect(json.error).toMatchObject({ code: 'invalid-input', message: expect.stringContaining('session store') });
      }
      expect(seen).toEqual([]);
    } finally {
      fs.rmSync(other, { force: true });
    }
  });

  it('sends the stored key nowhere once the api plane of the context is rewritten on disk, and status names the plane (review M2)', async () => {
    const file = path.join(stash, '.constructive', 'config', 'contexts', 'fake.test.json');
    const context = JSON.parse(fs.readFileSync(file, 'utf8'));
    context.endpoint = `${base}/rewritten/graphql`;
    context.targets.api.endpoint = `${base}/rewritten/graphql`;
    fs.writeFileSync(file, JSON.stringify(context));

    const query = await run(['api', 'query', '{ a }']);
    expect(query.code).toBe(0);
    expect(seen).toEqual([expect.objectContaining({ path: '/rewritten/graphql', authorization: undefined })]);

    const asked: Array<[string, RequestInit]> = [];
    const refused = versionRequest.fetch;
    versionRequest.fetch = async (url, init) => {
      asked.push([String(url), init]);
      return new Response('Not Found', { status: 404 });
    };
    const status = await run(['status']).finally(() => (versionRequest.fetch = refused));
    expect(asked).toEqual([[`${base}/rewritten/version`, expect.objectContaining({ headers: { Accept: 'application/json' } })]]);
    expect(status.json.data.problem).toEqual(expect.stringContaining('api'));
    expect(status.json.data.problem).toEqual(expect.stringContaining(`${base}/api/graphql`));
    expect(status.json.data.problem).toEqual(expect.stringContaining(`${base}/rewritten/graphql`));
  });

  it('plans a mutation with no credential when no one is signed in, and says so in the plan', async () => {
    openStore(stash).removeCredentials('fake.test');
    const { code, json } = await run(['api', 'mutate', 'mutation { a }', '--dry-run']);
    expect(code).toBe(0);
    expect(json.data.plan.message).toContain('with no credential');
    expect(json.data.plan.target).toEqual({ kind: 'no-credential', endpoint: `${base}/api/graphql` });
  });

  it('sends no credential when no one is signed in, and says so', async () => {
    openStore(stash).removeCredentials('fake.test');
    const { code, json } = await run(['api', 'query', '{ a }']);
    expect(code).toBe(0);
    expect(seen[0].authorization).toBeUndefined();
    expect(json.meta.warnings).toEqual([expect.stringContaining('No one is signed in')]);
  });
});

describe('the plan of api mutate', () => {
  async function planOf(argv: string[]) {
    const { code, json } = await run(['api', 'mutate', ...argv, '--dry-run']);
    expect(code).toBe(0);
    return json.data.plan;
  }

  it.each([
    ['a fragment spread', 'mutation { ...F } fragment F on Mutation { deleteTable(input: {id: "x"}) { clientMutationId } }'],
    ['an inline fragment', 'mutation { ... on Mutation { deleteTable(input: {id: "x"}) { clientMutationId } } }']
  ])('names the root fields behind %s, with their arguments as written', async (_kind, document) => {
    const plan = await planOf([document]);
    expect(plan.operation.fields).toEqual([{ name: 'deleteTable', arguments: [{ name: 'input', value: '{id: "x"}' }] }]);
    expect(plan.message).toContain('deleteTable(input: {id: "x"})');
    expect(plan.target).toEqual({ kind: 'account', apiEndpoint: `${base}/api/graphql`, account: { userId: 'user-1', email: 'dev@example.com' } });
    expect(seen).toEqual([]);
  });

  it('lists the variables with their values when they are given as text', async () => {
    const plan = await planOf(['mutation ($id: UUID!) { deleteDatabase(input: {id: $id}) { clientMutationId } }', '--variables', '{"id":"db-42"}']);
    expect(plan.variables).toEqual({ from: 'text', names: ['id'], values: { id: 'db-42' } });
    expect(plan.message).toContain('id = "db-42"');
  });

  it('lists only the variable names, and where they came from, when they come from a file or stdin', async () => {
    fs.writeFileSync(path.join(project, 'vars.json'), '{"id":"db-42"}');
    const document = 'mutation ($id: UUID!) { deleteDatabase(input: {id: $id}) { clientMutationId } }';
    const fromFile = await planOf([document, '--variables', '@vars.json']);
    expect(fromFile.variables).toEqual({ from: 'file', names: ['id'] });
    expect(fromFile.message).not.toContain('db-42');

    const { json } = await run(['api', 'mutate', document, '--variables', '-', '--dry-run'], '{"id":"db-42"}');
    expect(json.data.plan.variables).toEqual({ from: 'stdin', names: ['id'] });
    expect(json.data.plan.message).not.toContain('db-42');
  });

  it('plans only the operation that --operation-name picks', async () => {
    const plan = await planOf(['mutation A { a(x: 1) { id } } mutation B { b(y: 2) { id } }', '--operation-name', 'B']);
    expect(plan.operation).toMatchObject({ type: 'mutation', name: 'B', fields: [{ name: 'b', arguments: [{ name: 'y', value: '2' }] }] });
    expect(plan.message).not.toContain('a(x: 1)');
  });

  it.each([
    [['mutation A { a } mutation B { b }', '--operation-name', 'Q'], 'no operation named "Q"'],
    [['mutation A { a } mutation B { b }'], '--operation-name']
  ])('refuses %j before the approval step, and sends nothing', async (argv, words) => {
    const { code, json } = await run(['api', 'mutate', ...argv]);
    expect(code).toBe(2);
    expect(json.error.code).toBe('invalid-input');
    expect(json.error.message).toContain(words);
    expect(seen).toEqual([]);
  });

  it('runs a query of a document that also holds a mutation, when --operation-name picks the query', async () => {
    const { code } = await run(['api', 'query', 'query Q { a } mutation M { b }', '--operation-name', 'Q']);
    expect(code).toBe(0);
    expect(seen[0].body.operationName).toBe('Q');
  });
});

describe('an error about the input never repeats the input', () => {
  it('reports where --variables stops being JSON, and none of its text', async () => {
    const { code, json } = await run(['api', 'query', '{ a }', '--variables', '-'], '{"password": hunter2-not-real}');
    expect(code).toBe(2);
    expect(json.error.code).toBe('invalid-input');
    expect(JSON.stringify(json)).not.toContain('hunter2');
  });

  it('reports where the document stops being GraphQL, and none of its text', async () => {
    const { code, json } = await run(['api', 'query', 'query { a } s3cr3tvalue']);
    expect(code).toBe(2);
    expect(json.error.message).toContain('line 1');
    expect(JSON.stringify(json)).not.toContain('s3cr3t');
  });
});

describe('api errors', () => {
  it('reports a transport failure as backend-unreachable, with no HTTP status', async () => {
    const dead = Object.fromEntries(PLANES.map((plane) => [plane, { endpoint: `http://127.0.0.1:1/${plane}/graphql` }]));
    openStore(stash).createContext('dead.test', { endpoint: 'http://127.0.0.1:1/api/graphql', targets: dead });
    const { code, json } = await run(['api', 'query', '{ a }', '--context', 'dead.test']);
    expect(code).toBe(1);
    expect(json.error).toMatchObject({ code: 'backend-unreachable', retryable: true, details: { httpStatus: null } });
  });

  it.each([
    [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }, 'permission-denied'],
    [{ message: 'A value must be unique.', extensions: { code: 'UNIQUE_VIOLATION' } }, 'conflict'],
    [{ message: 'Not signed in.', extensions: { code: 'UNAUTHENTICATED' } }, 'signed-out']
  ])('reads a GraphQL error by its public code first: %j is %s', async (error, expected) => {
    reply = () => ({ body: { data: null, errors: [error] } });
    const { code, json } = await run(['api', 'query', '{ a }']);
    expect(code).toBe(expected === 'signed-out' ? 4 : 1);
    expect(json.error.code).toBe(expected);
    expect(json.error.details).toMatchObject({ httpStatus: 200, errors: [error] });
  });

  it('keeps the error id of a masked internal error', async () => {
    reply = () => ({ body: { errors: [{ message: 'An unexpected error occurred.', extensions: { code: 'INTERNAL_SERVER_ERROR', class: 'internal', errorId: 'err-42' } }] } });
    const { json } = await run(['api', 'query', '{ a }']);
    expect(json.error.code).toBe('failed');
    expect(json.error.message).toContain('err-42');
  });

  it('tells a caller with a QUERY_TOO_COSTLY answer to add first:, and where to read the arguments that limit the rows', async () => {
    reply = () => ({
      body: { errors: [{ message: 'The query is too expensive.', extensions: { code: 'QUERY_TOO_COSTLY', class: 'public', context: { cost: 20, limit: 10 } } }] }
    });
    const { code, json } = await run(['api', 'query', '{ databases { nodes { id } } }', '--plane', 'modules']);
    expect(code).toBe(1);
    expect(json.error).toMatchObject({ code: 'query-too-large', hint: expect.stringContaining('first:'), details: { context: { cost: 20, limit: 10 } } });
    expect(json.meta.next).toEqual([expect.objectContaining({ command: 'constructive api describe databases --plane modules' })]);
  });

  it('points a signed-out answer to the sign-in', async () => {
    reply = () => ({ body: { errors: [{ message: 'Not signed in.', extensions: { code: 'UNAUTHENTICATED', class: 'public' } }] } });
    const { code, json } = await run(['api', 'search', 'database']);
    expect(code).toBe(4);
    expect(json.meta.next[0].command).toMatch(/^constructive login /);
  });
});

type Json = Record<string, unknown>;

const named = (name: string): Json => ({ kind: 'OBJECT', name, ofType: null });
const scalar = (name: string): Json => ({ kind: 'SCALAR', name, ofType: null });
const nonNull = (type: Json): Json => ({ kind: 'NON_NULL', name: null, ofType: type });
const field = (name: string, type: Json, description: string | null = null, args: Json[] = []): Json => ({ name, description, args, type });
const arg = (name: string, type: Json, description: string | null = null): Json => ({ name, description, type, defaultValue: null });
const object = (name: string, description: string | null, fields: Json[]): Json => ({
  kind: 'OBJECT', name, description, fields, inputFields: null, enumValues: null
});

const SCHEMA: { __schema: Json } = {
  __schema: {
    queryType: { name: 'Query' },
    mutationType: { name: 'Mutation' },
    subscriptionType: null,
    types: [
      object('Query', null, [
        field('databases', named('DatabaseConnection'), 'Reads the databases.\nMore lines.', [arg('first', scalar('Int'), 'Only this many')]),
        field('currentUser', named('User'), 'The signed-in user.')
      ]),
      object('Mutation', null, [
        field('createDatabase', named('CreateDatabasePayload'), 'Creates a database.', [arg('input', nonNull({ kind: 'INPUT_OBJECT', name: 'CreateDatabaseInput', ofType: null }))])
      ]),
      object('Database', 'A database of an app.', [field('id', nonNull(scalar('UUID'))), field('name', scalar('String'), 'Its name.')]),
      object('DatabaseConnection', null, [field('nodes', { kind: 'LIST', name: null, ofType: named('Database') })]),
      object('User', 'A person.', [field('id', nonNull(scalar('UUID')))]),
      object('CreateDatabasePayload', null, [field('database', named('Database'))]),
      scalar('UUID'),
      object('__Type', null, [])
    ]
  }
};

const HOSTILE = "Evil'; rm -rf ~ #";

describe('a next step built from a value a server or a person gave', () => {
  beforeEach(() => {
    const schema = { __schema: { ...SCHEMA.__schema, types: [object(HOSTILE, 'A type a hostile server named.', [])] } };
    reply = ({ body }) => (body.query.includes('__schema') ? { body: { data: schema } } : { body: { data: {} } });
  });

  it('quotes a type name from the remote schema as one word of the describe step', async () => {
    const { json } = await run(['api', 'search', 'evil', '--plane', 'modules']);
    const [next] = json.meta.next;
    expect(shellWords(next.command)).toEqual(['constructive', 'api', 'describe', HOSTILE, '--plane', 'modules']);
    expect(next.argv).toEqual(shellWords(next.command));
  });

  it('quotes the name a person gave as one word of the search step', async () => {
    const { json } = await run(['api', 'describe', 'Nope; rm -rf ~', '--plane', 'modules']);
    expect(shellWords(json.meta.next[0].command)).toEqual(['constructive', 'api', 'search', 'Nope; rm -rf ~', '--plane', 'modules']);
  });
});

describe('api search and api describe', () => {
  beforeEach(() => {
    reply = ({ body }) => (body.query.includes('__schema') ? { body: { data: SCHEMA } } : { body: { data: {} } });
  });

  it('finds types and root fields before the fields of other types, exact names first, with the first line of each description', async () => {
    const { code, json } = await run(['api', 'search', 'database']);
    expect(code).toBe(0);
    expect(json.data.total).toBe(6);
    expect(json.data.matches).toEqual([
      { kind: 'type', name: 'Database', typeKind: 'OBJECT', description: 'A database of an app.' },
      { kind: 'query', name: 'databases', type: 'DatabaseConnection', description: 'Reads the databases.' },
      { kind: 'type', name: 'DatabaseConnection', typeKind: 'OBJECT' },
      { kind: 'mutation', name: 'createDatabase', type: 'CreateDatabasePayload', description: 'Creates a database.' },
      { kind: 'type', name: 'CreateDatabasePayload', typeKind: 'OBJECT' },
      { kind: 'field', name: 'CreateDatabasePayload.database', type: 'Database' }
    ]);
    expect(seen[0]).toMatchObject({ path: '/api/graphql', authorization: `Bearer ${API_KEY}` });
  });

  it('keeps the list short with --limit, and names the command that shows the rest', async () => {
    const { json } = await run(['api', 'search', 'database', '--limit', '1']);
    expect(json.data.matches).toHaveLength(1);
    expect(json.meta.next[0].command).toBe('constructive api search database --limit 6');
  });

  it('describes a type with its fields and their types', async () => {
    const { json } = await run(['api', 'describe', 'Database']);
    expect(json.data).toEqual({
      kind: 'type',
      name: 'Database',
      typeKind: 'OBJECT',
      description: 'A database of an app.',
      fields: [{ name: 'id', type: 'UUID!' }, { name: 'name', type: 'String', description: 'Its name.' }],
      total: 2
    });
  });

  it.each([['Query.databases'], ['databases']])('describes the field %s with its arguments and return type', async (name) => {
    const { json } = await run(['api', 'describe', name]);
    expect(json.data).toEqual({
      kind: 'query',
      parent: 'Query',
      name: 'databases',
      type: 'DatabaseConnection',
      description: 'Reads the databases.\nMore lines.',
      args: [{ name: 'first', type: 'Int', description: 'Only this many' }]
    });
  });

  it('describes an input type with its input fields, their types and defaults, and points from a mutation to its input type (review M2 L5)', async () => {
    const input: Json = {
      kind: 'INPUT_OBJECT', name: 'CreateDatabaseInput', description: 'The input of createDatabase.', fields: null, enumValues: null,
      inputFields: [
        { name: 'name', description: 'Its name.', type: nonNull(scalar('String')), defaultValue: null as string | null },
        { name: 'isPublic', description: null as string | null, type: scalar('Boolean'), defaultValue: 'false' }
      ]
    };
    const schema = { __schema: { ...SCHEMA.__schema, types: [...(SCHEMA.__schema.types as Json[]), input] } };
    reply = ({ body }) => (body.query.includes('__schema') ? { body: { data: schema } } : { body: { data: {} } });

    const described = await run(['api', 'describe', 'CreateDatabaseInput']);
    expect(described.json.data).toEqual({
      kind: 'type',
      name: 'CreateDatabaseInput',
      typeKind: 'INPUT_OBJECT',
      description: 'The input of createDatabase.',
      fields: [{ name: 'name', type: 'String!', description: 'Its name.' }, { name: 'isPublic', type: 'Boolean', defaultValue: 'false' }],
      total: 2
    });
    const text = await run(['api', 'describe', 'CreateDatabaseInput', '--format', 'text']);
    expect(text.out).toContain('  isPublic: Boolean = false');

    const mutation = await run(['api', 'describe', 'createDatabase']);
    expect(mutation.json.meta.next.map((step: { argv: string[] }) => step.argv)).toEqual([['constructive', 'api', 'describe', 'CreateDatabaseInput']]);
  });

  it('fails with not-found for a name the schema does not have, and points to search', async () => {
    const { code, json } = await run(['api', 'describe', 'Nope']);
    expect(code).toBe(1);
    expect(json.error.code).toBe('not-found');
    expect(json.meta.next[0].command).toBe('constructive api search Nope');
  });
});
