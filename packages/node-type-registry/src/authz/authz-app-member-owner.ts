import type { NodeTypeDefinition } from '../types';
import { APP_MEMBER_LIST, MASK_COLUMN, MEMBER_CHECKS } from './parameters';
import { ACTIVE_MEMBER_RISK, AGENT_IDENTITY_RISK, NO_APP_READ_ONLY_RISK } from './plain-words';

export const AuthzAppMemberOwner: NodeTypeDefinition = {
  name: 'AuthzAppMemberOwner',
  slug: 'authz_app_member_owner',
  category: 'authz',
  display_name: 'App Member Owner',
  description: 'Compound policy: the row must be owned by the current user (owner_field = current_user_id) AND the current user must hold an app membership (hardcoded membership_type=1). App-level analog of AuthzMemberOwner for global scopes with no entity key — authorship never survives losing app membership.',
  parameter_schema: {
    type: 'object',
    properties: {
      owner_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column name containing the owner user ID (e.g., actor_id)',
        default: 'owner_id'
      },
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
        description: 'If true, require is_admin flag'
      },
      is_owner: {
        type: 'boolean',
        description: 'If true, require is_owner flag'
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
    required: ['owner_field'],
    additionalProperties: false
  },
  tags: ['ownership', 'membership', 'authz'],
  summary: 'Only the person whose id is in the row\'s owner column, and only while they are an active member of the app.',
  use_when: [
    'A private list per person in the app: use it for read, create, update and delete.',
    'App-wide rows that only their author may change: use it for update and delete.'
  ],
  avoid_when: [
    'Rows that belong to a team: use AuthzMemberOwner.'
  ],
  risks: [
    ACTIVE_MEMBER_RISK,
    AGENT_IDENTITY_RISK,
    NO_APP_READ_ONLY_RISK
  ]
};
