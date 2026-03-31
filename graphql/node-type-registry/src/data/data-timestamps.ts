import type { NodeTypeDefinition } from '../types';

export const DataTimestamps: NodeTypeDefinition = {
  "name": "DataTimestamps",
  "slug": "data_timestamps",
  "category": "data",
  "display_name": "Timestamps",
  "description": "Adds automatic timestamp tracking with created_at and updated_at columns.",
  "parameter_schema": {
    "type": "object",
    "properties": {}
  },
  "tags": [
    "timestamps",
    "schema"
  ]
};
