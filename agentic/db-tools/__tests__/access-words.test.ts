import { allNodeTypes, type NodeTypeDefinition } from 'node-type-registry';

import { explainPolicy, POLICY_WORDS } from '../src/access';

const authzNodes: NodeTypeDefinition[] = allNodeTypes.filter((node) => node.category === 'authz');

const BANNED_ENGINE_WORDS = [/\bSPRT\b/i, /\bRLS\b/i, /\bpermissive\b/i, /\bmembership_type\b/i, /\bpredicate\b/i];

function placeholders(template: string): string[] {
  return [...template.matchAll(/\{([A-Za-z_][A-Za-z_.]*)\}/g)].map((match) => match[1]);
}

function alwaysHasValue(node: NodeTypeDefinition, param: string): boolean {
  const schema = node.parameter_schema;
  return (schema.required ?? []).includes(param) || schema.properties?.[param]?.default !== undefined;
}

describe('the words of each Authz node', () => {
  test('every Authz node has words, and only Authz nodes do', () => {
    expect(Object.keys(POLICY_WORDS).sort()).toEqual(authzNodes.map((node) => node.name).sort());
  });

  test.each(authzNodes.map((node) => [node.name, node] as const))('%s templates name only its own parameters', (_name, node) => {
    const words = POLICY_WORDS[node.name];
    const properties = Object.keys(node.parameter_schema.properties ?? {});
    for (const param of placeholders(words.text)) {
      expect(properties).toContain(param);
      expect(alwaysHasValue(node, param) || words.assumes?.[param] !== undefined).toBe(true);
    }
    for (const clause of words.clauses ?? []) {
      expect(properties).toContain(clause.when);
      for (const key of [...(clause.unless ?? []), ...(clause.covers ?? [])]) expect(properties).toContain(key);
      for (const param of placeholders(clause.text)) {
        const [root, nested] = param.split('.');
        expect(properties).toContain(root);
        if (nested) {
          expect(Object.keys(node.parameter_schema.properties[root]?.properties ?? {})).toContain(nested);
          expect(root).toBe(clause.when);
        } else {
          expect(param === clause.when || alwaysHasValue(node, param)).toBe(true);
        }
      }
    }
    for (const param of Object.keys(words.values ?? {})) expect(properties).toContain(param.split('.')[0]);
  });

  test('no template uses an engine word', () => {
    const hits = Object.entries(POLICY_WORDS).flatMap(([name, words]) =>
      [words.text, ...(words.clauses ?? []).map((clause) => clause.text), ...Object.values(words.values ?? {}).flatMap((value) => Object.values(value))]
        .filter((text) => BANNED_ENGINE_WORDS.some((word) => word.test(text.replace(/\{[A-Za-z_.]+\}/g, ''))))
        .map((text) => `${name}: "${text}"`)
    );
    expect(hits).toEqual([]);
  });
});

const NOT_DESCRIBED = (key: string): string =>
  `The setting "${key}" is set, and these words do not describe it, so the access may be wider or narrower.`;
// A part the words cannot read: under AND it can only narrow, under OR only widen.
const PART_NOT_DESCRIBED = (effect: string) => `A part that these words do not describe, so the access may be ${effect}.`;
const ORGANIZATION = 'The team is an organization (each person also has one of their own).';
const ENTITY_MEMBERS = 'Members of the team named in the row\'s entity_id column.';
// A composite whose data is one Authz node is that node.
const TEAM_DATA = { entity_field: 'entity_id', membership_type: 2, is_owner: true, sprt_table: 'org_sprt', sprt_schema: 's' };
const MEMBER_OWNER = 'The person whose id is in the row\'s owner_id column, while they are a member of the team named in its entity_id column.';

const MEMBER_LIMIT_CAPABILITIES =
  'The member must also hold these capabilities: edit_posts, publish. Owners and admins hold every capability, and without a capabilities module for this membership only admins pass.';

const CASES: [string, Record<string, unknown>, string][] = [
  ['AuthzAllowAll', {}, 'Anyone who can use the table, for every row.'],
  ['AuthzDenyAll', {}, 'Nobody.'],
  ['AuthzDirectOwner', { entity_field: 'owner_id' }, 'The person whose id is in the row\'s owner_id column.'],
  [
    'AuthzDirectOwnerAny',
    { entity_fields: ['sender_id', 'receiver_id'] },
    'Anyone whose id is in one of the row\'s columns sender_id, receiver_id.'
  ],
  ['AuthzAppMembership', {}, 'Any active member of the app, for every row.'],
  [
    'AuthzAppMembership',
    { is_admin: true },
    'Any active member of the app, for every row. Only admins pass; owners are admins too.'
  ],
  [
    'AuthzAppMembership',
    { is_admin: true, is_owner: true },
    'Any active member of the app, for every row. Only admins pass; owners are admins too.'
  ],
  ['AuthzAppMembership', { is_owner: true }, 'Any active member of the app, for every row. Only owners pass.'],
  [
    'AuthzAppMembership',
    { is_admin: true, is_owner: false },
    'Any active member of the app, for every row. Only admins pass; owners are admins too.'
  ],
  [
    'AuthzAppMemberOwner',
    {},
    'The person whose id is in the row\'s owner_id column, while they are an active member of the app.'
  ],
  ['AuthzEntityMembership', { entity_field: 'entity_id', membership_type: 2 }, `${ENTITY_MEMBERS} ${ORGANIZATION}`],
  [
    'AuthzAppMembership',
    { sprt_table: 'org_memberships_sprt', sprt_schema: 'memberships', membership_type: 2 },
    'Any active member of any organization (each person also has one of their own), for every row.'
  ],
  ['AuthzAppMembership', { sprt_table: 'app_memberships_sprt', sprt_schema: 'memberships', membership_type: 1 }, 'Any active member of the app, for every row.'],
  ['AuthzEntityMembership', { entity_field: 'entity_id', membership_type: 3 }, `${ENTITY_MEMBERS} The team is a custom kind of group (number 3).`],
  [
    'AuthzEntityMembership',
    { entity_field: 'entity_id', entity_type: 'channel', membership_type: 2 },
    `${ENTITY_MEMBERS} The team is of the channel kind.`
  ],
  [
    'AuthzEntityMembership',
    { entity_field: 'entity_id', is_admin: true, is_owner: true },
    `${ENTITY_MEMBERS} Only admins pass; owners are admins too.`
  ],
  [
    'AuthzEntityMembership',
    { entity_field: 'entity_id', capability: 'manage_billing' },
    `${ENTITY_MEMBERS} The setting "capability" is stored, and this rule does not read it.`
  ],
  [
    'AuthzEntityMembership',
    {
      entity_field: 'entity_id',
      membership_type: 2,
      mask: '0101',
      mask_table: 'notes',
      entity_capability_check: true,
      check_function_name: 'is_member'
    },
    [
      ENTITY_MEMBERS,
      ORGANIZATION,
      'The member must also hold the capabilities in a stored capability mask; owners and admins hold them all, and these words cannot name them.',
      'The function is_member decides membership instead of the member list, given the row\'s entity_id column.',
      NOT_DESCRIBED('entity_capability_check')
    ].join(' ')
  ],
  [
    'AuthzEntityMembership',
    { entity_field: 'org_id', entity_type: 'channel', capabilities: ['edit_posts', 'publish'], mask_column: 'required_caps' },
    'Members of the team named in the row\'s org_id column. The team is of the channel kind. ' +
      MEMBER_LIMIT_CAPABILITIES +
      ' The member must also hold every capability the row lists in its required_caps column; owners and admins hold them all, and a row that lists none needs nothing more.'
  ],
  [
    'AuthzEntityMembership',
    { entity_field: 'entity_id', capabilities: [] },
    'Members of the team named in the row\'s entity_id column.'
  ],
  ['AuthzMemberOwner', {}, MEMBER_OWNER],
  ['AuthzMemberOwner', { sel_field: 'entity_id' }, MEMBER_OWNER],
  ['AuthzMemberOwner', { is_admin: true }, `${MEMBER_OWNER} Only admins pass; owners are admins too.`],
  [
    'AuthzRelatedEntityMembership',
    { entity_field: 'database_id', obj_table: 'database', obj_field: 'owner_id', sel_field: 'id', sel_obj: true, membership_type: 2 },
    'Members of the team that owns the related row the row\'s database_id column points to. The related row is in the database table. ' +
      `The team that owns it is in its owner_id column. The row's database_id column holds the related row's id. ${ORGANIZATION}`
  ],
  [
    'AuthzRelatedMemberOwner',
    { entity_field: 'database_id', obj_table: 'database', obj_field: 'owner_id' },
    'The person whose id is in the row\'s owner_id column, while they are a member of the team that owns the related row its database_id column points to. The related row is in the database table. The team that owns it is in its owner_id column. ' +
      'Without sel_obj, the backend compares the row\'s database_id column with the team id itself, not with a related row.'
  ],
  [
    'AuthzPeerOwnership',
    { owner_field: 'owner_id', entity_type: 'org' },
    'Anyone who shares a team with the person whose id is in the row\'s owner_id column, including that person when they belong to a team. The team is of the org kind.'
  ],
  [
    'AuthzRelatedPeerOwnership',
    { entity_field: 'message_id', obj_table: 'messages', obj_field: 'sender_id' },
    'Anyone who shares a team with the owner of the related row the row\'s message_id column points to. The related row is in the messages table. Its owner is in its sender_id column.'
  ],
  [
    'AuthzOrgHierarchy',
    { direction: 'down', anchor_field: 'owner_id', entity_field: 'org_id', max_depth: 2 },
    'In the reporting chart of the organization named in the row\'s org_id column: the managers above the person in its owner_id column. ' +
      'Only people up to 2 levels apart count.'
  ],
  [
    'AuthzOrgHierarchy',
    { direction: 'up', anchor_field: 'owner_id', entity_field: 'org_id' },
    'In the reporting chart of the organization named in the row\'s org_id column: the people below the person in its owner_id column.'
  ],
  [
    'AuthzTemporal',
    { valid_from_field: 'starts_at', valid_until_field: 'ends_at' },
    'Anyone who can use the table, while the row is inside its time window. The window opens at the time in the starts_at column. It closes at the time in the ends_at column, and an empty value never closes it.'
  ],
  ['AuthzTemporal', { valid_from_inclusive: false }, `Anyone who can use the table, while the row is inside its time window. ${NOT_DESCRIBED('valid_from_inclusive')}`],
  [
    'AuthzTemporal',
    { valid_from_field: 'starts_at', valid_from_inclusive: false, valid_until_field: 'ends_at', valid_until_inclusive: true },
    'Anyone who can use the table, while the row is inside its time window. The window opens just after the time in the starts_at column. ' +
      'It closes just after the time in the ends_at column, and an empty value never closes it.'
  ],
  [
    'AuthzPublishable',
    {},
    'Anyone who can use the table, for rows whose is_published column is true. The time in the published_at column must also be set and not in the future.'
  ],
  [
    'AuthzPublishable',
    { require_published_at: false },
    'Anyone who can use the table, for rows whose is_published column is true.'
  ],
  ['AuthzMemberList', { array_field: 'viewer_ids' }, 'People whose id is listed in the row\'s viewer_ids column.'],
  [
    'AuthzRelatedMemberList',
    { owned_table: 'message_groups', owned_table_key: 'member_ids', owned_table_ref_key: 'id', this_object_key: 'group_id' },
    'People whose id is listed in the member_ids column of the related row whose id column matches the row\'s group_id column. The related row is in the message_groups table. ' +
      'These words cannot tell whether the related table also has a column named "group_id", which this rule does not support; if it has one, the rule may not check what they say.'
  ],
  [
    'AuthzFilePath',
    { capability_field: 'can_read', shares_schema: 'files_public', shares_table: 'path_shares' },
    'People who hold a share of the file or one of its folders, when the share has can_read set and has not expired, even people outside the team. ' +
      'Shares are read from the path_shares table. The shares table is in the files_public schema.'
  ],
  [
    'AuthzHumanOnly',
    {},
    'Only a person signed in as themselves, with a session or their own API key; an agent key with its own identity does not pass.'
  ],
  [
    'AuthzSystemOnly',
    {},
    'Only work the system runs itself, such as triggers and background jobs; normal requests never pass.'
  ],
  [
    'AuthzNotReadOnly',
    { entity_field: 'entity_id', membership_type: 2 },
    `Only members of the team named in the row's entity_id column who are not read-only; meant as a limit on top of the policy that grants access. ${ORGANIZATION}`
  ],
  [
    'AuthzDatabaseClaim',
    {},
    'Connections the platform has bound to one database; no person or team is checked. The database is the one named in the row\'s database_id column.'
  ],
  [
    'AuthzDatabaseClaim',
    { lane_attested: true },
    'Connections the platform has bound to one database; no person or team is checked. The database is the one named in the row\'s database_id column. Only connections the platform attests for that database pass.'
  ],
  [
    'AuthzDatabaseClaim',
    { schema_id: '947d21dd-41cf-24c0-e80c-7a226c1fc697', entity_field: 'database_id', lane_attested: true },
    'Connections the platform has bound to one database; no person or team is checked. The database is the one that owns the schema with id 947d21dd-41cf-24c0-e80c-7a226c1fc697, so such a connection passes for every row. Only connections the platform attests for that database pass.'
  ],
  [
    'AuthzValueAllowed',
    { column: 'status', allowed: ['draft', 'review'], operator: 'in' },
    'Anyone who can use the table, for rows whose status column matches draft, review (test: in).'
  ],
  [
    'AuthzValueExists',
    { ref_table: 'grants', join: [{ local_column: 'id', ref_column: 'doc_id' }], conditions: [{ field: 'active' }] },
    'Anyone who can use the table, for rows that have a matching row in another table, counting only the rows of that table the person can see. The other table is grants. ' +
      'The rows match on the listed column pairs, each compared with its own test (equal unless it says otherwise). ' +
      'The matching row must also meet the listed conditions.'
  ],
  [
    'AuthzValueMatch',
    { match: { ref_column: 'role', allowed: ['admin'], operator: 'in' }, join: [{ local_column: 'id', ref_column: 'doc_id' }] },
    'Anyone who can use the table, for rows that have a matching row in another table, counting only the rows of that table the person can see. ' +
      'The other row\'s role column must match admin (test: in). ' +
      'The rows match on the listed column pairs, each compared with its own test (equal unless it says otherwise).'
  ],
  [
    'AuthzComposite',
    {
      OR: [
        { AuthzDirectOwner: { entity_field: 'owner_id' } },
        { AND: [{ AuthzPublishable: { require_published_at: false } }, { AuthzTemporal: { valid_until_field: 'ends_at' } }] }
      ]
    },
    'Combines other rules. At least one of these must pass: (1) The person whose id is in the row\'s owner_id column. (2) Combines other rules. All of these must pass: (1) Anyone who can use the table, for rows whose is_published column is true. (2) Anyone who can use the table, while the row is inside its time window. It closes at the time in the ends_at column, and an empty value never closes it.'
  ],
  ['AuthzComposite', { or: [{ AuthzDirectOwner: { entity_field: 'owner_id' } }] }, `Combines other rules. ${NOT_DESCRIBED('or')}`],
  ['AuthzComposite', { AuthzEntityMembership: TEAM_DATA }, `${ENTITY_MEMBERS} ${ORGANIZATION} Only owners pass.`],
  [
    'AuthzComposite',
    { BoolExpr: { boolop: 'AND_EXPR', args: [{ AuthzDenyAll: {} }, { A_Expr: { kind: 'AEXPR_OP' } }] } },
    `Combines other rules. All of these must pass: (1) Nobody. (2) ${PART_NOT_DESCRIBED('narrower')}`
  ],
  [
    'AuthzComposite',
    { OR: [{ AuthzDirectOwner: { entity_field: 'owner_id' } }], AND: [{ AuthzAllowAll: {} }] },
    `Combines other rules. At least one of these must pass: (1) The person whose id is in the row's owner_id column. ${NOT_DESCRIBED('AND')}`
  ],
  [
    'AuthzComposite',
    { OR: [{ or: [{ AuthzAllowAll: {} }] }, { AuthzDenyAll: {} }] },
    `Combines other rules. At least one of these must pass: (1) ${PART_NOT_DESCRIBED('wider')} (2) Nobody.`
  ],
  [
    'AuthzColumnSecurity',
    { columns: ['is_shared'], rule: 'set_true', authz: { AuthzAppMembership: { is_admin: true } }, allow_system: true },
    'Limits who may write is_shared, and never gives access to a row: a write that matches the set_true pattern fails unless the writer passes the attached rule. The attached rule: Any active member of the app, for every row. Only admins pass; owners are admins too. Work the system runs itself always passes.'
  ],
  [
    'AuthzColumnSecurity',
    { columns: ['is_shared'], rule: 'immutable', error_code: 'LOCKED' },
    'Limits who may write is_shared, and never gives access to a row: a write that matches the immutable pattern fails unless the writer passes the attached rule. ' +
      'A refused write reports the code LOCKED.'
  ]
];

describe('explainPolicy', () => {
  test.each(CASES)('%s %j', (policyType, data, expected) => {
    expect(explainPolicy(policyType, data)).toBe(expected);
  });

  test('the cases cover every authz node', () => {
    expect([...new Set(CASES.map(([policyType]) => policyType))].sort()).toEqual(authzNodes.map((node) => node.name).sort());
  });

  test.each(['AuthzNope', 'DataId'])('refuses %s, which is not an Authz node', (policyType) => {
    expect(() => explainPolicy(policyType, {})).toThrow(`"${policyType}" is not an Authz node`);
  });

  test('names the parameter it needs when the rule data leaves it out', () => {
    expect(() => explainPolicy('AuthzDirectOwner', {})).toThrow('Add "entity_field" to the rule\'s data');
  });
});

// Shapes the backend builds into a check other than the words say: the words hedge exactly where the findings read the
// rule as one they cannot state.
describe('a stored rule whose words may not state what it checks', () => {
  const unsupported = (column: string, param: string) => `This rule does not support the column name "${column}" in "${param}" here, so it may not check what these words say.`;
  const CHART = { direction: 'down', anchor_field: 'owner_id' };
  const CHART_WORDS = 'In the reporting chart of the organization named in the row\'s entity_id column: the managers above the person in its owner_id column.';

  test('a reporting chart rule on the chart\'s own column names, its default included', () => {
    expect(explainPolicy('AuthzOrgHierarchy', CHART)).toBe(`${CHART_WORDS} ${unsupported('entity_id', 'entity_field')}`);
    expect(explainPolicy('AuthzOrgHierarchy', { ...CHART, anchor_field: 'depth', entity_field: 'org_id' })).toContain(unsupported('depth', 'anchor_field'));
  });

  const LIST = { owned_table_id: 'g1', owned_table_key: 'member_ids', owned_table_ref_key: 'id', this_object_key: 'entity_id' };
  const LIST_WORDS = 'People whose id is listed in the member_ids column of the related row whose id column matches the row\'s entity_id column. The related table is the one with id g1.';
  const UNKNOWN = 'These words cannot tell whether the related table also has a column named "entity_id", which this rule does not support; if it has one, the rule may not check what they say.';

  test.each([
    ['its columns are not known', undefined, ` ${UNKNOWN}`],
    ['it has a column of that name too', { g1: ['id', 'member_ids', 'entity_id'] }, ` ${unsupported('entity_id', 'this_object_key')}`],
    ['it has no column of that name', { g1: ['id', 'member_ids'] }, ''],
  ])('a related member list whose related table %s', (_case, related, hedge) => {
    expect(explainPolicy('AuthzRelatedMemberList', LIST, related)).toBe(`${LIST_WORDS}${hedge}`);
  });

  test('a nested rule hedges in its own sentence, with the related columns the reader read', () => {
    const nested = { OR: [{ AuthzOrgHierarchy: CHART }, { AuthzRelatedMemberList: LIST }] };
    expect(explainPolicy('AuthzComposite', nested, { g1: ['id', 'member_ids'] })).toBe(
      `Combines other rules. At least one of these must pass: (1) ${CHART_WORDS} ${unsupported('entity_id', 'entity_field')} (2) ${LIST_WORDS}`,
    );
  });
});
