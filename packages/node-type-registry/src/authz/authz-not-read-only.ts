import type { NodeTypeDefinition } from '../types';

export const AuthzNotReadOnly: NodeTypeDefinition = {
  name: 'AuthzNotReadOnly',
  slug: 'authz_not_read_only',
  category: 'authz',
  display_name: 'Not Read-Only',
  description: 'Restrictive policy that blocks read-only members from mutations. Checks actor_id + is_read_only IS NOT TRUE on the SPRT. Designed to run as a restrictive counterpart after a permissive AuthzEntityMembership policy has already verified membership.',
  parameter_schema: {
    type: 'object',
    properties: {
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name referencing the entity (e.g., entity_id, org_id)'
      },
      membership_type: {
        type: [
          'integer',
          'string'
        ],
        description: 'Scope: 2=org, 3+=dynamic entity types. Must be >= 2 (entity-scoped).'
      }
    },
    required: [
      'entity_field'
    ]
  },
  tags: [
    'membership',
    'authz',
    'restrictive'
  ]
};
