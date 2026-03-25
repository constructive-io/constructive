import type { NodeTypeDefinition } from '../types';

export const AuthzDirectOwner: NodeTypeDefinition = {
  name: 'AuthzDirectOwner',
  slug: 'authz_direct_owner',
  category: 'authz',
  display_name: 'Direct Ownership',
  description: 'Direct equality comparison between a table column and the current user ID. Simplest authorization pattern with no subqueries.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "entity_field": {
          "type": "string",
          "description": "Column name containing the owner user ID (e.g., owner_id)"
        }
      },
      "required": [
        "entity_field"
      ]
    },
  tags: ['ownership', 'authz'],
};
