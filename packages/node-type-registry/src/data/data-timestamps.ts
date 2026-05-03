import type { NodeTypeDefinition } from '../types';

export const DataTimestamps: NodeTypeDefinition = {
  name: 'DataTimestamps',
  slug: 'data_timestamps',
  category: 'data',
  display_name: 'Timestamps',
  description: 'Adds automatic timestamp tracking with created_at and updated_at columns.',
  parameter_schema: {
    type: 'object',
    properties: {
      created_at_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the creation timestamp',
        default: 'created_at'
      },
      updated_at_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the last-updated timestamp',
        default: 'updated_at'
      },
      include_id: {
        type: 'boolean',
        description: 'If true, also adds a UUID primary key column with auto-generation',
        default: true
      }
    }
  },
  tags: [
    'timestamps',
    'schema'
  ]
};
