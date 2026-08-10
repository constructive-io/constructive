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
      scope: {
        type: 'string',
        description:
          'Membership type prefix that determines which limits_module row to use for warnings and warning_state tables. Resolved dynamically via memberships_module — supports any provisioned type (e.g. "app", "org", "data_room", "channel", "team").',
        default: 'app',
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds (or references) the entity id for rate limit lookup. For direct entity_id columns, just set this field. For FK lookups (e.g., channel_id → channels.entity_id), combine with entity_lookup.',
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
