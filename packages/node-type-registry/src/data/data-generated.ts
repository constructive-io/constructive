import type { NodeTypeDefinition } from '../types';

export const DataGenerated: NodeTypeDefinition = {
  name: 'DataGenerated',
  slug: 'data_generated',
  category: 'data',
  display_name: 'Generated Field',
  description: 'Creates a native PostgreSQL GENERATED ALWAYS AS (expr) column (STORED or VIRTUAL) from a source field expression, preset, or raw AST. The column is read-only for clients and computed automatically by PostgreSQL.',
  parameter_schema: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the generated column to create'
      },
      type: {
        type: 'object',
        description: 'FieldType for the generated column (default: text)',
        default: { name: 'text' }
      },
      kind: {
        type: 'string',
        enum: ['expression', 'concat', 'slug', 'object_name', 'hash'],
        description: 'Preset for building the generation expression',
        default: 'expression'
      },
      generation_type: {
        type: 'string',
        enum: ['stored', 'virtual'],
        description: 'Whether the column is STORED (persisted on write) or VIRTUAL (computed on read, PostgreSQL 18+)',
        default: 'stored'
      },
      source_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Single source field for expression/slug/object_name presets'
      },
      source_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Array of source field names for concat/hash presets'
      },
      expression: {
        type: 'object',
        description: 'Raw FieldGeneration DSL or AST (used when kind is expression)'
      },
      separator: {
        type: 'string',
        description: 'Separator used by concat preset',
        default: ' '
      },
      format: {
        type: 'string',
        enum: ['labeled', 'plain'],
        description: "Output format for concat preset: 'labeled' (field_name: value) or 'plain' (values only)",
        default: 'plain'
      },
      prefix: {
        type: 'string',
        description: 'Optional prefix for object_name preset'
      },
      suffix: {
        type: 'string',
        description: 'Optional suffix for object_name preset'
      },
      algorithm: {
        type: 'string',
        description: 'Hash algorithm for hash preset (e.g. sha256, md5)',
        default: 'sha256'
      },
      is_required: {
        type: 'boolean',
        description: 'Whether the generated column is NOT NULL',
        default: false
      }
    },
    required: ['target']
  },
  tags: ['transform', 'behavior']
};
