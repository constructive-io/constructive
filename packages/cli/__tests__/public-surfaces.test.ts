import { createMcpServerFactory } from '@agentic-kit/mcp';
import { addBackend, openStore, OVERRIDE_ENV_VARS, saveSession, selectBackend } from '@agentic-kit/session';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PassThrough, Writable } from 'stream';

// The session package's own fake auth plane, so an agent's server can be built with no real backend.
import { FakePrincipals } from '../../../agentic/session/__tests__/fake-principals';
import { createConstructiveCli } from '../src/cli';
import { mcpOptions } from '../src/commands/mcp';
import { configureTools } from '../src/session';
import { commandContext } from '../test-utils/command-context';

/**
 * What no public surface may say: names and paths of private repositories, internal issue and pull request numbers and
 * references to a file and line, people and roles, review words, local addresses, ports and stack names, home
 * directories and test users, and backend internals that are not API. The documented jwt.claims.* claims contract is
 * public, and no rule here matches it.
 */
const DENY: ReadonlyArray<[string, RegExp]> = [
  ['a private repository', /constructive-(db|planning|private-skills)\b/],
  ['a migration path', /\bdeploy\//],
  ['a SQL file', /\.sql\b/],
  ['a file and line', /\b[\w./-]+\.(ts|js|sql|md|json|ya?ml):\d+/],
  ['an issue number', /(?:^|[^\w&/#])#\d+\b|\b[\w.-]+(?:\/[\w.-]+)?#\d+\b|\bplanning\s*#?\s*\d+/i],
  ['an issue or pull request link', /github\.com\/[\w.-]+\/[\w.-]+\/(?:issues|pull)\/\d+/],
  ['a person', /\bDan\b|\bLynch\b|pyramation/],
  ['a role', /backend lead/i],
  ['review wording', /\bspike\b|\bdefect|known[- ](?:limit|issue)|workaround|\breview-[a-z]*\d|\bgate \d\b|\bwave[ -]?\d\b|\bTODO\b|\bFIXME\b/i],
  ['a private schema', /[a-z0-9]_private\b/],
  // The backend's own schemas, which its API does not expose, and a table or column named by its SQL path.
  ['a backend schema', /\bmetaschema_(?!public\b)\w+|\bmetaschema_public\.\w+|\binflection_db\b|\bast_helpers\b|\brls_check\b/],
  ['the rule parser', /rls_parser/],
  ['a trigger', /\b\w+_tg\b/],
  // A SQLSTATE is five characters, its class first (23 integrity, 42 syntax or access, P0 PL/pgSQL, …).
  ['a SQLSTATE', /SQLSTATE|\b(?:0[0-9A-Z]|2[0-9A-F]|3[4-9B-F]|4[024]|5[3-8]|72|F0|HV|P0|XX)[0-9A-Z]{3}\b/],
  // The words of a Postgres error, which name the tables and columns behind the API.
  [
    'raw database text',
    /violates (?:row-level security policy|not-null constraint|foreign key constraint|unique constraint|check constraint)|null value in column|duplicate key value|permission denied for|syntax error at or near|in a read-only transaction|current transaction is aborted|(?:relation|column|function|schema|type) "[^"]*" does not exist|invalid input syntax for type|value too long for type/
  ],
  ['a local address', /localhost:|\.localhost\b|\/\/localhost\b|127\.0\.0\.1/],
  // A port after a host, a port of the local stack, or one named in words; not a --port flag, and not a JSON number.
  ['a port', /\b(?:localhost|\d{1,3}(?:\.\d{1,3}){3}|[a-z0-9-]+(?:\.[a-z0-9-]+)+):\d{2,5}\b|:(?:5432|15432|18025)\b|(?<!-)\bport \d{4,5}\b/i],
  ['a stack name', /\bdevnet\b|\bfun (?:up|down)\b|\blocal stack\b/i],
  ['a home directory', /\/(?:Users|home)\/[^/\s'"`]+/],
  ['a test user', /hcli[-_]|@constructive\.test\b|\b(?:alice|bob)@/i]
];

/** Text a deny rule matches that is public on purpose: on the surfaces `surface` matches, each with its reason. */
const ALLOWED: ReadonlyArray<{ what: string; surface: RegExp; text: RegExp; why: string }> = [
  { what: 'the copyright line', surface: /\/LICENSE$/, text: /Copyright \(c\) \d{4} Dan Lynch <pyramation@gmail\.com>/, why: 'the MIT license requires every copy to keep it' },
  { what: 'the package author', surface: /\/package\.json$/, text: /"author": "Dan Lynch <pyramation@gmail\.com>"/, why: "npm's author field of a package, as published" },
  {
    what: 'the explorer default origin',
    surface: /(?:\/commands\/explorer\.(?:js|d\.ts)|^explorer --help)$/,
    text: /http:\/\/localhost:3000|port 3000 of this machine/,
    why: 'the default CORS origin of the local explorer, a public default and no stack detail'
  },
  {
    what: 'the db tools extension file',
    surface: /^agentic\/cli\/(?:esm\/)?db-tools\.(?:js|d\.ts)$/,
    text: /constructive-db-tools\.js/,
    why: 'the file the agent CLI writes its db tools extension to; the name is of the tools, not of a repository'
  },
  {
    what: 'the merkle store options of the graph module',
    surface: /^packages\/node-type-registry\/(?:esm\/)?module-presets\/dependencies\.js$/,
    text: /private_schema_name: 'compute_private'/,
    why: 'a module option the provisioning input takes: the schema the graph module asks its merkle store to use'
  },
  {
    what: 'the refused-ticket pattern',
    surface: /\/provision-database\/provision\.js$/,
    text: /duplicate key value violates unique constraint/,
    why: "a failed provision ticket keeps only the job's error text, so the tool matches this pattern in it; the text is never shown"
  }
];

/** Each deny-list word in `text` that no allowance of `surface` covers, with the words around it, labeled with the surface. */
function leaks(surface: string, text: string): string[] {
  const allowed = ALLOWED.filter((allowance) => allowance.surface.test(surface))
    .flatMap((allowance) => [...text.matchAll(new RegExp(allowance.text.source, 'g'))].map((match) => [match.index, match.index + match[0].length]));
  return DENY.flatMap(([what, pattern]) =>
    [...text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))]
      .filter((match) => !allowed.some(([start, end]) => match.index >= start && match.index + match[0].length <= end))
      .map((match) => `${surface}: ${what}: …${text.slice(Math.max(0, match.index - 40), match.index + match[0].length + 40)}…`));
}

/** A man page as man shows it: without the font changes, and with the escaped characters as themselves. */
const manText = (roff: string): string =>
  roff.replace(/\\f[BIRP]/g, '').replace(/\\\[(rs|lB|rB)\]/g, (_escape, name: 'rs' | 'lB' | 'rB') => ({ rs: '\\', lB: '[', rB: ']' })[name]);

/** The text of a packed file that someone can read: all of it, comments and type declarations included, since an editor shows both. */
function packedText(file: string, source: string): string {
  if (/\.([cm]?js|d\.[cm]?ts|json|md)$/.test(file) || path.basename(file) === 'LICENSE') return source;
  if (/^man\/[\w-]+\.1$/.test(file)) return manText(source);
  throw new Error(`npm packs ${file}, and this check does not know how to read its text. Say how in packedText, or keep the file out of the package.`);
}

const ROOT = path.resolve(__dirname, '..', '..', '..');

/** The packages this repository publishes for the CLI, each from its dist directory. */
const PUBLISHED = ['packages/cli', 'agentic/command', 'agentic/mcp', 'agentic/session', 'agentic/db-tools', 'agentic/harness', 'agentic/cli', 'packages/node-type-registry'];

let stash: string;
let project: string;
let env: NodeJS.ProcessEnv;
let auth: FakePrincipals;

beforeAll(async () => {
  stash = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-stash-'));
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-project-'));
  env = { ...process.env, CONSTRUCTIVE_STASH_DIR: stash };
  for (const name of OVERRIDE_ENV_VARS) delete env[name];
  auth = new FakePrincipals();
  await auth.start();
  const store = openStore(stash);
  selectBackend(store, addBackend(store, auth.backend()).name);
  saveSession(store, {
    userId: 'person-1',
    email: 'owner@example.com',
    accessToken: 'person-access-token',
    apiKey: 'person-api-key',
    keyId: 'person-key-id',
    signedInAt: 1,
    issuedFor: auth.backend()
  });
});

afterAll(async () => {
  await auth.stop();
  fs.rmSync(stash, { recursive: true, force: true });
  fs.rmSync(project, { recursive: true, force: true });
});

async function run(argv: string[], stdin = ''): Promise<{ code: number; text: string }> {
  let text = '';
  const sink = new Writable({ write(chunk, _encoding, done) { text += chunk; done(); } });
  const input = new PassThrough();
  input.end(stdin);
  const code = await createConstructiveCli().run(argv, { stdin: input, stdout: sink, stderr: sink, env, cwd: project });
  return { code, text };
}

/** What an agent host sees from `constructive mcp` with these global flags: the instructions and tools/list. */
async function served(globals: string[], readOnly: boolean): Promise<string> {
  const { ctx, session } = await commandContext(globals, { env, cwd: project });
  configureTools(session);
  const server = createMcpServerFactory(mcpOptions(ctx, readOnly, session))();
  const client = new Client({ name: 'surface-check', version: '1.0.0' }, { capabilities: {} });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    return `${client.getInstructions()}\n${JSON.stringify((await client.listTools()).tools)}`;
  } finally {
    await client.close();
    await server.close();
  }
}

describe('the deny list', () => {
  it.each([
    // Two runtime errors a live run showed: raw server text that names an internal table, and a SQLSTATE with it.
    ['permission-denied: Failed to add field "by_agent" to "tasks": new row violates row-level security policy for table "field"', 'raw database text'],
    ['failed: Failed to provision "agent_made": The blueprint build failed: 23502: null value in column "name" of relation "field" violates not-null constraint', 'a SQLSTATE'],
    ['(rls_parser.parse and the policy table\'s trigger)', 'the rule parser'],
    ['(`org_capabilities_bitnum_tg`)', 'a trigger'],
    ['constructive#12345', 'an issue number'],
    ['see #231', 'an issue number'],
    ['owner/repo#7', 'an issue number'],
    ['Dan Lynch (pyramation)', 'a person'],
    ['42P07 / 23502', 'a SQLSTATE'],
    ['http://127.0.0.1:15432', 'a local address'],
    ['a workaround until the backend fix lands', 'review wording'],
    ['metaschema_modules_private procedure', 'a private schema'],
    ['/Users/someone/workspace/project', 'a home directory'],
    ['See https://github.com/constructive-io/constructive/pull/2084 for the change.', 'an issue or pull request link'],
    ['Tracked in planning 2586.', 'an issue number'],
    ['Postgres is on port 15432.', 'a port'],
    ['a server on :18025', 'a port'],
    ['cannot execute INSERT in a read-only transaction', 'raw database text'],
    ['relation "app_public.field" does not exist', 'raw database text'],
    ['invalid input syntax for type uuid: "x"', 'raw database text'],
    ['current transaction is aborted, commands ignored until end of transaction block', 'raw database text'],
    ['value too long for type character varying(63)', 'raw database text'],
    ['Run it against http://api.localhost/graphql on the local stack (fun up).', 'a local address'],
    ['the local stack (fun up)', 'a stack name'],
    ['the devnet cluster', 'a stack name'],
    ['The backend reads it in metaschema_generators.provision_database_modules.', 'a backend schema'],
    ['inflection_db.get_identifier(inflection.underscore(name))', 'a backend schema'],
    ['This is a known issue; the fix is temporary.', 'review wording'],
    ['TODO: remove once the backend fix lands', 'review wording'],
    ['hcli_owner@constructive.test signs in as alice@example.com', 'a test user']
  ])('catches %s', (text, what) => {
    expect(leaks('case', text).join('\n')).toContain(`: ${what}: `);
  });
});

describe('a man page', () => {
  it('is read as man shows it, so a font change does not hide a word', () => {
    expect(leaks('man/constructive.1', manText('Tracked in \\fB#231\\fR.')).join('\n')).toContain(': an issue number: ');
  });
});

describe('the allowed public text', () => {
  it('lets the documented jwt.claims contract through', () => {
    expect(leaks('case', "A rule reads current_setting('jwt.claims.user_id') and jwt.claims.database_id.")).toEqual([]);
  });
});

describe('the public surfaces carry no internal details', () => {
  it('in the manifest, the index, the root help, every help topic, and the help and schema of every command', async () => {
    const found: string[] = [];
    for (const argv of [['--llms', '--json'], ['--llms'], ['--help']]) found.push(...leaks(argv.join(' '), (await run(argv)).text));
    for (const { name } of createConstructiveCli().manifest().topics) {
      const { code, text } = await run(['help', name]);
      expect({ topic: name, code }).toEqual({ topic: name, code: 0 });
      found.push(...leaks(`help ${name}`, text));
    }
    for (const { name } of createConstructiveCli().manifest().commands) {
      for (const flag of ['--help', '--schema']) {
        const argv = [...name.split(' '), flag];
        const { code, text } = await run(argv);
        expect({ argv, code }).toEqual({ argv, code: 0 });
        found.push(...leaks(argv.join(' '), text));
      }
    }
    expect(found).toEqual([]);
  });

  it('in the refusal of a table with no rule, whose hint is an example to copy', async () => {
    const { code, text } = await run(['table', 'add', 'tasks', '--json']);
    expect(code).toBe(2);
    expect(leaks('table add', text)).toEqual([]);
  });

  it('in the instructions and the tools an MCP host gets, as the person and as an agent', async () => {
    expect((await run(['agent', 'add', 'helper', '--password-stdin', '--yes'], auth.password)).code).toBe(0);
    const found = [
      ...leaks('mcp --read-only', await served([], true)),
      ...leaks('mcp --write', await served([], false)),
      ...leaks('mcp --as helper', await served(['--as', 'helper'], true))
    ];
    expect(found).toEqual([]);
  });

  it.each(PUBLISHED)('in the files npm packs for %s: their names, and the text of each one', (pkg) => {
    const dist = path.join(ROOT, pkg, 'dist');
    // --ignore-scripts: the copied package.json keeps the scripts of the source package, and a dry run must build nothing.
    const [packed] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: dist, encoding: 'utf8' })) as Array<{ files: Array<{ path: string }> }>;
    const found = packed.files.flatMap(({ path: file }) => [
      ...leaks(`${pkg} file name`, file),
      ...leaks(`${pkg}/${file}`, packedText(file, fs.readFileSync(path.join(dist, file), 'utf8')))
    ]);
    expect(found).toEqual([]);
  });
});
