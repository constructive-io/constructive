import type { NodeTypeDefinition } from '../types';

export const AuthzRelatedPeerOwnership: NodeTypeDefinition = {
  "name": "AuthzRelatedPeerOwnership",
  "slug": "authz_related_peer_ownership",
  "category": "authz",
  "display_name": "Related Peer Ownership",
  "description": "Peer visibility through shared entity membership via a related table. Like AuthzPeerOwnership but the owning user is resolved through a FK JOIN to a related table. Combines SPRT self-join with object table JOIN.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "entity_field": {
        "type": "string",
        "description": "Column name on protected table referencing the related table (e.g., message_id)"
      },
      "membership_type": {
        "type": [
          "integer",
          "string"
        ],
        "description": "Scope: 1=app, 2=org, 3=group (or string name resolved via membership_types_module)"
      },
      "obj_table_id": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the related table (alternative to obj_schema/obj_table)"
      },
      "obj_schema": {
        "type": "string",
        "description": "Schema of the related table (or use obj_table_id)"
      },
      "obj_table": {
        "type": "string",
        "description": "Name of the related table (or use obj_table_id)"
      },
      "obj_field_id": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of field on related table containing the owner user ID (alternative to obj_field)"
      },
      "obj_field": {
        "type": "string",
        "description": "Field name on related table containing the owner user ID (e.g., sender_id)"
      },
      "obj_ref_field": {
        "type": "string",
        "description": "Field on related table to select for matching entity_field (defaults to id)"
      },
      "permission": {
        "type": "string",
        "description": "Single permission name to check on the current user membership (resolved to bitstring mask)"
      },
      "permissions": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Multiple permission names to check on the current user membership (ORed together into mask)"
      },
      "is_admin": {
        "type": "boolean",
        "description": "If true, require is_admin flag on current user membership"
      },
      "is_owner": {
        "type": "boolean",
        "description": "If true, require is_owner flag on current user membership"
      }
    },
    "required": [
      "entity_field"
    ]
  },
  "tags": [
    "membership",
    "peer",
    "authz"
  ]
};
