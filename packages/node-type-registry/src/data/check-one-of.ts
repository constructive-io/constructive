import type { NodeTypeDefinition } from '../types';

export const CheckOneOf: NodeTypeDefinition = {
  name: 'CheckOneOf',
  slug: 'check_one_of',
  category: 'check',
  display_name: 'Check One Of',
  description:
    'Adds a CHECK constraint that validates a column value is one of an allowed set (e.g. tier IN (\'free\', \'paid\', \'custom\')). Compiled to column = ANY(ARRAY[...]) via AST helpers.',
  parameter_schema: {
    type: 'object',
    properties: {
      column: {
        type: 'string',
        format: 'column-ref',
        description: 'Column to validate against the allowed values',
      },
      values: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of allowed values for the column',
      },
    },
    required: ['column', 'values'],
  },
  tags: ['check', 'constraint', 'validation', 'enum'],
};
