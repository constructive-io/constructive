import type { NodeTypeDefinition } from '../types';

export const DataOwnedFields: NodeTypeDefinition = {
  name: 'DataOwnedFields',
  slug: 'data_owned_fields',
  category: 'data',
  display_name: 'Owned Fields',
  description: 'Restricts which user can modify specific columns in shared objects. Creates an AFTER UPDATE trigger that throws OWNED_PROPS when a non-owner tries to change protected fields. References fields by name in data jsonb.',
  parameter_schema: {
    type: 'object',
    properties: {
      role_key_field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the field identifying the owner (e.g. sender_id)'
      },
      protected_field_names: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Names of fields only this owner can modify'
      }
    },
    required: [
      'role_key_field_name',
      'protected_field_names'
    ]
  },
  tags: [
    'ownership',
    'constraint',
    'behavior'
  ]
};
