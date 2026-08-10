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
      scope: {
        type: 'string',
        description:
          'Membership type prefix that determines which limits_module row to use. Resolved dynamically via memberships_module — supports any provisioned type (e.g. "org", "data_room", "channel", "team").',
        default: 'org',
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds (or references) the entity id for aggregate limit lookup. For direct entity_id columns, just set this field. For FK lookups (e.g., channel_id → channels.entity_id), combine with entity_lookup.',
        default: 'entity_id',
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
    },
    required: ['limit_name'],
  },
  tags: ['limits', 'triggers', 'aggregates', 'warning', 'notifications'],
};
