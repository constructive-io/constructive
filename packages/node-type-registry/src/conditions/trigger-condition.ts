import type { JSONSchema } from '../types';

/**
 * Shared trigger condition schema used by any node type that creates
 * PostgreSQL triggers with conditional WHEN clauses.
 *
 * Consumed by: JobTrigger, EventTracker, ProcessExtraction,
 * ProcessImageVersions, ProcessFileEmbedding, ProcessImageEmbedding.
 *
 * On the SQL side, these conditions are compiled to AST via
 * metaschema_generators.build_condition_ast().
 */
export const triggerConditionSchema: JSONSchema = {
  type: 'object',
  description: 'A leaf condition ({field, op, value?, row?, ref?}) or a combinator ({AND, OR, NOT}).',
  properties: {
    field: { type: 'string', format: 'column-ref', description: 'Column name (validated against the table).' },
    op: {
      type: 'string',
      enum: ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL', 'IS DISTINCT FROM'],
      description: 'Comparison operator.'
    },
    value: { description: 'Comparison value. Type is resolved from the column definition. Omit for IS NULL, IS NOT NULL, IS DISTINCT FROM.' },
    row: { type: 'string', enum: ['NEW', 'OLD'], default: 'NEW', description: 'Row reference (default: NEW).' },
    ref: {
      type: 'object',
      description: 'Column reference for field-to-field comparison (alternative to value).',
      properties: {
        field: { type: 'string', format: 'column-ref' },
        row: { type: 'string', enum: ['NEW', 'OLD'], default: 'NEW' }
      }
    },
    AND: { type: 'array', description: 'Array of conditions combined with AND.', items: { $ref: '#/$defs/triggerCondition' } },
    OR: { type: 'array', description: 'Array of conditions combined with OR.', items: { $ref: '#/$defs/triggerCondition' } },
    NOT: { $ref: '#/$defs/triggerCondition', description: 'Negated condition.' }
  }
};

/**
 * $defs block for parameter_schema. Spread into any node that uses conditions.
 *
 * Usage:
 *   parameter_schema: { type: 'object', $defs: conditionDefs, properties: { ... } }
 */
export const conditionDefs: Record<string, JSONSchema> = {
  triggerCondition: triggerConditionSchema
};

/**
 * Common condition-related properties for trigger-based nodes.
 * Three mutually exclusive options for WHEN clause specification.
 *
 * Usage:
 *   properties: { event_name: { ... }, ...conditionProperties }
 */
export const conditionProperties: Record<string, JSONSchema> = {
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
    'x-codegen-type': 'TriggerCondition | TriggerCondition[]',
    oneOf: [
      { $ref: '#/$defs/triggerCondition' },
      { type: 'array', items: { $ref: '#/$defs/triggerCondition' } }
    ]
  },
  watch_fields: {
    type: 'array',
    items: {
      type: 'string',
      format: 'column-ref'
    },
    description: 'For UPDATE triggers, only fire when these fields change (uses DISTINCT FROM)'
  }
};

/**
 * Standalone trigger_conditions property for nodes that compose on top of
 * JobTrigger (Process* nodes). These use trigger_conditions instead of
 * the full condition_field/conditions/watch_fields trio because the
 * underlying JobTrigger handles the WHEN clause; this property adds
 * additional conditions merged via AND.
 */
export const triggerConditionsProperty: JSONSchema = {
  description:
    'Additional compound conditions beyond auto-generated filtering. ' +
    'Merged with the auto-generated conditions via AND.',
  'x-codegen-type': 'TriggerCondition | TriggerCondition[]',
  oneOf: [
    { $ref: '#/$defs/triggerCondition' },
    { type: 'array', items: { $ref: '#/$defs/triggerCondition' } }
  ]
};
