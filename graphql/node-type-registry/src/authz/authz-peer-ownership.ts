import type { NodeTypeDefinition } from '../types';

export const AuthzPeerOwnership: NodeTypeDefinition = {
  "name": "AuthzPeerOwnership",
  "slug": "authz_peer_ownership",
  "category": "authz",
  "display_name": "Peer Ownership",
  "description": "Peer visibility through shared entity membership. Authorizes access to user-owned rows when the owner and current user are both members of the same entity. Self-joins the SPRT table to find peers.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "owner_field": {
        "type": "string",
        "description": "Column name on protected table referencing the owning user (e.g., owner_id)"
      },
      "membership_type": {
        "type": [
          "integer",
          "string"
        ],
        "description": "Scope: 1=app, 2=org, 3+=dynamic entity types (or string name resolved via membership_types_module)"
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
      "owner_field"
    ]
  },
  "tags": [
    "membership",
    "peer",
    "authz"
  ]
};
