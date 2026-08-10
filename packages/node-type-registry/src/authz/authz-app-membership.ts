import type { NodeTypeDefinition } from '../types';

export const AuthzAppMembership: NodeTypeDefinition = {
  name: 'AuthzAppMembership',
  slug: 'authz_app_membership_check',
  category: 'authz',
  display_name: 'App Membership Check',
  description:
    'App-level membership check (hardcoded membership_type=1). Verifies the user has app membership (optionally with specific capability) without binding to any entity from the row. Uses EXISTS subquery against SPRT table. For entity-scoped checks (org, channel, etc.), use AuthzEntityMembership instead.',
  parameter_schema: {
    type: 'object',
    properties: {
      levels: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Achievement level names to require (kind=level catalog rows, merged into the same mask)',
      },
      capabilities: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Capability names of any kind (capability, level, ...) merged into the same mask',
      },
      is_admin: {
        type: 'boolean',
        description: 'If true, require is_admin flag',
      },
      is_owner: {
        type: 'boolean',
        description: 'If true, require is_owner flag',
      },
    },
    required: [],
  },
  tags: ['membership', 'authz'],
};
