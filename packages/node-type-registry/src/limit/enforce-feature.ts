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
        enum: ['app', 'org'],
        description:
          'Feature scope: "app" (membership_type=1, app-level caps) or "org" (membership_type=2, per-entity caps)',
        default: 'app',
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column on the target table that holds the entity id for per-entity cap lookups (only used for org scope)',
        default: 'entity_id',
      },
    },
    required: ['feature_name'],
  },
  tags: ['limits', 'triggers', 'feature-flags', 'enforce', 'caps'],
};
