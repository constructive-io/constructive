// One plain sentence for one stored rule: the node's template filled from the rule's data (registry defaults apply),
// each clause whose key has a value, one sentence for each key the words do not describe, and one for each shape the
// backend may build into another check than the words say. A nested Authz node or AND/OR/NOT part is explained in turn,
// and a part no Authz node describes is said by where it sits.

import { APP_MEMBERSHIP_TYPE, AUTHZ_NODES, defaultsOf, derivedKeys, effectivePolicy, isObject } from './policies';
import { READ_BUT_NOT_SUPPORTED, type TableRef, unsupportedShapes } from './rule-check';

/** The columns of other tables a reader read, by table id and by table name. */
export type RelatedColumns = Record<string, readonly string[]>;

/** The lookup a rule check and the words read another table's columns with. */
export const columnsOf = (related: RelatedColumns | undefined) => (table: TableRef): readonly string[] | undefined =>
  related?.[String(table.id)] ?? related?.[String(table.name)];

/** How to say one rule of an Authz node. `{param}` takes the rule's value for that parameter (registry defaults apply). */
export interface PolicyWordsTemplate {
  /** One sentence naming who passes. */
  text: string;
  /**
   * Added when the data has a value for `when` (not false, null, an empty string or an empty list) and none for any
   * `unless` key; `covers` names other keys the clause also describes.
   */
  clauses?: { when: string; unless?: string[]; covers?: string[]; text: string }[];
  /** Words for a parameter's value where `{param}` appears; `*` covers any other value, and `{value}` is the value. */
  values?: Record<string, Record<string, string>>;
  /** The value the backend gives a parameter when the data gives none. */
  assumes?: Record<string, unknown>;
}

// A given entity_type replaces any membership_type beside it.
const ENTITY_TYPE_CLAUSE = { when: 'entity_type', covers: ['membership_type'], text: 'The team is of the {entity_type} kind.' };
const MEMBERSHIP_TYPE_CLAUSE = { when: 'membership_type', unless: ['entity_type'], text: 'The team is {membership_type}.' };

const MEMBERSHIP_TYPE_WORDS = {
  membership_type: {
    2: 'an organization (each person also has one of their own)',
    '*': 'a custom kind of group (number {value})'
  }
};

// The member list an app rule reads: the app's own unless the stored rule names another.
const APP_MEMBER_LIST = {
  values: {
    membership_type: {
      [APP_MEMBERSHIP_TYPE]: 'the app',
      2: 'any organization (each person also has one of their own)',
      '*': 'any group of a custom kind (number {value})'
    }
  },
  assumes: { membership_type: APP_MEMBERSHIP_TYPE }
};

const CAPABILITIES_CLAUSE = {
  when: 'capabilities',
  text:
    'The member must also hold these capabilities: {capabilities}. Owners and admins hold every capability, ' +
    'and without a capabilities module for this membership only admins pass.'
};

const LEVELS_CLAUSE = {
  when: 'levels',
  text:
    'The member must also hold these trust levels: {levels}. Owners and admins hold every level, ' +
    'and without a capabilities module for this membership only admins pass.'
};

// The builder ORs the two flags, and an owner always carries the admin flag, so both together mean "admins".
const IS_ADMIN_CLAUSE = { when: 'is_admin', covers: ['is_owner'], text: 'Only admins pass; owners are admins too.' };
const IS_OWNER_CLAUSE = { when: 'is_owner', unless: ['is_admin'], text: 'Only owners pass.' };

const OBJ_TABLE_CLAUSE = { when: 'obj_table', covers: ['obj_table_id'], text: 'The related row is in the {obj_table} table.' };
const OBJ_TABLE_ID_CLAUSE = { when: 'obj_table_id', unless: ['obj_table'], text: 'The related table is the one with id {obj_table_id}.' };
const OBJ_SCHEMA_CLAUSE = { when: 'obj_schema', text: 'The related table is in the {obj_schema} schema.' };

const MASK_COLUMN_CLAUSE = {
  when: 'mask_column',
  text: 'The member must also hold every capability the row lists in its {mask_column} column; owners and admins hold them all, and a row that lists none needs nothing more.'
};

// The member list a rule names itself, read as given when the rule names no team kind.
const MEMBER_LIST_CLAUSE = { when: 'sprt_table', unless: ['membership_type', 'entity_type'], covers: ['sprt_schema'], text: 'The members are read from the table {sprt_table}.' };

// A capability list is stored as a bit mask, which cannot be read back into names without the database's capability table.
const MASK_CLAUSE = {
  when: 'mask',
  text: 'The member must also hold the capabilities in a stored capability mask; owners and admins hold them all, and these words cannot name them.'
};

// The platform's own related policies select the related row (sel_obj, sel_field id); without sel_obj the team id is
// selected from the member list.
const SEL_OBJ_CLAUSE = { when: 'sel_obj', covers: ['sel_field'], text: 'The row\'s {entity_field} column holds the related row\'s {sel_field}.' };
const NO_SEL_OBJ_CLAUSE = {
  when: 'entity_field',
  unless: ['sel_obj'],
  text: 'Without sel_obj, the backend compares the row\'s {entity_field} column with the team id itself, not with a related row.'
};

export const POLICY_WORDS: Record<string, PolicyWordsTemplate> = {
  AuthzAllowAll: { text: 'Anyone who can use the table, for every row.' },
  AuthzAppMemberOwner: {
    text: 'The person whose id is in the row\'s {owner_field} column, while they are an active member of {membership_type}.',
    clauses: [CAPABILITIES_CLAUSE, LEVELS_CLAUSE, MASK_COLUMN_CLAUSE, MASK_CLAUSE, IS_ADMIN_CLAUSE, IS_OWNER_CLAUSE],
    ...APP_MEMBER_LIST
  },
  AuthzAppMembership: {
    text: 'Any active member of {membership_type}, for every row.',
    clauses: [CAPABILITIES_CLAUSE, LEVELS_CLAUSE, MASK_COLUMN_CLAUSE, MASK_CLAUSE, IS_ADMIN_CLAUSE, IS_OWNER_CLAUSE],
    ...APP_MEMBER_LIST
  },
  AuthzColumnSecurity: {
    text: 'Limits who may write {columns}, and never gives access to a row: a write that matches the {rule} pattern fails unless the writer passes the attached rule.',
    clauses: [
      { when: 'authz', text: 'The attached rule: {authz}' },
      { when: 'allow_system', text: 'Work the system runs itself always passes.' },
      { when: 'values', text: 'Protected values: {values}.' },
      { when: 'allowed', text: 'Allowed changes: {allowed}.' },
      { when: 'error_code', text: 'A refused write reports the code {error_code}.' },
      { when: 'error_message', text: 'A refused write shows the message "{error_message}".' }
    ]
  },
  AuthzComposite: {
    text: 'Combines other rules.',
    clauses: [
      { when: 'BoolExpr', text: '{BoolExpr.boolop} {BoolExpr.args}' },
      { when: 'OR', unless: ['BoolExpr'], text: 'At least one of these must pass: {OR}' },
      { when: 'AND', unless: ['BoolExpr', 'OR'], text: 'All of these must pass: {AND}' },
      { when: 'NOT', unless: ['BoolExpr', 'OR', 'AND'], text: 'This must not pass: {NOT}' }
    ],
    values: {
      'BoolExpr.boolop': {
        AND_EXPR: 'All of these must pass:',
        OR_EXPR: 'At least one of these must pass:',
        NOT_EXPR: 'This must not pass:',
        '*': 'These parts combine in a way these words do not describe ({value}), so the access may be wider or narrower:'
      }
    }
  },
  AuthzDatabaseClaim: {
    text: 'Connections the platform has bound to one database; no person or team is checked.',
    clauses: [
      { when: 'schema_id', text: 'The database is the one that owns the schema with id {schema_id}, so such a connection passes for every row.' },
      { when: 'entity_field', unless: ['schema_id'], text: 'The database is the one named in the row\'s {entity_field} column.' },
      { when: 'lane_attested', text: 'Only connections the platform attests for that database pass.' }
    ]
  },
  AuthzDenyAll: { text: 'Nobody.' },
  AuthzDirectOwner: { text: 'The person whose id is in the row\'s {entity_field} column.' },
  AuthzDirectOwnerAny: { text: 'Anyone whose id is in one of the row\'s columns {entity_fields}.' },
  AuthzEntityMembership: {
    text: 'Members of the team named in the row\'s {entity_field} column.',
    clauses: [
      ENTITY_TYPE_CLAUSE,
      MEMBERSHIP_TYPE_CLAUSE,
      CAPABILITIES_CLAUSE,
      LEVELS_CLAUSE,
      MASK_COLUMN_CLAUSE,
      MASK_CLAUSE,
      IS_ADMIN_CLAUSE,
      IS_OWNER_CLAUSE,
      MEMBER_LIST_CLAUSE,
      {
        when: 'check_function_name',
        covers: ['check_function_schema'],
        text: 'The function {check_function_name} decides membership instead of the member list, given the row\'s {entity_field} column.'
      }
    ],
    values: MEMBERSHIP_TYPE_WORDS
  },
  AuthzFilePath: {
    text: 'People who hold a share of the file or one of its folders, when the share has {capability_field} set and has not expired, even people outside the team.',
    clauses: [
      {
        when: 'shares_table',
        covers: ['shares_table_id'],
        text: 'Shares are read from the {shares_table} table.'
      },
      {
        when: 'shares_table_id',
        unless: ['shares_table'],
        text: 'The shares table is the one with id {shares_table_id}.'
      },
      { when: 'shares_schema', text: 'The shares table is in the {shares_schema} schema.' },
      {
        when: 'files_table',
        covers: ['files_table_id'],
        text: 'The files are in the {files_table} table.'
      },
      {
        when: 'files_table_id',
        unless: ['files_table'],
        text: 'The files table is the one with id {files_table_id}.'
      },
      { when: 'files_schema', text: 'The files table is in the {files_schema} schema.' }
    ]
  },
  AuthzHumanOnly: {
    text: 'Only a person signed in as themselves, with a session or their own API key; an agent key with its own identity does not pass.'
  },
  AuthzMemberList: { text: 'People whose id is listed in the row\'s {array_field} column.' },
  AuthzMemberOwner: {
    text: 'The person whose id is in the row\'s {owner_field} column, while they are a member of the team named in its {entity_field} column.',
    clauses: [ENTITY_TYPE_CLAUSE, MEMBERSHIP_TYPE_CLAUSE, CAPABILITIES_CLAUSE, LEVELS_CLAUSE, MASK_COLUMN_CLAUSE, MASK_CLAUSE, IS_ADMIN_CLAUSE, IS_OWNER_CLAUSE, MEMBER_LIST_CLAUSE],
    values: MEMBERSHIP_TYPE_WORDS
  },
  AuthzNotReadOnly: {
    text: 'Only members of the team named in the row\'s {entity_field} column who are not read-only; meant as a limit on top of the policy that grants access.',
    clauses: [ENTITY_TYPE_CLAUSE, MEMBERSHIP_TYPE_CLAUSE, MEMBER_LIST_CLAUSE],
    values: MEMBERSHIP_TYPE_WORDS
  },
  AuthzOrgHierarchy: {
    text: 'In the reporting chart of the organization named in the row\'s {entity_field} column: {direction} the person in its {anchor_field} column.',
    clauses: [{ when: 'max_depth', text: 'Only people up to {max_depth} levels apart count.' }],
    values: { direction: { down: 'the managers above', up: 'the people below' } }
  },
  AuthzPeerOwnership: {
    text: 'Anyone who shares a team with the person whose id is in the row\'s {owner_field} column, including that person when they belong to a team.',
    clauses: [
      ENTITY_TYPE_CLAUSE,
      MEMBERSHIP_TYPE_CLAUSE,
      CAPABILITIES_CLAUSE,
      LEVELS_CLAUSE,
      MASK_COLUMN_CLAUSE,
      MASK_CLAUSE,
      IS_ADMIN_CLAUSE,
      IS_OWNER_CLAUSE,
      MEMBER_LIST_CLAUSE
    ],
    values: MEMBERSHIP_TYPE_WORDS
  },
  AuthzPublishable: {
    text: 'Anyone who can use the table, for rows whose {is_published_field} column is true.',
    clauses: [
      {
        when: 'require_published_at',
        text: 'The time in the {published_at_field} column must also be set and not in the future.'
      }
    ]
  },
  AuthzRelatedEntityMembership: {
    text: 'Members of the team that owns the related row the row\'s {entity_field} column points to.',
    clauses: [
      OBJ_TABLE_CLAUSE,
      OBJ_TABLE_ID_CLAUSE,
      OBJ_SCHEMA_CLAUSE,
      {
        when: 'obj_field',
        covers: ['obj_field_id'],
        text: 'The team that owns it is in its {obj_field} column.'
      },
      {
        when: 'obj_field_id',
        unless: ['obj_field'],
        text: 'The team that owns it is in the column with id {obj_field_id}.'
      },
      SEL_OBJ_CLAUSE,
      NO_SEL_OBJ_CLAUSE,
      ENTITY_TYPE_CLAUSE,
      MEMBERSHIP_TYPE_CLAUSE,
      CAPABILITIES_CLAUSE,
      LEVELS_CLAUSE,
      MASK_COLUMN_CLAUSE,
      MASK_CLAUSE,
      IS_ADMIN_CLAUSE,
      IS_OWNER_CLAUSE,
      MEMBER_LIST_CLAUSE
    ],
    values: MEMBERSHIP_TYPE_WORDS
  },
  AuthzRelatedMemberList: {
    text: 'People whose id is listed in the {owned_table_key} column of the related row whose {owned_table_ref_key} column matches the row\'s {this_object_key} column.',
    clauses: [
      {
        when: 'owned_table',
        covers: ['owned_table_id'],
        text: 'The related row is in the {owned_table} table.'
      },
      {
        when: 'owned_table_id',
        unless: ['owned_table'],
        text: 'The related table is the one with id {owned_table_id}.'
      },
      { when: 'owned_schema', text: 'The related table is in the {owned_schema} schema.' }
    ]
  },
  AuthzRelatedMemberOwner: {
    text: 'The person whose id is in the row\'s {owner_field} column, while they are a member of the team that owns the related row its {entity_field} column points to.',
    clauses: [
      OBJ_TABLE_CLAUSE,
      OBJ_TABLE_ID_CLAUSE,
      OBJ_SCHEMA_CLAUSE,
      {
        when: 'obj_field',
        covers: ['obj_field_id'],
        text: 'The team that owns it is in its {obj_field} column.'
      },
      {
        when: 'obj_field_id',
        unless: ['obj_field'],
        text: 'The team that owns it is in the column with id {obj_field_id}.'
      },
      SEL_OBJ_CLAUSE,
      NO_SEL_OBJ_CLAUSE,
      ENTITY_TYPE_CLAUSE,
      MEMBERSHIP_TYPE_CLAUSE,
      CAPABILITIES_CLAUSE,
      LEVELS_CLAUSE,
      MASK_COLUMN_CLAUSE,
      MASK_CLAUSE,
      IS_ADMIN_CLAUSE,
      IS_OWNER_CLAUSE,
      MEMBER_LIST_CLAUSE
    ],
    values: MEMBERSHIP_TYPE_WORDS
  },
  AuthzRelatedPeerOwnership: {
    text: 'Anyone who shares a team with the owner of the related row the row\'s {entity_field} column points to.',
    clauses: [
      OBJ_TABLE_CLAUSE,
      OBJ_TABLE_ID_CLAUSE,
      OBJ_SCHEMA_CLAUSE,
      { when: 'obj_field', covers: ['obj_field_id'], text: 'Its owner is in its {obj_field} column.' },
      {
        when: 'obj_field_id',
        unless: ['obj_field'],
        text: 'Its owner is in the column with id {obj_field_id}.'
      },
      ENTITY_TYPE_CLAUSE,
      MEMBERSHIP_TYPE_CLAUSE,
      CAPABILITIES_CLAUSE,
      LEVELS_CLAUSE,
      MASK_COLUMN_CLAUSE,
      MASK_CLAUSE,
      IS_ADMIN_CLAUSE,
      IS_OWNER_CLAUSE,
      MEMBER_LIST_CLAUSE
    ],
    values: MEMBERSHIP_TYPE_WORDS
  },
  AuthzSystemOnly: {
    text: 'Only work the system runs itself, such as triggers and background jobs; normal requests never pass.'
  },
  AuthzTemporal: {
    text: 'Anyone who can use the table, while the row is inside its time window.',
    clauses: [
      {
        when: 'valid_from_field',
        text: 'The window opens {valid_from_inclusive} the time in the {valid_from_field} column.'
      },
      {
        when: 'valid_until_field',
        text: 'It closes {valid_until_inclusive} the time in the {valid_until_field} column, and an empty value never closes it.'
      }
    ],
    values: {
      valid_from_inclusive: { true: 'at', false: 'just after' },
      valid_until_inclusive: { true: 'just after', false: 'at' }
    }
  },
  AuthzValueAllowed: {
    text: 'Anyone who can use the table, for rows whose {column} column matches {allowed} (test: {operator}).'
  },
  AuthzValueExists: {
    text: 'Anyone who can use the table, for rows that have a matching row in another table, counting only the rows of that table the person can see.',
    clauses: [
      { when: 'ref_table', covers: ['ref_table_id'], text: 'The other table is {ref_table}.' },
      {
        when: 'ref_table_id',
        unless: ['ref_table'],
        text: 'The other table is the one with id {ref_table_id}.'
      },
      { when: 'ref_module', text: 'The other table is one that an installed module made.' },
      { when: 'ref_schema', text: 'It is in the {ref_schema} schema.' },
      {
        when: 'join',
        text: 'The rows match on the listed column pairs, each compared with its own test (equal unless it says otherwise).'
      },
      { when: 'conditions', text: 'The matching row must also meet the listed conditions.' },
      { when: 'exists', text: 'A further matching row must also exist in a third table, by its own join and conditions.' },
      {
        when: 'conditions_ast',
        text: 'The matching row must also meet stored conditions; these words do not spell them out, so the access may be narrower.'
      }
    ]
  },
  AuthzValueMatch: {
    text: 'Anyone who can use the table, for rows that have a matching row in another table, counting only the rows of that table the person can see.',
    clauses: [
      { when: 'ref_table', covers: ['ref_table_id'], text: 'The other table is {ref_table}.' },
      {
        when: 'ref_table_id',
        unless: ['ref_table'],
        text: 'The other table is the one with id {ref_table_id}.'
      },
      { when: 'ref_module', text: 'The other table is one that an installed module made.' },
      { when: 'ref_schema', text: 'It is in the {ref_schema} schema.' },
      {
        when: 'match',
        text: 'The other row\'s {match.ref_column} column must match {match.allowed} (test: {match.operator}).'
      },
      {
        when: 'join',
        text: 'The rows match on the listed column pairs, each compared with its own test (equal unless it says otherwise).'
      },
      { when: 'conditions', text: 'The matching row must also meet the listed conditions.' },
      { when: 'exists', text: 'A further matching row must also exist in a third table, by its own join and conditions.' },
      {
        when: 'conditions_ast',
        text: 'The matching row must also meet stored conditions; these words do not spell them out, so the access may be narrower.'
      },
      {
        when: 'outer_conditions_ast',
        text: 'The row itself must also meet stored conditions; these words do not spell them out, so the access may be narrower.'
      }
    ]
  }
};

// Where a part sits in a composite: under OR it can only add people, under AND only take them away, and under NOT
// (or where the words cannot tell) either.
type Position = { within: 'or' | 'and' | 'either'; negated: boolean };

function partNotDescribed({ within, negated }: Position): string {
  const effect = negated || within === 'either' ? 'wider or narrower' : within === 'or' ? 'wider' : 'narrower';
  return `A part that these words do not describe, so the access may be ${effect}.`;
}

const BOOL_OPS: Record<string, Position['within']> = { OR_EXPR: 'or', AND_EXPR: 'and' };
const COMBINATORS = new Set(['AND', 'OR', 'NOT', 'BoolExpr']);

function lookup(values: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], values);
}

// The position of the parts a composite parameter holds.
function positionOf(param: string, values: Record<string, unknown>, negated: boolean): Position {
  if (param === 'OR') return { within: 'or', negated };
  if (param === 'AND') return { within: 'and', negated };
  if (param === 'NOT') return { within: 'either', negated: true };
  if (param === 'BoolExpr.args') {
    const op = String(lookup(values, 'BoolExpr.boolop'));
    return op === 'NOT_EXPR' ? { within: 'either', negated: true } : { within: BOOL_OPS[op] ?? 'either', negated };
  }
  return { within: 'either', negated };
}

const notDescribed = (key: string): string => `The setting "${key}" is set, and these words do not describe it, so the access may be wider or narrower.`;
const notRead = (key: string): string => `The setting "${key}" is stored, and this rule does not read it.`;

// Where the backend may build one node (not its nested parts) into another check than its words: a shape the rule check
// does not support, and a related member list whose related table's columns are not known, so it cannot be ruled out.
function unstatedShapes(type: string, data: Record<string, unknown>, related: RelatedColumns | undefined): string[] {
  const columns = columnsOf(related);
  const values = { ...defaultsOf(type), ...data };
  const shapes = unsupportedShapes(type, data, { inBlueprint: true, columnsOf: columns }).map(
    ({ path }) => `This rule does not support the column name "${String(lookup(values, path))}" in "${path}" here, so it may not check what these words say.`
  );
  if (type === 'AuthzRelatedMemberList' && columns({ id: values.owned_table_id as string, name: values.owned_table as string }) === undefined) {
    shapes.push(
      `These words cannot tell whether the related table also has a column named "${String(values.this_object_key)}", which this rule does not support; ` +
        'if it has one, the rule may not check what they say.'
    );
  }
  return shapes;
}

// A key the backend reads from a rule's data: one of its node's parameters, a member key these tools do not support, or
// any part of a composite, whose raw parts the backend builds too.
const readsKey = (type: string, key: string): boolean =>
  type === 'AuthzComposite' || AUTHZ_NODES.get(type)?.parameter_schema.properties?.[key] !== undefined || READ_BUT_NOT_SUPPORTED.includes(key);

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== false && value !== '';
}

function describeValue(value: unknown, position: Position, related: RelatedColumns | undefined): string {
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === 'object' && item !== null)
      ? value.map((item, i) => `(${i + 1}) ${describeValue(item, position, related)}`).join(' ')
      : value.map((item) => describeValue(item, position, related)).join(', ');
  }
  if (isObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && AUTHZ_NODES.has(keys[0]) && isObject(value[keys[0]])) {
      return sentenceOf(keys[0], value[keys[0]] as Record<string, unknown>, position.negated, related);
    }
    if (keys.some((key) => COMBINATORS.has(key))) return sentenceOf('AuthzComposite', value, position.negated, related);
    return partNotDescribed(position);
  }
  return String(value);
}

function describeParam(words: PolicyWordsTemplate, param: string, value: unknown, values: Record<string, unknown>, negated: boolean, related: RelatedColumns | undefined): string {
  const named = words.values?.[param];
  const phrase = named?.[String(value)] ?? named?.['*'];
  const position = positionOf(param, values, negated);
  return phrase === undefined ? describeValue(value, position, related) : phrase.replace('{value}', describeValue(value, position, related));
}

// A key changes the rule when it differs from its default; one with no default changes it only when it has a value
// (`is_admin: false` does not).
function changesPolicy(defaults: Record<string, unknown>, param: string, value: unknown): boolean {
  if (defaults[param] === undefined) return hasValue(value);
  return value !== undefined && value !== null && JSON.stringify(defaults[param]) !== JSON.stringify(value);
}

function templateOf(type: string): PolicyWordsTemplate {
  const words = POLICY_WORDS[type];
  if (!words) {
    throw new Error(
      `explainPolicy: "${type}" is not an Authz node, so it has no plain words. ` +
        'Pass the name of an Authz node, for example "AuthzEntityMembership" (the registry\'s nodes with category "authz").'
    );
  }
  return words;
}

// The sentence of one rule, the keys of its own data the sentence does not describe, and the shapes it hedges.
function wordsOf(type: string, data: Record<string, unknown>, negated: boolean, related: RelatedColumns | undefined): { text: string; undescribed: string[]; unstated: string[] } {
  const effective = effectivePolicy(type, data ?? {});
  const words = templateOf(effective.type);
  const given = effective.data;
  const defaults = defaultsOf(effective.type);
  const values: Record<string, unknown> = { ...defaults, ...words.assumes, ...given };
  const described = derivedKeys(effective.type, given);
  const fill = (template: string): string =>
    template.replace(/\{([A-Za-z_][A-Za-z_.]*)\}/g, (_match, param: string) => {
      const value = lookup(values, param);
      if (value === undefined || value === null) {
        throw new Error(
          `explainPolicy: the ${effective.type} sentence names "${param}", but the rule's data has no value for it. Add "${param}" to the rule's data.`
        );
      }
      described.add(param.split('.')[0]);
      return describeParam(words, param, value, values, negated, related);
    });

  const parts = [fill(words.text)];
  for (const clause of words.clauses ?? []) {
    if (!hasValue(values[clause.when])) {
      described.add(clause.when);
      continue;
    }
    if (clause.unless?.some((key) => hasValue(values[key]))) continue;
    parts.push(fill(clause.text));
    described.add(clause.when);
    for (const key of clause.covers ?? []) described.add(key);
  }
  const left = Object.entries(given).flatMap(([key, value]) => (!described.has(key) && changesPolicy(defaults, key, value) ? [key] : []));
  const undescribed = left.filter((key) => readsKey(effective.type, key));
  const unstated = effective.type === 'AuthzComposite' ? [] : unstatedShapes(effective.type, given, related);
  const notReadKeys = left.filter((key) => !readsKey(effective.type, key));
  return { text: [...parts, ...undescribed.map(notDescribed), ...notReadKeys.map(notRead), ...unstated].join(' '), undescribed, unstated };
}

const sentenceOf = (type: string, data: Record<string, unknown>, negated: boolean, related: RelatedColumns | undefined): string => wordsOf(type, data, negated, related).text;

/**
 * True when the words of one rule's own data (an Authz node; its nested parts are rules of their own) state all it
 * checks: no key they do not describe, no shape they hedge, and data they can read. Otherwise the rule may let in more
 * or fewer people than its words say, and its words say where.
 */
export function statesAll(type: string, data: Record<string, unknown>, related?: RelatedColumns): boolean {
  try {
    const { undescribed, unstated } = wordsOf(type, data, false, related);
    return undescribed.length === 0 && unstated.length === 0;
  } catch {
    return false;
  }
}

/**
 * One rule in plain words: the node's sentence filled from `data` (registry defaults apply), then each clause that
 * applies, then one sentence for every key of `data` that none of those parts describes, and one for each shape the
 * backend may build into another check. A nested Authz node or AND/OR/NOT part inside the data is explained in turn.
 * `related` holds the columns of the other tables the rule names, when the reader read them.
 */
export function explainPolicy(type: string, data: Record<string, unknown>, related?: RelatedColumns): string {
  return sentenceOf(type, data, false, related);
}
