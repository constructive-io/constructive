import type { NodeTypeDefinition } from '../types';
import { AGENT_IDENTITY_RISK } from './plain-words';

export const AuthzDirectOwner: NodeTypeDefinition = {
  name: 'AuthzDirectOwner',
  slug: 'authz_direct_owner',
  category: 'authz',
  display_name: 'Direct Ownership',
  description: 'Direct equality comparison between a table column and the current user ID. Simplest authorization pattern with no subqueries.',
  parameter_schema: {
    type: 'object',
    properties: {
      entity_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column name containing the owner user ID (e.g., owner_id)'
      }
    },
    required: [
      'entity_field'
    ],
    additionalProperties: false
  },
  tags: [
    'ownership',
    'authz'
  ],
  summary: 'Only the person whose id is in the row\'s owner column gets access, with no check on team or app membership.',
  use_when: [
    'Personal account rows with no team or app membership around them, such as a person\'s own devices or settings.'
  ],
  avoid_when: [
    'Rows that belong to a team or the app: use AuthzMemberOwner or AuthzAppMemberOwner, so a person who leaves loses access.',
    'Next to a membership policy on the same table: a removed member keeps access to every row they own.'
  ],
  risks: [
    'Access does not end when the person leaves the team or the app, or is banned.',
    AGENT_IDENTITY_RISK
  ]
};
