import type { NodeTypeDefinition } from '../types';
import { APP_MEMBER_LIST, MASK_COLUMN, MEMBER_CHECKS } from './parameters';
import { ACTIVE_MEMBER_RISK, NO_APP_READ_ONLY_RISK } from './plain-words';

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
      membership_type: {
        type: 'integer',
        const: 1,
        readOnly: true,
        description: 'Always 1 (the app); the backend sets it.'
      },
      mask_column: MASK_COLUMN,
      ...APP_MEMBER_LIST,
      ...MEMBER_CHECKS
    },
    required: [],
    additionalProperties: false
  },
  tags: ['membership', 'authz'],
  summary: 'Any active member of the app gets every row; the row itself is not checked.',
  use_when: [
    'Rows that belong to the whole app, not to one team or person.',
    'App-wide admin screens, with is_admin or a capability.'
  ],
  avoid_when: [
    'Rows that belong to a team: use AuthzEntityMembership, which checks the team named in the row.',
    'Next to AuthzDirectOwner on a team table: use AuthzEntityMembership instead.'
  ],
  risks: [
    'Every active member reaches every row, whatever team or person the row is about.',
    ACTIVE_MEMBER_RISK,
    NO_APP_READ_ONLY_RISK
  ]
};
