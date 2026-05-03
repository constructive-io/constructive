import type { NodeTypeDefinition } from '../types';

export const DataOwnershipInEntity: NodeTypeDefinition = {
  name: 'DataOwnershipInEntity',
  slug: 'data_ownership_in_entity',
  category: 'data',
  display_name: 'Ownership In Entity',
  description: 'Combines direct ownership with entity scoping. Adds both owner_id and entity_id columns. Enables AuthzDirectOwner, AuthzEntityMembership, and AuthzOrgHierarchy authorization. Particularly useful for OrgHierarchy where a user owns a row (owner_id) within an entity (entity_id), and managers above can see subordinate-owned records via the hierarchy closure table.',
  parameter_schema: {
    type: 'object',
    properties: {
      owner_field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the owner reference',
        default: 'owner_id'
      },
      entity_field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the entity reference',
        default: 'entity_id'
      },
      include_id: {
        type: 'boolean',
        description: 'If true, also adds a UUID primary key column with auto-generation',
        default: true
      },
      include_user_fk: {
        type: 'boolean',
        description: 'If true, adds foreign key constraints from owner_id and entity_id to the users table',
        default: true
      }
    }
  },
  tags: [
    'ownership',
    'membership',
    'hierarchy',
    'schema'
  ]
};
