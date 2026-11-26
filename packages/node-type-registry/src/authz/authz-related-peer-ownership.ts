import type { NodeTypeDefinition } from '../types';
import { MASK_COLUMN, MEMBER_CHECKS, MEMBER_LIST, OBJ_FIELD_GIVEN, OBJ_TABLE_GIVEN, TEAM_KIND, TEAM_KIND_GIVEN } from './parameters';
import { ACTIVE_MEMBER_RISK, OTHER_TABLE_RISK } from './plain-words';

export const AuthzRelatedPeerOwnership: NodeTypeDefinition = {
  name: 'AuthzRelatedPeerOwnership',
  slug: 'authz_related_peer_ownership',
  category: 'authz',
  display_name: 'Related Peer Ownership',
  description: 'Peer visibility through shared entity membership via a related table. Like AuthzPeerOwnership but the owning user is resolved through a FK JOIN to a related table. Combines SPRT self-join with object table JOIN.',
  parameter_schema: {
    type: 'object',
    properties: {
      entity_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column name on protected table referencing the related table (e.g., message_id)'
      },
      ...TEAM_KIND,
      obj_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID of the related table (alternative to obj_schema/obj_table)'
      },
      obj_schema: {
        type: 'string',
        description: 'Schema of the related table (or use obj_table_id)'
      },
      obj_table: {
        type: 'string',
        description: 'Name of the related table (or use obj_table_id)'
      },
      obj_field_id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID of field on related table containing the owner user ID (alternative to obj_field)'
      },
      obj_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'foreign',
        description: 'Field name on related table containing the owner user ID (e.g., sender_id)'
      },
      obj_ref_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'foreign',
        description: 'Field on related table to select for matching entity_field',
        default: 'id'
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
        description: 'If true, require is_admin flag on current user membership'
      },
      is_owner: {
        type: 'boolean',
        description: 'If true, require is_owner flag on current user membership'
      },
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
    'peer',
    'authz'
  ],
  summary: 'Anyone who shares a team with the person who owns a related row gets access.',
  use_when: [
    'Reactions or replies that the co-members of the message author may see.'
  ],
  avoid_when: [
    'Rows that belong to one team: use AuthzRelatedEntityMembership.'
  ],
  risks: [
    'Sharing any one team of that kind with the owner is enough, even a team that has nothing to do with the row.',
    ACTIVE_MEMBER_RISK,
    OTHER_TABLE_RISK
  ]
};
