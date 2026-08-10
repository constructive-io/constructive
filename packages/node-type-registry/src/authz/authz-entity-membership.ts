import type { NodeTypeDefinition } from '../types';

export const AuthzEntityMembership: NodeTypeDefinition = {
  name: 'AuthzEntityMembership',
  slug: 'authz_entity_membership',
  category: 'authz',
  display_name: 'Entity Membership',
  description: 'Membership check scoped by a field on the row through the SPRT table. Verifies user has membership in the entity referenced by the row.',
  parameter_schema: {
    type: 'object',
    properties: {
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name referencing the entity (e.g., entity_id, org_id)'
      },
      sel_field: {
        type: 'string',
        description: 'SPRT column to select for the entity match',
        default: 'entity_id'
      },
      membership_type: {
        type: ['integer', 'string'],
        description: 'Scope: 1=app, 2=org, 3+=dynamic entity types (or string name resolved via membership_types_module)'
      },
      entity_type: {
        type: 'string',
        description: "Entity type prefix (e.g. 'channel', 'department'). Resolved to membership_type integer via memberships_module lookup. Use instead of membership_type for readability."
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
      mask_column: {
        type: 'string',
        format: 'column-ref',
        description:
          'Per-row required permissions (DataCapabilities): a bit(n) column on this table whose bits the actor must hold, checked as sprt.capabilities & row.mask = row.mask. Narrows access row by row without joining a grant table; a zero mask requires nothing. Composes with capability/capabilities — both are ANDed.',
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
