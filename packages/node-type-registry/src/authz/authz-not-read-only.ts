import type { NodeTypeDefinition } from '../types';
import { MEMBER_LIST, TEAM_KIND, TEAM_KIND_GIVEN } from './parameters';

export const AuthzNotReadOnly: NodeTypeDefinition = {
  name: 'AuthzNotReadOnly',
  slug: 'authz_not_read_only',
  category: 'authz',
  display_name: 'Not Read-Only',
  description: 'Restrictive policy that blocks read-only members from mutations. Checks actor_id + is_read_only IS NOT TRUE on the SPRT. Designed to run as a restrictive counterpart after a permissive AuthzEntityMembership policy has already verified membership.',
  parameter_schema: {
    type: 'object',
    properties: {
      entity_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column name referencing the entity (e.g., entity_id, org_id)'
      },
      ...TEAM_KIND,
      ...MEMBER_LIST
    },
    required: [
      'entity_field'
    ],
    allOf: [TEAM_KIND_GIVEN],
    additionalProperties: false
  },
  tags: [
    'membership',
    'authz',
    'restrictive'
  ],
  summary: 'A limit: members of the row\'s team who are read-only cannot pass; it is meant to sit on top of the policy that grants access.',
  use_when: [
    'Rarely by hand: the platform adds it for team tables that a blueprint builds.'
  ],
  avoid_when: [
    'App-wide rows: it checks the team named on the row.'
  ],
  risks: [
    'Used on its own as a grant, it lets every member who is not read-only reach every row of their team.'
  ]
};
