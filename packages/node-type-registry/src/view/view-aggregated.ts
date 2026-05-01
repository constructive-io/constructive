import type { NodeTypeDefinition } from '../types';

export const ViewAggregated: NodeTypeDefinition = {
  name: 'ViewAggregated',
  slug: 'view_aggregated',
  category: 'view',
  display_name: 'Aggregated View',
  description: 'View with GROUP BY and aggregate functions. Useful for summary/reporting views.',
  parameter_schema: {
    type: 'object',
    properties: {
      source_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID of the source table'
      },
      group_by_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Field names to group by'
      },
      aggregates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            function: {
              type: 'string',
              enum: [
                'COUNT',
                'SUM',
                'AVG',
                'MIN',
                'MAX'
              ]
            },
            field: {
              type: 'string',
              format: 'column-ref',
              description: 'Field to aggregate (or * for COUNT)'
            },
            alias: {
              type: 'string',
              description: 'Output column name'
            }
          },
          required: [
            'function',
            'alias'
          ]
        },
        description: 'Array of aggregate specifications'
      }
    },
    required: [
      'source_table_id',
      'group_by_fields',
      'aggregates'
    ]
  },
  tags: [
    'view',
    'aggregate',
    'reporting'
  ]
};
