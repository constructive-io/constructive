import type { CommandContext, NextStep, NextWord } from '@agentic-kit/command';
import { type AccessFinding, AuthzTypeZod, type ExplainedTable } from '@agentic-kit/db-tools';
import { OVERRIDE_ENV_VARS } from '@agentic-kit/session';
import * as fs from 'fs';
import { allNodeTypes } from 'node-type-registry';
import * as os from 'os';
import * as path from 'path';
import { PassThrough, Writable } from 'stream';

import { createConstructiveCli } from '../src/cli';
import { explainNext } from '../src/commands/access';

let stash: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
  stash = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-stash-'));
  env = { ...process.env, CONSTRUCTIVE_STASH_DIR: stash };
  for (const name of OVERRIDE_ENV_VARS) delete env[name];
});

afterEach(() => fs.rmSync(stash, { recursive: true, force: true }));

async function run(argv: string[]) {
  let out = '';
  const stdout = new Writable({ write(chunk, _encoding, done) { out += chunk; done(); } });
  const code = await createConstructiveCli().run(argv, { stdin: new PassThrough(), stdout, stderr: new PassThrough(), env, cwd: stash });
  return { code, out, json: out.trimStart().startsWith('{') ? JSON.parse(out) : undefined };
}

const ctx = {
  next: (list: readonly NextWord[], why: string): NextStep => {
    const argv = ['constructive', ...list.map((word) => (typeof word === 'string' ? word : `<${word.placeholder}>`))];
    return { command: argv.join(' '), argv, why };
  }
} as unknown as CommandContext;

describe('access types', () => {
  const authz = allNodeTypes.filter((node) => node.category === 'authz');

  it('lists every rule type of the registry as a table: its name, whether it can go onto an existing table, and its summary', async () => {
    const { code, json } = await run(['access', 'types']);
    expect(code).toBe(0);
    expect(json.data.types.map((type: { name: string }) => type.name)).toEqual(AuthzTypeZod.options);

    const lines = (await run(['access', 'types', '--format', 'text'])).out.split('\n');
    expect(lines[0]).toMatch(/^TYPE +ONTO AN EXISTING TABLE +WHO IT LETS IN$/);
    expect(lines).toContainEqual(expect.stringMatching(/^AuthzAllowAll +yes +\S/));
    expect(lines).toContainEqual(expect.stringMatching(/^AuthzEntityMembership +yes, a Data node adds its columns +\S/));
    expect(lines).toContainEqual(expect.stringMatching(/^AuthzDatabaseClaim +no, add the columns it reads first +\S/));
  });

  it('shows one rule type as its words, then its parameters with type, default and whether required, then the columns it needs', async () => {
    const node = authz.find((entry) => entry.name === 'AuthzMemberOwner');
    const { code, out } = await run(['access', 'types', 'AuthzMemberOwner', '--format', 'text']);
    expect(code).toBe(0);
    const lines = out.split('\n');
    expect(lines[0]).toBe('AuthzMemberOwner');
    expect(lines[1]).toBe(`  ${node.summary}`);
    for (const line of node.use_when) expect(lines).toContain(`  use when    ${line}`);
    expect(lines).toContainEqual(expect.stringMatching(/^ {4}owner_field +column +(default \S+ +)?required/));
    expect(lines).toContain('    owner_field: the column owner_id, which DataOwnershipInEntity always adds');
  });

  it.each([['access', 'add'], ['access', 'set'], ['table', 'add']])('says in the help of %s %s that access types lists the rule types', async (...argv) => {
    const { code, out } = await run([...argv, '--help']);
    expect(code).toBe(0);
    expect(out).toContain('The rule types: constructive access types, and constructive access types <type> for one.');
  });
});

describe('the next steps of access explain', () => {
  const finding = (id: string, columns?: string[]): AccessFinding => ({ id, level: 'medium', summary: id, risk: '', fix: '', operations: ['update'], ...(columns ? { columns } : {}) });
  const table = (findings: AccessFinding[]): ExplainedTable => ({ name: 'notes', rules: [], grants: [], rowSecurity: true, findings });

  it('gives each finding the commands that carry out its fix, each command once, and every one runs', async () => {
    const steps = explainNext({
      tables: [table([finding('owner-outlives-membership'), finding('anyone-can-change'), finding('granted-without-policy'), finding('required-column-not-set', ['entity_id'])])]
    }, ctx);
    expect(steps.map((step) => step.argv.slice(1))).toEqual([
      ['access', 'set', 'notes', '--rule', '<rule>'],
      ['access', 'types'],
      ['access', 'add', 'notes', '--rule', '<rule>'],
      ['field', 'update', 'notes', 'entity_id', '--no-is-required'],
      ['field', 'delete', 'notes', 'entity_id']
    ]);
    for (const step of steps) {
      const words = step.argv.slice(1).filter((word) => !word.startsWith('<') && word !== '--rule');
      expect((await run([...words, '--help'])).code).toBe(0);
    }
  });

  it('gives no step for a table with no finding, nor for a finding no command fixes', () => {
    expect(explainNext({ tables: [table([]), table([finding('policies-without-row-security')])] }, ctx)).toEqual([]);
  });
});
