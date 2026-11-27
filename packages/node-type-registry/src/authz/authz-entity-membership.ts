import type { NodeTypeDefinition } from '../types';
import { MEMBER_CHECKS, MEMBER_LIST, TEAM_KIND, TEAM_KIND_GIVEN } from './parameters';
import { ACTIVE_MEMBER_RISK, PERSONAL_ORG_RISK } from './plain-words';

export const AuthzEntityMembership: NodeTypeDefinition = {
  name: 'AuthzEntityMembership',
  slug: 'authz_entity_membership',
  category: 'authz',
  display_name: 'Entity Membership',
  description: 'Membership check scoped by a field on the row through the SPRT table. Verifies user has membership in the entity referenced by the row.',
  parameter_schema: {
    type: 'object',
    properties: {
      entity_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column name referencing the entity (e.g., entity_id, org_id)'
      },
      sel_field: {
        type: 'string',
        description: 'SPRT column to select for the entity match',
        default: 'entity_id'
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
      mask_column: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description:
          'Per-row required permissions (DataCapabilities): a bit(n) column on this table whose bits the actor must hold, checked as sprt.capabilities & row.mask = row.mask. Narrows access row by row without joining a grant table; a zero mask requires nothing. Composes with capability/capabilities — both are ANDed.',
      },
      is_admin: {
        type: 'boolean',
        description: 'If true, require is_admin flag'
      },
      is_owner: {
        type: 'boolean',
        description: 'If true, require is_owner flag'
      },
      ...MEMBER_LIST,
      ...MEMBER_CHECKS,
      mask_table: {
        type: 'string',
        readOnly: true,
        description: 'The protected table, which the backend records for mask_column.'
      },
      check_function_name: {
        type: 'string',
        description: 'A function that checks the membership instead of the member list; it is called with the row\'s team column.'
      },
      check_function_schema: {
        type: 'string',
        description: 'The schema of that function.'
      }
    },
    required: [
      'entity_field'
    ],
    allOf: [TEAM_KIND_GIVEN],
    additionalProperties: false
  },
  tags: [
    'membership',
    'authz'
  ],
  summary: 'Members of the team named in the row get access; a team is an organization or another kind of group.',
  use_when: [
    'Rows that belong to an organization or a team, where every member may take part.',
    'Rows a person keeps for themselves: every user has a personal organization whose id is their own id.'
  ],
  avoid_when: [
    'Rows only their author may change: use AuthzMemberOwner for update and delete.'
  ],
  risks: [
    ACTIVE_MEMBER_RISK,
    'On create and update, the row can only name a team the person belongs to.',
    'Read-only members pass this policy. The platform adds a block on them only when it builds the table with this policy, grants to change rows and the team kind given as a number (2 or more); with entity_type, or for a policy added on its own, add AuthzNotReadOnly as a limit.',
    'The team kind must be a number or entity_type: a number written as text is refused when the policy is built.',
    PERSONAL_ORG_RISK
  ]
};
