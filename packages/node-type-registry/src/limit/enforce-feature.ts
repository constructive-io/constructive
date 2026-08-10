import type { NodeTypeDefinition } from '../types';

export const LimitEnforceFeature: NodeTypeDefinition = {
  name: 'LimitEnforceFeature',
  slug: 'limit_enforce_feature',
  category: 'limit_enforce',
  display_name: 'Enforce Feature Flag',
  description:
    'Gates a table behind a feature flag backed by the cap tables. Attaches a BEFORE INSERT trigger that checks whether the named feature cap value is > 0. Features are modeled as caps with max=0 (disabled) or max=1 (enabled) in limit_caps / limit_caps_defaults tables. Resolution: COALESCE(per-entity cap, scope default, 0).',
  parameter_schema: {
    type: 'object',
    properties: {
      feature_name: {
        type: 'string',
        description:
          'Cap name representing this feature (must match a limit_caps_defaults entry with max=0 or max=1)',
      },
      scope: {
        type: 'string',
        description:
          'Membership type prefix that determines which limits_module row to use. Resolved dynamically via memberships_module — supports any provisioned type (e.g. "app", "org", "data_room", "channel", "team").',
        default: 'app',
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds (or references) the entity id for per-entity cap lookups (only used for org scope). For FK lookups (e.g., channel_id → channels.entity_id), combine with entity_lookup.',
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
    required: ['feature_name'],
  },
  tags: ['limits', 'triggers', 'feature-flags', 'enforce', 'caps'],
};
