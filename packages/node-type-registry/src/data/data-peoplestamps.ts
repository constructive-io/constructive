import type { NodeTypeDefinition } from '../types';

export const DataPeoplestamps: NodeTypeDefinition = {
  name: 'DataPeoplestamps',
  slug: 'data_peoplestamps',
  category: 'data',
  display_name: 'Peoplestamps',
  description: 'Adds user tracking for creates/updates with created_by and updated_by columns.',
  parameter_schema: {
    type: 'object',
    properties: {
      include_id: {
        type: 'boolean',
        description: 'If true, also adds a UUID primary key column with auto-generation',
        default: true
      },
      include_user_fk: {
        type: 'boolean',
        description: 'If true, adds foreign key constraints from created_by and updated_by to the users table',
        default: false
      }
    }
  },
  tags: [
    'timestamps',
    'schema'
  ]
};
