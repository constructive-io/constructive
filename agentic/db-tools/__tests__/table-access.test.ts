import { checkRule, explainPolicy, type TableAccessInput, type TablePolicy } from '../src/access';
import { ruleShapeProblems } from '../src/blueprint/blueprint-schema';
import { asWritten, planTableAccess } from '../src/table-access';

const GRANTS = [{ roles: ['authenticated'], privileges: [['select', '*'], ['insert', '*'], ['update', '*'], ['delete', '*']] }];
const members = { type: 'AuthzAppMembership', privileges: ['select' as const], permissive: true, role: 'authenticated', data: {} };
const owner = { type: 'AuthzDirectOwner', privileges: ['update' as const], permissive: false, role: 'authenticated', data: { entity_field: 'owner_id' } };

describe('planTableAccess', () => {
  it('states each rule in words now and after, with the grants and row security, and no answer about people', () => {
    const before: TableAccessInput = { policies: [members], grants: [], rls_enabled: false, fields: [] };
    const after: TableAccessInput = { policies: [members, owner], grants: GRANTS, rls_enabled: true, fields: [] };

    const access = planTableAccess('posts', before, after);

    expect(access.before).toEqual({
      rules: [{ $type: 'AuthzAppMembership', privileges: ['select'], permissive: true, policy_role: 'authenticated', words: explainPolicy('AuthzAppMembership', {}) }],
      grants: [],
      rowSecurity: false,
    });
    expect(access.after.rules.map(({ $type, permissive, words }) => ({ $type, permissive, words }))).toEqual([
      { $type: 'AuthzAppMembership', permissive: true, words: explainPolicy('AuthzAppMembership', {}) },
      { $type: 'AuthzDirectOwner', permissive: false, words: explainPolicy('AuthzDirectOwner', { entity_field: 'owner_id' }) },
    ]);
    expect(access.after.grants).toEqual(['select, insert, update and delete to authenticated']);
    expect(access.after.rowSecurity).toBe(true);
    expect(Object.keys(access)).not.toContain('changes');
  });

  it('words a related member list with the related columns the plan read', () => {
    const list = { type: 'AuthzRelatedMemberList', privileges: ['select' as const], permissive: true, role: 'authenticated', data: { owned_table_id: 'g1', owned_table_key: 'member_ids', owned_table_ref_key: 'id', this_object_key: 'group_id' } };
    const words = (related?: TableAccessInput['related']) => planTableAccess('posts', undefined, { policies: [list], ...(related ? { related } : {}) }).after.rules[0].words;

    expect(words({ g1: ['id', 'member_ids'] })).toBe(explainPolicy(list.type, list.data, { g1: ['id', 'member_ids'] }));
    expect(words({ g1: ['id', 'member_ids'] })).not.toMatch(/may not check/);
    expect(words()).toMatch(/may not check what they say/);
  });
});

describe('asWritten', () => {
  // Stored rules as a new database's users table holds them: member lists the backend resolved, a parse tree, a recorded table.
  const LIST = { sprt_schema: 'my-db-memberships-private', sprt_table: 'app_memberships_sprt', membership_type: 1 };
  const stored = (type: string, data: Record<string, unknown>, privileges: TablePolicy['privileges'] = ['select']): TablePolicy => ({ type, privileges, permissive: true, role: 'authenticated', data });

  it('gives a stored rule in the shape a caller writes, without the keys the registry marks read-only, nested ones too', () => {
    const app = stored('AuthzAppMembership', { is_admin: true, ...LIST });
    const nested = stored('AuthzComposite', { OR: [{ AuthzAppMembership: { mask: '01', bitlen: 2, ...LIST } }, { AuthzDirectOwner: { entity_field: 'owner_id' } }] }, ['update']);
    const exists = stored('AuthzValueExists', { join: [{ ref_column: 'user_id', local_column: 'id' }], ref_table_id: '01a2178c-dccc-7b10-8882-d489e320734c', protected_table_name: 'users', conditions_ast: { A_Const: {} } });
    const parsed = stored('AuthzComposite', { BoolExpr: { boolop: 'AND_EXPR', args: [{ AuthzAppMembership: LIST }, { A_Expr: { kind: 'AEXPR_OP' } }] } });

    expect(asWritten(app)).toEqual({ $type: 'AuthzAppMembership', privileges: ['select'], permissive: true, policy_role: 'authenticated', data: { is_admin: true } });
    expect(asWritten(nested).data).toEqual({ OR: [{ AuthzAppMembership: { mask: '01', bitlen: 2 } }, { AuthzDirectOwner: { entity_field: 'owner_id' } }] });
    expect(asWritten(exists).data).toEqual({ join: [{ ref_column: 'user_id', local_column: 'id' }], ref_table_id: '01a2178c-dccc-7b10-8882-d489e320734c' });
    expect(asWritten(parsed).data).toEqual({});
    expect(JSON.stringify([app, nested, exists, parsed].map(asWritten))).not.toMatch(/sprt_|membership_type|protected_table_name|_ast|BoolExpr|A_Expr/);
  });

  it('gives a rule that can be written back as it is, with the WITH CHECK rule of an update in the same shape', () => {
    const update = { ...stored('AuthzAppMembership', { is_admin: true, ...LIST }, ['update']), with_check: { type: 'AuthzAppMembership', data: { is_owner: true, ...LIST } } };
    const written = asWritten(update);

    expect(written.with_check).toEqual({ $type: 'AuthzAppMembership', data: { is_owner: true } });
    expect(ruleShapeProblems(written, { withCheck: true })).toEqual([]);
    expect(checkRule(written.$type, written.data, { role: written.policy_role })).toEqual([]);
  });
});
