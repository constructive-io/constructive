import type { NodeTypeDefinition } from '../types';
import { ALLOWED_VALUES } from './parameters';

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
        description: 'Allowed values as a constant list, or a local column name containing the allowed values',
        anyOf: [
          {
            type: 'string',
            format: 'column-ref',
            'x-column-scope': 'local',
            description: 'Local column name containing allowed values'
          },
          ALLOWED_VALUES
        ]
      },
      operator: {
        type: 'string',
        enum: ['in', 'any', 'overlap', 'contains', 'contained'],
        description: 'Operator to use for the value check'
      }
    },
    required: ['column', 'allowed', 'operator'],
    additionalProperties: false
  },
  tags: ['authz', 'value'],
  summary: 'Rows whose column holds an allowed value pass; it does not check who is asking.',
  use_when: [
    'The update check that limits what a row may change into, such as the allowed status values.',
    'Inside AuthzComposite, next to a rule about people.'
  ],
  avoid_when: [
    'As the only policy on an operation.'
  ],
  risks: [
    'It does not check who is asking: as the only policy on an operation, anyone who can use the table passes for matching rows.'
  ]
};
