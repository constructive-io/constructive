import type { NodeTypeDefinition } from '../types';

export const CheckNotEqual: NodeTypeDefinition = {
  name: 'CheckNotEqual',
  slug: 'check_not_equal',
  category: 'check',
  display_name: 'Check Not Equal',
  description:
    'Adds a CHECK constraint that validates two columns are not equal (columns[0] != columns[1]). Useful for preventing self-referencing rows. Compiled via AST helpers.',
  parameter_schema: {
    type: 'object',
    properties: {
      columns: {
        type: 'array',
        items: { type: 'string', format: 'column-ref' },
        description: 'Two columns that must not be equal',
        minItems: 2,
        maxItems: 2,
      },
    },
    required: ['columns'],
  },
  tags: ['check', 'constraint', 'validation', 'inequality'],
};
