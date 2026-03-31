import type { NodeTypeDefinition } from '../types';

export const AuthzTemporal: NodeTypeDefinition = {
  "name": "AuthzTemporal",
  "slug": "authz_temporal",
  "category": "authz",
  "display_name": "Temporal Access",
  "description": "Time-window based access control. Restricts access based on valid_from and/or valid_until timestamps. At least one of valid_from_field or valid_until_field must be provided.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "valid_from_field": {
        "type": "string",
        "description": "Column for start time (at least one of valid_from_field or valid_until_field required)"
      },
      "valid_until_field": {
        "type": "string",
        "description": "Column for end time (at least one of valid_from_field or valid_until_field required)"
      },
      "valid_from_inclusive": {
        "type": "boolean",
        "description": "Include start boundary",
        "default": true
      },
      "valid_until_inclusive": {
        "type": "boolean",
        "description": "Include end boundary",
        "default": false
      }
    },
    "anyOf": [
      {
        "required": [
          "valid_from_field"
        ]
      },
      {
        "required": [
          "valid_until_field"
        ]
      }
    ]
  },
  "tags": [
    "temporal",
    "authz"
  ]
};
