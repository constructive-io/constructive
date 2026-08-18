import type { NodeTypeDefinition } from '../types';

export const AuthzFilePath: NodeTypeDefinition = {
  name: 'AuthzFilePath',
  slug: 'authz_file_path',
  category: 'authz',
  display_name: 'File Path Share',
  description: 'Path-scoped file sharing via ltree containment. Grants access when a path_shares row matches the current user, bucket, and an ancestor path with the required permission.',
  parameter_schema: {
    type: 'object',
    properties: {
      shares_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID of the path_shares table (alternative to shares_schema/shares_table)'
      },
      shares_schema: {
        type: 'string',
        description: 'Schema of the path_shares table (or use shares_table_id)'
      },
      shares_table: {
        type: 'string',
        description: 'Name of the path_shares table (or use shares_table_id)'
      },
      files_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID of the files table (alternative to files_schema/files_table)'
      },
      files_schema: {
        type: 'string',
        description: 'Schema of the files table (or use files_table_id)'
      },
      files_table: {
        type: 'string',
        description: 'Name of the files table (or use files_table_id)'
      },
      capability_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'foreign',
        description: 'Boolean column on the path_shares table that grants the required permission (e.g. can_read, can_write)'
      },
      bucket_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'foreign',
        description: 'Column on the files table referencing the bucket',
        default: 'bucket_id'
      },
      path_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'foreign',
        description: 'Ltree column on the files table representing the file path',
        default: 'path'
      }
    },
    required: [
      'capability_field'
    ]
  },
  tags: [
    'storage',
    'authz'
  ]
};
