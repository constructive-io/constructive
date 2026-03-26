import type { NodeTypeDefinition } from '../types';

export const DataTimestamps: NodeTypeDefinition = {
  "name": "DataTimestamps",
  "slug": "data_timestamps",
  "category": "data",
  "display_name": "Timestamps",
  "description": "Adds automatic timestamp tracking with created_at and updated_at columns.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "include_id": {
        "type": "boolean",
        "description": "If true, also adds a UUID primary key column with auto-generation",
        "default": true
      }
    }
  },
  "tags": [
    "timestamps",
    "schema"
  ]
};
