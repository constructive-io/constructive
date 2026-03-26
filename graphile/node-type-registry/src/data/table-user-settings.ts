import type { NodeTypeDefinition } from '../types';

export const TableUserSettings: NodeTypeDefinition = {
  "name": "TableUserSettings",
  "slug": "table_user_settings",
  "category": "data",
  "display_name": "User Settings",
  "description": "Creates a user settings table for user-specific configuration. Uses AuthzDirectOwner for access control.",
  "parameter_schema": {
    "type": "object",
    "properties": {}
  },
  "tags": [
    "template",
    "settings",
    "ownership",
    "schema"
  ]
};
