import type { NodeTypeDefinition } from '../types';

export const DataSoftDelete: NodeTypeDefinition = {
  name: 'DataSoftDelete',
  slug: 'data_soft_delete',
  category: 'data',
  display_name: 'Soft Delete',
  description: 'Adds soft delete support with deleted_at and is_deleted columns.',
  parameter_schema: {
    type: 'object',
    properties: {
      include_id: {
        type: 'boolean',
        description: 'If true, also adds a UUID primary key column with auto-generation',
        default: true
      }
    }
  },
  tags: [
    'schema'
  ]
};
