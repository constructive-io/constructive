import { conditionDefs, conditionProperties } from '../conditions';
import type { NodeTypeDefinition } from '../types';

export const EventReferral: NodeTypeDefinition = {
  name: 'EventReferral',
  slug: 'event_referral',
  category: 'event',
  display_name: 'Event Referral',
  description:
    'Creates triggers that record events for the referrer (inviter) when their ' +
    'invitees perform actions on a watched table. Resolves the referrer automatically ' +
    'via the invites module\'s claimed_invites table using the membership_type context. ' +
    'Supports the same compound condition system as EventTracker. Use with achievements ' +
    'to unlock levels and grant credits based on invitee activity.',
  parameter_schema: {
    type: 'object',
    $defs: conditionDefs,
    properties: {
      event_name: {
        type: 'string',
        description: 'Event type name to record for the referrer (e.g., "invitee_uploaded_avatar", "invitee_completed_onboarding")'
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
      actor_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column containing the invitee (actor) ID on the source table — used to look up the referrer via claimed_invites.receiver_id',
        default: 'owner_id'
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column containing the entity ID (org/group) for entity-scoped referral events. For FK lookups (e.g., channel_id → channels.entity_id), combine with entity_lookup. Omit for user-only events.'
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
      max_depth: {
        type: 'integer',
        description:
          'Maximum depth to walk up the invite chain. ' +
          'Default 1 (direct inviter only). Set 2–10 to enable ' +
          'multi-level referral rewards. App-level only — must not ' +
          'be combined with entity_field.',
        default: 1,
        minimum: 1,
        maximum: 10,
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
    'referral',
    'invites',
    'analytics',
    'tracking'
  ]
};
