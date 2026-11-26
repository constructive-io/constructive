import type { NodeTypeDefinition } from '../types';
import { CONDITIONS } from './parameters';

export const AuthzValueExists: NodeTypeDefinition = {
  name: 'AuthzValueExists',
  slug: 'authz_value_exists',
  category: 'authz',
  display_name: 'Value Exists',
  description:
    'EXISTS check in a referenced table joined by a local column, with optional additional conditions.',
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
      protected_table_name: { type: 'string', readOnly: true, description: 'The protected table, which the backend records.' }
    },
    required: ['join'],
    anyOf: [{ required: ['ref_table_id'] }, { required: ['ref_schema', 'ref_table'] }, { required: ['ref_module'] }],
    additionalProperties: false
  },
  tags: ['authz', 'value', 'exists'],
  summary: 'Rows that have a matching row in another table pass; who passes depends on the conditions you add.',
  use_when: [
    'Access that follows a grant row in another table, with a condition that names the person.'
  ],
  avoid_when: [
    'Plain team access: use a membership policy.'
  ],
  risks: [
    'With no condition about the person, anyone who can use the table passes for rows that have a match.'
  ]
};
