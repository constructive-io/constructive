import type { NodeTypeDefinition } from '../types';
import { MASK_COLUMN, MEMBER_CHECKS, MEMBER_LIST, TEAM_KIND, TEAM_KIND_GIVEN } from './parameters';
import { ACTIVE_MEMBER_RISK } from './plain-words';

export const AuthzPeerOwnership: NodeTypeDefinition = {
  name: 'AuthzPeerOwnership',
  slug: 'authz_peer_ownership',
  category: 'authz',
  display_name: 'Peer Ownership',
  description: 'Peer visibility through shared entity membership. Authorizes access to user-owned rows when the owner and current user are both members of the same entity. Self-joins the SPRT table to find peers.',
  parameter_schema: {
    type: 'object',
    properties: {
      owner_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column name on protected table referencing the owning user (e.g., owner_id)'
      },
      ...TEAM_KIND,
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
        description: 'If true, require is_admin flag on current user membership'
      },
      is_owner: {
        type: 'boolean',
        description: 'If true, require is_owner flag on current user membership'
      },
      mask_column: MASK_COLUMN,
      ...MEMBER_LIST,
      ...MEMBER_CHECKS
    },
    required: [
      'owner_field'
    ],
    allOf: [TEAM_KIND_GIVEN],
    additionalProperties: false
  },
  tags: [
    'membership',
    'peer',
    'authz'
  ],
  summary: 'Anyone who shares a team with the person who owns the row gets access.',
  use_when: [
    'Profiles or posts that the co-members of any shared team may see.'
  ],
  avoid_when: [
    'Rows that belong to one team: use AuthzEntityMembership.'
  ],
  risks: [
    'Sharing any one team of that kind is enough, even a team that has nothing to do with the row.',
    ACTIVE_MEMBER_RISK
  ]
};
