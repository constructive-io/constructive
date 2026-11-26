import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { AnyHarnessTool } from '@agentic-kit/harness';
import { allNodeTypes, type FieldDefault, policyNodeTypes } from 'node-type-registry';

import { accessFindings, constructiveDbTools, constructiveGateDeps, explainPolicy, fieldsAddedByNodes, TABLE_NEEDS, type TableAccessInput } from '../src';
import { configureHost } from '../src/host';
import { DATABASE_ID, type FakeBackend, type GraphQLAnswer, projectAnswer, type SeenRequest, startFakeBackend } from './fake-backend';
import { expectTextNamesNoTool, suggests } from './follow-up';

type SentPolicy = { $type: string; privileges?: string[]; permissive?: boolean; policy_role?: string; policy_name?: string; data?: Record<string, unknown> };
type Sent = { policies?: SentPolicy[]; grants?: Array<{ roles: string[]; privileges: unknown[][] }>; nodes?: Array<string | { $type: string; data?: object }>; owns?: string[] };

const ALL = ['select', 'insert', 'update', 'delete'];
const TEAM_DATA = { entity_field: 'entity_id', membership_type: 2 };
// The rule sets the tests store on "posts" and send: a team's table, one of the person who made the row, and a team's
// table whose rows only their author changes.
const TEAM = [
  { $type: 'AuthzEntityMembership', privileges: ALL, data: TEAM_DATA },
  { $type: 'AuthzNotReadOnly', privileges: ['insert', 'update', 'delete'], permissive: false, data: TEAM_DATA },
];
const PRIVATE = [{ $type: 'AuthzAppMemberOwner', privileges: ALL, data: { owner_field: 'owner_id' } }];
const TEAM_AUTHORS = [
  { $type: 'AuthzEntityMembership', privileges: ['select'], data: TEAM_DATA },
  { $type: 'AuthzMemberOwner', privileges: ['insert', 'update', 'delete'], data: { owner_field: 'owner_id', ...TEAM_DATA } },
  { $type: 'AuthzNotReadOnly', privileges: ['insert', 'update', 'delete'], permissive: false, data: TEAM_DATA },
];
const OWN_READS = [{ $type: 'AuthzDirectOwner', privileges: ['select'], data: { entity_field: 'owner_id' } }];

// The name the backend gives a policy row: the role's first four letters, the privilege's first three, and the
// rule's name, its type without "Authz" unless it gives one.
const rowName = (policy: { $type: string; policy_role?: string; policy_name?: string }, privilege: string) =>
  `${(policy.policy_role ?? 'authenticated').slice(0, 4)}_${privilege.toLowerCase().slice(0, 3)}_${policy.policy_name ?? policy.$type.replace(/^Authz/, '').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()}`;

// The team rule beside which the backend adds its own read-only limit, when the change grants writes.
const teamRuleOf = (policies: SentPolicy[]) => policies.find((policy) => policy.$type === 'AuthzEntityMembership' && Number(policy.data?.membership_type) >= 2 && policy.data?.entity_field);

// What the backend stores for a table built with these rules and the grants that write: one policy row per privilege,
// and beside a team rule its own read-only limit too.
function storedPolicies(rules: SentPolicy[]) {
  const policies = [...rules];
  const team = teamRuleOf(rules);
  if (team) {
    policies.push({ $type: 'AuthzNotReadOnly', privileges: ['insert', 'update', 'delete'], permissive: false, policy_name: 'read_only_restriction', data: { entity_field: team.data.entity_field, membership_type: team.data.membership_type } });
  }
  return policies.flatMap((policy) =>
    (policy.privileges ?? []).map((privilege) => ({
      tableId: 't1',
      name: rowName(policy, privilege),
      policyType: policy.$type,
      privilege: privilege.toUpperCase(),
      permissive: policy.permissive ?? true,
      granteeName: 'authenticated',
      disabled: false,
      data: policy.data ?? {},
      withCheck: privilege === 'update' ? withCheck : null,
    })),
  );
}
const GRANT_ROWS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'].map((privilege) => ({
  tableId: 't1',
  privilege,
  granteeName: 'authenticated',
  fieldIds: null as string[] | null,
  isGrant: true,
}));
const GRANTS = [{ roles: ['authenticated'], privileges: [['select', '*'], ['insert', '*'], ['update', '*'], ['delete', '*']] }];

type Field = { id: string; name: string; tableId: string; type: { name: string }; isRequired: boolean; defaultValue: unknown };
const TITLE: Field = { id: 'f1', name: 'title', tableId: 't1', type: { name: 'text' }, isRequired: false, defaultValue: null };
let stored: { rules: SentPolicy[]; useRls: boolean; fields: Field[] };
// The rows of "posts" the person signed in to the app sees, and the errors the provision answers with.
let rowsSeen: number;
let provisionErrors: unknown[] | undefined;
// The WITH CHECK override the update policies are stored with.
let withCheck: Record<string, unknown> | null;
// What the backend does when a provision returns: the policy rows it then holds, or that it cannot be read.
let afterProvision: (() => void) | undefined;
let livePolicies: unknown[] | undefined;
let policiesFail: boolean;
let policiesSignedOut: boolean;
// How many reads of the policies fail before one passes.
let policyFailures: number;
let grantRows: typeof GRANT_ROWS;
let backend: FakeBackend;
let cwd: string;

const metaTable = (name: string, all: string, fields: string[]) => ({
  name,
  query: { all },
  inflection: { tableType: name },
  fields: fields.map((field) => ({ name: field, isNotNull: false, hasDefault: false, type: { gqlType: 'String', isArray: false } })),
});

const policyRow = (policy: SentPolicy, privilege: string) => ({
  tableId: 't1',
  name: rowName(policy, privilege),
  policyType: policy.$type,
  privilege: privilege.toUpperCase(),
  permissive: policy.permissive ?? true,
  granteeName: policy.policy_role ?? 'authenticated',
  disabled: false,
  data: policy.data ?? {},
  withCheck: null as Record<string, unknown> | null,
});

// What the backend holds once a secure_table_provision runs: the policies it was sent (in place of the table's own
// with owns), the read-only limit the backend adds beside a team rule when the call grants a write, the
// grants it was sent, and the columns of its nodes. A policy name the table has twice fails the whole call, as
// PostgreSQL refuses it.
function provisioned(sent: Sent): string | undefined {
  const rows = (sent.policies ?? []).flatMap((policy) => (policy.privileges ?? []).map((privilege) => policyRow(policy, privilege)));
  const team = teamRuleOf(sent.policies ?? []);
  const writes = [...new Set((sent.grants ?? []).flatMap((grant) => grant.privileges.map(([privilege]) => String(privilege))))].filter((privilege) => ['insert', 'update', 'delete'].includes(privilege));
  if (team && writes.length) {
    const data = { entity_field: team.data.entity_field, membership_type: team.data.membership_type };
    rows.push(...writes.map((privilege) => policyRow({ $type: 'AuthzNotReadOnly', permissive: false, policy_name: 'read_only_restriction', data }, privilege)));
  }
  const after = (sent.owns?.includes('policies') ? rows : [...(livePolicies ?? storedPolicies(stored.rules)), ...rows]) as Array<{ name: string }>;
  const twice = after.find((row, index) => after.findIndex((other) => other.name === row.name) !== index);
  if (twice) return `policy "${twice.name}" for table "posts" already exists`;
  livePolicies = after;
  if (sent.grants) {
    const sentRows = sent.grants.flatMap((grant) => grant.roles.flatMap((role) => grant.privileges.map(([privilege]) => ({ ...GRANT_ROWS[0], privilege: String(privilege).toUpperCase(), granteeName: role }))));
    grantRows = sent.owns?.includes('grants') ? sentRows : [...grantRows, ...sentRows];
  }
  for (const column of fieldsAddedByNodes(sent.nodes ?? []).fields) {
    if (stored.fields.some((field) => field.name === column.name)) continue;
    const defaultValue = column.default === null || column.default === 'unknown' ? null : column.default;
    stored.fields = [...stored.fields, { id: `f-${column.name}`, name: column.name, tableId: 't1', type: { name: column.type }, isRequired: !column.nullable, defaultValue }];
  }
}

function answer({ host, query, variables }: SeenRequest): GraphQLAnswer {
  // The rows of "posts" on the database's own API.
  if (host.startsWith('api-mydb.')) {
    if (/DbToolsMeta/.test(query)) return { data: { _meta: { tables: [metaTable('Post', 'posts', ['id', 'title'])] } } };
    if (/\bposts\(/.test(query)) return { data: { posts: { nodes: Array.from({ length: rowsSeen }, () => ({ __typename: 'Post' })) } } };
    return { data: {} };
  }
  if (/\bcreateSecureTableProvision\b/.test(query)) {
    if (provisionErrors) return { data: { createSecureTableProvision: null }, errors: provisionErrors };
    if (afterProvision) afterProvision();
    else {
      const refused = provisioned((variables.input as { secureTableProvision: Sent }).secureTableProvision);
      if (refused) return { data: { createSecureTableProvision: null }, errors: [{ message: refused, extensions: { code: 'DUPLICATE_OBJECT' } }] };
    }
    return { data: { createSecureTableProvision: { secureTableProvision: { id: 'stp-1', tableId: 't1', tableName: 'posts' } } } };
  }
  if (/\bentityTypeProvisions\b/.test(query)) return { data: { entityTypeProvisions: { nodes: [{ id: 'et-1', prefix: 'channel', outMembershipType: 3 }] } } };
  if (/\bapis\b/.test(query)) return { data: { apis: { nodes: [{ roleName: 'authenticated', anonRole: 'anonymous' }, { roleName: 'app_member', anonRole: null }] } } };
  if (/\btableGrants\b/.test(query)) return { data: { tableGrants: { nodes: grantRows } } };
  if (/\bpolicies\b/.test(query)) {
    if (policiesFail || policyFailures-- > 0) return { data: null, errors: [{ message: 'connect ECONNREFUSED', extensions: { code: 'NETWORK' } }] };
    if (policiesSignedOut) return { data: null, errors: [{ message: 'Sign in to continue.', extensions: { code: 'UNAUTHENTICATED', class: 'public' } }] };
    return { data: { policies: { nodes: livePolicies ?? storedPolicies(stored.rules) } } };
  }
  if (/\bfields\b/.test(query)) {
    return { data: { fields: { nodes: stored.fields } } };
  }
  if (/\btables\b/.test(query)) return { data: { tables: { nodes: [{ id: 't1', name: 'posts', category: 'APP', useRls: stored.useRls }] } } };
  return { data: {} };
}

beforeEach(async () => {
  cwd = mkdtempSync(path.join(os.tmpdir(), 'db-access-'));
  writeFileSync(path.join(cwd, '.env'), `DATABASE_ID=${DATABASE_ID}\nDATABASE_NAME=mydb\n`);
  stored = { rules: TEAM, useRls: true, fields: [TITLE] };
  rowsSeen = 0;
  provisionErrors = undefined;
  withCheck = null;
  afterProvision = undefined;
  livePolicies = undefined;
  policiesFail = false;
  policiesSignedOut = false;
  policyFailures = 0;
  grantRows = GRANT_ROWS;
  backend = await startFakeBackend((request) => projectAnswer(request.query, 'ME') ?? answer(request));
  configureHost({
    account: () => ({ userId: 'ME', accessToken: 'account-bearer' }),
    backendConfig: () => ({ apiEndpoint: backend.endpoint(), modulesEndpoint: backend.endpoint('modules.localhost') }),
    previewToken: async () => ({ accessToken: 'app-user-token', userId: 'U1' }),
  });
});
afterEach(async () => {
  rmSync(cwd, { recursive: true, force: true });
  await backend.close();
});

const tool = (name: string): AnyHarnessTool => constructiveDbTools.find((candidate) => candidate.name === name);
const run = (name: string, params: Record<string, unknown>) => tool(name).execute(tool(name).parameters.parse(params), { cwd });
const provisions = () => backend.requests.filter(({ query }) => /createSecureTableProvision/.test(query));

// The input the tools must read for "posts": its live policies, grants, row security and columns.
function liveInput(given: SentPolicy[], rls = true): TableAccessInput {
  const rules = new Map<string, TableAccessInput['policies'][number]>();
  for (const row of storedPolicies(given)) {
    const key = JSON.stringify([row.policyType, row.permissive, row.data]);
    const rule = rules.get(key) ?? { type: row.policyType, privileges: [], permissive: row.permissive, role: 'authenticated', data: row.data };
    rule.privileges.push(row.privilege.toLowerCase() as never);
    rules.set(key, rule);
  }
  return { policies: [...rules.values()], grants: GRANTS, rls_enabled: rls, fields: stored.fields.map((field) => ({ name: field.name, required: field.isRequired, default: (field.defaultValue as FieldDefault | null) ?? null, type: field.type.name })) };
}

const wordsOf = (rules: SentPolicy[]) => rules.map((rule) => explainPolicy(rule.$type, rule.data ?? {}));
type Planned = {
  access: Array<{
    before?: { rules: Array<{ $type: string; words: string; permissive: boolean }> };
    after: { rules: Array<{ $type: string; words: string; permissive: boolean }>; grants: string[] };
    columnsAdded?: unknown[];
    columnsReused?: unknown[];
    failsIfRows?: string[];
    notes?: string[];
    findingsAdded: Array<{ id: string; level: string; columns?: string[]; details?: string[] }>;
    findingsRemoved: unknown[];
  }>;
};
const planOf = async (toolName: string, input: Record<string, unknown>) => ((await constructiveGateDeps().precondition(toolName, input, cwd)) as unknown as Planned).access[0];

describe('explain_access', () => {
  it('gives each stored rule in words, the grants, row security and the findings, and no answer about people', async () => {
    const result = await run('explain_access', { table_name: 'posts' });

    expect(result.failure).toBeUndefined();
    const [table] = result.details.tables;
    expect(table).toEqual({
      name: 'posts',
      rules: [
        { $type: 'AuthzEntityMembership', privileges: ALL, permissive: true, policy_role: 'authenticated', words: explainPolicy('AuthzEntityMembership', TEAM_DATA), data: TEAM_DATA },
        { $type: 'AuthzNotReadOnly', privileges: ['insert', 'update', 'delete'], permissive: false, policy_role: 'authenticated', words: explainPolicy('AuthzNotReadOnly', TEAM_DATA), data: TEAM_DATA },
      ],
      grants: ['select, insert, update and delete to authenticated'],
      rowSecurity: true,
      findings: accessFindings(liveInput(TEAM)),
    });
    expect(result.content[0]).toMatchObject({ text: expect.stringContaining(`rule (select, insert, update, delete): ${explainPolicy('AuthzEntityMembership', TEAM_DATA)}`) });
  });

  it('shows a required column no rule sets while it is true, from the field facts it passes', async () => {
    stored.rules = PRIVATE;
    stored.fields = [TITLE, { id: 'f2', name: 'entity_id', tableId: 't1', type: { name: 'uuid' }, isRequired: true, defaultValue: null }];

    const result = await run('explain_access', { table_name: 'posts' });

    expect(result.details.tables[0].findings).toContainEqual(expect.objectContaining({ id: 'required-column-not-set', columns: ['entity_id'] }));
  });

  it('passes the WITH CHECK override of an update policy', async () => {
    withCheck = { $type: 'AuthzDirectOwner', data: { entity_field: 'owner_id' } };

    const result = await run('explain_access', { table_name: 'posts' });

    const read = backend.requests.find(({ query }) => /\bpolicies\b/.test(query));
    expect(read.query).toMatch(/\bwithCheck\b/);
    expect(result.details.tables[0].rules.some((rule: { with_check?: unknown }) => rule.with_check)).toBe(true);
  });

  it('says row security is off, and finds that the rules do not apply', async () => {
    stored.useRls = false;

    const result = await run('explain_access', {});

    expect(result.details.tables[0].rowSecurity).toBe(false);
    expect(result.details.tables[0].findings).toContainEqual(expect.objectContaining({ id: 'policies-without-row-security' }));
  });
});

describe('set_access', () => {
  it('plans the rules now and after from the live table, then replaces the rules in one provision', async () => {
    stored.rules = PRIVATE;
    const input = { table_name: 'posts', policies: TEAM };

    const ready = await constructiveGateDeps().precondition('set_access', input, cwd);
    const result = await run('set_access', input);

    expect(ready).toMatchObject({ kind: 'ready', target: { kind: 'database' } });
    const access = (ready as unknown as Planned).access[0];
    expect(access.before.rules.map((rule) => rule.words)).toEqual(wordsOf(PRIVATE));
    expect(access.after.rules.map((rule) => rule.words)).toEqual(wordsOf(TEAM));
    expect(result.failure).toBeUndefined();
    expect(provisions().map(({ variables }) => (variables.input as { secureTableProvision: unknown }).secureTableProvision)).toEqual([
      expect.objectContaining({
        databaseId: DATABASE_ID,
        tableId: 't1',
        owns: ['policies'],
        nodes: [{ $type: 'DataEntityMembership', data: { entity_field_name: 'entity_id' } }],
        policies: TEAM,
      }),
    ]);
  });

  it('replaces only the policies with a list of rules, and keeps the grants', async () => {
    const policies = [{ $type: 'AuthzAllowAll', privileges: ['select'] }];

    const result = await run('set_access', { table_name: 'posts', policies });

    expect(result.failure).toBeUndefined();
    const sent = (provisions()[0].variables.input as { secureTableProvision: Record<string, unknown> }).secureTableProvision;
    expect(sent).toMatchObject({ owns: ['policies'], policies });
    expect(sent.grants).toBeUndefined();
  });

  it('plans a required column the new access leaves unset from the finding of the after state, and gives the calls that fix it', async () => {
    stored.fields = [TITLE, { id: 'f2', name: 'entity_id', tableId: 't1', type: { name: 'uuid' }, isRequired: true, defaultValue: null }];
    const input = { table_name: 'posts', policies: PRIVATE };

    const planned = await planOf('set_access', input);
    const result = await run('set_access', input);

    expect(planned.findingsAdded).toContainEqual(expect.objectContaining({ id: 'required-column-not-set', level: 'medium', columns: ['entity_id'] }));
    expect(result.calls).toEqual([
      suggests('update_field', { table_name: 'posts', field_name: 'entity_id', is_required: false }),
      suggests('delete_field', { table_name: 'posts', field_name: 'entity_id' }),
    ]);
    expect(result.details.message).toContain('entity_id is required and no rule sets it now: make it optional, or drop it.');
    expectTextNamesNoTool({ message: result.details.message, calls: result.calls });
  });

  it('adds the columns a list of rules needs, and refuses one whose column its Data node cannot add', async () => {
    const policies = [{ $type: 'AuthzDirectOwner', privileges: ['select'], data: { entity_field: 'author_id' } }];

    const result = await run('set_access', { table_name: 'posts', policies });
    const refused = await run('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzMemberOwner', privileges: ['select'], data: { owner_field: 'manager_id', membership_type: 2 } }] });

    expect(result.failure).toBeUndefined();
    const sent = (provisions()[0].variables.input as { secureTableProvision: { nodes: unknown[] } }).secureTableProvision;
    expect(sent.nodes).toEqual([{ $type: 'DataDirectOwner', data: { owner_field_name: 'author_id' } }]);
    expect(refused.failure).toMatchObject({ code: 'invalid-input', message: expect.stringContaining('always adds "owner_id"') });
    expect(provisions()).toHaveLength(1);
  });

  it('sends no Data node for a rule whose columns the table has, and refuses one whose missing column its Data node would add under another name', async () => {
    const uuid = (id: string, name: string): Field => ({ id, name, tableId: 't1', type: { name: 'uuid' }, isRequired: false, defaultValue: null });
    const chart = [{ $type: 'AuthzOrgHierarchy', privileges: ['select'], data: { direction: 'down', anchor_field: 'owner_id', entity_field: 'org_id' } }];
    stored.fields = [TITLE, uuid('f2', 'org_id'), uuid('f3', 'owner_id')];

    const result = await run('set_access', { table_name: 'posts', policies: chart });
    stored.fields = [TITLE, uuid('f2', 'org_id')];
    const refused = await run('set_access', { table_name: 'posts', policies: chart });

    expect(result.failure).toBeUndefined();
    expect((provisions()[0].variables.input as { secureTableProvision: { nodes: unknown[] } }).secureTableProvision.nodes).toEqual([]);
    expect(refused.failure).toMatchObject({ code: 'invalid-input', message: expect.stringContaining('add "owner_id" to the table first') });
    expect(provisions()).toHaveLength(1);
  });

  it('notes that no read-only limit is added beside a team rule, since the change grants nothing', async () => {
    stored.rules = PRIVATE;

    const planned = await planOf('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzEntityMembership', privileges: ['select', 'update'], data: TEAM_DATA }] });

    expect(planned.notes).toContain(
      "No read-only limit is added: the backend adds one only for a change that grants writes, and this one keeps the table's grants. Read-only members of the team pass these rules unless a rule here limits them.",
    );
  });
});

describe('what an access change does to the table', () => {
  const ENTITY_ID = { name: 'entity_id', type: 'uuid', required: true, default: null as string | null };

  it('lists the columns the rules add, and says the change fails if the table has rows this tool cannot see', async () => {
    stored.rules = PRIVATE;

    const planned = await planOf('set_access', { table_name: 'posts', policies: TEAM });

    expect(planned.columnsAdded).toEqual([ENTITY_ID]);
    expect(planned.failsIfRows).toEqual(['entity_id']);
  });

  it('blocks before any change when the person signed in to the app sees a row, and gives the fix', async () => {
    stored.rules = PRIVATE;
    rowsSeen = 1;
    const input = { table_name: 'posts', policies: TEAM };

    const ready = await constructiveGateDeps().precondition('set_access', input, cwd);
    const result = await run('set_access', input);

    expect(ready).toEqual({ kind: 'blocked', failure: result.failure });
    expect(result.failure).toMatchObject({
      code: 'conflict',
      message: expect.stringContaining('has rows, and the change adds the required column entity_id with no value for them'),
      calls: [suggests('create_field', { table_name: 'posts', field_name: 'entity_id', type: 'uuid', is_required: false })],
    });
    expectTextNamesNoTool(result.failure);
    expect(provisions()).toEqual([]);
  });

  it('reads the backend refusal of the new required column as that conflict, not as a missing input', async () => {
    stored.rules = PRIVATE;
    provisionErrors = [{ message: 'A required value is missing.', extensions: { code: 'NOT_NULL_VIOLATION', class: 'public' } }];

    const result = await run('add_policies', { table_name: 'posts', policies: TEAM });

    expect(result.failure).toMatchObject({
      code: 'conflict',
      message: 'Failed to add policies to "posts": table "posts" has rows, and the change adds the required column entity_id with no value for them.',
      calls: [suggests('create_field', { table_name: 'posts', field_name: 'entity_id', type: 'uuid', is_required: false })],
    });
  });

  it('says it reuses a column the table has, with that column\'s own facts, and counts a default computed for new rows as none for the rows there now', async () => {
    stored.rules = PRIVATE;
    stored.fields = [TITLE, { id: 'f2', name: 'entity_id', tableId: 't1', type: { name: 'uuid' }, isRequired: false, defaultValue: null }];

    const planned = await planOf('set_access', { table_name: 'posts', policies: TEAM_AUTHORS });

    expect(planned.columnsAdded).toEqual([{ name: 'owner_id', type: 'uuid', required: true, default: 'jwt_public.current_user_id()', computed: true }]);
    expect(planned.columnsReused).toEqual([{ name: 'entity_id', type: 'uuid', required: false, default: null }]);
    expect(planned.failsIfRows).toEqual(['owner_id']);
  });

  it('blocks rules whose reused column has another type than their node needs, with the fixes', async () => {
    stored.rules = PRIVATE;
    stored.fields = [TITLE, { id: 'f2', name: 'entity_id', tableId: 't1', type: { name: 'text' }, isRequired: false, defaultValue: null }];

    const ready = await constructiveGateDeps().precondition('set_access', { table_name: 'posts', policies: TEAM }, cwd);

    expect(ready).toMatchObject({
      kind: 'blocked',
      failure: {
        code: 'conflict',
        message: expect.stringContaining('has the column entity_id as text, and the rules need it as uuid'),
        calls: [
          suggests('retype_field', { table_name: 'posts', field_name: 'entity_id', type: 'uuid' }),
          suggests('delete_field', { table_name: 'posts', field_name: 'entity_id' }),
        ],
      },
    });
    expect(provisions()).toEqual([]);
  });

  it('says what a reused column without its node\'s default means, from the finding of the after state', async () => {
    stored.fields = [TITLE, { id: 'f2', name: 'owner_id', tableId: 't1', type: { name: 'uuid' }, isRequired: false, defaultValue: null }];

    const planned = await planOf('set_access', { table_name: 'posts', policies: PRIVATE });

    const finding = planned.findingsAdded.find((entry) => entry.id === 'reused-column-differs');
    expect(finding?.details?.join(' ')).toMatch(/owner_id/);
  });

  it.each([
    ['a raw expression', { OR: [{ AuthzEntityMembership: TEAM_DATA }, { A_Const: { boolval: { boolval: true } } }] }],
    ['a mistyped node name', { OR: [{ NoSuchNode: {} }] }],
  ])('refuses %s in a rule a caller writes, before any plan', async (_case, data) => {
    const ready = await constructiveGateDeps().precondition('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzComposite', privileges: ['select'], data }] }, cwd);

    expect(ready).toMatchObject({ kind: 'blocked', failure: { code: 'invalid-input', context: { problems: [expect.objectContaining({ code: 'not-a-node' })] } } });
  });

  it('notes a rule part whose columns cannot be told, and does not refuse it', async () => {
    // The join's columns are read, and the columns the conditions read cannot be told.
    const data = { ref_table: 'users', ref_schema: 'app_public', join: [{ local_column: 'title', ref_column: 'name' }], conditions: [{ column: 'is_active', op: 'eq', value: true }] };
    const planned = await planOf('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzValueExists', privileges: ['select'], data }] });

    expect(planned.notes).toContainEqual(expect.stringContaining('cannot tell which columns AuthzValueExists reads'));
  });

  it('names the new column a misspelled rule adds', async () => {
    stored.fields = [TITLE, { id: 'f2', name: 'entity_id', tableId: 't1', type: { name: 'uuid' }, isRequired: true, defaultValue: null }];

    const planned = await planOf('set_access', {
      table_name: 'posts',
      policies: [{ $type: 'AuthzEntityMembership', privileges: ['select'], data: { entity_field: 'entity_idd', membership_type: 2 } }],
    });

    expect(planned.columnsAdded).toEqual([{ ...ENTITY_ID, name: 'entity_idd' }]);
  });

  it.each([
    ['a rule', { $type: 'AuthzPeerOwnership', privileges: ['select'], data: { owner_field: 'peer_id', membership_type: 2 } }],
    ['a rule inside a combination', { $type: 'AuthzComposite', privileges: ['select'], data: { OR: [{ AuthzPeerOwnership: { owner_field: 'peer_id', membership_type: 2 } }] } }],
  ])('refuses %s that reads a column the table lacks and no node adds, before any change', async (_case, policy) => {
    const input = { table_name: 'posts', policies: [policy] };

    const ready = await constructiveGateDeps().precondition('set_access', input, cwd);
    const result = await run('set_access', input);

    expect(ready).toEqual({ kind: 'blocked', failure: result.failure });
    expect(result.failure).toMatchObject({
      code: 'invalid-input',
      message: 'AuthzPeerOwnership reads the column "peer_id", which table "posts" does not have and this change does not add, so the backend cannot build the rule.',
      calls: [suggests('create_field', { table_name: 'posts', field_name: 'peer_id' }, ['type']), suggests('describe_schema', {})],
    });
    expectTextNamesNoTool(result.failure);
    expect(provisions()).toEqual([]);
  });

  it('a blueprint table: lists the columns its nodes add, and nothing about rows, since the table is new', async () => {
    const planned = await planOf('provision_blueprint', { name: 'notes', description: 'Notes', definition: { tables: [{ table_name: 'notes', policies: TEAM }] } });

    expect(planned.columnsAdded).toContainEqual(ENTITY_ID);
    expect(planned.failsIfRows).toBeUndefined();
  });

  it('a blueprint table: refuses a rule that reads a column the table will not have', async () => {
    const input = {
      name: 'notes',
      description: 'Notes',
      definition: { tables: [{ table_name: 'notes', fields: [{ name: 'title', type: 'text' }], policies: [{ $type: 'AuthzPeerOwnership', data: { owner_field: 'peer_id', membership_type: 2 } }] }] },
    };

    const ready = await constructiveGateDeps().precondition('provision_blueprint', input, cwd);

    expect(ready).toMatchObject({ kind: 'blocked', failure: { code: 'invalid-input', message: expect.stringContaining('AuthzPeerOwnership reads the column "peer_id"') } });
  });

  it('says a change refused in a read-only transaction is read-only, with no call that writes', async () => {
    stored.rules = PRIVATE;
    provisionErrors = [
      {
        message: 'This request is read-only, so it cannot change anything. A read-only credential causes this.',
        extensions: { code: 'READ_ONLY_TRANSACTION', class: 'public', http: 403 },
      },
    ];

    const result = await run('set_access', { table_name: 'posts', policies: TEAM });

    expect(result.failure).toMatchObject({ code: 'read-only', retryable: false, message: expect.stringContaining('the request was read-only, so nothing changed') });
    expect(result.failure.calls).toBeUndefined();
  });

  it('says a refused rule in words, with the call that shows its parameters', async () => {
    provisionErrors = [
      { message: 'MEMBERSHIP_TYPE_SCOPE_NOT_FOUND', extensions: { code: 'MEMBERSHIP_TYPE_SCOPE_NOT_FOUND', class: 'public', context: { detail: 'membership_type 99 has no registered scope' } } },
    ];

    const result = await run('set_access', {
      table_name: 'posts',
      policies: [{ $type: 'AuthzEntityMembership', privileges: ['select'], data: { entity_field: 'entity_id', membership_type: 99 } }],
    });

    expect(result.failure).toMatchObject({
      code: 'invalid-input',
      message: expect.stringContaining('membership_type names a kind of membership this database does not have'),
      calls: [suggests('describe_policy_type', { type: 'AuthzEntityMembership' })],
    });
  });
});

describe('rules as the backend will store them', () => {
  const team = (data: Record<string, unknown>, privileges = ['select']) => ({ $type: 'AuthzEntityMembership', privileges, data: { entity_field: 'entity_id', ...data } });
  const sentRules = (index = 0) => (provisions()[index].variables.input as { secureTableProvision: { policies: Array<Record<string, unknown>> } }).secureTableProvision.policies;

  it('resolves entity_type before the plan, sends what will be stored, and the read-back agrees', async () => {
    const result = await run('set_access', { table_name: 'posts', policies: [team({ entity_type: 'org' }), team({ entity_field: 'owner_id', entity_type: 'channel' }, ['update'])] });

    expect(result.failure).toBeUndefined();
    expect(sentRules().map((rule) => rule.data)).toEqual([
      { entity_field: 'entity_id', membership_type: 2 },
      { entity_field: 'owner_id', membership_type: 3 },
    ]);
  });

  it('refuses an entity type the database does not have, with the ones it has', async () => {
    const ready = await constructiveGateDeps().precondition('set_access', { table_name: 'posts', policies: [team({ entity_type: 'chanel' })] }, cwd);

    expect(ready).toMatchObject({ kind: 'blocked', failure: { code: 'invalid-input', message: expect.stringContaining('channel'), calls: [suggests('list_entity_types', {})] } });
  });

  it('refuses a role no API of the database has, and takes one an API runs as', async () => {
    const refused = await constructiveGateDeps().precondition('set_access', { table_name: 'posts', policies: [{ ...team({ membership_type: 2 }), policy_role: 'nope' }] }, cwd);
    const taken = await constructiveGateDeps().precondition('set_access', { table_name: 'posts', policies: [{ ...team({ membership_type: 2 }), policy_role: 'app_member' }] }, cwd);

    expect(refused).toMatchObject({ kind: 'blocked', failure: { code: 'invalid-input', context: { problems: [expect.objectContaining({ code: 'unknown-role' })] } } });
    expect(taken).toMatchObject({ kind: 'ready' });
  });

  it.each([
    ['the same rule twice', [team({ membership_type: 2 }), team({ membership_type: 2 })], ['select']],
    ['one rule in two pieces that overlap', [team({ membership_type: 2 }, ['select', 'update']), team({ membership_type: 2 }, ['update', 'delete'])], ['select', 'update', 'delete']],
  ])('sends %s as one rule with all its privileges', async (_case, policies, privileges) => {
    await run('set_access', { table_name: 'posts', policies });

    expect(sentRules()).toEqual([expect.objectContaining({ $type: 'AuthzEntityMembership', privileges })]);
  });

  it('add_policies: refuses a rule the table has', async () => {
    const ready = await constructiveGateDeps().precondition('add_policies', { table_name: 'posts', policies: TEAM }, cwd);

    expect(ready).toMatchObject({ kind: 'blocked', failure: { code: 'conflict', message: expect.stringContaining('so the backend would skip this one') } });
  });

  // The backend names a policy by its type, role and privilege, so it refuses a second one of all three.
  it.each<[string, string, Record<string, unknown>, SentPolicy[]]>([
    ['set_access, two rules in the list', 'set_access', { table_name: 'posts', policies: [team({ membership_type: 2 }), team({ entity_field: 'owner_id', membership_type: 2 })] }, TEAM],
    ['add_policies, beside a rule the table has', 'add_policies', { table_name: 'posts', policies: [{ $type: 'AuthzDirectOwner', privileges: ['select'], data: { entity_field: 'author_id' } }] }, OWN_READS],
    [
      'provision_blueprint, two rules of a table',
      'provision_blueprint',
      { name: 'notes', description: 'Notes', definition: { tables: [{ table_name: 'notes', policies: [team({ membership_type: 2 }), { ...team({ entity_field: 'owner_id', membership_type: 2 }), permissive: false }] }] } },
      TEAM,
    ],
  ])('refuses a second rule of one type, role and privilege before the plan: %s, and points to AuthzComposite', async (_case, toolName, input, rules) => {
    stored.rules = rules;

    const ready = await constructiveGateDeps().precondition(toolName, input, cwd);

    expect(ready).toMatchObject({
      kind: 'blocked',
      failure: { message: expect.stringMatching(/second Authz\w+ rule for select and the role authenticated/), calls: expect.arrayContaining([suggests('describe_policy_type', { type: 'AuthzComposite' })]) },
    });
    expect(ready.kind === 'blocked' && ready.failure.hint).toMatch(/AuthzComposite/);
    expectTextNamesNoTool(ready.kind === 'blocked' ? ready.failure : undefined);
    expect(provisions()).toEqual([]);
  });

  // The backend keeps one rule of a type with the same data on a table, whatever its role, and the two roles' rows share a name.
  it.each<[string, Record<string, unknown>]>([
    ['set_access', { table_name: 'posts', policies: [{ $type: 'AuthzAllowAll', privileges: ['select'], policy_role: 'authenticated' }, { $type: 'AuthzAllowAll', privileges: ['select'], policy_role: 'authenticated_client' }] }],
    [
      'provision_blueprint',
      {
        name: 'twins',
        description: 'Two roles',
        definition: { tables: [{ table_name: 'twins', policies: [{ $type: 'AuthzAllowAll', privileges: ['select'], policy_role: 'authenticated' }, { $type: 'AuthzAllowAll', privileges: ['select'], policy_role: 'authenticated_client' }] }] },
      },
    ],
  ])('%s: refuses a second rule of one type and data for another role before the plan', async (toolName, input) => {
    const ready = await constructiveGateDeps().precondition(toolName, input, cwd);

    expect(ready).toMatchObject({ kind: 'blocked', failure: { code: 'invalid-input', message: expect.stringContaining('has the same policy type and data as rule 1') } });
    // The tools do not read which roles are members of which, so the hint names no role to use instead.
    expect(ready.kind === 'blocked' && ready.failure.hint).not.toMatch(/"(public|authenticated|anonymous)"/);
    expect(provisions()).toEqual([]);
  });

  it('add_policies: refuses a rule the backend would skip, one of a type the table has with the same data', async () => {
    stored.rules = OWN_READS;

    const ready = await constructiveGateDeps().precondition('add_policies', { table_name: 'posts', policies: [{ $type: 'AuthzDirectOwner', privileges: ['update'], data: { entity_field: 'owner_id' } }] }, cwd);

    expect(ready).toMatchObject({ kind: 'blocked', failure: { code: 'conflict', message: expect.stringContaining('so the backend would skip this one') } });
  });

  it('add_policies: refuses a team rule beside writes on a table that has the backend\'s read-only limit, whose name the backend never changes', async () => {
    stored.rules = TEAM_AUTHORS;

    const ready = await constructiveGateDeps().precondition('add_policies', { table_name: 'posts', policies: [team({ entity_field: 'owner_id', membership_type: 2 }, ['update'])] }, cwd);

    expect(ready).toMatchObject({ kind: 'blocked', failure: { code: 'conflict', message: expect.stringContaining('already has the policy auth_ins_read_only_restriction'), calls: [suggests('explain_access', { table_name: 'posts' })] } });
  });

  it('sends one rule for two that differ only in their privileges, as the backend keeps one rule of a type with the same data', async () => {
    await run('set_access', { table_name: 'posts', policies: [team({ membership_type: 2 }, ['select']), team({ membership_type: 2 }, ['update'])] });

    expect(sentRules()).toEqual([expect.objectContaining({ $type: 'AuthzEntityMembership', privileges: ['select', 'update'] })]);
  });
});

describe('an empty rule list', () => {
  it('is refused, and says how to let no one in', async () => {
    const replaced = await constructiveGateDeps().precondition('set_access', { table_name: 'posts', policies: [] }, cwd);
    const added = await constructiveGateDeps().precondition('add_policies', { table_name: 'posts', policies: [] }, cwd);

    expect(replaced).toMatchObject({ kind: 'blocked', failure: { code: 'invalid-input', message: expect.stringContaining('AuthzDenyAll') } });
    expect(added).toMatchObject({ kind: 'blocked', failure: { code: 'invalid-input', message: expect.stringContaining('give at least one rule to add') } });
  });
});

describe('set_access reads the access back and compares it with the plan', () => {
  const input = { table_name: 'posts', policies: TEAM };
  // The column the team rule adds, there once the change has run.
  const ENTITY: Field = { id: 'f2', name: 'entity_id', tableId: 't1', type: { name: 'uuid' }, isRequired: true, defaultValue: null };
  const holds = (rows: unknown[]) => () => {
    stored.fields = [TITLE, ENTITY];
    livePolicies = rows;
  };
  beforeEach(() => {
    stored.rules = PRIVATE;
  });

  it('is a success when the table holds the planned set, whatever the backend adds that means nothing', async () => {
    // Derived keys, the backend's own copy of the read-only block, and another order.
    afterProvision = holds(
      storedPolicies(TEAM)
        .map((row) => (row.policyType === 'AuthzEntityMembership' ? { ...row, data: { ...row.data, sprt_table: 'org_memberships_sprt' } } : row))
        .reverse(),
    );

    const result = await run('set_access', input);

    expect(result.failure).toBeUndefined();
  });

  it('is a conflict that names the unplanned rules when the table holds the union of two rule sets, and suggests the calls that help', async () => {
    afterProvision = holds([...storedPolicies(TEAM), ...storedPolicies(PRIVATE)]);

    const result = await run('set_access', input);

    expect(result.failure).toMatchObject({
      code: 'conflict',
      message: expect.stringMatching(/^The access of table "posts" is not what the approved plan said: .*AuthzAppMemberOwner.*Another change may have run at the same moment\.$/),
      calls: [suggests('explain_access', { table_name: 'posts' }), suggests('set_access', input)],
      context: { difference: { unplanned: [expect.objectContaining({ type: 'AuthzAppMemberOwner' })], missing: [] } },
    });
    expectTextNamesNoTool(result.failure);
  });

  it('is a conflict when a planned rule is missing', async () => {
    afterProvision = holds(storedPolicies(TEAM).filter((row) => row.policyType !== 'AuthzNotReadOnly'));

    const result = await run('set_access', input);

    expect(result.failure).toMatchObject({
      code: 'conflict',
      context: { difference: { missing: [expect.objectContaining({ type: 'AuthzNotReadOnly' })], unplanned: [] } },
    });
  });

  it('says the comparison is exact for a rule with a part no Authz node describes', async () => {
    const raw = { tableId: 't1', policyType: 'AuthzComposite', privilege: 'SELECT', permissive: true, granteeName: 'authenticated', disabled: false, data: { OR: [{ A_Const: { boolval: { boolval: true } } }] } };
    afterProvision = holds([...storedPolicies(TEAM), raw]);

    const result = await run('set_access', input);

    expect(result.failure).toMatchObject({ code: 'conflict', message: expect.stringContaining('the comparison of AuthzComposite is exact, not by meaning') });
  });

  it('reads once more after a short wait when the read-back fails in a way that can pass, and then reports what it read', async () => {
    afterProvision = () => {
      holds(storedPolicies(TEAM))();
      policyFailures = 1;
    };

    const result = await run('set_access', input);

    expect(result.failure).toBeUndefined();
  });

  it('gives the sign-in when the session ended during the read-back, and stays unverified', async () => {
    afterProvision = () => {
      policiesSignedOut = true;
    };

    const result = await run('set_access', input);

    expect(result.failure).toMatchObject({ code: 'unverified', hint: expect.stringMatching(/sign in/i) });
  });

  it('says the change was sent and could not be verified when the read-back fails', async () => {
    afterProvision = () => {
      policiesFail = true;
    };

    const result = await run('set_access', input);

    expect(result.failure).toMatchObject({
      code: 'unverified',
      message: expect.stringContaining('The change to the access of table "posts" was sent, and the backend answered that it applied it, but reading the access back failed'),
      calls: [suggests('explain_access', { table_name: 'posts' })],
    });
  });

  it('add_policies: plans what the backend adds itself, the grants a rule list sends and the read-only limit beside a team rule', async () => {
    grantRows = GRANT_ROWS.filter((row) => row.privilege === 'SELECT');
    const policies = [{ $type: 'AuthzEntityMembership', privileges: ['select', 'update'], data: TEAM_DATA }];

    const planned = await planOf('add_policies', { table_name: 'posts', policies });
    const result = await run('add_policies', { table_name: 'posts', policies });

    expect(result.failure).toBeUndefined();
    expect(planned.after.rules).toContainEqual(expect.objectContaining({ $type: 'AuthzNotReadOnly', permissive: false }));
    expect(planned.after.grants).toEqual(['select, insert, update and delete to authenticated']);
    expect(planned.notes).toContain('The backend adds its own read-only limit beside the team rule, for the writes this change grants.');
  });

  it('add_policies: a rule that was there and is gone after the change is a conflict too', async () => {
    afterProvision = holds(storedPolicies(TEAM));

    const result = await run('add_policies', { table_name: 'posts', policies: TEAM });

    expect(result.failure).toMatchObject({ code: 'conflict', context: { difference: { missing: [expect.objectContaining({ type: 'AuthzAppMemberOwner' })] } } });
    expect(result.failure.calls).toEqual([suggests('explain_access', { table_name: 'posts' })]);
  });
});

describe('plans that show access', () => {
  it('add_policies: plans the rules now and after, then adds their nodes, rules and grants without replacing', async () => {
    stored.rules = PRIVATE;
    const input = { table_name: 'posts', policies: TEAM };

    const planned = await planOf('add_policies', input);
    const result = await run('add_policies', input);

    expect(planned.before.rules.map((rule) => rule.words)).toEqual(wordsOf(PRIVATE));
    expect(planned.after.rules.map((rule) => rule.$type)).toEqual(['AuthzAppMemberOwner', 'AuthzEntityMembership', 'AuthzNotReadOnly', 'AuthzNotReadOnly']);
    expect(result.failure).toBeUndefined();
    const sent = (provisions()[0].variables.input as { secureTableProvision: Record<string, unknown> }).secureTableProvision;
    expect(sent).toMatchObject({ tableId: 't1', nodes: [{ $type: 'DataEntityMembership', data: { entity_field_name: 'entity_id' } }], policies: TEAM, grants: GRANTS });
    expect(sent.owns).toBeUndefined();
  });

  it('provision_blueprint: plans each new table\'s rules in words, with the backend\'s read-only limit and the findings', async () => {
    const input = { name: 'notes', description: 'Notes', definition: { tables: [{ table_name: 'notes', policies: TEAM }] } };

    const ready = await constructiveGateDeps().precondition('provision_blueprint', input, cwd);

    const { access } = ready as unknown as Planned & { access: Array<{ table: string }> };
    expect(access).toHaveLength(1);
    expect(access[0]).toMatchObject({ table: 'notes', findingsRemoved: [] });
    expect(access[0].before).toBeUndefined();
    expect(access[0].after.rules.map((rule) => rule.words)).toEqual([...wordsOf(TEAM), explainPolicy('AuthzNotReadOnly', TEAM_DATA)]);
  });
});

describe('add_policies follows the registry for a rule list', () => {
  it('adds the Data node of AuthzMemberOwner', async () => {
    const result = await run('add_policies', { table_name: 'posts', policies: [{ $type: 'AuthzMemberOwner', privileges: ['update'], data: { membership_type: 2 } }] });

    expect(result.failure).toBeUndefined();
    const sent = (provisions()[0].variables.input as { secureTableProvision: { nodes: { $type: string }[] } }).secureTableProvision;
    expect(sent.nodes.map((node) => node.$type)).toEqual(['DataOwnershipInEntity']);
  });
});

describe('rule data is checked against the registry before any change', () => {
  it('add_policies: a key the node does not have is refused with the nearest key and the call for the node\'s parameters', async () => {
    const input = { table_name: 'posts', policies: [{ $type: 'AuthzEntityMembership', privileges: ['select'], data: { entity_field: 'entity_id', membership_type: 2, is_admn: true } }] };

    const ready = await constructiveGateDeps().precondition('add_policies', input, cwd);

    expect(ready).toMatchObject({
      kind: 'blocked',
      failure: { code: 'invalid-input', message: expect.stringContaining('did you mean "is_admin"'), calls: [suggests('describe_policy_type', { type: 'AuthzEntityMembership' })] },
    });
    expect(provisions()).toEqual([]);
  });

  it('set_access: a wrong type, and a value outside an enum, say what is allowed', async () => {
    const wrongType = await run('set_access', {
      table_name: 'posts',
      policies: [{ $type: 'AuthzEntityMembership', privileges: ['select'], data: { entity_field: 'entity_id', membership_type: true } }],
    });
    const outsideEnum = await run('set_access', {
      table_name: 'posts',
      policies: [{ $type: 'AuthzOrgHierarchy', privileges: ['select'], data: { direction: 'sideways', anchor_field: 'owner_id' } }],
    });

    expect(wrongType.failure).toMatchObject({
      code: 'invalid-input',
      message: expect.stringMatching(/^Rule 1 \(AuthzEntityMembership\): AuthzEntityMembership's "membership_type" must be /),
      calls: [suggests('describe_policy_type', { type: 'AuthzEntityMembership' })],
    });
    expectTextNamesNoTool(wrongType.failure);
    expect(outsideEnum.failure).toMatchObject({ code: 'invalid-input', message: 'Rule 1 (AuthzOrgHierarchy): AuthzOrgHierarchy\'s "direction" must be one of "up", "down".' });
    expect(provisions()).toEqual([]);
  });

  it('set_access: refuses data the backend refuses by its own rules, with a call for each node a problem is in', async () => {
    const empty = await run('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzComposite', privileges: ['select'], data: { AND: [] } }] });
    const nested = await run('set_access', {
      table_name: 'posts',
      policies: [{ $type: 'AuthzComposite', privileges: ['select'], data: { OR: [{ AuthzEntityMembership: { entity_field: 'entity_id', membership_type: '2' } }] } }],
    });

    expect(empty.failure).toMatchObject({ code: 'invalid-input', calls: [suggests('describe_policy_type', { type: 'AuthzComposite' })] });
    expect(nested.failure).toMatchObject({
      code: 'invalid-input',
      calls: [suggests('describe_policy_type', { type: 'AuthzComposite' }), suggests('describe_policy_type', { type: 'AuthzEntityMembership' })],
    });
    expectTextNamesNoTool(nested.failure);
    expect(provisions()).toEqual([]);
  });

  it.each([
    ['a mistyped node', { OR: [{ AuthzEntityMembershp: TEAM_DATA }] }, 'did you mean "AuthzEntityMembership"', [suggests('describe_policy_type', { type: 'AuthzEntityMembership' })]],
    ['a raw expression', { OR: [{ A_Const: { boolval: { boolval: true } } }] }, 'it is a raw expression or a node the registry does not have', [suggests('describe_policy_type', {})]],
  ])('set_access: %s is refused with the call that helps', async (_case, data, message, calls) => {
    const result = await run('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzComposite', privileges: ['select'], data }] });

    expect(result.failure).toMatchObject({ code: 'invalid-input', message: expect.stringContaining(message), calls });
    expectTextNamesNoTool(result.failure);
    expect(provisions()).toEqual([]);
  });

  it('provision_blueprint: a missing required key blocks the blueprint before anything changes', async () => {
    const input = { name: 'notes', description: 'Notes', definition: { tables: [{ table_name: 'notes', policies: [{ $type: 'AuthzNotReadOnly', permissive: false }] }] } };

    const ready = await constructiveGateDeps().precondition('provision_blueprint', input, cwd);

    expect(ready).toMatchObject({
      kind: 'blocked',
      failure: { code: 'invalid-input', message: expect.stringContaining('Table "notes", rule 1 (AuthzNotReadOnly): AuthzNotReadOnly needs "entity_field"') },
    });
  });

  it('set_access: a key the backend writes itself is refused in a rule a caller writes', async () => {
    const input = {
      table_name: 'posts',
      policies: [{ $type: 'AuthzEntityMembership', privileges: ['select'], data: { ...TEAM_DATA, mask_table: 'posts' } }],
    };

    const ready = await constructiveGateDeps().precondition('set_access', input, cwd);

    expect(ready).toMatchObject({ kind: 'blocked', failure: { code: 'invalid-input', context: { problems: [expect.objectContaining({ code: 'stored-only-key' })] } } });
  });
});

describe('a key a rule object does not have is refused, not dropped', () => {
  const blocked = async (toolName: string, input: Record<string, unknown>) => {
    const ready = await constructiveGateDeps().precondition(toolName, input, cwd);
    expect(ready.kind).toBe('blocked');
    return ready.kind === 'blocked' ? ready.failure : undefined;
  };
  const team = { $type: 'AuthzEntityMembership', privileges: ['select'], data: TEAM_DATA };

  it.each([
    ['permisive', { permisive: false }, '"permisive" is not a key of a rule: use "permissive".'],
    ['role', { role: 'anonymous' }, '"role" is not a key of a rule: the role is "policy_role".'],
    ['restrictive', { restrictive: true }, '"restrictive" is not a key of a rule: a restrictive rule has "permissive": false.'],
    ['with_check', { with_check: { $type: 'AuthzAllowAll' } }, '"with_check" is not supported in a rule you write: the tools cannot give an update rule its own check of the changed row.'],
  ])('set_access: %s', async (_key, extra, message) => {
    const failure = await blocked('set_access', { table_name: 'posts', policies: [{ ...team, ...extra }] });

    expect(failure).toMatchObject({ code: 'invalid-input', message: expect.stringContaining(message) });
    expect(provisions()).toEqual([]);
  });

  it('add_policies takes the same rule shape, and names a key of another one', async () => {
    const failure = await blocked('add_policies', { table_name: 'posts', policies: [{ $type: 'AuthzAllowAll', operations: ['read'] }] });

    expect(failure.message).toContain('"operations" is not a key of a rule: give "privileges" (select, insert, update, delete).');
  });

  it('provision_blueprint: a key a rule does not have, by the same rule shape', async () => {
    const failure = await blocked('provision_blueprint', {
      name: 'notes',
      description: 'Notes',
      definition: { tables: [{ table_name: 'notes', policies: [{ $type: 'AuthzAllowAll', permisive: false }] }] },
    });

    expect(failure.message).toContain('Table "notes", rule 1 (AuthzAllowAll): "permisive" is not a key of a rule: use "permissive".');
  });

  it.each(constructiveDbTools.map((candidate) => candidate.name))('%s: a top-level key it does not have', async (name) => {
    const parsed = tool(name).parameters.safeParse({ tabel_name: 'posts' });

    expect(parsed.success).toBe(false);
    expect(parsed.error.issues.map((issue) => issue.message).join(' ')).toContain('"tabel_name" is not a key of the input');
  });

  it('a top-level key names the nearest known one', async () => {
    const failure = await blocked('provision_database', { database_nme: 'next' });

    expect(failure.message).toContain('"database_nme" is not a key of the input: use "database_name".');
  });

  it('update_template: a patch key', async () => {
    const failure = await blocked('update_template', { templateName: 'Todo', patch: { visiblity: 'public' } });

    expect(failure.message).toContain('"visiblity" is not a key of a patch: use "visibility".');
  });
});

describe('describe_policy_type', () => {
  const authz = allNodeTypes.filter((node) => node.category === 'authz');

  it('lists every policy type with its summary and what it needs on the table', async () => {
    const result = await run('describe_policy_type', {});

    expect(result.details.types).toEqual(policyNodeTypes.map((node) => ({ name: node.name, summary: node.summary, tableKind: TABLE_NEEDS[node.name]?.kind })));
    expect(result.details.types.map((type: { name: string }) => type.name)).not.toContain('AuthzColumnSecurity');
  });

  it('describes one node: its parameters, its plain words and the columns it needs', async () => {
    const result = await run('describe_policy_type', { type: 'AuthzMemberOwner' });

    const node = authz.find((entry) => entry.name === 'AuthzMemberOwner');
    expect(result.details.type).toEqual({
      name: 'AuthzMemberOwner',
      summary: node.summary,
      tableKind: TABLE_NEEDS.AuthzMemberOwner.kind,
      parameterSchema: node.parameter_schema,
      useWhen: node.use_when ?? [],
      avoidWhen: node.avoid_when ?? [],
      risks: node.risks ?? [],
      dataNode: TABLE_NEEDS.AuthzMemberOwner.data_node,
    });
  });
});
