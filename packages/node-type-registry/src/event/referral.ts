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
        description: 'Column containing the entity ID (org/group) for entity-scoped referral events. Omit for user-only events.'
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
