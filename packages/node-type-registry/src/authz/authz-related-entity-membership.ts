import type { NodeTypeDefinition } from '../types';
import { MASK_COLUMN, MEMBER_CHECKS, MEMBER_LIST, OBJ_FIELD_GIVEN, OBJ_TABLE_GIVEN, SEL_OBJ, TEAM_KIND, TEAM_KIND_GIVEN } from './parameters';
import { ACTIVE_MEMBER_RISK, OTHER_TABLE_RISK } from './plain-words';

export const AuthzRelatedEntityMembership: NodeTypeDefinition = {
  name: 'AuthzRelatedEntityMembership',
  slug: 'authz_related_entity_membership',
  category: 'authz',
  display_name: 'Related Entity Membership',
  description: 'JOIN-based membership verification through related tables. Joins SPRT table with another table to verify membership.',
  parameter_schema: {
    type: 'object',
    properties: {
      entity_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column name on protected table referencing the join table'
      },
      sel_field: {
        type: 'string',
        description: 'SPRT column to select for the entity match',
        default: 'entity_id'
      },
      sprt_join_field: {
        type: 'string',
        description: 'SPRT column to join on with the related table',
        default: 'entity_id'
      },
      ...TEAM_KIND,
      obj_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID of the join table (alternative to obj_schema/obj_table)'
      },
      obj_schema: {
        type: 'string',
        description: 'Schema of the join table (or use obj_table_id)'
      },
      obj_table: {
        type: 'string',
        description: 'Name of the join table (or use obj_table_id)'
      },
      obj_field_id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID of field on join table (alternative to obj_field)'
      },
      obj_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'foreign',
        description: 'Field name on join table to match against SPRT entity_id'
      },
      levels: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Achievement level names to require (kind=level catalog rows, merged into the same mask)',
      },
      capabilities: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Capability names of any kind (capability, level, ...) merged into the same mask',
      },
      is_admin: {
        type: 'boolean',
        description: 'If true, require is_admin flag'
      },
      is_owner: {
        type: 'boolean',
        description: 'If true, require is_owner flag'
      },
      sel_obj: SEL_OBJ,
      mask_column: MASK_COLUMN,
      ...MEMBER_LIST,
      ...MEMBER_CHECKS
    },
    required: [
      'entity_field'
    ],
    allOf: [TEAM_KIND_GIVEN, OBJ_FIELD_GIVEN, OBJ_TABLE_GIVEN],
    additionalProperties: false
  },
  tags: [
    'membership',
    'authz'
  ],
  summary: 'Members of the team that owns a related row get access; the row reaches that team through another table.',
  use_when: [
    'Rows keyed by database_id, where the database belongs to an organization.'
  ],
  avoid_when: [
    'Rows that name their team directly: use AuthzEntityMembership.'
  ],
  risks: [
    'To compare the row\'s column with the related row\'s id rather than the team id, set sel_obj to true and sel_field to id.',
    ACTIVE_MEMBER_RISK,
    OTHER_TABLE_RISK
  ]
};
