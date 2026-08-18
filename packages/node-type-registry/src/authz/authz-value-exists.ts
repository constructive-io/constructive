import type { NodeTypeDefinition } from '../types';

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
          required: ['local_column', 'ref_column']
        }
      },
      conditions: {
        type: 'array',
        items: { type: 'object' },
        description: 'Optional higher-level condition JSON applied to the referenced table (row alias d)'
      }
    }
  },
  tags: ['authz', 'value', 'exists']
};
