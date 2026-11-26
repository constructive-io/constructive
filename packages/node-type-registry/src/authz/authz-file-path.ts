import type { NodeTypeDefinition } from '../types';
import { OTHER_TABLE_RISK } from './plain-words';

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
    ],
    allOf: [
      { anyOf: [{ required: ['shares_table_id'] }, { required: ['shares_schema', 'shares_table'] }] },
      { anyOf: [{ required: ['files_table_id'] }, { required: ['files_schema', 'files_table'] }] }
    ],
    additionalProperties: false
  },
  tags: [
    'storage',
    'authz'
  ],
  summary: 'People a file or folder has been shared with get access, even people outside the team, while the share is valid.',
  use_when: [
    'Data rooms and drives where a folder is shared with someone outside the team.'
  ],
  avoid_when: [
    'Tables that are not file tables with a path column.'
  ],
  risks: [
    'It reaches people outside the team on purpose. A membership check that every policy must also pass would cut them off.',
    OTHER_TABLE_RISK
  ]
};
