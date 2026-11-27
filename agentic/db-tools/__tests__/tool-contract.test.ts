import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  type AnyHarnessTool,
  createConstructiveGatePolicy,
  TOOL_FAILURE_CODES,
  TOOL_FAILURE_MEANINGS,
  type ToolEffect,
  type ToolFailureCode,
} from '@agentic-kit/harness';

import { constructiveDbTools, constructiveGateDeps, toolSchema } from '../src';
import { configureHost, type ToolsHost } from '../src/host';
import { expectTextNamesNoTool, suggests } from './follow-up';

const packageRoot = path.join(__dirname, '..');
const byName = (name: string): AnyHarnessTool => {
  const tool = constructiveDbTools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`no db tool named ${name}`);
  return tool;
};

const UUID = '019a1d47-5c2e-7a1b-8f00-112233445566';
// The backend mints some ids from an md5 hash, which sets no version bits.
const MD5_UUID = '0d3c1d47-5c2e-9a1b-0f00-112233445566';

const BLUEPRINT = {
  name: 'crm',
  description: 'CRM',
  definition: { tables: [{ table_name: 'contacts', policies: [{ $type: 'AuthzAllowAll' }] }] },
};

// One representative call per tool, with the effect it must have.
const CALLS: [string, Record<string, unknown>, ToolEffect][] = [
  ['provision_database', { database_name: 'myapp' }, 'write'],
  ['replace_database', { database_name: 'myapp' }, 'destructive'],
  ['describe_schema', {}, 'read'],
  ['list_templates', {}, 'read'],
  ['provision_blueprint', BLUEPRINT, 'write'],
  ['add_relation', { source_table: 'posts', target_table: 'users', field_name: 'author_id' }, 'write'],
  [
    'add_relation',
    { relation_type: 'many_to_many', source_table: 'posts', target_table: 'tags', junction_table_name: 'post_tags' },
    'write',
  ],
  ['delete_table', { table_name: 'posts' }, 'destructive'],
  ['create_field', { table_name: 'posts', field_name: 'title', type: 'text' }, 'write'],
  ['update_field', { table_name: 'posts', field_name: 'title', new_name: 'headline' }, 'write'],
  ['retype_field', { table_name: 'posts', field_name: 'title', type: 'citext' }, 'destructive'],
  ['delete_field', { table_name: 'posts', field_name: 'title' }, 'destructive'],
  ['add_policies', { table_name: 'posts', policies: [{ $type: 'AuthzAllowAll', privileges: ['select'] }] }, 'write'],
  ['apply_template', { templateName: 'CRM' }, 'write'],
  ['create_template', { displayName: 'CRM' }, 'write'],
  ['update_template', { templateName: 'CRM', patch: { description: 'Contacts' } }, 'write'],
  ['delete_template', { templateName: 'CRM' }, 'destructive'],
  ['add_records', { table_name: 'posts', records: [{ title: 'Hello' }] }, 'write'],
  ['list_entity_types', {}, 'read'],
  ['create_entity_type', { name: 'team' }, 'write'],
  ['delete_entity_type', { entity_type_id: UUID }, 'destructive'],
  ['create_api_key', { key_name: 'deploy bot' }, 'write'],
  ['run_codegen', {}, 'write'],
  ['explain_access', { table_name: 'posts' }, 'read'],
  ['set_access', { table_name: 'posts', policies: [{ $type: 'AuthzAllowAll', privileges: ['select'] }] }, 'write'],
  ['describe_policy_type', { type: 'AuthzMemberOwner' }, 'read'],
];

describe('tool effects', () => {
  it('has a call for every db tool', () => {
    expect([...new Set(CALLS.map(([name]) => name))].sort()).toEqual(
      constructiveDbTools.map((tool) => tool.name).sort(),
    );
  });

  it.each(constructiveDbTools.map((tool) => [tool.name, tool] as const))('%s states one effect for every call', (_name, tool) => {
    expect(['read', 'write', 'destructive']).toContain(tool.effect);
  });

  it.each(CALLS)('%s %j is %s', (name, params, effect) => {
    expect(byName(name).parameters.safeParse(params).success).toBe(true);
    expect(byName(name).effect).toBe(effect);
  });
});

describe('the Constructive gate policy', () => {
  // The gated set before tools stated an effect: the oracle the effect-based
  // policy has to agree with.
  const MUTATING_DB_TOOLS = new Set([
    'provision_database',
    'replace_database',
    'provision_blueprint',
    'add_relation',
    'delete_table',
    'create_field',
    'update_field',
    'retype_field',
    'delete_field',
    'add_policies',
    'apply_template',
    'create_template',
    'update_template',
    'delete_template',
    'add_records',
    'create_entity_type',
    'delete_entity_type',
    'create_api_key',
    'run_codegen',
    'set_access',
  ]);

  const policy = createConstructiveGatePolicy(constructiveGateDeps());

  it.each(CALLS)('gates %s %j as the name list did', (toolName, input) => {
    expect(policy.isGated({ toolName, toolCallId: 'tc-1', input })).toBe(MUTATING_DB_TOOLS.has(toolName));
  });

  it('leaves a tool it does not know ungated', () => {
    expect(policy.isGated({ toolName: 'bash', toolCallId: 'tc-1', input: { command: 'rm -rf /' } })).toBe(false);
  });
});

// The JSON Schema pi validates tool arguments with, checked by the validator pi
// uses. typebox ships ESM only, so it runs in a child node process.
function checkWithTypebox(cases: { schema: unknown; params: unknown }[]): boolean[] {
  const script = [
    "import { Compile } from 'typebox/compile';",
    "let input = '';",
    "process.stdin.on('data', (chunk) => (input += chunk)).on('end', () => {",
    '  const cases = JSON.parse(input);',
    '  process.stdout.write(JSON.stringify(cases.map((c) => Compile(c.schema).Check(c.params))));',
    '});',
  ].join('\n');
  const out = execFileSync('node', ['--input-type=module', '-e', script], {
    cwd: packageRoot,
    input: JSON.stringify(cases),
    encoding: 'utf8',
  });
  return JSON.parse(out) as boolean[];
}

// Longer than the 63 characters of an identifier.
const LONG_LABEL = 'Customer relationship management for small teams, with invoices and quotes';

describe('tool parameters', () => {
  const PARAMS: [string, Record<string, unknown>, boolean][] = [
    ['delete_table', { table_name: 'posts' }, true],
    ['delete_table', { table_name: 'Bücher 日本 p{Cc} 🙂' }, true],
    ['delete_table', { table_name: 'posts\n' }, false],
    ['delete_table', { table_name: 'po\u0000sts' }, false],
    ['delete_table', { table_name: 'posts\u007f' }, false],
    ['delete_table', { table_name: 'posts\u0085' }, false],
    // Format characters that make a name read differently in a prompt.
    ['delete_table', { table_name: 'stsop\u202e' }, false],
    ['delete_table', { table_name: 'po\u200bsts' }, false],
    ['delete_table', { table_name: 'posts\u2028' }, false],
    ['delete_table', { table_name: '\ufeffposts' }, false],
    ['delete_table', { table_name: 'po\u2066sts' }, false],
    ['delete_table', { table_name: '' }, false],
    // The backend cuts a table or field name to 63 characters.
    ['delete_table', { table_name: 'a'.repeat(63) }, true],
    ['delete_table', { table_name: 'a'.repeat(64) }, false],
    ['create_field', { table_name: 'posts', field_name: 'ti\ttle', type: 'text' }, false],
    ['update_field', { table_name: 'posts', field_name: 'title', new_name: 'headline\r' }, false],
    ['add_relation', { source_table: 'posts', target_table: 'users\n', field_name: 'author_id' }, false],
    [
      'add_policies',
      { table_name: 'posts', policies: [{ $type: 'AuthzAllowAll', privileges: ['select'], policy_role: 'auth\u001b' }] },
      false,
    ],
    ['add_records', { table_name: 'posts\u0000', records: [{ title: 'line one\nline two' }] }, false],
    ['add_records', { table_name: 'posts', records: [{ title: 'line one\nline two' }] }, true],
    ['create_template', { displayName: 'CRM\n' }, false],
    // A label is text, not an identifier: a template stored with a long display name stays reachable.
    ['apply_template', { templateName: LONG_LABEL }, true],
    ['update_template', { templateName: LONG_LABEL, patch: { displayName: `${LONG_LABEL} v2`, tags: [LONG_LABEL] } }, true],
    ['delete_template', { templateName: LONG_LABEL }, true],
    ['create_api_key', { key_name: LONG_LABEL }, true],
    ['delete_template', { templateName: 'a'.repeat(256) }, true],
    ['delete_template', { templateName: 'a'.repeat(257) }, false],
    ['delete_template', { templateName: '' }, false],
    ['delete_template', { templateName: 'CRM\u202e' }, false],
    ['apply_template', { templateName: 'CRM', nameOverride: 'crm\u0007' }, false],
    ['provision_blueprint', BLUEPRINT, true],
    ['provision_blueprint', { ...BLUEPRINT, definition: { tables: [{ table_name: 'contacts\r', policies: [] }] } }, false],
    ['provision_blueprint', { ...BLUEPRINT, definition: { tables: [{ table_name: 'contacts', fields: [{ name: 'e\u202email', type: 'text' }] }] } }, false],
    ['delete_entity_type', { entity_type_id: UUID }, true],
    ['delete_entity_type', { entity_type_id: MD5_UUID }, true],
    ['delete_entity_type', { entity_type_id: 'etp-1' }, false],
    ['create_entity_type', { name: 'team\n' }, false],
    ['create_api_key', { key_name: 'ci', entity_ids: [UUID, MD5_UUID] }, true],
    ['create_api_key', { key_name: 'ci', entity_ids: ['not-a-uuid'] }, false],
    ['create_api_key', { key_name: 'ci\tbot' }, false],
    // The backend's database_provision_module check: ^[a-zA-Z][a-zA-Z0-9_-]*$, 3 to 63 characters.
    ['provision_database', { database_name: 'my-app_1' }, true],
    ['provision_database', { database_name: 'a'.repeat(63) }, true],
    ['provision_database', { database_name: 'ab' }, false],
    ['provision_database', { database_name: 'a'.repeat(64) }, false],
    ['provision_database', { database_name: '1app' }, false],
    ['provision_database', { database_name: 'my app' }, false],
    ['provision_database', { database_name: 'myapp\n' }, false],
  ];

  const typebox = checkWithTypebox(
    PARAMS.map(([name, params]) => ({ schema: toolSchema(byName(name).parameters), params })),
  );

  it.each(PARAMS.map((row, index) => [...row, typebox[index]] as const))(
    '%s %j is valid: %s, by zod and by the JSON Schema',
    (name, params, valid, validByTypebox) => {
      expect(byName(name).parameters.safeParse(params).success).toBe(valid);
      expect(validByTypebox).toBe(valid);
    },
  );
});

describe('tool failures without a network', () => {
  // No request may leave the process: the endpoint is the discard port.
  const BACKEND = { apiEndpoint: 'http://127.0.0.1:9/graphql', modulesEndpoint: 'http://127.0.0.1:9/graphql' };
  const SIGNED_IN: ToolsHost = {
    account: () => ({ userId: 'user-1', accessToken: 'account-bearer' }),
    backendConfig: () => BACKEND,
  };

  let cwd: string;
  beforeEach(() => {
    cwd = mkdtempSync(path.join(os.tmpdir(), 'db-tool-contract-'));
    // A scaffolded app, so run_codegen never clones the template.
    mkdirSync(path.join(cwd, 'packages', 'app'), { recursive: true });
    writeFileSync(path.join(cwd, 'packages', 'app', 'package.json'), '{}');
  });
  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  const bound = (env: string) => writeFileSync(path.join(cwd, '.env'), env);
  const BINDING = `DATABASE_ID=${UUID}\nDATABASE_NAME=myapp\n`;

  const throws = (message: string) => (): never => {
    throw new Error(message);
  };
  type Scenario = { host: ToolsHost; env?: string };
  const SCENARIOS: Record<string, Scenario> = {
    'no .env': { host: SIGNED_IN },
    'no DATABASE_ID': { host: SIGNED_IN, env: 'DATABASE_NAME=myapp\n' },
    'signed out': { host: { ...SIGNED_IN, account: () => null }, env: BINDING },
    'no backend': { host: { ...SIGNED_IN, backendConfig: () => null }, env: BINDING },
    'backend settings throw': { host: { ...SIGNED_IN, backendConfig: throws('Invalid API endpoint URL: not a url') }, env: BINDING },
    'account throws': { host: { ...SIGNED_IN, account: throws('the keychain is locked') }, env: BINDING },
  };

  // provision_database and replace_database need no project, so they reach the
  // backend in most of these scenarios; they run only in the ones that stop
  // before that. describe_policy_type reads only the registry.
  const CONTEXT_TOOLS = CALLS.filter(([name]) => !['provision_database', 'replace_database', 'describe_policy_type'].includes(name));
  type Row = [scenario: string, tool: string, params: Record<string, unknown>, code: ToolFailureCode];
  const everyContextTool = (scenario: string, code: ToolFailureCode): Row[] =>
    CONTEXT_TOOLS.map(([name, params]) => [scenario, name, params, code]);
  const ROWS: Row[] = [
    ...everyContextTool('no .env', 'no-env'),
    ...everyContextTool('no DATABASE_ID', 'missing-credentials'),
    ...everyContextTool('signed out', 'signed-out'),
    ...everyContextTool('no backend', 'no-backend'),
    ...everyContextTool('backend settings throw', 'no-backend'),
    ...everyContextTool('account throws', 'signed-out'),
    ['signed out', 'provision_database', { database_name: 'myapp' }, 'signed-out'],
    ['no backend', 'provision_database', { database_name: 'myapp' }, 'no-backend'],
    ['backend settings throw', 'provision_database', { database_name: 'myapp' }, 'no-backend'],
    ['account throws', 'provision_database', { database_name: 'myapp' }, 'signed-out'],
    ['no .env', 'update_field', { table_name: 'posts', field_name: 'title' }, 'invalid-input'],
    ['no .env', 'add_relation', { source_table: 'posts', target_table: 'users' }, 'invalid-input'],
    ['no .env', 'add_relation', { relation_type: 'many_to_many', source_table: 'posts', target_table: 'tags' }, 'invalid-input'],
    ['no .env', 'create_entity_type', { name: '  ' }, 'invalid-input'],
    ['no .env', 'create_api_key', { key_name: '   ' }, 'invalid-input'],
    ['no .env', 'add_records', { table_name: 'posts', records: [] }, 'invalid-input'],
  ];

  it.each(ROWS)('%s: %s %j fails with %s', async (scenario, name, params, code) => {
    const { host, env } = SCENARIOS[scenario];
    configureHost(host);
    if (env) bound(env);

    const tool = byName(name);
    const result = await tool.execute(tool.parameters.parse(params), { cwd });
    // The gate runs the tool's own first check, so it blocks with the same failure.
    const blocked = await constructiveGateDeps().precondition(name, params, cwd);

    expect(result.failure?.code).toBe(code);
    expect(blocked).toEqual({ kind: 'blocked', failure: result.failure });
    expect(TOOL_FAILURE_CODES).toContain(result.failure.code);
    expectTextNamesNoTool(result.failure);
    // No database yet: the call that makes one, with its name left to choose.
    if (code === 'no-env') expect(result.failure.calls).toEqual([suggests('provision_database', {}, ['database_name'])]);
    expect(result.failure.message).not.toBe('');
    const text = result.content.map((block) => (block.type === 'text' ? block.text : '')).join('\n');
    expect(text).toContain(result.failure.message);
    if (result.failure.hint) expect(text).toContain(result.failure.hint);
  });
});

describe('the meaning of each failure code', () => {
  it('names no tool that is not registered', () => {
    const tools = new Set(constructiveDbTools.map((tool) => tool.name));
    const named = TOOL_FAILURE_CODES.flatMap((code) => (TOOL_FAILURE_MEANINGS[code].match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? []).map((name) => [code, name]));
    expect(named.filter(([, name]) => !tools.has(name))).toEqual([]);
  });
});

// The inputs of the R3 review (rv3/mcp/n5.cjs) that hosts with strict function calling send: every optional key, as null.
describe('null for an optional key reads as not given', () => {
  const tool = (name: string) => constructiveDbTools.find((candidate) => candidate.name === name);
  const team = { $type: 'AuthzEntityMembership', privileges: ['select'], data: { entity_field: 'entity_id', membership_type: 2 } };
  it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
    ['create_field', { table_name: 't', field_name: 'f', type: 'text', is_required: null }, { table_name: 't', field_name: 'f', type: 'text' }],
    ['update_field', { table_name: 't', field_name: 'f', is_required: null, new_name: 'g' }, { table_name: 't', field_name: 'f', new_name: 'g' }],
    ['set_access', { table_name: 't', policies: [{ ...team, permissive: null, policy_role: null }] }, { table_name: 't', policies: [team] }],
    ['set_access', { table_name: 't', policies: [{ $type: 'AuthzAllowAll', privileges: ['select'], data: null }] }, { table_name: 't', policies: [{ $type: 'AuthzAllowAll', privileges: ['select'] }] }],
    [
      'add_policies',
      { table_name: 't', policies: [{ $type: 'AuthzAllowAll', privileges: ['select'], permissive: null, policy_role: null, data: null }] },
      { table_name: 't', policies: [{ $type: 'AuthzAllowAll', privileges: ['select'] }] },
    ],
    ['explain_access', { table_name: null }, {}],
  ])('%s %j', (name, input, parsed) => {
    expect(tool(name).parameters.safeParse(input)).toEqual({ success: true, data: parsed });
  });

  it.each([[0], [false], [true], [12.5]])('takes the constant default %j as a number or a boolean', (value) => {
    expect(tool('create_field').parameters.safeParse({ table_name: 't', field_name: 'f', type: 'integer', default_value: value })).toMatchObject({ success: true, data: { default_value: value } });
  });
});
