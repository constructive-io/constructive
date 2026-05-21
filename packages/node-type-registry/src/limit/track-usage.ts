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
          'Column on the target table that holds the entity id for billing',
        default: 'entity_id',
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
