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

  test('only policies with required caller inputs need data', () => {
    expect(errors(table({ policies: [{ $type: 'AuthzEntityMembership' }] }))).toContain("/tables/0/policies/0 must have required property 'data'");
    expect(errors(table({ policies: [{ $type: 'AuthzAllowAll' }] }))).toEqual([]);
    expect(errors(table({ policies: [{ $type: 'AuthzAllowAll', privileges: ['update'], with_check: { $type: 'AuthzEntityMembership' } }] }))).toContain(
      "/tables/0/policies/0/with_check must have required property 'data'"
    );
  });

  test('each relation end names a table or a module table, not both', () => {
    const module = { type: 'agent', scope: 'org', table: 'message' };
    const relates = (ends: Record<string, unknown>) => ({
      ...table(),
      relations: [{ $type: 'RelationBelongsTo', delete_action: 'r', ...ends }]
    });
    expect(errors(relates({}))).not.toEqual([]);
    expect(errors(relates({ source_table: 'projects' }))).not.toEqual([]);
    expect(errors(relates({ source_table: 'projects', target_module: module }))).toEqual([]);
    expect(errors(relates({ source_table: 'projects', target_module: module, delete_action: undefined }))).toContain(
      "/relations/0 must have required property 'delete_action'"
    );
    expect(errors(relates({ source_table: 'projects', target_schema: 'app_public', target_module: module }))).not.toEqual([]);
    expect(errors(relates({ source_table: 'projects', target_table: 'messages', target_module: module }))).not.toEqual([]);
  });

  test('each table has one target and nodes that require data cannot use shorthand', () => {
    const module = { type: 'agent', scope: 'org', table: 'message' };
    expect(errors({ tables: [{}] })).not.toEqual([]);
    expect(errors({ tables: [{ module }] })).toEqual([]);
    expect(errors(table({ module }))).not.toEqual([]);
    const install = { type: 'agent', scope: 'org' };
    const provisions = { message: { policies: [TEAM] } };
    expect(errors({ tables: [{ module: install, provisions }] })).toEqual([]);
    expect(errors({ tables: [{ module: install }] })).not.toEqual([]);
    expect(errors({ tables: [{ module, provisions }] })).not.toEqual([]);
    expect(errors({ tables: [{ module: install, provisions, policies: [TEAM] }] })).not.toEqual([]);
    expect(errors(table({ nodes: ['DataId'] }))).toEqual([]);
    expect(errors(table({ nodes: ['AuthzColumnSecurity'] }))).not.toEqual([]);
  });

  test.each(['AuthzValueExists', 'AuthzValueMatch'])('%s requires a nonempty join', ($type) => {
    expect(errors(table({ policies: [{ $type, data: { ref_schema: 'app_public', ref_table: 'teams', join: [] } }] }))).toContain(
      '/tables/0/policies/0/data/join must NOT have fewer than 1 items'
    );
  });

  test('junction policies use the same validation as table policies', () => {
    const junction = (policy: Record<string, unknown>) => ({
      ...table(),
      relations: [{ $type: 'RelationManyToMany', source_table: 'projects', target_table: 'labels', policies: [policy] }]
    });
    expect(errors(junction(TEAM))).toEqual([]);
    expect(errors(junction({ $type: 'AuthzNoSuchNode' }))).not.toEqual([]);
    expect(errors(junction({ $type: 'AuthzEntityMembership' }))).toContain("/relations/0/policies/0 must have required property 'data'");
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
