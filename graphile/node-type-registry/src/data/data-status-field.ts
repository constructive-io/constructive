import type { NodeTypeDefinition } from '../types';

export const DataStatusField: NodeTypeDefinition = {
  "name": "DataStatusField",
  "slug": "data_status_field",
  "category": "data",
  "display_name": "Status Field",
  "description": "Adds a status column with B-tree index for efficient equality filtering and sorting. Optionally constrains values via CHECK constraint when allowed_values is provided.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "field_name": {
        "type": "string",
        "description": "Column name for the status field",
        "default": "status"
      },
      "type": {
        "type": "string",
        "description": "Column type (text or citext)",
        "default": "text"
      },
      "default_value": {
        "type": "string",
        "description": "Default value expression (e.g., active)"
      },
      "is_required": {
        "type": "boolean",
        "description": "Whether the column has a NOT NULL constraint",
        "default": true
      },
      "allowed_values": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "If provided, creates a CHECK constraint restricting the column to these values"
      }
    }
  },
  "tags": [
    "status",
    "schema"
  ]
};
