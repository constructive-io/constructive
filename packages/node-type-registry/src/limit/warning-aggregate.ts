import type { NodeTypeDefinition } from '../types';

export const LimitWarningAggregate: NodeTypeDefinition = {
  name: 'LimitWarningAggregate',
  slug: 'limit_warning_aggregate',
  category: 'limit_warning',
  display_name: 'Warning Aggregate',
  description:
    'Attaches an AFTER INSERT trigger that checks if the entity\'s aggregate usage has crossed any warning threshold configured in the limit_warnings table. If a threshold is reached for the first time, enqueues a background job (e.g. email notification). Uses limit_warning_state for one-time dedup per warning/actor/entity triple. Requires a provisioned limits_module with limit_warnings and aggregate limits enabled.',
  parameter_schema: {
    type: 'object',
    properties: {
      limit_name: {
        type: 'string',
        description:
          'Name of the aggregate limit to watch (must match a limit_warnings.name entry, e.g. "databases", "members")',
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds the entity id for aggregate limit lookup',
        default: 'entity_id',
      },
    },
    required: ['limit_name'],
  },
  tags: ['limits', 'triggers', 'aggregates', 'warning', 'notifications'],
};
