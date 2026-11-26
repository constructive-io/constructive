import type { CommandContext, NextStep, NextWord } from '@agentic-kit/command';
import { blueprintProblems, expandBlueprintDefaults, provisionBlueprintTool } from '@agentic-kit/db-tools';
import { OVERRIDE_ENV_VARS } from '@agentic-kit/session';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PassThrough, Writable } from 'stream';

import { createConstructiveCli } from '../src/cli';
import { OWNER_NODE, OWNER_ONLY_RULE } from '../src/commands/access';
import { tableAddNext, tableAddText, tableBlueprint } from '../src/commands/tools';

const RULE = JSON.stringify(OWNER_ONLY_RULE);

const ctx = {
  next: (words: readonly NextWord[], why: string): NextStep => {
    const argv = ['constructive', ...words.map((word) => (typeof word === 'string' ? word : `<${word.placeholder}>`))];
    return { command: argv.join(' '), argv, why };
  }
} as unknown as CommandContext;

describe('tableBlueprint', () => {
  it.each([
    [[], []],
    [['title:text:required', 'done:boolean'], [{ name: 'title', type: 'text', is_required: true }, { name: 'done', type: 'boolean' }]],
    [['tags:text[]', 'due_at:timestamptz'], [{ name: 'tags', type: 'text[]' }, { name: 'due_at', type: 'timestamptz' }]]
  ])('maps --field %j, --node and --rule to one table with those fields, nodes and rules', (specs, fields) => {
    expect(tableBlueprint({ name: 'tasks', field: specs, node: [OWNER_NODE], rule: [RULE] }, ctx)).toEqual({
      name: 'tasks',
      description: 'Add the table "tasks"',
      definition: { tables: [{ table_name: 'tasks', nodes: [OWNER_NODE], policies: [OWNER_ONLY_RULE], fields }] }
    });
  });

  it('takes a node as JSON with its data', () => {
    const node = { $type: 'DataDirectOwner', data: { owner_field_name: 'author_id' } };
    const rule = { ...OWNER_ONLY_RULE, data: { entity_field: 'author_id' } };
    expect(tableBlueprint({ name: 'notes', node: [JSON.stringify(node)], rule: [JSON.stringify(rule)] }, ctx).definition.tables[0]).toMatchObject({ nodes: [node], policies: [rule] });
  });

  it('gives an owner-only example that the registry blueprint schema takes as it is, and the tool input check keeps', () => {
    const blueprint = tableBlueprint({ name: 'tasks', field: ['title:text'], node: [OWNER_NODE], rule: [RULE] }, ctx);
    expect(blueprintProblems(expandBlueprintDefaults(blueprint.definition as unknown as Record<string, unknown>))).toEqual([]);
    expect(provisionBlueprintTool.parameters.parse(blueprint).definition.tables).toEqual(blueprint.definition.tables);
  });
});

describe('the result of table add', () => {
  const details = {
    created: 1,
    total: 1,
    error: null as string | null,
    constructionId: 'c-1',
    tables: [
      {
        name: 'abc',
        requestedName: 'a_b_c',
        fields: [{ name: 'xy', requestedName: 'x_y', type: 'text', isRequired: false, defaultValue: null as string | null }],
        policies: ['AuthzAppMemberOwner'],
        relationCount: 0
      }
    ]
  };

  it('says in one sentence each that the backend stored another name, and names the stored table in its next steps', () => {
    const text = tableAddText(details);
    expect(text).toContain('The backend stored the table "a_b_c" as "abc", and the field "x_y" as "xy"; use the stored names in other commands.');
    expect(tableAddNext(details, ctx).map((step) => step.argv.slice(1))).toEqual([['schema', 'show'], ['access', 'explain', 'abc']]);
  });

  it('adds no sentence when every name was stored as given', () => {
    const plain = { ...details, tables: [{ ...details.tables[0], requestedName: undefined as string | undefined, fields: [] as typeof details.tables[0]['fields'] }] };
    expect(tableAddText(plain)).not.toContain('stored');
  });
});

describe('table add on the command line', () => {
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
    return { code, json: JSON.parse(out) };
  }

  it('refuses a table with no rule as a usage error, with a ready owner-only example and the command that lists the rule types', async () => {
    const { code, json } = await run(['table', 'add', 'tasks', '--field', 'title:text']);
    expect(code).toBe(2);
    expect(json.error).toMatchObject({ code: 'missing-input', details: { missing: ['--rule'], example: { node: OWNER_NODE, rule: OWNER_ONLY_RULE } } });
    expect(json.error.hint).toContain(`--node ${OWNER_NODE} --rule '${RULE}'`);
    expect(json.meta.next.map((step: NextStep) => step.argv.slice(1))).toEqual([
      ['table', 'add', 'tasks', '--field', 'title:text', '--node', OWNER_NODE, '--rule', RULE],
      ['access', 'types']
    ]);
  });

  it.each([
    [['--field', 'title'], '--field', 'title'],
    [['--field', 'title:'], '--field', 'title:'],
    [['--field', ':text'], '--field', ':text'],
    [['--field', 'title:text:optional'], '--field', 'title:text:optional'],
    [['--field', 'title:text:required:unique'], '--field', 'title:text:required:unique'],
    [['--field', 'my-title:text'], '--field', 'my-title:text'],
    [['--field', 'title:text', '--field', 'title:boolean'], '--field', 'title:boolean'],
    [['--field', 'id:uuid'], '--field', 'id:uuid'],
    [['--field', 'owner_id:uuid'], '--field', 'owner_id:uuid'],
    [['--field', 'created_at:timestamptz'], '--field', 'created_at:timestamptz'],
    [['--node', 'data-direct-owner'], '--node', 'data-direct-owner'],
    [['--node', '{"data":{}}'], '--node', '{"data":{}}']
  ])('rejects %j with invalid-input before anything is sent', async (flags, flag, bad) => {
    const { code, json } = await run(['table', 'add', 'tasks', '--rule', RULE, ...flags]);
    expect(code).toBe(2);
    expect(json.error).toMatchObject({ code: 'invalid-input', details: { flag } });
    expect(json.error.message).toContain(`"${bad}"`);
  });

  it('names the --rule that is not a JSON object', async () => {
    const { code, json } = await run(['table', 'add', 'tasks', '--rule', RULE, '--rule', 'AuthzDirectOwner']);
    expect(code).toBe(2);
    expect(json.error).toMatchObject({ code: 'invalid-input', details: { flag: '--rule', index: 1 } });
  });

  it('takes no --access: the flag is gone', async () => {
    const { code, json } = await run(['table', 'add', 'tasks', '--access', 'team']);
    expect(code).toBe(2);
    expect(json.error).toMatchObject({ code: 'unknown-flag', details: { flag: '--access' } });
  });
});
