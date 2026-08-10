import type { NodeTypeDefinition } from '../types';

export const LimitTrackUsage: NodeTypeDefinition = {
  name: 'LimitTrackUsage',
  slug: 'limit_track_usage',
  category: 'limit_track',
  display_name: 'Track Usage',
  description:
    'Declaratively attaches billing usage-recording triggers to a table. On INSERT the named meter is incremented via record_usage; on DELETE it is decremented (reversal). On UPDATE, if the entity_field changes, the old entity is decremented and the new entity is incremented. Requires a provisioned billing_module for the target database.',
  parameter_schema: {
    type: 'object',
    properties: {
      meter_slug: {
        type: 'string',
        description:
          'Slug of the billing meter to record usage against (must match a meters table entry, e.g. "databases", "seats")',
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds (or references) the entity id for billing. For direct entity_id columns, just set this field. For FK lookups (e.g., channel_id → channels.entity_id), combine with entity_lookup.',
        default: 'entity_id',
      },
      entity_lookup: {
        type: 'object',
        description:
          'FK lookup configuration for resolving entity_id through a related table. Used when entity_field is a FK (e.g., channel_id) rather than a direct entity_id. The generator validates all fields against metaschema within the same database_id.',
        properties: {
          obj_table: {
            type: 'string',
            description:
              'Name of the related table to look up entity_id from (e.g., "channels"). Required.',
          },
          obj_schema: {
            type: 'string',
            description:
              'Schema of the related table (user-facing name, e.g., "public"). Optional — if omitted, resolved by table name within the same database_id (raises error if ambiguous).',
          },
          obj_field: {
            type: 'string',
            description:
              'Column on the related table that holds the entity_id (e.g., "entity_id"). Required.',
          },
        },
        required: ['obj_table', 'obj_field'],
      },
      quantity: {
        type: 'integer',
        description: 'Units to record per event (default 1)',
        default: 1,
      },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['INSERT', 'DELETE', 'UPDATE'],
        },
        description: 'Which DML events to attach triggers for',
        default: ['INSERT', 'DELETE'],
      },
    },
    required: ['meter_slug'],
  },
  tags: ['billing', 'triggers', 'metering', 'usage', 'track'],
};
