import type { NodeTypeDefinition } from '../types';

export const DataArchivable: NodeTypeDefinition = {
  name: 'DataArchivable',
  slug: 'data_archivable',
  category: 'data',
  display_name: 'Archivable',
  description: 'Adds user-reversible archive support with is_archived boolean and archived_at timestamp, plus a partial index for efficient active-row queries.',
  parameter_schema: {
    type: 'object',
    properties: {
      is_archived_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the archive boolean flag',
        default: 'is_archived'
      },
      archived_at_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the archive timestamp',
        default: 'archived_at'
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
