import type { NodeTypeDefinition } from '../types';

export const AuthzEntityMembership: NodeTypeDefinition = {
  "name": "AuthzEntityMembership",
  "slug": "authz_entity_membership",
  "category": "authz",
  "display_name": "Entity Membership",
  "description": "Membership check scoped by a field on the row through the SPRT table. Verifies user has membership in the entity referenced by the row.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "entity_field": {
        "type": "string",
        "description": "Column name referencing the entity (e.g., entity_id, org_id)"
      },
      "membership_type": {
        "type": [
          "integer",
          "string"
        ],
        "description": "Scope: 1=app, 2=org, 3+=dynamic entity types (or string name resolved via membership_types_module)"
      },
      "entity_type": {
        "type": "string",
        "description": "Entity type prefix (e.g. 'channel', 'department'). Resolved to membership_type integer via memberships_module lookup. Use instead of membership_type for readability."
      },
      "permission": {
        "type": "string",
        "description": "Single permission name to check (resolved to bitstring mask)"
      },
      "permissions": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Multiple permission names to check (ORed together into mask)"
      },
      "is_admin": {
        "type": "boolean",
        "description": "If true, require is_admin flag"
      },
      "is_owner": {
        "type": "boolean",
        "description": "If true, require is_owner flag"
      }
    },
    "required": [
      "entity_field"
    ]
  },
  "tags": [
    "membership",
    "authz"
  ]
};
