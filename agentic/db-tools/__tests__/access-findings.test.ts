import {
  type AccessFinding,
  accessFindings,
  columnGaps,
  columnsReadByPolicies,
  type TableAccessInput,
  type TableField,
  type TablePolicy
} from '../src/access';

type Privilege = TablePolicy['privileges'][number];

const ALL: Privilege[] = ['select', 'insert', 'update', 'delete'];
const CHANGES: Privilege[] = ['insert', 'update', 'delete'];
const TEAM = { entity_field: 'entity_id', membership_type: 2 };
const GRANT_ALL = [{ roles: ['authenticated'], privileges: ALL.map((privilege) => [privilege, '*']) }];
const OWNER_DEFAULT = { function: 'current_user_id', schema: 'jwt_public' };

function policy(type: string, privileges: Privilege[], data: Record<string, unknown> = {}, extra: Partial<TablePolicy> = {}): TablePolicy {
  return { type, privileges, permissive: true, data, ...extra };
}

const on = (policies: TablePolicy[]): TableAccessInput => ({ policies, grants: GRANT_ALL, rls_enabled: true });

// Rule sets in the shapes the backend docs recommend.
const PRIVATE = [policy('AuthzAppMemberOwner', ALL, { owner_field: 'owner_id' })];
const TEAM_RULES = [policy('AuthzEntityMembership', ALL, TEAM), policy('AuthzNotReadOnly', CHANGES, TEAM, { permissive: false })];
const PUBLISHED_READ = [policy('AuthzPublishable', ['select']), ...TEAM_RULES];

// One stored policy of a users table: a composite the backend keeps as a raw expression.
const LIVE_RAW_COMPOSITE = policy('AuthzComposite', ['select'], {
  BoolExpr: {
    args: [
      { AuthzAppMembership: { mask: '0000000000010000', bitlen: 16, sprt_table: 'app_memberships_sprt', sprt_schema: 's', membership_type: 1 } },
      { A_Expr: { kind: 'AEXPR_OP', name: [{ String: { sval: '=' } }], lexpr: { ColumnRef: { fields: [{ String: { sval: 'type' } }] } }, rexpr: { A_Const: { ival: 2 } } } }
    ],
    boolop: 'AND_EXPR'
  }
});

const fired = (input: TableAccessInput) => accessFindings(input).map((finding) => [finding.id, finding.operations]);

describe('findings', () => {
  test('owner-outlives-membership', () => {
    const owner = policy('AuthzDirectOwner', ['select', 'update'], { entity_field: 'owner_id' });
    const member = policy('AuthzEntityMembership', ['select'], TEAM);
    expect(fired({ policies: [owner, member] })).toEqual([['owner-outlives-membership', ['read', 'update']]]);
    expect(fired({ policies: [owner, member, policy('AuthzNotReadOnly', ['update'], TEAM, { permissive: false })] })).toEqual([['owner-outlives-membership', ['read']]]);
    expect(fired({ policies: [policy('AuthzMemberOwner', ['select', 'update'], { owner_field: 'owner_id', ...TEAM }), member] })).toEqual([]);
    expect(fired({ policies: [policy('AuthzDirectOwner', ['select'], { entity_field: 'id' }), member] })).toEqual([]);
    expect(fired({ policies: [owner] })).toEqual([]);
    // Only the membership nodes count: not peer ownership, and not the read-only limit.
    expect(fired({ policies: [owner, policy('AuthzPeerOwnership', ['select'], { owner_field: 'owner_id' })] })).toEqual([]);
    expect(fired({ policies: [owner, policy('AuthzNotReadOnly', ['insert'], TEAM, { permissive: false })] })).toEqual([]);
  });

  test('app-membership-on-team-rows', () => {
    const app = policy('AuthzAppMembership', ['select']);
    const owner = policy('AuthzDirectOwner', ['select'], { entity_field: 'owner_id' });
    const team = policy('AuthzEntityMembership', ['insert'], TEAM);
    expect(fired({ policies: [app, owner, team] })).toContainEqual(['app-membership-on-team-rows', ['read']]);
    expect(fired({ policies: [app, owner] }).map(([id]) => id)).not.toContain('app-membership-on-team-rows');
    expect(fired({ policies: [app, policy('AuthzAppMemberOwner', ['select'], { owner_field: 'owner_id' }), team] })).toEqual([]);
  });

  test('granted-without-policy', () => {
    expect(fired({ policies: [policy('AuthzEntityMembership', ['select'], TEAM)], grants: GRANT_ALL, rls_enabled: true })).toEqual([
      ['granted-without-policy', ['create', 'update', 'delete']]
    ]);
    expect(fired({ policies: [policy('AuthzEntityMembership', ['select'], TEAM)], grants: GRANT_ALL, rls_enabled: false }).map(([id]) => id)).not.toContain('granted-without-policy');
    expect(fired(on([policy('AuthzEntityMembership', ALL, TEAM)]))).toEqual([]);
  });

  test('granted-role-without-policy: a rule for one role and a grant to another, which may be a member of it', () => {
    const grants = [{ roles: ['authenticated'], privileges: [['select', '*'], ['insert', '*']] }, { roles: ['authenticated_client'], privileges: [['select', '*']] }];
    expect(fired({ policies: [policy('AuthzAllowAll', ['select', 'insert'])], grants, rls_enabled: true })).toEqual([
      ['granted-role-without-policy', ['read']],
      ['anyone-can-change', ['create']]
    ]);
  });

  test('a stored setting the words do not describe reads as a part they cannot state, so a rule that may widen is found', () => {
    expect(fired(on([policy('AuthzEntityMembership', ALL, { ...TEAM, entity_capability_check: true })]))).toEqual([['raw-part-may-widen', ['read', 'create', 'update', 'delete']]]);
    expect(fired(on([policy('AuthzEntityMembership', ALL, TEAM)]))).toEqual([]);
  });

  test('a stored reporting chart rule on a column named like the chart\'s own is one the words cannot state', () => {
    const chart = (entity_field: string) => policy('AuthzOrgHierarchy', ['select'], { direction: 'down', anchor_field: 'owner_id', entity_field });
    expect(fired(on([chart('entity_id')])).map(([id]) => id)).toContain('raw-part-may-widen');
    expect(fired(on([chart('org_id')])).map(([id]) => id)).not.toContain('raw-part-may-widen');
    // The finding is about a registry node here, so its words do not say the part is one no Authz node describes.
    const finding = accessFindings(on([chart('entity_id')])).find(({ id }) => id === 'raw-part-may-widen');
    expect(`${finding.summary} ${finding.fix}`).not.toMatch(/no Authz node describes/);
    expect(finding.summary).toMatch(/may not fully state/);
  });

  test('a related member list is stated only when the input shows its related table has no column named like the row\'s', () => {
    const list = policy('AuthzRelatedMemberList', ALL, { owned_table_id: 'g1', owned_table_key: 'member_ids', owned_table_ref_key: 'id', this_object_key: 'group_id' });
    const ids = (input: TableAccessInput) => fired(input).map(([id]) => id);
    expect(ids(on([list]))).toContain('raw-part-may-widen');
    expect(ids({ ...on([list]), related: { g1: ['id', 'member_ids', 'group_id'] } })).toContain('raw-part-may-widen');
    expect(ids({ ...on([list]), related: { g1: ['id', 'member_ids'] } })).not.toContain('raw-part-may-widen');
  });

  test('policies-without-row-security', () => {
    expect(fired({ policies: [policy('AuthzEntityMembership', ALL, TEAM)], rls_enabled: false })).toEqual([['policies-without-row-security', ['read', 'create', 'update', 'delete']]]);
    expect(fired({ policies: [policy('AuthzEntityMembership', ALL, TEAM)], rls_enabled: true })).toEqual([]);
  });

  test('anyone-can-change', () => {
    expect(fired({ policies: [policy('AuthzAllowAll', ['select', 'insert'])] })).toEqual([['anyone-can-change', ['create']]]);
    expect(fired({ policies: [policy('AuthzAllowAll', ['select'])] })).toEqual([]);
  });

  test('limit-blocks-outside-grant', () => {
    const fence = policy('AuthzAppMembership', ['select'], {}, { permissive: false });
    expect(fired({ policies: [fence, policy('AuthzPublishable', ['select'])] })).toEqual([['limit-blocks-outside-grant', ['read']]]);
    expect(fired({ policies: [fence, policy('AuthzEntityMembership', ['select'], TEAM)] })).toEqual([]);
    expect(fired(on(PUBLISHED_READ))).toEqual([]);
  });

  test('every finding has plain words, and says what may happen rather than who can', () => {
    const findings: AccessFinding[] = accessFindings({
      policies: [policy('AuthzAllowAll', CHANGES), policy('AuthzDirectOwner', ['select'], { entity_field: 'owner_id' }), policy('AuthzEntityMembership', ['select'], TEAM)],
      rls_enabled: false
    });
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      for (const text of [finding.summary, finding.risk, finding.fix]) expect(text).not.toMatch(/\bSPRT\b|\bRLS\b|\bpermissive\b|\bmembership_type\b|\bpredicate\b/i);
    }
  });
});

const TEAM_OR = (other: Record<string, unknown>) => policy('AuthzComposite', ALL, { OR: [{ AuthzEntityMembership: TEAM }, other] });

describe('findings read composite trees and the node facts', () => {
  test('OR(team, a bare owner) keeps an ex-member\'s access', () => {
    expect(fired(on([TEAM_OR({ AuthzDirectOwner: { entity_field: 'owner_id' } })]))).toContainEqual(['owner-outlives-membership', ['read', 'create', 'update', 'delete']]);
    expect(fired(on([TEAM_OR({ AuthzMemberOwner: { ...TEAM, owner_field: 'owner_id' } })]))).toEqual([]);
  });

  test('a publish check on update and delete lets anyone change published rows', () => {
    const pubwrites = [policy('AuthzPublishable', ['select', 'update', 'delete']), policy('AuthzEntityMembership', ['insert'], TEAM)];
    expect(fired(on(pubwrites))).toContainEqual(['anyone-can-change', ['update', 'delete']]);
    expect(fired(on(PUBLISHED_READ)).map(([id]) => id)).not.toContain('anyone-can-change');
  });

  test('NOT(team membership) lets everyone outside the team in', () => {
    const not = policy('AuthzComposite', ALL, { NOT: { AuthzEntityMembership: TEAM } });
    expect(fired(on([not]))).toContainEqual(['anyone-can-change', ['create', 'update', 'delete']]);
    const butNotTheOwner = policy('AuthzComposite', ALL, { AND: [{ AuthzEntityMembership: TEAM }, { NOT: { AuthzMemberOwner: { ...TEAM, owner_field: 'owner_id' } } }] });
    expect(fired(on([butNotTheOwner]))).toEqual([]);
  });

  test('a rule for anyone fenced by a restrictive team rule on the same operation is not anyone-can-change', () => {
    const fenced = [policy('AuthzEntityMembership', ALL, TEAM), policy('AuthzAllowAll', ['update']), policy('AuthzEntityMembership', ['update'], TEAM, { permissive: false })];
    expect(fired(on(fenced))).toEqual([]);
    const allowalls = [policy('AuthzAllowAll', ['select', 'update']), policy('AuthzEntityMembership', ['insert', 'delete'], TEAM)];
    expect(fired(on(allowalls))).toContainEqual(['anyone-can-change', ['update']]);
  });

  test('a composite with a rule for anyone inside', () => {
    expect(fired(on([TEAM_OR({ AuthzAllowAll: {} })]))).toContainEqual(['anyone-can-change', ['create', 'update', 'delete']]);
  });

  test('on a table of teams, a restrictive app membership does not fence a bare owner', () => {
    const base = [policy('AuthzEntityMembership', ALL, TEAM), policy('AuthzDirectOwner', ALL, { entity_field: 'owner_id' })];
    expect(fired(on([...base, policy('AuthzAppMembership', ALL, {}, { permissive: false })]))).toContainEqual(['owner-outlives-membership', ['read', 'create', 'update', 'delete']]);
    expect(fired(on([...base, policy('AuthzEntityMembership', ALL, TEAM, { permissive: false })]))).toEqual([]);
  });
});

describe('write-without-read', () => {
  test('a write needs the read grant', () => {
    const noSelect = { policies: TEAM_RULES, grants: [{ roles: ['authenticated'], privileges: CHANGES.map((privilege) => [privilege, '*']) }], rls_enabled: true };
    expect(fired(noSelect)).toEqual([['write-without-read', ['create', 'update', 'delete']]]);
    expect(fired(on(PRIVATE))).toEqual([]);
  });

  test('a write rule for anyone, and a read rule that names people', () => {
    const human = [policy('AuthzEntityMembership', ['select', 'insert'], TEAM), policy('AuthzHumanOnly', ['update', 'delete'])];
    expect(fired(on(human))).toEqual([['write-without-read', ['update', 'delete']]]);
    expect(fired(on([...TEAM_RULES, policy('AuthzHumanOnly', CHANGES, {}, { permissive: false })]))).toEqual([]);
  });
});

describe('required-column-not-set', () => {
  const field = (name: string, required: boolean, filled: boolean): TableField => ({ name, required, default: filled ? { function: 'now' } : null });
  const columns = [field('id', true, true), field('title', false, false), { ...field('owner_id', true, true), default: OWNER_DEFAULT }, field('created_at', true, true)];

  test('owner rules with the team column a team rule left behind', () => {
    const findings = accessFindings({ ...on(PRIVATE), fields: [...columns, field('entity_id', true, false)] });
    expect(findings.map(({ id, operations, columns: named }) => [id, operations, named])).toEqual([['required-column-not-set', ['create'], ['entity_id']]]);
  });

  test.each<[string, TableAccessInput]>([
    ['a rule reads the column', { ...on(TEAM_RULES), fields: [...columns, field('entity_id', true, false)] }],
    ['the column has a default', { ...on(PRIVATE), fields: [...columns, field('entity_id', true, true)] }],
    ['the column is optional', { ...on(PRIVATE), fields: [...columns, field('entity_id', false, false)] }],
    ['a required column of the table\'s own, not an access column', { ...on(PRIVATE), fields: [...columns, field('body', true, false)] }],
    ['the fields are not known', on(PRIVATE)]
  ])('silent: %s', (_label, input) => {
    expect(fired(input)).toEqual([]);
  });

  test('a stranded column is not reported when a part of the rules cannot be read', () => {
    const fields = [field('id', true, true), field('owner_id', true, true), field('entity_id', true, false)];
    const raw = policy('AuthzComposite', ['select'], { BoolExpr: { boolop: 'AND_EXPR', args: [{ A_Expr: {} }] } });
    expect(fired({ ...on([...PRIVATE, raw]), fields }).map(([id]) => id)).not.toContain('required-column-not-set');
  });
});

describe('columnsReadByPolicies: the columns of the table the rules read', () => {
  const read = (policies: Array<Pick<TablePolicy, 'type' | 'data' | 'with_check'>>) => columnsReadByPolicies(policies);

  test('a misspelled column is read as written', () => {
    expect(read([{ type: 'AuthzEntityMembership', data: { entity_field: 'entity_idd', membership_type: 2 } }])).toEqual({
      columns: [{ type: 'AuthzEntityMembership', param: 'entity_field', column: 'entity_idd' }],
      unknown: []
    });
  });

  test('a composite: each nested node, and registry defaults', () => {
    const composite = { type: 'AuthzComposite', data: { OR: [{ AuthzEntityMembership: TEAM }, { AND: [{ AuthzDirectOwner: { entity_field: 'owner_id' } }, { AuthzPublishable: {} }] }] } };
    expect(read([composite]).columns).toEqual([
      { type: 'AuthzEntityMembership', param: 'entity_field', column: 'entity_id' },
      { type: 'AuthzDirectOwner', param: 'entity_field', column: 'owner_id' },
      { type: 'AuthzPublishable', param: 'is_published_field', column: 'is_published' },
      { type: 'AuthzPublishable', param: 'published_at_field', column: 'published_at' }
    ]);
  });

  test('an update\'s own check, nested parameters, and the columns of another table left out', () => {
    const update = { type: 'AuthzEntityMembership', data: TEAM, with_check: { type: 'AuthzMemberOwner', data: { ...TEAM, owner_field: 'author_id' } } };
    expect(read([update]).columns.map((entry) => entry.column)).toEqual(['entity_id', 'author_id', 'entity_id']);
    const match = { type: 'AuthzValueMatch', data: { ref_schema: 's', ref_table: 't', join: [{ local_column: 'task_id', ref_column: 'id' }], match: { ref_column: 'tags', allowed: 'labels', operator: 'overlap' } } };
    expect(read([match]).columns).toEqual([
      { type: 'AuthzValueMatch', param: 'join.0.local_column', column: 'task_id' },
      { type: 'AuthzValueMatch', param: 'match.allowed', column: 'labels' }
    ]);
    const literal = { ...match, data: { ...match.data, match: { ref_column: 'tags', allowed: ['a', 'b'], operator: 'overlap' } } };
    expect(read([literal]).columns.map((entry) => entry.column)).toEqual(['task_id']);
    const guard = { type: 'AuthzColumnSecurity', data: { columns: ['role'], rule: 'writable_when', authz: { AuthzMemberOwner: { ...TEAM, owner_field: 'owner_id' } } } };
    expect(read([guard]).columns.map((entry) => entry.column)).toEqual(['role', 'owner_id', 'entity_id']);
  });

  test.each<[string, Array<Pick<TablePolicy, 'type' | 'data'>>, string[]]>([
    ['a stored raw expression', [LIVE_RAW_COMPOSITE], ['AuthzComposite']],
    ['a type the registry does not have', [{ type: 'AuthzMystery', data: { column: 'x' } }], ['AuthzMystery']],
    ['conditions no node spells out', [{ type: 'AuthzValueExists', data: { ref_table_id: 'x', join: [{ local_column: 'a', ref_column: 'b' }], conditions: [{ field: 'c' }] } }], ['AuthzValueExists']],
    ['a key the node does not list', [{ type: 'AuthzEntityMembership', data: { ...TEAM, is_admn: true } }], ['AuthzEntityMembership']]
  ])('not known: %s', (_label, policies, unknown) => {
    expect(read(policies).unknown).toEqual(unknown);
  });
});

const RAW_TRUE = { A_Const: { boolval: { boolval: true } } };

describe('a stored part no Authz node describes is not neutral', () => {
  test('under OR in a permissive rule it may widen access', () => {
    expect(fired(on([policy('AuthzComposite', ['select', 'delete'], { OR: [{ AuthzEntityMembership: TEAM }, RAW_TRUE] }), policy('AuthzEntityMembership', ['insert', 'update'], TEAM)]))).toContainEqual([
      'raw-part-may-widen',
      ['read', 'delete']
    ]);
  });

  test('under AND it can only narrow', () => {
    expect(fired(on([policy('AuthzComposite', ALL, { AND: [{ AuthzEntityMembership: TEAM }, RAW_TRUE] })])).map(([id]) => id)).not.toContain('raw-part-may-widen');
  });

  test('under NOT the finding fires where the NOT can let people in', () => {
    expect(fired(on([policy('AuthzComposite', ALL, { AND: [{ AuthzEntityMembership: TEAM }, { NOT: RAW_TRUE }] })]))).toEqual([]);
    expect(fired(on([policy('AuthzComposite', ALL, { OR: [{ AuthzEntityMembership: TEAM }, { NOT: RAW_TRUE }] })]))).toContainEqual(['raw-part-may-widen', ['read', 'create', 'update', 'delete']]);
  });

  test('a restrictive rule can only narrow, whatever it holds', () => {
    expect(fired(on([policy('AuthzEntityMembership', ALL, TEAM), policy('AuthzComposite', ALL, { OR: [{ AuthzEntityMembership: TEAM }, RAW_TRUE] }, { permissive: false })]))).toEqual([]);
  });

  test('a stored raw expression as the whole rule, and a policy type the registry does not know', () => {
    expect(fired(on([LIVE_RAW_COMPOSITE])).map(([id]) => id)).not.toContain('raw-part-may-widen');
    expect(fired(on([policy('AuthzComposite', ['select'], { BoolExpr: { boolop: 'OR_EXPR', args: [{ AuthzAppMembership: {} }, RAW_TRUE] } })]))).toContainEqual(['raw-part-may-widen', ['read']]);
    expect(fired(on([policy('AuthzMystery', ['select'])]))).toContainEqual(['raw-part-may-widen', ['read']]);
  });
});

describe('a reused column that is not as the rule\'s Data node makes it', () => {
  test('owner rules on an owner column with no default, and a finding says why', () => {
    const finding = accessFindings({ ...on(PRIVATE), fields: [{ name: 'owner_id', type: 'uuid', required: false, default: null }] }).find((entry) => entry.id === 'reused-column-differs');
    expect(finding.columns).toEqual(['owner_id']);
    expect(finding.details).toEqual(['owner_id has no default, and DataDirectOwner gives it the id of the person who makes the row, so a create must send it itself.']);
  });

  test('columnGaps: the type, the required flag and the default, against the Data node', () => {
    const gaps = columnGaps([{ name: 'entity_id', type: 'text', required: false, default: null }], TEAM_RULES);
    expect(gaps.map(({ column, node, gaps: kinds }) => [column, node, kinds])).toEqual([['entity_id', 'DataEntityMembership', ['type', 'required']]]);
    expect(columnGaps([{ name: 'owner_id', type: 'uuid', required: true, default: OWNER_DEFAULT }], PRIVATE)).toEqual([]);
    expect(columnGaps([{ name: 'owner_id', type: 'uuid', required: true, default: 'unknown' }], PRIVATE)).toEqual([]);
  });

  test('a column of another type is a finding; a matching column is not', () => {
    const texts = accessFindings({ ...on(TEAM_RULES), fields: [{ name: 'entity_id', type: 'text', required: true, default: null }] });
    expect(texts.find((entry) => entry.id === 'reused-column-differs').details).toEqual(['entity_id is text, and DataEntityMembership makes it uuid, so the rule cannot work on it.']);
    expect(fired({ ...on(TEAM_RULES), fields: [{ name: 'entity_id', type: 'uuid', required: true, default: null }] })).toEqual([]);
  });

  test('a field without its default key (an older caller): no throw, and its default does not count', () => {
    const old = [{ name: 'owner_id', required: true, has_default: true }] as unknown as TableField[];
    expect(() => accessFindings({ ...on(PRIVATE), fields: old })).not.toThrow();
    expect(columnGaps(old, PRIVATE)).toEqual([]);
  });
});
