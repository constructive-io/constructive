import type { NodeTypeDefinition } from '../types';

export const DataJobTrigger: NodeTypeDefinition = {
  name: 'DataJobTrigger',
  slug: 'data_job_trigger',
  category: 'data',
  display_name: 'Job Trigger',
  description: 'Dynamically creates PostgreSQL triggers that enqueue jobs via app_jobs.add_job() when table rows are inserted, updated, or deleted. Supports configurable payload strategies (full row, row ID, selected fields, or custom mapping), conditional firing via WHEN clauses, watched field changes, and extended job options (queue, priority, delay, max attempts).',
  parameter_schema: {
    type: 'object',
    properties: {
      task_identifier: {
        type: 'string',
        description: 'Job task identifier passed to add_job (e.g., process_invoice, sync_to_stripe)'
      },
      payload_strategy: {
        type: 'string',
        enum: [
          'row',
          'row_id',
          'fields',
          'custom'
        ],
        description: 'How to build the job payload: row (full NEW/OLD), row_id (just id), fields (selected columns), custom (mapped columns)',
        default: 'row_id'
      },
      payload_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Column names to include in payload (only for fields strategy)'
      },
      payload_custom: {
        type: 'object',
        additionalProperties: {
          type: 'string'
        },
        description: 'Key-to-column mapping for custom payload (e.g., {"invoice_id": "id", "total": "amount"})'
      },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'INSERT',
            'UPDATE',
            'DELETE'
          ]
        },
        description: 'Trigger events to create',
        default: [
          'INSERT',
          'UPDATE'
        ]
      },
      include_old: {
        type: 'boolean',
        description: 'Include OLD row in payload (for UPDATE triggers)',
        default: false
      },
      include_meta: {
        type: 'boolean',
        description: 'Include table/schema metadata in payload',
        default: false
      },
      condition_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for conditional WHEN clause (fires only when field equals condition_value)'
      },
      condition_value: {
        type: 'string',
        description: 'Value to compare against condition_field in WHEN clause'
      },
      conditions: {
        description: 'Compound conditions for the trigger WHEN clause. Accepts a single leaf condition, an array of conditions (implicitly AND), or a nested combinator tree ({AND: [...], OR: [...], NOT: {...}}). Each leaf is {field, op, value?, row?, ref?}. Column types are resolved automatically from the table schema. Cannot be combined with condition_field or watch_fields.',
        oneOf: [
          {
            type: 'object',
            description: 'A single leaf condition or a combinator (AND/OR/NOT)',
            properties: {
              field: {
                type: 'string',
                format: 'column-ref',
                description: 'Column name (validated against the table)'
              },
              op: {
                type: 'string',
                enum: ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL', 'IS DISTINCT FROM'],
                description: 'Comparison operator'
              },
              value: {
                description: 'Comparison value. Type is resolved from the column definition. Omit for IS NULL, IS NOT NULL, IS DISTINCT FROM.'
              },
              row: {
                type: 'string',
                enum: ['NEW', 'OLD'],
                description: 'Row reference (default: NEW)',
                default: 'NEW'
              },
              ref: {
                type: 'object',
                description: 'Column reference for field-to-field comparison (alternative to value)',
                properties: {
                  field: { type: 'string', format: 'column-ref' },
                  row: { type: 'string', enum: ['NEW', 'OLD'], default: 'NEW' }
                }
              },
              AND: {
                type: 'array',
                description: 'Array of conditions combined with AND'
              },
              OR: {
                type: 'array',
                description: 'Array of conditions combined with OR'
              },
              NOT: {
                type: 'object',
                description: 'Negated condition'
              }
            }
          },
          {
            type: 'array',
            description: 'Array of conditions (implicitly AND)',
            items: {
              type: 'object'
            }
          }
        ]
      },
      watch_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'For UPDATE triggers, only fire when these fields change (uses DISTINCT FROM)'
      },
      job_key: {
        type: 'string',
        description: 'Static job key for upsert semantics (prevents duplicate jobs)'
      },
      queue_name: {
        type: 'string',
        description: 'Job queue name for routing to specific workers'
      },
      priority: {
        type: 'integer',
        description: 'Job priority (lower = higher priority)',
        default: 0
      },
      run_at_delay: {
        type: 'string',
        description: 'Delay before job runs as PostgreSQL interval (e.g., 30 seconds, 5 minutes)'
      },
      max_attempts: {
        type: 'integer',
        description: 'Maximum retry attempts for the job',
        default: 25
      }
    },
    required: [
      'task_identifier'
    ]
  },
  tags: [
    'jobs',
    'triggers',
    'async'
  ]
};
