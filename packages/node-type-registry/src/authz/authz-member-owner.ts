import type { NodeTypeDefinition } from '../types';
import { MASK_COLUMN, MEMBER_CHECKS, MEMBER_LIST, TEAM_KIND, TEAM_KIND_GIVEN } from './parameters';
import { ACTIVE_MEMBER_RISK, AGENT_IDENTITY_RISK, PERSONAL_ORG_RISK } from './plain-words';

export const AuthzMemberOwner: NodeTypeDefinition = {
  name: 'AuthzMemberOwner',
  slug: 'authz_member_owner',
  category: 'authz',
  display_name: 'Member Owner',
  description: 'Compound policy: the row must be owned by the current user (owner_field = current_user_id) AND the current user must be a member of the entity referenced by entity_field. Combines direct ownership with entity membership — the actor can only access rows they own within entities they belong to.',
  parameter_schema: {
    type: 'object',
    properties: {
      owner_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column name containing the owner user ID (e.g., owner_id)',
        default: 'owner_id'
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column name referencing the entity (e.g., entity_id)',
        default: 'entity_id'
      },
      sel_field: {
        type: 'string',
        description: 'SPRT column to select for the entity match',
        default: 'entity_id'
      },
      ...TEAM_KIND,
      levels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Achievement level names to require (kind=level catalog rows, merged into the same mask)'
      },
      capabilities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Capability names of any kind (capability, level, ...) merged into the same mask'
      },
      is_admin: {
        type: 'boolean',
        description: 'If true, require is_admin flag'
      },
      is_owner: {
        type: 'boolean',
        description: 'If true, require is_owner flag'
      },
      mask_column: MASK_COLUMN,
      ...MEMBER_LIST,
      ...MEMBER_CHECKS
    },
    required: ['owner_field', 'entity_field'],
    allOf: [TEAM_KIND_GIVEN],
    additionalProperties: false
  },
  tags: ['ownership', 'membership', 'authz'],
  summary: 'Only the person whose id is in the row\'s owner column, and only while they are a member of the team named in the row.',
  use_when: [
    'Team rows that only their author may change: use it for update and delete, next to AuthzEntityMembership for read.',
    'Private rows inside a team, such as a person\'s own drafts.'
  ],
  avoid_when: [
    'Rows every member should change: use AuthzEntityMembership.'
  ],
  risks: [
    'Admins of the team do not pass; add a separate admin policy if they must manage other people\'s rows.',
    ACTIVE_MEMBER_RISK,
    AGENT_IDENTITY_RISK,
    PERSONAL_ORG_RISK
  ]
};
