import type { NodeTypeDefinition } from '../types';

export const DataTags: NodeTypeDefinition = {
  "name": "DataTags",
  "slug": "data_tags",
  "category": "data",
  "display_name": "Tags",
  "description": "Adds a citext[] tags column with GIN index for efficient array containment queries (@>, &&). Standard tagging pattern for categorization and filtering.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "field_name": {
        "type": "string",
        "description": "Column name for the tags array",
        "default": "tags"
      },
      "default_value": {
        "type": "string",
        "description": "Default value expression for the tags column"
      },
      "is_required": {
        "type": "boolean",
        "description": "Whether the column has a NOT NULL constraint",
        "default": false
      }
    }
  },
  "tags": [
    "tags",
    "schema"
  ]
};
