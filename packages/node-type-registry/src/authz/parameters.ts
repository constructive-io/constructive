// Parameter schema parts several Authz nodes share. Not exported from ./index: allNodeTypes is built from
// Object.values of that module.

import type { JSONSchema } from '../types';

/**
 * The keys one level of an Authz expression may hold: the combinators, and each node the policy builder builds inside
 * an expression. AuthzComposite, AuthzColumnSecurity and AuthzNotReadOnly are not built there.
 */
export const EXPRESSION_KEYS = [
  'AND',
  'OR',
  'NOT',
  'AuthzAllowAll',
  'AuthzAppMemberOwner',
  'AuthzAppMembership',
  'AuthzDatabaseClaim',
  'AuthzDenyAll',
  'AuthzDirectOwner',
  'AuthzDirectOwnerAny',
  'AuthzEntityMembership',
  'AuthzFilePath',
  'AuthzHumanOnly',
  'AuthzMemberList',
  'AuthzMemberOwner',
  'AuthzOrgHierarchy',
  'AuthzPeerOwnership',
  'AuthzPublishable',
  'AuthzRelatedEntityMembership',
  'AuthzRelatedMemberList',
  'AuthzRelatedMemberOwner',
  'AuthzRelatedPeerOwnership',
  'AuthzSystemOnly',
  'AuthzTemporal',
  'AuthzValueAllowed',
  'AuthzValueExists',
  'AuthzValueMatch'
];

/**
 * One Authz expression: `{ "<AuthzNode>": { ...its data } }`, `{ "AND": [...] }`, `{ "OR": [...] }` or
 * `{ "NOT": {...} }`. `format: 'authz-expression'` marks it, so a validator can check the value against the named
 * node's own parameter_schema.
 */
export const AUTHZ_EXPRESSION: JSONSchema = {
  type: 'object',
  format: 'authz-expression',
  description: 'One Authz node as {"AuthzEntityMembership": {...}}, or AND or OR with a list of expressions, or NOT with one expression.',
  minProperties: 1,
  maxProperties: 1,
  propertyNames: { enum: EXPRESSION_KEYS },
  additionalProperties: { type: ['object', 'array'] }
};

/**
 * The team kind, as a number or by its entity type prefix, or the member list by name: a rule gives at least one. With
 * both team kinds the entity type wins; with a team kind the backend resolves the member list and replaces a given one.
 */
export const TEAM_KIND_GIVEN: JSONSchema = {
  anyOf: [{ required: ['membership_type'] }, { required: ['entity_type'] }, { required: ['sprt_schema', 'sprt_table'] }]
};

/** The team kind of a team rule, as a number or by its entity type prefix. The app is not a team: its member list names none. */
export const TEAM_KIND: Record<string, JSONSchema> = {
  membership_type: {
    type: 'integer',
    minimum: 2,
    maximum: 2147483647,
    description: 'The team kind: 2=org, 3+=dynamic entity types.'
  },
  entity_type: {
    type: 'string',
    minLength: 1,
    not: { const: 'app' },
    description: "Entity type prefix (e.g. 'org', 'channel', 'department'), resolved to its membership_type; use it instead of membership_type for readability."
  }
};

/** The member list a team rule reads, by name: used as given when the rule gives no team kind. */
export const MEMBER_LIST: Record<string, JSONSchema> = {
  sprt_schema: {
    type: 'string',
    description: 'The schema of the member list the policy reads. With a team kind the backend resolves it and replaces this value.'
  },
  sprt_table: {
    type: 'string',
    description: 'The member list the policy reads. With a team kind the backend resolves it and replaces this value.'
  }
};

/** The app's member list, which the backend always resolves: a rule a caller writes does not give it. */
export const APP_MEMBER_LIST: Record<string, JSONSchema> = {
  sprt_schema: { type: 'string', readOnly: true, description: 'The schema of the app\'s member list, which the backend resolves.' },
  sprt_table: { type: 'string', readOnly: true, description: 'The app\'s member list, which the backend resolves.' }
};

/** The member checks every membership policy reads beside the member list. */
export const MEMBER_CHECKS: Record<string, JSONSchema> = {
  mask: {
    type: 'string',
    pattern: '^[01]+$',
    description: 'Capability bits a member must hold, as a bit string. Capabilities or levels, when given, replace it.'
  },
  bitlen: {
    type: 'integer',
    description: 'The width the mask is padded to; by default the length of the mask.'
  }
};

/**
 * Per-row required capabilities, a bit(n) column the member's capabilities must cover.
 * No `column-ref` format on purpose: the backend clones companion tables from the column refs it finds in this
 * schema, and on these nodes it does not treat the mask column as one yet; marking it would change what it builds.
 */
export const MASK_COLUMN: JSONSchema = {
  type: 'string',
  description:
    'Per-row required permissions (DataCapabilities): a bit(n) column on this table whose bits the actor must hold, checked as sprt.capabilities & row.mask = row.mask. A zero mask requires nothing.'
};

/** The constant values a value rule allows: each keeps its JSON type, so true is compared as a boolean and 5 as a number. */
export const ALLOWED_VALUES: JSONSchema = {
  type: 'array',
  items: { type: ['string', 'boolean', 'number', 'null'] },
  description: 'Constant list of allowed values. Element JSON type is preserved: booleans/numbers emit typed constants (e.g. [true] -> TRUE, [5] -> 5), strings emit text literals.'
};

/** Conditions a value rule adds: a list of condition objects (all must hold), or one condition object. */
export const CONDITIONS: JSONSchema = {
  type: ['array', 'object'],
  items: { type: 'object' }
};

/** One of the related row's team column, by name or by id. */
export const OBJ_FIELD_GIVEN: JSONSchema = { anyOf: [{ required: ['obj_field'] }, { required: ['obj_field_id'] }] };

/** The related table, by id or by schema and name. */
export const OBJ_TABLE_GIVEN: JSONSchema = { anyOf: [{ required: ['obj_table_id'] }, { required: ['obj_schema', 'obj_table'] }] };

/** sel_obj on the related-row nodes. */
export const SEL_OBJ: JSONSchema = {
  type: 'boolean',
  description: 'Select sel_field from the related row instead of the team id; the platform\'s own related policies set it with sel_field "id".'
};
