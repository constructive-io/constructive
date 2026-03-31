import type { NodeTypeDefinition } from '../types';

export const AuthzAllowAll: NodeTypeDefinition = {
  "name": "AuthzAllowAll",
  "slug": "authz_allow_all",
  "category": "authz",
  "display_name": "Public Access",
  "description": "Allows all access. Generates TRUE expression.",
  "parameter_schema": {
    "type": "object",
    "properties": {}
  },
  "tags": [
    "authz"
  ]
};
