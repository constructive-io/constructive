import { allNodeTypes } from 'node-type-registry';

// The registry's record of a users table: its columns and the rules the backend stored for it.
import USERS from '../../../packages/node-type-registry/__tests__/fixtures/sample-users-table.json';
import { accessFindings, columnGaps, DERIVED_KEYS, explainPolicy, policyDifference, resolveEntityTypes, type TableAccessInput, type TableField, type TablePolicy } from '../src/access';

type Privilege = TablePolicy['privileges'][number];

const ALL: Privilege[] = ['select', 'insert', 'update', 'delete'];
const CHANGES: Privilege[] = ['insert', 'update', 'delete'];
const TEAM = { entity_field: 'entity_id', membership_type: 2 };

function policy(type: string, privileges: Privilege[], data: Record<string, unknown> = {}, extra: Partial<TablePolicy> = {}): TablePolicy {
  return { type, privileges, permissive: true, data, ...extra };
}

// A team table as describe_schema returned it on a local stack (the schema names are made up): the backend added
// sel_field, sprt_table and sprt_schema itself.
const LIVE_NOTES: TablePolicy[] = [
  policy('AuthzEntityMembership', ALL, { sel_field: 'entity_id', sprt_table: 'org_memberships_sprt', sprt_schema: 'app-1a2b3c4d-memberships-private', ...TEAM }, { role: 'authenticated' }),
  policy('AuthzNotReadOnly', CHANGES, { sprt_table: 'org_memberships_sprt', sprt_schema: 'app-1a2b3c4d-memberships-private', ...TEAM }, { permissive: false, role: 'authenticated' })
];

const LIVE_RAW_COMPOSITE = policy('AuthzComposite', ['select'], {
  BoolExpr: { args: [{ AuthzAppMembership: { mask: '0000000000010000', bitlen: 16, sprt_table: 'app_memberships_sprt', sprt_schema: 's', membership_type: 1 } }, { A_Expr: { kind: 'AEXPR_OP' } }], boolop: 'AND_EXPR' }
});

const TEAM_RULES = [policy('AuthzEntityMembership', ALL, TEAM), policy('AuthzNotReadOnly', CHANGES, TEAM, { permissive: false })];
const PRIVATE = [policy('AuthzAppMemberOwner', ALL, { owner_field: 'owner_id' })];

// A caller's rules in the form the backend stores, with the database's own team kinds only.
const resolved = (policies: TablePolicy[]) => resolveEntityTypes(policies, []).policies;
const only = (policies: TablePolicy[]) => policies.map(({ type, privileges, permissive }) => [type, privileges, permissive]);

describe('the keys the backend derives', () => {
  test('each is a key of the node', () => {
    const nodes = new Map(allNodeTypes.map((node) => [node.name, node]));
    for (const [type, keys] of Object.entries(DERIVED_KEYS)) {
      for (const key of keys) expect([type, key, Boolean(nodes.get(type).parameter_schema.properties[key])]).toEqual([type, key, true]);
    }
  });

  test('with no team kind, the backend keeps a caller\'s member list, so it is not derived', () => {
    const kept = { entity_field: 'entity_id', sprt_schema: 's', sprt_table: 'secret_members' };
    expect(explainPolicy('AuthzEntityMembership', kept)).toContain('The members are read from the table secret_members.');
    expect(explainPolicy('AuthzEntityMembership', { ...kept, membership_type: 2 })).not.toContain('secret_members');
  });
});

describe('policyDifference: two rule sets by meaning (the read-back after a replace)', () => {
  const stored = [...LIVE_NOTES, LIVE_NOTES[1]];

  test('the planned rules against themselves as the backend stores them, the read-only block twice: no difference', () => {
    expect(policyDifference(resolved(TEAM_RULES), stored)).toEqual({ missing: [], unplanned: [] });
  });

  test('a rule that names its tables by id, with conditions, against the form the backend stores: no difference', () => {
    const id = '01a216fe-bbe0-76a3-87a0-d3847fd3b92d';
    const join = [{ local_column: 'entity_id', ref_column: 'id' }];
    const planned = policy('AuthzValueExists', ['select'], { ref_table_id: id, join, conditions: { field: 'kind', op: '=', value: 'a' }, exists: { ref_table_id: id, join } });
    const live = policy('AuthzValueExists', ['select'], {
      ref_table_id: id,
      ref_schema: 'app-public',
      ref_table: 'projects',
      join,
      conditions_ast: { A_Expr: {} },
      exists: { ref_table_id: id, ref_schema: 'app-public', ref_table: 'projects', join },
      protected_table_name: 'tasks'
    });
    expect(policyDifference(resolved([planned]), [live])).toEqual({ missing: [], unplanned: [] });
  });

  test('against the union with other rules: those are unplanned', () => {
    const { missing, unplanned } = policyDifference(resolved(TEAM_RULES), [...stored, ...PRIVATE]);
    expect(missing).toEqual([]);
    expect(only(unplanned)).toEqual([['AuthzAppMemberOwner', ALL, true]]);
  });

  test('a planned rule the table does not have is missing', () => {
    expect(only(policyDifference(resolved(TEAM_RULES), [LIVE_NOTES[0]]).missing)).toEqual([['AuthzNotReadOnly', CHANGES, false]]);
  });

  test('a rule that differs in privileges only: only those privileges', () => {
    const fewer = [{ ...LIVE_NOTES[0], privileges: ['select', 'insert'] as Privilege[] }, LIVE_NOTES[1]];
    const { missing, unplanned } = policyDifference(resolved(TEAM_RULES), fewer);
    expect(only(missing)).toEqual([['AuthzEntityMembership', ['update', 'delete'], true]]);
    expect(unplanned).toEqual([]);
    expect(missing[0].data).toEqual(TEAM_RULES[0].data);
  });

  test('a composite against its stored form, with the keys the backend adds to its nodes', () => {
    const planned = [policy('AuthzComposite', ALL, { OR: [{ AuthzEntityMembership: TEAM }, { AuthzDirectOwner: { entity_field: 'owner_id' } }] })];
    const kept = [policy('AuthzComposite', ALL, { OR: [{ AuthzEntityMembership: LIVE_NOTES[0].data }, { AuthzDirectOwner: { entity_field: 'owner_id' } }] })];
    expect(policyDifference(resolved(planned), kept)).toEqual({ missing: [], unplanned: [] });
  });

  test('a stored raw part: unplanned when not planned; the same data is the same; other data differs', () => {
    expect(only(policyDifference(resolved(TEAM_RULES), [...stored, LIVE_RAW_COMPOSITE]).unplanned)).toEqual([['AuthzComposite', ['select'], true]]);
    expect(policyDifference(resolved([LIVE_RAW_COMPOSITE]), [LIVE_RAW_COMPOSITE])).toEqual({ missing: [], unplanned: [] });
    const other = policy('AuthzComposite', ['select'], { BoolExpr: { boolop: 'AND_EXPR', args: [{ A_Expr: { kind: 'AEXPR_OP' } }, { AuthzAppMembership: {} }] } });
    const { missing, unplanned } = policyDifference(resolved([LIVE_RAW_COMPOSITE]), [other]);
    expect([missing.length, unplanned.length]).toEqual([1, 1]);
  });

  test('the role, a check equal to the policy, and a type the registry does not know', () => {
    expect(only(policyDifference(resolved(TEAM_RULES), TEAM_RULES.map((entry) => ({ ...entry, role: 'public' }))).missing)).toEqual(only(TEAM_RULES));
    const checked = TEAM_RULES.map((entry) => (entry.type === 'AuthzEntityMembership' ? { ...entry, with_check: { type: 'AuthzEntityMembership', data: TEAM } } : entry));
    expect(policyDifference(resolved(TEAM_RULES), checked)).toEqual({ missing: [], unplanned: [] });
    const mystery = policy('AuthzMystery', ['select'], { a: 1, b: 2 });
    expect(policyDifference(resolved([mystery]), [{ ...mystery, data: { b: 2, a: 1 } }])).toEqual({ missing: [], unplanned: [] });
    expect(policyDifference(resolved([mystery]), [{ ...mystery, data: { a: 2, b: 2 } }]).unplanned).toHaveLength(1);
  });
});

describe('a rule that names its team kind by entity_type', () => {
  const ORG_TEAM = { entity_field: 'entity_id', entity_type: 'org' };
  const STORED = { ...TEAM, sel_field: 'entity_id', sprt_table: 'org_memberships_sprt', sprt_schema: 'app-1a2b3c4d-memberships-private' };
  const NRO_STORED = { ...TEAM, sprt_table: 'org_memberships_sprt', sprt_schema: 'app-1a2b3c4d-memberships-private' };
  const SCOPES = [{ scope: 'channel', membership_type: 3 }];

  test.each<[string, TablePolicy[], TablePolicy[]]>([
    ['the rule alone', [policy('AuthzEntityMembership', ALL, ORG_TEAM)], [policy('AuthzEntityMembership', ALL, STORED)]],
    [
      'inside a composite',
      [policy('AuthzComposite', ALL, { OR: [{ AuthzEntityMembership: ORG_TEAM }, { AuthzDirectOwner: { entity_field: 'owner_id' } }] })],
      [policy('AuthzComposite', ALL, { OR: [{ AuthzEntityMembership: STORED }, { AuthzDirectOwner: { entity_field: 'owner_id' } }] })]
    ],
    [
      'a restrictive AuthzNotReadOnly',
      [policy('AuthzEntityMembership', ALL, TEAM), policy('AuthzNotReadOnly', CHANGES, ORG_TEAM, { permissive: false })],
      [policy('AuthzEntityMembership', ALL, STORED), policy('AuthzNotReadOnly', CHANGES, NRO_STORED, { permissive: false })]
    ]
  ])('the read-back of %s finds no difference', (_label, planned, stored) => {
    expect(policyDifference(resolved(planned), stored)).toEqual({ missing: [], unplanned: [] });
  });

  test('a team kind of the database resolves to its membership type', () => {
    const { policies, problems } = resolveEntityTypes([policy('AuthzEntityMembership', ['select'], { entity_field: 'entity_id', entity_type: 'channel' })], SCOPES);
    expect(problems).toEqual([]);
    expect(policies[0].data).toEqual({ entity_field: 'entity_id', membership_type: 3 });
  });

  test('an entity_type the database does not have, with the near name and the names it has', () => {
    const [problem] = resolveEntityTypes([policy('AuthzComposite', ['select'], { NOT: { AuthzEntityMembership: { entity_field: 'entity_id', entity_type: 'chanel' } } })], SCOPES).problems;
    expect([problem.policy, problem.path, problem.code, problem.meant]).toEqual([0, 'NOT.AuthzEntityMembership.entity_type', 'unknown-entity-type', 'channel']);
    expect(problem.message).toContain('"app", "org" and "channel"');
  });
});

// describe_schema gives a field's stored default as the JSON of a FieldDefault.
const tableFieldOf = (field: { name: string; type: string; isRequired: boolean; defaultValue: string | null }): TableField => ({
  name: field.name,
  type: field.type,
  required: field.isRequired,
  default: field.defaultValue === null ? null : JSON.parse(field.defaultValue)
});

describe('the users table a fresh database has (the platform makes it)', () => {
  const users: TableAccessInput = { policies: USERS.policyRules as unknown as TablePolicy[], fields: USERS.fields.map(tableFieldOf) };

  test('a rule that reads the row\'s own id as the person expects no Data node to have made the column', () => {
    expect(columnGaps(users.fields, users.policies)).toEqual([]);
    expect(accessFindings(users).map((finding) => finding.id)).not.toContain('reused-column-differs');
  });

  test('each stored rule has a sentence', () => {
    for (const rule of users.policies) expect(explainPolicy(rule.type, rule.data)).toMatch(/\.$/);
  });
});
