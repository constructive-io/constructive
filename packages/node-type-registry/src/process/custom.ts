import { conditionDefs, triggerConditionsProperty } from '../conditions';
import type { NodeTypeDefinition } from '../types';

/**
 * Tenant-defined file processing node.
 *
 * The built-in Process* nodes are wired to platform tasks and platform
 * writers. ProcessCustom wires a storage module's files table to a task the
 * tenant registered itself (`register_function --scope database`): when a file
 * reaches status = 'uploaded' the job is enqueued through the quota-gated
 * function_invocations ledger, and the generated SECURITY DEFINER writer
 * `<files>_write_<task_slug>(file_id, result)` is the one way the tenant's
 * function, over the pg-wire function lane, lands its result and moves the
 * row uploaded → processed. The node provisions nothing else: the generator
 * refuses when the task is not registered, when the table is not a storage
 * files table, or when the module has no confirm-upload loop.
 */
export const ProcessCustom: NodeTypeDefinition = {
  name: 'ProcessCustom',
  slug: 'process_custom',
  category: 'process',
  display_name: 'Custom File Processing',
  description:
    'Enqueues a tenant-registered task when a file on a storage files table reaches ' +
    'status = \'uploaded\' and generates the result writer ' +
    'the task calls back over the function lane. The task must already be registered ' +
    'for the database (register_function with scope database); the node is refused otherwise.',
  parameter_schema: {
    type: 'object',
    $defs: conditionDefs,
    required: ['task_identifier'],
    properties: {

      // ── Job routing ───────────────────────────────────────────────
      task_identifier: {
        type: 'string',
        format: 'function-ref',
        description:
          'Task identifier of the tenant-registered function (namespace:name). ' +
          'Must resolve through the function registry for this database at provisioning time.'
      },

      // ── Output field ──────────────────────────────────────────────
      result_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Optional jsonb field on the files table that receives the result the task ' +
          'hands to the generated writer. When omitted the writer only records the ' +
          'uploaded → processed transition.'
      },

      // ── MIME scoping ──────────────────────────────────────────────
      mime_patterns: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Optional MIME type LIKE patterns to match. Multiple patterns are OR\'d together. ' +
          'When omitted every uploaded file is processed.'
      },
      trigger_conditions: triggerConditionsProperty,

      // ── Entity billing scope ──────────────────────────────────────
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column on the files table that holds (or references) the entity_id for billing scope. Forwarded to the composed JobTrigger.'
      },
      entity_lookup: {
        type: 'object',
        description: 'FK lookup configuration for resolving entity_id through a related table. Forwarded to the composed JobTrigger.',
        properties: {
          obj_table: { type: 'string', description: 'Name of the related table to look up entity_id from' },
          obj_schema: { type: 'string', description: 'Schema of the related table (user-facing name, optional)' },
          obj_field: { type: 'string', format: 'column-ref', description: 'Column on the related table that holds the entity_id' }
        },
        required: ['obj_table', 'obj_field']
      },

      // ── Job options ───────────────────────────────────────────────
      queue_name: {
        type: 'string',
        description: 'Job queue name for the task',
        default: 'process_custom'
      },
      max_attempts: {
        type: 'integer',
        description: 'Maximum number of retry attempts',
        default: 5
      },
      priority: {
        type: 'integer',
        description: 'Job priority (lower = higher priority)',
        default: 0
      }
    }
  },
  tags: [
    'custom',
    'files',
    'processing',
    'jobs',
    'functions'
  ]
};
