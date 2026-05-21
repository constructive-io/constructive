import type { NodeTypeDefinition } from '../types';

export const LimitEnforceCounter: NodeTypeDefinition = {
  name: 'LimitEnforceCounter',
  slug: 'limit_enforce_counter',
  category: 'limit_enforce',
  display_name: 'Enforce Counter',
  description:
    'Declaratively attaches limit-tracking triggers to a table. On INSERT the named limit is incremented; on DELETE it is decremented. Requires a provisioned limits_module for the target scope.',
  parameter_schema: {
    type: 'object',
    properties: {
      limit_name: {
        type: 'string',
        description:
          'Name of the limit to track (must match a default_limits entry, e.g. "projects", "members")',
      },
      scope: {
        type: 'string',
        enum: ['app', 'org'],
        description:
          'Limit scope: "app" (membership_type=1, user-level) or "org" (membership_type=2, entity-level)',
        default: 'app',
      },
      actor_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds the actor or entity id used for limit lookup',
        default: 'owner_id',
      },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['INSERT', 'DELETE', 'UPDATE'],
        },
        description:
          'Which DML events to attach triggers for',
        default: ['INSERT', 'DELETE'],
      },
    },
    required: ['limit_name'],
  },
  tags: ['limits', 'triggers', 'enforce'],
};
