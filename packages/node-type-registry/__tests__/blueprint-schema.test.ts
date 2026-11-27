import Ajv from 'ajv';

import { blueprintDefinitionJsonSchema } from '../src/blueprint-schema.generated';

const ajv = new Ajv({ strict: false, allErrors: true });
for (const format of ['column-ref', 'uuid', 'function-ref', 'labeled']) ajv.addFormat(format, true);
const validate = ajv.compile(blueprintDefinitionJsonSchema);

const TEAM = { $type: 'AuthzEntityMembership', privileges: ['select', 'insert', 'update', 'delete'], data: { entity_field: 'entity_id', membership_type: 2 } };

function errors(definition: unknown): string[] {
  return validate(definition) ? [] : validate.errors.map((error) => `${error.instancePath} ${error.message}`);
}

const table = (extra: Record<string, unknown> = {}) => ({
  tables: [{ table_name: 'projects', nodes: ['DataId', { $type: 'DataEntityMembership', data: { entity_field_name: 'entity_id' } }], policies: [TEAM], ...extra }]
});

describe('the blueprint definition JSON Schema', () => {
  test('a blueprint with tables, fields, relations and constraints at both levels passes', () => {
    const definition = {
      ...table({
        fields: [{ name: 'status', type: { name: 'text' }, default: { value: 'pending' }, is_required: true, index: 'btree' }],
        check_constraints: [{ $type: 'CheckOneOf', name: 'status_known', data: { column: 'status', values: ['pending', 'done'] } }]
      }),
      relations: [{ $type: 'RelationBelongsTo', source_table: 'projects', source_schema: 'app_public', target_table: 'organizations', target_schema: 'app_public', delete_action: 'r' }],
      check_constraints: [{ table_name: 'projects', $type: 'CheckNotEqual', name: 'distinct', data: { columns: ['a', 'b'] } }],
      unique_constraints: [{ table_name: 'projects', columns: ['status'] }]
    };
    expect(errors(definition)).toEqual([]);
  });

  test('a policy\'s data is checked against its Authz node, closed', () => {
    expect(errors(table({ policies: [{ ...TEAM, data: { ...TEAM.data, is_admn: true } }] }))).toContain('/tables/0/policies/0/data must NOT have additional properties');
    expect(errors(table({ policies: [{ ...TEAM, data: { ...TEAM.data, mask_table: 'notes' } }] }))).toContain('/tables/0/policies/0/data must NOT have additional properties');
    expect(errors(table({ policies: [{ $type: 'AuthzComposite', data: { OR: [{ A_Const: { boolval: true } }] } }] }))).toContain(
      '/tables/0/policies/0/data/OR/0 must NOT have additional properties'
    );
    expect(errors(table({ policies: [{ $type: 'AuthzComposite', data: { OR: [{ AuthzEntityMembership: { entity_field: 'entity_id' } }] } }] })).length).toBeGreaterThan(0);
  });

  test('a policy entry takes only the keys the backend reads', () => {
    expect(errors(table({ policies: [{ ...TEAM, permisive: false }] }))).toContain('/tables/0/policies/0 must NOT have additional properties');
    expect(errors(table({ policies: [{ ...TEAM, $type: 'AuthzNoSuchNode' }] }))).toContain('/tables/0/policies/0/$type must be equal to one of the allowed values');
  });

  test('a with_check override is for update only', () => {
    const check = { $type: 'AuthzValueAllowed', data: { column: 'role', allowed: ['member'], operator: 'in' } };
    expect(errors(table({ policies: [{ ...TEAM, privileges: ['update'], with_check: check }] }))).toEqual([]);
    expect(errors(table({ policies: [{ ...TEAM, privileges: ['select', 'update'], with_check: check }] }))).toContain('/tables/0/policies/0/privileges/0 must match pattern "^[Uu][Pp][Dd][Aa][Tt][Ee]$"');
  });

  test('a check constraint names one of the backend\'s check types', () => {
    expect(errors(table({ check_constraints: [{ $type: 'CheckOwnedRelation', name: 'x', data: { column: 'a' } }] }))).toContain(
      '/tables/0/check_constraints/0/$type must be equal to one of the allowed values'
    );
  });
});
