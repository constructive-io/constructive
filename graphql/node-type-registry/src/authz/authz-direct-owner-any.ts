import type { NodeTypeDefinition } from '../types';

export const AuthzDirectOwnerAny: NodeTypeDefinition = {
  "name": "AuthzDirectOwnerAny",
  "slug": "authz_direct_owner_any",
  "category": "authz",
  "display_name": "Multi-Owner Access",
  "description": "OR logic for multiple ownership fields. Checks if current user matches any of the specified fields.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "entity_fields": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Array of column names to check for ownership"
      }
    },
    "required": [
      "entity_fields"
    ]
  },
  "tags": [
    "ownership",
    "authz"
  ]
};
