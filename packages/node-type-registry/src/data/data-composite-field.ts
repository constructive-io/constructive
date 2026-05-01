import type { NodeTypeDefinition } from '../types';

export const DataCompositeField: NodeTypeDefinition = {
  name: 'DataCompositeField',
  slug: 'data_composite_field',
  category: 'data',
  display_name: 'Composite Field',
  description: "Creates a derived text field that automatically concatenates multiple source fields via BEFORE INSERT/UPDATE triggers. Used to produce a unified text representation (e.g., embedding_text) from multiple columns on a table. The trigger fires with '_000' prefix to run before Search* triggers alphabetically.",
  parameter_schema: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        format: 'column-ref',
        description: "Name of the derived text field to create (default: 'embedding_text')"
      },
      source_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Array of source field names to concatenate into the target field'
      },
      format: {
        type: 'string',
        enum: ['labeled', 'plain'],
        description: "Output format: 'labeled' (field_name: value) or 'plain' (values only). Default: 'labeled'"
      }
    },
    required: [
      'source_fields'
    ]
  },
  tags: [
    'transform',
    'behavior'
  ]
};
