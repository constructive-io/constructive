import type { NodeTypeDefinition } from '../types';

export const LimitEnforceAggregate: NodeTypeDefinition = {
  name: 'LimitEnforceAggregate',
  slug: 'limit_enforce_aggregate',
  category: 'limit_enforce',
  display_name: 'Enforce Aggregate Counter',
  description:
    'Declaratively attaches aggregate limit-tracking triggers to a table. On INSERT the named limit is incremented per entity; on DELETE it is decremented. Uses org_limit_aggregates_inc/dec for per-entity (org-level) aggregate limits rather than per-user limits. Requires a provisioned limits_module for the target database.',
  parameter_schema: {
    type: 'object',
    properties: {
      limit_name: {
        type: 'string',
        description:
          'Name of the aggregate limit to track (must match a default_limits entry, e.g. "databases", "members")',
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds the entity id for aggregate limit lookup',
        default: 'entity_id',
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
    required: ['limit_name'],
  },
  tags: ['limits', 'triggers', 'aggregates', 'enforce'],
};
