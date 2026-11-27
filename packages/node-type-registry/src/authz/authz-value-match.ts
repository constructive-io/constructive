import type { NodeTypeDefinition } from '../types';
import { ALLOWED_VALUES, CONDITIONS } from './parameters';

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
      ref_module: {
        type: 'object',
        description:
          'Reference to a table an installed module generated, resolved during blueprint construction (alternative to ref_table_id / ref_schema + ref_table)',
        properties: {
          type: { type: 'string', description: 'Module type owning the table, e.g. "agent"' },
          table: { type: 'string', description: 'Logical table key within the module, e.g. "thread"' },
          scope: { type: 'string', description: 'Scope of the module instance, e.g. "app" or "org"' },
          prefix: { type: 'string', description: 'Prefix of the module instance, for entity-scoped installations' }
        },
        required: ['type', 'table']
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
              'x-column-scope': 'local',
              description: 'Column on the protected table'
            },
            ref_column: {
              type: 'string',
              format: 'column-ref',
              'x-column-scope': 'foreign',
              description: 'Column on the referenced table'
            },
            operator: {
              type: 'string',
              enum: ['=', '!=', '>', '<', '>=', '<='],
              default: '=',
              description: 'Join operator'
            }
          },
          required: ['local_column', 'ref_column'],
          additionalProperties: false
        }
      },
      match: {
        type: 'object',
        description: 'Value match on a referenced column',
        properties: {
          ref_column: {
            type: 'string',
            format: 'column-ref',
            'x-column-scope': 'foreign',
            description: 'Column on the referenced table to match'
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
            description: 'Operator to use for the match'
          }
        },
        required: ['ref_column', 'allowed', 'operator'],
        additionalProperties: false
      },
      conditions: {
        ...CONDITIONS,
        description: 'Optional higher-level condition JSON applied to the referenced table (row alias d)'
      },
      exists: {
        type: 'object',
        description: 'A further row that must exist in a third table, joined to the referenced row (alias b unless ref_alias says otherwise).',
        properties: {
          ref_table_id: { type: 'string', format: 'uuid', description: 'UUID of the third table (alternative to ref_schema/ref_table)' },
          ref_schema: { type: 'string', description: 'Schema of the third table (or use ref_table_id)' },
          ref_table: { type: 'string', description: 'Name of the third table (or use ref_table_id)' },
          ref_alias: { type: 'string', description: 'Alias of the third table in the join', default: 'b' },
          join: {
            type: 'array',
            description: 'Join conditions between the referenced row and the third table',
            items: {
              type: 'object',
              properties: {
                local_column: { type: 'string', format: 'column-ref', 'x-column-scope': 'foreign', description: 'Column on the referenced table' },
                ref_column: { type: 'string', format: 'column-ref', 'x-column-scope': 'foreign', description: 'Column on the third table' },
                operator: { type: 'string', enum: ['=', '!=', '>', '<', '>=', '<='], default: '=', description: 'Join operator' }
              },
              required: ['local_column', 'ref_column'],
              additionalProperties: false
            }
          },
          conditions: { ...CONDITIONS, description: 'Optional condition JSON applied to the third table' },
          conditions_ast: { type: 'object', readOnly: true, description: 'The compiled conditions, which the backend writes from conditions.' }
        },
        anyOf: [{ required: ['ref_table_id'] }, { required: ['ref_schema', 'ref_table'] }],
        additionalProperties: false
      },
      conditions_ast: { type: 'object', readOnly: true, description: 'The compiled conditions, which the backend writes from conditions.' },
      outer_conditions: {
        type: 'array',
        items: { type: 'object' },
        readOnly: true,
        description: 'Set by the platform on its own policies: conditions on the protected row itself.'
      },
      outer_conditions_ast: { type: 'object', readOnly: true, description: 'The compiled outer conditions, which the backend writes from outer_conditions.' },
      protected_table_name: { type: 'string', readOnly: true, description: 'The protected table, which the backend records.' }
    },
    required: ['match', 'join'],
    anyOf: [{ required: ['ref_table_id'] }, { required: ['ref_schema', 'ref_table'] }, { required: ['ref_module'] }],
    additionalProperties: false
  },
  tags: ['authz', 'value', 'exists'],
  summary: 'Rows whose matching row in another table holds an allowed value pass; who passes depends on the conditions you add.',
  use_when: [
    'Access that follows a value on a related row, such as the role on a grant row, with a condition that names the person.'
  ],
  avoid_when: [
    'Plain team access: use a membership policy.'
  ],
  risks: [
    'With no condition about the person, anyone who can use the table passes for rows that have a match.'
  ]
};
