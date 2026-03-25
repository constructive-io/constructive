import type { NodeTypeDefinition } from '../types';

export const DataJsonb: NodeTypeDefinition = {
  name: 'DataJsonb',
  slug: 'data_jsonb',
  category: 'data',
  display_name: 'JSONB Field',
  description: 'Adds a JSONB column with optional GIN index for containment queries (@>, ?, ?|, ?&). Standard pattern for semi-structured metadata.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "field_name": {
          "type": "string",
          "description": "Column name for the JSONB field",
          "default": "metadata"
        },
        "default_value": {
          "type": "string",
          "description": "Default value expression"
        },
        "is_required": {
          "type": "boolean",
          "description": "Whether the column has a NOT NULL constraint",
          "default": false
        },
        "create_index": {
          "type": "boolean",
          "description": "Whether to create a GIN index",
          "default": true
        }
      }
    },
  tags: ['jsonb', 'schema'],
};
