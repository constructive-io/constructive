import type { NodeTypeDefinition } from '../types';

export const DataDenormalized: NodeTypeDefinition = {
  name: 'DataDenormalized',
  slug: 'data_denormalized',
  category: 'data',
  display_name: 'Denormalized Field',
  description: 'Copies values from a referenced parent row into this table with INSERT and UPDATE triggers.',
  parameter_schema: {
    type: 'object',
    properties: {
      field: { type: 'string', format: 'column-ref' },
      set_fields: { type: 'array', items: { type: 'string', format: 'column-ref' } },
      ref_field: { type: 'string', format: 'column-ref' },
      ref_fields: { type: 'array', items: { type: 'string', format: 'column-ref' } },
      use_updates: { type: 'boolean', default: true },
      update_defaults: { type: 'boolean', default: true },
      func_name: { type: 'string' },
      func_order: { type: 'integer', default: 0 }
    },
    required: ['field', 'set_fields', 'ref_field', 'ref_fields']
  },
  tags: ['trigger', 'denormalization', 'schema']
};
