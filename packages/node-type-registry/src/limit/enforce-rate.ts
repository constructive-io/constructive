import type { NodeTypeDefinition } from '../types';

export const LimitEnforceRate: NodeTypeDefinition = {
  name: 'LimitEnforceRate',
  slug: 'limit_enforce_rate',
  category: 'limit_enforce',
  display_name: 'Enforce Rate Limit',
  description:
    'Attaches a BEFORE trigger that calls check_rate_limit() to enforce sliding-window rate limits before allowing mutations. The function checks all three scopes (entity, actor-in-entity, actor) in a single call; which scopes are actually enforced is controlled by what rows exist in rate_window_limits (plan-based config). Requires a provisioned meter_rate_limits_module and billing_module for the target database.',
  parameter_schema: {
    type: 'object',
    properties: {
      meter_slug: {
        type: 'string',
        description:
          'Slug of the billing meter to check rate limits against (must match a meters table entry, e.g. "messaging", "inference")',
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds the entity id (org) for rate limiting',
        default: 'entity_id',
      },
      actor_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds the actor id (user) for rate limiting',
        default: 'owner_id',
      },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['INSERT', 'UPDATE'],
        },
        description:
          'Which DML events to enforce rate limits on (DELETE is excluded since it reduces load)',
        default: ['INSERT'],
      },
    },
    required: ['meter_slug'],
  },
  tags: ['rate-limits', 'triggers', 'enforce', 'metering', 'abuse-protection'],
};
