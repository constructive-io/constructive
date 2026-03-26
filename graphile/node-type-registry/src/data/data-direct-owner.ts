import type { NodeTypeDefinition } from '../types';

export const DataDirectOwner: NodeTypeDefinition = {
  "name": "DataDirectOwner",
  "slug": "data_direct_owner",
  "category": "data",
  "display_name": "Ownership",
  "description": "Adds ownership column for direct user ownership. Enables AuthzDirectOwner authorization.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "owner_field_name": {
        "type": "string",
        "description": "Column name for owner ID",
        "default": "owner_id"
      },
      "include_id": {
        "type": "boolean",
        "description": "If true, also adds a UUID primary key column with auto-generation",
        "default": true
      },
      "include_user_fk": {
        "type": "boolean",
        "description": "If true, adds a foreign key constraint from owner_id to the users table",
        "default": true
      }
    }
  },
  "tags": [
    "ownership",
    "schema"
  ]
};
