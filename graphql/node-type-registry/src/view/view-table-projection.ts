import type { NodeTypeDefinition } from '../types';

export const ViewTableProjection: NodeTypeDefinition = {
  "name": "ViewTableProjection",
  "slug": "view_table_projection",
  "category": "view",
  "display_name": "Table Projection",
  "description": "Simple column selection from a single source table. Projects all or specific fields.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "source_table_id": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the source table to project from"
      },
      "field_ids": {
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "description": "Optional array of field UUIDs to include (all fields if omitted)"
      },
      "field_names": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Optional array of field names to include (alternative to field_ids)"
      }
    },
    "required": [
      "source_table_id"
    ]
  },
  "tags": [
    "view",
    "projection"
  ]
};
