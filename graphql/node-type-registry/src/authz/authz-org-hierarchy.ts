import type { NodeTypeDefinition } from '../types';

export const AuthzOrgHierarchy: NodeTypeDefinition = {
  "name": "AuthzOrgHierarchy",
  "slug": "authz_org_hierarchy",
  "category": "authz",
  "display_name": "Org Hierarchy",
  "description": "Organizational hierarchy visibility using closure table. Managers can see subordinate data or subordinates can see manager data.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "direction": {
        "type": "string",
        "enum": [
          "up",
          "down"
        ],
        "description": "down=manager sees subordinates, up=subordinate sees managers"
      },
      "entity_field": {
        "type": "string",
        "description": "Field referencing the org entity",
        "default": "entity_id"
      },
      "anchor_field": {
        "type": "string",
        "description": "Field referencing the user (e.g., owner_id)"
      },
      "max_depth": {
        "type": "integer",
        "description": "Optional max depth to limit visibility"
      }
    },
    "required": [
      "direction",
      "anchor_field"
    ]
  },
  "tags": [
    "membership",
    "hierarchy",
    "authz"
  ]
};
