import { conditionDefs, conditionProperties } from '../conditions';
import type { NodeTypeDefinition } from '../types';

export const EventTracker: NodeTypeDefinition = {
  name: 'EventTracker',
  slug: 'event_tracker',
  category: 'event',
  display_name: 'Event Tracker',
  description:
    'Creates triggers that record events via the events module when table rows change. ' +
    'Supports the same compound condition system as JobTrigger (condition_field, watch_fields, ' +
    'or full AND/OR/NOT conditions). Events are recorded to app_events and aggregated ' +
    'automatically. Use with achievements (blueprint-level) to unlock levels and grant ' +
    'credits based on event accumulation.',
  parameter_schema: {
    type: 'object',
    $defs: conditionDefs,
    properties: {
      event_name: {
        type: 'string',
        description: 'Event type name to record (e.g., "avatar_uploaded", "order_completed")'
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
        description: 'DML events that trigger recording',
        default: ['INSERT']
      },
      count: {
        type: 'integer',
        description: 'Number of events to record per trigger fire',
        default: 1
      },
      toggle: {
        type: 'boolean',
        description: 'Toggle mode: records event when condition is met, removes when condition is unmet',
        default: false
      },
      actor_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column containing the actor (user) ID to attribute the event to',
        default: 'owner_id'
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column containing the entity ID (org/group) for entity-scoped events. For FK lookups (e.g., channel_id → channels.entity_id), combine with entity_lookup. Omit for user-only events.'
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
      auto_register_type: {
        type: 'boolean',
        description: 'Automatically register the event_name in event_types during provisioning',
        default: true
      },
      ...conditionProperties
    },
    required: [
      'event_name'
    ]
  },
  tags: [
    'events',
    'triggers',
    'analytics',
    'tracking'
  ]
};
