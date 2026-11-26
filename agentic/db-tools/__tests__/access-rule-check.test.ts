import { checkRule, POLICY_ROLES } from '../src/access';

const TEAM = { entity_field: 'entity_id', membership_type: 2 };
const UUID = '00000000-0000-0000-0000-000000000001';

const codes = (type: string, data: unknown) =>
  checkRule(type, data)
    .map((problem) => [problem.path, problem.code])
    .sort(([a], [b]) => String(a).localeCompare(String(b)));

describe('a rule a caller writes, against its node\'s closed parameter_schema', () => {
  test.each<[string, string, unknown, Array<[string, string]>]>([
    ['an empty composite', 'AuthzComposite', {}, [['', 'expression']]],
    ['an empty AND', 'AuthzComposite', { AND: [] }, [['AND', 'not-empty']]],
    ['an empty OR', 'AuthzComposite', { OR: [] }, [['OR', 'not-empty']]],
    ['or in lower case', 'AuthzComposite', { or: [{ AuthzAllowAll: {} }] }, [['or', 'not-a-node']]],
    ['two keys at one level', 'AuthzComposite', { AuthzEntityMembership: TEAM, AuthzAllowAll: {} }, [['', 'expression']]],
    ['a part that is not an object', 'AuthzComposite', { OR: [{ AuthzAllowAll: {} }, 'text', 5] }, [['OR.1', 'type'], ['OR.2', 'type']]],
    ['an Authz name the registry does not have', 'AuthzComposite', { OR: [{ AuthzNoSuchNode: {} }] }, [['OR.0.AuthzNoSuchNode', 'not-a-node']]],
    ['a raw expression', 'AuthzComposite', { OR: [{ AuthzEntityMembership: TEAM }, { A_Const: { boolval: { boolval: true } } }] }, [['OR.1.A_Const', 'not-a-node']]],
    ['a stored expression node', 'AuthzComposite', { BoolExpr: { boolop: 'OR_EXPR', args: [{ AuthzAllowAll: {} }] } }, [['BoolExpr', 'not-a-node']]],
    ['a node an expression cannot build', 'AuthzComposite', { OR: [{ AuthzColumnSecurity: { columns: ['a'], rule: 'immutable' } }] }, [['OR.0.AuthzColumnSecurity', 'not-in-expression']]],
    ['membership_type past the integer range', 'AuthzEntityMembership', { ...TEAM, membership_type: 2147483648 }, [['membership_type', 'range']]],
    ['a nested node with text for membership_type', 'AuthzComposite', { NOT: { AuthzEntityMembership: { ...TEAM, membership_type: '2' } } }, [['NOT.AuthzEntityMembership.membership_type', 'type']]],
    ['membership_type below 1', 'AuthzEntityMembership', { ...TEAM, membership_type: -1 }, [['membership_type', 'range']]],
    ['membership_type not a whole number', 'AuthzEntityMembership', { ...TEAM, membership_type: 2.5 }, [['membership_type', 'type']]],
    ['no team kind', 'AuthzEntityMembership', { entity_field: 'entity_id' }, [['', 'one-of']]],
    ['half a member list', 'AuthzEntityMembership', { entity_field: 'entity_id', sprt_table: 'members' }, [['', 'one-of']]],
    ['AuthzNotReadOnly with no team kind', 'AuthzNotReadOnly', { entity_field: 'entity_id' }, [['', 'one-of']]],
    ['an empty column name', 'AuthzEntityMembership', { ...TEAM, entity_field: '' }, [['entity_field', 'not-empty']]],
    ['an empty column name in a list', 'AuthzDirectOwnerAny', { entity_fields: ['sender_id', ''] }, [['entity_fields.1', 'not-empty']]],
    ['AuthzTemporal with neither column', 'AuthzTemporal', {}, [['', 'one-of']]],
    ['AuthzValueExists with no table and no join', 'AuthzValueExists', {}, [['', 'one-of'], ['join', 'required']]],
    ['a related node with no object column', 'AuthzRelatedEntityMembership', { entity_field: 'post_id', membership_type: 2, obj_table_id: UUID }, [['', 'one-of']]]
  ])('refused: %s', (_label, type, data, expected) => {
    expect(codes(type, data)).toEqual(expected);
  });

  test.each<[string, string, unknown]>([
    ['a team rule', 'AuthzEntityMembership', TEAM],
    ['a team kind by name', 'AuthzEntityMembership', { entity_field: 'entity_id', entity_type: 'channel' }],
    ['a composite of two nodes', 'AuthzComposite', { OR: [{ AuthzEntityMembership: TEAM }, { AuthzDirectOwner: { entity_field: 'owner_id' } }] }],
    ['a composite that holds one node', 'AuthzComposite', { AuthzEntityMembership: TEAM }],
    ['NOT of a node', 'AuthzComposite', { NOT: { AuthzDenyAll: {} } }],
    ['AuthzNotReadOnly with entity_type', 'AuthzNotReadOnly', { entity_field: 'entity_id', entity_type: 'org' }],
    ['both team kinds, where the entity type wins', 'AuthzEntityMembership', { ...TEAM, entity_type: 'org' }],
    ['a member list by name', 'AuthzEntityMembership', { entity_field: 'entity_id', sprt_schema: 's', sprt_table: 'members' }],
    ['the member checks the builder reads', 'AuthzMemberOwner', { ...TEAM, is_admin: true, is_owner: true, mask_column: 'required_caps', mask: '0101', bitlen: 64 }],
    ['AuthzTemporal with one column', 'AuthzTemporal', { valid_from_field: 'starts_at' }],
    ['AuthzValueExists with a table and a join', 'AuthzValueExists', { ref_schema: 's', ref_table: 't', join: [{ local_column: 'a', ref_column: 'b' }] }],
    ['an owner rule whose columns have defaults', 'AuthzMemberOwner', { membership_type: 2 }]
  ])('passed: %s', (_label, type, data) => {
    expect(codes(type, data)).toEqual([]);
  });

  test('a mistyped node name gets the nearest name', () => {
    const [problem] = checkRule('AuthzComposite', { OR: [{ AuthzEntityMembershp: TEAM }] });
    expect([problem.path, problem.code, problem.meant]).toEqual(['OR.0.AuthzEntityMembershp', 'mistyped-node', 'AuthzEntityMembership']);
    expect(problem.message).toContain('did you mean "AuthzEntityMembership"?');
  });

  test('a raw expression is not a typo: no suggestion, and the message says what a rule takes', () => {
    const [problem] = checkRule('AuthzComposite', { OR: [{ A_Const: { boolval: true } }] });
    expect(problem).not.toHaveProperty('meant');
    expect(problem.message).toContain('is not an Authz node: it is a raw expression or a node the registry does not have');
    expect(problem.message).toContain('A rule you write takes only Authz nodes and "AND", "OR" and "NOT"');
  });

  test('each problem says what failed and what to do', () => {
    const [text] = checkRule('AuthzEntityMembership', { ...TEAM, membership_type: '2' });
    expect(text.message).toBe('AuthzEntityMembership\'s "membership_type" must be an integer.');
    const [none] = checkRule('AuthzEntityMembership', { entity_field: 'entity_id' });
    expect(none.message).toBe(
      'AuthzEntityMembership needs "membership_type", "entity_type" or "sprt_schema" and "sprt_table", and the backend refuses the rule without one of them. Add one.'
    );
    const [lower] = checkRule('AuthzComposite', { or: [] });
    expect(lower.message).toContain('Use "OR"');
  });
});

// The backend's own answer for each rule, from a live run of the same data through the backend's policy provisioning:
// `builds` is false where it refused, failed, or compiled a weaker check than the data says.
describe('the rule check answers as the backend does, for rules that do not depend on the table', () => {
  test.each<[string, string, unknown, boolean]>([
    ['the app as a team kind by number', 'AuthzEntityMembership', { ...TEAM, membership_type: 1 }, false],
    ['the app as a team kind by name', 'AuthzEntityMembership', { entity_field: 'entity_id', entity_type: 'app' }, false],
    ['the app as the team kind of the read-only limit', 'AuthzNotReadOnly', { ...TEAM, membership_type: 1 }, false],
    ['a mask that is not a bit string', 'AuthzEntityMembership', { ...TEAM, mask: 'abc' }, false],
    ['a bit string mask', 'AuthzEntityMembership', { ...TEAM, mask: '101' }, true],
    ['a team column read as a list', 'AuthzEntityMembership', { entity_field: 'team_ids', membership_type: 2, any_array: true }, false],
    ['the person\'s own id as a team', 'AuthzEntityMembership', { entity_field: 'team_ids', membership_type: 2, any_array: true, include_current_user_id: true }, false],
    ['the member list matched against the row', 'AuthzEntityMembership', { ...TEAM, entity_capability_check: true }, false],
    ['the app member list matched against the row', 'AuthzAppMembership', { entity_capability_check: true }, false],
    ['the read-only limit inside an expression', 'AuthzComposite', { AND: [{ AuthzEntityMembership: TEAM }, { AuthzNotReadOnly: TEAM }] }, false],
    ['the read-only limit by entity type inside an expression', 'AuthzComposite', { OR: [{ AuthzNotReadOnly: { entity_field: 'entity_id', entity_type: 'org' } }] }, false],
    ['a column guard as a rule', 'AuthzColumnSecurity', { columns: ['status'], rule: 'immutable' }, false],
    ['a value rule whose table is a module reference', 'AuthzValueExists', { ref_module: { type: 'x', table: 'y' }, join: [{ local_column: 'entity_id', ref_column: 'id' }] }, false],
    ['the reporting chart with the default organization column', 'AuthzOrgHierarchy', { direction: 'down', anchor_field: 'owner_id' }, false],
    ['the reporting chart with a person column named like the chart\'s own', 'AuthzOrgHierarchy', { direction: 'up', entity_field: 'org_id', anchor_field: 'descendant_id' }, false],
    ['the reporting chart with columns of other names', 'AuthzOrgHierarchy', { direction: 'down', entity_field: 'org_id', anchor_field: 'owner_id' }, true],
    ['a file share with no files table', 'AuthzFilePath', { shares_table_id: UUID, capability_field: 'can_read' }, false],
    ['a file share with its files table', 'AuthzFilePath', { shares_table_id: UUID, files_table_id: UUID, capability_field: 'can_read' }, true],
    ['an app owner rule whose owner column has a default', 'AuthzAppMemberOwner', {}, true],
    ['a related owner rule whose columns have defaults', 'AuthzRelatedMemberOwner', { entity_field: 'entity_id', membership_type: 2, obj_table_id: UUID, obj_field: 'entity_id' }, true],
    ['a value match on true', 'AuthzValueMatch', { ref_table_id: UUID, join: [{ local_column: 'entity_id', ref_column: 'id' }], match: { ref_column: 'is_public', allowed: [true], operator: 'in' } }, true],
    ['one condition object', 'AuthzValueExists', { ref_table_id: UUID, join: [{ local_column: 'entity_id', ref_column: 'id' }], conditions: { field: 'kind', op: '=', value: 'a' } }, true]
  ])('%s', (_label, type, data, builds) => {
    expect(checkRule(type, data)).toEqual(builds ? [] : expect.arrayContaining([expect.objectContaining({ code: expect.any(String) })]));
  });
});

describe('a related member list', () => {
  const list = { owned_table_id: UUID, owned_table_key: 'member_ids', owned_table_ref_key: 'id', this_object_key: 'group_id' };

  test('is refused when the related table has a column named like the row\'s, and taken when it has none or the columns are not known', () => {
    expect(codes('AuthzRelatedMemberList', list)).toEqual([]);
    expect(checkRule('AuthzRelatedMemberList', list, { columnsOf: () => ['id', 'member_ids'] })).toEqual([]);
    expect(checkRule('AuthzRelatedMemberList', list, { columnsOf: () => ['id', 'member_ids', 'group_id'] }).map((problem) => [problem.path, problem.code])).toEqual([['this_object_key', 'not-supported']]);
  });

  test('a module\'s table resolves only in a blueprint', () => {
    const exists = { ref_module: { type: 'storage', table: 'files' }, join: [{ local_column: 'file_id', ref_column: 'id' }] };
    expect(checkRule('AuthzValueExists', exists, { inBlueprint: true })).toEqual([]);
    expect(checkRule('AuthzComposite', { OR: [{ AuthzValueExists: exists }] }).map((problem) => [problem.path, problem.code])).toEqual([['OR.0.AuthzValueExists.ref_module', 'not-supported']]);
  });
});

describe('keys', () => {
  test('a mistyped key is refused with the key it probably meant and the keys the node takes', () => {
    const [problem] = checkRule('AuthzEntityMembership', { ...TEAM, is_admn: true });
    expect([problem.path, problem.code, problem.meant]).toEqual(['is_admn', 'unknown-key', 'is_admin']);
    expect(problem.message).toContain('so the rule would let in more people than you meant');
    expect(problem.message).not.toContain('mask_table');
  });

  test('constructor and toString are not keys of the schema', () => {
    const data = JSON.parse('{"entity_field":"entity_id","membership_type":2,"constructor":1,"toString":"x"}');
    expect(codes('AuthzEntityMembership', data)).toEqual([['constructor', 'unknown-key'], ['toString', 'unknown-key']]);
  });

  test('a key the backend always derives is refused, inside a composite too', () => {
    expect(codes('AuthzEntityMembership', { ...TEAM, mask_column: 'caps', mask_table: 'notes' })).toEqual([['mask_table', 'stored-only-key']]);
    expect(codes('AuthzAppMembership', { sprt_table: 'app_sprt' })).toEqual([['sprt_table', 'stored-only-key']]);
    expect(codes('AuthzComposite', { NOT: { AuthzAppMembership: { membership_type: 1 } } })).toEqual([['NOT.AuthzAppMembership.membership_type', 'stored-only-key']]);
  });

  test('a key nested in a node\'s own object', () => {
    expect(codes('AuthzValueExists', { ref_schema: 's', ref_table: 't', join: [{ local_column: 'a', ref_column: 'b', op: '=' }] })).toEqual([['join.0.op', 'unknown-key']]);
  });

  test('an unknown type and data that is not an object', () => {
    expect(codes('AuthzMystery', {})).toEqual([['', 'not-a-node']]);
    expect(codes('AuthzEntityMembershp', {})).toEqual([['', 'mistyped-node']]);
    expect(codes('AuthzAllowAll', [])).toEqual([['', 'type']]);
  });
});

describe('the role a rule names', () => {
  test('a role the platform does not have is refused, with the nearest one', () => {
    const [problem] = checkRule('AuthzAllowAll', {}, { role: 'authenticatd' });
    expect([problem.path, problem.code, problem.meant]).toEqual(['role', 'unknown-role', 'authenticated']);
    for (const role of POLICY_ROLES) expect(checkRule('AuthzAllowAll', {}, { role })).toEqual([]);
  });

  test('the roles of an API can be given as data', () => {
    expect(checkRule('AuthzAllowAll', {}, { role: 'app_user', roles: ['app_user'] })).toEqual([]);
    expect(checkRule('AuthzAllowAll', {}, { role: 'app_user' }).map((problem) => problem.code)).toEqual(['unknown-role']);
  });
});
