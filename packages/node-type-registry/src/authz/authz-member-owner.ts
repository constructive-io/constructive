import type { NodeTypeDefinition } from '../types';

export const AuthzMemberOwner: NodeTypeDefinition = {
  name: 'AuthzMemberOwner',
  slug: 'authz_member_owner',
  category: 'authz',
  display_name: 'Member Owner',
  description: 'Compound policy: the row must be owned by the current user (owner_field = current_user_id) AND the current user must be a member of the entity referenced by entity_field. Combines direct ownership with entity membership — the actor can only access rows they own within entities they belong to.',
  parameter_schema: {
    type: 'object',
    properties: {
      owner_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name containing the owner user ID (e.g., owner_id)',
        default: 'owner_id'
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name referencing the entity (e.g., entity_id)',
        default: 'entity_id'
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
        description: "Entity type prefix (e.g. 'channel', 'department'). Resolved to membership_type integer via memberships_module lookup."
      },
      permission: {
        type: 'string',
        description: 'Single permission name to check (resolved to bitstring mask)'
      },
      permissions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Multiple permission names to check (ORed together into mask)'
      }
    },
    required: ['owner_field', 'entity_field']
  },
  tags: ['ownership', 'membership', 'authz']
};
