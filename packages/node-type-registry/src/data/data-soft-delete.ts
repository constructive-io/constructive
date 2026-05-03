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
      deleted_at_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the soft-delete timestamp',
        default: 'deleted_at'
      },
      is_deleted_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the soft-delete boolean flag',
        default: 'is_deleted'
      },
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
