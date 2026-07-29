import type { NodeTypeDefinition } from '../types';

export const AuthzAppMemberOwner: NodeTypeDefinition = {
  name: 'AuthzAppMemberOwner',
  slug: 'authz_app_member_owner',
  category: 'authz',
  display_name: 'App Member Owner',
  description: 'Compound policy: the row must be owned by the current user (owner_field = current_user_id) AND the current user must hold an app membership (hardcoded membership_type=1). App-level analog of AuthzMemberOwner for global scopes with no entity key — authorship never survives losing app membership.',
  parameter_schema: {
    type: 'object',
    properties: {
      owner_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name containing the owner user ID (e.g., actor_id)',
        default: 'owner_id'
      },
      permission: {
        type: 'string',
        description: 'Single permission name to check (resolved to bitstring mask)'
      },
      permissions: {
        type: 'array',
        items: { type: 'string' },
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
    required: ['owner_field']
  },
  tags: ['ownership', 'membership', 'authz']
};
