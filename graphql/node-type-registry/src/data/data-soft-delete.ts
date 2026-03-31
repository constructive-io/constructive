import type { NodeTypeDefinition } from '../types';

export const DataSoftDelete: NodeTypeDefinition = {
  "name": "DataSoftDelete",
  "slug": "data_soft_delete",
  "category": "data",
  "display_name": "Soft Delete",
  "description": "Adds soft delete support with deleted_at and is_deleted columns.",
  "parameter_schema": {
    "type": "object",
    "properties": {}
  },
  "tags": [
    "schema"
  ]
};
