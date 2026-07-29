import type { NodeTypeDefinition } from '../types';

export const AuthzValueMatch: NodeTypeDefinition = {
  name: 'AuthzValueMatch',
  slug: 'authz_value_match',
  category: 'authz',
  display_name: 'Value Match',
  description:
    'EXISTS check in a referenced table joined by a local column, with a value/array match on a referenced column and optional additional conditions.',
  parameter_schema: {
    type: 'object',
    properties: {
      ref_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID of the referenced table (alternative to ref_schema/ref_table)'
      },
      ref_schema: {
        type: 'string',
        description: 'Schema of the referenced table (or use ref_table_id)'
      },
      ref_table: {
        type: 'string',
        description: 'Name of the referenced table (or use ref_table_id)'
      },
      join: {
        type: 'array',
        description: 'Join conditions between the protected row and the referenced table',
        items: {
          type: 'object',
          properties: {
            local_column: {
              type: 'string',
              format: 'column-ref',
              description: 'Column on the protected table'
            },
            ref_column: {
              type: 'string',
              format: 'column-ref',
              description: 'Column on the referenced table'
            },
            operator: {
              type: 'string',
              enum: ['=', '!=', '>', '<', '>=', '<='],
              default: '=',
              description: 'Join operator'
            }
          },
          required: ['local_column', 'ref_column']
        }
      },
      match: {
        type: 'object',
        description: 'Value match on a referenced column',
        properties: {
          ref_column: {
            type: 'string',
            format: 'column-ref',
            description: 'Column on the referenced table to match'
          },
          allowed: {
            description: 'Allowed values as a constant string array, or a local column name containing the allowed values',
            anyOf: [
              {
                type: 'string',
                format: 'column-ref',
                description: 'Local column name containing allowed values'
              },
              {
                type: 'array',
                items: { type: 'string' },
                description: 'Constant list of allowed values'
              }
            ]
          },
          operator: {
            type: 'string',
            enum: ['in', 'any', 'overlap', 'contains', 'contained'],
            description: 'Operator to use for the match'
          }
        },
        required: ['ref_column', 'allowed', 'operator']
      },
      conditions: {
        type: 'array',
        items: { type: 'object' },
        description: 'Optional higher-level condition JSON applied to the referenced table (row alias d)'
      }
    },
    required: ['match']
  },
  tags: ['authz', 'value', 'exists']
};
