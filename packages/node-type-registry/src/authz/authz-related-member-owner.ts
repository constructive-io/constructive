import type { NodeTypeDefinition } from '../types';

export const AuthzRelatedMemberOwner: NodeTypeDefinition = {
  name: 'AuthzRelatedMemberOwner',
  slug: 'authz_related_member_owner',
  category: 'authz',
  display_name: 'Related Member Owner',
  description: 'Compound policy: the row must be owned by the current user (owner_field = current_user_id) AND the row must belong to a related entity the current user is a member of (SPRT joined through the related table, as in AuthzRelatedEntityMembership). Related-entity analog of AuthzMemberOwner — authorship never survives losing membership.',
  parameter_schema: {
    type: 'object',
    properties: {
      owner_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name containing the owner user ID (e.g., actor_id)',
        default: 'owner_id'
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
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
      membership_type: {
        type: 'integer',
        description: 'Scope: 1=app, 2=org, 3+=dynamic entity types'
      },
      entity_type: {
        type: 'string',
        description: "Entity type prefix (e.g. 'channel', 'department'). Resolved to membership_type integer via memberships_module lookup."
      },
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
      }
    },
    required: ['owner_field', 'entity_field']
  },
  tags: ['ownership', 'membership', 'authz']
};
