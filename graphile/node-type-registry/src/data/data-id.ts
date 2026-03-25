import type { NodeTypeDefinition } from '../types';

export const DataId: NodeTypeDefinition = {
  name: 'DataId',
  slug: 'data_id',
  category: 'data',
  display_name: 'Primary Key ID',
  description: 'Adds a UUID primary key column with auto-generation default (uuidv7). This is the standard primary key pattern for all tables.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "field_name": {
          "type": "string",
          "description": "Column name for the primary key",
          "default": "id"
        }
      }
    },
  tags: ['primary_key', 'schema'],
};
