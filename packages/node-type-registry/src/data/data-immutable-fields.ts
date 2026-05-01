import type { NodeTypeDefinition } from '../types';

export const DataImmutableFields: NodeTypeDefinition = {
  name: 'DataImmutableFields',
  slug: 'data_immutable_fields',
  category: 'data',
  display_name: 'Immutable Fields',
  description: 'BEFORE UPDATE trigger that prevents changes to a list of specified fields after INSERT. Raises an exception if any of the listed fields have changed. Unlike FieldImmutable (single-field), this handles multiple fields in a single trigger for efficiency.',
  parameter_schema: {
    type: 'object',
    properties: {
      fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Field names that cannot be modified after INSERT (e.g. ["key", "bucket_id", "owner_id"])'
      }
    },
    required: [
      'fields'
    ]
  },
  tags: [
    'trigger',
    'constraint',
    'schema'
  ]
};
