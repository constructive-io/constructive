import type { NodeTypeDefinition } from '../types';

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
        type: [
          'integer',
          'string'
        ],
        description: 'Scope: 1=app, 2=org, 3+=dynamic entity types (or string name resolved via membership_types_module)'
      },
      entity_type: {
        type: 'string',
        description: "Entity type prefix (e.g. 'channel', 'department'). Resolved to membership_type integer via memberships_module lookup. Use instead of membership_type for readability."
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
      permission: {
        type: 'string',
        description: 'Single permission name to check (resolved to bitstring mask)'
      },
      permissions: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Multiple permission names to check (ORed together into mask)'
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
    required: [
      'entity_field'
    ]
  },
  tags: [
    'membership',
    'authz'
  ]
};
