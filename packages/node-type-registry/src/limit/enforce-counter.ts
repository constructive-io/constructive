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
        description:
          'Membership type prefix that determines which limits_module row to use. Resolved dynamically via memberships_module — supports any provisioned type (e.g. "app", "org", "data_room", "channel", "team").',
        default: 'app',
      },
      actor_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds the actor or entity id used for limit lookup',
        default: 'owner_id',
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds (or references) the entity id for entity context resolution. For direct entity_id columns, just set this field. For FK lookups (e.g., channel_id → channels.entity_id), combine with entity_lookup.',
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
