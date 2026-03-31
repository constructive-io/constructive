import type { NodeTypeDefinition } from '../types';

export const AuthzMemberList: NodeTypeDefinition = {
  "name": "AuthzMemberList",
  "slug": "authz_member_list",
  "category": "authz",
  "display_name": "Member List",
  "description": "Check if current user is in an array column on the same row.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "array_field": {
        "type": "string",
        "description": "Column name containing the array of user IDs"
      }
    },
    "required": [
      "array_field"
    ]
  },
  "tags": [
    "ownership",
    "authz"
  ]
};
