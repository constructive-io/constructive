import Ajv from 'ajv';

import * as authz from '../src/authz';
import type { JSONSchema, NodeTypeDefinition } from '../src/types';
import USERS from './fixtures/sample-users-table.json';

const nodes = new Map<string, NodeTypeDefinition>(Object.values(authz).map((node) => [node.name, node]));

const ajv = new Ajv({ strict: false, allErrors: true });
for (const format of ['column-ref', 'uuid', 'authz-expression']) ajv.addFormat(format, true);

// A caller must not send what the backend writes: the input form of a schema refuses its readOnly keys.
function input(schema: JSONSchema): JSONSchema {
  const written = Object.keys(schema.properties ?? {}).filter((key) => schema.properties[key].readOnly);
  return written.length ? { ...schema, not: { anyOf: written.map((key) => ({ required: [key] })) } } : schema;
}

const validates = (type: string, data: unknown, form: 'input' | 'stored' = 'input'): boolean => {
  const schema = nodes.get(type).parameter_schema;
  return ajv.validate(form === 'input' ? input(schema) : schema, data) as boolean;
};

// The smallest data each node takes from a caller.
const SAMPLES: Record<string, Record<string, unknown>> = {
  AuthzAllowAll: {},
  AuthzAppMemberOwner: { owner_field: 'owner_id' },
  AuthzAppMembership: {},
  AuthzColumnSecurity: { columns: ['is_shared'], rule: 'immutable' },
  AuthzComposite: { AND: [{ AuthzEntityMembership: { entity_field: 'entity_id', membership_type: 2 } }, { AuthzHumanOnly: {} }] },
  AuthzDatabaseClaim: {},
  AuthzDenyAll: {},
  AuthzDirectOwner: { entity_field: 'owner_id' },
  AuthzDirectOwnerAny: { entity_fields: ['sender_id'] },
  AuthzEntityMembership: { entity_field: 'entity_id', membership_type: 2 },
  AuthzFilePath: { capability_field: 'can_read', shares_schema: 'app', shares_table: 'path_shares', files_schema: 'app', files_table: 'files' },
  AuthzHumanOnly: {},
  AuthzMemberList: { array_field: 'member_ids' },
  AuthzMemberOwner: { owner_field: 'owner_id', entity_field: 'entity_id', entity_type: 'org' },
  AuthzNotReadOnly: { entity_field: 'entity_id', membership_type: 2 },
  AuthzOrgHierarchy: { direction: 'down', anchor_field: 'owner_id' },
  AuthzPeerOwnership: { owner_field: 'owner_id', membership_type: 2 },
  AuthzPublishable: {},
  AuthzRelatedEntityMembership: { entity_field: 'project_id', membership_type: 2, obj_schema: 'app', obj_table: 'projects', obj_field: 'entity_id' },
  AuthzRelatedMemberList: { owned_table_key: 'member_ids', owned_table_ref_key: 'id', this_object_key: 'group_id', owned_table_id: '00000000-0000-0000-0000-000000000001' },
  AuthzRelatedMemberOwner: { owner_field: 'owner_id', entity_field: 'project_id', membership_type: 2, obj_table_id: '00000000-0000-0000-0000-000000000002', obj_field: 'entity_id' },
  AuthzRelatedPeerOwnership: { entity_field: 'project_id', membership_type: 2, obj_schema: 'app', obj_table: 'projects', obj_field: 'owner_id' },
  AuthzSystemOnly: {},
  AuthzTemporal: { valid_from_field: 'starts_at' },
  AuthzValueAllowed: { column: 'status', allowed: ['open'], operator: 'in' },
  AuthzValueExists: { ref_schema: 'app', ref_table: 'grants', join: [{ local_column: 'id', ref_column: 'item_id' }] },
  AuthzValueMatch: {
    ref_schema: 'app',
    ref_table: 'grants',
    join: [{ local_column: 'id', ref_column: 'item_id' }],
    match: { ref_column: 'level', allowed: ['edit'], operator: 'in' }
  }
};

describe('a closed parameter_schema for each Authz node', () => {
  test('each node takes its sample and refuses a key it does not list', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual([...nodes.keys()].sort());
    for (const [type, data] of Object.entries(SAMPLES)) {
      expect([type, validates(type, data)]).toEqual([type, true]);
      expect([type, validates(type, { ...data, is_admn: true })]).toEqual([type, false]);
    }
  });

  test('a key the backend always derives is refused from a caller and read in a stored rule', () => {
    const stored = { entity_field: 'entity_id', mask_column: 'required_caps', mask_table: 'notes', membership_type: 2 };
    expect(validates('AuthzEntityMembership', stored)).toBe(false);
    expect(validates('AuthzEntityMembership', stored, 'stored')).toBe(true);
    expect(validates('AuthzAppMembership', { membership_type: 1 })).toBe(false);
    expect(validates('AuthzAppMembership', { sprt_table: 'app_sprt' })).toBe(false);
    expect(validates('AuthzOrgHierarchy', { direction: 'down', anchor_field: 'owner_id', sprt_table: 'h' })).toBe(false);
    expect(validates('AuthzValueExists', { ...SAMPLES.AuthzValueExists, protected_table_name: 'notes' })).toBe(false);
  });

  test('a key the policy builder reads from the caller\'s data is taken', () => {
    const team = { entity_field: 'entity_id', membership_type: 2 };
    expect(validates('AuthzMemberOwner', { ...team, owner_field: 'owner_id', is_admin: true, is_owner: true, mask_column: 'required_caps' })).toBe(true);
    expect(validates('AuthzAppMembership', { mask: '0101', bitlen: 64, mask_column: 'required_caps' })).toBe(true);
    expect(validates('AuthzEntityMembership', { ...team, check_function_schema: 'app_private', check_function_name: 'is_member' })).toBe(true);
    expect(validates('AuthzDatabaseClaim', { schema_id: '00000000-0000-0000-0000-000000000003', lane_attested: true })).toBe(true);
    expect(validates('AuthzNotReadOnly', { entity_field: 'entity_id', membership_type: 2, mask_column: 'required_caps' })).toBe(false);
  });

  test('a raw expression from a caller is refused, also where the backend would read it', () => {
    expect(validates('AuthzComposite', { BoolExpr: { boolop: 'OR_EXPR', args: [] } })).toBe(false);
    expect(validates('AuthzValueExists', { ...SAMPLES.AuthzValueExists, conditions_ast: { BoolExpr: {} } })).toBe(false);
  });

  test('every rule the backend stored for the users table fits its node', () => {
    const misfits = USERS.policyRules.filter((rule) => !validates(rule.type, rule.data, 'stored')).map((rule) => [rule.type, ajv.errorsText()]);
    expect(misfits).toEqual([]);
  });

  test('the team kind: a number, an entity type or the member list by name, never a number as text', () => {
    expect(validates('AuthzEntityMembership', { entity_field: 'entity_id' })).toBe(false);
    expect(validates('AuthzEntityMembership', { entity_field: 'entity_id', membership_type: '2' })).toBe(false);
    expect(validates('AuthzEntityMembership', { entity_field: 'entity_id', membership_type: 2, entity_type: 'org' })).toBe(true);
    expect(validates('AuthzEntityMembership', { entity_field: 'entity_id', sprt_schema: 's', sprt_table: 'members' })).toBe(true);
    expect(validates('AuthzEntityMembership', { entity_field: 'entity_id', sprt_table: 'members' })).toBe(false);
    expect(validates('AuthzNotReadOnly', { entity_field: 'entity_id', entity_type: 'org' })).toBe(true);
    expect(validates('AuthzNotReadOnly', { entity_field: 'entity_id', membership_type: 1 })).toBe(false);
  });

  test('an expression holds one Authz node or one combinator, never a raw expression', () => {
    expect(validates('AuthzComposite', { OR: [{ A_Const: { boolval: true } }] })).toBe(false);
    expect(validates('AuthzComposite', { OR: [{ AuthzAllowAll: {}, AuthzDenyAll: {} }] })).toBe(false);
    expect(validates('AuthzComposite', { OR: [] })).toBe(false);
    expect(validates('AuthzComposite', { or: [{ AuthzAllowAll: {} }] })).toBe(false);
    expect(validates('AuthzComposite', { OR: [{ AuthzComposite: { NOT: { AuthzAllowAll: {} } } }] })).toBe(false);
    expect(validates('AuthzComposite', { OR: [{ AuthzColumnSecurity: { columns: ['a'], rule: 'immutable' } }] })).toBe(false);
    expect(validates('AuthzColumnSecurity', { columns: ['role'], rule: 'set_values', values: ['owner'], authz: { NOT: { AuthzHumanOnly: {} } } })).toBe(true);
  });

  test('the backend\'s own rules beside the keys', () => {
    expect(validates('AuthzColumnSecurity', { columns: ['role'], rule: 'not_values', values: ['member'], authz: { AuthzHumanOnly: {} } })).toBe(true);
    expect(validates('AuthzColumnSecurity', { columns: ['role'], rule: 'transition', authz: { AuthzHumanOnly: {} } })).toBe(false);
    expect(validates('AuthzColumnSecurity', { columns: [], rule: 'immutable' })).toBe(false);
    expect(validates('AuthzValueExists', { ref_schema: 'app', ref_table: 'grants' })).toBe(false);
    expect(validates('AuthzRelatedEntityMembership', { entity_field: 'project_id', membership_type: 2, obj_schema: 'app', obj_table: 'projects' })).toBe(false);
  });
});
