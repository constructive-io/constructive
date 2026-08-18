import type { NodeTypeDefinition } from '../types';

export const AuthzValueAllowed: NodeTypeDefinition = {
  name: 'AuthzValueAllowed',
  slug: 'authz_value_allowed',
  category: 'authz',
  display_name: 'Value Allowed',
  description:
    'Check the protected row\'s own column against an allowed set of values.',
  parameter_schema: {
    type: 'object',
    properties: {
      column: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column on the protected table to check'
      },
      allowed: {
        description: 'Allowed values as a constant string array, or a local column name containing the allowed values',
        anyOf: [
          {
            type: 'string',
            format: 'column-ref',
            'x-column-scope': 'local',
            description: 'Local column name containing allowed values'
          },
          {
            type: 'array',
            items: { type: ['string', 'boolean', 'number'] },
            description:
              'Constant list of allowed values. Element JSON type is preserved: booleans/numbers emit typed constants (e.g. [true] -> TRUE, [5] -> 5), strings emit text literals.'
          }
        ]
      },
      operator: {
        type: 'string',
        enum: ['in', 'any', 'overlap', 'contains', 'contained'],
        description: 'Operator to use for the value check'
      }
    },
    required: ['column', 'allowed', 'operator']
  },
  tags: ['authz', 'value']
};
