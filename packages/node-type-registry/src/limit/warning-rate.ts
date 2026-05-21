import type { NodeTypeDefinition } from '../types';

export const LimitWarningRate: NodeTypeDefinition = {
  name: 'LimitWarningRate',
  slug: 'limit_warning_rate',
  category: 'limit_warning',
  display_name: 'Warning Rate Limit',
  description:
    'Attaches an AFTER INSERT trigger that checks if the actor\'s current request count in the active sliding window has crossed any warning threshold configured in the limit_warnings table. If a threshold is reached for the first time, enqueues a background job (e.g. email notification). Uses limit_warning_state for one-time dedup per warning/actor pair. Requires both a limits_module with limit_warnings enabled and a rate_limit_meters_module.',
  parameter_schema: {
    type: 'object',
    properties: {
      meter_slug: {
        type: 'string',
        description:
          'Slug of the billing meter to check rate limits against (must match a meters table entry)',
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds the entity id for rate limit lookup',
        default: 'entity_id',
      },
      actor_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds the actor id for rate limit lookup',
        default: 'owner_id',
      },
    },
    required: ['meter_slug'],
  },
  tags: ['rate-limits', 'triggers', 'warning', 'notifications', 'metering'],
};
