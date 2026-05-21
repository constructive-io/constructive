import type { NodeTypeDefinition } from '../types';

export const LimitWarningCounter: NodeTypeDefinition = {
  name: 'LimitWarningCounter',
  slug: 'limit_warning_counter',
  category: 'limit_warning',
  display_name: 'Warning Counter',
  description:
    'Attaches an AFTER INSERT trigger that checks if the actor\'s current usage has crossed any warning threshold configured in the limit_warnings table. If a threshold is reached for the first time, enqueues a background job (e.g. email notification). Uses limit_warning_state for one-time dedup per warning/actor pair. Requires a provisioned limits_module with limit_warnings enabled.',
  parameter_schema: {
    type: 'object',
    properties: {
      limit_name: {
        type: 'string',
        description:
          'Name of the limit to watch (must match a limit_warnings.name entry, e.g. "projects", "members")',
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
          'Column on the target table that holds the actor id for limit lookup',
        default: 'owner_id',
      },
    },
    required: ['limit_name'],
  },
  tags: ['limits', 'triggers', 'warning', 'notifications'],
};
