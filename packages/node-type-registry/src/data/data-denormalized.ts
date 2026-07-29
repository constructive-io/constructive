import type { NodeTypeDefinition } from '../types';

export const DataDenormalized: NodeTypeDefinition = {
  name: 'DataDenormalized',
  slug: 'data_denormalized',
  category: 'data',
  display_name: 'Denormalized Field',
  description: 'Creates INSERT and UPDATE triggers that copy field values from a referenced (parent) table into the current table whenever the FK changes. Used to denormalize frequently-read columns (e.g. database_id on junction tables) so that RLS and queries can filter locally without joining.',
  parameter_schema: {
    type: 'object',
    properties: {
      field: {
        type: 'string',
        format: 'column-ref',
        description: 'FK field on this table that references the parent row (e.g. view_id)'
      },
      set_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Field names on this table to be populated from the parent (e.g. ["database_id"])'
      },
      ref_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Field on the parent table that is the FK target (e.g. id)'
      },
      ref_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Field names on the parent table to copy from (e.g. ["database_id"])'
      },
      use_updates: {
        type: 'boolean',
        description: 'If true, also creates an UPDATE trigger so changes to the FK re-copy values',
        default: true
      },
      update_defaults: {
        type: 'boolean',
        description: 'If true, sets the default value of set_fields to uuid_nil() so they are populated by the trigger',
        default: true
      },
      func_name: {
        type: 'string',
        description: 'Custom function name suffix (defaults to the FK field name)'
      },
      func_order: {
        type: 'integer',
        description: 'Trigger ordering (0-padded). Lower numbers fire first',
        default: 0
      }
    },
    required: [
      'field',
      'set_fields',
      'ref_field',
      'ref_fields'
    ]
  },
  tags: [
    'trigger',
    'denormalization',
    'schema'
  ]
};
