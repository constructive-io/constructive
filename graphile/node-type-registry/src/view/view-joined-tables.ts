import type { NodeTypeDefinition } from '../types';

export const ViewJoinedTables: NodeTypeDefinition = {
  name: 'ViewJoinedTables',
  slug: 'view_joined_tables',
  category: 'view',
  display_name: 'Joined Tables',
  description: 'View that joins multiple tables together. Supports INNER, LEFT, RIGHT, and FULL joins.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "primary_table_id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the primary (left-most) table"
        },
        "primary_columns": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Optional array of column names to include from the primary table"
        },
        "joins": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "table_id": {
                "type": "string",
                "format": "uuid",
                "description": "UUID of the joined table"
              },
              "join_type": {
                "type": "string",
                "enum": [
                  "INNER",
                  "LEFT",
                  "RIGHT",
                  "FULL"
                ]
              },
              "primary_field": {
                "type": "string",
                "description": "Field on primary table"
              },
              "join_field": {
                "type": "string",
                "description": "Field on joined table"
              },
              "columns": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "description": "Optional column names to include from this joined table"
              }
            },
            "required": [
              "table_id",
              "primary_field",
              "join_field"
            ]
          },
          "description": "Array of join specifications"
        },
        "field_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "description": "Optional array of field UUIDs to include (alternative to per-table columns)"
        }
      },
      "required": [
        "primary_table_id",
        "joins"
      ]
    },
  tags: ['view', 'join'],
};
