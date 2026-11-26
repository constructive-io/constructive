import { allNodeTypes, type NodeTypeDefinition } from 'node-type-registry';

import { ADDED_FIELDS, type AddedField, dataNodesForPolicies, defaultFills, fieldsAddedByNodes, TABLE_NEEDS, type TablePolicy } from '../src/access';

const authzNodes: NodeTypeDefinition[] = allNodeTypes.filter((node) => node.category === 'authz');
// The nodes of the data module: data, check and search nodes.
const dataNodes: NodeTypeDefinition[] = allNodeTypes.filter((node) => ['data', 'check', 'search'].includes(node.category) || node.name.startsWith('Table'));
const byName = new Map([...authzNodes, ...dataNodes].map((node) => [node.name, node]));
const TABLE_KINDS = ['has-module', 'needs-fields', 'needs-table', 'no-fields', 'mixed'];

const policy = (type: string, data: Record<string, unknown> = {}): TablePolicy => ({ type, privileges: ['select'], permissive: true, data });

// One row per Authz node: what it needs on the table, and the Data node that adds it.
const AUTHZ_ROWS: Array<[string, string, string | null]> = [
  ['AuthzAllowAll', 'no-fields', null],
  ['AuthzAppMemberOwner', 'has-module', 'DataDirectOwner'],
  ['AuthzAppMembership', 'no-fields', null],
  ['AuthzColumnSecurity', 'needs-fields', null],
  ['AuthzComposite', 'mixed', null],
  ['AuthzDatabaseClaim', 'needs-fields', null],
  ['AuthzDenyAll', 'no-fields', null],
  ['AuthzDirectOwner', 'has-module', 'DataDirectOwner'],
  ['AuthzDirectOwnerAny', 'needs-fields', null],
  ['AuthzEntityMembership', 'has-module', 'DataEntityMembership'],
  ['AuthzFilePath', 'needs-table', null],
  ['AuthzHumanOnly', 'no-fields', null],
  ['AuthzMemberList', 'needs-fields', null],
  ['AuthzMemberOwner', 'has-module', 'DataOwnershipInEntity'],
  ['AuthzNotReadOnly', 'has-module', 'DataEntityMembership'],
  ['AuthzOrgHierarchy', 'has-module', 'DataOwnershipInEntity'],
  ['AuthzPeerOwnership', 'needs-fields', null],
  ['AuthzPublishable', 'has-module', 'DataPublishable'],
  ['AuthzRelatedEntityMembership', 'needs-table', null],
  ['AuthzRelatedMemberList', 'needs-table', null],
  ['AuthzRelatedMemberOwner', 'needs-table', null],
  ['AuthzRelatedPeerOwnership', 'needs-table', null],
  ['AuthzSystemOnly', 'no-fields', null],
  ['AuthzTemporal', 'needs-fields', null],
  ['AuthzValueAllowed', 'needs-fields', null],
  ['AuthzValueExists', 'needs-table', null],
  ['AuthzValueMatch', 'needs-table', null]
];

// One row per node of the data module: the columns it adds to the table with its registry defaults, from its
// generator (`unknown` where the backend gives no answer).
const DATA_ROWS: Array<[string, string[] | 'unknown']> = [
  ['CheckGreaterThan', []],
  ['CheckLessThan', []],
  ['CheckNotEqual', []],
  ['CheckOneOf', []],
  ['CheckOwnedRelation', []],
  ['DataArchivable', ['is_archived boolean not null', 'archived_at timestamptz']],
  ['DataBulk', 'unknown'],
  ['DataCapabilities', ['required_capabilities bit not null']],
  ['DataCompositeField', ['embedding_text text']],
  ['DataDenormalized', 'unknown'],
  ['DataDirectOwner', ['owner_id uuid not null']],
  ['DataEntityMembership', ['entity_id uuid not null']],
  ['DataForceCurrentUser', []],
  ['DataGenerated', 'unknown'],
  ['DataHistory', []],
  ['DataI18n', []],
  ['DataId', ['id uuid not null']],
  ['DataIdentity', 'unknown'],
  ['DataImmutableFields', []],
  ['DataInflection', []],
  ['DataInheritFromParent', []],
  ['DataJsonb', ['metadata jsonb']],
  ['DataLock', ['locked boolean not null']],
  ['DataMemberOwner', ['owner_id uuid not null', 'entity_id uuid not null']],
  ['DataOwnedFields', []],
  ['DataOwnershipInEntity', ['owner_id uuid not null', 'entity_id uuid not null']],
  ['DataPeoplestamps', ['created_by uuid', 'updated_by uuid']],
  ['DataPrincipalstamps', ['created_by_principal uuid', 'updated_by_principal uuid']],
  ['DataPublishable', ['is_published boolean not null', 'published_at timestamptz']],
  ['DataRealtime', []],
  ['DataSlug', []],
  ['DataSoftDelete', ['deleted_at timestamptz', 'is_deleted boolean not null']],
  ['DataStatusField', ['status text not null']],
  ['DataTags', ['tags citext[]']],
  ['DataTimestamps', ['created_at timestamptz not null', 'updated_at timestamptz not null']],
  ['SearchBm25', []],
  ['SearchFullText', ['search tsvector']],
  ['SearchSpatial', 'unknown'],
  ['SearchSpatialAggregate', 'unknown'],
  ['SearchTrgm', []],
  ['SearchUnified', 'unknown'],
  ['SearchVector', 'unknown'],
  ['TableOrganizationSettings', 'unknown'],
  ['TableUserProfiles', 'unknown'],
  ['TableUserSettings', 'unknown']
];

function columns(type: string, nodeData: Record<string, unknown> = {}): string[] | 'unknown' {
  const result = fieldsAddedByNodes([{ $type: type, data: nodeData }]);
  if (result.unknown.length) return 'unknown';
  return result.fields.map((field) => `${field.name} ${field.type}${field.nullable ? '' : ' not null'}`);
}

describe('what each node needs on a table', () => {
  test('the rows cover every Authz node and every node of the data module', () => {
    expect(AUTHZ_ROWS.map(([name]) => name).sort()).toEqual(authzNodes.map((node) => node.name).sort());
    expect(DATA_ROWS.map(([name]) => name).sort()).toEqual(dataNodes.map((node) => node.name).sort());
  });

  test.each(AUTHZ_ROWS)('%s: %s, %s', (name, kind, dataNode) => {
    const node = byName.get(name);
    const need = TABLE_NEEDS[name];
    expect(need.kind).toBe(kind);
    expect(TABLE_KINDS).toContain(need.kind);
    expect(need.data_node?.type ?? null).toBe(dataNode);
    expect(Boolean(need.data_node)).toBe(kind === 'has-module');
    if (!need.data_node) return;
    const target = byName.get(need.data_node.type);
    expect(['data', 'check', 'search']).toContain(target?.category);
    const fixed = (ADDED_FIELDS[target.name] as Array<{ name: unknown }>).map((field) => field.name).filter((field) => typeof field === 'string');
    for (const [param, how] of Object.entries(need.data_node.columns)) {
      expect(Object.keys(node.parameter_schema.properties)).toContain(param);
      if ('param' in how) expect(Object.keys(target.parameter_schema.properties)).toContain(how.param);
      else expect(fixed).toContain(how.name);
    }
  });

  // The backend reads append_only, which the registry schema does not list.
  const BACKEND_ONLY: Record<string, string[]> = { DataPeoplestamps: ['append_only'], DataPrincipalstamps: ['append_only'] };

  test.each(dataNodes.filter((node) => Array.isArray(ADDED_FIELDS[node.name])).map((node) => [node.name, node] as const))(
    '%s: its columns name only its own parameters',
    (name, node) => {
      const known = [...Object.keys(node.parameter_schema.properties ?? {}), ...(BACKEND_ONLY[name] ?? [])];
      for (const field of ADDED_FIELDS[name] as AddedField[]) {
        for (const value of [field.name, field.type, field.required]) {
          if (typeof value === 'object') expect(known).toContain(value.param);
        }
        if (field.unless) expect(known).toContain(field.unless);
      }
    }
  );

  test.each(DATA_ROWS)('%s adds %j', (name, expected) => {
    expect(columns(name)).toEqual(expected);
  });

  test('a node parameter names, types or leaves out a column', () => {
    expect(columns('DataTags', { field_name: 'labels', is_required: true })).toEqual(['labels citext[] not null']);
    expect(columns('DataStatusField', { field_name: 'stage', type: { name: 'citext' }, is_required: false })).toEqual(['stage citext']);
    expect(columns('DataGenerated', { target: 'full_name' })).toEqual(['full_name text']);
    expect(columns('DataIdentity', { target: 'seq', type: { name: 'integer' } })).toEqual(['seq integer']);
    // The backend reads append_only, which the registry schema does not list.
    expect(columns('DataPeoplestamps', { append_only: true })).toEqual(['created_by uuid']);
    expect(columns('DataPrincipalstamps', { append_only: true })).toEqual(['created_by_principal uuid']);
  });

  test('a list of nodes: strings work, and a node with no known columns is named', () => {
    const result = fieldsAddedByNodes(['DataId', 'DataTimestamps', 'DataBulk', { $type: 'DataDirectOwner', data: { owner_field_name: 'author_id' } }]);
    expect(result.fields.map((field) => field.name)).toEqual(['id', 'created_at', 'updated_at', 'author_id']);
    expect(result.unknown).toEqual(['DataBulk']);
  });
});

// The default of each column a Data node adds (registry defaults apply), from its generator; `null` where the
// generator passes no default_value. Each generator keeps the default of a column the table already has.
const OWNER = { function: 'current_user_id', schema: 'jwt_public' };
const DEFAULT_ROWS: Array<[string, Record<string, unknown>, Record<string, unknown>, string]> = [
  ['DataArchivable', {}, { is_archived: { value: false }, archived_at: null }, 'data_archivable.sql:26-32, :51-56'],
  ['DataCapabilities', {}, { required_capabilities: 'unknown' }, 'data_capabilities.sql:253-264, the mask comes from the capability catalog'],
  ['DataCompositeField', {}, { embedding_text: null }, 'data_composite_field.sql:120-126'],
  ['DataDirectOwner', {}, { owner_id: OWNER }, 'data_direct_owner.sql:41-47'],
  ['DataEntityMembership', {}, { entity_id: null }, 'data_membership_by_field.sql:41-46'],
  ['DataGenerated', { target: 'full_name' }, { full_name: { generated: 'expression' } }, 'data_generated.sql:328-337'],
  ['DataId', {}, { id: { function: 'uuidv7' } }, 'data_id.sql:37, metaschema-utils procedures/utils.sql:1125-1127'],
  ['DataIdentity', { target: 'seq', type: { name: 'integer' } }, { seq: { generated: 'identity' } }, 'data_identity.sql:62-70'],
  ['DataJsonb', {}, { metadata: { value: {}, cast: { name: 'jsonb' } } }, 'data_jsonb.sql:28-30, :47, the registry default of default_value'],
  ['DataLock', {}, { locked: { value: false } }, 'data_lock.sql:118, :189'],
  ['DataMemberOwner', {}, { owner_id: OWNER, entity_id: null }, 'data_member_owner.sql:70-76, :91-97'],
  ['DataOwnershipInEntity', {}, { owner_id: OWNER, entity_id: null }, 'data_direct_owner_in_entity.sql:42-48, :66-71'],
  ['DataPeoplestamps', {}, { created_by: null, updated_by: null }, 'data_peoplestamps.sql:86-92'],
  ['DataPrincipalstamps', {}, { created_by_principal: null, updated_by_principal: null }, 'data_principalstamps.sql:83-89'],
  ['DataPublishable', {}, { is_published: { value: false }, published_at: null }, 'data_publishable.sql:42-48, :65-70'],
  ['DataSoftDelete', {}, { deleted_at: null, is_deleted: { value: false } }, 'data_soft_delete.sql:26-31, :48-54'],
  ['DataStatusField', {}, { status: null }, 'data_status_field.sql:43-45, :83'],
  ['DataTags', {}, { tags: { value: [], cast: { name: 'citext', array_dimensions: 1 } } }, 'data_tags.sql:27-29, :45'],
  ['DataTimestamps', {}, { created_at: { function: 'now' }, updated_at: { function: 'now' } }, 'data_timestamps.sql:39-45, :61-68'],
  ['SearchFullText', {}, { search: null }, 'search_full_text.sql:74-80']
];

const defaultsOf = (type: string, nodeData: Record<string, unknown>) =>
  Object.fromEntries(fieldsAddedByNodes([{ $type: type, data: nodeData }]).fields.map((field) => [field.name, field.default]));

describe('the default of each column a Data node adds', () => {
  test('the rows cover every node that adds a column, and every entry states its default', () => {
    const adding = dataNodes.filter((node) => Array.isArray(ADDED_FIELDS[node.name]) && ADDED_FIELDS[node.name].length > 0);
    expect(DEFAULT_ROWS.map(([name]) => name).sort()).toEqual(adding.map((node) => node.name).sort());
    for (const node of adding) for (const field of ADDED_FIELDS[node.name] as AddedField[]) expect([node.name, Object.prototype.hasOwnProperty.call(field, 'default')]).toEqual([node.name, true]);
  });

  test.each(DEFAULT_ROWS)('%s %j: %j (%s)', (type, nodeData, expected) => {
    expect(defaultsOf(type, nodeData)).toEqual(expected);
  });

  test('a node parameter holds the default', () => {
    expect(defaultsOf('DataStatusField', { default_value: 'active' })).toEqual({ status: { value: 'active' } });
    expect(defaultsOf('DataJsonb', { default_value: { function: 'jsonb_build_object' } })).toEqual({ metadata: { function: 'jsonb_build_object' } });
    expect(defaultsOf('DataLock', { default_locked: true })).toEqual({ locked: { value: true } });
  });

  // A constant default rides ADD COLUMN; any other is set after SET NOT NULL, so it fills new rows only.
  test.each<[string, unknown, { existing_rows: boolean | 'unknown'; new_rows: boolean | 'unknown' }]>([
    ['no default', null, { existing_rows: false, new_rows: false }],
    ['a constant', { value: false }, { existing_rows: true, new_rows: true }],
    ['a constant with a cast', { value: [], cast: { name: 'citext', array_dimensions: 1 } }, { existing_rows: true, new_rows: true }],
    ['a function', { function: 'current_user_id', schema: 'jwt_public' }, { existing_rows: false, new_rows: true }],
    ['a keyword', { sql_keyword: 'CURRENT_TIMESTAMP' }, { existing_rows: false, new_rows: true }],
    ['an operator over constants', { operator: '+', left: { value: 1 }, right: { value: 2 } }, { existing_rows: true, new_rows: true }],
    ['an operator over a function', { operator: '+', left: { value: 1 }, right: { function: 'now' } }, { existing_rows: false, new_rows: true }],
    ['a generated column', { generated: 'identity' }, { existing_rows: true, new_rows: true }],
    ['not known', 'unknown', { existing_rows: 'unknown', new_rows: 'unknown' }]
  ])('defaultFills: %s', (_label, value, expected) => {
    expect(defaultFills(value as Parameters<typeof defaultFills>[0])).toEqual(expected);
  });
});

describe('Data nodes from policies', () => {
  test('a column named by the policy goes into the Data node', () => {
    expect(dataNodesForPolicies([policy('AuthzDirectOwner', { entity_field: 'author_id' })]).nodes).toEqual([
      { $type: 'DataDirectOwner', data: { owner_field_name: 'author_id' } }
    ]);
  });

  test('a Data node that adds every column another one adds makes it unneeded', () => {
    const team = { entity_field: 'entity_id', membership_type: 2 };
    const derived = dataNodesForPolicies([policy('AuthzEntityMembership', team), policy('AuthzMemberOwner', { ...team, owner_field: 'owner_id' })]);
    expect(derived.nodes.map((node) => node.$type)).toEqual(['DataOwnershipInEntity']);
  });

  test('a column the Data node cannot name is a problem, not a guess', () => {
    // DataOwnershipInEntity always creates owner_id and entity_id.
    const derived = dataNodesForPolicies([policy('AuthzMemberOwner', { owner_field: 'actor_id', entity_field: 'entity_id', membership_type: 2 })]);
    expect(derived.nodes).toEqual([]);
    expect(derived.problems).toEqual([
      'AuthzMemberOwner names the column "actor_id" in owner_field, but DataOwnershipInEntity always adds "owner_id"; add "actor_id" and "entity_id" to the table first, or use "owner_id".'
    ]);
  });

  test('a composite needs what its nested nodes need', () => {
    const derived = dataNodesForPolicies([policy('AuthzComposite', { OR: [{ AuthzDirectOwner: { entity_field: 'owner_id' } }, { AuthzPublishable: {} }] })]);
    expect(derived.nodes.map((node) => node.$type).sort()).toEqual(['DataDirectOwner', 'DataPublishable']);
  });
});
