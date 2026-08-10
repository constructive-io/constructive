import type { NodeTypeDefinition } from '../types';

export const CheckGreaterThan: NodeTypeDefinition = {
  name: 'CheckGreaterThan',
  slug: 'check_greater_than',
  category: 'check',
  display_name: 'Check Greater Than',
  description:
    'Adds a CHECK constraint that validates a column value is greater than a threshold (single-column: column > value) or that one column is greater than another (cross-column: columns[0] > columns[1]). Compiled via AST helpers.',
  parameter_schema: {
    type: 'object',
    properties: {
      column: {
        type: 'string',
        format: 'column-ref',
        description: 'Single column to compare against value (mutually exclusive with columns)',
      },
      value: {
        type: 'number',
        description: 'Threshold value for single-column comparison (column > value)',
        default: 0,
      },
      columns: {
        type: 'array',
        items: { type: 'string', format: 'column-ref' },
        description: 'Two columns for cross-column comparison (columns[0] > columns[1])',
        minItems: 2,
        maxItems: 2,
      },
    },
  },
  tags: ['check', 'constraint', 'validation', 'comparison'],
};
