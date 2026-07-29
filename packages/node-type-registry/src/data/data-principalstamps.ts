import type { NodeTypeDefinition } from '../types';

export const DataPrincipalstamps: NodeTypeDefinition = {
  name: 'DataPrincipalstamps',
  slug: 'data_principalstamps',
  category: 'data',
  display_name: 'Principalstamps',
  description: 'Adds acting-principal tracking for creates/updates: created_by_principal/updated_by_principal record the acting principal — agent, API key, service identity, or the user itself (jwt_public.current_principal_id()).',
  parameter_schema: {
    type: 'object',
    properties: {
      created_by_principal_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the creating principal reference (agent, API key, or user)',
        default: 'created_by_principal'
      },
      updated_by_principal_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the last-updating principal reference (agent, API key, or user)',
        default: 'updated_by_principal'
      },
      include_id: {
        type: 'boolean',
        description: 'If true, also adds a UUID primary key column with auto-generation',
        default: true
      },
      create_index: {
        type: 'boolean',
        description: 'If true, creates B-tree indexes on the principalstamp columns',
        default: true
      }
    }
  },
  tags: [
    'timestamps',
    'schema'
  ]
};
