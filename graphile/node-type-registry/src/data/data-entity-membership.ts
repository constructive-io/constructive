import type { NodeTypeDefinition } from '../types';

export const DataEntityMembership: NodeTypeDefinition = {
  name: 'DataEntityMembership',
  slug: 'data_entity_membership',
  category: 'data',
  display_name: 'Entity Membership',
  description: 'Adds entity reference for organization/group scoping. Enables AuthzEntityMembership, AuthzMembership, AuthzOrgHierarchy authorization.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "entity_field_name": {
          "type": "string",
          "description": "Column name for entity ID",
          "default": "entity_id"
        },
        "include_id": {
          "type": "boolean",
          "description": "If true, also adds a UUID primary key column with auto-generation",
          "default": true
        },
        "include_user_fk": {
          "type": "boolean",
          "description": "If true, adds a foreign key constraint from entity_id to the users table",
          "default": true
        }
      }
    },
  tags: ['membership', 'schema'],
};
