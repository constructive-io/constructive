import type { NodeTypeDefinition } from '../types';

export const AuthzPeerOwnership: NodeTypeDefinition = {
  name: 'AuthzPeerOwnership',
  slug: 'authz_peer_ownership',
  category: 'authz',
  display_name: 'Peer Ownership',
  description: 'Peer visibility through shared entity membership. Authorizes access to user-owned rows when the owner and current user are both members of the same entity. Self-joins the SPRT table to find peers.',
  parameter_schema: {
    type: 'object',
    properties: {
      owner_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name on protected table referencing the owning user (e.g., owner_id)'
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
      is_admin: {
        type: 'boolean',
        description: 'If true, require is_admin flag on current user membership'
      },
      is_owner: {
        type: 'boolean',
        description: 'If true, require is_owner flag on current user membership'
      }
    },
    required: [
      'owner_field'
    ]
  },
  tags: [
    'membership',
    'peer',
    'authz'
  ]
};
